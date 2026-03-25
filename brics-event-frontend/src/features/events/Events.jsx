import React, { useEffect, useState } from "react";
import { Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUserEventList } from "../../services/events";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  /* ================= FETCH EVENTS ================= */
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await getUserEventList();
        setEvents(res || []);
      } catch (err) {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  /* ================= HELPERS ================= */
  const today = new Date();

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatEventDate = (start, end) => {
    if (!start || !end) return "-";
    if (start === end) return formatDate(start);
    return `${formatDate(start)} → ${formatDate(end)}`;
  };

  /* ================= FILTER ================= */
  const filteredEvents = events.filter((event) => {
    const endDate = new Date(event.end_date);
    return tab === "upcoming" ? endDate >= today : endDate < today;
  });

  /* ================= STATES ================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading events...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  /* ================= JSX ================= */
  return (
    <div className="min-h-screen py-8 lg:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
          <p className="text-gray-600 mt-1">
            All events associated with your account
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b mb-8 text-sm">
          {["upcoming", "past"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 capitalize transition ${
                tab === t
                  ? "border-b-2 border-gray-900 text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t} events
            </button>
          ))}
        </div>

        {/* Event Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <div
              key={event.user_event_id}
              // onClick={() => navigate(`/events/${event.event_id}`)}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col min-h-[320px] cursor-pointer"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#f7f3ef] via-[#f1f4f8] to-[#eef3f9] p-5 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {event.name}
                  </h2>

                  <span className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-full">
                    {event.role}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-1">
                  {event.event_code}
                </p>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                  {event.description || "No description available"}
                </p>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                      {formatEventDate(event.start_date, event.end_date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{event.event_type || "-"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>
                      {event.total_delegates ?? 0} Delegates
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            No {tab} events found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
