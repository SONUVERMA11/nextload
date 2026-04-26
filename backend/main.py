"""
NexLoad Backend API
Provides video info extraction, direct download URLs, and Telegram file downloads
Supports 1000+ sites via yt-dlp + Telegram channels/groups via Telethon

Deploy: Render.com free tier, Railway, or any Docker host

Usage:
    uvicorn main:app --host 0.0.0.0 --port 8000

Endpoints:
    GET /info?url=<url>                          → Video metadata & formats
    GET /download-url?url=<url>&format_id=best   → Direct download URL
    GET /health                                  → Health check
    GET /supported-sites                         → List of supported sites
    POST /telegram/resolve                       → Resolve Telegram message/file info
    POST /telegram/download                      → Download file from Telegram
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import yt_dlp
import os
import asyncio
import time
import os
import re
import json
import threading
import uuid
import shutil

# Torrent engine
try:
    import libtorrent as lt
    LIBTORRENT_AVAILABLE = True
except ImportError:
    lt = None
    LIBTORRENT_AVAILABLE = False

# Telegram
try:
    from telethon import TelegramClient
    from telethon.tl.types import MessageMediaDocument, MessageMediaPhoto
    from telethon.sessions import StringSession
    TELETHON_AVAILABLE = True
except ImportError:
    TELETHON_AVAILABLE = False

# ─── Telegram Config ────────────────────────────────────────────────────
TELEGRAM_API_ID = int(os.environ.get("TELEGRAM_API_ID", "29748954"))
TELEGRAM_API_HASH = os.environ.get("TELEGRAM_API_HASH", "b732c4511970500764a72e4f1ab33eb1")

# ─── Torrent State ──────────────────────────────────────────────────────
TORRENT_DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "_torrents")
os.makedirs(TORRENT_DOWNLOAD_DIR, exist_ok=True)

torrent_session: Optional["lt.session"] = None
active_torrents: Dict[str, dict] = {}  # id -> {"handle": lt.torrent_handle, "name": str, ...}

def _init_torrent_session():
    global torrent_session
    if not LIBTORRENT_AVAILABLE:
        print("[NexLoad] libtorrent not installed — torrent downloads disabled")
        return
    torrent_session = lt.session()
    torrent_session.listen_on(6881, 6891)
    settings = {
        "enable_dht": True,
        "enable_lsd": True,
        "enable_natpmp": True,
        "enable_upnp": True,
    }
    torrent_session.apply_settings(settings)
    print("[NexLoad] Torrent engine started (libtorrent)")

_init_torrent_session()

app = FastAPI(
    title="NexLoad API",
    description="Video info extraction, download URL resolver, torrent engine & Telegram downloads",
    version="1.2.0",
)

# CORS — allow all origins for mobile app access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "nexload-api",
        "timestamp": int(time.time()),
        "torrent": LIBTORRENT_AVAILABLE and torrent_session is not None,
        "telegram": TELETHON_AVAILABLE,
    }


# (Startup/Shutdown for Telegram removed in favor of stateless StringSession)


# ─── Video Info Extraction ───────────────────────────────────────────────

@app.get("/info")
async def get_info(url: str = Query(..., description="Video URL to extract info from")):
    """Extract video metadata and available formats from a URL."""
    try:
        # Check for cookies via Environment Variable
        youtube_cookies = os.getenv("YOUTUBE_COOKIES")
        cookie_file_path = "cookies.txt"
        if youtube_cookies and not os.path.exists(cookie_file_path):
            with open(cookie_file_path, "w") as f:
                f.write(youtube_cookies)
                
        opts = {
            "quiet": True,
            "no_warnings": True,
            "no_color": True,
            "skip_download": True,
            "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
        }
        if os.path.exists(cookie_file_path):
            opts["cookiefile"] = cookie_file_path

        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, lambda: _extract_info(url, opts))

        if not info:
            raise HTTPException(status_code=404, detail="Could not extract video info")

        # Parse formats
        formats = []
        for f in info.get("formats", []):
            fmt = {
                "format_id": f.get("format_id", ""),
                "ext": f.get("ext", ""),
                "quality": f.get("format_note", f.get("quality", "")),
                "filesize": f.get("filesize") or f.get("filesize_approx") or 0,
                "resolution": f.get("resolution", ""),
                "fps": f.get("fps"),
                "vcodec": f.get("vcodec", "none"),
                "acodec": f.get("acodec", "none"),
                "tbr": f.get("tbr"),  # total bitrate
            }
            formats.append(fmt)

        return {
            "title": info.get("title", "Unknown"),
            "thumbnail": info.get("thumbnail", ""),
            "duration": info.get("duration", 0),
            "uploader": info.get("uploader", ""),
            "description": (info.get("description", "") or "")[:500],
            "webpage_url": info.get("webpage_url", url),
            "view_count": info.get("view_count"),
            "like_count": info.get("like_count"),
            "upload_date": info.get("upload_date"),
            "formats": formats,
        }

    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(status_code=400, detail=f"Download error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── Direct Download URL ────────────────────────────────────────────────

@app.get("/download-url")
async def get_direct_url(
    url: str = Query(..., description="Video URL"),
    format_id: str = Query("best", description="Format ID or 'best'"),
):
    """Get a direct download URL for a specific format."""
    try:
        cookie_file_path = "cookies.txt"
        opts = {
            "format": format_id,
            "quiet": True,
            "no_warnings": True,
            "no_color": True,
            "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
        }
        if os.path.exists(cookie_file_path):
            opts["cookiefile"] = cookie_file_path

        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, lambda: _extract_info(url, opts))

        if not info:
            raise HTTPException(status_code=404, detail="Could not resolve download URL")

        direct_url = info.get("url")
        if not direct_url:
            # Try to get from requested_formats
            requested = info.get("requested_formats", [])
            if requested:
                direct_url = requested[0].get("url")

        if not direct_url:
            raise HTTPException(status_code=404, detail="No direct URL found for this format")

        return {
            "direct_url": direct_url,
            "ext": info.get("ext", "mp4"),
            "title": info.get("title", "download"),
            "filesize": info.get("filesize") or info.get("filesize_approx") or 0,
        }

    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(status_code=400, detail=f"Download error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── Playlist Info ──────────────────────────────────────────────────────

@app.get("/playlist")
async def get_playlist(
    url: str = Query(..., description="Playlist URL"),
    limit: int = Query(50, description="Max entries to return"),
):
    """Extract playlist metadata and entries."""
    try:
        cookie_file_path = "cookies.txt"
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "playlistend": limit,
            "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
        }
        if os.path.exists(cookie_file_path):
            opts["cookiefile"] = cookie_file_path

        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, lambda: _extract_info(url, opts))

        if not info:
            raise HTTPException(status_code=404, detail="Could not extract playlist")

        entries = []
        for entry in info.get("entries", []):
            if entry:
                entries.append({
                    "title": entry.get("title", "Unknown"),
                    "url": entry.get("url", ""),
                    "duration": entry.get("duration"),
                    "thumbnail": entry.get("thumbnail", ""),
                })

        return {
            "title": info.get("title", "Playlist"),
            "uploader": info.get("uploader", ""),
            "count": len(entries),
            "entries": entries,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ─── Supported Sites ──────────────────────────────────────────────────

@app.get("/supported-sites")
async def get_supported_sites():
    """List all supported sites."""
    extractors = yt_dlp.list_extractors()
    sites = sorted(set(e.IE_NAME for e in extractors if hasattr(e, 'IE_NAME')))
    return {"count": len(sites), "sites": sites}


# ─── Helpers ─────────────────────────────────────────────────────────────

def _extract_info(url: str, opts: dict):
    """Synchronous yt-dlp extraction (run in executor)."""
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


# ─── Torrent Endpoints ──────────────────────────────────────────────────

class TorrentAddRequest(BaseModel):
    magnet: str  # magnet URI or HTTP URL to .torrent file

class TorrentStatusResponse(BaseModel):
    id: str
    name: str
    progress: float  # 0-100
    download_rate: int  # bytes/sec
    upload_rate: int  # bytes/sec
    num_seeds: int
    num_peers: int
    state: str
    total_size: int
    downloaded: int
    eta: int  # seconds


@app.post("/torrent/add")
async def torrent_add(req: TorrentAddRequest):
    """Add a magnet link or .torrent URL to download."""
    if not LIBTORRENT_AVAILABLE or not torrent_session:
        raise HTTPException(status_code=503, detail="Torrent engine not available. Install libtorrent to enable.")

    torrent_id = str(uuid.uuid4())[:8]

    try:
        params = {
            "save_path": os.path.join(TORRENT_DOWNLOAD_DIR, torrent_id),
        }
        os.makedirs(params["save_path"], exist_ok=True)

        if req.magnet.startswith("magnet:"):
            handle = lt.add_magnet_uri(torrent_session, req.magnet, params)
        else:
            # Assume it's a URL to a .torrent file — download it first
            import urllib.request
            torrent_path = os.path.join(TORRENT_DOWNLOAD_DIR, f"{torrent_id}.torrent")
            urllib.request.urlretrieve(req.magnet, torrent_path)
            info = lt.torrent_info(torrent_path)
            handle = torrent_session.add_torrent({"ti": info, **params})

        # Wait for metadata (up to 30s for magnets)
        deadline = time.time() + 30
        while not handle.has_metadata() and time.time() < deadline:
            await asyncio.sleep(0.5)

        name = handle.name() if handle.has_metadata() else f"torrent_{torrent_id}"
        active_torrents[torrent_id] = {"handle": handle, "name": name}

        return {
            "id": torrent_id,
            "name": name,
            "status": "downloading",
            "total_size": handle.status().total_wanted if handle.has_metadata() else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add torrent: {e}")


@app.get("/torrent/status/{torrent_id}")
async def torrent_status(torrent_id: str):
    """Get download status of a torrent."""
    if torrent_id not in active_torrents:
        raise HTTPException(status_code=404, detail="Torrent not found")

    entry = active_torrents[torrent_id]
    handle = entry["handle"]
    s = handle.status()

    state_map = {0: "queued", 1: "checking", 2: "metadata", 3: "downloading",
                 4: "finished", 5: "seeding", 6: "allocating", 7: "checking_resume"}
    state_str = state_map.get(s.state, "unknown")

    dl_rate = s.download_rate
    remaining = s.total_wanted - s.total_wanted_done
    eta = int(remaining / dl_rate) if dl_rate > 0 else 0

    return {
        "id": torrent_id,
        "name": entry["name"],
        "progress": round(s.progress * 100, 1),
        "download_rate": dl_rate,
        "upload_rate": s.upload_rate,
        "num_seeds": s.num_seeds,
        "num_peers": s.num_peers,
        "state": state_str,
        "total_size": s.total_wanted,
        "downloaded": s.total_wanted_done,
        "eta": eta,
    }


@app.get("/torrent/files/{torrent_id}")
async def torrent_files(torrent_id: str):
    """List files in a completed/active torrent."""
    if torrent_id not in active_torrents:
        raise HTTPException(status_code=404, detail="Torrent not found")

    handle = active_torrents[torrent_id]["handle"]
    if not handle.has_metadata():
        return {"files": []}

    torrent_info = handle.get_torrent_info()
    files = []
    for i in range(torrent_info.num_files()):
        f = torrent_info.file_at(i)
        files.append({
            "index": i,
            "path": f.path,
            "size": f.size,
        })
    return {"files": files}


@app.get("/torrent/download/{torrent_id}")
async def torrent_download_file(torrent_id: str, file_index: int = Query(0)):
    """Download a file from a completed torrent."""
    if torrent_id not in active_torrents:
        raise HTTPException(status_code=404, detail="Torrent not found")

    handle = active_torrents[torrent_id]["handle"]
    s = handle.status()

    if s.progress < 1.0:
        raise HTTPException(status_code=425, detail=f"Torrent not complete yet ({round(s.progress*100,1)}%)")

    if not handle.has_metadata():
        raise HTTPException(status_code=404, detail="No metadata available")

    torrent_info = handle.get_torrent_info()
    if file_index >= torrent_info.num_files():
        raise HTTPException(status_code=400, detail="Invalid file index")

    f = torrent_info.file_at(file_index)
    file_path = os.path.join(TORRENT_DOWNLOAD_DIR, torrent_id, f.path)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        filename=os.path.basename(f.path),
        media_type="application/octet-stream",
    )


@app.delete("/torrent/{torrent_id}")
async def torrent_remove(torrent_id: str, delete_files: bool = Query(False)):
    """Remove a torrent and optionally delete its files."""
    if torrent_id not in active_torrents:
        raise HTTPException(status_code=404, detail="Torrent not found")

    handle = active_torrents[torrent_id]["handle"]
    if torrent_session:
        torrent_session.remove_torrent(handle)
    del active_torrents[torrent_id]

    if delete_files:
        dl_path = os.path.join(TORRENT_DOWNLOAD_DIR, torrent_id)
        if os.path.exists(dl_path):
            shutil.rmtree(dl_path, ignore_errors=True)

    return {"status": "removed", "id": torrent_id}


# ─── Jackett Search Proxy ────────────────────────────────────────────────

@app.get("/jackett/search")
async def jackett_search(
    query: str = Query(..., description="Search query"),
    jackett_url: str = Query(..., description="Jackett server URL (e.g. http://localhost:9117)"),
    api_key: str = Query(..., description="Jackett API key"),
    categories: str = Query("2000,5000", description="Comma-separated category IDs"),
):
    """Search torrent indexers via Jackett."""
    import urllib.request
    import urllib.parse

    search_url = (
        f"{jackett_url.rstrip('/')}/api/v2.0/indexers/all/results"
        f"?apikey={api_key}"
        f"&Query={urllib.parse.quote(query)}"
        f"&Category%5B%5D={'&Category%5B%5D='.join(categories.split(','))}"
    )

    try:
        req = urllib.request.Request(search_url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jackett error: {e}")

    results = []
    for item in data.get("Results", [])[:50]:
        results.append({
            "title": item.get("Title", ""),
            "size": item.get("Size", 0),
            "seeds": item.get("Seeders", 0),
            "peers": item.get("Peers", 0),
            "magnet": item.get("MagnetUri", ""),
            "link": item.get("Link", ""),
            "tracker": item.get("Tracker", ""),
            "date": item.get("PublishDate", ""),
            "category": item.get("CategoryDesc", ""),
        })

    return {"query": query, "count": len(results), "results": results}


# ─── Telegram Endpoints ──────────────────────────────────────────────────

class TelegramSendCodeRequest(BaseModel):
    phone_number: str

class TelegramSignInRequest(BaseModel):
    phone_number: str
    phone_code_hash: str
    code: str
    session_string: str

class TelegramResolveRequest(BaseModel):
    url: str  # t.me/channel/123 or similar
    session_string: str

class TelegramDownloadRequest(BaseModel):
    url: str
    session_string: str
    save_name: Optional[str] = None


def _parse_telegram_url(url: str):
    """Parse a t.me or telegram.me URL into (channel, message_id)."""
    patterns = [
        r"(?:https?://)?t\.me/([^/]+)/(\d+)",
        r"(?:https?://)?telegram\.me/([^/]+)/(\d+)",
    ]
    for pat in patterns:
        m = re.match(pat, url.strip())
        if m:
            return m.group(1), int(m.group(2))
    return None, None


@app.post("/telegram/auth/send_code")
async def telegram_send_code(req: TelegramSendCodeRequest):
    """Send SMS code for Telegram login."""
    if not TELETHON_AVAILABLE:
        raise HTTPException(status_code=503, detail="Telethon not installed")
    
    session = StringSession()
    client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.connect()
    
    try:
        result = await client.send_code_request(req.phone_number)
        session_str = session.save()
        return {
            "phone_code_hash": result.phone_code_hash,
            "session_string": session_str
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client.disconnect()


@app.post("/telegram/auth/sign_in")
async def telegram_sign_in(req: TelegramSignInRequest):
    """Verify SMS code and complete Telegram login."""
    if not TELETHON_AVAILABLE:
        raise HTTPException(status_code=503, detail="Telethon not installed")
    
    session = StringSession(req.session_string)
    client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.connect()
    
    try:
        await client.sign_in(req.phone_number, req.code, phone_code_hash=req.phone_code_hash)
        session_str = session.save()
        return {
            "success": True,
            "session_string": session_str
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client.disconnect()


@app.post("/telegram/resolve")
async def telegram_resolve(req: TelegramResolveRequest):
    """Resolve a Telegram message URL to get file info."""
    if not TELETHON_AVAILABLE or not req.session_string:
        raise HTTPException(status_code=503, detail="Telegram not configured or session missing")

    channel, msg_id = _parse_telegram_url(req.url)
    if not channel or not msg_id:
        raise HTTPException(status_code=400, detail="Invalid Telegram URL. Expected: t.me/channel/message_id")

    session = StringSession(req.session_string)
    client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.connect()
    
    try:
        if not await client.is_user_authorized():
            raise HTTPException(status_code=401, detail="Telegram session expired or invalid")
            
        entity = await client.get_entity(channel)
        message = await client.get_messages(entity, ids=msg_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch message: {e}")
    finally:
        await client.disconnect()

    if not message or not message.media:
        raise HTTPException(status_code=404, detail="Message has no downloadable media")

    # Extract file info
    file_name = "telegram_file"
    file_size = 0
    mime_type = "application/octet-stream"

    if isinstance(message.media, MessageMediaDocument) and message.media.document:
        doc = message.media.document
        file_size = doc.size or 0
        mime_type = doc.mime_type or mime_type
        for attr in doc.attributes:
            if hasattr(attr, "file_name") and attr.file_name:
                file_name = attr.file_name
                break
    elif isinstance(message.media, MessageMediaPhoto):
        file_name = f"photo_{msg_id}.jpg"
        mime_type = "image/jpeg"

    return {
        "file_name": file_name,
        "file_size": file_size,
        "mime_type": mime_type,
        "message_text": message.text or "",
        "date": str(message.date),
        "channel": channel,
        "message_id": msg_id,
    }


@app.get("/telegram/download")
async def telegram_download(
    url: str = Query(...),
    session_string: str = Query(...),
    save_name: Optional[str] = Query(None)
):
    """Download a file from a Telegram message and return it."""
    if not TELETHON_AVAILABLE or not session_string:
        raise HTTPException(status_code=503, detail="Telegram not configured or session missing")

    channel, msg_id = _parse_telegram_url(url)
    if not channel or not msg_id:
        raise HTTPException(status_code=400, detail="Invalid Telegram URL")

    session = StringSession(session_string)
    client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.connect()

    try:
        if not await client.is_user_authorized():
            raise HTTPException(status_code=401, detail="Telegram session expired or invalid")
            
        entity = await client.get_entity(channel)
        message = await client.get_messages(entity, ids=msg_id)
        
        if not message or not message.media:
            raise HTTPException(status_code=404, detail="No media in message")

        # Download to temp file
        download_dir = os.path.join(os.path.dirname(__file__), "_downloads")
        os.makedirs(download_dir, exist_ok=True)

        file_name = save_name or f"tg_{channel}_{msg_id}"
        file_path = os.path.join(download_dir, file_name)

        downloaded_path = await client.download_media(message, file=file_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {e}")
    finally:
        await client.disconnect()

    if not downloaded_path or not os.path.exists(downloaded_path):
        raise HTTPException(status_code=500, detail="File download failed")

    return FileResponse(
        path=downloaded_path,
        filename=os.path.basename(downloaded_path),
        media_type="application/octet-stream",
    )


# ─── Main ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
