import mongoose from 'mongoose';

const reviewTaskSchema = new mongoose.Schema(
  {
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['post_booking_review'],
      default: 'post_booking_review',
    },
    status: {
      type: String,
      enum: ['pending', 'snoozed', 'submitted', 'expired'],
      default: 'pending',
    },
    // When the client should first be prompted (set to bookedAt)
    dueAt: {
      type: Date,
      required: true,
    },
    // If snoozed, when should the next prompt appear
    snoozedUntil: {
      type: Date,
      default: null,
    },
    // How many times the client has dismissed/snoozed
    dismissalCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One task per inquiry + client + type — prevents duplicate prompts on API retry
reviewTaskSchema.index(
  { inquiryId: 1, clientId: 1, type: 1 },
  { unique: true }
);

// Efficient lookup for pending review tasks for a client
reviewTaskSchema.index({ clientId: 1, status: 1, snoozedUntil: 1 });

export default mongoose.model('ReviewTask', reviewTaskSchema);
