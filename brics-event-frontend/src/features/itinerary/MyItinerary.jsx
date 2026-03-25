import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import { getUserEventList } from "../../services/events";
import { getEventSessions } from "../../services/sessions";
import PageLoader from "../../components/common/PageLoader";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import downloadItinerary from "../../utils/downloadItinerary";

const MyItinerary = () => {
  const [activeTab, setActiveTab] = useState("All Events");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState(null); // Only one event expanded at a time
  const [expandedSessionId, setExpandedSessionId] = useState(null); // Only one session expanded at a time
  const [sessionDetails, setSessionDetails] = useState({});
  const [activeSessionTab, setActiveSessionTab] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);


  const [dateRange, setDateRange] = useState(() => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  return [
    {
      startDate: today,
      endDate: nextWeek,
      key: "selection",
    },
  ];
});


  // Fetch user events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await getUserEventList();
        const eventsList = response?.data || response || [];
        setEvents(Array.isArray(eventsList) ? eventsList : []);
      } catch (error) {
        console.error("Error fetching user events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on active tab
  const getFilteredEvents = () => {
    if (activeTab === "All Events") return events;
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return events.filter(event => {
      const eventStart = new Date(event.event?.start_date || event?.start_date || event?.start_datetime);
      const eventEnd = new Date(event.event?.end_date || event?.end_date || event?.end_datetime || eventStart);
      eventEnd.setHours(23, 59, 59);

      switch (activeTab) {
        case "Today": {
          return eventStart <= endOfDay && eventEnd >= startOfDay;
        }
        case "Tomorrow": {
          const startOfTomorrow = new Date(startOfDay);
          startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
          const endOfTomorrow = new Date(startOfTomorrow);
          endOfTomorrow.setHours(23, 59, 59);
          return eventStart <= endOfTomorrow && eventEnd >= startOfTomorrow;
        }
        case "This Week": {
          const startOfWeek = new Date(startOfDay);
          startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59);
          return eventStart <= endOfWeek && eventEnd >= startOfWeek;
        }
        case "Custom Date": {
          const start = new Date(dateRange[0].startDate);
          const end = new Date(dateRange[0].endDate);
          end.setHours(23, 59, 59);
          return eventStart <= end && eventEnd >= start;
        }
        default:
          return true;
      }
    });
  };

  // Toggle event expansion
  const toggleEventExpansion = async (eventId) => {
    // If clicking the same event, collapse it
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      // Expand the new event
      setExpandedEventId(eventId);
      
      // Fetch sessions for this event if not already loaded
      if (!sessionDetails[eventId]) {
        try {
          const response = await getEventSessions(eventId);
          // Handle the actual API response structure
          const sessionsData = response?.sessions || response?.data?.sessions || response?.data || response || [];
          setSessionDetails(prev => ({
            ...prev,
            [eventId]: Array.isArray(sessionsData) ? sessionsData : []
          }));
          // Set default tab for this event
          setActiveSessionTab(prev => ({ ...prev, [eventId]: "Agenda" }));
        } catch (error) {
          console.error("Error fetching sessions:", error);
          setSessionDetails(prev => ({
            ...prev,
            [eventId]: []
          }));
          setActiveSessionTab(prev => ({ ...prev, [eventId]: "Agenda" }));
        }
      }
    }
  };

  // Format date and time
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return { day, month };
  };

  const formatEventDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "";

  const start = new Date(startDate);
  const end = new Date(endDate);

  const options = { day: "2-digit", month: "short", year: "numeric" };

  const startFormatted = start.toLocaleDateString("en-GB", options);
  const endFormatted = end.toLocaleDateString("en-GB", options);

  return `${startFormatted} - ${endFormatted}`;
};

  // Format time in 24-hour format (HH:mm) using UTC from ISO string
  const formatTime = (dateString) => {
    if (!dateString) return "TBD";
    // Extract hours and minutes from the ISO string (UTC)
    const match = dateString.match(/T(\d{2}):(\d{2})/);
    if (!match) return "TBD";
    return `${match[1]}:${match[2]}`;
  };

  const handleDownloadItinerary = async () => {
  const filtered = getFilteredEvents();

  const eventsWithSessions = await Promise.all(
    filtered.map(async (eventItem) => {
      const event = eventItem.event || eventItem;
      const eventId = event?.event_id || event?._id || event?.id;

      try {
        const res = await getEventSessions(eventId);
        const sessions =
          res?.sessions || res?.data?.sessions || res?.data || [];

        return {
          ...event,
          sessions,
        };
      } catch {
        return {
          ...event,
          sessions: [],
        };
      }
    })
  );

  downloadItinerary(eventsWithSessions);
};

