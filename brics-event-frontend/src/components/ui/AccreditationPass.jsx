import React, { useRef, useState, useEffect, use } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

// import bricsLogo from "../assets/images/login_page_logo.svg";
import bricsLogo from "../../assets/images/logo1.svg";
import artImage from "../../assets/images/vector2.svg";
import { FaUserAlt } from "react-icons/fa";
import domtoimage from "dom-to-image-more";
import { Loader } from "lucide-react";
const AccreditationPass = ({ userData, eventData, onClose }) => {
  const passRef = useRef(null);
  const pdfPassRef = useRef(null); // New ref for PDF-only template
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (userData?.user?.documents?.photo_url) {
      setImageLoading(true);
      setImageError(false);
      loadImageAsBase64(userData.user.documents.photo_url)
        .then((base64) => {
          setPhotoBase64(base64);
          setImageLoading(false);
        })
        .catch(() => {
          setImageError(true);
          setImageLoading(false);
        });
    } else {
      setImageLoading(false);
      setImageError(true);
    }
  }, [userData]);

  const loadImageAsBase64 = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };
  const navigate = useNavigate();

  // ✅ SIRF FIRST_NAME CHECK KAREGA
  // const checkProfileComplete = () => {
  //   console.log('userdata', userData);
  //   return (
  //     userData?.user?.first_name &&
  //     userData.user.first_name.trim() !== "" &&
  //     userData?.user?.position &&
  //     userData.user.position.trim() !== ""
  //   );
  // };

  
  const checkProfileComplete = () => {
    // console.log('userdata', userData);
    if (userData?.role?.name === "SPEAKER") {
      return (
        userData?.user?.first_name &&
        userData.user.first_name.trim() !== "" &&
        userData?.user?.email &&
        userData.user.email.trim() !== "" &&
        userData.user?.organisation &&
        userData.user.organisation.trim() !== "" &&
        userData.user?.designation &&
        userData.user.designation.trim() !== ""
      );
    } else {
      return (
        userData?.user?.first_name &&
        userData.user.first_name.trim() !== "" &&
        userData?.user?.position &&
        userData.user.position.trim() !== ""
      );
    }
  };

  const downloadPass = async () => {
    // ✅ Check first_name only
    if (!checkProfileComplete()) {
      setShowModal(true);
      return;
    }

    setLoading(true);

    try {
      // Use the PDF-specific template instead
      const images = pdfPassRef.current.querySelectorAll("img");
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 3000);
        });
      });

      await Promise.all(imagePromises);

      // Extra delay to ensure everything is rendered
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(pdfPassRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 15000,
        removeContainer: true,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate aspect ratio to fit properly
      const canvasAspectRatio = canvas.width / canvas.height;
      const pdfAspectRatio = pdfWidth / pdfHeight;

      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;

      if (canvasAspectRatio > pdfAspectRatio) {
        finalHeight = pdfWidth / canvasAspectRatio;
      } else {
        finalWidth = pdfHeight * canvasAspectRatio;
      }

      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        finalWidth,
        finalHeight,
        undefined,
        "FAST",
      );
      pdf.save(`${userData?.user?.first_name || "Accreditation"}_Pass.pdf`);

      setLoading(false);
    } catch (error) {
      alert("Failed to generate pass. Please try again.");
      setLoading(false);
    }
  };

  const accreditationId =
    eventData?.user_event_id ||
    `${userData?.user?.id}_${eventData?._id || eventData?.id}`;
  // const accreditationId = eventData?.user_event_id || userData?.user?.id;

  // Generate QR value with user and event information
  const qrValue = accreditationId
    ? `${FRONTEND_URL}/verify/${accreditationId}`
    : `${FRONTEND_URL}/verify/${userData?.user?.id}_${eventData?._id}`;
  const handleGoToProfile = () => {
    setShowModal(false);
    onClose();
    navigate("/profile");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  // Helper function to capitalize text
  const capitalizeText = (text) => {
    if (!text || text === "-") return text;
    return text.toUpperCase();
  };

  // Check if user is from India
  const isIndianUser = userData?.user?.country?.toLowerCase() === "india";

  const closeModal = () => {
    setShowModal(false);
  };

  const roleWithUserId = (() => {
    // Handle both cases: role as object with name property, or role as string
    const roleName = userData?.role?.name || userData?.role;
    const userId = userData?.user?.id;

    if (!roleName && !userId) {
      return "-";
    }

    const rolePrefixes = {
      "SUPER ADMIN": "SA",
      "EVENT MANAGER": "EM",
      DAO: "DAO",
      "HEAD OF DELEGATE": "HOD",
      DELEGATE: "DELEGATE",
      "SECURITY OFFICER": "SO",
      INTERPRETER: "INTERPRETER",
      MEDIA: "MEDIA",
      DEPUTY: "DEPUTY",
      "DELEGATION CONTACT OFFICER": "DELEGATION CONTACT OFFICER",
      SPEAKER: "SPEAKER",
    };

    const prefix = roleName
      ? rolePrefixes[roleName.toUpperCase()] || roleName.toUpperCase()
      : "";

    if (prefix && userId) {
      return `${prefix}_${userId}`;
    }

    if (prefix) {
      return prefix;
    }

    return userId || "-";
  })();

  const roleName = userData?.role?.name ?? userData?.role ?? "DELEGATE";
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .tinos-pass { font-family: 'Tinos', serif !important; }
        .tinos-pass * { font-family: 'Tinos', serif !important; }
      `}</style>

      {/* Hidden PDF Template - Fixed Desktop Layout - Always off-screen */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div
          ref={pdfPassRef}
          className="tinos-pass relative w-[210mm] min-h-[297mm] bg-orange-50/20 py-8 px-16 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-6 text-[#0A0A0A]">
            <div className="flex justify-center mb-4 mx-auto w-full items-center gap-6">
              <img src={bricsLogo} alt="BRICS Logo" className="w-[150px]" />
            </div>
            <h3 className="text-lg font-semibold">
              Accreditation Confirmation Letter
            </h3>
          </div>

          {/* Body */}
          <div className="flex flex-row justify-between items-start gap-0 mb-8 mt-12">
            {/* Photo */}
            <div className="w-32 h-40 border-[1px] border-[#AD9461] rounded-lg overflow-hidden flex-shrink-0">
              {imageLoading ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Loader className="animate-spin text-gray-500" size={32} />
                </div>
              ) : imageError || !photoBase64 ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <FaUserAlt className="text-gray-400" size={48} />
                </div>
              ) : (
                <img
                  src={photoBase64}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              )}
            </div>

            {/* Message */}
            <div className="flex-1 px-8 text-left">
              <h3 className="text-xl font-semibold mb-4 text-[#364153] capitalize">
                Dear{" "}
                {userData?.user?.first_name ||
                  userData?.user?.name ||
                  "Delegate"}
                ,
              </h3>
              <p className="text-gray-700 leading-relaxed text-sm tracking-wide text-justify">
                Team BRICS INDIA is pleased to confirm your accreditation for
                the <strong>{eventData?.name}</strong> to be held at{" "}
                {eventData?.venue || ""}{" "}
                {eventData?.location || "No description available."} ,{" "}
                {eventData?.start_date && eventData?.end_date && (
                  <>
                    {" "}
                    from {formatDate(eventData.start_date)} to{" "}
                    {formatDate(eventData.end_date)}
                  </>
                )}
              </p>
            </div>

            {/* QR Code */}
            <div className="rounded-lg flex flex-col items-center justify-center flex-shrink-0">
              <div className="bg-white p-1">
                <QRCodeSVG value={qrValue} size={140} level="M" />
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="border-[1px] border-[#AD9461] rounded-lg p-6">
            <div className="space-y-2">
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">
                  First Name
                </span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {capitalizeText(userData?.user?.first_name) || "-"}
                </span>
              </div>
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">
                  Middle Name
                </span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {capitalizeText(userData?.user?.middle_name) || "-"}
                </span>
              </div>
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">
                  Last Name
                </span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {capitalizeText(userData?.user?.last_name) || "-"}
                </span>
              </div>
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">Gender</span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {capitalizeText(userData?.user?.gender) || "-"}
                </span>
              </div>
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">
                  Phone Number
                </span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {userData?.user.mobile || "-"}
                </span>
              </div>
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">E-Mail</span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {userData?.user?.email || "-"}
                </span>
              </div>
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">Country</span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {capitalizeText(userData?.user?.country) || "INDIA"}
                </span>
              </div>
              {userData?.user?.organisation && (
                <div className="flex flex-row text-sm">
                  <span className="w-64 text-gray-700 font-medium">
                    Organization
                  </span>
                  <span className="inline mx-4">:</span>
                  <span className="flex-1 text-gray-800 break-words">
                    {capitalizeText(userData?.user?.organisation)}
                  </span>
                </div>
              )}
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">
                  Delegate Status
                </span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {" "}
                  {capitalizeText(roleName)}
                </span>
              </div>
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">Position</span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {capitalizeText(userData?.user?.position) || "-"}
                </span>
              </div>

              {!isIndianUser && (
                <>
                  <div className="flex flex-row text-sm">
                    <span className="w-64 text-gray-700 font-medium">
                      Type of Passport
                    </span>
                    <span className="inline mx-4">:</span>
                    <span className="flex-1 text-gray-800 break-words">
                      {capitalizeText(
                        userData?.user?.passport?.passport_type,
                      ) || "-"}
                    </span>
                  </div>
                  <div className="flex flex-row text-sm">
                    <span className="w-64 text-gray-700 font-medium">
                      Passport Number
                    </span>
                    <span className="inline mx-4">:</span>
                    <span className="flex-1 text-gray-800 break-words">
                      {capitalizeText(
                        userData?.user?.passport?.passport_number,
                      ) || "-"}
                    </span>
                  </div>
                  <div className="flex flex-row text-sm">
                    <span className="w-64 text-gray-700 font-medium">
                      Passport Expiry Date
                    </span>
                    <span className="inline mx-4">:</span>
                    <span className="flex-1 text-gray-800 break-words">
                      {formatDate(userData?.user?.passport?.expiry_date) || "-"}
                    </span>
                  </div>
                  <div className="flex flex-row text-sm">
                    <span className="w-64 text-gray-700 font-medium">
                      Passport Issuing Place
                    </span>
                    <span className="inline mx-4">:</span>
                    <span className="flex-1 text-gray-800 break-words">
                      {capitalizeText(
                        userData?.user?.passport?.place_of_issue,
                      ) || "-"}
                    </span>
                  </div>
                </>
              )}
              <div className="flex flex-row text-sm">
                <span className="w-64 text-gray-700 font-medium">
                  Registration ID
                </span>
                <span className="inline mx-4">:</span>
                <span className="flex-1 text-gray-800 break-words">
                  {roleWithUserId}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-600 text-xs">
            <p className="font-semibold">
              Team BRICS INDIA, Ministry of External Affairs, Government of
              India
            </p>
            <p className="mt-2">
              Sushma Swaraj Bhawan, 15-A, Rizal Marg, Chanakyapuri, New
              Delhi-110021
            </p>
            <p className="mt-6 sm:mt-8">
              This letter may kindly be submitted, along with the visa
              application, to the nearest Indian Mission/Consulate for
              appropriate consideration and necessary facilitation of visa
              issuance, in the event that your country is not covered under the
              bilateral visa exemption agreements concluded by the Government of
              India for holders of diplomatic/official/service passports.
            </p>
          </div>

          {/* Art Image */}
          <div className="absolute bottom-0 left-0 opacity-50">
            <img src={artImage} alt="art" className="w-[200px] rotate-90" />
          </div>
        </div>
      </div>

      {/* ✅ MODAL - SIRF DOWNLOAD CLICK PE AAYEGA */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[260] p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg p-8 max-w-md w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Profile Incomplete
              </h2>
              <p className="text-gray-600 text-sm">
                Please complete your profile to download the accreditation pass.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGoToProfile}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Full Screen Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[270] p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-lg p-8 max-w-md w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Scan QR Code
              </h2>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG value={qrValue} size={300} level="M" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mt-4">
                Point your camera at this QR code for verification
              </p>
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ✅ PASS HAMESHA DIKHEGA - Responsive Preview (no changes) */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[250] overflow-auto p-2 sm:p-4">
        <div className="relative bg-gray-100 rounded-lg p-3 sm:p-6 max-w-5xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-2 sm:mb-4 sticky top-0 z-10 pb-2 sm:pb-4 bg-transparent">
            <button
              onClick={onClose}
              className="px-3 sm:px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-sm sm:text-base"
            >
              ✕
            </button>
            <button
              onClick={downloadPass}
              disabled={loading}
              className="px-4 sm:px-8 py-2 sm:py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed btn-primary-enabled text-xs sm:text-base"
            >
              {loading ? "Generating..." : "Download Pass"}
            </button>
          </div>

          <div
            ref={passRef}
            className="tinos-pass relative w-full sm:w-[210mm] min-h-[297mm] bg-orange-50/20 py-4 sm:py-8 px-4 sm:px-8 md:px-16 mx-auto shadow-2xl"
          >
            <div className="text-center mb-4 sm:mb-6 text-[#0A0A0A]">
              <div className="flex justify-center mb-2 sm:mb-4 mx-auto w-full items-center gap-3 sm:gap-6">
                <img
                  src={bricsLogo}
                  alt="BRICS Logo"
                  className="w-24 sm:w-32 md:w-[150px]"
                />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-semibold">
                Accreditation Confirmation Letter
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4 sm:gap-0 mb-6 sm:mb-8 mt-6 sm:mt-12">
              <div className="w-24 h-32 sm:w-32 sm:h-40 border-[1px] border-[#AD9461] rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                {imageLoading ? (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <Loader className="animate-spin text-gray-500" size={32} />
                  </div>
                ) : imageError || !photoBase64 ? (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FaUserAlt className="text-gray-400" size={48} />
                  </div>
                ) : (
                  <img
                    src={photoBase64}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                )}
              </div>

              <div className="flex-1 px-2 sm:px-4 md:px-8 text-center sm:text-left">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-4 text-[#364153] capitalize">
                  Dear{" "}
                  {userData?.user?.first_name ||
                    userData?.user?.name ||
                    "Delegate"}
                  ,
                </h3>
                <p className="text-gray-700 leading-relaxed text-xs sm:text-sm tracking-wide text-justify">
                  Team BRICS INDIA is pleased to confirm your accreditation for
                  the <strong>{eventData?.name}</strong> to be held at{" "}
                  {eventData?.venue || ""}{" "}
                  {eventData?.location || "No description available."} ,{" "}
                  {eventData?.start_date && eventData?.end_date && (
                    <>
                      {" "}
                      from {formatDate(eventData.start_date)} to{" "}
                      {formatDate(eventData.end_date)}
                    </>
                  )}
                </p>
              </div>

              {/* QR Code */}
              <div className="rounded-lg flex flex-col items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                {/* <p className="text-xs font-semibold mb-1 text-center">QR Code</p> */}
                <div
                  className="bg-white p-1 cursor-pointer hover:bg-gray-50 transition-colors rounded"
                  onClick={() => setShowQRModal(true)}
                  title="Click to enlarge QR code for scanning"
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={window.innerWidth < 640 ? 100 : 140}
                    level="M"
                  />
                </div>
              </div>
            </div>

            <div className="border-[1px] border-[#AD9461] rounded-lg p-3 sm:p-4 md:p-6">
              <div className="space-y-1 sm:space-y-2">
                <DetailRow
                  label="First Name"
                  value={capitalizeText(userData?.user?.first_name) || "-"}
                />
                <DetailRow
                  label="Middle Name"
                  value={capitalizeText(userData?.user?.middle_name) || "-"}
                />
                <DetailRow
                  label="Last Name"
                  value={capitalizeText(userData?.user?.last_name) || "-"}
                />
                <DetailRow
                  label="Gender"
                  value={capitalizeText(userData?.user?.gender) || "-"}
                />
                <DetailRow
                  label="Phone Number"
                  value={userData?.user.mobile || "-"}
                />
                <DetailRow
                  label="E-Mail"
                  value={userData?.user?.email || "-"}
                />
                <DetailRow
                  label="Country"
                  value={capitalizeText(userData?.user?.country) || "INDIA"}
                />
                {userData?.user?.organisation && (
                  <DetailRow
                    label="Organization"
                    value={capitalizeText(userData?.user?.organisation)}
                  />
                )}
                <DetailRow
                  label="Delegate Status"
                  value={capitalizeText(roleName) || "DELEGATE"}
                />
                <DetailRow
                  label="Position"
                  value={capitalizeText(userData?.user?.position) || "-"}
                />

                {/* Only show passport fields if user is NOT from India */}
                {!isIndianUser && (
                  <>
                    <DetailRow
                      label="Type of Passport"
                      value={
                        capitalizeText(
                          userData?.user?.passport?.passport_type,
                        ) || "-"
                      }
                    />
                    <DetailRow
                      label="Passport Number"
                      value={
                        capitalizeText(
                          userData?.user?.passport?.passport_number,
                        ) || "-"
                      }
                    />
                    <DetailRow
                      label="Passport Expiry Date"
                      value={
                        formatDate(userData?.user?.passport?.expiry_date) || "-"
                      }
                    />
                    <DetailRow
                      label="Passport Issuing Place"
                      value={
                        capitalizeText(
                          userData?.user?.passport?.place_of_issue,
                        ) || "-"
                      }
                    />
                  </>
                )}
                <DetailRow label="Registration ID" value={roleWithUserId} />
              </div>
            </div>

            <div className="mt-6 sm:mt-12 text-center text-gray-600 text-[10px] sm:text-xs">
              <p className="font-semibold">
                Team BRICS INDIA, Ministry of External Affairs, Government of
                India
              </p>
              <p className="mt-1 sm:mt-2">
                Sushma Swaraj Bhawan, 15-A, Rizal Marg, Chanakyapuri, New
                Delhi-110021
              </p>
              <p className="mt-6 sm:mt-8">
                This letter may kindly be submitted, along with the visa
                application, to the nearest Indian Mission/Consulate for
                appropriate consideration and necessary facilitation of visa
                issuance, in the event that your country is not covered under
                the bilateral visa exemption agreements concluded by the
                Government of India for holders of diplomatic/official/service
                passports.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 opacity-50 hidden sm:block">
              <img
                src={artImage}
                alt="art"
                className="w-32 sm:w-40 md:w-[200px] rotate-90"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row text-xs sm:text-sm">
    <span className="sm:w-48 md:w-64 text-gray-700 font-medium">{label}</span>
    <span className="hidden sm:inline mx-2 sm:mx-4">:</span>
    <span className="flex-1 text-gray-800 break-words">{value}</span>
  </div>
);

export default AccreditationPass;
