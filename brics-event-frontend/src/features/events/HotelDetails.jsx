import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import AddHotel from "../../assets/images/add_travel.svg"; // Reusing travel image or create new one
import { Pencil, Search } from "lucide-react";
import {
  getEventHotelDetails,
  getEventDelegatesWithInviters,
} from "../../services/events";

import { toast } from "react-toastify";
import PageLoader from "../../components/common/PageLoader";
import HotelDetailsDrawer from "../hotel/HotelDetailsDrawer";
import { getFullImageUrl } from "../../utils/imageUtils";

const HotelDetails = () => {
  const { eventId } = useParams();
  const [expandedId, setExpandedId] = useState(null);
  const [hotelDetails, setHotelDetails] = useState([]);
  const [pendingHotels, setPendingHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: currentUser } = useCurrentUser();
  const [allowedUserIds, setAllowedUserIds] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!eventId) return;
      // DAO filtering
      if (
        currentUser &&
        (currentUser.role?.name === "DAO" ||
          currentUser.system_role_name === "DAO")
      ) {
        const delegatesData = await getEventDelegatesWithInviters(eventId);
        let ids = [];
        if (Array.isArray(delegatesData)) {
          const currentUserId =
            currentUser?.user?.id || currentUser?.id || currentUser?._id;
          const daoBlock = delegatesData.find(
            (block) =>
              block.dao?.dao_id === currentUserId ||
              block.dao?.user_id === currentUserId ||
              block.dao?.user?.id === currentUserId,
          );
          if (daoBlock) {
            ids = [
              daoBlock.dao?.dao_id,
              daoBlock.dao?.user_id,
              daoBlock.dao?.user?.id,
              ...(daoBlock.delegates?.map((d) => d.user_id) || []),
            ].filter(Boolean);
          }
        }
        setAllowedUserIds(Array.from(new Set(ids)));
      }
      fetchHotelDetails();
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, currentUser]);

  const fetchHotelDetails = async () => {
    try {
      setLoading(true);
      const [response, delegatesResp] = await Promise.all([
        getEventHotelDetails(eventId),
        getEventDelegatesWithInviters(eventId),
      ]);

      if (response) {
        setEvent(response.event);

        // build delegate -> dao organisation map
        const delegateOrgMap = {};
        (delegatesResp || []).forEach((entry) => {
          const daoOrg =
            entry?.dao?.user?.organisation || entry?.dao?.organisation || null;
          (entry.delegates || []).forEach((d) => {
            const key = d.user_id || d.id || d.registration_id || d._id || null;
            if (key) delegateOrgMap[key] = daoOrg;
          });
        });

        // Map hotel_details_added to component format
        const addedDetails =
          response.hotel_details_added?.map((item) => {
            const org =
              item.dao?.organisation ||
              item.dao?.user?.organisation ||
              item.inviter?.dao?.organisation ||
              item.user?.organisation ||
              item.organisation ||
              delegateOrgMap[item.user_id] ||
              null;

            if (item.role === "DAO" && !org) {
              console.debug("DAO missing organisation in hotel item:", item);
            }

            return {
              id: item.user_event_id || item.id,
              name:
                item.name ||
                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                "N/A",
              email: item.email || "N/A",
              avatar: getFullImageUrl(
                item.profile_picture ||
                  item.user?.profile_picture ||
                  item.user?.documents?.photo_url ||
                  item.documents?.photo_url,
              ),
              user_id: item.user_id,
              registration_id: item.registration_id,
              role: item.role,
              country: item.country || item.user?.country,
              organisation: org,
              organisation_name: item.organisation_name || item.user?.organisation_name || item.user?.organisationName || null,
              status: item.status,
              details: item.hotel_details
                ? {
                    accommodation_id: item.hotel_details.id,
                    stay_start_date: item.hotel_details.stay_start_date,
                    stay_end_date: item.hotel_details.stay_end_date,
                    city: item.hotel_details.city,
                    state: item.hotel_details.state,
                    hotel_id: item.hotel_details.hotel_id,
                    hotel_name: item.hotel_details.hotel?.name || "N/A",
                    hotel_info: item.hotel_details.hotel,
                    added_at: item.hotel_details.added_at,
                    raw: item.hotel_details,
                  }
                : null,
            };
          }) || [];

        //  item.dao?.organisation || item.dao?.user?.organisation ||
        //       item.inviter?.dao?.organisation || item.user?.organisation ||
        //       item.user?.organisation_name || item.user?.organisationName ||
        //       item.organisation || delegateOrgMap[item.user_id] ||

        // Map pending_hotel_details to component format
        const pendingDetails =
          response.pending_hotel_details?.map((item) => {
            const org =
              item.dao?.organisation ||
              item.dao?.user?.organisation ||
              item.inviter?.dao?.organisation ||
              item.user?.organisation ||
              item.organisation ||
              delegateOrgMap[item.user_id] ||
              null;

            if (item.role === "DAO" && !org) {
              console.debug(
                "DAO missing organisation in pending hotel item:",
                item,
              );
            }

            return {
              id: item.user_event_id || item.id,
              name:
                item.name ||
                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                "N/A",
              email: item.email || "N/A",
              avatar: getFullImageUrl(
                item.profile_picture ||
                  item.user?.profile_picture ||
                  item.user?.documents?.photo_url ||
                  item.documents?.photo_url,
              ),
              user_id: item.user_id,
              registration_id: item.registration_id,
              role: item.role,
              country: item.country || item.user?.country,
              organisation: org,
              organisation_name: item.organisation_name || item.user?.organisation_name || item.user?.organisationName || null,
              status: item.status,
            };
          }) || [];

        setHotelDetails(addedDetails);
        setPendingHotels(pendingDetails);
      }
    } catch (error) {
      toast.error("Failed to load hotel accommodation details");
    } finally {
      setLoading(false);
    }
  };

  // Check if user has privileged role
  const isPrivilegedRole =
    currentUser &&
    (currentUser.role?.name === "SUPER ADMIN" ||
      currentUser.role?.name === "EVENT MANAGER" ||
      currentUser.role?.name === "DAO" ||
      currentUser.system_role_name === "DAO");

  // Filter hotel details and pending hotels
  let filteredHotelDetails = [];
  let filteredPendingHotels = [];
  const searchLower = searchTerm.toLowerCase();

  if (
    currentUser &&
    (currentUser.role?.name === "DAO" ||
      currentUser.system_role_name === "DAO") &&
    allowedUserIds.length > 0
  ) {
    // DAO users: show only their delegates and themselves
    filteredHotelDetails = hotelDetails.filter((user) =>
      allowedUserIds.includes(user.user_id),
    );
    filteredPendingHotels = pendingHotels.filter((user) =>
      allowedUserIds.includes(user.user_id),
    );

    // Ensure DAO user sees themselves if not in either list
    const currentUserId =
      currentUser?.user?.id || currentUser?.id || currentUser?._id;
    const currentUserEmail = currentUser?.user?.email || currentUser?.email;

    const daoInLists =
      filteredHotelDetails.some(
        (u) => u.user_id === currentUserId || u.email === currentUserEmail,
      ) ||
      filteredPendingHotels.some(
        (u) => u.user_id === currentUserId || u.email === currentUserEmail,
      );

    if (!daoInLists) {
      filteredPendingHotels.push({
        id: currentUserId,
        name:
          currentUser.user?.name ||
          currentUser.name ||
          `${currentUser.user?.first_name || currentUser.first_name || ""} ${currentUser.user?.last_name || currentUser.last_name || ""}`.trim() ||
          currentUserEmail ||
          "N/A",
        email: currentUserEmail || "N/A",
        avatar:
          currentUser.user?.profile_picture ||
          currentUser.profile_picture ||
          currentUser.user?.documents?.photo_url ||
          currentUser.documents?.photo_url ||
          null,
        user_id: currentUserId,
        role: currentUser.role?.name || "DAO",
        country: currentUser.user?.country || currentUser.country || "N/A",
        status: currentUser.user?.status || currentUser.status || "invited",
      });
    }
  } else if (
    currentUser &&
    (currentUser.role?.name === "DAO" || currentUser.system_role_name === "DAO")
  ) {
    // If DAO but no delegates yet, show the DAO user in pending
    const currentUserId =
      currentUser?.user?.id || currentUser?.id || currentUser?._id;
    const currentUserEmail = currentUser?.user?.email || currentUser?.email;
    filteredHotelDetails = [];
    filteredPendingHotels = [
      {
        id: currentUserId,
        name:
          currentUser.user?.name ||
          currentUser.name ||
          `${currentUser.user?.first_name || currentUser.first_name || ""} ${currentUser.user?.last_name || currentUser.last_name || ""}`.trim() ||
          currentUserEmail ||
          "N/A",
        email: currentUserEmail || "N/A",
        avatar:
          currentUser.user?.profile_picture ||
          currentUser.profile_picture ||
          currentUser.user?.documents?.photo_url ||
          currentUser.documents?.photo_url ||
          null,
        user_id: currentUserId,
        role: currentUser.role?.name || "DAO",
        country: currentUser.user?.country || currentUser.country || "N/A",
        status: currentUser.user?.status || currentUser.status || "invited",
      },
    ];
  } else if (isPrivilegedRole) {
    // Privileged roles: show all
    filteredHotelDetails = hotelDetails;
    filteredPendingHotels = pendingHotels;
  } else {
    // Non-privileged users: show only their own hotel details
    const currentUserId =
      currentUser?.user?.id || currentUser?.id || currentUser?._id;
    const currentUserEmail = currentUser?.user?.email || currentUser?.email;

    // Match by user_id or email
    filteredHotelDetails = hotelDetails.filter(
      (user) =>
        user.user_id === currentUserId || user.email === currentUserEmail,
    );
    filteredPendingHotels = pendingHotels.filter(
      (user) =>
        user.user_id === currentUserId || user.email === currentUserEmail,
    );

    // If user is not in either list, add them to pending list
    if (
      currentUser &&
      filteredHotelDetails.length === 0 &&
      filteredPendingHotels.length === 0
    ) {
      filteredPendingHotels = [
        {
          id: currentUserId,
          name:
            currentUser.user?.name ||
            currentUser.name ||
            `${currentUser.user?.first_name || currentUser.first_name || ""} ${currentUser.user?.last_name || currentUser.last_name || ""}`.trim() ||
            currentUserEmail ||
            "N/A",
          email: currentUserEmail || "N/A",
          avatar:
            currentUser.user?.profile_picture ||
            currentUser.profile_picture ||
            currentUser.user?.documents?.photo_url ||
            currentUser.documents?.photo_url ||
            null,
          user_id: currentUserId,
          role: currentUser.role?.name || "N/A",
          country: currentUser.user?.country || currentUser.country || "N/A",
          status: currentUser.user?.status || currentUser.status || "invited",
        },
      ];
    }
  }

  // Apply search filter
  filteredHotelDetails = filteredHotelDetails.filter((user) => {
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.country?.toLowerCase().includes(searchLower) ||
      user.organisation?.toLowerCase().includes(searchLower) ||
      user.organisation_name?.toLowerCase().includes(searchLower) ||
      user.details?.city?.toLowerCase().includes(searchLower) ||
      user.details?.state?.toLowerCase().includes(searchLower) ||
      user.details?.hotel_name?.toLowerCase().includes(searchLower)
    );
  });

  filteredPendingHotels = filteredPendingHotels.filter((user) => {
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.country?.toLowerCase().includes(searchLower) ||
      user.organisation?.toLowerCase().includes(searchLower) ||
      user.organisation_name?.toLowerCase().includes(searchLower)
    );
  });

  const getInitials = (name) => {
    if (!name) return "NA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAddHotelDetails = (user = null) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
  };

  const handleHotelSaved = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    fetchHotelDetails(); // Refresh data
    toast.success("Hotel accommodation details saved successfully");
  };

  // Format date to YYYY-MM-DD format for HTML date input
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  // Transform API hotel data to drawer format
  const transformHotelDataForDrawer = (user) => {
    if (!user?.details?.raw) {
      return null;
    }
    const raw = user.details.raw;

    // Extract hotelId - try multiple possible fields
    const hotelId = raw.hotel_id || raw.hotel?._id || raw.hotel?.id || "";

    // Extract for_whom and convert to participantType
    const forWhom = (raw.for_whom || "MYSELF").toUpperCase();
    const participantType = forWhom === "DELEGATE" ? "delegate" : "myself";

    // If it was added for delegate, get the delegate user info
    const delegateId = raw.user_id || user.user_id;
    const delegate =
      forWhom === "DELEGATE"
        ? {
            _id: user.user_id,
            id: user.user_id,
            first_name: user.name?.split(" ")[0] || "",
            last_name: user.name?.split(" ").slice(1).join(" ") || "",
            email: user.email,
            user: {
              first_name: user.name?.split(" ")[0] || "",
              last_name: user.name?.split(" ").slice(1).join(" ") || "",
              email: user.email,
            },
          }
        : null;

    const transformed = {
      id: raw.id,
      eventId: eventId,
      stayStartDate: formatDateForInput(raw.stay_start_date) || "",
      stayEndDate: formatDateForInput(raw.stay_end_date) || "",
      city: raw.city || "",
      state: raw.state || "",
      hotelId: hotelId,
      for_whom: forWhom,
      participantType: participantType,
      hotel_type: raw?.hotel_type || "master_list",
      hotelName: raw?.hotel?.name || raw?.hotel_name || "",
      delegateId: delegateId,
      delegate: delegate,
    };
    return transformed;
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="sm:px-0">
      {hotelDetails.length === 0 && pendingHotels.length === 0 ? (
        /* EMPTY STATE */
        <div className="flex flex-col items-center space-y-3 px-4">
          <img
            src={AddHotel}
            alt="Add Hotel Accommodation"
            className="w-48 sm:w-auto"
          />
          <h2 className="text-lg sm:text-xl font-semibold text-center">
            No hotel accommodation added
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 text-center max-w-md">
            Add hotel accommodation details for event participants including
            stay dates and hotel information.
          </p>

          <button
            onClick={() => handleAddHotelDetails()}
            className="rounded-lg bg-[#1f4788] px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#163766] transition"
          >
            Add Hotel Accommodation
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-lg sm:text-xl font-semibold px-1">
            Hotel Accommodation Added ({filteredHotelDetails.length})
          </h2>

          {/* Search Field */}
          <div className="mb-4 mt-4 relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, role, city, hotel..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4788] focus:border-transparent"
            />
          </div>

          {/* ================= Added Hotel Details ================= */}
          {filteredHotelDetails.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              {filteredHotelDetails.map((user) => {
                const isOpen = expandedId === user.id;

                return (
                  <div
                    key={user.id}
                    className="group rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
                  >
                    {/* Header */}
                    <div
                      className="flex cursor-pointer items-start sm:items-center justify-between gap-3"
                      onClick={() => toggleExpand(user.id)}
                    >
                      <div className="flex items-start justify-start gap-3 sm:gap-4 flex-1 min-w-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 flex-shrink-0">
                            {getInitials(user.name)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm capitalize truncate">
                              {user.name}
                            </p>
                            {/* Role Chip */}
                            {user.role && (
                              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-[#1f4788]">
                                {user.role}
                              </span>
                            )}
                            {/* Country Chip */}
                            {user.country && (
                              <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                                {user.country}
                              </span>
                            )}
                            {/* Organisation Chip */}
                            {user.organisation && (
                              <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                                {user.organisation}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {(isPrivilegedRole ||
                          user.user_id ===
                            (currentUser?.user?.id ||
                              currentUser?.id ||
                              currentUser?._id) ||
                          user.email ===
                            (currentUser?.user?.email ||
                              currentUser?.email)) && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddHotelDetails(user);
                              }}
                              className="
                            hidden sm:group-hover:flex items-center gap-1
                            rounded-lg border border-[#1f4788] px-3 sm:px-4 py-1.5 sm:py-2
                            text-xs sm:text-sm font-medium text-[#1f4788]
                            hover:bg-blue-50 transition
                          "
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </button>

                            {/* Mobile Edit Button - Always Visible */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddHotelDetails(user);
                              }}
                              className="
                            sm:hidden flex items-center justify-center
                            rounded-lg border border-[#1f4788] p-1.5
                            text-[#1f4788]
                            hover:bg-blue-50 transition
                          "
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}

                        <svg
                          className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 flex-shrink-0 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen
                          ? "max-h-[800px] opacity-100 mt-4 sm:mt-6"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      {user.details && (
                        <div className="space-y-4">
                          {/* HOTEL ACCOMMODATION DETAILS */}
                          <div>
                            <h4 className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-[#1f4788] bg-[#DBEEFE] w-fit px-2 py-1 rounded">
                              Hotel Accommodation Details
                            </h4>
                            <div className="space-y-5 text-xs sm:text-sm">
                              {/* 🔵 Block 1 — Hotel Name */}
                              <div className="flex flex-col gap-1">
                                <span className="text-gray-500">Hotel:</span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.hotel_name ||
                                    user.details.hotel_name ||
                                    "N/A"}
                                </span>
                              </div>

                              {/* 🔵 Block 2 — Stay Dates */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-gray-500">
                                    Stay Start Date:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {user.details.stay_start_date
                                      ? new Date(
                                          user.details.stay_start_date,
                                        ).toLocaleDateString("en-GB", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "N/A"}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="text-gray-500">
                                    Stay End Date:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {user.details.stay_end_date
                                      ? new Date(
                                          user.details.stay_end_date,
                                        ).toLocaleDateString("en-GB", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "N/A"}
                                  </span>
                                </div>
                              </div>

                              {/* 🔵 Block 3 — Other Details */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-gray-500">City:</span>
                                  <span className="font-medium text-gray-900">
                                    {user.details.city || "N/A"}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="text-gray-500">State:</span>
                                  <span className="font-medium text-gray-900">
                                    {user.details.state || "N/A"}
                                  </span>
                                </div>

                                {user.details.hotel_info?.address && (
                                  <div className="flex flex-col gap-1 sm:col-span-2">
                                    <span className="text-gray-500">
                                      Address:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {user.details.hotel_info.address}
                                    </span>
                                  </div>
                                )}

                                {user.details.hotel_info?.contact && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-gray-500">
                                      Contact:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {user.details.hotel_info.contact}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= Pending Hotel Details ================= */}
          {filteredPendingHotels.length > 0 && (
            <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-8">
              <h2 className="text-lg sm:text-xl font-semibold px-1">
                Pending Hotel Accommodation ({filteredPendingHotels.length})
              </h2>

              {filteredPendingHotels.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600 flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm capitalize truncate">
                            {user.name}
                          </p>
                          {/* Role Chip */}
                          {user.role && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-[#1f4788]">
                              {user.role}
                            </span>
                          )}
                          {/* Country Chip */}
                          {user.country && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                              {user.country}
                            </span>
                          )}

                          {/* Organisation Chip */}
                          {user.organisation && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                               {user?.organisation_name ? user.organisation_name : user.organisation}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(isPrivilegedRole ||
                    user.user_id ===
                      (currentUser?.user?.id ||
                        currentUser?.id ||
                        currentUser?._id) ||
                    user.email ===
                      (currentUser?.user?.email || currentUser?.email)) && (
                    <button
                      onClick={() => handleAddHotelDetails(user)}
                      className="w-full sm:w-auto rounded-md bg-[#1f4788] px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#163766] transition flex-shrink-0"
                    >
                      Add Hotel Details
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Hotel Details Drawer */}
      <HotelDetailsDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        initialEvent={
          event
            ? {
                ...event,
                _id: event.id || event._id,
                id: event.id || event._id,
              }
            : null
        }
        onSuccess={handleHotelSaved}
        initialHotel={transformHotelDataForDrawer(selectedUser)}
        targetUser={selectedUser}
      />
    </div>
  );
};

export default HotelDetails;
