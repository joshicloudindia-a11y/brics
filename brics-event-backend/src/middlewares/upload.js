import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf"
];

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"), false);
  }
  cb(null, true);
};

export const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "passport_document", maxCount: 1 },
  { name: "logo", maxCount: 1 },

  // TRAVEL
  { name: "arrival_ticket", maxCount: 1 },
  { name: "departure_ticket", maxCount: 1 },
  
  // TEXT FIELDS for various endpoints
  { name: "speakers", maxCount: 1 },
  { name: "event_id", maxCount: 1 },
  { name: "delegates", maxCount: 1 },
  { name: "daos", maxCount: 1 },
]);
