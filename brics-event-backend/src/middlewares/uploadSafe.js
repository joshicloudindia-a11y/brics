import multer from "multer";
import { uploadDocuments } from "./upload.js";
import { fileTypeFromBuffer } from "file-type";
import { validatePdfSafe } from "../data/validatePdfSafe.js";


const IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const DOC_MIME = [
  "application/pdf"
];

const IMAGE_FIELDS = ["photo", "logo"];
const DOC_FIELDS = ["passport_document"];
const TRAVEL_FIELDS = ["arrival_ticket", "departure_ticket"];

// Helper: Decode base64 and validate
const processBase64File = async (base64String, fieldName) => {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    const type = await fileTypeFromBuffer(buffer);
    
    return {
      buffer,
      mimetype: type?.mime,
      size: buffer.length,
      fieldname: fieldName,
      originalname: `${fieldName}.${type?.ext || 'bin'}`
    };
  } catch (error) {
    throw new Error(`Invalid base64 data for ${fieldName}`);
  }
};

export const uploadDocumentsSafe = async (req, res, next) => {
  try {
    // CHECK IF BASE64 DATA IN BODY
    const hasBase64Photo = req.body.photo && typeof req.body.photo === 'string';
    const hasBase64Passport = req.body.passport_document && typeof req.body.passport_document === 'string';
    const hasBase64Logo = req.body.logo && typeof req.body.logo === "string";

    if (hasBase64Photo || hasBase64Passport || hasBase64Logo) {
      // BASE64 MODE
      req.files = req.files || {};

      if (hasBase64Photo) {
        const photoFile = await processBase64File(req.body.photo, 'photo');
        const photoType = await fileTypeFromBuffer(photoFile.buffer);
        
        if (!photoType || !IMAGE_MIME.includes(photoType.mime)) {
          return res.status(400).json({
            message: "Only JPG, PNG, WEBP images allowed",
            detected: photoType?.mime || "unknown"
          });
        }

        req.files.photo = [photoFile];
        delete req.body.photo;
      }

      if (hasBase64Passport) {
        const passportFile = await processBase64File(req.body.passport_document, 'passport_document');
        const passportType = await fileTypeFromBuffer(passportFile.buffer);
        
        if (!passportType || !DOC_MIME.includes(passportType.mime)) {
          return res.status(400).json({
            message: "Only PDF allowed for documents",
            detected: passportType?.mime || "unknown"
          });
        }

        try {
          await validatePdfSafe(passportFile.buffer);
        } catch {
          return res.status(400).json({
            message: "Malicious PDF detected"
          });
        }


        req.files.passport_document = [passportFile];
        delete req.body.passport_document;
      }

      if (hasBase64Logo) {
        const logoFile = await processBase64File(req.body.logo, 'logo');
        const logoType = await fileTypeFromBuffer(logoFile.buffer);
        
        if (!logoType || !IMAGE_MIME.includes(logoType.mime)) {
          return res.status(400).json({
            message: "Only JPG, PNG, WEBP images allowed for logo",
            detected: logoType?.mime || "unknown"
          });
        }

        req.files.logo = [logoFile];
        delete req.body.logo;
      }

      return next();
    }

    // MULTIPART MODE (original logic)
    uploadDocuments(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "File too large. Maximum allowed size is 5MB",
        });
      }

      console.error("Multer error:", err.code, err.message);
      return res.status(400).json({
        message: "Invalid file upload",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }

    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({
        message: "Invalid file upload",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }

    try {
      const files = Object.values(req.files || {}).flat();

      for (const file of files) {
        const type = await fileTypeFromBuffer(file.buffer);

        // PROFILE IMAGES
        if (IMAGE_FIELDS.includes(file.fieldname)) {
          if (!type || !IMAGE_MIME.includes(type.mime)) {
            return res.status(400).json({
              message: "Only JPG, PNG, WEBP images allowed",
            });
          }
        }

        // DOCUMENTS
       if (DOC_FIELDS.includes(file.fieldname)) {
          if (!type || !DOC_MIME.includes(type.mime)) {
            return res.status(400).json({
              message: "Only PDF allowed for documents",
            });
          }

          try {
            await validatePdfSafe(file.buffer);
          } catch {
            return res.status(400).json({
              message: "Malicious PDF detected"
            });
          }
        }


        // TRAVEL TICKETS
        if (TRAVEL_FIELDS.includes(file.fieldname)) {
          if (
            !type ||
            ![...IMAGE_MIME, ...DOC_MIME].includes(type.mime)
          ) {
            return res.status(400).json({
              message: "Travel tickets must be JPG, PNG or PDF",
            });
          }

          if (type.mime === "application/pdf") {
            try {
              await validatePdfSafe(file.buffer);
            } catch {
              return res.status(400).json({
                message: "Malicious PDF detected"
              });
            }
          }
        }
      }

      next();
    } catch (error) {
      return res.status(400).json({
        message: "File validation failed",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    return res.status(400).json({
      message: "File processing failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};
