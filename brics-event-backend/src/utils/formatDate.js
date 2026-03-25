export default function formatDate(date){
  if (!date) return "";

  const d = new Date(date);

  const day = d.getDate();
  const year = d.getFullYear();

  const month = d.toLocaleString("en-GB", {
    month: "short",
  });

  // Function to get ordinal suffix
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

  return `${day}${getOrdinal(day)} ${month} ${year}`;
};