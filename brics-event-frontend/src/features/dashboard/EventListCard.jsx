import React, { useState, useEffect } from "react";
import { Calendar, MapPin, Users, MoreVertical, Video } from "lucide-react";
import eventImg from "../../assets/images/event-banner.svg";
import { formatDateWithOrdinal } from "../../utils/formatDateWithOrdinal";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import InviteDelegatesDrawer from "../delegates/InviteDelegatesDrawer";
import ViewDelegatesDrawer from "../delegates/ViewDelegatesDrawer";
import TravelDetailsDrawer from "../travel/TravelDetailsDrawer";
import AccreditationPass from "../../components/ui/AccreditationPass";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const EventListCard = ({ event, onCardClick }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [delegates, setDelegates] = useState([]);
  const [travelOpen, setTravelOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { data } = useCurrentUser();
  
  const roleName = data?.role?.name;
  const normalizedRole = (roleName ?? "").toUpperCase();
  const isDelegateRole = [
    "DELEGATE",
    "HEAD OF DELEGATE",
    "SECURITY OFFICER",
    "INTERPRETER",
    "MEDIA",
    "DEPUTY",
    "DELEGATION CONTACT OFFICER",
    "SPEAKER",
  ].includes(normalizedRole);
  const isDAO = normalizedRole === "DAO";

  const isRegisteredForEvent =
    isDAO ? event.is_user_delegate === true : true;

  const getEventEndDateTime = (e) => {
    if (!e?.end_date) return null;
    const date = e.end_date.split("T")[0];
    const time = e.end_time || "23:59";
    return new Date(`${date}T${time}:00`);
  };

  const endDateTime = getEventEndDateTime(event);
  const isPastEvent = endDateTime && endDateTime < new Date();
  const delegateLimitReached =
    event?.total_delegates >= event?.delegate_count;

  const handleDelegateUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["attend-events"] });
    queryClient.invalidateQueries(["attendEventList"]);
    queryClient.invalidateQueries(["userEventList"]);
  };

  /* ================= MENU OUTSIDE CLICK ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-container")) {
        setShowMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      <div
        className="rounded-xl md:rounded-xl shadow-sm border hover:shadow-md transition bg-white relative overflow-visible cursor-pointer"
        onClick={(e) => {
          if (
            e.target.closest("button") ||
            e.target.closest(".menu-container")
          ) {
            return;
          }
          if (onCardClick) {
            onCardClick();
          } else {
            navigate(`/events/${event._id || event.event_id}`);
          }
        }}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (onCardClick) {
              onCardClick();
            } else {
              navigate(`/events/${event._id || event.event_id}`);
            }
          }
        }}
        aria-label={`View details for ${event.name}`}
      >
        {/* Mobile & Desktop Layout */}
        <div className="flex flex-col md:flex-row md:p-4 md:gap-4 rounded-xl">{" "}
          {/* IMAGE */}
          <div className="w-full h-[200px] md:w-[240px] md:h-[160px] flex-shrink-0 overflow-hidden relative rounded-t-xl md:rounded-xl">
            <img
              src={event?.logo || eventImg}
              alt={event.name}
              className="w-full h-full object-cover"
            />

            {/* Three-dot menu - positioned absolute on mobile, shown in actions on desktop */}
            <div className="md:hidden absolute top-4 right-4">
              <div className="relative menu-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu((p) => !p);
                  }}
                  className="p-2 bg-white hover:bg-gray-100 rounded-full shadow-md"
                >
                  <MoreVertical size={16} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border rounded-lg shadow-lg z-[999]">
                    <button
                      onClick={() => {
                        setViewOpen(true);
                        setShowMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-t-lg"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => {
                        setTravelOpen(true);
                        setShowMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Add Travel Details
                    </button>

                    <button
                      onClick={() => {
                        if (!isRegisteredForEvent) {
                          alert(
                            "You are not registered as a delegate for this event"
                          );
                          setShowMenu(false);
                          return;
                        }
                        setShowPass(true);
                        setShowMenu(false);
                      }}
                      disabled={!isRegisteredForEvent}
                      className={`block w-full text-left px-4 py-2 text-sm rounded-b-lg ${
                        !isRegisteredForEvent
                          ? "text-gray-400 cursor-not-allowed"
                          : "hover:bg-gray-100"
                      }`}
                      title={
                        !isRegisteredForEvent
                          ? "You are not registered as a delegate for this event"
                          : ""
                      }
                    >
                      Download Pass
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CONTENT WRAPPER */}
          <div className="flex-1 flex flex-col">
            {/* INFO */}
            <div className="flex-1 space-y-2 p-4 md:p-0">
              <div className="flex items-center gap-2">
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 capitalize font-medium">
                  {event?.category}
                </span>

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
                </div>

                <div className="relative group flex items-start gap-2">
                  <MapPin className="w-5 h-5 md:w-4 md:h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                  {(() => {
                    const combinedLocation = `${event.location || ""}${
                      event?.venue ? `, ${event.venue}` : ""
                    }`;
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
                    {event?.total_delegates || 0}/{event?.delegate_count || 0}{" "}
                    Delegates Invited
                  </span>
                </div>
              </div>
            </div>

            {/* ACTIONS - Mobile at bottom, Desktop on right */}
            <div className="flex items-center gap-3 px-4 pb-4 md:hidden">
              {isDelegateRole && !isDAO ? (
                <button
                  disabled={
                    !event.registration_open ||
                    isPastEvent ||
                    !isRegisteredForEvent
                  }
                  className={`flex-1 py-3 px-6 rounded-lg text-sm ${
                    !event.registration_open ||
                    isPastEvent ||
                    !isRegisteredForEvent
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-[#003366] text-white"
                  }`}
                  onClick={() => {
                    if (!isRegisteredForEvent) {
                      alert(
                        "You are not registered as a delegate for this event"
                      );
                      return;
                    }
                    setShowPass(true);
                  }}
                  title={
                    !isRegisteredForEvent
                      ? "You are not registered as a delegate for this event"
                      : ""
                  }
                >
                  Download Pass
                </button>
              ) : (
                <button
                  disabled={delegateLimitReached}
                  onClick={() => {
                    setDelegates([]);
                    setInviteOpen(true);
                  }}
                  className={`flex-1 py-3 rounded-lg text-sm ${
                    delegateLimitReached
                      ? "border border-gray-300 text-gray-400 cursor-not-allowed"
                      : "border border-[#003366] text-[#003366]"
                  }`}
                >
                  Invite Delegates
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden md:flex md:items-start md:gap-2">
            {isDelegateRole && !isDAO ? (
              <button
                disabled={
                  !event.registration_open ||
                  isPastEvent ||
                  !isRegisteredForEvent
                }
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  !event.registration_open ||
                  isPastEvent ||
                  !isRegisteredForEvent
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-[#003366] text-white"
                }`}
                onClick={() => {
                  if (!isRegisteredForEvent) {
                    alert(
                      "You are not registered as a delegate for this event"
                    );
                    return;
                  }
                  setShowPass(true);
                }}
                title={
                  !isRegisteredForEvent
                    ? "You are not registered as a delegate for this event"
                    : ""
                }
              >
                Download Pass
              </button>
            ) : (
              <button
                disabled={delegateLimitReached}
                onClick={() => {
                  setDelegates([]);
                  setInviteOpen(true);
                }}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors mt-1 ${
                  delegateLimitReached
                    ? "border border-gray-300 text-gray-400 cursor-not-allowed"
                    : "border border-[#003366] bg-white text-[#003366]"
                }`}
              >
                Invite Delegates
              </button>
            )}

            {/* MENU - Desktop */}
            <div className="relative menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((p) => !p);
                }}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                ⋮
              </button>

              {showMenu && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white border rounded-lg shadow-lg z-[999]">
                  <button
                    onClick={() => {
                      setViewOpen(true);
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-t-lg"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => {
                      setTravelOpen(true);
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Add Travel Details
                  </button>

                  <button
                    onClick={() => {
                      if (!isRegisteredForEvent) {
                        alert(
                          "You are not registered as a delegate for this event"
                        );
                        setShowMenu(false);
                        return;
                      }
                      setShowPass(true);
                      setShowMenu(false);
                    }}
                    disabled={!isRegisteredForEvent}
                    className={`block w-full text-left px-4 py-2 text-sm rounded-b-lg ${
                      !isRegisteredForEvent
                        ? "text-gray-400 cursor-not-allowed"
                        : "hover:bg-gray-100"
                    }`}
                    title={
                      !isRegisteredForEvent
                        ? "You are not registered as a delegate for this event"
                        : ""
                    }
                  >
                    Download Pass
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DRAWERS */}
      <InviteDelegatesDrawer
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setDelegates([]);
        }}
        delegates={delegates}
        setDelegates={setDelegates}
        eventId={event._id || event.event_id}
        delegateCount={event?.total_delegates}
        maxDelegates={event?.delegate_count}
        onSuccess={handleDelegateUpdate}
      />

      <ViewDelegatesDrawer
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        delegates={delegates}
        eventId={event._id || event.event_id}
        maxDelegates={event?.delegate_count}
        onRefresh={handleDelegateUpdate}
      />

      <TravelDetailsDrawer
        open={travelOpen}
        onClose={() => setTravelOpen(false)}
        initialEvent={event}
        onSuccess={handleDelegateUpdate}
      />

      {showPass && (
        <AccreditationPass
          userData={data}
          eventData={event}
          onClose={() => setShowPass(false)}
        />
      )}
    </>
  );
};

export default EventListCard;
