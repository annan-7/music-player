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
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, '../dist')));

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Check if FFmpeg is available
const checkFFmpeg = () => {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      if (err) {
        console.warn('⚠️  FFmpeg not available. YouTube extraction will not work.');
        resolve(false);
      } else {
        console.log('✅ FFmpeg is available');
        resolve(true);
      }
    });
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Music Player Backend API',
    version: '1.0.0',
    status: 'running'
  });
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

    console.log(`🎵 Extracting audio from: ${url}`);

    // Get video info
    const videoInfo = await ytdl.getInfo(url);
    const videoTitle = videoInfo.videoDetails.title;
    const videoId = videoInfo.videoDetails.videoId;
    const duration = parseInt(videoInfo.videoDetails.lengthSeconds);

    console.log(`📹 Video: ${videoTitle} (${duration}s)`);

    // Create filename
    const filename = `${videoId}.${format}`;
    const filepath = join(uploadsDir, filename);

    // Check if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`✅ Audio file already exists: ${filename}`);
      return res.json({
        success: true,
        audioUrl: `/api/audio/${filename}`,
        title: videoTitle,
        duration: duration,
        videoId: videoId
      });
    }

    // Check if FFmpeg is available
    const ffmpegAvailable = await checkFFmpeg();
    if (!ffmpegAvailable) {
      return res.status(500).json({ 
        error: 'FFmpeg is not available. Please install FFmpeg to extract YouTube audio.' 
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
      .audioBitrate(128)
      .on('start', (commandLine) => {
        console.log(`🔄 Starting conversion: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`📊 Progress: ${progress.percent}%`);
      })
      .on('end', () => {
        console.log(`✅ Audio extracted successfully: ${filename}`);
        res.json({
          success: true,
          audioUrl: `/api/audio/${filename}`,
          title: videoTitle,
          duration: duration,
          videoId: videoId
        });
      })

      
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err);
        // Clean up partial file
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        res.status(500).json({ 


          
          error: 'Failed to process audio . Please try again or refresh the window.',
          details: err.message 
        });

        
      })
      .pipe(writeStream);






      

  } catch (error) {
    console.error('❌ YouTube extraction error:', error);

    
    res.status(500).json({ 
      error: 'Failed to extract audio from YouTube URL',
      details: error.message 
    });
  }
});

// Serve audio files
app.get('/api/audio/:filename', (req, res) => {
  try {

    
    const { filename } = req.params;
    const filepath = join(uploadsDir, filename);
    

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Set appropriate headers for audio streaming
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
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', fileSize);
      fs.createReadStream(filepath).pipe(res);
    }
  } catch (error) {
    console.error('❌ Audio serving error:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// Get list of available audio files
app.get('/api/audio', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.match(/\.(mp3|wav|ogg|aac)$/))
      .map(file => {
        const filepath = join(uploadsDir, file);
        const stat = fs.statSync(filepath);
        return {
          filename: file,
          url: `/api/audio/${file}`,
          size: stat.size,
          created: stat.birthtime
        };
      });
    
    res.json({ files });
  } catch (error) {
    console.error('❌ Error getting audio files:', error);
    res.status(500).json({ error: 'Failed to get audio files' });
  }
});

// Delete audio file
app.delete('/api/audio/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = join(uploadsDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    fs.unlinkSync(filepath);
    console.log(`🗑️  Deleted audio file: ${filename}`);
    res.json({ success: true, message: 'Audio file deleted' });
  } catch (error) {
    console.error('❌ Error deleting audio file:', error);
    res.status(500).json({ error: 'Failed to delete audio file' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ffmpeg: ffmpeg.available ? 'available' : 'not available'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
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
  
  // Check FFmpeg availability on startup
  checkFFmpeg();
}); 