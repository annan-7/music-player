# 🎵 Music Player

A modern, feature-rich music player built with React that can play local MP3 files and extract audio from YouTube URLs.

## ✨ Features


- **Local Audio Playback**: Upload and play MP3, WAV, OGG, AAC, and FLAC files

- **YouTube Audio Extraction**: Extract audio from YouTube URLs and convert to MP3 in minutes
- **Playlist Management**: Create and manage playlists with multiple tracks
- **Modern UI**: Beautiful, responsive design with smooth animations
- **Audio Controls**: Play, pause, seek, volume control, and track navigation
- **Auto-play**: Automatically play next track when current track ends

## 🚀 Quick Start

### Prerequisites



- Node.js (v16 or higher)
- FFmpeg (for YouTube audio conversion)

### Installation



1. **Clone or download the project**
   ```bash
   cd "music player"
   ```


   

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server

   
   npm install
   ```




4. **Install FFmpeg** (required for YouTube audio extraction)
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```
   
   **macOS:**
   ```bash
   brew install ffmpeg
   ```


   
   
   **Windows:**
   Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

### Running the Application

1. **Start the backend server** (in one terminal):
   ```bash
   cd server
   npm start
   ```

   
   The backend will run on `http://localhost:3001`


   

2. **Start the frontend** (in another terminal):
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

## 🎮 How to Use

### Playing Local Audio Files

1. Click on the file upload area or drag and drop audio files
2. Supported formats: MP3, WAV, OGG, AAC, FLAC
3. Multiple files can be selected at once
4. Files will be added to your playlist

### Extracting YouTube Audio

1. Paste a YouTube URL in the input field
2. Click "Extract Audio"
3. The audio will be downloaded and converted to MP3
4. The track will be added to your playlist

### Playlist Controls

- **Play/Pause**: Click the play button to start/stop playback
- **Previous/Next**: Use the arrow buttons to navigate between tracks
- **Seek**: Drag the progress bar to jump to any position
- **Volume**: Adjust volume using the volume slider
- **Remove Tracks**: Click the trash icon to remove tracks from playlist

## 🛠️ Technical Details

### Frontend (React + Vite)
- **Framework**: React 19 with Hooks
- **Styling**: Modern CSS with gradients and animations
- **Audio**: HTML5 Audio API
- **File Handling**: FileReader API for local files

### Backend (Node.js + Express)
- **Server**: Express.js with CORS support
- **YouTube Extraction**: ytdl-core library
- **Audio Conversion**: FFmpeg for format conversion
- **File Storage**: Local file system with organized uploads

### API Endpoints

- `POST /api/extract-youtube` - Extract audio from YouTube URL
- `GET /api/audio/:filename` - Serve audio files
- `GET /api/audio` - List available audio files
- `DELETE /api/audio/:filename` - Delete audio file
- `GET /api/health` - Health check

## 🔧 Configuration

### Backend Configuration

The backend server can be configured by setting environment variables:

```bash
PORT=3001  # Server port (default: 3001)
NODE_ENV=development  # Environment mode
```

### Frontend Configuration

The frontend connects to the backend API. The backend URL can be configured in `src/utils/youtubeExtractor.js`:

```javascript
this.baseUrl = 'http://localhost:3001'; // Change this for production
```

## 🐛 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Make sure FFmpeg is installed
   - Check if port 3001 is available
   - Verify all dependencies are installed

2. **YouTube extraction fails**
   - Ensure the YouTube URL is valid
   - Check internet connection
   - Verify FFmpeg is properly installed

3. **Audio files not playing**
   - Check browser console for errors
   - Verify file format is supported
   - Ensure file is not corrupted

4. **CORS errors**
   - Make sure backend is running on correct port
   - Check that CORS is properly configured

### Development

For development with auto-reload:

```bash
# Backend (in server directory)
npm run dev

# Frontend
npm run dev
```

## 📁 Project Structure

```
music player/
├── src/
│   ├── App.jsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.jsx         # React entry point
│   └── utils/
│       └── youtubeExtractor.js  # YouTube extraction utilities
├── server/
│   ├── server.js        # Express server
│   ├── package.json     # Backend dependencies
│   └── uploads/         # Extracted audio files
├── public/              # Static assets
├── package.json         # Frontend dependencies
└── README.md           # This file
```

## 🤝 Contributing
Currently not updating this project but if you want to contribute, go ahead!


**Note**: This application is for educational purposes. Please respect YouTube's terms of service and copyright laws when using this tool.
