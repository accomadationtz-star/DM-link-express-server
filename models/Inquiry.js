import mongoose from "mongoose";

const acknowledgementSchema = new mongoose.Schema(
  {
    acceptedViewingFee: {
      type: Boolean,
      default: false,
    },
    acceptedMinimumAdvanceMonths: {
      type: Boolean,
      default: false,
    },
    acceptedAgentFee: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const commercialSnapshotSchema = new mongoose.Schema(
  {
    monthlyRent: {
      type: Number,
      min: 0,
    },
    rentalTerms: {
      minimumAdvanceMonths: {
        type: Number,
        min: 1,
      },
      viewingFee: {
        required: {
          type: Boolean,
          default: false,
        },
        amount: {
          type: Number,
          min: 0,
        },
        currency: {
          type: String,
          enum: ['TZS'],
        },
        dueStage: {
          type: String,
          enum: ['before_viewing'],
        },
      },
      agentFee: {
        required: {
          type: Boolean,
          default: true,
        },
        mode: {
          type: String,
          enum: ['fixed', 'one_month_rent'],
        },
        amount: {
          type: Number,
          default: null,
          min: 0,
        },
        currency: {
          type: String,
          enum: ['TZS'],
        },
        dueStage: {
          type: String,
          enum: ['on_closing'],
        },
      },
      notes: {
        type: String,
        default: null,
      },
      termsVersion: {
        type: Number,
        min: 1,
      },
    },
    pricingSummary: {
      monthlyRent: {
        type: Number,
        min: 0,
      },
      minimumAdvanceMonths: {
        type: Number,
        min: 1,
      },
      advanceRentTotal: {
        type: Number,
        min: 0,
      },
      viewingFeeTotal: {
        type: Number,
        min: 0,
      },
      agentFeeTotal: {
        type: Number,
        min: 0,
      },
      estimatedMoveInTotal: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        enum: ['TZS'],
      },
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedByClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedTermsVersion: {
      type: Number,
      min: 1,
    },
    clientAcknowledgement: {
      type: acknowledgementSchema,
      default: undefined,
    },
  },
  { _id: false }
);

const inquirySchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshots (avoid future data changes issues)
    propertySnapshot: {
      title: String,
      price: Number,
      purpose: String,
      cover: {
        url: String,
      },
      location: {
        region: String,
        district: String,
      },
    },

    commercialSnapshot: {
      type: commercialSnapshotSchema,
      default: undefined,
    },

    agentSnapshot: {
      username: String,
    },

    clientSnapshot: {
      username: String,
      phone: {
        type: String,
        required: true,
      },
    },

    message: {
      type: String,
      trim: true,
      maxLength: 1000,
    },

    status: {
      type: String,
      enum: ["pending", "contacted", "booked", "cancelled"],
      default: "pending",
      index: true,
    },

    // Populated when status transitions to "booked"
    bookedAt: {
      type: Date,
      default: null,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Reference to the associated review task (set after task is created)
    reviewTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewTask',
      default: null,
    },

    // Denormalized review summary for quick display without joining Review collection
    reviewSummary: {
      submitted: {
        type: Boolean,
        default: false,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
      agentRating: {
        type: Number,
        default: null,
        min: 1,
        max: 5,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Inquiry", inquirySchema);
