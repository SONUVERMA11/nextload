# NexLoad

> Download Anything. At Full Speed. ⚡

Ultimate Android Download Manager built with React Native (Expo Bare Workflow).

## Features

- **Direct HTTP/HTTPS downloads** — chunked, resumable, 8 parallel threads
- **YouTube & 1000+ sites** — via yt-dlp backend (YouTube, Instagram, Twitter/X, TikTok, etc.)
- **Torrent/Magnet downloads** — full DHT, PEX, LSD peer discovery
- **Telegram file downloads** — paste any t.me link
- **MP3 extraction** — convert any video to audio (128/192/320kbps/FLAC)
- **Torrent search** — unified search across YTS, EZTV, TPB, Nyaa, LimeTorrents
- **Built-in file manager** — browse, share, rename, delete
- **Dark/Light theme** — iOS-inspired design with system-aware toggle
- **Background downloads** — continues when screen is off
- **Batch downloads** — paste multiple URLs at once
- **Clipboard detection** — auto-suggests download when URL is copied

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React Native (Expo Bare) |
| Language | TypeScript (strict) |
| Navigation | @react-navigation/bottom-tabs v6 |
| State | Zustand |
| HTTP | axios |
| Animations | react-native-reanimated v3 |
| Icons | Ionicons |
| Storage | react-native-mmkv |
| FFmpeg | ffmpeg-kit-react-native |
| Backend | FastAPI + yt-dlp |

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Generate native Android project
```bash
npx expo prebuild --platform android
```

### 3. Run on Android
```bash
npx expo run:android
```

### 4. Deploy backend
```bash
cd backend
docker build -t nexload-ytdlp .
docker run -p 8000:8000 nexload-ytdlp
```

Or deploy to [Render.com](https://render.com) for free hosting.

## Build APK (EAS)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

## Project Structure
```
NexLoad/
├── App.tsx                    ← Root with bottom tab navigator
├── src/
│   ├── screens/               ← 4 main screens
│   ├── components/            ← 8 reusable UI components
│   ├── services/              ← 7 service modules
│   ├── store/                 ← 3 Zustand stores
│   ├── theme/                 ← Color palettes, typography, ThemeProvider
│   ├── hooks/                 ← Custom React hooks
│   └── utils/                 ← Formatting & helper utilities
├── backend/                   ← FastAPI yt-dlp server
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
└── package.json
```

## License

MIT
