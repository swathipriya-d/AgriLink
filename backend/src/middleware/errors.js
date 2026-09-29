export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function notFound(req, res) {
  return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'That AgriLink resource could not be found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, code: 'PAYLOAD_TOO_LARGE', message: 'This request is too large. Choose a smaller image or request.' });
  }
  if (error.name === 'MulterError') {
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 422).json({ success: false, code: error.code || 'UPLOAD_REJECTED', message: error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller.' : 'This image could not be accepted.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Please review this listing and try again.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, code: 'CONFLICT', message: 'A record with those details already exists.' });
  }
  if (error.statusCode && error.statusCode < 500) {
    return res.status(error.statusCode).json({ success: false, code: error.code || 'REQUEST_REJECTED', message: error.message });
  }
  if (process.env.NODE_ENV !== 'production') console.error('[AgriLink API]', error.message);
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' });
}
