import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getCookieOptions,
} from "../utils/jwt.js";

const registerUser = async (req, res) => {
  try {
    const { username, email, phoneNumber, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with provided email or phone number",
        data: null,
      });
    }

    const user = await User.create({
      username,
      email,
      phoneNumber,
      password,
      role: "user",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        data: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        data: null,
      });
    }

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const refreshExpiry = new Date(
      Date.now() + parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES || "30d")
    );

    await User.findByIdAndUpdate(user._id, {
      refreshTokenHash,
      refreshTokenExpiresAt: refreshExpiry,
    });

    const cookieOpts = getCookieOptions();
    res.cookie("accessToken", accessToken, {
      ...cookieOpts,
      maxAge: parseDurationMs(process.env.ACCESS_TOKEN_EXPIRES || "15m"),
    });
    res.cookie("refreshToken", refreshToken, {
      ...cookieOpts,
      maxAge: parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES || "30d"),
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }
    return res.status(200).json({
      success: true,
      message: "Authenticated user",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const parseDurationMs = value => {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * multipliers[unit];
};

const refreshTokenController = async (req, res) => {
  try {
    const provided = req.body.refreshToken || req.cookies?.refreshToken;
    if (!provided) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
        data: null,
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(provided);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        data: null,
      });
    }

    const user = await User.findById(decoded.id).select(
      "+refreshTokenHash +refreshTokenExpiresAt +refreshTokenFamily"
    );
    
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
        data: null,
      });
    }

    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
        data: null,
      });
    }

    const providedHash = crypto
      .createHash("sha256")
      .update(provided)
      .digest("hex");

    // 🔐 CRITICAL: Detect refresh token reuse
    if (providedHash !== user.refreshTokenHash) {
      // Token reuse detected - invalidate all tokens for this user
      await User.findByIdAndUpdate(user._id, {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        refreshTokenFamily: null, // Invalidate token family
      });
      return res.status(401).json({
        success: false,
        message: "Token reuse detected. Please login again.",
        data: null,
      });
    }

    // Generate new token pair
    const newAccessToken = signAccessToken({ id: user._id, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user._id });
    const newHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    const newExpiry = new Date(
      Date.now() + parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES || "30d")
    );

    await User.findByIdAndUpdate(user._id, {
      refreshTokenHash: newHash,
      refreshTokenExpiresAt: newExpiry,
    });

    const cookieOpts = getCookieOptions();
    res.cookie("accessToken", newAccessToken, {
      ...cookieOpts,
      maxAge: parseDurationMs(process.env.ACCESS_TOKEN_EXPIRES || "15m"),
    });
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOpts,
      maxAge: parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES || "30d"),
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};
const logout = async (req, res) => {
  try {
    const provided = req.body.refreshToken || req.cookies?.refreshToken;
    if (provided) {
      try {
        const decoded = verifyRefreshToken(provided);
        await User.findByIdAndUpdate(decoded.id, {
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        });
      } catch {}
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({
      success: true,
      message: "Logged out",
      data: null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};


export { registerUser, loginUser, me, refreshTokenController, logout };


