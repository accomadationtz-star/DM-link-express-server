import express from "express";
import { createInquiry, getAllInquiries, getInquiryDetails } from "../controllers/inquiryController.js";
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

// Get inquiry details by ID
router.get("/:id", generalLimiter, getInquiryDetails);

// Create new inquiry
router.post("/", auth, generalLimiter, createInquiry);

export default router;
