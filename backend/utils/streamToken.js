const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Use JWT_SECRET if STREAM_SECRET is not defined
const STREAM_SECRET = process.env.STREAM_SECRET || process.env.JWT_SECRET || "your_stream_secret_key_change_this";
const TOKEN_EXPIRY = process.env.STREAM_TOKEN_EXPIRY || '1h'; // Token expires in 1 hour

/**
 * Generate a secure stream token using JWT
 * @param {string} videoId - MongoDB video ID
 * @param {string} userId - User ID requesting access
 * @param {string} tenantId - Tenant ID for additional security
 * @returns {string} JWT stream token
 */
exports.generateStreamToken = (videoId, userId, tenantId = null) => {
  if (!videoId || !userId) {
    throw new Error("videoId and userId are required for stream token generation");
  }

  // Create JWT payload
  const payload = {
    videoId: videoId.toString(),
    userId: userId.toString(),
    tenantId: tenantId ? tenantId.toString() : null,
    type: 'stream', // Token type identifier
    iat: Math.floor(Date.now() / 1000)
  };

  // Sign with secret and set expiry
  const token = jwt.sign(payload, STREAM_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: 'HS256'
  });

  console.log(`[StreamToken] Generated for video ${videoId}, user ${userId}`);
  return token;
};

/**
 * Verify and decode a stream token
 * @param {string} token - JWT stream token
 * @returns {Object|null} Decoded token data or null if invalid
 */
exports.verifyStreamToken = (token) => {
  try {
    if (!token) {
      console.warn('[StreamToken] No token provided');
      return null;
    }

    // Verify JWT
    const decoded = jwt.verify(token, STREAM_SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: false
    });

    // Validate token type
    if (decoded.type !== 'stream') {
      console.warn('[StreamToken] Invalid token type:', decoded.type);
      return null;
    }

    // Validate required fields
    if (!decoded.videoId || !decoded.userId) {
      console.warn('[StreamToken] Missing required fields in token');
      return null;
    }

    console.log(`[StreamToken] Verified for video ${decoded.videoId}, user ${decoded.userId}`);
    return {
      videoId: decoded.videoId,
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
    };

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn('[StreamToken] Token expired:', err.expiredAt);
    } else if (err.name === 'JsonWebTokenError') {
      console.warn('[StreamToken] Invalid token:', err.message);
    } else {
      console.error('[StreamToken] Verification error:', err);
    }
    return null;
  }
};

/**
 * Generate a short-lived token for immediate use
 * @param {string} videoId 
 * @param {string} userId 
 * @returns {string} Short token (5 minutes expiry)
 */
exports.generateQuickToken = (videoId, userId) => {
  return jwt.sign(
    { 
      videoId: videoId.toString(), 
      userId: userId.toString(), 
      type: 'quick_stream' 
    },
    STREAM_SECRET,
    { expiresIn: '5m', algorithm: 'HS256' }
  );
};

/**
 * Middleware to validate stream token in routes
 */
exports.validateStreamToken = (req, res, next) => {
  const token = req.query.token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Stream token is required"
    });
  }

  const tokenData = exports.verifyStreamToken(token);
  
  if (!tokenData) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired stream token"
    });
  }

  // Attach token data to request
  req.streamTokenData = tokenData;
  next();
};

/**
 * Check if token is about to expire (for refresh)
 * @param {string} token 
 * @returns {boolean} True if token needs refresh
 */
exports.needsRefresh = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    // Refresh if token expires in less than 5 minutes
    const expiresIn = (decoded.exp * 1000) - Date.now();
    return expiresIn < 5 * 60 * 1000;
  } catch (err) {
    return true;
  }
};

/**
 * Refresh a stream token
 * @param {string} oldToken 
 * @returns {string|null} New token or null if refresh failed
 */
exports.refreshToken = (oldToken) => {
  try {
    const decoded = jwt.decode(oldToken);
    if (!decoded || !decoded.videoId || !decoded.userId) {
      return null;
    }

    return exports.generateStreamToken(
      decoded.videoId,
      decoded.userId,
      decoded.tenantId
    );
  } catch (err) {
    console.error('[StreamToken] Refresh failed:', err);
    return null;
  }
};