import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Video,
  ChevronDown,
  Download,
  Pencil,
} from "lucide-react";
import EventDetailsTabs from "./tabs/EventDetailsTabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  getSignleEventDetails,
  getEventDelegatesWithInviters,
  getEventTravelDetails,
  getEventHotelDetails,
  attendEventList,
  attendEvent,
  downloadEventReport
} from "../../services/events";
import eventBanner from "../../assets/images/event-banner.svg";
import CreateEventDrawer from "../admin/components/CreateEventDrawer";
// import { downloadEventReport } from "../../utils/exportEventReport";
import AccreditationPass from "../../components/ui/AccreditationPass";
import Profile from "../profile/profile";
import RoleSelectionModal from "../../components/common/RoleSelectionModal";
import { toast } from "react-toastify";
import { getMeetingLabel } from "../../utils/getMeetingLabel";

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [expandedManagers, setExpandedManagers] = useState({});
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileAnimating, setProfileAnimating] = useState(false);
  const [selectedDao, setSelectedDao] = useState(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [attending, setAttending] = useState(false);

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Get current user role
  const { data: currentUserData } = useCurrentUser();
  const userRole = currentUserData?.role?.name;
  const normalizedRole = (userRole ?? "").toLowerCase().trim();
  const isAdminOrManager =
    normalizedRole === "super admin" || normalizedRole === "event manager";
  const isDao = normalizedRole === "dao";
  const currentUserId = currentUserData?.id;

  // Check if we should open edit drawer from navigation state
  useEffect(() => {
    if (location.state?.openEditDrawer && isAdminOrManager) {
      setIsEditDrawerOpen(true);
      // Clear the state to prevent reopening on subsequent navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isAdminOrManager, navigate, location.pathname]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["event-details", eventId],
    queryFn: () => getSignleEventDetails(eventId),
    enabled: !!eventId,
  });

  // Fetch DAO-specific event data with delegate counts
  const { data: daoEventListData } = useQuery({
    queryKey: ["attend-events"],
    queryFn: () => attendEventList(),
    enabled: isDao && !!eventId,
  });

  // Fetch delegates with inviters
  const { data: delegatesData } = useQuery({
    queryKey: ["delegates-with-inviters", eventId],
    queryFn: () => getEventDelegatesWithInviters(eventId),
    enabled: !!eventId,
  });

  // Fetch travel details
  const { data: travelData } = useQuery({
    queryKey: ["travel-details", eventId],
    queryFn: () => getEventTravelDetails(eventId),
    enabled: !!eventId,
  });

  // Fetch hotel details
  const { data: hotelData } = useQuery({
    queryKey: ["hotel-details", eventId],
    queryFn: () => getEventHotelDetails(eventId),
    enabled: !!eventId,
  });
  const event = data?.data || null;

  // Get DAO-specific event data with correct delegate counts
  const daoEventList = daoEventListData?.data || daoEventListData || [];
  const daoSpecificEvent =
    isDao && Array.isArray(daoEventList)
      ? daoEventList.find(
          (e) => String(e._id || e.event_id) === String(eventId),
        )
      : null;

  // Use DAO-specific delegate counts if available, otherwise use generic event data
  const delegateCount =
    daoSpecificEvent?.total_delegates ?? event?.total_delegates ?? 0;
  const maxDelegates =
    daoSpecificEvent?.delegate_count ?? event?.delegate_count ?? 0;

  // Check if DAO user has completed self-accreditation
  const isUserSelfAccredited = isDao
    ? daoSpecificEvent?.is_user_delegate === true
    : true;

  /* ================= LOADING & ERROR STATES ================= */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading event details...</div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">Failed to load event details</div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const toggleManager = (managerId) => {
    setExpandedManagers((prev) => ({
      ...prev,
      [managerId]: !prev[managerId],
    }));
  };

  const handleCloseProfileDrawer = () => {
    setProfileAnimating(false);
    setTimeout(() => {
      setProfileDrawerOpen(false);
      setSelectedDao(null);
    }, 300);
  };

  const handleOpenProfileDrawer = (userProfile) => {
    setSelectedDao(userProfile);
    setProfileDrawerOpen(true);
    setTimeout(() => setProfileAnimating(true), 10);
  };

  const handleEventUpdate = () => {
    // Invalidate and refetch the event details
    queryClient.invalidateQueries({ queryKey: ["event-details", eventId] });
  };

  const handleAttendConfirm = async (role) => {
    try {
      setAttending(true);

      const res = await attendEvent({
        event_id: eventId,
        role: role,
      });

      toast.success(
        res?.data?.message ||
          res?.message ||
          `Successfully registered as ${role}`,
      );

      setRoleModalOpen(false);

      // Refetch the attend-events query to update is_user_delegate status
      queryClient.invalidateQueries({ queryKey: ["attend-events"] });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to register for event",
      );
    } finally {
      setAttending(false);
    }
  };
 
  // const handleDownloadReport = async () => {
  //   try {
  //     setIsDownloadingReport(true);

  //     // Combine travel details from both added and pending arrays
  //     const allTravelDetails = [
  //       ...(travelData?.travel_details_added || []),
  //       ...(travelData?.pending_travel_details || []),
  //     ];

  //     /* ===== HOTEL (IMPORTANT FIX) ===== */
  //     const allHotelDetails = [
  //       ...(hotelData?.hotel_details_added || []),
  //       ...(hotelData?.pending_hotel_details || []),
  //     ];
  //     // Prepare data structure for Excel generation
  //     const reportData = {
  //       name: event?.name,
  //       category: event?.category,
  //       type: event?.type,
  //       start_date: event?.start_date,
  //       start_time: event?.start_time,
  //       end_date: event?.end_date,
  //       end_time: event?.end_time,
  //       location: event?.location,
  //       venue: event?.venue,
  //       description: event?.description,
  //       status: event?.status,
  //       eventManagers: [],
  //       daos: [],
  //       delegates: [],
  //       travelDetails: allTravelDetails,
  //       hotelDetails: allHotelDetails,
  //     };

  //     // Process delegates data to categorize into managers, DAOs, and regular delegates
  //     if (delegatesData && Array.isArray(delegatesData)) {
  //       delegatesData.forEach((item) => {
  //         if (item.dao) {
  //           const daoInfo = {
  //             ...item.dao,
  //             user: item.dao.user,
  //             status: item.dao.status,
  //             delegates: item.delegates || [],
  //             delegatesCount: (item.delegates || []).length,
  //           };

  //           if (item.dao.role_name === "EVENT MANAGER") {
  //             reportData.eventManagers.push(daoInfo);
  //           } else if (item.dao.role_name === "DAO") {
  //             reportData.daos.push(daoInfo);
  //           }
  //         }

  //         // Add all delegates to delegates list
  //         if (item.delegates && Array.isArray(item.delegates)) {
  //           item.delegates.forEach((delegate) => {
  //             reportData.delegates.push({
  //               ...delegate,
  //               inviterName: item.dao?.user?.full_name,
  //               inviterId: item.dao?.dao_id,
  //             });
  //           });
  //         }
  //       });
  //     }

  //     // Download the report
  //     downloadEventReport(reportData, event?.name);
  //   } catch (error) {
  //     console.error("Error downloading report:", error);
  //     alert("Failed to download report. Please try again.");
  //   } finally {
  //     setIsDownloadingReport(false);
  //   }
  // };


   const handleDownloadReport = async (type = "default") => {
    setIsDownloadingReport(true);
    try {
      const response = await downloadEventReport(eventId, type);

      // Check for error blob (e.g., JSON error)
      const contentType = response.headers["content-type"];
      if (
        !contentType ||
        !contentType.includes(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
      ) {
        // Try to parse error message
        const text = await response.data.text();
        toast.error("Failed to download report: " + text);
        setIsDownloadingReport(false);
        return;
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // 🔥 Auto detect filename from backend
    const contentDisposition = response.headers["content-disposition"];
    let fileName = "event-report.xlsx";

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match?.[1]) {
        fileName = match[1];
      }
    }

    link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Download failed: " + (error?.message || "Unknown error"));
    } finally {
      setIsDownloadingReport(false);
    }
  };


  /* ================= FORMAT DATE ================= */
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return timeString ? `${dateStr} · ${timeString}` : dateStr;
  };

  const formatEventDateRange = (startDate, startTime, endDate, endTime) => {
    const start = formatDateTime(startDate, startTime);
    const end = formatDateTime(endDate, endTime);
    return `${start} - ${end}`;
  };

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen py-4 lg:py-8 lg:px-0">
      <div className="max-w-7xl mx-auto">
        {/* Header Section (sticky glass) */}
        <div className=" z-40 backdrop-blur-sm bg-white/60 border border-white/20 shadow-sm rounded-xl py-3 px-4 flex items-center justify-between mb-4 lg:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium text-sm lg:text-base">
              Back to Event
            </span>
          </button>
          {isAdminOrManager && (
            <div className="flex items-center gap-2">
              {/* <button
                onClick={handleDownloadReport}
                disabled={isDownloadingReport}
                className="secondary-button flex items-center text-xs lg:text-sm px-3 py-2 lg:px-6 lg:py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download event report"
              >
                <Download size={14} className="lg:w-4 lg:h-4" />
                <span className="ml-2">
                  {isDownloadingReport ? "Downloading..." : "Download Report"}
                </span>
              </button> */}
              <div className="relative">
  <button
    onClick={() => setShowDownloadMenu((prev) => !prev)}
    disabled={isDownloadingReport}
    className="secondary-button flex items-center text-xs lg:text-sm px-3 py-2 lg:px-6 lg:py-3 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Download size={14} />
    <span className="ml-2">
      {isDownloadingReport ? "Downloading..." : "Download Report"}
    </span>
    <ChevronDown size={14} className="ml-2" />
  </button>

  {showDownloadMenu && (
    <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">
      <button
        onClick={() => {
          setShowDownloadMenu(false);
          handleDownloadReport("default");
        }}
        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
      >
        Full Report
      </button>

      <button
        onClick={() => {
          setShowDownloadMenu(false);
          handleDownloadReport("travel");
        }}
        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
      >
        Travel Report
      </button>

      <button
        onClick={() => {
          setShowDownloadMenu(false);
          handleDownloadReport("hotel");
        }}
        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
      >
        Hotel Report
      </button>

      <button
        onClick={() => {
          setShowDownloadMenu(false);
          handleDownloadReport("emc");
        }}
        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
      >
        EMC Reference Sheet
      </button>
    </div>
  )}
</div>
              <button
                onClick={() => setIsEditDrawerOpen(true)}
                className="secondary-button flex items-center text-xs lg:text-sm px-3 py-2 lg:px-6 lg:py-3"
              >
                <Pencil size={14} className="lg:w-4 lg:h-4" />{" "}
                <span className="ml-2">Edit Event</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Card */}
        <div className="rounded-xl overflow-hidden">
          <div className="">
            {/* TOP ROW: Image + Details Box */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 lg:gap-16">
              {/* LEFT: Event Banner */}
              <div className="w-full lg:max-w-[60%] rounded-2xl overflow-hidden">
                <div className="relative bg-white rounded-lg overflow-hidden">
                  {event.image ? (
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-full h-full object-cover aspect-[16/9]"
                    />
                  ) : (
                    <img
                      src={eventBanner}
                      alt={event.name}
                      className="w-full h-full object-cover aspect-[16/9]"
                    />
                  )}
                </div>
              </div>

              {/* RIGHT: Event Details Section */}
              <div className="w-full lg:max-w-[40%]">
                {/* Event Details Box */}
                <div className="bg-white rounded-[14px] p-4 lg:p-6">
                  {/* Event Title & Badge */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-[#1E40AF] text-xs font-medium rounded-full">
                        {event.category || "Business"}
                      </span>
                    </div>
                    <h1 className="text-lg lg:text-xl font-bold text-gray-900 capitalize">
                      {event.name}
                    </h1>
                  </div>

                  {/* Event Meta Info */}
                  <div className="space-y-3 pb-4 border-gray-200">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="flex-shrink-0">
                        <Calendar size={18} className="text-black" />
                      </div>
                      <div>
                        <div className="text-xs lg:text-sm font-medium text-[#6F7D94]">
                          {formatEventDateRange(
                            event.start_date,
                            event.start_time,
                            event.end_date,
                            event.end_time,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="flex-shrink-0">
                        <Video size={18} className="text-black" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="text-xs lg:text-sm font-medium text-[#6F7D94]">
                          {event.type || "Virtual"}
                        </div>
                        {(() => {
                          const meetingRaw =
                            event?.meeting_url || event?.meetingUrl;
                          if (!meetingRaw) return null;
                          const meetingHref = meetingRaw.startsWith("http")
                            ? meetingRaw
                            : `https://${meetingRaw}`;
                          const label = getMeetingLabel(meetingHref);

                          return (
                            <div className="text-xs lg:text-sm  border-[2px] rounded-lg px-2 py-1 text-[var(--text-primary)] border-[var(--text-primary)] hover:bg-[#dbeafe]">
                              <a
                                href={meetingHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[var(--text-primary)] "
                              >
                                {label}
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="flex-shrink-0">
                        <MapPin size={18} className="text-black" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#6F7D94]">
                          {event.location ||
                            "Dr. Ambedkar International Centre, New Delhi"}
                          , {event.venue || "India"}
                        </div>
                      </div>
                    </div>

                    {(isDao || isAdminOrManager) && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <div className="flex-shrink-0">
                          <Users size={18} className="text-black" />
                        </div>
                        <div>
                          {isDao ? (
                            <>
                              <span className="text-xs lg:text-sm font-medium text-[#6F7D94]">
                                {delegateCount}/{maxDelegates}
                              </span>
                              <span className="text-xs font-medium text-[#6F7D94]">
                                {" "}
                                Delegates Invited
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs lg:text-sm font-medium text-[#6F7D94]">
                                {event.total_dao_count}
                              </span>
                              <span className="text-xs font-medium text-[#6F7D94]">
                                {" "}
                                DAO Invited
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Info Section - For all non-admin/manager users */}
                  {!isAdminOrManager && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {/* User Info Card with Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 rounded-lg">
                        {/* Left: User Info */}
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                          {/* User Avatar */}
                          <div className="flex-shrink-0">
                            {currentUserData?.user?.documents?.photo_url ||
                            currentUserData?.user?.profile_picture ? (
                              <img
                                src={
                                  currentUserData?.user?.documents?.photo_url ||
                                  currentUserData?.user?.profile_picture
                                }
                                alt={currentUserData?.user?.name}
                                className="w-14 h-14 rounded-full object-cover  "
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-[#E8F0FA] flex items-center justify-center  ">
                                <span className="text-[#003366] font-bold text-lg">
                                  {(
                                    currentUserData?.user?.name ||
                                    currentUserData?.user?.first_name ||
                                    "U"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* User Details */}
                          <div className="flex-grow min-w-0">
                            <div
                              className="text-base font-semibold text-gray-900 cursor-pointer hover:text-[#003366] transition-colors underline"
                              onClick={() =>
                                handleOpenProfileDrawer(currentUserData)
                              }
                            >
                              {currentUserData?.user?.name ||
                                `${currentUserData?.user?.first_name || ""} ${currentUserData?.user?.last_name || ""}`.trim() ||
                                "User"}
                            </div>
                            <div className="text-xs text-gray-600">
                              {currentUserData?.user?.email}
                            </div>
                            {isDao &&
                            (daoSpecificEvent?.assigned_by ||
                              daoSpecificEvent?.inviter) ? (
                              <div className="text-xs text-gray-500 mt-0.5">
                                Assigned by{" "}
                                <span className="font-medium">
                                  {daoSpecificEvent?.assigned_by ||
                                    daoSpecificEvent?.inviter}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Right: Button - Self Accreditation or Download Pass */}
                        {!isAdminOrManager && (
                          <>
                            {isUserSelfAccredited ? (
                              <button
                                onClick={() => setShowPass(true)}
                                className="w-full sm:w-auto flex-shrink-0  sm:px-4 py-2 border-2 border-[#003366] text-[#003366] rounded-lg hover:bg-[#003366] hover:text-white transition-colors font-semibold text-sm whitespace-nowrap"
                                title="Download your event accreditation pass"
                              >
                                Download My Pass
                              </button>
                            ) : (
                              <button
                                onClick={() => setRoleModalOpen(true)}
                                className="w-full sm:w-auto flex-shrink-0  sm:px-4 py-1.5 border-2 border-[#003366] text-white bg-[#003366] rounded-lg hover:bg-[#002244] transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
                                title="Complete self-accreditation to access event features and download your pass"
                              >
                                DAO Self Accreditation
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Section - Only visible for Super Admin and Event Manager */}
                {isAdminOrManager && (
                  <div className="bg-white rounded-[14px] p-4 mt-4 lg:mt-6">
                    <div className="grid grid-cols-3 gap-3 h-full">
                      <div className="text-start flex flex-col justify-center">
                        <div className="text-[10px] lg:text-xs text-gray-500 mb-1">
                          Total Registrations
                        </div>
                        <div className="text-xl lg:text-2xl font-bold text-gray-900">
                          {event.total_registrations || 0}
                        </div>
                      </div>

                      <div className="text-start flex flex-col justify-center">
                        <div className="text-[10px] lg:text-xs text-gray-500 mb-1">
                          Total Speakers
                        </div>
                        <div className="text-xl lg:text-2xl font-bold text-gray-900">
                          {event.invited_count || 0}
                        </div>
                      </div>

                      <div className="text-start flex flex-col justify-center">
                        <div className="text-[10px] lg:text-xs text-gray-500 mb-1">
                          Total DAOs
                        </div>
                        <div className="text-xl lg:text-2xl font-bold text-gray-900">
                          {event.total_dao_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <EventDetailsTabs />
      </div>

      {isAdminOrManager && (
        <CreateEventDrawer
          open={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          eventData={event}
          onSuccess={handleEventUpdate}
        />
      )}

      {showPass && (
        <AccreditationPass
          userData={currentUserData}
          eventData={{
            ...event,
            user_event_id: isDao
              ? daoSpecificEvent?.user_event_id
              : event?._id || event?.id,
          }}
          onClose={() => setShowPass(false)}
        />
      )}

      {/* Profile Drawer */}
      {profileDrawerOpen && (
        <>
          {/* Overlay */}
          <div
            className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[210] transition-opacity duration-300 ${
              profileAnimating ? "opacity-40" : "opacity-0"
            }`}
            onClick={handleCloseProfileDrawer}
            style={{ margin: 0, padding: 0 }}
          />

          {/* Drawer - Bottom sheet on mobile, side drawer on desktop */}
          <aside
            className={`fixed z-[211] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out overflow-hidden
              left-0 right-0 bottom-0 rounded-t-2xl
              sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
              md:w-[600px] lg:w-[740px]
              ${
                profileAnimating
                  ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
                  : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
              }`}
            style={{ top: "64px", maxHeight: "calc(100vh - 64px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b px-4 sm:px-6 py-3 sm:py-4 bg-white flex-shrink-0">
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
                User Profile
              </h2>
              <button
                onClick={handleCloseProfileDrawer}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md -mr-1"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </header>

            {/* Profile Form */}
            <div className="flex-1 overflow-y-auto">
              {selectedDao && (
                <Profile
                  firstName={
                    selectedDao?.user?.first_name || selectedDao?.first_name
                  }
                  lastName={
                    selectedDao?.user?.last_name || selectedDao?.last_name
                  }
                  middleName={
                    selectedDao?.user?.middle_name || selectedDao?.middle_name
                  }
                  email={selectedDao?.user?.email || selectedDao?.email}
                  mobile={selectedDao?.user?.mobile || selectedDao?.mobile}
                  country={selectedDao?.user?.country || selectedDao?.country}
                  dateOfBirth={
                    (
                      selectedDao?.user?.date_of_birth ||
                      selectedDao?.date_of_birth
                    )?.split("T")[0]
                  }
                  gender={
                    selectedDao?.user?.gender?.toLowerCase() ||
                    selectedDao?.gender?.toLowerCase()
                  }
                  photoIdType={
                    selectedDao?.user?.document_type ||
                    selectedDao?.document_type
                  }
                  photoIdNumber={
                    selectedDao?.user?.document_number ||
                    selectedDao?.document_number
                  }
                  bloodGroup={
                    selectedDao?.user?.blood_group || selectedDao?.blood_group
                  }
                  medicalConditions={
                    selectedDao?.user?.medical_conditions ||
                    selectedDao?.medical_conditions
                  }
                  passportType={
                    selectedDao?.user?.passport?.passport_type?.toLowerCase() ||
                    selectedDao?.passport?.passport_type?.toLowerCase()
                  }
                  passportNumber={
                    selectedDao?.user?.passport?.passport_number ||
                    selectedDao?.passport?.passport_number
                  }
                  placeOfIssue={
                    selectedDao?.user?.passport?.place_of_issue ||
                    selectedDao?.passport?.place_of_issue
                  }
                  passportExpiry={
                    (
                      selectedDao?.user?.passport?.expiry_date ||
                      selectedDao?.passport?.expiry_date
                    )?.split("T")[0]
                  }
                  photoUrl={
                    selectedDao?.user?.documents?.photo_url ||
                    selectedDao?.documents?.photo_url
                  }
                  passportDocumentUrl={
                    selectedDao?.user?.documents?.passport_document_url ||
                    selectedDao?.documents?.passport_document_url
                  }
                />
              )}
            </div>
          </aside>
        </>
      )}

      {/* ROLE SELECTION MODAL FOR SELF-ACCREDITATION */}
      <RoleSelectionModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onConfirm={handleAttendConfirm}
        loading={attending}
      />
    </div>
  );
};

export default EventDetails;
