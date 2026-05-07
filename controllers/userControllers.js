import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import {
  signAccessToken,
  signRefreshToken,
  signPendingToken,
  verifyRefreshToken,
  verifyPendingToken,
  getCookieOptions,
} from "../utils/jwt.js";

const getGoogleAudience = () => {
  return [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    ...(process.env.GOOGLE_CLIENT_IDS
      ? process.env.GOOGLE_CLIENT_IDS.split(",").map(id => id.trim())
      : []),
  ].filter(Boolean);
};

const googleClient = new OAuth2Client();

const registerUser = async (req, res) => {
  try {
    const { username, email, phoneNumber, password } = req.body;

    // Validate all required fields
    if (!username || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, phone number, and password are required",
        data: null,
      });
    }

    // Validate phone format (9-15 digits)
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 9-15 digits",
        code: "INVALID_PHONE",
        data: null,
      });
    }

    const normalizedPhone = digits;

    // Check for duplicates (username, email, phoneNumber)
    const existingUser = await User.findOne({
      $or: [{ username }, { email }, { phoneNumber: normalizedPhone }],
    });

    if (existingUser) {
      let field = "username";
      if (existingUser.email === email) field = "email";
      if (existingUser.phoneNumber === normalizedPhone) field = "phoneNumber";

      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        code: `DUPLICATE_${field.toUpperCase()}`,
        data: null,
      });
    }

    const user = await User.create({
      username,
      email,
      phoneNumber: normalizedPhone,
      password,
      authProvider: "local",
      role: "user",
      onboardingComplete: true, // Email/password users complete registration with phone
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

    if (user.authProvider === "google") {
      return res.status(401).json({
        success: false,
        message: "This account uses Google login. Please continue with Google.",
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
          agentApplicationStatus: user.agentApplicationStatus || "none",
          agentApplicationDate: user.agentApplicationDate || null,
          picture: user.picture || null,
          onboardingComplete: user.onboardingComplete,
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

const generateUniqueUsername = async (name = "User") => {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  const base = cleaned || "user";

  let candidate = base;
  let counter = 1;

  while (await User.findOne({ username: candidate })) {
    candidate = `${base}${counter}`;
    counter += 1;
  }

  return candidate;
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

const googleAuth = async (req, res) => {
  console.log("Google auth request body:", req.body);
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google idToken is required",
        data: null,
      });
    }

    const googleAudience = getGoogleAudience();

    if (googleAudience.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Google auth is not configured on server",
        data: null,
      });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleAudience,
      });
    } catch (verifyError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
        data: null,
      });
    }

    const payload = ticket.getPayload();
    const { email, name, picture, sub, email_verified } = payload || {};

    if (!email || !sub || !email_verified) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token payload",
        data: null,
      });
    }

    // Find user by googleId ONLY (not by email to avoid conflicts with email/password users)
    let user = await User.findOne({ googleId: sub });

    if (!user) {
      const username = await generateUniqueUsername(name || email.split("@")[0]);
      user = await User.create({
        email,
        username,
        picture: picture || null,
        googleId: sub,
        authProvider: "google",
        role: "user",
        onboardingComplete: false, // Not complete until phone is added
      });
    } else {
      // Update picture if provided
      if (picture && user.picture !== picture) {
        await User.findByIdAndUpdate(user._id, { picture });
      }
    }

    // Check if user has completed onboarding (has phone number)
    if (user.phoneNumber && user.onboardingComplete) {
      // User has phone, issue full session
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
        status: "completed",
        message: "Google authentication successful",
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            agentApplicationStatus: user.agentApplicationStatus || "none",
            agentApplicationDate: user.agentApplicationDate || null,
            picture: user.picture || null,
            googleId: user.googleId || null,
            authProvider: user.authProvider,
            onboardingComplete: user.onboardingComplete,
          },
        },
      });
    } else {
      // User missing phone, issue pending token
      const pendingToken = signPendingToken({
        sub: user._id.toString(),
        type: "pending",
        email: user.email,
        googleId: user.googleId,
      });

      return res.status(200).json({
        success: true,
        status: "requiresPhone",
        message: "Phone completion required",
        data: {
          pendingToken,
          user: {
            id: user._id.toString(),
            email: user.email,
            googleId: user.googleId,
          },
          phoneRequired: true,
        },
      });
    }
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};
const completePhone = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.auth?.sub; // From pending token middleware

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
        data: null,
      });
    }

    // Validate phone format (9-15 digits)
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 9-15 digits",
        code: "INVALID_PHONE",
        data: null,
      });
    }

    const normalizedPhone = digits;

    // Check if phone already exists (unique constraint)
    const existingUser = await User.findOne({ phoneNumber: normalizedPhone });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(409).json({
        success: false,
        message: "Phone number already registered",
        code: "PHONE_DUPLICATE",
        data: null,
      });
    }

    // Update user with phone and mark onboarding complete
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    user.phoneNumber = normalizedPhone;
    user.onboardingComplete = true;
    await user.save();

    // Issue full session tokens
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
      message: "Phone number verified",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          agentApplicationStatus: user.agentApplicationStatus || "none",
          agentApplicationDate: user.agentApplicationDate || null,
          picture: user.picture || null,
          onboardingComplete: user.onboardingComplete,
        },
      },
    });
  } catch (error) {
    console.error("Phone completion error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete phone verification",
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


export { registerUser, loginUser, me, refreshTokenController, completePhone, logout, googleAuth };


