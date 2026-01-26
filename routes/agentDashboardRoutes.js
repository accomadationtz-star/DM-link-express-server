import express from "express";
import { getAgentDashboard } from "../controllers/agentDashboardController.js";
import { auth, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Agent dashboard
 * GET /api/agent/dashboard
 */
router.get("/dashboard", auth, authorize("agent"), getAgentDashboard);

export default router;
