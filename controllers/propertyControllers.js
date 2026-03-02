import cloudinary from '../config/cloudinary.js';
import Property from '../models/Property.js';
import fs from 'fs';
import {
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
  deleteFromCloudinary,
  generateVideoThumbnail,
} from '../utils/cloudinaryUpload.js';

/**
 * Helper function to cleanup uploaded media on error
 * MUST be defined BEFORE uploadProperty since it's used there
 */
async function cleanupUploadedMedia(mediaArray) {
  for (const media of mediaArray) {
    try {
      await deleteFromCloudinary(
        media.public_id,
        media.type === 'video' ? 'video' : 'image'
      );
    } catch (error) {
      console.error('Error cleaning up media:', error);
    }
  }
}

/**
 * @desc    Create a new property
 * @route   POST /api/properties
 * @access  Private
 */
export const uploadProperty = async (req, res) => {
  console.log('Received property upload request');
  console.log('Request body:', req.body);
  
  try {
    const {
      title,
      description,
      type,
      purpose,
      price,
      bedrooms,
      area,
      location,
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !purpose || !price || !area) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // IMPORTANT: Parse location FIRST before validating
    console.log('Raw location:', location);
    console.log('Location type:', typeof location);
    
    let parsedLocation = location;
    if (typeof location === 'string') {
      try {
        parsedLocation = JSON.parse(location);
        console.log('Parsed location:', parsedLocation);
      } catch (e) {
        console.error('Failed to parse location:', e.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid location format',
        });
      }
    }

    // NOW validate the parsed location
    if (!parsedLocation || !parsedLocation.region || !parsedLocation.district) {
      console.log('Location validation failed:', parsedLocation);
      return res.status(400).json({
        success: false,
        message: 'Please provide complete location information (region and district required)',
      });
    }

    console.log('Location validated successfully');

    // Check if files are uploaded
    const files = req.files;
    if (!files || (!files.images && !files.videos)) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image or video',
      });
    }

    console.log('Files received:', {
      images: files.images?.length || 0,
      videos: files.videos?.length || 0,
    });

    // Arrays to store uploaded media
    const uploadedMedia = [];
    let coverImage = null;

    // Upload images to Cloudinary
    if (files.images && files.images.length > 0) {
      console.log(`Uploading ${files.images.length} images to Cloudinary...`);
      for (let i = 0; i < files.images.length; i++) {
        const file = files.images[i];
        console.log(`  Uploading image ${i + 1}/${files.images.length}: ${file.originalname}`);
        
        try {
          const result = await uploadImageToCloudinary(file.buffer);
          uploadedMedia.push({
            url: result.url,
            public_id: result.public_id,
            type: 'image',
          });

          // Use first image as cover if not set
          if (!coverImage) {
            coverImage = {
              url: result.url,
              public_id: result.public_id,
            };
            console.log('  Set as cover image');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          // Cleanup on failure
          await cleanupUploadedMedia(uploadedMedia);
          return res.status(500).json({
            success: false,
            message: `Failed to upload image: ${error.message}`,
          });
        }
      }
      console.log(`✓ All images uploaded successfully`);
    }

    // Upload videos to Cloudinary
    if (files.videos && files.videos.length > 0) {
      console.log(`Uploading ${files.videos.length} videos to Cloudinary...`);
      for (let i = 0; i < files.videos.length; i++) {
        const file = files.videos[i];
        console.log(`  Uploading video ${i + 1}/${files.videos.length}: ${file.originalname}`);
        
        try {
          const result = await uploadVideoToCloudinary(file.buffer);
          uploadedMedia.push({
            url: result.url,
            public_id: result.public_id,
            type: 'video',
          });

          // If no images uploaded, use first video thumbnail as cover
          if (!coverImage && result.thumbnail) {
            console.log('  Generating cover from video thumbnail...');
            const thumbnailResult = await generateVideoThumbnail(result.public_id);
            coverImage = {
              url: thumbnailResult.url,
              public_id: thumbnailResult.public_id,
            };
            console.log('  Cover generated from video');
          }
        } catch (error) {
          console.error('Error uploading video:', error);
          // Cleanup on failure
          await cleanupUploadedMedia(uploadedMedia);
          if (coverImage && !files.images) {
            await deleteFromCloudinary(coverImage.public_id, 'image');
          }
          return res.status(500).json({
            success: false,
            message: `Failed to upload video: ${error.message}`,
          });
        }
      }
      console.log(`✓ All videos uploaded successfully`);
    }

    // Ensure we have a cover image
    if (!coverImage) {
      await cleanupUploadedMedia(uploadedMedia);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate cover image',
      });
    }

    console.log('Creating property in database...');
    
    // Create property
    const property = await Property.create({
      title,
      description,
      type,
      purpose,
      price: Number(price),
      bedrooms: Number(bedrooms) || 0,
      area: Number(area),
      ownerId: req.user.id, // Set owner from authenticated user
      ownerUsername: req.user.username,
      location: parsedLocation,
      cover: coverImage,
      media: uploadedMedia,
      // Add listedBy if you have auth middleware: listedBy: req.user._id,
    });

    console.log('✓ Property created successfully:', property._id);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property,
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all properties
 * @route   GET /api/properties
 * @access  Public
 */
