import { X, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../services/axios";
import { toast } from "react-toastify";
import AccreditationPass from "../../components/ui/AccreditationPass";
import Profile from "../profile/profile";

const ViewDelegatesDrawer = ({
  open,
  onClose,
  eventId,
  maxDelegates,
  onRefresh,
}) => {
  const [delegates, setDelegates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const fetchDelegates = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/events/${eventId}/users`);
      setDelegates(res.data);
    } catch (err) {
      toast.error("Failed to load delegates");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH EVENT USERS ================= */
  useEffect(() => {
    if (!open || !eventId) return;
    fetchDelegates();
  }, [open, eventId, onRefresh]);

  /* ================= ANIMATION HANDLING ================= */
  useEffect(() => {
    if (open) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  const invitedCount = delegates.length;
  const activeCount = delegates.filter(d => d.user?.account_status !== "blocked").length;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleDownloadPass = (delegate) => {
    setSelectedDelegate(delegate);
    handleClose(); // Close drawer with animation
    setTimeout(() => {
      setShowPass(true); // Show pass after drawer closes
    }, 300);
  };

  const handleEditDelegate = (delegate) => {
    setSelectedDelegate(delegate);
    setProfileDrawerOpen(true);
  };

  const handleEditSuccess = () => {
    // Close the profile drawer after successful update
    setProfileDrawerOpen(false);
    setSelectedDelegate(null);
    // Refresh the delegates list to show updated data
    fetchDelegates();
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      {/* Accreditation Pass Modal */}
      {showPass && selectedDelegate && (
        <AccreditationPass
          userData={{
            user: selectedDelegate?.user,
            role: selectedDelegate?.user?.role || selectedDelegate?.role,
          }}
          eventData={selectedDelegate?.event}
          onClose={() => {
            setShowPass(false);
            setSelectedDelegate(null);
          }}
        />
      )}

      {/* Profile Drawer - Same as Admin sees */}
      {profileDrawerOpen && selectedDelegate && (
        <div className="">
          <div
            className="fixed inset-0 z-[210] bg-black/40"
            onClick={() => setProfileDrawerOpen(false)}
          />
          <aside
            className="fixed right-0 top-0 z-[211] flex flex-col w-full sm:w-[90%] md:w-[700px] lg:w-[820px] bg-white shadow-xl overflow-y-auto"
            style={{ maxHeight: "100dvh" }}
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b px-6 py-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setProfileDrawerOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                  title="Back to delegates"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  Edit Delegate
                </h2>
              </div>
              <button
                onClick={() => setProfileDrawerOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </header>

            {/* Profile Form */}
            <div className="flex-1 overflow-y-auto">
              <Profile
                userId={
                  selectedDelegate?.user_id ||
                  selectedDelegate?.user?.id ||
                  selectedDelegate?.id
                }
                onProfileUpdate={handleEditSuccess}
                defaultValues={{
                  title:
                    selectedDelegate?.user?.title?.toLowerCase() ||
                    selectedDelegate?.title?.toLowerCase(),
                  firstName:
                    selectedDelegate?.user?.first_name ||
                    selectedDelegate?.first_name,
                  middleName:
                    selectedDelegate?.user?.middle_name ||
                    selectedDelegate?.middle_name,
                  surname:
                    selectedDelegate?.user?.last_name ||
                    selectedDelegate?.last_name,
                  country: (
                    selectedDelegate?.user?.country || selectedDelegate?.country
                  )?.toLowerCase(),
                  phoneNumber:
                    selectedDelegate?.user?.mobile || selectedDelegate?.mobile,
                  email:
                    selectedDelegate?.user?.email || selectedDelegate?.email,
                  position:
                    selectedDelegate?.user?.position ||
                    selectedDelegate?.position,
                  positionHeldSince: (
                    selectedDelegate?.user?.position_held_since ||
                    selectedDelegate?.position_held_since
                  )?.split("T")[0],
                  gender:
                    selectedDelegate?.user?.gender?.toLowerCase() ||
                    selectedDelegate?.gender?.toLowerCase(),
                  photoIdType:
                    selectedDelegate?.user?.document_type ||
                    selectedDelegate?.document_type,
                  photoIdNumber:
                    selectedDelegate?.user?.document_number ||
                    selectedDelegate?.document_number,
                  bloodGroup:
                    selectedDelegate?.user?.blood_group ||
                    selectedDelegate?.blood_group,
                  medicalConditions:
                    selectedDelegate?.user?.medical_conditions ||
                    selectedDelegate?.medical_conditions,
                  passportType:
                    selectedDelegate?.user?.passport?.passport_type?.toLowerCase() ||
                    selectedDelegate?.passport?.passport_type?.toLowerCase(),
                  passportNumber:
                    selectedDelegate?.user?.passport?.passport_number ||
                    selectedDelegate?.passport?.passport_number,
                  placeOfIssue:
                    selectedDelegate?.user?.passport?.place_of_issue ||
                    selectedDelegate?.passport?.place_of_issue,
                  passportExpiry: (
                    selectedDelegate?.user?.passport?.expiry_date ||
                    selectedDelegate?.passport?.expiry_date
                  )?.split("T")[0],
                  photoUrl:
                    selectedDelegate?.user?.documents?.photo_url ||
                    selectedDelegate?.documents?.photo_url,
                  passportDocumentUrl:
                    selectedDelegate?.user?.documents?.passport_document_url ||
                    selectedDelegate?.documents?.passport_document_url,
                }}
              />
            </div>
          </aside>
        </div>
      )}

      {open && (
        <>
          {/* Overlay */}
          <div
            className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${
              isAnimating ? "opacity-40" : "opacity-0"
            } ${profileDrawerOpen ? "z-[200]" : ""}`}
            onClick={!profileDrawerOpen ? handleClose : undefined}
            style={{ margin: 0, padding: 0 }}
          />

          {/* Drawer */}
          <aside
            className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
              left-0 right-0 bottom-0 rounded-t-2xl
              sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
              md:w-[600px] lg:w-[820px]
              ${
                isAnimating
                  ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
                  : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
              }
              ${profileDrawerOpen ? "z-[200]" : ""}`}
            style={{ top: "64px", maxHeight: "calc(100vh - 64px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
              <div>
                <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
                  View Delegates
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  {activeCount}/{maxDelegates} Delegates Invited
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {loading ? (
                <p className="text-center text-gray-500 py-10">
                  Loading delegates...
                </p>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-3">
                    {delegates.length === 0 && (
                      <div className="text-center py-10 text-gray-500 text-sm">
                        No delegates invited yet
                      </div>
                    )}

                    {delegates.map((d, index) => {
                      const isProfileComplete =
                        d?.profile_completion?.percentage >= 63;
                      const isDeactivated =
                        d?.user?.account_status === "blocked";

                      return (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 bg-white shadow-sm transition-all ${isDeactivated ? "opacity-60" : ""}`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <button
                                  onClick={() => handleEditDelegate(d)}
                                  className={`font-semibold text-sm hover:underline text-left ${
                                    isDeactivated
                                      ? "text-gray-500"
                                      : "text-blue-600"
                                  }`}
                                >
                                  {d.first_name} {d.last_name}
                                </button>
                                <p
                                  className={`text-xs mt-1 break-all ${
                                    isDeactivated
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {d.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                {isDeactivated && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-semibold whitespace-nowrap">
                                    Inactive
                                  </span>
                                )}
                                {!isDeactivated && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 capitalize font-semibold whitespace-nowrap">
                                    {d.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              disabled={!isProfileComplete}
                              className={`w-full mt-3 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                                isProfileComplete
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                              }`}
                              onClick={() =>
                                isProfileComplete && handleDownloadPass(d)
                              }
                            >
                              {isProfileComplete
                                ? "Download Pass"
                                : "Profile Incomplete"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Download Pass</th>
                        </tr>
                      </thead>

                      <tbody>
                        {delegates.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-6 text-center text-gray-500"
                            >
                              No delegates invited yet
                            </td>
                          </tr>
                        )}

                        {delegates.map((d, index) => {
                          const isProfileComplete =
                            d?.profile_completion?.percentage >= 63;
                          const isDeactivated =
                            d?.user?.account_status === "blocked";

                          return (
                            <tr
                              key={index}
                              className={`border-t hover:bg-gray-50 transition-all ${isDeactivated ? "opacity-60" : ""}`}
                            >
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleEditDelegate(d)}
                                  className={`font-medium hover:underline  capitalize ${
                                    isDeactivated
                                      ? "text-gray-500"
                                      : "text-blue-600"
                                  }`}
                                >
                                  {d.first_name} {d.last_name}
                                </button>
                              </td>
                              <td
                                className={`px-4 py-3 ${isDeactivated ? "text-gray-400" : ""}`}
                              >
                                {d.email}
                              </td>
                              <td className="px-4 py-3">
                                {isDeactivated && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-semibold">
                                    Inactive
                                  </span>
                                )}
                                {!isDeactivated && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 capitalize">
                                    {d.status}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  disabled={!isProfileComplete}
                                  className={`${
                                    isProfileComplete
                                      ? "text-blue-600 hover:underline cursor-pointer"
                                      : "text-gray-400 cursor-not-allowed"
                                  }`}
                                  onClick={() =>
                                    isProfileComplete && handleDownloadPass(d)
                                  }
                                  title={
                                    !isProfileComplete
                                      ? "Profile incomplete - must be 100% complete"
                                      : "Download accreditation pass"
                                  }
                                >
                                  Download
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default ViewDelegatesDrawer;
