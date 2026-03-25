import React, { useState } from "react";
import { Calendar, MapPin, Users, MoreVertical } from "lucide-react";
import eventImg from "../../../assets/images/event-banner.svg";
import { Video } from "lucide-react";
import { formatDateWithOrdinal } from "../../../utils/formatDateWithOrdinal";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { getMeetingLabel } from "../../../utils/getMeetingLabel";

const EventCardView = ({
  event,
  index,
  openAddDao,
  openAddManager,
  openEditDrawer,
  getEventEndDateTime,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const { data, isLoading } = useCurrentUser();
  const isEventManager = data?.role?.name === "EVENT MANAGER";
  const isSuperAdmin = data?.role?.name === "SUPER ADMIN";
  const isAdminOrEventManager = isSuperAdmin || isEventManager;
  // For non-admin roles (DAO, Media, etc.) - show delegate-focused view
  const isNonAdminRole = !isAdminOrEventManager;

  // const isEventManager = data?.role?.name === "EVENT MANAGER";
  // const isAdminOrEventManager = (data?.role?.name === "SUPER ADMIN") || isEventManager;
  const invitedDelegates =
    event?.total_delegates ?? event?.delegate_invite_count ?? 0;
  const delegateLimit = event?.delegate_count || 0;
  const delegateLimitReached =
    Boolean(delegateLimit) && invitedDelegates >= delegateLimit;

  const endDateTime = getEventEndDateTime ? getEventEndDateTime(event) : null;
  const isPastEvent = endDateTime && endDateTime < new Date();
  const isDraftEvent = event?.status === "draft";
  const canAddDaoOrManager = !isPastEvent && !isDraftEvent;

  return (
    <div className="w-[420px] rounded-2xl shadow-sm shadow-[rgba(112,111,111,0.1)] bg-white overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Header Image */}
      <div
        className="w-full aspect-[16/9] overflow-hidden bg-gray-100 cursor-pointer"
        onClick={() =>
          navigate(
            isNonAdminRole
              ? `/events/${event._id}`
              : `/admin/events/${event._id}`,
          )
        }
      >
        <img
          src={event?.logo || eventImg}
          alt={event.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Event Type Badge */}
        <div className="flex justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] bg-blue-100 text-blue-700 font-medium">
              {event?.category}
            </span>
            {/* Draft Badge */}
            {event?.status === "draft" && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] bg-yellow-100 text-yellow-700 font-medium">
                Draft
              </span>
            )}
          </div>
          {/* Past Event Badge */}
          {isPastEvent && (
            <span className=" mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Event Ended
            </span>
          )}
        </div>

        {/* Event Name */}
        <h3
          className="text-lg font-bold text-[#121212] line-clamp-2 capitalize mt-1 cursor-pointer hover:text-blue-600 transition"
          onClick={() =>
            navigate(
              isNonAdminRole
                ? `/events/${event._id}`
                : `/admin/events/${event._id}`,
            )
          }
        >
          {event.name}
        </h3>

        {/* Details Grid */}
        <div className="space-y-1 mb-6">
          {/* Start Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 mt-0.5 font-bold text-gray-500 flex-shrink-0" />
            <div className="text-sm text-gray-700 min-w-0">
              <div className="text-gray-400">
                {formatDateWithOrdinal(event.start_date)}{" "}
                <span className="mx-1">–</span>
                {formatDateWithOrdinal(event.end_date)}
              </div>
            </div>
          </div>

          <div className="flex items-center  gap-2 ">
            <Video className="w-4 h-4 font-bold text-gray-500 flex-shrink-0" />
            <span className="text-xs ml-1">
              {event?.event_type || "Virtual"}
            </span>
            <div>
              {(() => {
                const meetingRaw = event?.meeting_url || event?.meetingUrl;
                if (!meetingRaw) return null;
                const meetingHref = meetingRaw.startsWith("http")
                  ? meetingRaw
                  : `https://${meetingRaw}`;
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
          </div>

          {/* Venue with Tooltip Logic */}
          <div className="relative group flex items-start gap-3">
            <MapPin className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
            {(() => {
              const combinedLocation = `${event?.venue || ""}${event?.location ? `${event?.venue ? ", " : ""}${event.location}` : ""}`;
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

          {/* Delegates */}
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 font-medium">
              {isNonAdminRole
                ? `${invitedDelegates}${delegateLimit ? ` / ${delegateLimit}` : ""} Delegates Invited`
                : `${event?.dao_invite_count || 0} DAO Invited`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {isNonAdminRole ? (
          /* DAO VIEW: Show Add Delegate + View Event menu */
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() =>
                !isPastEvent && openAddDelegate && openAddDelegate(event)
              }
              disabled={isPastEvent || delegateLimitReached}
              className={`py-2.5 px-4 rounded-md text-[12px] border font-medium transition-colors cursor-pointer ${
                isPastEvent || delegateLimitReached
                  ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                  : "border-[#003366] bg-white text-[#003366]"
              }`}
            >
              Add Delegate
            </button>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>

              {showMenu && (
                <>
                  {/* CLICK OUTSIDE OVERLAY */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* MENU – ABOVE BUTTON */}
                  <div className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-1">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        navigate(`/events/${event._id}`);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 rounded-lg"
                    >
                      View Event
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ADMIN/EVENT MANAGER VIEW: Show Add DAO + Add Manager + Edit menu */
          <div className="space-y-3 pt-2">
            {/* Draft Event Publish Message */}
            {isDraftEvent && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  📝 Publish this event to add DAO/Manager
                </p>
                <button
                  onClick={() => openEditDrawer && openEditDrawer(event)}
                  className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium whitespace-nowrap"
                >
                  Publish Now
                </button>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
            <button
              onClick={() => canAddDaoOrManager && openAddDao(event._id)}
              disabled={!canAddDaoOrManager}
              title={isDraftEvent ? "Publish event first to add DAO" : isPastEvent ? "Cannot add DAO to past event" : ""}
              className={` py-2.5 px-4 rounded-md text-[12px] border font-medium transition-colors  cursor-pointer ${
                !canAddDaoOrManager
                  ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                  : "border-[#003366] bg-white text-[#003366] "
              }`}
            >
              Add DAO
            </button>
            {
              /* ADD MANAGER BUTTON VISIBLE ONLY FOR SUPER ADMIN ROLES */ !isEventManager && (
                <button
                  onClick={() => canAddDaoOrManager && openAddManager(event._id)}
                  disabled={!canAddDaoOrManager}
                  title={isDraftEvent ? "Publish event first to add Manager" : isPastEvent ? "Cannot add Manager to past event" : ""}
                  className={` py-2.5 px-4 rounded-md text-[12px] border font-medium transition-colors cursor-pointer ${
                    !canAddDaoOrManager
                      ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                      : "border-[#024c95]  bg-[#003366] text-white hover:bg-[#01274e] "
                  }`}
                >
                  Add Manager
                </button>
              )
            }

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => !isDraftEvent && setShowMenu((prev) => !prev)}
                disabled={isDraftEvent}
                title={isDraftEvent ? "Publish event first to access menu options" : ""}
                className={`p-2.5 rounded-lg transition-colors ${
                  isDraftEvent 
                    ? "bg-gray-100 cursor-not-allowed opacity-50" 
                    : "hover:bg-gray-100 cursor-pointer"
                }`}
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>

              {showMenu && !isDraftEvent && (
                <>
                  {/* CLICK OUTSIDE OVERLAY */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* MENU – ABOVE BUTTON */}
                  <div className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-1">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        navigate(`/admin/events/${event._id}`);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm  hover:bg-gray-50 rounded-lg"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openEditDrawer && openEditDrawer(event);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 rounded-lg"
                    >
                      Edit Event
                    </button>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCardView;
