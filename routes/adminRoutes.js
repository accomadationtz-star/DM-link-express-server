import express from "express";
import { auth, authorize } from "../middlewares/authMiddleware.js";
import {
  getAllApplications,
  reviewApplication,
} from "../controllers/agentApplicationController.js";

const router = express.Router();

router.get("/agent-applications", auth, authorize("admin"), getAllApplications);
router.put(
  "/agent-applications/:applicationId/review",
  auth,
  authorize("admin"),
  reviewApplication
);

export default router;
