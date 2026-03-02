import express from 'express';
import { upload } from '../middlewares/multer.js';
import { uploadMedia, handleMulterError } from '../middlewares/uploadMiddleware.js';
import { uploadProperty, getProperties, getAllProperties, getPropertyDetails } from '../controllers/propertyControllers.js';
import { debugRequest, debugAfterMulter, debugError } from '../middlewares/debug.js';
import {
   auth, 
   authorize, 
   optionalAuth,
   requireActiveAccount 
  } from '../middlewares/authMiddleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';


const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// Can be accessed without authentication

// Get all properties (public listings)
router.get(
  "/",
  optionalAuth, // Optional: attach user if logged in for personalized results
  generalLimiter,
  getProperties
);

// Get all properties list
router.get(
  "/all",
  generalLimiter,
  getAllProperties
);

// Get property details by ID
router.get(
  "/:id",
  generalLimiter,
  getPropertyDetails
);

// ==================== AUTHENTICATED USER ROUTES ====================
// Require login
router.post(
  '/', 
  debugRequest,  
  auth, // Must be logged in
  authorize('agent', 'admin'), // Only agents and admins can create properties
  uploadMedia, 
  debugAfterMulter, 
  handleMulterError, 
  uploadProperty
);
router.use(debugError);
export default router;

/*
import express from "express";
import { upload } from "../middlewares/multer.js";
import {
  uploadMedia,
  handleMulterError,
} from "../middlewares/uploadMiddleware.js";
import {
  uploadProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMyProperties,
  approveProperty,
} from "../controllers/propertyControllers.js";
import {
  auth,
  authorize,
  optionalAuth,
  requireActiveAccount,
} from "../middlewares/auth.js";
import {
  debugRequest,
  debugAfterMulter,
  debugError,
} from "../middlewares/debug.js";
import { generalLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();



// Get single property by ID
router.get(
  "/:id",
  optionalAuth, // Optional: for analytics on who views
  generalLimiter,
  getPropertyById
);

// ==================== AUTHENTICATED USER ROUTES ====================
// Require login

// Create new property (agents and admins only)
router.post(
  "/",
  debugRequest,
  auth, // Must be logged in
  requireActiveAccount, // Account must be active
  authorize("agent", "admin"), // Only agents and admins can create properties
  uploadMedia, // Handle file uploads
  debugAfterMulter,
  handleMulterError,
  generalLimiter,
  uploadProperty
);

// Get current user's properties
router.get(
  "/my/properties",
  auth,
  requireActiveAccount,
  getMyProperties
);

// Update property (owner or admin)
router.put(
  "/:id",
  auth,
  requireActiveAccount,
  authorize("agent", "admin"),
  uploadMedia, // Allow updating images/videos
  handleMulterError,
  generalLimiter,
  updateProperty
);

// Delete property (owner or admin)
router.delete(
  "/:id",
  auth,
  requireActiveAccount,
  authorize("agent", "admin"),
  generalLimiter,
  deleteProperty
);

// ==================== ADMIN ONLY ROUTES ====================

// Approve/reject property listing
router.patch(
  "/:id/approve",
  auth,
  authorize("admin"),
  generalLimiter,
  approveProperty
);

// Error handling
router.use(debugError);

export default router;

*/