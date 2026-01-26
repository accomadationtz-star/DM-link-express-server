import mongoose from "mongoose";

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
      location: {
        region: String,
        district: String,
      },
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
  },
  { timestamps: true }
);

export default mongoose.model("Inquiry", inquirySchema);
