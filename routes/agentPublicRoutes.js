import express from 'express';
import { getAgentReviews } from '../controllers/reviewController.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// GET /api/agents/:id/reviews  — public agent review listing for profile pages
router.get('/:id/reviews', generalLimiter, getAgentReviews);

export default router;
