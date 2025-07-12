import express from 'express';
import cors from 'cors';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Music Player Backend API' });
});

// YouTube audio extraction endpoint
app.post('/api/extract-youtube', async (req, res) => {
  try {
    const { url, format = 'mp3', quality = 'highestaudio' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get video info
    const videoInfo = await ytdl.getInfo(url);
    const videoTitle = videoInfo.videoDetails.title;
    const videoId = videoInfo.videoDetails.videoId;

    // Create filename
    const filename = `${videoId}.${format}`;
    const filepath = join(uploadsDir, filename);

    // Check if file already exists
    if (fs.existsSync(filepath)) {
      return res.json({
        success: true,
        audioUrl: `/api/audio/${filename}`,
        title: videoTitle,
        duration: videoInfo.videoDetails.lengthSeconds,
        videoId: videoId
      });
    }

    // Download and convert audio
    const audioStream = ytdl(url, {
      quality: quality,
      filter: 'audioonly'
    });

    // Convert to specified format using ffmpeg
    const writeStream = fs.createWriteStream(filepath);

    ffmpeg(audioStream)
      .toFormat(format)
      .on('end', () => {
        console.log(`Audio extracted: ${filename}`);
        res.json({
          success: true,
          audioUrl: `/api/audio/${filename}`,
          title: videoTitle,
          duration: videoInfo.videoDetails.lengthSeconds,
          videoId: videoId
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        res.status(500).json({ error: 'Failed to process audio' });
      })
      .pipe(writeStream);

  } catch (error) {
    console.error('YouTube extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract audio from YouTube URL',
      details: error.message 
    });
  }
});

// Serve audio files
app.get('/api/audio/:filename', (req, res) => {
  const { filename } = req.params;
  const filepath = join(uploadsDir, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  // Set appropriate headers for audio streaming
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  
  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filepath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    fs.createReadStream(filepath).pipe(res);
  }
});

// Get list of available audio files
app.get('/api/audio', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.match(/\.(mp3|wav|ogg|aac)$/))
      .map(file => ({
        filename: file,
        url: `/api/audio/${file}`,
        size: fs.statSync(join(uploadsDir, file)).size
      }));
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audio files' });
  }
});

// Delete audio file
app.delete('/api/audio/:filename', (req, res) => {
  const { filename } = req.params;
  const filepath = join(uploadsDir, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  try {
    fs.unlinkSync(filepath);
    res.json({ success: true, message: 'Audio file deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete audio file' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 Music Player Backend running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🌐 API available at: http://localhost:${PORT}/api`);
}); 