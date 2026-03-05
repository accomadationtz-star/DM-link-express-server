import express from "express";
import { getAgentDashboard } from "../controllers/agentDashboardController.js";
import { getAgentProperties } from "../controllers/propertyControllers.js";
import { auth, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Agent dashboard
 * GET /api/agent/dashboard
 */
router.get("/dashboard", auth, authorize("agent"), getAgentDashboard);

/**
 * Agent properties management
 * GET /api/agent/properties
 */
router.get("/properties", auth, authorize("agent"), getAgentProperties);

export default router;
