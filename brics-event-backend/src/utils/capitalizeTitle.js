export default function capitalizeTitle(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};