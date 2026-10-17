export const CLOUDINARY_CONSTANTS = {
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/webm',
  ],
  ALLOWED_RESOURCE_TYPES: ['image', 'video', 'raw', 'auto'],
  FOLDERS: {
    RECEIPTS: 'finora/receipts',
    AVATARS: 'finora/avatars',
    TRANSACTIONS: 'finora/transactions',
    AUDIO: 'finora/audio',
    GENERAL: 'finora/general',
  },
} as const;
