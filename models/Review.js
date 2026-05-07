import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewTask',
      required: true,
    },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 'agent' = reviewing the agent; 'platform' = reviewing the platform/app
    revieweeType: {
      type: String,
      enum: ['agent', 'platform'],
      required: true,
    },
    // Populated for agent reviews; null for platform reviews
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    // How the review was triggered
    source: {
      type: String,
      enum: ['in_app_prompt', 'manual_entry'],
      default: 'in_app_prompt',
    },
  },
  { timestamps: true }
);

// One review per task per revieweeType — prevents duplicate submissions
reviewSchema.index({ taskId: 1, revieweeType: 1 }, { unique: true });

// For public agent profile: fetch reviews by agent ordered by recency
reviewSchema.index({ revieweeType: 1, revieweeId: 1, createdAt: -1 });

// For client review history
reviewSchema.index({ reviewerId: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
