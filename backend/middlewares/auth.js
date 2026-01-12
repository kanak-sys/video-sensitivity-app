const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    
    // 2. Check query parameter (for testing)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      console.warn("No authentication token provided");
      return res.status(401).json({ 
        success: false,
        message: "No authentication token provided" 
      });
    }

    console.log("Verifying JWT token...");
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Debug logging
    console.log("Decoded JWT payload:", {
      userId: decoded.userId,
      role: decoded.role,
      tenantId: decoded.tenantId,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'No expiration'
    });

    // Extract user ID from various possible fields
    const userId = decoded.userId || decoded.id || decoded._id || decoded.sub;
    
    if (!userId) {
      console.error("JWT doesn't contain user ID. Decoded:", decoded);
      return res.status(401).json({ 
        success: false,
        message: "Invalid token: no user ID" 
      });
    }

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ 
        success: false,
        message: "Token has expired" 
      });
    }

    // Attach user info to request
    req.user = {
      userId: userId.toString(),
      email: decoded.email,
      role: decoded.role || 'viewer',
      tenantId: decoded.tenantId
    };

    console.log("User authenticated:", {
      userId: req.user.userId,
      role: req.user.role,
      tenantId: req.user.tenantId
    });

    next();
    
  } catch (err) {
    console.error("Authentication error:", err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: "Token has expired" 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token" 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: "Authentication failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};