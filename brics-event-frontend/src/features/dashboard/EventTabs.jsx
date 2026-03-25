import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EventCard from "./EventCard";
import { attendEventList } from "../../services/events";

const EventTabs = () => {
  const [tab, setTab] = useState("upcoming");

  /* ================= FETCH EVENTS (React Query) ================= */
  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["attend-events"],
    queryFn: attendEventList,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /* ================= FILTER EVENTS ================= */
  const today = new Date();

  const filteredEvents = events.filter((event) => {
    const endDate = new Date(event.end_date);
    return tab === "upcoming"
      ? endDate >= today
      : endDate < today;
  });

  /* ================= STATES ================= */
  if (isLoading) {
    return <div className="text-gray-500">Loading events...</div>;
  }

  if (isError) {
    return (
      <div className="text-red-500">
        Failed to load events. Please try again later.
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6 text-sm">
        {["upcoming", "past"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 capitalize transition ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t} events
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex flex-wrap gap-6">
        {filteredEvents.length === 0 ? (
          <p className="text-gray-500">No events found</p>
        ) : (
          filteredEvents.map((event) => (
            <EventCard
              key={event.event_id || event._id}
              event={event}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default EventTabs;
