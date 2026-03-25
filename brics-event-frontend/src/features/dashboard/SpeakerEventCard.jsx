import { useState } from "react";
import { Calendar, MapPin, Clock, Users, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";

const SpeakerEventCard = ({ event }) => {
  const [expanded, setExpanded] = useState(false);

  /* ================= HELPERS ================= */
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatTime = (time) => {
    if (!time) return "TBD";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isPastEvent = new Date(event.end_date) < new Date();
  const sessions = event?.sessions || [];
  const invitationStatus = event?.status || "pending";

  const statusColor =
    invitationStatus.toLowerCase() === "accepted"
      ? "bg-green-100 text-green-700"
      : invitationStatus.toLowerCase() === "invited"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  const statusIcon =
    invitationStatus.toLowerCase() === "accepted" ? (
      <CheckCircle size={16} />
    ) : (
      <AlertCircle size={16} />
    );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* CARD HEADER */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* LEFT CONTENT */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-1">
              {event.name || event.eventName}
            </h3>

            {/* Meta Information */}
            <div className="space-y-2 text-sm text-gray-600 mb-3">
              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                <span>
                  {formatDate(event.start_date)} – {formatDate(event.end_date)}
                </span>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}

              {/* Category */}
              {event.category && (
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                    {event.category}
                  </span>
                </div>
              )}
            </div>

            {/* Sessions Count */}
            {sessions.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                <Clock size={16} />
                <span>
                  {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT CONTENT - STATUS & EXPAND */}
          <div className="flex-shrink-0 flex flex-col items-end gap-3">
            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {statusIcon}
              <span className="capitalize">{invitationStatus}</span>
            </div>

            {/* Expand Icon */}
            <button className="p-1 hover:bg-gray-100 rounded transition">
              {expanded ? (
                <ChevronUp size={20} className="text-gray-600" />
              ) : (
                <ChevronDown size={20} className="text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT */}
      {expanded && (
        <>
          <div className="border-t border-gray-200" />
          <div className="p-6 space-y-6 bg-gray-50">
            {/* Event Description */}
            {event.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  About Event
                </h4>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {event.description}
                </p>
              </div>
            )}

            {/* Sessions List */}
            {sessions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Your Sessions
                </h4>
                <div className="space-y-3">
                  {sessions.map((session, idx) => (
                    <div
                      key={session._id || idx}
                      className="bg-white rounded border border-gray-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h5 className="font-medium text-sm text-gray-900 flex-1">
                          {session.name || session.title || `Session ${idx + 1}`}
                        </h5>
                        {session.status && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {session.status}
                          </span>
                        )}
                      </div>

                      {/* Session Details */}
                      <div className="space-y-1 text-xs text-gray-600">
                        {session.date && (
                          <div className="flex items-center gap-2">
                            <Clock size={12} />
                            <span>
                              {formatDate(session.date)}{" "}
                              {session.start_time &&
                                `at ${formatTime(session.start_time)}`}
                            </span>
                          </div>
                        )}

                        {session.venue && (
                          <div className="flex items-center gap-2">
                            <MapPin size={12} />
                            <span>{session.venue}</span>
                          </div>
                        )}

                        {session.duration && (
                          <div className="flex items-center gap-2">
                            <Clock size={12} />
                            <span>{session.duration} minutes</span>
                          </div>
                        )}
                      </div>

                      {/* Session Description */}
                      {session.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {session.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Details Summary */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-300">
              <div>
                <p className="text-xs text-gray-600 mb-1">Event Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {event.event_type || "Virtual"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Expected Attendees</p>
                <p className="text-sm font-medium text-gray-900">
                  {event.expected_attendees || "TBD"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-300">
              {invitationStatus.toLowerCase() === "invited" && (
                <>
                  <button
                    onClick={() => toast.info("Accepting invitation...")}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                  >
                    Accept Invitation
                  </button>
                  <button
                    onClick={() => toast.info("Declining invitation...")}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                  >
                    Decline
                  </button>
                </>
              )}

              {invitationStatus.toLowerCase() === "accepted" && (
                <button
                  disabled={isPastEvent}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isPastEvent ? "Event Completed" : "View Details"}
                </button>
              )}

              {invitationStatus.toLowerCase() === "declined" && (
                <div className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-center text-sm font-medium">
                  Invitation Declined
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SpeakerEventCard;
