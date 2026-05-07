import mongoose from 'mongoose';
import ReviewTask from '../models/ReviewTask.js';
import Review from '../models/Review.js';
import Inquiry from '../models/Inquiry.js';

// ---------------------------------------------------------------------------
// Snooze schedule: dismissalCount → days until next prompt
// ---------------------------------------------------------------------------
const SNOOZE_SCHEDULE = [2, 7, 14]; // days after 1st, 2nd, 3rd dismissal
const TASK_EXPIRY_DAYS = 90;        // days after bookedAt before auto-expiry

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ---------------------------------------------------------------------------
// GET /api/reviews/tasks/pending
// Returns pending or snoozed tasks that are due for the current client
// ---------------------------------------------------------------------------
export const getPendingTasks = async (req, res) => {
  try {
    const clientId = req.user.id;
    const now = new Date();

    // A task is "actionable" when:
    //   status = pending  (never snoozed or just reset)
    //   OR status = snoozed AND snoozedUntil <= now
    const tasks = await ReviewTask.find({
      clientId,
      status: { $in: ['pending', 'snoozed'] },
      dueAt: { $lte: now },
      $or: [
        { status: 'pending' },
        { status: 'snoozed', snoozedUntil: { $lte: now } },
      ],
    })
      .populate({
        path: 'inquiryId',
        select: 'bookedAt propertySnapshot agentSnapshot',
      })
      .populate({
        path: 'propertyId',
        select: 'title cover location price purpose',
      })
      .populate({
        path: 'agentId',
        select: 'username phoneNumber',
      })
      .sort({ dueAt: 1 })
      .lean();

    const result = tasks.map((task) => ({
      taskId: task._id,
      type: task.type,
      status: task.status,
      dueAt: task.dueAt,
      snoozedUntil: task.snoozedUntil,
      dismissalCount: task.dismissalCount,
      inquiryId: task.inquiryId?._id,
      bookedAt: task.inquiryId?.bookedAt,
      property: task.propertyId
        ? {
            id: task.propertyId._id,
            title: task.propertyId.title,
            cover: task.propertyId.cover,
            location: task.propertyId.location,
            price: task.propertyId.price,
            purpose: task.propertyId.purpose,
          }
        : task.inquiryId?.propertySnapshot,
      agent: task.agentId
        ? {
            id: task.agentId._id,
            username: task.agentId.username,
            phoneNumber: task.agentId.phoneNumber,
          }
        : task.inquiryId?.agentSnapshot,
    }));

    return res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error('Error fetching pending review tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending review tasks',
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/reviews/tasks/:taskId/snooze
// Body: { snoozeDays } or { snoozeUntil }
// ---------------------------------------------------------------------------
export const snoozeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const clientId = req.user.id;
    const { snoozeDays, snoozeUntil } = req.body;

    const task = await ReviewTask.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Review task not found' });
    }

    if (task.clientId.toString() !== clientId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (task.status === 'submitted') {
      return res.status(400).json({ success: false, message: 'Task already submitted' });
    }

    if (task.status === 'expired') {
      return res.status(400).json({ success: false, message: 'Task has expired' });
    }

    // Determine snooze target date
    let targetDate;
    if (snoozeUntil) {
      targetDate = new Date(snoozeUntil);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid snoozeUntil date' });
      }
    } else {
      // Use schedule or caller-provided days
      const count = task.dismissalCount;
      const scheduledDays =
        snoozeDays != null
          ? Number(snoozeDays)
          : SNOOZE_SCHEDULE[count] ?? SNOOZE_SCHEDULE[SNOOZE_SCHEDULE.length - 1];

      if (!Number.isFinite(scheduledDays) || scheduledDays < 1) {
        return res.status(400).json({ success: false, message: 'snoozeDays must be a positive number' });
      }

      targetDate = addDays(new Date(), scheduledDays);
    }

    task.status = 'snoozed';
    task.snoozedUntil = targetDate;
    task.dismissalCount += 1;
    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Review task snoozed',
      data: {
        taskId: task._id,
        status: task.status,
        snoozedUntil: task.snoozedUntil,
        dismissalCount: task.dismissalCount,
      },
    });
  } catch (error) {
    console.error('Error snoozing review task:', error);
    return res.status(500).json({ success: false, message: 'Failed to snooze task' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/reviews/tasks/:taskId/submit
// Body: { agentRating, agentComment, platformRating?, platformComment? }
// ---------------------------------------------------------------------------
export const submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const clientId = req.user.id;
    const { agentRating, agentComment, platformRating, platformComment } = req.body;

    // Validate required fields
    if (agentRating == null) {
      return res.status(400).json({ success: false, message: 'agentRating is required' });
    }

    const parsedAgentRating = Number(agentRating);
    if (!Number.isFinite(parsedAgentRating) || parsedAgentRating < 1 || parsedAgentRating > 5) {
      return res.status(400).json({ success: false, message: 'agentRating must be between 1 and 5' });
    }

    if (platformRating != null) {
      const parsedPlatformRating = Number(platformRating);
      if (!Number.isFinite(parsedPlatformRating) || parsedPlatformRating < 1 || parsedPlatformRating > 5) {
        return res.status(400).json({ success: false, message: 'platformRating must be between 1 and 5' });
      }
    }

    const task = await ReviewTask.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Review task not found' });
    }

    if (task.clientId.toString() !== clientId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (task.status === 'submitted') {
      return res.status(409).json({ success: false, message: 'Review already submitted for this task' });
    }

    if (task.status === 'expired') {
      return res.status(400).json({ success: false, message: 'This review task has expired' });
    }

    // Verify the linked inquiry is in booked/completed state
    const inquiry = await Inquiry.findById(task.inquiryId);
    if (!inquiry || !['booked'].includes(inquiry.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit review: inquiry is not in booked state',
      });
    }

    const now = new Date();

    // Build review documents — use insertMany for atomicity
    const reviewDocs = [
      {
        taskId: task._id,
        inquiryId: task.inquiryId,
        propertyId: task.propertyId,
        reviewerId: clientId,
        revieweeType: 'agent',
        revieweeId: task.agentId,
        rating: parsedAgentRating,
        comment: agentComment?.trim() || null,
        source: 'in_app_prompt',
      },
    ];

    if (platformRating != null) {
      reviewDocs.push({
        taskId: task._id,
        inquiryId: task.inquiryId,
        propertyId: task.propertyId,
        reviewerId: clientId,
        revieweeType: 'platform',
        revieweeId: null,
        rating: Number(platformRating),
        comment: platformComment?.trim() || null,
        source: 'in_app_prompt',
      });
    }

    // Insert reviews — unique index on (taskId, revieweeType) prevents duplicates
    let insertedReviews;
    try {
      insertedReviews = await Review.insertMany(reviewDocs, { ordered: true });
    } catch (insertError) {
      if (insertError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate review detected. Review already submitted.',
        });
      }
      throw insertError;
    }

    // Mark task as submitted
    task.status = 'submitted';
    task.submittedAt = now;
    await task.save();

    // Denormalize onto inquiry for quick display
    inquiry.reviewSummary = {
      submitted: true,
      submittedAt: now,
      agentRating: parsedAgentRating,
    };
    await inquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        taskId: task._id,
        reviews: insertedReviews.map((r) => ({
          id: r._id,
          revieweeType: r.revieweeType,
          rating: r.rating,
        })),
      },
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/reviews/me
// Returns all reviews submitted by the current client
// ---------------------------------------------------------------------------
export const getMyReviews = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ reviewerId })
        .populate('propertyId', 'title cover location')
        .populate('revieweeId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments({ reviewerId }),
    ]);

    return res.status(200).json({
      success: true,
      data: reviews,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/agents/:id/reviews
// Returns approved agent reviews for public profile display
// ---------------------------------------------------------------------------
export const getAgentReviews = async (req, res) => {
  try {
    const { id: agentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ revieweeType: 'agent', revieweeId: agentId })
        .populate('reviewerId', 'username')
        .populate('propertyId', 'title location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments({ revieweeType: 'agent', revieweeId: agentId }),
    ]);

    // Aggregate stats
    const stats = await Review.aggregate([
      { $match: { revieweeType: 'agent', revieweeId: new mongoose.Types.ObjectId(agentId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingBreakdown: {
            $push: '$rating',
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: reviews,
      stats: stats[0]
        ? {
            averageRating: Math.round(stats[0].averageRating * 10) / 10,
            totalReviews: stats[0].totalReviews,
          }
        : { averageRating: null, totalReviews: 0 },
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('Error fetching agent reviews:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch agent reviews' });
  }
};
