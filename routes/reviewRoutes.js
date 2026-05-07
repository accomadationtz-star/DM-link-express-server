import express from 'express';
import {
  getPendingTasks,
  snoozeTask,
  submitTask,
  getMyReviews,
  getAgentReviews,
} from '../controllers/reviewController.js';
import { auth } from '../middlewares/authMiddleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// ── Client: review task queue ─────────────────────────────────────────────────

// GET  /api/reviews/tasks/pending  — actionable tasks for the logged-in client
router.get('/tasks/pending', auth, generalLimiter, getPendingTasks);

// POST /api/reviews/tasks/:taskId/snooze  — snooze a task
router.post('/tasks/:taskId/snooze', auth, generalLimiter, snoozeTask);

// POST /api/reviews/tasks/:taskId/submit  — submit agent (+ optional platform) review
router.post('/tasks/:taskId/submit', auth, generalLimiter, submitTask);

// ── Client: review history ────────────────────────────────────────────────────

// GET  /api/reviews/me  — all reviews written by the current client
router.get('/me', auth, generalLimiter, getMyReviews);

export default router;
