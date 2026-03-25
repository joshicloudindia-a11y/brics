import sanitizeHtml from "sanitize-html";

/**
 * Central HTML sanitizer
 * Removes all HTML tags & attributes
 * Prevents Stored XSS & HTML Injection
 */
export const sanitizeHtmlString = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });
};
