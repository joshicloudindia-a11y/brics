import React from 'react';
import EventCard from './EventCard';

const UpcomingEventsCards = ({ events = [], onViewEvent }) => {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-primary-blue-dark)] mb-4">
          Upcoming Events
        </h3>
        <p className="text-sm text-[var(--color-primary-blue-dark)] py-8 text-center">
          No upcoming events found
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl  border-[var(--color-border)] shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-[var(--color-primary-blue-dark)]  ">My Upcoming Events</h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between">
        {events.slice(0, 3).map((event, index) => (
          <EventCard
            key={event._id || event.event_id || index}
            event={event}
            onCardClick={() => onViewEvent && onViewEvent(event)}
          />
        ))}
      </div>
    </div>
  );
};

export default UpcomingEventsCards;
