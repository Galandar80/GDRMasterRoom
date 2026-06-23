export const APP_LIMITS = {
  messageMaxChars: 8_000,
  messageExportMaxRows: 5_000,
  messageExportPageSize: 500,
  reusableMediaPerScope: 250,
  uploadBytes: {
    "portraits": 4 * 1024 * 1024,
    "audio-tracks": 12 * 1024 * 1024,
    "scene-images": 20 * 1024 * 1024
  }
} as const;

const ALLOWED_UPLOAD_TYPES: Record<keyof typeof APP_LIMITS.uploadBytes, readonly string[]> = {
  "portraits": ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  "scene-images": [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ],
  "audio-tracks": [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/aac",
    "audio/flac"
  ]
};

const ALLOWED_UPLOAD_EXTENSIONS: Record<keyof typeof APP_LIMITS.uploadBytes, readonly string[]> = {
  "portraits": ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  "scene-images": ["jpg", "jpeg", "png", "webp", "gif", "avif", "mp4", "webm", "mov"],
  "audio-tracks": ["mp3", "wav", "ogg", "m4a", "aac", "flac"]
};

export type AppStorageBucket = keyof typeof APP_LIMITS.uploadBytes;

export function validateUploadFile(bucket: string, file: File): asserts bucket is AppStorageBucket {
  if (!(bucket in APP_LIMITS.uploadBytes)) {
    throw new Error("Destinazione di caricamento non supportata.");
  }

  const safeBucket = bucket as AppStorageBucket;
  const maxBytes = APP_LIMITS.uploadBytes[safeBucket];
  if (file.size <= 0) {
    throw new Error("Il file selezionato è vuoto.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Il file supera il limite di ${formatMegabytes(maxBytes)} MB.`);
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeAllowed = Boolean(file.type) && ALLOWED_UPLOAD_TYPES[safeBucket].includes(file.type.toLowerCase());
  const extensionAllowed = ALLOWED_UPLOAD_EXTENSIONS[safeBucket].includes(extension);
  if (!mimeAllowed && !extensionAllowed) {
    throw new Error("Formato del file non supportato.");
  }
}

export function validateMessageContent(content: string) {
  if (!content.trim()) {
    throw new Error("Il messaggio non può essere vuoto.");
  }
  if (content.length > APP_LIMITS.messageMaxChars) {
    throw new Error(`Il messaggio supera il limite di ${APP_LIMITS.messageMaxChars.toLocaleString("it-IT")} caratteri.`);
  }
}

function formatMegabytes(bytes: number) {
  return Math.round(bytes / 1024 / 1024);
}
