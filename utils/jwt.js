import jwt from "jsonwebtoken";

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "30d";

export const signAccessToken = payload =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });

export const signRefreshToken = payload =>
  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });

export const verifyAccessToken = token =>
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);

export const verifyRefreshToken = token =>
  jwt.verify(
    token,
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
  );

export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
  };
};



