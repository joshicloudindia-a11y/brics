import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { verifyQrAccreditation } from "../../services/events";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

const VerifyPage = () => {
  const { accreditationId } = useParams();

  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!accreditationId) return;

    verifyQrAccreditation(accreditationId)
      .then((res) => {
        setData(res);
        setStatus("success");
      })
      .catch((err) => {
        setErrorMsg(err?.response?.data?.message || "Invalid or expired QR");
        setStatus("error");
      });
  }, [accreditationId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "long" });

    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${getOrdinal(day)} ${month}`;
  };

  const toTitleCase = (text) => {
    if (!text || text === "-") return text;
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (status === "loading")
    return (
      <div className="min-h-screen grid place-items-center">Verifying…</div>
    );

  if (status === "error")
    return (
      <div className="min-h-screen grid place-items-center text-red-600 font-semibold">
        {errorMsg}
      </div>
    );

  // ---------- SAFE FALLBACKS ----------
  const eventName =
    toTitleCase(data?.event?.name) || "BRICS International Summit 2026";
  const eventVenue = toTitleCase(data?.event?.venue) || "";
  const eventLocation = toTitleCase(data?.event?.location) || "";
  const eventStartDate = data?.event?.start_date;
  const eventEndDate = data?.event?.end_date;

  const formattedStartDate = eventStartDate ? formatDate(eventStartDate) : "";
  const formattedEndDate = eventEndDate ? formatDate(eventEndDate) : "";

  const dateRange =
    formattedStartDate && formattedEndDate
      ? `${formattedStartDate} – ${formattedEndDate}`
      : formattedStartDate || formattedEndDate || "";

  const eventDetails = [eventName, eventVenue, eventLocation, dateRange]
    .filter(Boolean)
    .join(" | ");

  const userFirstName = data?.user?.first_name || "";
  const userMiddleName = data?.user?.middle_name || "";
  const userLastName = data?.user?.last_name || "";
  const userName =
    toTitleCase(
      [userFirstName, userMiddleName, userLastName].filter(Boolean).join(" "),
    ) || "Verified Delegate";
  const userDesignation = toTitleCase(
    data?.role?.name || data?.user?.designation || "Delegate",
  );
  const userCountry = toTitleCase(data?.user?.country || "Country");

  const userPhoto =
    data?.user?.documents?.photo_url || "/avatar-placeholder.png";

  const accreditationCode = data?.accreditation?._id || accreditationId;

  const qrValue = accreditationCode
    ? `${FRONTEND_URL}/verify/${accreditationCode}`
    : "";

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex justify-center items-center p-6">
      <div className="flex flex-col md:flex-row gap-16">
        {/* FRONT */}
        <Card>
          <div className="flex flex-col items-center px-4 py-10 h-full text-base font-semibold">
            <img
              src={import.meta.env.VITE_BRICS_LOGO_URL}
              alt="BRICS Logo"
              className="h-24 mb-8"
            />

            <div className="flex-1 text-left mb-8 text-center">
              <p>{eventDetails}</p>
            </div>

            <div className="w-52 h-52 rounded-full border-[6px] border-gray-300 mb-8 overflow-hidden bg-gray-200 flex items-center justify-center shadow-md">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500">No Photo</span>
              )}
            </div>

            <h1 className="text-lg font-semibold text-black text-center mb-12 px-4">
              {userName}
            </h1>

            {userDesignation && (
              <p className="text-lg text-base font-semibold text-black text-center mb-2">
                {userDesignation}
              </p>
            )}

            {userCountry && (
              <p className="text-lg text-base  font-semibold text-black text-center capitalize">
                {userCountry}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Card = ({ children }) => (
  <div className="max-w-[500px] bg-white shadow-2xl flex flex-col overflow-hidden rounded-sm">
    {/* Top Colorful Bar */}
    <div className="flex h-12">
      <div className="flex-1 bg-[#FCD34D]" />
      <div className="flex-1 bg-[#1E40AF]" />
      <div className="flex-1 bg-[#FB923C]" />
      <div className="flex-1 bg-[#16A34A]" />
      <div className="flex-1 bg-[#DC2626]" />
    </div>

    <div className="flex-1">{children}</div>

    {/* Bottom Colorful Bar */}
    <div className="flex h-12">
      <div className="flex-1 bg-[#FCD34D]" />
      <div className="flex-1 bg-[#1E40AF]" />
      <div className="flex-1 bg-[#FB923C]" />
      <div className="flex-1 bg-[#16A34A]" />
      <div className="flex-1 bg-[#DC2626]" />
    </div>
  </div>
);

export default VerifyPage;
