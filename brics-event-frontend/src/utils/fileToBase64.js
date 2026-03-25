/**
 * Convert file to base64 string
 * @param {File} file - File object from input
 * @returns {Promise<string>} - Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extract base64 part without data:image/png;base64, prefix
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

/**
 * Convert multiple files to base64
 * @param {Object} files - Object with field names as keys and File objects as values
 * @returns {Promise<Object>} - Object with field names as keys and base64 strings as values
 */
export const filesToBase64 = async (files) => {
  const result = {};
  for (const [fieldName, file] of Object.entries(files)) {
    if (file) {
      result[fieldName] = await fileToBase64(file);
    }
  }
  return result;
};
