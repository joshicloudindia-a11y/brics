import React, { useState } from "react";
import { Calendar, MapPin, Users, MoreVertical, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import eventImg from "../../../assets/images/event-banner.svg";
import { formatDateWithOrdinal } from "../../../utils/formatDateWithOrdinal";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { getMeetingLabel } from "../../../utils/getMeetingLabel";

const EventListView = ({
  event,
  openAddDao,
  openAddManager,
  openAddDelegate,
  openEditDrawer,
  getEventEndDateTime,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const { data } = useCurrentUser();
  const isEventManager = data?.role?.name === "EVENT MANAGER";
  const isSuperAdmin = data?.role?.name === "SUPER ADMIN";
  const isAdminOrEventManager = isSuperAdmin || isEventManager;
  // For non-admin roles (DAO, Media, etc.) - show delegate-focused view
  const isNonAdminRole = !isAdminOrEventManager;

  const endDateTime = getEventEndDateTime(event);
  const isPastEvent = endDateTime && endDateTime < new Date();
  const isDraftEvent = event?.status === "draft";
  const canAddDaoOrManager = !isPastEvent && !isDraftEvent;
  const invitedDelegates =
    event?.total_delegates ?? event?.delegate_invite_count ?? 0;
  const delegateLimit = event?.delegate_count || 0;
  const delegateLimitReached =
    Boolean(delegateLimit) && invitedDelegates >= delegateLimit;

  return (
    <div className="rounded-xl md:rounded-xl shadow-sm border hover:shadow-md transition bg-white overflow-hidden">
      {/* Mobile & Desktop Layout */}
      <div className="flex flex-col md:flex-row md:p-4 md:gap-4">
        {/* IMAGE */}
        <div className="w-full h-[200px] md:w-[240px] md:h-[160px] md:rounded-xl flex-shrink-0 overflow-hidden relative">
          <img
            src={event?.logo || eventImg}
            alt={event.name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => navigate(isNonAdminRole ? `/events/${event._id}` : `/admin/events/${event._id}`)}
          />

          {/* Three-dot menu - positioned absolute on mobile, shown in actions on desktop */}
          <div className="md:hidden absolute top-4 right-4">
            <button
              onClick={() => !isDraftEvent && setShowMenu((p) => !p)}
              disabled={isDraftEvent}
              title={isDraftEvent ? "Publish event first to access menu options" : ""}
              className={`p-2 rounded-full shadow-md ${
                isDraftEvent
                  ? "bg-gray-200 cursor-not-allowed opacity-50"
                  : "bg-white hover:bg-gray-100 cursor-pointer"
              }`}
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && !isDraftEvent && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />

                <div className="absolute right-0 top-full mt-2 w-40 bg-white border rounded-lg shadow-md z-50 p-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate(isNonAdminRole ? `/events/${event._id}` : `/admin/events/${event._id}`);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-lg"
                  >
                    {isNonAdminRole ? "View Event" : "View Details"}
                  </button>
                  {!isNonAdminRole && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openEditDrawer && openEditDrawer(event);
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-lg"
                    >
                      Edit Event
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* CONTENT WRAPPER */}
        <div className="flex-1 flex flex-col">
          {/* INFO */}
          <div className="flex-1 space-y-2 p-4 md:p-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 capitalize font-medium">
                {event?.category}
              </span>

              {/* Draft Badge */}
              {event?.status === "draft" && (
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 capitalize font-medium">
                  Draft
                </span>
              )}

              {isPastEvent && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Event Ended
                </span>
              )}
            </div>

            <h3 className="font-semibold text-[#0F172A] text-xl md:text-lg capitalize">
              {event.name}
            </h3>

            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  {formatDateWithOrdinal(event.start_date)}{" "}
                  <span className="mx-1">·</span>{" "}
                  {formatDateWithOrdinal(event.end_date)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  {event?.event_type || "Virtual"}
                </span>
              {(() => {
                const meetingRaw = event?.meeting_url || event?.meetingUrl;
                if (!meetingRaw) return null;
                const meetingHref = meetingRaw.startsWith("http") ? meetingRaw : `https://${meetingRaw}`;
                const label = getMeetingLabel(meetingHref);

                return (
                  <div className="text-sm text-[var(--text-primary)]  ">
                    <a
                      href={meetingHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--text-primary)] underline font-semibold"
                    >
                      {label}
                    </a>
                  </div>
                );
              })()}
              </div>

              <div className="relative group flex items-start gap-2">
                <MapPin className="w-5 h-5 md:w-4 md:h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                {(() => {
                  const combinedLocation = `${event.location || ""}${event?.venue ? `, ${event.venue}` : ""}`;
                  const isLong = combinedLocation.length > 40;

                  return isLong ? (
                    <>
                      <span className="block truncate cursor-pointer text-sm text-gray-700">
                        {combinedLocation.slice(0, 40)}...
                      </span>
                      <div className="absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 scale-105 hidden group-hover:scale-100 group-hover:block transition-all duration-200 w-full rounded-md bg-white px-3 py-2 text-base text-gray-700 shadow-lg whitespace-pre-wrap">
                        {combinedLocation}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-700">
                      {combinedLocation || "-"}
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-medium">
                  {isNonAdminRole
                    ? `${invitedDelegates}${delegateLimit ? ` / ${delegateLimit}` : ""} Delegates Invited`
                    : `${event?.dao_invite_count || 0} DAO Invited`}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIONS - Mobile at bottom, Desktop on right */}
          <div className="md:hidden">
            {/* Draft Message - Mobile */}
            {isDraftEvent && !isNonAdminRole && (
              <div className="flex items-center justify-between gap-2 px-4 pb-3 bg-yellow-50 border-b border-yellow-200">
                <p className="text-xs text-yellow-800">
                  📝 Publish to add DAO/Manager
                </p>
                <button
                  onClick={() => openEditDrawer && openEditDrawer(event)}
                  className="px-2 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium whitespace-nowrap"
                >
                  Publish
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-3 px-4 pb-4">
            {isNonAdminRole ? (
              <button
                onClick={() => !isPastEvent && openAddDelegate && openAddDelegate(event)}
                disabled={isPastEvent || delegateLimitReached}
                className={`flex-1 px-4 py-3 text-sm border-2 rounded-lg transition-colors font-medium ${
                  isPastEvent || delegateLimitReached
                    ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                    : "border-[#003366] text-[#003366] hover:bg-blue-50"
                }`}
              >
                Add Delegate
              </button>
            ) : (
              <>
                <button
                  onClick={() => canAddDaoOrManager && openAddDao(event._id)}
                  disabled={!canAddDaoOrManager}
                  title={isDraftEvent ? "Publish event first to add DAO" : isPastEvent ? "Cannot add DAO to past event" : ""}
                  className={`flex-1 px-4 py-3 text-sm border-2 rounded-lg transition-colors font-medium ${
                    !canAddDaoOrManager
                      ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                      : "border-[#003366] text-[#003366] hover:bg-blue-50"
                  }`}
                >
                  Add DAO
                </button>

                {!isEventManager && (
                  <button
                    onClick={() => canAddDaoOrManager && openAddManager(event._id)}
                    disabled={!canAddDaoOrManager}
                    title={isDraftEvent ? "Publish event first to add Manager" : isPastEvent ? "Cannot add Manager to past event" : ""}
                    className={`flex-1 px-4 py-3 text-sm rounded-lg transition-colors font-medium ${
                      !canAddDaoOrManager
                        ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                        : "bg-[#003366] text-white hover:bg-[#01274e]"
                    }`}
                  >
                    Add Manager
                  </button>
                )}
              </>
            )}
            </div>
          </div>
        </div>

        {/* DESKTOP ACTIONS */}
        <div className="hidden md:flex md:flex-col md:items-end md:gap-2">
          {/* Draft Message - Desktop */}
          {isDraftEvent && !isNonAdminRole && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800 whitespace-nowrap">
                Publish to add DAO/Manager
              </p>
              <button
                onClick={() => openEditDrawer && openEditDrawer(event)}
                className="px-2 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium"
              >
                Publish
              </button>
            </div>
          )}
          
          <div className="flex items-start gap-2">
          {isNonAdminRole ? (
            <button
              onClick={() => !isPastEvent && openAddDelegate && openAddDelegate(event)}
              disabled={isPastEvent || delegateLimitReached}
              className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${
                isPastEvent || delegateLimitReached
                  ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                  : "border-[#003366] bg-white text-[#003366]"
              }`}
            >
              Add Delegate
            </button>
          ) : (
            <>
              <button
                onClick={() => canAddDaoOrManager && openAddDao(event._id)}
                disabled={!canAddDaoOrManager}
                title={isDraftEvent ? "Publish event first to add DAO" : isPastEvent ? "Cannot add DAO to past event" : ""}
                className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${
                  !canAddDaoOrManager
                    ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                    : "border-[#003366] bg-white text-[#003366] "
                }`}
              >
                Add DAO
              </button>

              {!isEventManager && (
                <button
                  onClick={() => canAddDaoOrManager && openAddManager(event._id)}
                  disabled={!canAddDaoOrManager}
                  title={isDraftEvent ? "Publish event first to add Manager" : isPastEvent ? "Cannot add Manager to past event" : ""}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    !canAddDaoOrManager
                      ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                      : "bg-[#003366] text-white hover:bg-[#01274e]"
                  }`}
                >
                  Add Manager
                </button>
              )}
            </>
          )}
          </div>
          
          {/* MENU - Desktop */}
          <div className="relative">
            <button
              onClick={() => !isDraftEvent && setShowMenu((p) => !p)}
              disabled={isDraftEvent}
              title={isDraftEvent ? "Publish event first to access menu options" : ""}
              className={`p-2 rounded-md ${
                isDraftEvent
                  ? "bg-gray-100 cursor-not-allowed opacity-50"
                  : "hover:bg-gray-100 cursor-pointer"
              }`}
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && !isDraftEvent && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />

                <div className="absolute right-0 top-full mt-2 w-40 bg-white border rounded-lg shadow-md z-50 p-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate(isNonAdminRole ? `/events/${event._id}` : `/admin/events/${event._id}`);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-lg"
                  >
                    {isNonAdminRole ? "View Event" : "View Details"}
                  </button>
                  {!isNonAdminRole && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openEditDrawer && openEditDrawer(event);
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-lg"
                    >
                      Edit Event
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventListView;