export const getProperties = async (req, res) => {
  try {
    const {
      type,
      purpose,
      minPrice,
      maxPrice,
      region,
      district,
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = {};

    if (type) query.type = type;
    if (purpose) query.purpose = purpose;
    if (region) query['location.region'] = region;
    if (district) query['location.district'] = district;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Execute query with pagination
    const properties = await Property.find(query)
      .populate('ownerId', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Property.countDocuments(query);

    res.status(200).json({
      success: true,
      data: properties,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get all properties
 * @route   GET /api/properties/all
 * @access  Public
 */
export const getAllProperties = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const properties = await Property.find()
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const count = await Property.countDocuments();

    res.status(200).json({
      success: true,
      data: properties,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      total: count,
    });
  } catch (error) {
    console.error('Error fetching all properties:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get single property details
 * @route   GET /api/properties/:id
 * @access  Public
 */
export const getPropertyDetails = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      'ownerId',
      'name email phoneNumber'
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get single property
 * @route   GET /api/properties/:id
 * @access  Public
 */
export const getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      'listedBy',
      'name email phone'
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update property
 * @route   PUT /api/properties/:id
 * @access  Private
 */
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Check ownership
    if (property.listedBy && property.listedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property',
      });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty,
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Delete property
 * @route   DELETE /api/properties/:id
 * @access  Private
 */
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Check ownership
    if (property.listedBy && property.listedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property',
      });
    }

    // Delete cover image from Cloudinary
    if (property.cover && property.cover.public_id) {
      await deleteFromCloudinary(property.cover.public_id, 'image');
    }

    // Delete all media from Cloudinary
    for (const media of property.media) {
      await deleteFromCloudinary(
        media.public_id,
        media.type === 'video' ? 'video' : 'image'
      );
    }

    await property.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/*
import Property from "../models/Property.js";

// ==================== CREATE PROPERTY ====================
export const uploadProperty = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      area,
    } = req.body;

    // Validate required fields
    if (!title || !price || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, price, and location are required",
        data: null,
      });
    }

    // Get uploaded files from multer
    const images = req.files?.images || [];
    const videos = req.files?.videos || [];

    // Create property with owner as current user
    const property = await Property.create({
      title,
      description,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      images: images.map((file) => file.path),
      videos: videos.map((file) => file.path),
      ownerId: req.user.id, // Set owner from authenticated user
      ownerUsername: req.user.username,
      status: req.user.role === "admin" ? "approved" : "pending", // Auto-approve for admins
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error creating property:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create property",
      data: null,
    });
  }
};

// ==================== GET ALL PROPERTIES ====================
export const getAllProperties = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "approved",
      propertyType,
      minPrice,
      maxPrice,
    } = req.query;

    // Build filter
    const filter = {};
    
    // Only show approved properties to public users
    // Admins can see all statuses
    if (req.user?.role === "admin") {
      if (status) filter.status = status;
    } else {
      filter.status = "approved";
    }

    if (propertyType) filter.propertyType = propertyType;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-__v"),
      Property.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Properties retrieved successfully",
      data: {
        properties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
      data: null,
    });
  }
};

// ==================== GET PROPERTY BY ID ====================
export const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    // Check if user can view this property
    const isOwner = req.user?.id === property.ownerId?.toString();
    const isAdmin = req.user?.role === "admin";
    const isApproved = property.status === "approved";

    // Only owner, admin, or public (if approved) can view
    if (!isApproved && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "This property is not available",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property retrieved successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error fetching property:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch property",
      data: null,
    });
  }
};

// ==================== UPDATE PROPERTY ====================
export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Find property
    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    // Check ownership
    const isOwner = req.user.id === property.ownerId?.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this property",
        data: null,
      });
    }

    // Update fields
    const {
      title,
      description,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      status,
    } = req.body;

    if (title) property.title = title;
    if (description) property.description = description;
    if (price) property.price = price;
    if (location) property.location = location;
    if (propertyType) property.propertyType = propertyType;
    if (bedrooms) property.bedrooms = bedrooms;
    if (bathrooms) property.bathrooms = bathrooms;
    if (area) property.area = area;

    // Only admin can change status
    if (status && isAdmin) {
      property.status = status;
    }

    // Handle new file uploads
    if (req.files?.images) {
      const newImages = req.files.images.map((file) => file.path);
      property.images = [...property.images, ...newImages];
    }

    if (req.files?.videos) {
      const newVideos = req.files.videos.map((file) => file.path);
      property.videos = [...property.videos, ...newVideos];
    }

    await property.save();

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update property",
      data: null,
    });
  }
};

// ==================== DELETE PROPERTY ====================
export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Find property
    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    // Check ownership
    const isOwner = req.user.id === property.ownerId?.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this property",
        data: null,
      });
    }

    await Property.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete property",
      data: null,
    });
  }
};

// ==================== GET MY PROPERTIES ====================
export const getMyProperties = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { ownerId: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Your properties retrieved successfully",
      data: {
        properties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user properties:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your properties",
      data: null,
    });
  }
};

// ==================== APPROVE PROPERTY (ADMIN) ====================
export const approveProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'pending'

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: approved, rejected, or pending",
        data: null,
      });
    }

    const property = await Property.findByIdAndUpdate(
      id,
      { status, reviewedBy: req.user.id, reviewedAt: new Date() },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Property ${status} successfully`,
      data: property,
    });
  } catch (error) {
    console.error("Error approving property:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update property status",
      data: null,
    });
  }
};

*/