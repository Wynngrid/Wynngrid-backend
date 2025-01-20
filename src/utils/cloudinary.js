import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: "auto",
      folder: "profile_pictures",
      allowed_formats: ["jpg", "png", "jpeg"],
      max_file_size: 5000000 // 5MB
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};
