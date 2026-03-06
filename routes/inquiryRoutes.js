import express from "express";
import { 
  createInquiry, 
  getAllInquiries, 
  getInquiryDetails,
  getAgentInquiries,
  getUserInquiries,
  getInquiryDetail,
  updateInquiryStatus,
  cancelInquiry
} from "../controllers/inquiryController.js";
import {
   auth, 
   authorize, 
   optionalAuth,
   requireActiveAccount 
} from '../middlewares/authMiddleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';


const router = express.Router();

// Get all inquiries
router.get("/all", generalLimiter, getAllInquiries);

// Get agent inquiries (private route)
router.get("/agent", auth, generalLimiter, getAgentInquiries);

// Get user inquiries (private route)
router.get("/user", auth, generalLimiter, getUserInquiries);

// Get inquiry details by ID
router.get("/:id", auth, generalLimiter, getInquiryDetail);

// Create new inquiry
router.post("/", auth, generalLimiter, createInquiry);

// Update inquiry status
router.put("/:id", auth, generalLimiter, updateInquiryStatus);

// Cancel inquiry
router.delete("/:id", auth, generalLimiter, cancelInquiry);

export default router;
