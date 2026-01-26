import mongoose from 'mongoose';


const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['office', 'apartment', 'house', 'hotel'],
      required: true,
    },
    purpose: {
      type: String,
      enum: ['rent', 'sell'],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      region: {
        type: String,
        required: true,
        trim: true,
      },
      district: {
        type: String,
        required: true,
        trim: true,
      },
      street: {
        type: String,
        trim: true,
      },
    },
    bedrooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    area: {
      type: Number, // square meters
      required: true,
      min: 0,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster queries
    },
    ownerUsername: {
      type: String,
      required: true,
    },
    
    /** ⭐ KEY PART ⭐ */
    cover: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },

    media: [mediaSchema],
    status: {
      type: String,
      enum: ['available', 'booked', 'sold', 'rented'],
      default: 'available',
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
propertySchema.index({ status: 1, createdAt: -1 });
propertySchema.index({ type: 1, price: 1 });
propertySchema.index({ location: "text", title: "text", description: "text" });

export default mongoose.model('Property', propertySchema);


/*

import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    propertyType: {
      type: String,
      enum: ["house", "apartment", "condo", "land", "commercial", "other"],
      default: "house",
    },
    bedrooms: {
      type: Number,
      min: 0,
      default: 0,
    },
    bathrooms: {
      type: Number,
      min: 0,
      default: 0,
    },
    area: {
      type: Number, // Square meters or square feet
      min: 0,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 20; // Max 20 images
        },
        message: "Cannot upload more than 20 images",
      },
    },
    videos: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 5; // Max 5 videos
        },
        message: "Cannot upload more than 5 videos",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "sold", "rented"],
      default: "pending",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster queries
    },
    ownerUsername: {
      type: String,
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    views: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
propertySchema.index({ status: 1, createdAt: -1 });
propertySchema.index({ propertyType: 1, price: 1 });
propertySchema.index({ location: "text", title: "text", description: "text" });

// Virtual for formatted price
propertySchema.virtual("formattedPrice").get(function () {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(this.price);
});

// Middleware to increment views
propertySchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

const Property = mongoose.model("Property", propertySchema);

export default Property;

*/