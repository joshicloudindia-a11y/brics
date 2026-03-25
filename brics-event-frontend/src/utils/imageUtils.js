/**
 * Utility functions for handling images and URLs
 */

/**
 * Converts relative image URLs to full URLs by prefixing with API base URL
 * @param {string} url - The image URL (can be relative or absolute)
 * @returns {string} - The full URL if relative, or the original URL if already absolute
 */
export const getFullImageUrl = (url) => {
  if (!url) return null;

  // If it's already a full URL (starts with http/https), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative URL, prefix with API base URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  return `${baseUrl}/${url}`;
};