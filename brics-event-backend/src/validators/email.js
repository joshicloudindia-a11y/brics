import dns from "dns/promises";

// Minimal high-risk list (you can expand anytime)
const BLOCKED_DOMAINS = [
  "yopmail.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "trashmail.com"
];

export const isDisposableEmail = async (email) => {
  const domain = email.split("@")[1].toLowerCase();

  // 1. Hard block known temp providers
  if (BLOCKED_DOMAINS.includes(domain)) {
    return true;
  }

  // 2. MX validation
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) return true;
    return false;
  } catch {
    return true;
  }
};
