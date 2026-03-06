import rateLimit from "express-rate-limit";

export const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many registration attempts. Please try again later.",
      data: null,
    }),
});


export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts
  message: { 
    success: false, 
    message: "Too many login attempts, please try again later",
    data: null 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export const agentApplicationSubmitLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
  keyGenerator: req => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Only one application submission is allowed per day",
    data: null,
  },
});

// General limiter for all standard API requests
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
    data: null,
  },
});
