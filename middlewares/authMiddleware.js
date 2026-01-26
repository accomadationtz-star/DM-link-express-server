import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ==================== BASIC AUTH MIDDLEWARE ====================
// Verifies JWT token and attaches user to request

export const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
        data: null,
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer '

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
        data: null,
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please refresh your token.",
          data: null,
        });
      }
      
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token.",
          data: null,
        });
      }

      throw error;
    }

    // Verify user still exists
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
        data: null,
      });
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
      data: null,
    });
  }
};

// ==================== ROLE-BASED ACCESS CONTROL ====================
// Restricts access based on user roles

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        data: null,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
        data: null,
      });
    }

    next();
  };
};

// ==================== OPTIONAL AUTH ====================
// Attaches user if token exists, but doesn't require it

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      
      if (user) {
        req.user = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        };
      }
    } catch (error) {
      // Invalid token, but don't fail - just continue without user
      console.log("Optional auth: Invalid token");
    }

    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    next(); // Continue even on error
  }
};

// ==================== OWNERSHIP VERIFICATION ====================
// Verifies user owns the resource

export const verifyOwnership = (resourceIdField = "id") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
          data: null,
        });
      }

      const resourceId = req.params[resourceIdField];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: "Resource ID required.",
          data: null,
        });
      }

      // Check if resource belongs to user
      // This is a generic check - customize based on your models
      const resource = await req.Model?.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found.",
          data: null,
        });
      }

      // Check ownership (assumes resource has userId or ownerId field)
      const ownerId = resource.userId || resource.ownerId || resource.user;
      
      if (ownerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You don't own this resource.",
          data: null,
        });
      }

      req.resource = resource; // Attach resource to request
      next();
    } catch (error) {
      console.error("Ownership verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Ownership verification failed.",
        data: null,
      });
    }
  };
};

// ==================== SELF OR ADMIN ====================
// Allows users to access their own data or admins to access anyone's

export const selfOrAdmin = (userIdParam = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        data: null,
      });
    }

    const targetUserId = req.params[userIdParam];

    // Allow if user is accessing their own data or is admin
    if (req.user.id === targetUserId || req.user.role === "admin") {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. You can only access your own data.",
      data: null,
    });
  };
};

// ==================== API KEY VALIDATION ====================
// For external API integrations

export const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key required.",
        data: null,
      });
    }

    // Validate API key against your database or config
    const validApiKeys = process.env.VALID_API_KEYS?.split(",") || [];
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key.",
        data: null,
      });
    }

    next();
  } catch (error) {
    console.error("API key validation error:", error);
    return res.status(500).json({
      success: false,
      message: "API key validation failed.",
      data: null,
    });
  }
};

// ==================== ACCOUNT STATUS CHECK ====================
// Verifies user account is active/verified

export const requireActiveAccount = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        data: null,
      });
    }

    const user = await User.findById(req.user.id).select("isActive isBanned");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        data: null,
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Your account has been banned.",
        data: null,
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your account first.",
        data: null,
      });
    }

    next();
  } catch (error) {
    console.error("Account status check error:", error);
    return res.status(500).json({
      success: false,
      message: "Account verification failed.",
      data: null,
    });
  }
};

// Export default for backward compatibility
export default auth;