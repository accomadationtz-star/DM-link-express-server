import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for memory storage (recommended for Cloudinary)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  console.log(`Filtering file: ${file.originalname}, fieldname: ${file.fieldname}, mimetype: ${file.mimetype}`);
  
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedVideoTypes = /mp4|mov|avi|mkv/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (file.fieldname === 'images') {
    const isValidImage = allowedImageTypes.test(extname.slice(1)) && 
                         mimetype.startsWith('image/');
    if (isValidImage) {
      console.log(`✓ Accepting image: ${file.originalname}`);
      return cb(null, true);
    }
    console.log(`✗ Rejecting image: ${file.originalname}`);
    return cb(new Error(`Only image files (jpeg, jpg, png, webp) are allowed! Got: ${file.originalname}`));
  }

  if (file.fieldname === 'videos') {
    const isValidVideo = allowedVideoTypes.test(extname.slice(1)) && 
                         mimetype.startsWith('video/');
    if (isValidVideo) {
      console.log(`✓ Accepting video: ${file.originalname}`);
      return cb(null, true);
    }
    console.log(`✗ Rejecting video: ${file.originalname}`);
    return cb(new Error(`Only video files (mp4, mov, avi, mkv) are allowed! Got: ${file.originalname}`));
  }

  console.log(`✗ Unknown fieldname: ${file.fieldname}`);
  cb(new Error(`Invalid field name: ${file.fieldname}`));
};

// Multer configuration with increased limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size (increased for videos)
    files: 11, // Total files (8 images + 3 videos)
  },
  fileFilter: fileFilter,
});

// Middleware to handle both images and videos
export const uploadMedia = upload.fields([
  { name: 'images', maxCount: 8 },
  { name: 'videos', maxCount: 3 },
]);

// Error handling middleware for multer errors
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Max size is 100MB per file.',
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 8 images and 3 videos allowed.',
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Unexpected field: ${err.field}. Use 'images' or 'videos' as field names.`,
      });
    }
    
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  if (err) {
    console.error('Upload Error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
    });
  }
  
  next();
};