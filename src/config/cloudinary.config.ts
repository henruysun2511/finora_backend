import 'dotenv/config';

export const CloudinaryConfig = {
  CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  FOLDER: process.env.CLOUDINARY_FOLDER ?? 'finora',
  AUDIO_FOLDER: process.env.CLOUDINARY_AUDIO_FOLDER ?? 'finora/audio',
} as const;
