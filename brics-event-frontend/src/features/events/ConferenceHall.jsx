import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSignleEventDetails } from "../../services/events";
import { getEventHalls } from "../../services/conferenceHall";
import { CheckCircle, Calendar, MapPin, Building2 } from "lucide-react";
import { formatDateWithOrdinal } from "../../utils/formatDateWithOrdinal";

import AddConferenceHallDrawer from "../admin/components/AddConferenceHallDrawer";
import AssignHallDrawer from "../admin/components/AssignHallDrawer";

const ConferenceHall = () => {
  const { eventId } = useParams();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubEvent, setSelectedSubEvent] = useState(null);
  const [selectedHallForEdit, setSelectedHallForEdit] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Format date and time
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return timeString ? `${dateStr} · ${timeString}` : dateStr;
  };

  const formatEventDateRange = (startDate, startTime, endDate, endTime) => {
    const start = formatDateTime(startDate, startTime);
    const end = formatDateTime(endDate, endTime);
    return `${start} - ${end}`;
  };

  // Capitalize first letter
  const capitalizeFirstLetter = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const { data: eventData, isLoading } = useQuery({
    queryKey: ["event-details", eventId],
    queryFn: () => getSignleEventDetails(eventId),
    enabled: !!eventId,
  });

  const {
    data: hallsData,
    isLoading: hallsLoading,
    refetch: refetchHalls,
  } = useQuery({
    queryKey: ["event-halls", eventId],
    queryFn: () => getEventHalls(eventId),
    enabled: !!eventId,
  });

  const event = eventData?.data || null;
  const eventHalls = hallsData?.halls || [];
  // Only show halls not assigned to a session (main event halls)
  const mainHallsAssigned = eventHalls.filter((h) => !h.session_id);
  const sessionHalls = eventHalls.filter((h) => h.session_id); // Halls with sessions

  // Get sessions/sub-events from event data
  const sessions = event?.sessions || [];

  const getSessionName = (sessionId) => {
    const session = sessions.find(
      (s) => s.id === sessionId || s._id === sessionId
    );
    return session ? (session.name || session.title || "Unnamed Session") : "Unnamed Session";
  };

  if (isLoading || hallsLoading) {
    return (
      <div className="flex justify-center py-12 text-gray-500">Loading...</div>
    );
  }

  const handleAssignHall = (subEvent) => {
    setSelectedSubEvent(subEvent);
    setShowAssignModal(true);
  };

  const handleChangeHall = (hall) => {
    setSelectedHallForEdit(hall); // Edit the specific hall
    setSelectedSubEvent({ id: "main", name: "Main Event" });
    setShowAssignModal(true);
  };

  const handleRemoveHall = async () => {
    // TODO: Connect to API to remove the hall
    // Call API endpoint to remove the hall here
  };

  const handleAssignSubmit = () => {
    refetchHalls();
    setShowAssignModal(false);
    setSelectedSubEvent(null);
  };

  const handleAddConferenceHall = () => {
    refetchHalls();
    setShowAddModal(false);
  };

  if (mainHallsAssigned.length === 0) {
    return (
      <div className="">
        {/* EMPTY STATE */}
        <div className="mt-10 flex flex-col items-center space-y-3">
          <div className="bg-blue-100 p-4 rounded-full">
            <Building2 size={48} className="text-[#1f4788] md:w-14 md:h-14" />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
            Conference Hall not added
          </h2>
          <p className="text-sm md:text-base text-gray-400">
            Assign a conference hall for this event.
          </p>

          <button
            onClick={() => {
              setShowAssignModal(true);
            }}
            className="rounded-lg bg-[#1f4788] px-8 py-3 text-sm md:text-base font-medium text-white hover:bg-[#163766] transition"
          >
            Assign Hall
          </button>
        </div>

        {/* ASSIGN HALL DRAWER */}
        <AssignHallDrawer
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssignSubmit}
          eventId={eventId}
          initialStartDate={event?.start_date}
          initialEndDate={event?.end_date}
        />
      </div>
    );
  }

  return (
    <div className="">
      {/* ✅ EVENT HEADER CARD */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex justify-between items-start mb-4">
          {/* Left Side */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900 capitalize">
                {event?.name || "Event Name"}
              </h2>

              {/* Badge */}
              {event?.category && (
                <span className="text-[11px] md:text-xs lg:text-sm px-2 py-[2px] rounded-full bg-blue-100 text-[#1f4788] font-medium capitalize">
                  {capitalizeFirstLetter(event.category)}
                </span>
              )}
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-gray-600">
              <Calendar size={24} />
              {formatEventDateRange(
                event?.start_date,
                event?.start_time,
                event?.end_date,
                event?.end_time,
              ) || "Date not available"}
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-gray-600">
              <MapPin size={24} />
              {event?.location
                ? `${event.location}${event?.venue ? `, ${event.venue}` : ""}`
                : "Location not specified"}
            </div>
          </div>

          {/* Change Hall Button - Top Right */}
          {mainHallsAssigned.length > 0 && (
            <button
              onClick={() => handleChangeHall(mainHallsAssigned[0])}
              className="px-4 py-1.5 rounded-md bg-[#1f4788] text-white text-xs md:text-sm font-medium hover:bg-[#163766] transition whitespace-nowrap"
            >
              Modify Hall
            </button>
          )}
        </div>

        {/* ✅ Assigned Halls - Show All */}
        <div className="mt-4 space-y-2">
          {mainHallsAssigned.map((hall, index) => (
            <div
              key={hall._id || index}
              className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex gap-2"
            >
              <CheckCircle
                size={18}
                className="text-green-600 mt-[2px] flex-shrink-0 md:w-5 md:h-5"
              />

              <div className="flex-1">
                <p className="text-xs md:text-sm font-semibold text-green-700">
                  Conference Hall Assigned{" "}
                  {mainHallsAssigned.length > 1 &&
                    `(${index + 1}/${mainHallsAssigned.length})`}
                </p>

                <p className="text-[11px] md:text-xs lg:text-sm text-gray-600 mt-1">
                  Conference Hall: {capitalizeFirstLetter(hall?.hall_name)}{" "}
                  &nbsp;&nbsp; Venue: {capitalizeFirstLetter(hall?.venue_name)}{" "}
                  &nbsp;&nbsp; Floor: {capitalizeFirstLetter(hall?.floor_name)}{" "}
                  &nbsp;&nbsp; Capacity: {hall?.capacity} &nbsp;&nbsp; Video
                  Conference:{" "}
                  {hall?.video_conference_enabled ? "Enabled" : "Disabled"}
                </p>

                {hall?.start_date && hall?.end_date && (
                  <p className="text-[11px] md:text-xs lg:text-sm text-gray-600 mt-1">
                    📅 <strong>Booking:</strong>{" "}
                    {formatDateWithOrdinal(hall.start_date)} to{" "}
                    {formatDateWithOrdinal(hall.end_date)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ SUB EVENTS */}
      <div className="space-y-3">
        {sessionHalls && sessionHalls.length > 0 ? (
          sessionHalls.map((hall) => (
            <div
              key={hall._id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4"
            >
              <div className="flex justify-between items-start">
                {/* Left */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900">
                      {/* {getSessionName(hall.session_id)} */}
                      {hall.session_name || "Unnamed Session"}
                    </h3>
                    <span className="text-[11px] md:text-xs lg:text-sm px-2 py-[2px] rounded-full bg-blue-100 text-blue-700 font-medium">
                      Session
                    </span>
                  </div>

                  {/* Date */}
                  {hall.start_date && hall.end_date && (
                    <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-gray-600">
                      <Calendar size={14} className="md:w-4 md:h-4" />
                      {formatDateWithOrdinal(hall.start_date)} to{" "}
                      {formatDateWithOrdinal(hall.end_date)}
                    </div>
                  )}

                  {/* Conference Hall Details */}
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex gap-2">
                    <CheckCircle
                      size={18}
                      className="text-green-600 mt-[2px] flex-shrink-0 md:w-5 md:h-5"
                    />
                    <div className="flex-1">
                      <p className="text-xs md:text-sm font-semibold text-green-700">
                        Conference Hall Assigned
                      </p>
                      <p className="text-[11px] md:text-xs lg:text-sm text-gray-600 mt-1">
                        Conference Hall: {capitalizeFirstLetter(hall?.hall_name)}{" "}
                        &nbsp;&nbsp; Venue: {capitalizeFirstLetter(hall?.venue_name)}{" "}
                        &nbsp;&nbsp; Floor: {capitalizeFirstLetter(hall?.floor_name)}{" "}
                        &nbsp;&nbsp; Capacity: {hall?.capacity} &nbsp;&nbsp; Video
                        Conference:{" "}
                        {hall?.video_conference_enabled ? "Enabled" : "Disabled"}
                      </p>

                      {/* Booking Date Range for Sub Event */}
                      {hall.start_date && hall.end_date && (
                        <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-gray-600">
                          <Calendar size={14} className="md:w-4 md:h-4" />
                          <span>
                            <strong>Booking:</strong> {formatDateWithOrdinal(hall.start_date)} to {formatDateWithOrdinal(hall.end_date)}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Right Button */}
                <button
                  onClick={() => handleChangeHall(hall)}
                  className="ml-4 px-4 py-1.5 rounded-md bg-[#1f4788] text-white text-xs md:text-sm font-medium hover:bg-[#163766] transition whitespace-nowrap"
                >
                  Modify Hall
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-center text-gray-500">
            <p className="text-sm md:text-base">
              No sessions/sub-events available
            </p>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedSubEvent && (
        <AssignHallDrawer
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedSubEvent(null);
            setSelectedHallForEdit(null);
          }}
          eventId={eventId}
          hallData={selectedHallForEdit}
          subEvent={selectedSubEvent}
          onAssign={handleAssignSubmit}
          changeMode={!!selectedHallForEdit}
          initialStartDate={event?.start_date}
          initialEndDate={event?.end_date}
        />
      )}
    </div>
  );
};

export default ConferenceHall;
