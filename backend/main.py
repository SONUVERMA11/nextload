"""
NexLoad yt-dlp FastAPI Backend
Provides video info extraction and direct download URLs
Supports 1000+ sites via yt-dlp

Deploy: Render.com free tier, Railway, or any Docker host

Usage:
    uvicorn main:app --host 0.0.0.0 --port 8000

Endpoints:
    GET /info?url=<url>              → Video metadata & formats
    GET /download-url?url=<url>&format_id=best  → Direct download URL
    GET /health                      → Health check
    GET /supported-sites             → List of supported sites
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import yt_dlp
import asyncio
import time

app = FastAPI(
    title="NexLoad yt-dlp API",
    description="Video info extraction & download URL resolver",
    version="1.0.0",
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
    return {"status": "ok", "service": "nexload-ytdlp", "timestamp": int(time.time())}


# ─── Video Info Extraction ───────────────────────────────────────────────

@app.get("/info")
async def get_info(url: str = Query(..., description="Video URL to extract info from")):
    """Extract video metadata and available formats from a URL."""
    try:
        opts = {
            "quiet": True,
            "no_warnings": True,
            "no_color": True,
            "skip_download": True,
        }

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
        opts = {
            "format": format_id,
            "quiet": True,
            "no_warnings": True,
            "no_color": True,
        }

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
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "playlistend": limit,
        }

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


# ─── Main ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
