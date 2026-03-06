import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { agentApplicationSubmitLimiter } from "../middlewares/rateLimiter.js";
import {
  submitApplication,
  getApplicationStatus,
} from "../controllers/agentApplicationController.js";

const router = express.Router();

router.post("/apply", auth, agentApplicationSubmitLimiter, submitApplication);
router.get("/application/status", auth, getApplicationStatus);

export default router;
