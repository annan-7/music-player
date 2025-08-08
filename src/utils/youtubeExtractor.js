// YouTube Audio Extractor Utility
// Connects to the backend server for YouTube audio extraction

export class YouTubeExtractor {


  
  constructor() {
    this.baseUrl = 'http://localhost:3001'; // Backend API URL
  }

  

  async extractAudioFromUrl(youtubeUrl) {
    try {

      
      // Validate YouTube URL
      if (!this.isValidYouTubeUrl(youtubeUrl)) {
        throw new Error('Invalid YouTube URL');
      }

      const response = await fetch(`${this.baseUrl}/api/extract-youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        
        body: JSON.stringify({ 
          url: youtubeUrl,
          format: 'mp3',
          quality: 'highestaudio'
        })
      });


      

      

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract audio');
      }

      const result = await response.json();
      
      // Convert relative URL to absolute URL
      if (result.audioUrl && result.audioUrl.startsWith('/')) {
        result.audioUrl = `${this.baseUrl}${result.audioUrl}`;
      }

      return result;
    } catch (error) {
      console.error('YouTube extraction error:', error);
      throw error;
    }
  }

  isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }

  getVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Check if backend is available
  async checkBackendHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

// Alternative implementation using ytdl-core (requires Node.js backend)
export class YouTubeExtractorBackend {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  async extractAudioWithBackend(youtubeUrl) {
    try {
      const response = await fetch(`${this.baseUrl}/api/extract-youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: youtubeUrl,
          format: 'mp3',
          quality: 'highestaudio'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Backend extraction error:', error);
      throw error;
    }
  }
}

// Utility functions for audio processing
export const audioUtils = {
  // Convert audio format using Web Audio API
  async convertToMp3(audioBlob) {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to MP3 (simplified - in reality you'd need a proper encoder)
          const mp3Blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
          resolve(mp3Blob);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(audioBlob);
    });
  },

  // Get audio duration
  async getAudioDuration(audioUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', reject);
      audio.src = audioUrl;
    });
  },

  // Validate audio file
  isValidAudioFile(file) {
    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/flac'
    ];
    return validTypes.includes(file.type);
  },

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}; 