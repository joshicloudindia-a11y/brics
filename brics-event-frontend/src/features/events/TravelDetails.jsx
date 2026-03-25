import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AddTravel from "../../assets/images/add_travel.svg";
import { Pencil, Search } from "lucide-react";
import {
  getEventTravelDetails,
  getEventDelegatesWithInviters,
} from "../../services/events";
import { toast } from "react-toastify";
import PageLoader from "../../components/common/PageLoader";
import TravelDetailsDrawer from "../travel/TravelDetailsDrawer";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getFullImageUrl } from "../../utils/imageUtils";

const TravelDetails = () => {
  const { eventId } = useParams();
  const [expandedId, setExpandedId] = useState(null);
  const [travelDetails, setTravelDetails] = useState([]);
  const [pendingTravels, setPendingTravels] = useState([]);
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
      fetchTravelDetails();
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, currentUser]);

  const fetchTravelDetails = async () => {
    try {
      setLoading(true);
      const [response, delegatesResp] = await Promise.all([
        getEventTravelDetails(eventId),
        getEventDelegatesWithInviters(eventId),
      ]);
      if (response) {
        setEvent(response.event);

        // Map travel_details_added to component format
        // build a map of delegate user id -> dao organisation from delegates-with-inviters
        const delegateOrgMap = {};
        (delegatesResp || []).forEach((entry) => {
          const daoOrg =
            entry?.dao?.user?.organisation || entry?.dao?.organisation || null;
          (entry.delegates || []).forEach((d) => {
            const key = d.user_id || d.id || d.registration_id || d._id || null;
            if (key) delegateOrgMap[key] = daoOrg;
          });
        });

        const addedDetails =
          response.travel_details_added?.map((item) => {
            // console.log("Mapping travel item:", item);
            const org =
              item.dao?.organisation ||
              item.dao?.user?.organisation ||
              item.inviter?.dao?.organisation ||
              item.user?.organisation ||
              item.organisation ||
              delegateOrgMap[item.user_id] ||
              null;

            if (item.role === "DAO" && !org) {
              // console.debug("DAO missing organisation in travel item:", item);
            }
            // console.log("Mapping travel item:", org);

            return {
              id: item.user_event_id,
              name:
                item.name ||
                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                "N/A",
              email: item.email || "N/A",
              avatar: getFullImageUrl(
                item.user?.profile_picture ||
                  item.user?.documents?.photo_url ||
                  null,
              ),
              user_id: item.user_id,
              registration_id: item.registration_id,
              role: item.role,
              country: item.country || item.user?.country,
              organisation: org,
              organisation_name: item.organization_name || item.user?.organization_name || item.user?.organization_name || null,
              status: item.status,
              details: item.travel_details
                ? {
                    travel_id: item.travel_details.id,
                    for_whom: item.travel_details.for_whom,
                    flight: item.travel_details.arrival?.flight_number
                      ? `${item.travel_details.arrival.flight_number} | ${item.travel_details.arrival.from || ""} → ${item.travel_details.arrival.to || ""}`
                      : "Not provided",
                    departure: item.travel_details.departure?.date
                      ? `${new Date(item.travel_details.departure.date).toLocaleDateString("en-GB")} at ${item.travel_details.departure.time || "N/A"}`
                      : "Not provided",
                    arrival: item.travel_details.arrival?.date
                      ? `${new Date(item.travel_details.arrival.date).toLocaleDateString("en-GB")} at ${item.travel_details.arrival.time || "N/A"}`
                      : "Not provided",
                    hotel: item.travel_details.hotel?.name || "Not provided",
                    added_at: item.travel_details.added_at,
                    raw: item.travel_details, // Keep full travel details for future use
                  }
                : null,
            };
          }) || [];

        // Map pending_travel_details to component format
        const pendingDetails =
          response.pending_travel_details?.map((item) => {
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
                "DAO missing organisation in pending travel item:",
                item,
              );
            }

            return {
              id: item.user_event_id,
              name:
                item.name ||
                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                "N/A",
              email: item.email || "N/A",
              avatar: getFullImageUrl(
                item.user?.profile_picture ||
                  item.user?.documents?.photo_url ||
                  null,
              ),
              user_id: item.user_id,
              registration_id: item.registration_id,
              role: item.role,
              country: item.country || item.user?.country,
              organisation: org,
              organisation_name: item.organization_name || item.user?.organization_name || item.user?.organization_name || null,
              status: item.status,
            };
          }) || [];

        setTravelDetails(addedDetails);
        setPendingTravels(pendingDetails);
      }
    } catch (error) {
      // Error logging removed
      toast.error("Failed to load travel details");
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

  // Filter travel details and pending travels
  let filteredTravelDetails = [];
  let filteredPendingTravels = [];
  const searchLower = searchTerm.toLowerCase();

  if (
    currentUser &&
    (currentUser.role?.name === "DAO" ||
      currentUser.system_role_name === "DAO") &&
    allowedUserIds.length > 0
  ) {
    // DAO users: show only their delegates and themselves
    filteredTravelDetails = travelDetails.filter((user) =>
      allowedUserIds.includes(user.user_id),
    );
    filteredPendingTravels = pendingTravels.filter((user) =>
      allowedUserIds.includes(user.user_id),
    );

    // Ensure DAO user sees themselves if not in either list
    const currentUserId =
      currentUser?.user?.id || currentUser?.id || currentUser?._id;
    const currentUserEmail = currentUser?.user?.email || currentUser?.email;

    const daoInLists =
      filteredTravelDetails.some(
        (u) => u.user_id === currentUserId || u.email === currentUserEmail,
      ) ||
      filteredPendingTravels.some(
        (u) => u.user_id === currentUserId || u.email === currentUserEmail,
      );

    if (!daoInLists) {
      filteredPendingTravels.push({
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
    filteredTravelDetails = [];
    filteredPendingTravels = [
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
    filteredTravelDetails = travelDetails;
    filteredPendingTravels = pendingTravels;
  } else {
    // Non-privileged users: show only their own travel details
    const currentUserId =
      currentUser?.user?.id || currentUser?.id || currentUser?._id;
    const currentUserEmail = currentUser?.user?.email || currentUser?.email;

    // Match by user_id or email
    filteredTravelDetails = travelDetails.filter(
      (user) =>
        user.user_id === currentUserId || user.email === currentUserEmail,
    );
    filteredPendingTravels = pendingTravels.filter(
      (user) =>
        user.user_id === currentUserId || user.email === currentUserEmail,
    );

    // If user is not in either list, add them to pending list
    if (
      currentUser &&
      filteredTravelDetails.length === 0 &&
      filteredPendingTravels.length === 0
    ) {
      filteredPendingTravels = [
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
  filteredTravelDetails = filteredTravelDetails.filter((user) => {
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.country?.toLowerCase().includes(searchLower) ||
      user.organisation?.toLowerCase().includes(searchLower) ||
      user.organisation_name?.toLowerCase().includes(searchLower)
    );
  });

  filteredPendingTravels = filteredPendingTravels.filter((user) => {
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.country?.toLowerCase().includes(searchLower) ||
      user.organisation?.toLowerCase().includes(searchLower) ||
      user.organisation_name?.toLowerCase().includes(searchLower)
    );
  });

  const isEmpty =
    filteredTravelDetails.length === 0 && filteredPendingTravels.length === 0;

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

  const handleAddTravelDetails = (user = null) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
  };

  const handleTravelSaved = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    fetchTravelDetails(); // Refresh data
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

  // Transform API travel data to drawer format
  const transformTravelDataForDrawer = (user) => {
    if (!user?.details?.raw) return null;
    const raw = user.details.raw;
    return {
      eventId: eventId,
      arrival: {
        country: raw.arrival?.country_from || "",
        flightNumber: raw.arrival?.flight_number || "",
        portOfEntry: raw.arrival?.port_of_entry || "",
        arrivalDate: formatDateForInput(raw.arrival?.arrival_date) || "",
        ticketFile: null, // Can't pre-fill file input
        existingTicketUrl: raw.arrival?.ticket_url || null, // Store existing ticket URL
        hasConnectingFlight:
          raw.arrival?.has_connecting_flight === true ||
          raw.arrival?.has_connecting_flight === "true" ||
          false,
        connectingFlightNumber:
          raw.arrival?.connecting_flight?.flight_number || "",
        connectingPortOfEntry: raw.arrival?.connecting_flight?.port || "",
        connectingArrivalDate:
          formatDateForInput(raw.arrival?.connecting_flight?.date) || "",
      },
      departure: {
        flightNumber: raw.departure?.flight_number || "",
        portOfExit: raw.departure?.port_of_exit || "",
        departureDate: formatDateForInput(raw.departure?.departure_date) || "",
        ticketFile: null, // Can't pre-fill file input
        existingTicketUrl: raw.departure?.ticket_url || null, // Store existing ticket URL
      },
    };
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="sm:px-0">
      {isEmpty ? (
        /* EMPTY STATE */
        <div className="mt-10 flex flex-col items-center space-y-3 px-4">
          <img
            src={AddTravel}
            alt="Add Travel Details"
            className="w-48 sm:w-auto"
          />
          <h2 className="text-lg sm:text-xl font-semibold text-center">
            No travel details added
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 text-center max-w-md">
            Add arrival and departure information for event participants.
          </p>

          <button
            onClick={() => {
              if (!isPrivilegedRole && currentUser) {
                // For non-privileged users, create a user object for themselves
                const currentUserId =
                  currentUser?.user?.id || currentUser?.id || currentUser?._id;
                const currentUserEmail =
                  currentUser?.user?.email || currentUser?.email;
                const selfUser = {
                  user_id: currentUserId,
                  name:
                    currentUser.user?.name ||
                    currentUser.name ||
                    `${currentUser.user?.first_name || currentUser.first_name || ""} ${currentUser.user?.last_name || currentUser.last_name || ""}`.trim(),
                  email: currentUserEmail,
                  role: currentUser.role?.name,
                  country: currentUser.user?.country || currentUser.country,
                };
                handleAddTravelDetails(selfUser);
              } else {
                handleAddTravelDetails();
              }
            }}
            className="rounded-lg bg-[#1f4788] px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#163766] transition"
          >
            Add Travel Details
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-lg sm:text-xl font-semibold px-1">
            Travel Details Added ({filteredTravelDetails.length})
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
              placeholder="Search by name, role, or country..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4788] focus:border-transparent"
            />
          </div>

          {/* ================= Added Travel Details ================= */}
          {filteredTravelDetails.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              {filteredTravelDetails.map((user) => {
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
                            {(user.organisation || user.organisation_name) && (
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
                                handleAddTravelDetails(user);
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
                                handleAddTravelDetails(user);
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
                          {/* ARRIVAL DETAILS */}
                          <div>
                            <h4 className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-[#1f4788] bg-[#DBEEFE] w-fit px-2 py-1 rounded">
                              Arrival Details
                            </h4>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Country:</span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.arrival?.country_from ||
                                    "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  Flight No:
                                </span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.arrival?.flight_number ||
                                    "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  Port of Entry:
                                </span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.arrival?.port_of_entry ||
                                    "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  Arrival Date:
                                </span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.arrival?.arrival_date
                                    ? new Date(
                                        user.details.raw.arrival.arrival_date,
                                      ).toLocaleDateString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "N/A"}
                                </span>
                              </div>
                              {user.details.raw?.arrival?.ticket_url && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Ticket:</span>
                                  <a
                                    href={user.details.raw.arrival.ticket_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-[#1f4788] hover:underline "
                                  >
                                    View
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* CONNECTING FLIGHT DETAILS */}
                          {user.details.raw?.arrival?.has_connecting_flight && (
                            <div className="border-t border-gray-200 pt-4">
                              <h4 className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-[#1f4788] bg-[#E0F2FE] w-fit px-2 py-1 rounded">
                                Connecting Flight Details
                              </h4>
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">
                                    Flight No:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {user.details.raw?.arrival
                                      ?.connecting_flight?.flight_number ||
                                      "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">
                                    Port of Entry:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {user.details.raw?.arrival
                                      ?.connecting_flight?.port || "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">
                                    Arrival Date:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {user.details.raw?.arrival
                                      ?.connecting_flight?.date
                                      ? new Date(
                                          user.details.raw.arrival
                                            .connecting_flight.date,
                                        ).toLocaleDateString("en-GB", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* DEPARTURE DETAILS */}
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-[#1f4788] bg-[#DBEEFE] w-fit px-2 py-1 rounded">
                              Departure Details
                            </h4>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  Port of Exit:
                                </span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.departure?.port_of_exit ||
                                    "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  Flight No:
                                </span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.departure?.flight_number ||
                                    "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  Departure Date:
                                </span>
                                <span className="font-medium text-gray-900">
                                  {user.details.raw?.departure?.departure_date
                                    ? new Date(
                                        user.details.raw.departure
                                          .departure_date,
                                      ).toLocaleDateString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "N/A"}
                                </span>
                              </div>
                              {user.details.raw?.departure?.ticket_url && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Ticket:</span>
                                  <a
                                    href={user.details.raw.departure.ticket_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-[#1f4788] hover:underline"
                                  >
                                    View
                                  </a>
                                </div>
                              )}
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

          {/* ================= Pending Travel Details ================= */}
          {filteredPendingTravels.length > 0 && (
            <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-8">
              <h2 className="text-lg sm:text-xl font-semibold px-1">
                Pending Travel Details ({filteredPendingTravels.length})
              </h2>

              {filteredPendingTravels.map((user) => (
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
                          {(user.organisation || user.organisation_name) && (
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
                      onClick={() => handleAddTravelDetails(user)}
                      className="w-full sm:w-auto rounded-md bg-[#1f4788] px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#163766] transition flex-shrink-0"
                    >
                      Add Travel Details
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Travel Details Drawer */}
      <TravelDetailsDrawer
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
        onSuccess={handleTravelSaved}
        initialTravel={transformTravelDataForDrawer(selectedUser)}
        targetUser={selectedUser}
      />
    </div>
  );
};

export default TravelDetails;
