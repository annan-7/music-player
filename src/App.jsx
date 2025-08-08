import { useState, useRef, useEffect } from 'react'
import { YouTubeExtractor, audioUtils } from './utils/youtubeExtractor'
import './App.css'

function App() {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [playlist, setPlaylist] = useState([])
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [backendStatus, setBackendStatus] = useState('checking')

  
  
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const youtubeExtractor = useRef(new YouTubeExtractor())

  useEffect(() => {
    // Check backend status on mount

    
    checkBackendStatus()
    
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      // Auto-play next track if available
      if (playlist.length > 0 && currentIndex < playlist.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setCurrentTrack(playlist[currentIndex + 1])
      }
    }


    

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {

      
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [playlist, currentIndex])

  const checkBackendStatus = async () => {
    try {
      const isHealthy = await youtubeExtractor.current.checkBackendHealth()
      setBackendStatus(isHealthy ? 'connected' : 'disconnected')
    } catch (error) {
      setBackendStatus('disconnected')
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    const validFiles = files.filter(file => audioUtils.isValidAudioFile(file))
    
    if (validFiles.length === 0) {
      setError('Please select valid audio files (MP3, WAV, OGG, AAC, FLAC)')
      return
    }

    const newTracks = validFiles.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: 'file',
      file: file,
      size: audioUtils.formatFileSize(file.size)
    }))

    setPlaylist(prev => [...prev, ...newTracks])
    setCurrentTrack(newTracks[0])
    setCurrentIndex(playlist.length)
    setError('')
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleYouTubeUrl = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    if (backendStatus !== 'connected') {
      setError('Backend server is not connected. Please start the server first.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await youtubeExtractor.current.extractAudioFromUrl(youtubeUrl)
      
      if (result.success) {
        const track = {
          name: result.title,
          url: result.audioUrl,
          type: 'youtube',
          duration: result.duration,
          videoId: result.videoId
        }
        
        setPlaylist(prev => [...prev, track])
        setCurrentTrack(track)
        setCurrentIndex(playlist.length)
        setYoutubeUrl('')
      } else {
        setError('Failed to extract audio from YouTube URL')
      }
    } catch (err) {
      setError(err.message || 'Failed to extract audio from YouTube URL')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePlayPause = () => {
    if (!currentTrack) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (event) => {
    const time = (event.target.value / 100) * duration
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleVolumeChange = (event) => {
    const newVolume = event.target.value
    setVolume(newVolume)
    audioRef.current.volume = newVolume
  }

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const playNext = () => {
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setCurrentTrack(playlist[nextIndex])
      setIsPlaying(false)
    }
  }

  const playPrevious = () => {
    if (playlist.length > 0 && currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      setCurrentTrack(playlist[prevIndex])
      setIsPlaying(false)
    }
  }

  const removeTrack = (index) => {
    const newPlaylist = playlist.filter((_, i) => i !== index)
    setPlaylist(newPlaylist)
    
    if (index === currentIndex) {
      if (newPlaylist.length > 0) {
        const newIndex = Math.min(index, newPlaylist.length - 1)
        setCurrentIndex(newIndex)
        setCurrentTrack(newPlaylist[newIndex])
      } else {
        setCurrentTrack(null)
        setCurrentIndex(0)
      }
    } else if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const getBackendStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return '#10b981'
      case 'disconnected': return '#ef4444'
      default: return '#f59e0b'
    }
  }

  const getBackendStatusText = () => {
    switch (backendStatus) {
      case 'connected': return 'Connected'
      case 'disconnected': return 'Disconnected'
      default: return 'Checking...'
    }
  }

  // Download helpers
  const getDownloadUrl = (track) => {
    if (track.type === 'youtube' && track.videoId) {
      // Extract filename from backend
      return `http://localhost:3001/api/audio/${track.videoId}.mp3`
    } else if (track.type === 'file' && track.file) {
      return track.url
    } else {
      return track.url
    }
  }
  const getDownloadName = (track) => {
    if (track.type === 'youtube' && track.videoId) {
      return `${track.name || 'youtube-audio'}.mp3`
    } else if (track.type === 'file' && track.file) {
      return track.file.name
    } else {
      return track.name || 'audio.mp3'
    }
  }

  return (
    <div className="music-player">
      <div className="player-container">
        <h1>Music Player</h1>
        
        {/* Backend Status */}
        <div className="backend-status" style={{ 
          backgroundColor: getBackendStatusColor(),
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: '20px',
          display: 'inline-block',
          position: 'absolute',
          top: '20px',
          right: '20px'
        }}>
          {backendStatus === 'checking' && <span className="loading" style={{ marginRight: '8px' }}></span>}
          {getBackendStatusText()}
        </div>
        
        {/* File Upload Section */}
        <div className="upload-section">
          <h3>📁 Upload Audio Files</h3>
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="file-input"
          />
          <p className="file-hint">Supports MP3, WAV, OGG, AAC, FLAC formats</p>
        </div>

        {/* YouTube URL Section */}
        <div className="youtube-section">
          <h3>🎥 YouTube Audio</h3>
          <div className="url-input">
            <input
              type="text"
              placeholder="Enter YouTube URL..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="url-field"
              disabled={backendStatus !== 'connected'}
            />
            <button 
              onClick={handleYouTubeUrl}
              disabled={isLoading || backendStatus !== 'connected'}
              className="extract-btn"
            >
              {isLoading ? (
                <>
                  <span className="loading" style={{ marginRight: '8px' }}></span>
                  Extracting...
                </>
              ) : (
                'Extract Audio'
              )}
            </button>
          </div>
          {backendStatus !== 'connected' && (
            <p className="file-hint" style={{ color: '#ef4444', marginTop: '8px' }}>
              ⚠️ Backend server is required for YouTube extraction
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error">
            <span style={{ marginRight: '8px' }}>⚠️</span>
            {error}
          </div>
        )}

        {/* Playlist */}
        {playlist.length > 0 && (
          <div className="playlist-section">
            <h3>🎵 Playlist ({playlist.length} tracks)</h3>
            <div className="playlist">
              {playlist.map((track, index) => (
                <div 
                  key={index} 
                  className={`playlist-item ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentIndex(index)
                    setCurrentTrack(track)
                    setIsPlaying(false)
                  }}
                >
                  <span className="track-name">{track.name}</span>
                  <span className="track-type">
                    {track.type === 'youtube' ? 'YouTube' : 'Local'}
                    {track.size && ` • ${track.size}`}
                  </span>
                  <a
                    href={getDownloadUrl(track)}
                    download={getDownloadName(track)}
                    className="download-btn"
                    onClick={e => e.stopPropagation()}
                    title="Download"
                  >
                    ⬇️
                  </a>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTrack(index)
                    }}
                    className="remove-btn"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Player */}
        {currentTrack && (
          <div className="audio-player">
            <div className="track-info">
              <h4>{currentTrack.name}</h4>
              <p>
                {currentTrack.type === 'youtube' ? 'YouTube Audio' : 'Local File'}
                {currentTrack.duration && ` • ${formatTime(currentTrack.duration)}`}
              </p>
              <a
                href={getDownloadUrl(currentTrack)}
                download={getDownloadName(currentTrack)}
                className="download-btn main"
                title="Download this song"
                style={{marginTop: 10, display: 'inline-block'}}
              >
                ⬇️ Download
              </a>
            </div>

            <audio
              ref={audioRef}
              src={currentTrack.url}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Controls */}
            <div className="controls">
              <div className="main-controls">
                <button onClick={playPrevious} className="control-btn" disabled={currentIndex === 0}>
                  ⏮️
                </button>
                <button onClick={togglePlayPause} className="play-btn">
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button onClick={playNext} className="control-btn" disabled={currentIndex === playlist.length - 1}>
                  ⏭️
                </button>
              </div>

              <div className="progress-container">
                <span className="time">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={handleSeek}
                  className="progress-bar"
                />
                <span className="time">{formatTime(duration)}</span>
              </div>

              <div className="volume-container">
                <span>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-bar"
                />
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!currentTrack && (
          <div className="instructions">
            <p>🎵 Welcome to your modern music player!</p>
            <p>Upload audio files or extract audio from YouTube URLs to start playing music.</p>
            <p>You can create playlists and enjoy seamless playback with beautiful controls.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
