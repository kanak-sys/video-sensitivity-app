const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const{ Jimp }= require("jimp");
const Video = require("../models/Video");

// Configuration
const CONFIG = {
  FRAMES_TO_EXTRACT: 8, // Extract more frames for better accuracy
  SAMPLE_STEP: 6, // Pixel sampling step (higher = faster)
  SKIN_THRESHOLD_AVG: 0.3, // Average skin ratio threshold
  SKIN_THRESHOLD_MAX: 0.45, // Max skin ratio threshold
  MIN_DURATION_FOR_ANALYSIS: 5, // Minimum video duration in seconds
  MAX_RETRIES: 3
};

/**
 * Extract frames from video at equal intervals
 */
const extractFrames = (videoPath, framesDir, count = CONFIG.FRAMES_TO_EXTRACT) => {
  return new Promise((resolve, reject) => {
    // Get video duration first to determine timestamps
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const duration = metadata.format?.duration || 0;
      
      // Calculate timestamps at equal intervals
      const timestamps = [];
      if (duration > 0) {
        const interval = duration / (count + 1); // Avoid first and last second
        for (let i = 1; i <= count; i++) {
          timestamps.push(i * interval);
        }
      } else {
        // If duration unknown, use default timestamps
        timestamps.push('50%'); // Middle of video
      }

      ffmpeg(videoPath)
        .on('start', (commandLine) => {
          console.log(`[FFmpeg] Extracting ${count} frames: ${commandLine}`);
        })
        .on('end', () => {
          console.log(`[FFmpeg] Frames extracted to ${framesDir}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('[FFmpeg] Frame extraction error:', err.message);
          reject(new Error(`Frame extraction failed: ${err.message}`));
        })
        .screenshots({
          timestamps,
          folder: framesDir,
          filename: 'frame-%i.jpg',
          size: '320x?',
          quality: 90
        });
    });
  });
};

/**
 * Get detailed video metadata
 */
const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.warn('[FFprobe] Metadata warning:', err.message);
        // Return basic metadata instead of rejecting
        resolve({
          format: {},
          streams: [],
          hasVideo: false
        });
      } else {
        const videoStream = (metadata.streams || []).find(s => s.codec_type === 'video');
        resolve({
          format: metadata.format || {},
          streams: metadata.streams || [],
          videoStream,
          hasVideo: !!videoStream
        });
      }
    });
  });
};

/**
 * Enhanced skin detection with multiple color spaces
 */
const computeFrameSkinRatio = async (framePath, sampleStep = CONFIG.SAMPLE_STEP) => {
  try {
    const image = await Jimp.read(framePath);
    const { bitmap } = image;
    
    let skinCount = 0;
    let sampleCount = 0;
    const totalPixels = bitmap.width * bitmap.height;
    
    // Only sample if image is large enough
    if (totalPixels > 10000) {
      sampleStep = Math.max(sampleStep, Math.floor(Math.sqrt(totalPixels / 10000)));
    }

    for (let y = 0; y < bitmap.height; y += sampleStep) {
      for (let x = 0; x < bitmap.width; x += sampleStep) {
        const idx = (bitmap.width * y + x) << 2;
        const r = bitmap.data[idx + 0];
        const g = bitmap.data[idx + 1];
        const b = bitmap.data[idx + 2];

        // Enhanced skin detection rules (RGB-based)
        // Rule 1: Basic skin color range
        const isSkinRGB = (
          r > 95 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15
        );

        // Rule 2: YCbCr color space (optional)
        const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        
        const isSkinYCbCr = (
          yVal > 80 &&
          cb >= 85 && cb <= 135 &&
          cr >= 135 && cr <= 180
        );

        if (isSkinRGB || isSkinYCbCr) {
          skinCount++;
        }
        sampleCount++;
      }
    }

    return sampleCount === 0 ? 0 : skinCount / sampleCount;
  } catch (err) {
    console.error(`[Jimp] Error processing frame ${framePath}:`, err.message);
    return 0;
  }
};

/**
 * Analyze all extracted frames for skin content
 */
const analyzeFramesForSkin = async (framesDir) => {
  try {
    const files = fs.readdirSync(framesDir)
      .filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));
    
    if (!files.length) {
      return { avg: 0, max: 0, perFrame: [], frameCount: 0 };
    }

    const perFrame = [];
    const analysisPromises = files.map(async (file) => {
      const framePath = path.join(framesDir, file);
      const ratio = await computeFrameSkinRatio(framePath);
      return ratio;
    });

    const results = await Promise.allSettled(analysisPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        perFrame.push(result.value);
      } else {
        console.warn(`[Analysis] Frame ${files[index]} failed:`, result.reason);
        perFrame.push(0);
      }
    });

    const avg = perFrame.length > 0 
      ? perFrame.reduce((s, v) => s + v, 0) / perFrame.length 
      : 0;
    const max = perFrame.length > 0 ? Math.max(...perFrame) : 0;

    return { 
      avg: Number(avg.toFixed(4)), 
      max: Number(max.toFixed(4)), 
      perFrame, 
      frameCount: perFrame.length 
    };
  } catch (err) {
    console.error('[Analysis] Frame analysis error:', err);
    return { avg: 0, max: 0, perFrame: [], frameCount: 0 };
  }
};

/**
 * Determine sensitivity based on analysis results
 */
const determineSensitivity = (skinAnalysis, videoDuration, metadata) => {
  const { avg, max, frameCount } = skinAnalysis;
  const { hasVideo } = metadata;

  // If no video stream, mark as error
  if (!hasVideo) {
    return {
      status: 'error',
      reason: 'No video stream detected in file',
      confidence: 0,
      details: { skinRatio: avg, frameCount }
    };
  }

  // If video is too short for reliable analysis
  if (videoDuration < CONFIG.MIN_DURATION_FOR_ANALYSIS) {
    return {
      status: 'safe',
      reason: 'Video too short for analysis',
      confidence: 0.5,
      details: { skinRatio: avg, frameCount }
    };
  }

  // Analysis rules
  const isSensitive = (
    avg > CONFIG.SKIN_THRESHOLD_AVG || 
    max > CONFIG.SKIN_THRESHOLD_MAX
  );

  if (isSensitive) {
    const confidence = Math.min(0.95, Math.max(avg, max));
    let reason = '';

    if (avg > CONFIG.SKIN_THRESHOLD_AVG && max > CONFIG.SKIN_THRESHOLD_MAX) {
      reason = 'High skin exposure detected consistently across multiple frames';
    } else if (avg > CONFIG.SKIN_THRESHOLD_AVG) {
      reason = 'Above average skin exposure detected';
    } else {
      reason = 'High skin exposure detected in specific frames';
    }

    return {
      status: 'sensitive',
      reason,
      confidence: Number(confidence.toFixed(3)),
      details: { 
        skinRatio: avg, 
        maxSkinRatio: max,
        frameCount,
        thresholds: {
          avg: CONFIG.SKIN_THRESHOLD_AVG,
          max: CONFIG.SKIN_THRESHOLD_MAX
        }
      }
    };
  }

  // Safe content
  return {
    status: 'safe',
    reason: 'Normal visual content detected',
    confidence: Number((1 - Math.min(avg, 0.5)).toFixed(3)), // Inverse of skin ratio
    details: { 
      skinRatio: avg, 
      maxSkinRatio: max,
      frameCount 
    }
  };
};

/**
 * Generate thumbnail from video
 */
const generateThumbnail = async (videoPath, videoId, duration = 0) => {
  try {
    const thumbsDir = path.join(__dirname, "..", "uploads", "thumbnails");
    fs.mkdirSync(thumbsDir, { recursive: true });
    const thumbPath = path.join(thumbsDir, `${videoId}.jpg`);

    // Choose timestamp: 1 second or 10% of duration
    const timestamp = Math.min(1, duration * 0.1) || 1;

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('start', () => {
          console.log(`[Thumbnail] Generating for ${videoId}`);
        })
        .on('end', () => {
          console.log(`[Thumbnail] Generated: ${thumbPath}`);
          resolve(`/uploads/thumbnails/${videoId}.jpg`);
        })
        .on('error', (err) => {
          console.error(`[Thumbnail] Error for ${videoId}:`, err.message);
          reject(err);
        })
        .screenshots({
          timestamps: [timestamp],
          filename: `${videoId}.jpg`,
          folder: thumbsDir,
          size: '640x?',
          quality: 90
        });
    });
  } catch (err) {
    console.error('[Thumbnail] Generation failed:', err);
    throw err;
  }
};

/**
 * Main video processing function
 */
const processVideo = async (video, io) => {
  const startTime = Date.now();
  const videoId = video._id.toString();
  
  console.log(`[Processing] Starting analysis for video ${videoId}`);

  // Validation checks
  if (video.analysisDone) {
    console.log(`[Processing] Video ${videoId} already analyzed. Skipping.`);
    return;
  }

  if (video.analysisRetries >= CONFIG.MAX_RETRIES) {
    console.log(`[Processing] Video ${videoId} reached max retries (${CONFIG.MAX_RETRIES}).`);
    
    video.sensitivity = {
      status: 'error',
      reason: 'Analysis failed after maximum retry attempts',
      confidence: 0,
      checkedAt: new Date()
    };
    video.status = 'failed';
    await video.save();
    
    io.emit('analysis-complete', { 
      videoId, 
      status: 'failed',
      message: 'Analysis failed after maximum retries'
    });
    return;
  }

  // Update video status
  try {
    video.analysisRequested = true;
    video.analysisRetries = (video.analysisRetries || 0) + 1;
    video.lastAnalysisAttempt = new Date();
    video.status = 'processing';
    video.processingStartTime = new Date();
    await video.save();
  } catch (err) {
    console.error(`[Processing] Failed to update video status:`, err);
    return;
  }

  const videoPath = path.join(__dirname, "..", "uploads", video.storedName);
  const framesDir = path.join(__dirname, "..", "temp", videoId);

  try {
    // Validate video file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Create temp directory
    fs.mkdirSync(framesDir, { recursive: true });

    // Emit initial progress
    io.emit('progress', { 
      videoId, 
      progress: 5, 
      message: 'Starting analysis...' 
    });

    // Step 1: Get video metadata
    io.emit('progress', { 
      videoId, 
      progress: 15, 
      message: 'Extracting video metadata...' 
    });

    const metadata = await getVideoMetadata(videoPath);
    const duration = metadata.format?.duration || video.duration || 0;
    
    // Update video with metadata
    if (metadata.videoStream) {
      video.width = metadata.videoStream.width || video.width;
      video.height = metadata.videoStream.height || video.height;
      video.bitrate = Number(metadata.format?.bit_rate) || video.bitrate;
      video.codec = metadata.videoStream.codec_name || video.codec;

      // ✅ FIX: Parse fractional frame rate (e.g. "60/1", "30000/1001")
      const frameRateStr =
        metadata.videoStream.avg_frame_rate ||
        metadata.videoStream.r_frame_rate;

      if (frameRateStr && typeof frameRateStr === "string") {
        if (frameRateStr.includes("/")) {
          const [num, den] = frameRateStr.split("/").map(Number);
          video.frameRate = den && den !== 0 ? num / den : 0;
        } else {
          video.frameRate = Number(frameRateStr) || 0;
        }
      } else {
        video.frameRate = 0;
      }
    }

    video.duration = duration;
    await video.save();

    // Step 2: Extract frames
    io.emit('progress', { 
      videoId, 
      progress: 30, 
      message: 'Extracting frames for analysis...' 
    });

    await extractFrames(videoPath, framesDir, CONFIG.FRAMES_TO_EXTRACT);
    
    // Step 3: Analyze frames
    io.emit('progress', { 
      videoId, 
      progress: 50, 
      message: 'Analyzing frame content...' 
    });

    const skinAnalysis = await analyzeFramesForSkin(framesDir);
    
    // Step 4: Determine sensitivity
    io.emit('progress', { 
      videoId, 
      progress: 70, 
      message: 'Determining sensitivity level...' 
    });

    const sensitivityResult = determineSensitivity(skinAnalysis, duration, metadata);
    
    // Step 5: Generate thumbnail if needed
    io.emit('progress', { 
      videoId, 
      progress: 85, 
      message: 'Generating thumbnail...' 
    });

    if (!video.thumbnail) {
      try {
        video.thumbnail = await generateThumbnail(videoPath, videoId, duration);
      } catch (thumbErr) {
        console.warn(`[Processing] Thumbnail generation skipped:`, thumbErr.message);
      }
    }

    // Step 6: Update video with results
    io.emit('progress', { 
      videoId, 
      progress: 95, 
      message: 'Finalizing results...' 
    });

    video.sensitivity = {
      ...sensitivityResult,
      checkedAt: new Date()
    };
    video.analysisDone = true;
    video.analysisRequested = false;
    video.status = 'processed';
    video.processingEndTime = new Date();
    video.tags = sensitivityResult.status === 'sensitive' ? ['sensitive'] : ['safe'];
    
    if (sensitivityResult.status === 'sensitive') {
      video.tags.push('review_needed');
    }

    await video.save();

    const processingTime = Date.now() - startTime;
    
    // Final progress and completion
    io.emit('progress', { 
      videoId, 
      progress: 100, 
      message: 'Analysis complete!' 
    });

    io.emit('analysis-complete', { 
      videoId, 
      status: sensitivityResult.status,
      confidence: sensitivityResult.confidence,
      processingTime,
      timestamp: new Date().toISOString()
    });

    console.log(`[Processing] Analysis completed for ${videoId}:`, {
      status: sensitivityResult.status,
      confidence: sensitivityResult.confidence,
      duration: `${duration.toFixed(1)}s`,
      processingTime: `${processingTime}ms`,
      skinRatio: skinAnalysis.avg
    });

  } catch (err) {
    console.error(`[Processing] Analysis failed for ${videoId}:`, err);
    
    // Update video with error
    video.status = 'failed';
    video.analysisRequested = false;
    video.error = {
      message: err.message,
      stack: err.stack,
      timestamp: new Date()
    };
    await video.save();

    io.emit('analysis-complete', { 
      videoId, 
      status: 'failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });

  } finally {
    // Cleanup: remove temporary frames
    try {
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
        console.log(`[Cleanup] Removed temp directory: ${framesDir}`);
      }
    } catch (cleanupErr) {
      console.warn(`[Cleanup] Failed to remove ${framesDir}:`, cleanupErr.message);
    }
  }
};

module.exports = processVideo;