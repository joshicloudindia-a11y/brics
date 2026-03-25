export const validatePdfSafe = async (buffer) => {

  const content = buffer.toString("latin1");

  // 1. Must start with PDF header
  if (!content.startsWith("%PDF-")) {
    throw new Error("Invalid PDF header");
  }

  // 2. Must end with EOF
  if (!content.includes("%%EOF")) {
    throw new Error("Invalid PDF EOF");
  }

  // 3. Block dangerous keywords
  const dangerousPatterns = [
    "/JavaScript",
    "/JS",
    "/OpenAction",
    "/AA",
    "/Launch",
    "/EmbeddedFile",
    "/XFA"
  ];

  for (const pattern of dangerousPatterns) {
    if (content.includes(pattern)) {
      throw new Error("Malicious PDF detected");
    }
  }

  // 4. Minimum size check
  if (buffer.length < 100) {
    throw new Error("Invalid PDF file");
  }

  return true;
};
