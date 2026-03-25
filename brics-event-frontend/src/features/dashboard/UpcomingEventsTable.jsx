import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatDateWithOrdinal } from '../../utils/formatDateWithOrdinal';

const UpcomingEventsTable = ({ events = [], onViewAll, onViewEvent }) => {
  const navigate = useNavigate();
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return '';
    }
  };

  const getModeBadgeStyle = (mode) => {
    const modeNormalized = (mode || '').toLowerCase();
    if (modeNormalized === 'hybrid') {
      return 'bg-[var(--color-primary-blue-light)] text-[var(--color-primary-blue)] border border-[var(--color-primary-blue)]';
    } else if (modeNormalized === 'virtual') {
      return 'bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]';
    } else if (modeNormalized === 'physical' || modeNormalized === 'in-person') {
      return 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning)]';
    }
    return 'bg-gray-100 text-gray-600 border border-gray-300';
  };

  const getDaysUntilStart = (startDate) => {
    if (!startDate) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const diffTime = start - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays > 1) return `Starts in ${diffDays} days`;
      return null;
    } catch (error) {
      return null;
    }
  };

  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0, width: 300 });

  useEffect(() => {
    const hide = () => setTooltip((t) => (t.visible ? { ...t, visible: false } : t));
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--color-primary-blue-dark)]">
            My Upcoming Events
          </h3>
        </div>
        <p className="text-sm text-[var(--color-primary-blue-dark)] py-8 text-center">
          No upcoming events found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-visible pb-0 sm:pb-2">
      <div className="flex items-center justify-between px-4 py-5 sm:py-6 border-b border-[var(--color-border)]">
        <h3 className="text-base font-semibold text-[var(--color-primary-blue-dark)]">
          My Upcoming Events
        </h3>
        {events.length > 3 && (
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium text-[var(--color-primary-blue-dark)] hover:text-[var(--color-primary-blue-dark)] flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto ">
        <table className="w-full">
          <thead className=" bg-[var(--color-background-light)] border-b border-[var(--color-border)]">
            <tr className="text-sm font-semibold text-[var(--color-text-secondary)] uppercasepy-2 ">
              <th className="min-w-[160px] max-w-[220px] text-left px-4 py-3">Event Name</th>
              <th className="min-w-[120px] max-w-[150px] text-left px-3">Start Date</th>
              <th className="min-w-[120px] max-w-[150px] text-left px-3">End Date</th>
              <th className="min-w-[120px] max-w-[180px] text-left px-3">Location</th>
              <th className="min-w-[90px] max-w-[120px] text-start px-2 ">Mode</th>
              <th className="min-w-[80px] max-w-[100px] text-center px-2">Delegates</th>
              <th className="min-w-[90px] max-w-[120px] text-center px-2   lg:pl-8">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] ">
            {events.slice(0, 3).map((event, index) => {
              const daysUntil = getDaysUntilStart(event.start_date);
              return (
                <tr key={event._id || event.event_id || index} className="hover:bg-[var(--color-background-light)] transition-colors">
                  <td className="px-4 py-2 align-middle">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-primary-blue-dark)] capitalize">
                        {event.name || 'Untitled Event'}
                      </p>
                      {daysUntil && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                          {daysUntil}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div>
                      <p className="text-sm text-[var(--color-primary-blue-dark)] whitespace-nowrap">
                        {formatDate(event.start_date) }
                        {event.start_date && (
                          <span className="ml-1">
                            &middot; {formatTime(event.start_date)}
                          </span>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div>
                      <p className="text-sm text-[var(--color-primary-blue-dark)] whitespace-nowrap">
                        {formatDate(event.end_date)}
                        {event.end_date && (
                          <span className="ml-1">
                            &middot; { formatTime(event.end_date)}
                          </span>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="max-w-[220px]">
                      {(() => {
                        const fullLocation = (event.location || event.city || 'N/A').toString();
                        const maxLen = 70;
                        const isLong = fullLocation.length > maxLen;

                        if (!isLong) {
                          return (
                            <p className="text-sm text-[var(--color-primary-blue-dark)] break-words whitespace-normal leading-snug">
                              {fullLocation}
                            </p>
                          );
                        }

                        return (
                          <span
                            className="block truncate cursor-pointer text-sm text-[var(--color-text-primary)] leading-snug"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const isMobile = window.innerWidth < 1024;
                              setTooltip({
                                visible: true,
                                content: fullLocation,
                                x: isMobile ? '50%' : rect.left + rect.width / 2,
                                y: rect.top,
                                width: isMobile ? '90vw' : Math.min(520, rect.width + 200),
                              });
                            }}
                            onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                          >
                            {fullLocation.slice(0, maxLen)}...
                          </span>
                        );
                      })()}
                    </div>
                    {event.country && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 break-words whitespace-normal leading-snug">
                        {event.country}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2 align-middle text-center ">
                    <div className="flex justify-center w-full">
                      <span className={`inline-flex items-center w-full justify-center px-2.5 py-1 rounded-full text-xs font-medium capitalize text-center ${getModeBadgeStyle(event.event_type || event.mode)}`}>
                        {event.event_type || event.mode || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle text-center">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {event.total_delegates || 0}
                    </p>
                  </td>
                  <td className="px-2 py-2 align-middle text-center">
                    <div className="flex justify-center">
                      <button
                        onClick={() => onViewEvent && onViewEvent(event)}
                        className="text-sm font-medium text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-dark)] hover:underline transition-colors"
                      >
                        View Event
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-[var(--color-border)]">
        {events.slice(0, 3).map((event, index) => {
          const daysUntil = getDaysUntilStart(event.start_date);
          return (
            <div key={event._id || event.event_id || index} className="p-4 sm:p-5 hover:bg-[var(--color-background-light)] transition-colors">
              <div className="space-y-3">
                {/* Event Name & Mode */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)] capitalize">
                      {event.name || 'Untitled Event'}
                    </h4>
                    {daysUntil && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        {daysUntil}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${getModeBadgeStyle(event.event_type || event.mode)}`}>
                    {event.event_type || event.mode || 'N/A'}
                  </span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[var(--color-text-tertiary)] mb-1">Start Date</p>
                    <p className="text-[var(--color-text-primary)] font-medium">
                      {formatDate(event.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-tertiary)] mb-1">End Date</p>
                    <p className="text-[var(--color-text-primary)] font-medium">
                      {formatDate(event.end_date)}
                    </p>
                  </div>
                </div>

                {/* Location & Delegates */}
                  <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[var(--color-text-tertiary)] mb-1">Location</p>
                    {(() => {
                      const fullLocation = (event.location || event.city || 'N/A').toString();
                      const maxLen = 70;
                      const isLong = fullLocation.length > maxLen;

                      if (!isLong) {
                        return <p className="text-[var(--color-text-primary)] font-medium">{fullLocation}</p>;
                      }

                      return (
                        <span
                          className="text-[var(--color-text-primary)] font-medium block truncate max-w-[220px] cursor-pointer"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const isMobile = window.innerWidth < 1024;
                            setTooltip({
                              visible: true,
                              content: fullLocation,
                              x: isMobile ? '50%' : rect.left + rect.width / 2,
                              y: rect.top,
                              width: isMobile ? '90vw' : Math.min(420, rect.width + 120),
                            });
                          }}
                          onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                        >
                          {fullLocation.slice(0, maxLen)}...
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-right">
                    <p className="text-[var(--color-text-tertiary)] mb-1">Delegates</p>
                    <p className="text-[var(--color-text-primary)] font-semibold">
                      {event.total_delegates || 0}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => onViewEvent && onViewEvent(event)}
                  className="w-full py-2 px-4 bg-[var(--color-primary-blue)] text-white text-sm font-medium 
                             rounded-lg hover:bg-[var(--color-primary-blue-dark)] transition-colors"
                >
                  View Event
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translateX(-50%) translateY(-100%)',
            width: tooltip.width,
            maxWidth: 'calc(100% - 32px)',
          }}
          className="z-[99999] rounded-md bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-lg whitespace-pre-wrap"
        >
          {tooltip.content}
        </div>
      )}

    </div>
  );
};

export default UpcomingEventsTable;