// Format agenda time in 24-hour format (HH:mm)
const formatAgendaTime = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return "";
  // Pad with leading zeros if needed
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
};


   const formatRangeLabel = () => {
  const start = dateRange[0].startDate;
  const end = dateRange[0].endDate;

  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${startStr} - ${endStr}`;
};

  if (loading) return <PageLoader />;

  const filteredEvents = getFilteredEvents();

 

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Itinerary</h1>
          <button
            onClick={handleDownloadItinerary}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b3867] text-white rounded-lg hover:bg-[#1b3867] transition-colors"
          >
            <Download size={16} />
            {activeTab === "Today" && "Download Today's Itinerary"}
            {activeTab === "Tomorrow" && "Download Tomorrow's Itinerary"}
            {activeTab === "This Week" && "Download This Week's Itinerary"}
            {activeTab === "Custom Date" && `Download ${formatRangeLabel()} Itinerary`}
            {activeTab === "All Events" && "Download Full Itinerary"}
          </button>
        </div>

        {/* Filter Tabs + Custom Date */}
<div className="flex items-center gap-2 mb-6">

  {/* Normal Tabs */}
  {["All Events", "Today", "Tomorrow", "This Week"].map((tab) => (
    <button
      key={tab}
      onClick={() => {
        setActiveTab(tab);
        setShowCalendar(false);
      }}
      className={`px-4 py-2 rounded-full text-sm ${
        activeTab === tab
          ? "bg-[#1b3867] text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {tab}
    </button>
  ))}

  {/* Custom Date pill with calendar icon inside */}
  <div className="relative inline-block">
    <button
      onClick={() => {
        // Select Custom Date tab only (do not open calendar)
        setActiveTab("Custom Date");
        setShowCalendar(false);
      }}
      className={`px-4 py-2 rounded-full text-sm inline-flex items-center gap-3 ${
        activeTab === "Custom Date"
          ? "bg-[#1b3867] text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      <span>{activeTab === "Custom Date" ? formatRangeLabel() : "Custom Date"}</span>

      {/* calendar icon box inside the pill */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          setActiveTab("Custom Date");
          setShowCalendar((s) => !s);
        }}
        role="button"
        aria-label="Toggle calendar"
        className={`ml-1 inline-flex items-center justify-center w-8 h-8 rounded-full ${activeTab === "Custom Date" ? "bg-white text-[#1b3867]" : "bg-white text-[#1b3867]"}`}
      >
        <Calendar size={16} />
      </span>
    </button>

    {/* Floating Calendar anchored under the pill */}
    {showCalendar && (
      <div className="absolute left-0 top-full mt-2 z-50 bg-white shadow-xl rounded-lg p-4">
        <DateRange
          editableDateInputs
          moveRangeOnFirstSelection={false}
          ranges={dateRange}
          onChange={(item) => setDateRange([item.selection])}
        />

        <div className="flex justify-between items-center mt-3">
          <button
            onClick={() => {
              const today = new Date();
              const nextWeek = new Date();
              nextWeek.setDate(today.getDate() + 7);

              setDateRange([
                {
                  startDate: today,
                  endDate: nextWeek,
                  key: "selection",
                },
              ]);
              setShowCalendar(false);
            }}
            className="text-sm text-gray-500"
          >
            Clear all
          </button>

          <button
            onClick={() => setShowCalendar(false)}
            className="bg-[#1b3867] text-white px-4 py-1 rounded-md text-sm"
          >
            Apply
          </button>
        </div>
      </div>
    )}
  </div>

</div>

        {/* Events List */}
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
              <p className="text-gray-500">No events found for the selected filter.</p>
            </div>
          ) : (
            filteredEvents.map((eventItem, index) => {
              const event = eventItem.event || eventItem;
              const eventId = event?.event_id || event?._id || event?.id || `event_${index}`;
              const isExpanded = expandedEventId === eventId;
              const sessions = sessionDetails[eventId] || [];
              const eventDate = formatDate(event?.start_date);
              return (
                <div key={eventId} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Event Header */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3 min-w-[60px]">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {eventDate.month}
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {eventDate.day}
                        </span>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                              {/* This is intentionally left blank as per the new design */}
                            </div>
                            {/* Event Title + Category */}
<div className="mb-2">

  {/* Event Date Range */}
  <p className="text-sm text-blue-800 font-medium mb-1">
    {formatEventDateRange(event?.start_date, event?.end_date)}
  </p>

  {/* Title + Category */}
  <div className="flex items-center gap-3 flex-wrap">
    <h3 className="text-lg font-semibold text-gray-900 capitalize">
      {event?.name}
    </h3>

    {event?.category && (
      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs whitespace-nowrap">
        {event.category}
      </span>
    )}
  </div>

</div>

<p className="text-base text-gray-700 mb-2">
  {event?.description ? event.description : 
    <span className="text-gray-500 ">No description available</span>}
</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                {event?.event_type && (
                                    <div className="flex items-center gap-1">
                                        <User size={14} />
                                        <span>{event.event_type}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600">
  <MapPin size={14} className="mt-1 flex-shrink-0" />
  <div>
    <span>{event?.venue || "Venue not specified"}</span>

    {event?.location && (
      <>
        <span className="mx-1">•</span>
        <span>{event.location}</span>
      </>
    )}
  </div>
</div>
                          </div>
                          
                          {/* View Sessions Button */}
                          <button
                            onClick={() => toggleEventExpansion(eventId)}
                           className="flex items-center gap-2 text-[#1b3867] hover:text-[#1b3867] font-medium whitespace-nowrap"
                          >
                            {isExpanded ? "Hide Sessions" : "View Sessions"}
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Sessions */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50">
                      <div className="p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">
                          Sessions ({sessions.length})
                        </h4>

                        {/* Session Content */}
                        <div className="space-y-4">
                          {sessions.length === 0 ? (
                            <p className="text-gray-500">No sessions available for this event.</p>
                          ) : (
                            sessions.map((session, sessionIndex) => {
                              const sessionId = session._id || `${eventId}_session_${sessionIndex}`;
                              const isSessionExpanded = expandedSessionId === sessionId;
                              const sessionTab = activeSessionTab[sessionId] || "Agenda";
                              return (
                                <div key={sessionId} className="border-l-4 border-blue-500 pl-4">
                                  {/* Session Header */}
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-blue-700">
                                        {formatTime(session.start_datetime)} - {formatTime(session.end_datetime)}
                                      </span>
                                      {session.category && (
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                          {session.category}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Session Title */}
                                  <h5 className="text-lg font-semibold text-gray-900 mb-2 capitalize">
                                    {session.name || session.title}
                                  </h5>

                                  {/* Session Description */}
                                  <p className="text-sm text-gray-600 mb-3">
                                    {session.description || "No description available"}
                                  </p>

                                  {/* Session Location */}
                                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                    <MapPin size={16} />
                                    <span>{session.location || "Location not specified"}</span>
                                  </div>

                                  {/* View Agenda Toggle Button */}
                                  {!isSessionExpanded ? (
                                    <button
                                      onClick={() => {
                                        setExpandedSessionId(sessionId);
                                        setActiveSessionTab(prev => ({ ...prev, [sessionId]: "Agenda" }));
                                      }}
                                      className="flex items-center gap-2 text-[#1b3867] hover:text-[#1b3867] font-medium text-sm mb-4"
                                    >
                                      View Agenda <ChevronDown size={16} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setExpandedSessionId(null)}
                                      className="flex items-center gap-2 text-[#1b3867] hover:text-[#1b3867] font-medium text-sm mb-4"
                                    >
                                      Hide Agenda <ChevronUp size={16} />
                                    </button>
                                  )}
                                  {isSessionExpanded && (
                                    <div className="mb-4">
                                      <div className="flex gap-2 mb-4 items-center">
                                        <button
                                          className={`px-3 pb-2 text-sm font-medium ${sessionTab === "Agenda" ? "text-[#1b3867] border-b-2 border-[#1b3867]" : "text-gray-500"}`}
                                          onClick={() => setActiveSessionTab(prev => ({ ...prev, [sessionId]: "Agenda" }))}
                                        >
                                          Agenda
                                        </button>
                                        <button
                                          className={`px-3 pb-2 text-sm font-medium ${sessionTab === "Speakers" ? "text-[#1b3867] border-b-2 border-[#1b3867]" : "text-gray-500"}`}
                                          onClick={() => setActiveSessionTab(prev => ({ ...prev, [sessionId]: "Speakers" }))}
                                        >
                                          Speakers
                                        </button>
                                        </div>
                                        {/* Agenda Section */}
                                        {sessionTab === "Agenda" && (
                                          <div className="mb-4">
                                            <h6 className="font-semibold text-gray-900 mb-2">Agenda</h6>
                                            {session.agendas && session.agendas.length > 0 ? (
                                              <div className="space-y-2">
                                                {session.agendas.map((agenda, idx) => (
                                                  <div key={agenda._id || idx} className="bg-white rounded shadow p-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      
                                                      <span className="text-sm font-semibold text-blue-700">
  {formatAgendaTime(agenda.start_time)} - {formatAgendaTime(agenda.end_time)}
</span>
                                                    </div>
                                                    <div className="text-sm text-gray-700 font-medium mb-1 capitalize">
                                                      {agenda.title}
                                                    </div>
                                                    {agenda.description && (
                                                      <div className="text-xs text-gray-500 mb-1">{agenda.description}</div>
                                                    )}
                                                    {/* ── Agenda Speakers ── */}
                                                    {agenda.speakers && agenda.speakers.length > 0 && (
                                                      <div className="mt-3 pt-2 border-t border-gray-100">
                                                        <span className="text-xs font-semibold text-gray-600 mb-2 block">Speaker</span>
                                                        <div className="flex flex-wrap gap-2">
                                                          {agenda.speakers.map((sp, spIdx) => (
                                                            <div
                                                              key={sp.user_id || spIdx}
                                                              className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5"
                                                            >
                                                              {/* Avatar */}
                                                              <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                {sp.photo_signed_url ? (
                                                                  <img
                                                                    src={sp.photo_signed_url}
                                                                    alt={sp.user_name}
                                                                    className="w-full h-full object-cover"
                                                                  />
                                                                ) : (
                                                                  <User size={14} className="text-gray-500" />
                                                                )}
                                                              </div>
                                                              {/* Info — all in one line */}
                                                              <div className="flex flex-col leading-tight">
                                                                <span className="text-xs font-semibold text-gray-900 capitalize">
                                                                  {sp.user_name}
                                                                </span>
                                                                {(sp.designation || sp.organisation) && (
                                                                  <span className="text-xs text-gray-500">
                                                                    {[sp.designation, sp.organisation].filter(Boolean).join(" · ")}
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-gray-500">No agenda available for this session.</p>
                                            )}
                                          </div>
                                        )}
                                        {/* Speakers Section */}
                                        {sessionTab === "Speakers" && (
                                          <div className="mt-4 bg-white rounded-lg p-4 border">
                                            <div className="space-y-3">
                                              <h6 className="font-semibold text-gray-900">Session Speakers</h6>
                                              {session.speakers?.length > 0 ? (
                                                <div className="grid gap-4">
                                                  {session.speakers.map((speaker, speakerIndex) => (
                                                    <div key={speaker.user_id || `speaker_${speakerIndex}`} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                                                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {speaker.photo_signed_url ? (
                                                          <img
                                                            src={speaker.photo_signed_url}
                                                            alt={speaker.user_name}
                                                            className="w-full h-full object-cover"
                                                          />
                                                        ) : (
                                                          <User size={20} className="text-gray-500" />
                                                        )}
                                                      </div>
                                                      <div className="flex-1">
                                                        <p className="font-medium text-gray-900 capitalize">{speaker.user_name}</p>
                                                        {speaker.designation && (
                                                          <p className="text-sm text-gray-600">{speaker.designation}</p>
                                                        )}
                                                        {speaker.organisation && (
                                                          <p className="text-xs text-gray-500">{speaker.organisation}</p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-sm text-gray-500">No speakers assigned to this session.</p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </div>
                              );
})
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MyItinerary;