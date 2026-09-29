import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { authenticate, allowRoles } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/errors.js';
import { cloudinaryReady, uploadProductPhoto } from '../config/cloudinary.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) {
      const error = new Error('Choose a JPEG, PNG, WebP or AVIF image.');
      error.statusCode = 422;
      error.code = 'UNSUPPORTED_IMAGE_TYPE';
      callback(error);
    } else callback(null, true);
  },
});
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

router.post('/image', authenticate, allowRoles('farmer'), upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(422).json({ success: false, code: 'IMAGE_REQUIRED', message: 'Choose a JPEG, PNG, WebP or AVIF image up to 5 MB.' });
  const detected = await fileTypeFromBuffer(req.file.buffer);
  if (!detected || !supportedImageTypes.has(detected.mime)) {
    return res.status(422).json({ success: false, code: 'INVALID_IMAGE_BYTES', message: 'This file is not a supported, decodable image.' });
  }
  if (!cloudinaryReady) return res.status(503).json({ success: false, code: 'UPLOAD_NOT_CONFIGURED', message: 'Cloudinary is not connected. Your photo preview stays in this browser; no file was uploaded.' });
  const result = await uploadProductPhoto(req.file.buffer, { userId: req.user._id });
  return res.status(201).json({ success: true, data: { imageUrl: result.imageUrl }, message: 'Photo uploaded securely.' });
}));

export default router;
