import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

/**
 * Upload image to Cloudinary
 */
export const uploadImageToCloudinary = (fileBuffer, folder = 'properties') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Upload video to Cloudinary
 */
export const uploadVideoToCloudinary = (fileBuffer, folder = 'properties/videos') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'video',
        // Don't generate eager transformations here to speed up upload
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          // Generate thumbnail URL (will be created on-demand by Cloudinary)
          const thumbnailUrl = cloudinary.url(result.public_id, {
            resource_type: 'video',
            format: 'jpg',
            transformation: [
              { width: 640, height: 360, crop: 'pad' },
              { quality: 'auto' },
            ],
          });

          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            thumbnail: thumbnailUrl,
            duration: result.duration,
          });
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Generate a thumbnail from a video for use as cover image
 * This creates a separate image asset that can be used as the property cover
 */
export const generateVideoThumbnail = async (videoPublicId, folder = 'properties/covers') => {
  try {
    // Generate thumbnail URL from video
    const thumbnailUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto:best' },
      ],
    });

    // Upload the thumbnail as a separate image
    // This ensures we have a dedicated public_id for the cover image
    const result = await cloudinary.uploader.upload(thumbnailUrl, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    throw error;
  }
};

/**
 * Delete media from Cloudinary
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};