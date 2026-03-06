import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import requestLogger from "./middlewares/requestLogger.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import agentDashboardRoutes from "./routes/agentDashboardRoutes.js";
import agentApplicationRoutes from "./routes/agentApplicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
const app = express();

// Token secrets
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.error("Missing ACCESS_TOKEN_SECRET/REFRESH_TOKEN_SECRET (or JWT_SECRET) in environment.");
  process.exit(1);
}
if (!process.env.MONGO_URL) {
  console.error("Missing MONGO_URL in environment. Set it in your .env file.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(error => console.log(error));

app.use("/api/users", userRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/agent", agentDashboardRoutes);
app.use("/api/agent", agentApplicationRoutes);
app.use("/api/admin", adminRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 50MB.',
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files uploaded.',
    });
  }

  if (err.message.includes('Only')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
  });
});

app.get("/", (req, res) =>
  res.status(200).json({
    success: true,
    message: "API Running...",
    data: null,
  })
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
