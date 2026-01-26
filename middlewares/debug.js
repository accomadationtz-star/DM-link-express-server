import express from 'express';

/**
 * Comprehensive debugging middleware for multipart/form-data uploads
 * Place this BEFORE your multer middleware
 */
export const debugRequest = (req, res, next) => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('INCOMING REQUEST');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Content-Length:', req.get('Content-Length'));
  
  // Log headers (excluding sensitive ones)
  console.log('\nHeaders:');
  const safeHeaders = { ...req.headers };
  delete safeHeaders.authorization;
  delete safeHeaders.cookie;
  console.log(JSON.stringify(safeHeaders, null, 2));
  
  console.log('═══════════════════════════════════════════════════════\n');
  next();
};

/**
 * Debug middleware to log AFTER multer processes the request
 */
export const debugAfterMulter = (req, res, next) => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('AFTER MULTER PROCESSING');
  console.log('═══════════════════════════════════════════════════════');
  
  // Log body
  console.log('\nRequest Body:');
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(JSON.stringify(req.body, null, 2));
  } else {
    console.log('⚠️  Body is empty or undefined');
  }
  
  // Log files
  console.log('\nRequest Files:');
  if (req.files) {
    if (Array.isArray(req.files)) {
      console.log(`Files array with ${req.files.length} items`);
      req.files.forEach((file, idx) => {
        console.log(`  [${idx}] ${file.fieldname}: ${file.originalname} (${file.size} bytes)`);
      });
    } else {
      console.log('Files object:');
      Object.keys(req.files).forEach(fieldname => {
        const filesArray = req.files[fieldname];
        console.log(`  ${fieldname}: ${filesArray.length} file(s)`);
        filesArray.forEach((file, idx) => {
          console.log(`    [${idx}] ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
        });
      });
    }
  } else if (req.file) {
    console.log('Single file:', req.file.originalname);
  } else {
    console.log('⚠️  No files found');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
  next();
};

/**
 * Error logging middleware
 */
export const debugError = (err, req, res, next) => {
  console.error('\n═══════════════════════════════════════════════════════');
  console.error('ERROR OCCURRED');
  console.error('═══════════════════════════════════════════════════════');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Code:', err.code);
  console.error('Stack:', err.stack);
  console.error('═══════════════════════════════════════════════════════\n');
  next(err);
};