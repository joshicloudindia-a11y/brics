export const formatDateWithOrdinal = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  const day = date.getDate();

  const getOrdinal = (n) => {
    if (n > 3 && n < 21) return "th";
    switch (n % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const suffix = getOrdinal(day);
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  return `${day}${suffix} ${month} ${year}`;
};
