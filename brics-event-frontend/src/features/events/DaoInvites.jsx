import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AddDaos from "../../assets/images/add_dao.svg";
import AddDaoDrawer from "../admin/components/AddDaoDrawer";
import Profile from "../profile/profile";
import AccreditationPass from "../../components/ui/AccreditationPass";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useParams } from "react-router-dom";
import {
  getEventDelegatesWithInviters,
  getSignleEventDetails,
} from "../../services/events";
import { createBulkDaosForEvent } from "../../services/auth";
import { toast } from "react-toastify";
import PageLoader from "../../components/common/PageLoader";
import InviteDelegatesDrawer from "../delegates/InviteDelegatesDrawer";
import UserStatusToggleModal from "../../components/common/UserStatusToggleModal";
import UploadDaoModal from "./UploadDaoModal";
import { MoreVertical, Search } from "lucide-react";
import api from "../../services/axios";
import { getFullImageUrl } from "../../utils/imageUtils";

const DaoInvites = () => {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDao, setEditingDao] = useState(null);
  const [expandedDaoId, setExpandedDaoId] = useState(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileAnimating, setProfileAnimating] = useState(false);
  const [selectedDao, setSelectedDao] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [passDao, setPassDao] = useState(null);
  const [inviteDelegateDrawerOpen, setInviteDelegateDrawerOpen] =
    useState(false);
  const [selectedDaoForInvite, setSelectedDaoForInvite] = useState(null);
  const [delegatesForInvite, setDelegatesForInvite] = useState([]);
  const [isInviteEditMode, setIsInviteEditMode] = useState(false);
  const [userStatusModalOpen, setUserStatusModalOpen] = useState(false);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState(null);
  const [openMenuDaoId, setOpenMenuDaoId] = useState(null);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDaoModalOpen, setUploadDaoModalOpen] = useState(false);
  const [isUploadingDaos, setIsUploadingDaos] = useState(false);
  const [parsedUsers, setParsedUsers] = useState([]);
  const [brokenImages, setBrokenImages] = useState(new Set());

  const { data: currentUser } = useCurrentUser();
  const { eventId } = useParams();

  // Debug: Log current user role
  // console.log("DaoInvites - Current User Role:", currentUser?.role?.name);
  // console.log("DaoInvites - Is Event Manager:", currentUser?.role?.name === "EVENT MANAGER");
  // console.log("DaoInvites - Full current user:", currentUser);

  // Determine if user has permission to toggle status
  // const canToggleStatus = currentUser?.role?.name === "SUPER ADMIN";

  // const canToggleStatus = currentUser?.role?.name === "SUPER ADMIN";
  const canToggleStatus =
    currentUser?.role?.name === "SUPER ADMIN" ||
    currentUser?.role?.name === "EVENT MANAGER";

  // Check if user is event manager
  const isEventManager = currentUser?.role?.name === "EVENT MANAGER";

  // Check if user is DAO
  const isDao =
    currentUser?.role?.name === "DAO" ||
    currentUser?.system_role_name === "DAO";

  // Fetch event details
  const { data: eventDetailsData } = useQuery({
    queryKey: ["event-details", eventId],
    queryFn: () => getSignleEventDetails(eventId),
    enabled: !!eventId,
  });

  const eventDetails = eventDetailsData?.data || null;

  const handleDaoUpdate = () => {
    // Invalidate and refetch the delegates and event details
    queryClient.invalidateQueries({
      queryKey: ["delegates-with-inviters", eventId],
    });
    queryClient.invalidateQueries({ queryKey: ["event-details", eventId] });
  };

  // Fetch delegates with inviters from API
  const {
    data: delegatesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["delegates-with-inviters", eventId],
    queryFn: () => getEventDelegatesWithInviters(eventId),
    enabled: !!eventId,
  });

  // Transform API response to component structure and filter for DAOs only
  const daoList = (delegatesData || []).filter(
    (item) => item.dao?.role_name === "DAO",
  );

  // Filter daoList based on search term (by name, role, or country)
  const filteredDaoList = daoList.filter((item) => {
    const dao = item.dao;
    const delegates = item.delegates || [];
    const searchLower = searchTerm.toLowerCase();

    // Check if DAO name, role, or country matches
    const daoMatches =
      dao?.name?.toLowerCase().includes(searchLower) ||
      dao?.role_name?.toLowerCase().includes(searchLower) ||
      dao?.country?.toLowerCase().includes(searchLower) ||
      dao?.user?.country?.toLowerCase().includes(searchLower);

    // Check if any delegate name, role, or country matches
    const delegateMatches = delegates.some(
      (delegate) =>
        delegate?.name?.toLowerCase().includes(searchLower) ||
        delegate?.role_name?.toLowerCase().includes(searchLower) ||
        delegate?.country?.toLowerCase().includes(searchLower) ||
        delegate?.user?.country?.toLowerCase().includes(searchLower),
    );

    return daoMatches || delegateMatches;
  });

  const toggleDao = (daoId) => {
    setExpandedDaoId((prev) => (prev === daoId ? null : daoId));
  };

  const handleCloseProfileDrawer = () => {
    setProfileAnimating(false);
    setTimeout(() => {
      setProfileDrawerOpen(false);
      setSelectedDao(null);
    }, 300);
  };

  const handleOpenProfileDrawer = (dao) => {
    setSelectedDao(dao);
    setProfileDrawerOpen(true);
    setTimeout(() => setProfileAnimating(true), 10);
  };

  const handleImageError = (imageKey) => {
    setBrokenImages((prev) => new Set(prev).add(imageKey));
  };

  // Show loader while fetching data
  if (isLoading) {
    return <PageLoader />;
  }

  // Show error message if request fails
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Failed to load delegates. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="">
      {daoList.length === 0 ? (
        /* EMPTY STATE */
        <div className="mt-10 flex flex-col items-center space-y-3">
          <img src={AddDaos} alt="Add DAO" />
          <h2 className="text-xl font-semibold">DAO not added</h2>
          <p className="text-sm text-gray-400">
            Assign a DAO to manage and coordinate this event.
          </p>

          {!isDao && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="rounded-lg bg-[#1f4788] px-8 py-3 text-sm font-medium text-white hover:bg-[#163766] transition"
            >
              Add DAO
            </button>)
            }
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold">Invitees</h2>
            {!isDao && (
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setUploadDaoModalOpen(true)}
                  className="secondary-button"
                >
                  Upload DAO
                </button>
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="rounded-lg bg-[#1f4788] px-6 sm:px-8 py-2 text-sm font-medium text-white hover:bg-[#163766] transition flex-1 sm:flex-none"
                >
                  Add DAO
                </button>
              </div>
            )}
          </div>

          {/* Search Field */}
          <div className="mb-4 relative">
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

          {filteredDaoList.map((item) => {
            const dao = item.dao;
            const delegates = item.delegates || [];
            const daoId = dao.dao_id;

            // Count only ACTIVE delegates (exclude blocked ones and exclude DAO user himself)
            const activeDelegateCount = delegates.filter(
              (d) => d.user?.account_status !== "blocked" && d.user?.id !== dao.user?.id
            ).length;

            // Use delegate_count from eventDetails for max delegates
            const maxDelegates = eventDetails?.delegate_count;

            return (
              <div
                key={daoId}
                className={`rounded-xl border border-gray-200 bg-white p-4 sm:p-6 transition-all mt-4 ${
                  dao.user?.account_status === "blocked"
                    ? "opacity-60 bg-gray-50"
                    : ""
                }`}
              >
                {/* DAO HEADER */}
                <div
                  className="flex flex-col sm:flex-row cursor-pointer items-start sm:items-center justify-between gap-3 sm:gap-0"
                  onClick={() => toggleDao(daoId)}
                >
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    {/* Avatar */}
                    {dao.user?.documents?.photo_url &&
                    !brokenImages.has(`dao-${daoId}`) ? (
                      <img
                        src={getFullImageUrl(dao.user.documents.photo_url)}
                        alt={dao.name}
                        onError={() => handleImageError(`dao-${daoId}`)}
                        className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover flex-shrink-0 ${
                          dao.user?.account_status === "blocked"
                            ? "grayscale"
                            : ""
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0 ${
                          dao.user?.account_status === "blocked"
                            ? "bg-gray-200 text-gray-500"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {dao.first_name?.charAt(0)}
                        {dao.last_name?.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`font-semibold text-sm sm:text-base underline cursor-pointer truncate capitalize ${
                            dao.user?.account_status === "blocked"
                              ? "text-gray-500 hover:text-gray-600"
                              : "text-[#1B2433] hover:text-[#1f4788]"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProfileDrawer(dao);
                          }}
                        >
                          {dao.name}
                        </p>
                        {/* Role Chip */}
                        {dao.role_name && (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-[#1f4788]">
                            {dao.role_name}
                          </span>
                        )}
                        {/* Country Chip */}
                        {(dao.user?.country || dao.country) && (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                            {dao.user?.country || dao.country}
                          </span>
                        )}
                        {/* organisation Chip */}
                        {dao?.user?.organisation && (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                            {dao.user?.organisation}
                          </span>
                        )}
                        {/* Status Badge */}
                        {dao.user?.account_status === "blocked" && (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}
                        {dao.user?.account_status !== "blocked" && (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs sm:text-sm truncate ${
                          dao.user?.account_status === "blocked"
                            ? "text-gray-400"
                            : "text-[#6F7D94]"
                        }`}
                      >
                        {dao.email}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    {/* Invite Delegate Button */}
                    <button
                      disabled={
                        dao.user?.account_status === "blocked" ||
                        activeDelegateCount >= maxDelegates
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          dao.user?.account_status !== "blocked" &&
                          activeDelegateCount < maxDelegates
                        ) {
                          setSelectedDaoForInvite(dao.dao_id);
                          setIsInviteEditMode(false);
                          setInviteDelegateDrawerOpen(true);
                        }
                      }}
                      className={`flex-1 sm:flex-initial rounded-lg bg-[#1f4788] px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white transition ${
                        dao.user?.account_status === "blocked" ||
                        activeDelegateCount >= maxDelegates
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-[#163766]"
                      }`}
                    >
                      Invite Delegate
                    </button>

                    {(() => {
                      const isProfileComplete =
                        dao.profile_completion?.percentage >= 63;
                      return (
                        <button
                          disabled={
                            !isProfileComplete ||
                            dao.user?.account_status === "blocked"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              isProfileComplete &&
                              dao.user?.account_status !== "blocked"
                            ) {
                              setPassDao({
                                user: dao.user,
                                role: { name: dao.role_name },
                                profile_completion: dao.profile_completion,
                                event: {
                                  ...item.event,
                                  user_event_id: dao.user_event_id,
                                },
                              });
                              setShowPass(true);
                            }
                          }}
                          className={`flex-1 sm:flex-initial rounded-lg border px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium transition ${
                            !isProfileComplete ||
                            dao.user?.account_status === "blocked"
                              ? "border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
                              : "border-[#1f4788] text-[#1f4788] hover:bg-blue-50 cursor-pointer"
                          }`}
                        >
                          Download Pass
                        </button>
                      );
                    })()}

                    {/* Three Dot Menu Button */}
                    {canToggleStatus && (
                      <div className="relative z-40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuDaoId(
                              openMenuDaoId === daoId ? null : daoId,
                            );
                          }}
                          className="flex items-center justify-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="More options"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuDaoId === daoId && (
                          <div className="absolute -left-52 top-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            {/* Toggle Status Option */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserForStatus({
                                  user_id: dao.user?.id || dao.id,
                                  id: dao.user?.id || dao.id,
                                  name: dao.name,
                                  email: dao.email,
                                  role: dao.role_name,
                                  status: dao.user?.account_status || "active",
                                });
                                setUserStatusModalOpen(true);
                                setOpenMenuDaoId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center gap-2 border-b border-gray-100"
                            >
                              <span>
                                {dao.user?.account_status === "blocked"
                                  ? "✓ Activate User"
                                  : "✗ Deactivate User"}
                              </span>
                            </button>

                            {/* Edit Role Option (Super Admin / Event Manager) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open drawer in edit mode with selected dao pre-filled
                                setEditingDao(dao);
                                setIsDrawerOpen(true);
                                setOpenMenuDaoId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center gap-2"
                            >
                              <span>Edit Role</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Arrow */}
                    <svg
                      className={`h-5 w-5 transform transition-transform duration-300 ${
                        expandedDaoId === daoId ? "rotate-180" : ""
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

                {/* EXPANDABLE SECTION WITH ANIMATION */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    expandedDaoId === daoId
                      ? "max-h-[500px] opacity-100 overflow-visible"
                      : "max-h-0 opacity-0 overflow-hidden"
                  }`}
                >
                  <div className="my-4 border-t border-gray-200" />

                  {delegates.length > 0 && (
                    <>
                      <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500">
                          {delegates.length} DELEGATES INVITED
                        </p>

                        <button
                          disabled={
                            dao.user?.account_status === "blocked" ||
                            !delegates.every(
                              (d) => d.profile_completion?.percentage >= 63,
                            )
                          }
                          className={`w-full sm:w-auto rounded-lg border px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium transition ${
                            dao.user?.account_status === "blocked" ||
                            !delegates.every(
                              (d) => d.profile_completion?.percentage >= 63,
                            )
                              ? "border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
                              : "border-[#1f4788] text-[#1f4788] hover:bg-blue-50 cursor-pointer"
                          }`}
                        >
                          Download All Passes
                        </button>
                      </div>

                      <div className="space-y-3 pb-2">
                        {delegates.map((delegate) => (
                          <div
                            key={delegate.user_id}
                            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
                              delegate.user?.account_status === "blocked"
                                ? "opacity-60"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              {delegate.user?.documents?.photo_url &&
                              !brokenImages.has(
                                `delegate-${delegate.user_id}`,
                              ) ? (
                                <img
                                  src={getFullImageUrl(
                                    delegate.user.documents.photo_url,
                                  )}
                                  alt={delegate.name}
                                  onError={() =>
                                    handleImageError(
                                      `delegate-${delegate.user_id}`,
                                    )
                                  }
                                  className={`h-9 w-9 rounded-full object-cover flex-shrink-0 ${
                                    delegate.user?.account_status === "blocked"
                                      ? "grayscale"
                                      : ""
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 ${
                                    delegate.user?.account_status === "blocked"
                                      ? "bg-gray-200 text-gray-500"
                                      : "bg-orange-100 text-orange-600"
                                  }`}
                                >
                                  {delegate.name?.charAt(0)}
                                  {delegate.name?.split(" ")[1]?.charAt(0)}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenProfileDrawer(delegate);
                                    }}
                                    className={`text-xs sm:text-sm font-medium underline cursor-pointer truncate capitalize ${
                                      delegate.user?.account_status ===
                                      "blocked"
                                        ? "text-gray-500 hover:text-gray-600"
                                        : "text-gray-900 hover:text-[#1f4788]"
                                    }`}
                                  >
                                    {delegate.name}
                                  </p>
                                  {/* Role Chip */}
                                  {delegate.role_name && (
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-[#1f4788]">
                                      {delegate.role_name}
                                    </span>
                                  )}
                                  {/* Country Chip */}
                                  {(delegate.user?.country ||
                                    delegate.country) && (
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                                      {delegate.user?.country ||
                                        delegate.country}
                                    </span>
                                  )}

                                  {/* organisation Chip */}
                                  {dao?.user?.organisation && (
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                                      {dao.user?.organisation}
                                    </span>
                                  )}

                                  {/* Status Badge */}
                                  {delegate.user?.account_status ===
                                    "blocked" && (
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-700">
                                      Inactive
                                    </span>
                                  )}
                                  {delegate.user?.account_status !==
                                    "blocked" && (
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-700">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-xs sm:text-sm truncate ${
                                    delegate.user?.account_status === "blocked"
                                      ? "text-gray-400"
                                      : "text-[#6F7D94]"
                                  }`}
                                >
                                  {delegate.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                              <button
                                onClick={() => {
                                  if (
                                    delegate.profile_completion?.percentage >=
                                      63 &&
                                    dao.user?.account_status !== "blocked" &&
                                    delegate.user?.account_status !== "blocked"
                                  ) {
                                    setPassDao({
                                      user: delegate.user,
                                      role: { name: delegate.role_name },
                                      profile_completion:
                                        delegate.profile_completion,
                                      event: {
                                        ...item.event,
                                        user_event_id: delegate.user_event_id,
                                      },
                                    });
                                    setShowPass(true);
                                  }
                                }}
                                className={`flex-1 sm:flex-initial rounded-lg border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition ${
                                  delegate.profile_completion?.percentage >=
                                    63 &&
                                  dao.user?.account_status !== "blocked" &&
                                  delegate.user?.account_status !== "blocked"
                                    ? "border-[#1f4788] text-[#1f4788] hover:bg-blue-50 cursor-pointer"
                                    : "border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
                                }`}
                                disabled={
                                  delegate.profile_completion?.percentage <
                                    63 ||
                                  dao.user?.account_status === "blocked" ||
                                  delegate.user?.account_status === "blocked"
                                }
                              >
                                Download Pass
                              </button>

                              {/* Three Dot Menu Button for Delegate */}
                              {canToggleStatus && (
                                <div className="relative z-40">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const menuKey = `delegate-${delegate.user_id}`;
                                      setOpenMenuKey(
                                        openMenuKey === menuKey
                                          ? null
                                          : menuKey,
                                      );
                                    }}
                                    className="flex items-center justify-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    title="More options"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {/* Dropdown Menu */}
                                  {openMenuKey ===
                                    `delegate-${delegate.user_id}` && (
                                    <div className="absolute -left-52 top-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedUserForStatus({
                                            user_id:
                                              delegate.user_id ||
                                              delegate.user?.id ||
                                              delegate.id,
                                            id:
                                              delegate.user_id ||
                                              delegate.user?.id ||
                                              delegate.id,
                                            name: delegate.name,
                                            email: delegate.email,
                                            role: delegate.role_name,
                                            status:
                                              delegate.user?.account_status ||
                                              "active",
                                          });
                                          setUserStatusModalOpen(true);
                                          setOpenMenuKey(null);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center gap-2"
                                      >
                                        <span>
                                          {delegate.user?.account_status ===
                                          "blocked"
                                            ? "✓ Activate User"
                                            : "✗ Deactivate User"}
                                        </span>
                                      </button>

                                      {/* Edit Role Option */}
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const userId =
                                            delegate.user_id ||
                                            delegate.user?.id ||
                                            delegate.id;

                                          // Helper to open invite drawer with given prefill
                                          const openInviteDrawerWith = (prefill) => {
                                            setDelegatesForInvite([prefill]);
                                            setSelectedDaoForInvite(dao.dao_id);
                                            setIsInviteEditMode(true);
                                            setInviteDelegateDrawerOpen(true);
                                            setOpenMenuKey(null);
                                          };

                                          if (!userId) {
                                            // No user id — fallback to delegate data
                                            const prefill = {
                                              firstName: delegate.name?.split(" ")[0] || "",
                                              middleName: "",
                                              lastName: delegate.name?.split(" ")[1] || "",
                                              email: delegate.email || "",
                                              inviteAs: delegate.role_name || "",
                                              status: "draft",
                                              userId: delegate.user_id || delegate.user?.id || delegate.id || null,
                                            };
                                            openInviteDrawerWith(prefill);
                                            return;
                                          }

                                          try {
                                            const res = await api.get(
                                              `/api/auth/users/${userId}`,
                                            );
                                            const user = res?.data || res;

                                            // Map to InviteDelegatesDrawer form shape
                                            const prefill = {
                                              firstName:
                                                user.first_name || delegate.name?.split(" ")[0] || "",
                                              middleName: user.middle_name || "",
                                              lastName: user.last_name || delegate.name?.split(" ")[1] || "",
                                              email: user.email || delegate.email || "",
                                              inviteAs:
                                                delegate.role_name || user.role?.name || "",
                                              status: "draft",
                                              userId: user.id || userId,
                                            };

                                            openInviteDrawerWith(prefill);
                                          } catch (err) {
                                            console.error("Failed to fetch user for edit", err);
                                            // Fallback: open drawer with delegate data so user can still edit
                                            const fallbackPrefill = {
                                              firstName: delegate.name?.split(" ")[0] || "",
                                              middleName: "",
                                              lastName: delegate.name?.split(" ")[1] || "",
                                              email: delegate.email || "",
                                              inviteAs: delegate.role_name || "",
                                              status: "draft",
                                              userId: delegate.user_id || delegate.user?.id || delegate.id || null,
                                            };
                                            openInviteDrawerWith(fallbackPrefill);
                                          }
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center gap-2"
                                      >
                                        <span>Edit Role</span>
                                      </button>

                                      {/* Edit Profile Option */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Open profile drawer for delegate
                                          handleOpenProfileDrawer(delegate);
                                          setOpenMenuKey(null);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center gap-2"
                                      >
                                        <span>Edit Profile</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      <AddDaoDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingDao(null);
        }}
        eventId={eventId}
        onSuccess={() => {
          handleDaoUpdate();
          setEditingDao(null);
        }}
        initialDaos={editingDao ? [editingDao] : null}
        editMode={!!editingDao}
      />

      {/* DAO Profile Drawer */}
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
                DAO Profile
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
              <Profile
                userId={
                  selectedDao?.user_id ||
                  selectedDao?.user?.id ||
                  selectedDao?.id
                }
                onProfileUpdate={handleCloseProfileDrawer}
                defaultValues={{
                  title:
                    selectedDao?.user?.title?.toLowerCase() ||
                    selectedDao?.title?.toLowerCase(),
                  firstName:
                    selectedDao?.user?.first_name || selectedDao?.first_name,
                  middleName:
                    selectedDao?.user?.middle_name || selectedDao?.middle_name,
                  surname:
                    selectedDao?.user?.last_name || selectedDao?.last_name,
                  country: (
                    selectedDao?.user?.country || selectedDao?.country
                  )?.toLowerCase(),
                  phoneNumber: selectedDao?.user?.mobile || selectedDao?.mobile,
                  email: selectedDao?.user?.email || selectedDao?.email,
                  designation:
                    selectedDao?.user?.position || selectedDao?.position,
                  customDesignation:
                    selectedDao?.user?.custom_designation || selectedDao?.custom_designation || "",
                  ministryName:
                    selectedDao?.user?.ministry_name || selectedDao?.ministry_name || "",
                  positionHeldSince: (
                    selectedDao?.user?.position_held_since ||
                    selectedDao?.position_held_since
                  )?.split("T")[0],
                  gender:
                    selectedDao?.user?.gender?.toLowerCase() ||
                    selectedDao?.gender?.toLowerCase(),
                  photoIdType:
                    selectedDao?.user?.document_type ||
                    selectedDao?.document_type,
                  photoIdNumber:
                    selectedDao?.user?.document_number ||
                    selectedDao?.document_number,
                  bloodGroup:
                    selectedDao?.user?.blood_group || selectedDao?.blood_group,
                  medicalConditions:
                    selectedDao?.user?.medical_conditions ||
                    selectedDao?.medical_conditions,
                  passportType:
                    selectedDao?.user?.passport?.passport_type?.toLowerCase() ||
                    selectedDao?.passport?.passport_type?.toLowerCase(),
                  passportNumber:
                    selectedDao?.user?.passport?.passport_number ||
                    selectedDao?.passport?.passport_number,
                  placeOfIssue:
                    selectedDao?.user?.passport?.place_of_issue ||
                    selectedDao?.passport?.place_of_issue,
                  passportExpiry: (
                    selectedDao?.user?.passport?.expiry_date ||
                    selectedDao?.passport?.expiry_date
                  )?.split("T")[0],
                  photoUrl:
                    selectedDao?.user?.documents?.photo_url ||
                    selectedDao?.documents?.photo_url,
                  passportDocumentUrl:
                    selectedDao?.user?.documents?.passport_document_url ||
                    selectedDao?.documents?.passport_document_url,
                }}
              />
            </div>
          </aside>
        </>
      )}

      {/* Accreditation Pass Modal */}
      {showPass && passDao && (
        <AccreditationPass
          userData={passDao}
          eventData={passDao?.event}
          onClose={() => {
            setShowPass(false);
            setPassDao(null);
          }}
        />
      )}

      {/* Invite Delegates Drawer */}
      <InviteDelegatesDrawer
        open={inviteDelegateDrawerOpen}
        editMode={isInviteEditMode}
        onClose={() => {
          setInviteDelegateDrawerOpen(false);
          setSelectedDaoForInvite(null);
          setDelegatesForInvite([]);
          setIsInviteEditMode(false);
        }}
        delegates={delegatesForInvite}
        setDelegates={setDelegatesForInvite}
        maxDelegates={eventDetails?.max_delegates || 50}
        eventId={eventId}
        delegateCount={daoList.reduce(
          (acc, item) =>
            acc +
            (item.delegates?.filter((d) => d.user?.account_status !== "blocked")
              .length || 0),
          0,
        )}
        daoId={isDao ? null : selectedDaoForInvite}
        onSuccess={handleDaoUpdate}
      />

      {/* User Status Toggle Modal */}
      <UserStatusToggleModal
        open={userStatusModalOpen}
        onClose={() => {
          setUserStatusModalOpen(false);
          setSelectedUserForStatus(null);
        }}
        user={selectedUserForStatus}
        onSuccess={handleDaoUpdate}
      />

      {/* Upload DAO Modal */}
      <UploadDaoModal
        isOpen={uploadDaoModalOpen}
        onClose={() => setUploadDaoModalOpen(false)}
        users={parsedUsers}
        onImport={async (daos) => {
          setIsUploadingDaos(true);
          try {
            const payload = { daos };
            const response = await createBulkDaosForEvent(eventId, payload);
            toast.success(`Successfully imported ${daos.length} DAO(s)`);
            handleDaoUpdate();
            setUploadDaoModalOpen(false);
          } catch (error) {
            console.error("Error importing DAOs:", error);
            toast.error(
              error?.response?.data?.message || "Failed to import DAOs",
            );
          } finally {
            setIsUploadingDaos(false);
          }
        }}
        isLoading={isUploadingDaos}
        eventName={eventDetails?.event_name || "Event"}
      />
    </div>
  );
};

export default DaoInvites;
