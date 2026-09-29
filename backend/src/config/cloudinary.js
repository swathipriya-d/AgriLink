import { v2 as cloudinary } from 'cloudinary';

const credentials = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

export const cloudinaryReady = Object.values(credentials).every((value) => Boolean(value?.trim()));
if (cloudinaryReady) cloudinary.config({ ...credentials, secure: true });

export function uploadProductPhoto(buffer, { userId }) {
  if (!cloudinaryReady) throw new Error('CLOUDINARY_NOT_CONFIGURED');
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream({
      folder: 'agrilink/products',
      public_id: `grower-${String(userId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)}-${Date.now()}`,
      resource_type: 'image',
      transformation: [
        { width: 1600, height: 1200, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
    }, (error, result) => {
      if (error) reject(error);
      else if (!result?.secure_url) reject(new Error('Cloudinary did not return an image URL.'));
      else resolve({ imageUrl: result.secure_url, publicId: result.public_id });
    });
    upload.end(buffer);
  });
}
