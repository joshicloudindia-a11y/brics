/**
 * =========================================================
 * OTP Encryption Utility - CLIENT SIDE (Frontend)
 * =========================================================
 * Browser-compatible OTP encryption using crypto-js library
 * 
 * Installation:
 * npm install crypto-js
 * 
 * Usage:
 * import { encryptOTPClient } from './utils/otpEncryption.js';
 * 
 * const plainOtp = "123456";
 * const encryptedOtp = encryptOTPClient(plainOtp);
 * // Send encryptedOtp to backend in verifyLoginOtp API call
 */

import CryptoJS from 'crypto-js';

/**
 * Encryption key and IV must match backend constants
 * These should match ENCRYPTION_KEY and ENCRYPTION_IV from backend .env
 * In Vite, use import.meta.env instead of process.env
 */

const ENCRYPTION_KEY_HEX = import.meta.env.VITE_ENCRYPTION_KEY || 
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  
const ENCRYPTION_IV_HEX = import.meta.env.VITE_ENCRYPTION_IV || 
  "0123456789abcdef0123456789abcdef";

/**
 * Convert hex string to CryptoJS WordArray
 */
const getEncryptionKeyForJS = () => {
  return CryptoJS.enc.Hex.parse(ENCRYPTION_KEY_HEX);
};

/**
 * Convert hex string to CryptoJS WordArray for IV
 * IV should be 16 bytes (32 hex characters)
 */
const getEncryptionIVForJS = () => {
  return CryptoJS.enc.Hex.parse(ENCRYPTION_IV_HEX.slice(0, 32));
};

/**
 * Encrypt OTP on client side using AES-256-CBC
 * @param {string} otp - Plain text OTP (e.g., "123456")
 * @returns {string} - Encrypted OTP as hex string
 */
export const encryptOTPClient = (otp) => {
  try {
    if (!otp || typeof otp !== 'string') {
      throw new Error('OTP must be a non-empty string');
    }

    const key = getEncryptionKeyForJS();
    const iv = getEncryptionIVForJS();

    const encrypted = CryptoJS.AES.encrypt(otp, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Return as hex string (same format as backend)
    return encrypted.toString();
  } catch (error) {
    console.error('Error encrypting OTP on client:', error);
    throw new Error('Failed to encrypt OTP');
  }
};

/**
 * Encrypt entire payload (email + OTP) on client side using AES-256-CBC
 * @param {object} payload - Object with email and otp/encryptedOtp
 * @returns {string} - Encrypted payload as hex string
 */
export const encryptPayloadClient = (payload) => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be an object');
    }

    // Convert payload to JSON string
    const payloadString = JSON.stringify(payload);

    const key = getEncryptionKeyForJS();
    const iv = getEncryptionIVForJS();

    const encrypted = CryptoJS.AES.encrypt(payloadString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Return as hex string (same format as backend)
    return encrypted.toString();
  } catch (error) {
    console.error('Error encrypting payload on client:', error);
    throw new Error('Failed to encrypt payload');
  }
};

/**
 * Example usage in a login component:
 *
 * async function handleOTPSubmit(email, plainOtp) {
 *   try {
 *     const encryptedOtp = encryptOTPClient(plainOtp);
 *
 *     const response = await fetch('/api/auth/verify-login-otp', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json'
 *       },
 *       body: JSON.stringify({
 *         email: email,
 *         encryptedOtp: encryptedOtp  // Send encrypted OTP
 *       })
 *     });
 *
 *     const data = await response.json();
 *     if (response.ok) {
 *       localStorage.setItem('token', data.token);
 *       // Redirect to dashboard
 *     } else {
 *       alert(data.message || 'Invalid OTP');
 *     }
 *   } catch (error) {
 *     console.error('Login error:', error);
 *     alert('An error occurred during login');
 *   }
 * }
 */
