import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Users, Video } from "lucide-react";
import InviteDelegatesDrawer from "../delegates/InviteDelegatesDrawer";
import ViewDelegatesDrawer from "../delegates/ViewDelegatesDrawer";
import TravelDetailsDrawer from "../travel/TravelDetailsDrawer";
import eventImg from "../../assets/images/event-banner.svg";
import AccreditationPass from "../../components/ui/AccreditationPass";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getMeetingLabel } from "../../utils/getMeetingLabel";
import api from "../../services/axios";

const EventCard = ({ event, onCardClick }) => {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [delegates, setDelegates] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [activeDelegateCount, setActiveDelegateCount] = useState(0);

  /* ================= DELEGATE UPDATE HANDLER ================= */
  const handleDelegateUpdate = () => {
    // Invalidate and refetch the events list
    queryClient.invalidateQueries({ queryKey: ["attend-events"] });
    // Refetch delegates to update active count
    fetchActiveDelegateCount();
  };

  // Fetch delegates and calculate active count
  const fetchActiveDelegateCount = async () => {
    if (!event?._id && !event?.event_id) return;
    
    try {
      const eventId = event._id || event.event_id;
      const res = await api.get(`/api/events/${eventId}/users`);
      const fetchedDelegates = res.data || [];
      
      // Count only ACTIVE delegates (exclude blocked ones)
      const activeCount = fetchedDelegates.filter(
        delegate => delegate?.user?.account_status !== "blocked"
      ).length;
      
      setActiveDelegateCount(activeCount);
    } catch (error) {
      console.error("Failed to fetch delegates:", error);
      setActiveDelegateCount(0);
    }
  };

  // Fetch active delegate count when component mounts or event changes
  useEffect(() => {
    if (true) {
      fetchActiveDelegateCount();
    }
  }, [event?._id, event?.event_id]);

  /* ================= CURRENT USER ================= */
  const { data: currentUser, isLoading } = useCurrentUser();

  if (isLoading) return null;

  const roleName = currentUser?.role?.name;
  const normalizedRole = (roleName ?? "").toUpperCase();
  const isDelegateRole = [
    "DELEGATE",
    "HEAD OF DELEGATE",
    "SECURITY OFFICER",
    "INTERPRETER",
    "MEDIA",
    "DEPUTY",
    "DELEGATION CONTACT OFFICER",
    "SPEAKERS FOR SIDE EVENTS",
  ].includes(normalizedRole);
  const isDAO = normalizedRole === "DAO"; 

  /* ================= HELPERS ================= */
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const isPastEvent = new Date(event.end_date) < new Date();

  // Check if user is registered as delegate for this event
  const isRegisteredForEvent = isDAO ? event.is_user_delegate === true : true;

  /* ================= MENU OUTSIDE CLICK ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-container")) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      <div
        className="w-full sm:w-[420px] bg-white rounded-2xl shadow-sm shadow-[rgba(112,111,111,0.1)] hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={e => {
          if (
            e.target.closest("button") ||
            e.target.closest(".menu-container")
          ) {
            return;
          }
          if (onCardClick) {
            onCardClick();
          } else {
            // fallback navigation
            window.location.href = `/events/${event._id || event.event_id}`;
          }
        }}
        tabIndex={0}
        role="button"
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            if (onCardClick) {
              onCardClick();
            } else {
              window.location.href = `/events/${event._id || event.event_id}`;
            }
          }
        }}
        aria-label={`View details for ${event.name}`}
      >
        <div className="w-full aspect-[16/9] overflow-hidden rounded-t-2xl bg-gray-100">
          <img
            src={event?.logo || eventImg}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] bg-blue-100 text-blue-700 font-medium">
            {event?.category}
          </span>

          <h3 className="font-semibold text-[16px] capitalize">{event.name}</h3>

          {/* META */}
          <div className="text-sm text-gray-600 space-y-1">
            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              {formatDate(event.start_date)} – {formatDate(event.end_date)}
            </div>

            {/* Event Type */}
            <div className="flex items-center gap-2">
              <Video size={14} />
              <span>{event?.event_type || "Virtual"}</span>
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

            {/* Location */}
            <div className="relative group flex items-center gap-2">
              <MapPin size={14} className="flex-shrink-0" />
              {(() => {
                const combinedLocation = `${event?.venue || ""}${
                  event?.location
                    ? `${event?.venue ? ", " : ""}${event.location}`
                    : ""
                }`;
                const isLong = combinedLocation.length > 40;

                return isLong ? (
                  <>
                    <span className="block truncate cursor-pointer">
                      {combinedLocation.slice(0, 40)}...
                    </span>
                    <div className="absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 scale-95 hidden group-hover:scale-105 group-hover:block transition-all duration-200 w-full rounded-md bg-white px-3 py-2 text-base text-gray-700 shadow-lg whitespace-pre-wrap">
                      {combinedLocation}
                    </div>
                  </>
                ) : (
                  <span>{combinedLocation || "-"}</span>
                );
              })()}
            </div>

            {/* ✅ DELEGATE COUNT SECTION ADDED HERE */}
            {!isDelegateRole && (
              <div className="flex items-center gap-2 justify-between pt-2">
                <div className="flex items-center justify-center gap-2">
                  <Users size={14} />
                  {isDAO ? activeDelegateCount : (event?.total_delegates || 0)}/{event?.delegate_count || 0}{" "}
                  Delegates Invited
                </div>
              </div>
            )}

            {/* ACTIONS */}
            {isDelegateRole && !isDAO ? (
              <div className="w-full flex justify-end pt-3">
                <button
                  disabled={
                    !event.registration_open ||
                    isPastEvent ||
                    !isRegisteredForEvent
                  }
                  className={`flex py-2 px-6 rounded-lg text-sm ${
                    !event.registration_open ||
                    isPastEvent ||
                    !isRegisteredForEvent
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-[#003366] text-white"
                  }`}
                  onClick={() => {
                    if (!isRegisteredForEvent) {
                      alert(
                        "You are not registered as a delegate for this event",
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
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-3">
                {/* Invite Delegates */}
                <button
                  disabled={isDAO ? activeDelegateCount >= event?.delegate_count : event?.total_delegates >= event?.delegate_count}
                  onClick={() => {
                    setDelegates([]); // Clear delegates before opening
                    setInviteOpen(true);
                  }}
                  className={`w-full py-2 rounded-lg text-sm ${
                    (isDAO ? activeDelegateCount >= event?.delegate_count : event?.total_delegates >= event?.delegate_count)
                      ? "border border-gray-300 text-gray-400 cursor-not-allowed"
                      : "border border-[#003366] text-[#003366]"
                  }`}
                >
                  Invite Delegates
                </button>

                {/* 3 Dot Dropdown Menu */}
                <div className="relative menu-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(!menuOpen);
                    }}
                    className="p-2 rounded-md hover:bg-gray-100"
                  >
                    ⋮
                  </button>

                  {menuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-52 bg-white border rounded-lg shadow-lg z-[9999]">
                      <button
                        onClick={() => {
                          setViewOpen(true);
                          setMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-t-lg"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => {
                          setTravelOpen(true);
                          setMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Add Travel Details
                      </button>

                      <button
                        onClick={() => {
                          if (!isRegisteredForEvent) {
                            alert(
                              "You are not registered as a delegate for this event",
                            );
                            setMenuOpen(false);
                            return;
                          }
                          setShowPass(true);
                          setMenuOpen(false);
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
            )}
          </div>

          {/* Past Event Warning */}
          {isPastEvent && (
            <p className="text-xs text-red-500 pt-2">
              This event has already ended
            </p>
          )}
        </div>
      </div>

      {/* DRAWERS */}
      <InviteDelegatesDrawer
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setDelegates([]); // Clear delegates when closing
        }}
        delegates={delegates}
        setDelegates={setDelegates}
        eventId={event._id || event.event_id}
        delegateCount={isDAO ? activeDelegateCount : event?.total_delegates}
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
          userData={currentUser}
          eventData={event}
          onClose={() => setShowPass(false)}
        />
      )}
    </>
  );
};

export default EventCard;
