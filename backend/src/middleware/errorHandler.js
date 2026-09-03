/**
 * Global centralized error handling middleware
 *
 * Handles:
 * - Mongoose CastError
 * - Mongoose duplicate key errors
 * - Mongoose validation errors
 * - Multer upload errors
 * - JWT errors
 * - Standard HTTP errors
 * - Unknown/unhandled errors
 */

const errorHandler = (err, req, res, next) => {
  // Prevent unused-parameter lint warnings while keeping
  // Express error middleware signature intact.
  void next;

  const isProduction = process.env.NODE_ENV === 'production';

  // Server-side logging
  console.error('[Unhandled Error]', {
    message: err?.message,
    name: err?.name,
    code: err?.code,
    method: req?.method,
    url: req?.originalUrl,
    stack: err?.stack
  });

  // ---------------------------------------------------------
  // MONGOOSE: INVALID OBJECT ID
  // ---------------------------------------------------------
  if (err?.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path || 'identifier'}`
    });
  }

  // ---------------------------------------------------------
  // MONGOOSE: DUPLICATE KEY
  // ---------------------------------------------------------
  if (err?.code === 11000) {
    const duplicateFields = err.keyValue
      ? Object.keys(err.keyValue)
      : [];

    const field = duplicateFields[0] || 'field';

    return res.status(400).json({
      success: false,
      message: `Duplicate value entered for '${field}'. Please provide a unique value.`,
      field
    });
  }

  // ---------------------------------------------------------
  // MONGOOSE: VALIDATION ERROR
  // ---------------------------------------------------------
  if (err?.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map(
      (validationError) => validationError.message
    );

    return res.status(400).json({
      success: false,
      message: errors[0] || 'Validation error',
      errors
    });
  }

  // ---------------------------------------------------------
  // MULTER: FILE UPLOAD ERRORS
  // ---------------------------------------------------------
  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is too large. Maximum allowed size is 10MB.'
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field in upload request.'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload failed.'
    });
  }

  // ---------------------------------------------------------
  // CUSTOM FILE VALIDATION ERRORS
  // ---------------------------------------------------------
  if (
    err?.message &&
    (
      err.message.toLowerCase().includes('file type') ||
      err.message.toLowerCase().includes('invalid file') ||
      err.message.toLowerCase().includes('unsupported file')
    )
  ) {
    return res.status(400).json({
      success: false,
      message: isProduction
        ? 'Invalid or unsupported file.'
        : err.message
    });
  }

  // ---------------------------------------------------------
  // JWT: EXPIRED TOKEN
  // ---------------------------------------------------------
  if (err?.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired. Please log in again.'
    });
  }

  // ---------------------------------------------------------
  // JWT: INVALID TOKEN
  // ---------------------------------------------------------
  if (err?.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }

  // ---------------------------------------------------------
  // JWT: NOT BEFORE ERROR
  // ---------------------------------------------------------
  if (err?.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is not yet active.'
    });
  }

  // ---------------------------------------------------------
  // STANDARD HTTP / CUSTOM APPLICATION ERRORS
  // ---------------------------------------------------------
  const statusCode =
    Number.isInteger(err?.statusCode) && err.statusCode >= 400
      ? err.statusCode
      : Number.isInteger(err?.status) && err.status >= 400
        ? err.status
        : 500;

  // Never expose internal error details for unexpected
  // server errors in production.
  const safeMessage =
    statusCode >= 500
      ? 'Internal Server Error'
      : err?.message || 'Request failed';

  const response = {
    success: false,
    message: safeMessage
  };

  // Development-only debugging information
  if (!isProduction) {
    response.error = err?.name || 'Error';
    response.stack = err?.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;