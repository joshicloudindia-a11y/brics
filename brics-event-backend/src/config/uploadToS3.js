import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Upload to S3 - accepts either file object or base64 string
 * Converts everything to binary and stores as actual image/file
 * @param {Object|String} fileOrBase64 - Multer file object OR base64 string
 * @param {string} userId - User ID for folder structure
 * @param {string} folder - S3 folder name
 * @returns {string} S3 key
 */
export const uploadToS3 = async (fileOrBase64, userId, folder) => {
  let fileBuffer;
  let contentType;
  let originalFilename;

  // Check if input is a base64 string (starts with data:)
  if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
    // Extract mimetype and base64 data
    const matches = fileOrBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 string format');
    }
    
    contentType = matches[1];
    const base64Data = matches[2];
    
    // Decode base64 to binary buffer
    fileBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate filename based on content type
    const ext = contentType.split('/')[1] || 'bin';
    originalFilename = `file_${Date.now()}.${ext}`;
  } 
  // Check if input is a plain base64 string (without data: prefix)
  else if (typeof fileOrBase64 === 'string' && fileOrBase64.length > 10) {
    // More lenient base64 detection - check if it looks like base64
    const cleanString = fileOrBase64.replace(/\s/g, '');
    // Check if it contains mostly base64 characters and has reasonable length
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    const isBase64 = base64Regex.test(cleanString) && cleanString.length % 4 === 0;
    
    if (isBase64) {
      try {
        // Try to decode to verify it's valid base64
        Buffer.from(cleanString, 'base64');
        contentType = 'image/jpeg'; // Default assumption for plain base64
        fileBuffer = Buffer.from(cleanString, 'base64');
        originalFilename = `file_${Date.now()}.jpg`;
      } catch (decodeError) {
        throw new Error('Invalid base64 string: cannot decode');
      }
    } else {
      throw new Error('String does not appear to be valid base64');
    }
  }
  // Check if input is a file object (has buffer and mimetype)
  else if (fileOrBase64 && fileOrBase64.buffer) {
    // Use file buffer directly
    fileBuffer = fileOrBase64.buffer;
    contentType = fileOrBase64.mimetype;
    originalFilename = fileOrBase64.originalname || `file_${Date.now()}`;
  } 
  else {
    throw new Error('Invalid input: must be either a file object or base64 string');
  }

  // Create clean file name
  const cleanName = originalFilename
    .replace(/\s+/g, "-")
    .replace(/[<>:"|?*\\]/g, "")
    .toLowerCase();
  
  const encodedName = encodeURIComponent(cleanName);
  const key = `${folder}/${userId}_${Date.now()}_${encodedName}`;

  // Upload binary file to S3
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ContentDisposition: contentType.startsWith('image/') ? 'inline' : 'attachment',
      CacheControl: "no-store",
      Metadata: {
        "x-content-type-options": "nosniff",
      }
    })
  );

  return key;
};

/**
 * Get signed URL from S3 - returns actual image/file
 * Frontend can use this URL directly in <img> tags
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (max 7 days for AWS SigV4)
 * @returns {string} Signed URL
 */
export const getSignedS3Url = async (key, expiresIn = 604800) => {
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
};

/**
 * Get file content as buffer from S3 (optional utility)
 * @param {string} key - S3 object key
 * @returns {Buffer} File buffer
 */
export const getBase64FromS3 = async (key) => {
  if (!key) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const response = await s3.send(command);
    const buffer = await response.Body.transformToByteArray();
    
    // Convert to base64 if needed
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.ContentType || 'application/octet-stream';
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching from S3:", error);
    return null;
  }
};
