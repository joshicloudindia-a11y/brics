/**
 * =========================================================
 * OTP Encryption/Decryption Utilities - BACKEND
 * =========================================================
 * Uses Node.js crypto to decrypt OTPs encrypted by CryptoJS frontend
 * 
 * Environment Variables Required:
 * - ENCRYPTION_KEY: 64-char hex string (256-bit key for AES-256)
 * - ENCRYPTION_IV: 32-char hex string (128-bit IV for AES-256-CBC)
 * 
 * Must match REACT_APP_ENCRYPTION_KEY and REACT_APP_ENCRYPTION_IV on frontend
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

/**
 * Get encryption key from environment
 */
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY not set in .env - Cannot decrypt OTP! Add: ENCRYPTION_KEY=your_64_char_hex_string"
    );
  }
  if (key.length !== 64) {
    throw new Error(`ENCRYPTION_KEY must be 64 hex characters, got ${key.length}`);
  }
  return Buffer.from(key, "hex");
};

/**
 * Get encryption IV from environment
 */
const getEncryptionIV = () => {
  const iv = process.env.ENCRYPTION_IV;
  if (!iv) {
    throw new Error(
      "ENCRYPTION_IV not set in .env - Cannot decrypt OTP! Add: ENCRYPTION_IV=your_32_char_hex_string"
    );
  }
  if (iv.length !== 32) {
    throw new Error(`ENCRYPTION_IV must be 32 hex characters, got ${iv.length}`);
  }
  return Buffer.from(iv, "hex");
};

/**
 * Decrypt OTP encrypted by frontend using CryptoJS
 * CryptoJS output format: base64 string (with Salted__ header)
 * 
 * @param {string} encryptedOtpBase64 - Encrypted OTP as base64 string from frontend
 * @returns {string} - Decrypted plain text OTP
 */
export const decryptOTP = (encryptedOtpBase64) => {
  try {
    if (!encryptedOtpBase64 || typeof encryptedOtpBase64 !== "string") {
      throw new Error("Invalid encrypted OTP format");
    }

    const key = getEncryptionKey();
    const iv = getEncryptionIV();

    // Convert base64 to buffer
    const encryptedBuffer = Buffer.from(encryptedOtpBase64, "base64");

    // Check if it has the CryptoJS "Salted__" header (first 8 bytes: 53616c7465645f5f)
    const saltedHeader = "Salted__";
    let ciphertext;

    if (encryptedBuffer.toString("utf8", 0, 8) === saltedHeader) {
      // CryptoJS format: "Salted__" (8 bytes) + salt (8 bytes) + ciphertext
      // We ignore the salt because we're using explicit IV
      ciphertext = encryptedBuffer.slice(16);
    } else {
      // Direct ciphertext (no header)
      ciphertext = encryptedBuffer;
    }

    if (ciphertext.length < 16) {
      throw new Error("Ciphertext too short");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("OTP Decryption error:", error.message);
    throw new Error(`Failed to decrypt OTP: ${error.message}`);
  }
};

/**
 * Hash OTP using SHA-256 (one-way encryption for storage)
 * Same hash from same OTP always
 * 
 * @param {string} otp - Plain text OTP
 * @returns {string} - SHA-256 hash as hex string
 */
export const hashOTP = (otp) => {
  try {
    if (!otp || typeof otp !== "string") {
      throw new Error("OTP must be a non-empty string");
    }
    return crypto.createHash("sha256").update(otp).digest("hex");
  } catch (error) {
    console.error("OTP Hashing error:", error);
    throw new Error("Failed to hash OTP");
  }
};

/**
 * Verify encrypted OTP against stored hash
 * 
 * @param {string} encryptedOtpBase64 - Encrypted OTP from frontend
 * @param {string} storedHash - Hash stored in Redis
 * @returns {boolean} - True if OTP matches
 */
export const verifyEncryptedOTP = (encryptedOtpBase64, storedHash) => {
  try {
    const decrypted = decryptOTP(encryptedOtpBase64);
    const hash = hashOTP(decrypted);
    return hash === storedHash;
  } catch (error) {
    console.error("OTP Verification error:", error);
    return false;
  }
};

/**
 * Encrypt OTP on backend (for storing in Redis before sending to client)
 * Frontend will need to decrypt, hash, and send back
 * 
 * @param {string} otp - Plain text OTP
 * @returns {string} - Encrypted OTP as base64 string
 */
export const encryptOTPBackend = (otp) => {
  try {
    if (!otp || typeof otp !== "string") {
      throw new Error("OTP must be a non-empty string");
    }

    const key = getEncryptionKey();
    const iv = getEncryptionIV();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(otp, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Return as base64 (same format as CryptoJS)
    return encrypted.toString("base64");
  } catch (error) {
    console.error("OTP Encryption error:", error);
    throw new Error("Failed to encrypt OTP");
  }
};
