import { Router } from "express";
import { registerUser, loginUser, me, refreshTokenController, completePhone, logout, googleAuth } from "../controllers/userControllers.js";
import {registrationRateLimiter, loginLimiter, refreshLimiter} from "../middlewares/rateLimiter.js";
import {
  registerValidationRules,
  validationHandler,
  loginValidationRules,
  googleAuthValidationRules,
} from "../middlewares/validationMiddleware.js";
import { auth, authorize, selfOrAdmin, requireActiveAccount, authorizePendingToken } from "../middlewares/authMiddleware.js";

const router = Router();

// ==================== PUBLIC ROUTES ====================
// No authentication required
router.post(
  "/register",
  registrationRateLimiter,
  registerValidationRules,
  validationHandler,
  registerUser
);

router.post(
  "/login",
  loginLimiter,
  loginValidationRules,
  validationHandler,
  loginUser
);

router.post(
  "/google",
  loginLimiter,
  googleAuthValidationRules,
  validationHandler,
  googleAuth
);

router.post(
  "/complete-phone",
  authorizePendingToken,
  completePhone
);

router.post(
  "/refresh-token", 
  refreshLimiter, 
  refreshTokenController
);


// ==================== PROTECTED ROUTES ====================
// Require authentication

// Get current user profile
router.get(
  "/me",
  auth, // Verify JWT
  me
);
// Logout (optional auth - works even if token is expired)
router.post(
  "/logout",
   logout
  );

export default router;


/*
import { Router } from "express";
import {
  registerUser,
  loginUser,
  me,
  refreshTokenController,
  logout,
  updateProfile,
  deleteAccount,
  getAllUsers,
  getUserById,
  updateUserRole,
} from "../controllers/userControllers.js";
import {
  registrationRateLimiter,
  loginLimiter,
  refreshLimiter,
  generalLimiter,
} from "../middlewares/rateLimiter.js";
import {
  registerValidationRules,
  validationHandler,
  loginValidationRules,
} from "../middlewares/validationMiddleware.js";
import {
  auth,
  authorize,
  selfOrAdmin,
  requireActiveAccount,
} from "../middlewares/auth.js";

const router = Router();

// ==================== PUBLIC ROUTES ====================
// No authentication required

router.post(
  "/register",
  registrationRateLimiter,
  registerValidationRules,
  validationHandler,
  registerUser
);

router.post(
  "/login",
  loginLimiter,
  loginValidationRules,
  validationHandler,
  loginUser
);

router.post(
  "/refresh-token",
  refreshLimiter,
  refreshTokenController
);

// ==================== PROTECTED ROUTES ====================
// Require authentication



// Logout (optional auth - works even if token is expired)
router.post(
  "/logout",
  generalLimiter,
  logout
);

// Update own profile
router.put(
  "/profile",
  auth,
  requireActiveAccount, // Ensure account is active
  generalLimiter,
  updateProfile
);

// Delete own account
router.delete(
  "/account",
  auth,
  requireActiveAccount,
  generalLimiter,
  deleteAccount
);

// ==================== USER MANAGEMENT ROUTES ====================
// Self or admin access

// Get user by ID (self or admin)
router.get(
  "/:id",
  auth,
  selfOrAdmin("id"), // Users can view their own data, admins can view anyone
  getUserById
);

// ==================== ADMIN ONLY ROUTES ====================
// Restricted to admin role

// Get all users
router.get(
  "/",
  auth,
  authorize("admin"), // Only admins
  getAllUsers
);

// Update user role
router.patch(
  "/:id/role",
  auth,
  authorize("admin"), // Only admins
  generalLimiter,
  updateUserRole
);

// Admin delete user
router.delete(
  "/:id",
  auth,
  authorize("admin"), // Only admins
  generalLimiter,
  deleteAccount
);

export default router;

*/