import React, { useState, useEffect } from "react";
import { X, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  assignHallToEvent,
  getAvailableHalls,
  getEventHalls,
  unassignHall,
} from "../../../services/conferenceHall";
import { getEvents, getManagerEvents } from "../../../services/events";
import { formatDateWithOrdinal } from "../../../utils/formatDateWithOrdinal";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import DeleteConfirmModal from "../../../components/common/DeleteConfirmModal";
import AddConferenceHallDrawer from "./AddConferenceHallDrawer";

const AssignHallDrawer = ({
  isOpen,
  onClose,
  hallData,
  eventId,
  onAssign,
  changeMode = false,
  onAddHall, // Callback to open Add Conference Hall drawer
  initialStartDate, // Pre-populate start date from event
  initialEndDate, // Pre-populate end date from event
}) => {
  const [formData, setFormData] = useState({
    selectEvent: "",
    selectedHallId: "",
    startDate: "",
    endDate: "",
  });
  const [selectedHall, setSelectedHall] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hallToRemove, setHallToRemove] = useState(null);
  const [showAddHallDrawer, setShowAddHallDrawer] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  /* ✅ Error State */
  const [errors, setErrors] = useState({});

  /* ✅ Get current user */
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const normalizedRole =
    typeof currentUser?.role?.name === "string"
      ? currentUser.role.name.trim().toUpperCase()
      : "";
  const isEventManager = normalizedRole === "EVENT MANAGER";

  // Capitalize first letter
  const capitalizeFirstLetter = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  /* ✅ Fetch available halls */
  const {
    data: availableHallsData,
    isLoading: hallsLoading,
    isError: hallsError,
    error: hallsErrorMsg,
  } = useQuery({
    queryKey: [
      "available-halls",
      eventId,
      formData.startDate,
      formData.endDate,
      formData.selectEvent,
    ],
    queryFn: async () => {
      const params = {};
      if (formData.startDate) {
        params.start_date = formData.startDate;
      }
      if (formData.endDate) {
        params.end_date = formData.endDate;
      }
      // Add event_id to check availability for same event with different dates
      if (formData.selectEvent) {
        params.event_id = formData.selectEvent;
      }

      // Only fetch if we have both dates
      if (formData.startDate && formData.endDate) {
        const result = await getAvailableHalls(params);
        return result;
      }
      return Promise.resolve({ halls: [] });
    },
    enabled:
      isOpen &&
      (!eventId || !hallData || changeMode) && // ✅ Fetch if: admin mode (!eventId) OR no hallData OR changeMode
      !!formData.startDate &&
      !!formData.endDate,
    retry: 1,
  });

  // Don't filter by status here - backend should return only available halls for the given dates/event
  const availableHalls =
    availableHallsData?.halls || availableHallsData?.data || [];

  /* ✅ Fetch events based on user role */
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: isEventManager ? ["manager-events"] : ["events-list"],
    queryFn: () => (isEventManager ? getManagerEvents() : getEvents()),
    enabled: !userLoading,
    staleTime: 2 * 60 * 1000,
  });

  const eventsList = Array.isArray(eventsData?.events)
    ? eventsData.events
    : Array.isArray(eventsData?.data)
      ? eventsData.data
      : Array.isArray(eventsData)
        ? eventsData
        : [];

  /* ✅ Map events with correct ID structure and filter for upcoming events */
  const mappedEventsList = eventsList
    .map((event) => ({
      _id: event._id || event.id || event.event_id,
      id: event._id || event.id || event.event_id,
      event_name:
        event.event_name || event.name || event.title || "Unnamed Event",
      start_date: event.start_date || event.event_start_date || "",
      end_date: event.end_date || event.event_end_date || "",
    }))
    .filter((event) => {
      // Filter for upcoming events only (end_date >= today)
      if (!event.end_date) return false;
      const eventEndDate = new Date(event.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      return eventEndDate >= today;
    });

  /* ✅ Get selected event's date range */
  const getEventDateRange = (eventId) => {
    if (!eventId) return { start: null, end: null };
    const event = mappedEventsList.find(
      (e) => e._id === eventId || e.id === eventId,
    );
    if (!event) return { start: null, end: null };

    const startDate = event.start_date ? event.start_date.split("T")[0] : null;
    const endDate = event.end_date ? event.end_date.split("T")[0] : null;

    return { start: startDate, end: endDate };
  };

  /* ✅ Get selected event name for display */
  const getSelectedEventName = () => {
    if (!formData.selectEvent) return "Select Event";
    const selectedEvent = mappedEventsList.find(
      (event) => (event.id || event._id) === formData.selectEvent,
    );
    return selectedEvent ? selectedEvent.event_name : "Select Event";
  };

  /* ✅ Mutation for assigning hall */
  const assignMutation = useMutation({
    mutationFn: ({ hallId, assignmentData }) =>
      assignHallToEvent(hallId, assignmentData),
    onSuccess: () => {
      toast.success("Hall assigned successfully");

      // If eventId exists (from event page), refresh and keep drawer open
      if (eventId) {
        refetchEventHalls();
        // Reset form to allow adding another hall
        setSelectedHall(null);
        setFormData((prev) => ({
          ...prev,
          startDate: "",
          endDate: "",
        }));
        setSearchTerm("");
        onAssign(); // Refresh parent component
      } else {
        // From admin page, close drawer
        onAssign();
        onClose();
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to assign hall");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  /* ✅ Fetch existing event halls when eventId is provided OR when editing a hall with event_id */
  const hallEventId = eventId || hallData?.event_id;

  const {
    data: eventHallsData,
    isLoading: eventHallsLoading,
    refetch: refetchEventHalls,
  } = useQuery({
    queryKey: ["event-halls", hallEventId],
    queryFn: () => getEventHalls(hallEventId),
    enabled: isOpen && !!hallEventId,
  });

  const eventHalls = eventHallsData?.halls || [];

  // Filter out already assigned halls from available halls list AND exclude current hall
  const availableHallsFiltered = availableHalls.filter((hall) => {
    const hallId = hall._id || hall.id;
    const currentHallId = hallData?._id || hallData?.id;

    // ✅ Exclude: 1) Already assigned halls, 2) Current hall being edited
    return (
      !eventHalls.some(
        (assignedHall) => (assignedHall._id || assignedHall.id) === hallId,
      ) && hallId !== currentHallId
    );
  });

  /* ✅ Mutation for unassigning/removing hall */
  const unassignMutation = useMutation({
    mutationFn: ({ hallId }) => unassignHall(hallId, { event_id: eventId }),
    onSuccess: () => {
      toast.success("Hall removed successfully");
      refetchEventHalls();
      onAssign(); // Refresh parent component
      setShowDeleteModal(false);
      setHallToRemove(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to remove hall");
      setShowDeleteModal(false);
      setHallToRemove(null);
    },
  });

  const handleRemoveHall = (hall) => {
    setHallToRemove(hall);
    setShowDeleteModal(true);
  };

  const confirmRemoveHall = () => {
    if (hallToRemove) {
      unassignMutation.mutate({ hallId: hallToRemove._id || hallToRemove.id });
    }
  };

  /* ANIMATION TRIGGER */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  /* Initialize form with event dates when drawer opens */
  useEffect(() => {
    if (isOpen && initialStartDate && initialEndDate && eventId) {
      const formatDateForInput = (dateValue) => {
        if (!dateValue) return "";
        try {
          const date = new Date(dateValue);
          if (Number.isNaN(date.getTime())) return "";
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        } catch (e) {
          return "";
        }
      };

      setFormData((prevData) => ({
        ...prevData,
        startDate: formatDateForInput(initialStartDate),
        endDate: formatDateForInput(initialEndDate),
      }));
    }
  }, [isOpen, initialStartDate, initialEndDate, eventId]);

  /* CLOSE WITH ANIMATION */
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  /* ESC KEY */
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && handleClose();
    if (isOpen) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen]);

  /* BODY LOCK */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [isOpen]);

  /* Reset when drawer opens */
  useEffect(() => {
    if (isOpen) {
      // Helper function to format dates for input
      const formatDateForInput = (dateValue) => {
        if (!dateValue) return "";
        try {
          const date = new Date(dateValue);
          if (Number.isNaN(date.getTime())) return "";
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        } catch (e) {
          return "";
        }
      };

      /* ✅ PRIORITIZE DATES FROM FILTER (initialStartDate/initialEndDate) OVER HALL DATES
         This allows assigning the same hall to multiple events with different date ranges.
         If user has selected a date range in the filter and clicks "Assign Hall",
         those filter dates should be pre-filled in the form.
      */
      setFormData({
        selectEvent: eventId || hallData?.event_id || "",
        selectedHallId: hallData?._id || hallData?.id || "",
        startDate: initialStartDate
          ? formatDateForInput(initialStartDate)
          : hallData?.start_date
            ? hallData.start_date.split("T")[0]
            : "",
        endDate: initialEndDate
          ? formatDateForInput(initialEndDate)
          : hallData?.end_date
            ? hallData.end_date.split("T")[0]
            : "",
      });
      // ✅ If hallData exists (assigning specific hall), set it as selected
      setSelectedHall(hallData || null);
      setErrors({});
      setSearchTerm("");
    }
  }, [isOpen, eventId, hallData, initialStartDate, initialEndDate]);

  /* ✅ Validation Function for Admin */
  const validateFormAdmin = () => {
    let newErrors = {};

    // Only validate selectEvent if eventId prop is not provided
    if (!eventId && !formData.selectEvent) {
      newErrors.selectEvent = "Select Event is required";
    }

    if (!hallData && !selectedHall?.id) {
      newErrors.selectedHallId = "Please select a hall";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start Date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End Date is required";
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = "End Date must be after Start Date";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleAssign = () => {
    if (!validateFormAdmin() || isSubmitting) return;

    setIsSubmitting(true);

    const hallId =
      selectedHall?._id || selectedHall?.id || hallData?._id || hallData?.id;

    const assignmentData = {
      event_id:
        formData.selectEvent && formData.selectEvent.trim() !== ""
          ? formData.selectEvent
          : eventId,
      start_date: formData.startDate,
      end_date: formData.endDate,
    };

    assignMutation.mutate({ hallId, assignmentData });
  };

  if (!isOpen) return null;

  // Always render the drawer - let internal conditional rendering handle states
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${
          isAnimating ? "opacity-40" : "opacity-0"
        }`}
        onClick={handleClose}
        style={{ margin: 0, padding: 0 }}
      />

      {/* Drawer - Mobile: bottom sheet, Desktop: side drawer */}
      <aside
        className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-2xl max-h-[calc(100vh-64px)]
          sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl
          md:w-[700px] lg:w-[820px]
          ${
            isAnimating
              ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
          }`}
        style={{ top: "64px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
            {changeMode
              ? "Change Conference Hall"
              : eventId
                ? "Add Conference Hall"
                : "Assign Hall to Event"}
          </h2>

          <div className="flex items-center gap-2">
            {eventId && (
              <button
                onClick={() => setShowAddHallDrawer(true)}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-[#1f4788] rounded-md hover:bg-[#163766] transition-colors whitespace-nowrap"
              >
                Add Conference Hall
              </button>
            )}
            <button
              onClick={handleClose}
              type="button"
              className="hover:bg-gray-100 rounded-md p-1.5 sm:p-2 -mr-1"
            >
              <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* ✅ Currently Assigned Halls Section */}
          {/* ✅ Currently Assigned Halls Section */}
          {eventId && eventHalls.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-semibold text-blue-900">
                  Currently Assigned Halls ({eventHalls.length})
                </h3>
              </div>

              <div className="space-y-2">
                {eventHalls.map((hall) => (
                  <div
                    key={hall._id || hall.id}
                    className="bg-white rounded-lg p-2 sm:p-3 flex items-start sm:items-center justify-between border border-blue-200 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                        {capitalizeFirstLetter(hall.hall_name)}
                      </p>
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-[11px] sm:text-xs text-gray-600">
                        <span className="truncate">
                          📍 {capitalizeFirstLetter(hall.venue_name)}
                        </span>
                        <span className="truncate">
                          🏢 {capitalizeFirstLetter(hall.floor_name)}
                        </span>
                        <span>👥 {hall.capacity}</span>
                      </div>
                      {hall.start_date && hall.end_date && (
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                          📅 {formatDateWithOrdinal(hall.start_date)} to{" "}
                          {formatDateWithOrdinal(hall.end_date)}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoveHall(hall)}
                      disabled={unassignMutation.isLoading}
                      className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                      title="Remove hall"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No halls message */}
          {eventId && eventHalls.length === 0 && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                No halls assigned yet. Add your first hall below.
              </p>
            </div>
          )}

          {/* Add New Hall Divider */}
          {eventId && eventHalls.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Add Another Hall
              </span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
          )}

          {/* ✅ Info Message: Multi-Event Assignment Feature */}
          {!eventId && hallData && (
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
              <p className="text-xs text-blue-800 leading-relaxed">
                <span className="font-semibold">
                  💡 Multi-Event Assignment:
                </span>{" "}
                This hall can be assigned to multiple events on{" "}
                <strong>different (non-overlapping) dates</strong>. Simply
                select a new event and date range below. The system will ensure
                there are no booking conflicts.
              </p>
            </div>
          )}

          {/* Event Selection - Hide when eventId is passed as prop */}
          {!eventId && (
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Select Event <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.selectEvent}
                onChange={(e) => {
                  setFormData({ ...formData, selectEvent: e.target.value });
                  setErrors({ ...errors, selectEvent: "" });
                }}
                className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border 
                ${errors.selectEvent ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">
                  {eventsLoading ? "Loading events..." : "Select Event"}
                </option>
                {!eventsLoading &&
                  mappedEventsList.length > 0 &&
                  mappedEventsList.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.event_name}
                    </option>
                  ))}
              </select>
              {errors.selectEvent && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.selectEvent}
                </p>
              )}
            </div>
          )}

          {/* Date Range Fields */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              BOOKING PERIOD
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Start Date */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    setErrors({ ...errors, startDate: "" });
                  }}
                  min={getEventDateRange(formData.selectEvent || eventId).start}
                  max={getEventDateRange(formData.selectEvent || eventId).end}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.startDate && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.startDate}
                  </p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                    setErrors({ ...errors, endDate: "" });
                  }}
                  min={
                    formData.startDate ||
                    getEventDateRange(formData.selectEvent || eventId).start
                  }
                  max={getEventDateRange(formData.selectEvent || eventId).end}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.endDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 mb-1">
                  📅 <strong>Booking Period:</strong>{" "}
                  {formatDateWithOrdinal(formData.startDate)} to{" "}
                  {formatDateWithOrdinal(formData.endDate)}
                </p>
                <p className="text-xs text-blue-600">
                  Showing halls available for these dates. Same hall can be
                  booked for the same event with different non-overlapping
                  dates.
                </p>
              </div>
            )}
          </div>

          {/* ✅ ADMIN MODAL - Show selected hall info (when hallData exists) */}
          {!eventId && hallData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                🏢 Conference Hall to Assign
              </p>
              <div className="bg-white p-3 rounded-lg border-2 border-[#0B2F6A]">
                <p className="font-semibold text-gray-900 text-lg">
                  {hallData.hall_name || hallData.name}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-500">📍 Venue:</span>
                    <span className="ml-1 font-medium">
                      {hallData.venue_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">🏢 Floor:</span>
                    <span className="ml-1 font-medium">
                      {hallData.floor_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">👥 Capacity:</span>
                    <span className="ml-1 font-medium">
                      {hallData.capacity}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">📍 City:</span>
                    <span className="ml-1 font-medium">{hallData.city}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                ✅ This hall will be assigned to the selected event for the
                specified dates
              </p>
            </div>
          )}

          {/* ✅ ADMIN MODAL - Simple Hall List (only when NO hallData - selecting from list) */}
          {!eventId && !hallData && (
            <>
              {hallsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-red-700">
                    ❌ Error loading halls:{" "}
                    {hallsErrorMsg?.message || "Something went wrong"}
                  </p>
                </div>
              )}
              {!formData.selectEvent ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-600 mb-1">
                    Please select an event first
                  </p>
                  <p className="text-xs text-gray-500">
                    ↑ Choose an event from the dropdown above
                  </p>
                </div>
              ) : !formData.startDate || !formData.endDate ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-600 mb-1">
                    Please select booking dates
                  </p>
                  <p className="text-xs text-gray-500">
                    ↑ Choose start and end dates above
                  </p>
                </div>
              ) : hallsLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">
                    Loading available halls...
                  </p>
                </div>
              ) : availableHallsFiltered.length === 0 ? (
                <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-700 mb-2">
                    No halls available for selected dates
                  </p>
                  <p className="text-xs text-gray-600">
                    Try different dates or check if halls are already booked
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-medium mb-3">
                    📍 Available Conference Halls
                  </p>
                  <div className="space-y-2">
                    {availableHallsFiltered.map((hall) => {
                      const hallId = hall._id || hall.id;
                      return (
                        <div
                          key={hallId}
                          onClick={() => setSelectedHall(hall)}
                          className={`p-3 rounded-lg cursor-pointer transition border-2 ${
                            selectedHall?._id === hallId ||
                            selectedHall?.id === hallId
                              ? "border-[#0B2F6A] bg-white"
                              : "border-blue-200 bg-white hover:border-[#0B2F6A]"
                          }`}
                        >
                          <p className="font-semibold text-gray-900">
                            {hall.hall_name}
                          </p>
                          <div className="flex gap-4 mt-1 text-xs text-gray-600">
                            <span>📍 {hall.venue_name}</span>
                            <span>🏢 {hall.floor_name}</span>
                            <span>👥 {hall.capacity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ✅ EVENT MODAL - Full Selection with Search (with eventId) */}
          {eventId && (
            <>
              {/* Search Bar */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search by hall name, venue, floor, state, city, or capacity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-4 block">
                  Select a Conference Hall{" "}
                  <span className="text-red-500">*</span>
                </label>
                {availableHallsFiltered
                  .filter((hall) => {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                      (
                        hall.hall_name ||
                        hall.conferenceHallName ||
                        hall.name ||
                        ""
                      )
                        .toLowerCase()
                        .includes(searchLower) ||
                      (hall.venue_name || hall.venueName || "")
                        .toLowerCase()
                        .includes(searchLower) ||
                      (hall.floor_name || hall.floor || "")
                        .toLowerCase()
                        .includes(searchLower) ||
                      (hall.state || "").toLowerCase().includes(searchLower) ||
                      (hall.city || "").toLowerCase().includes(searchLower) ||
                      String(hall.capacity || "").includes(searchLower)
                    );
                  })
                  .map((hall) => {
                    const hallId = hall._id || hall.id;
                    const isCurrentHall =
                      changeMode &&
                      hallData &&
                      (hallData._id === hallId || hallData.id === hallId);
                    return (
                      <div
                        key={hallId}
                        className="flex items-start p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition"
                        onClick={() => {
                          setSelectedHall(hall);
                          setErrors({ ...errors, selectedHall: "" });
                        }}
                      >
                        {/* Custom Radio Button */}
                        <input
                          type="radio"
                          name="conference-hall"
                          value={hallId}
                          checked={
                            selectedHall
                              ? selectedHall._id === hallId ||
                                selectedHall.id === hallId
                              : isCurrentHall
                          }
                          onChange={() => {
                            setSelectedHall(hall);
                            setErrors({ ...errors, selectedHall: "" });
                          }}
                          className="sr-only"
                        />

                        {/* Custom Radio Circle */}
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-1
                        ${
                          (
                            selectedHall
                              ? selectedHall._id === hallId ||
                                selectedHall.id === hallId
                              : isCurrentHall
                          )
                            ? "border-[#0B2F6A]"
                            : "border-gray-300"
                        }`}
                        >
                          {/* Inner dot */}
                          <div
                            className={`w-2 h-2 rounded-full bg-[#0B2F6A] transition-all duration-200
                          ${
                            (
                              selectedHall
                                ? selectedHall._id === hallId ||
                                  selectedHall.id === hallId
                                : isCurrentHall
                            )
                              ? "scale-100 opacity-100"
                              : "scale-0 opacity-0"
                          }`}
                          />
                        </div>

                        {/* Hall Details */}
                        <div className="ml-3 sm:ml-4 flex-1">
                          <p className="text-sm sm:text-base font-semibold text-gray-900">
                            {(
                              hall.hall_name ||
                              hall.conferenceHallName ||
                              hall.name
                            )
                              ?.charAt(0)
                              .toUpperCase() +
                              (
                                hall.hall_name ||
                                hall.conferenceHallName ||
                                hall.name
                              )
                                ?.slice(1)
                                .toLowerCase()}
                          </p>

                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs text-gray-600">
                            <div>
                              <p className="text-gray-500">Venue Name</p>
                              <p className="font-medium text-gray-900">
                                {(
                                  hall.venue_name ||
                                  hall.venueName ||
                                  hall.buildingName ||
                                  "N/A"
                                )
                                  ?.charAt(0)
                                  .toUpperCase() +
                                  (
                                    hall.venue_name ||
                                    hall.venueName ||
                                    hall.buildingName ||
                                    "N/A"
                                  )
                                    ?.slice(1)
                                    .toLowerCase()}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">Floor</p>
                              <p className="font-medium text-gray-900">
                                {(
                                  hall.floor_name ||
                                  hall.floor ||
                                  hall.floorName ||
                                  "N/A"
                                )
                                  ?.charAt(0)
                                  .toUpperCase() +
                                  (
                                    hall.floor_name ||
                                    hall.floor ||
                                    hall.floorName ||
                                    "N/A"
                                  )
                                    ?.slice(1)
                                    .toLowerCase()}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">Capacity</p>
                              <p className="font-medium text-gray-900">
                                {hall.capacity || "N/A"}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">Video Conference</p>
                              <p className="font-medium text-gray-900">
                                {hall.video_conference_enabled ||
                                hall.videoConferenceEnabled ||
                                hall.videoEnabled
                                  ? "Enabled"
                                  : "Disabled"}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">City</p>
                              <p className="font-medium text-gray-900">
                                {(hall.city || "N/A")?.charAt(0).toUpperCase() +
                                  (hall.city || "N/A")?.slice(1).toLowerCase()}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">State</p>
                              <p className="font-medium text-gray-900">
                                {(hall.state || "N/A")
                                  ?.charAt(0)
                                  .toUpperCase() +
                                  (hall.state || "N/A")?.slice(1).toLowerCase()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* No Results Message */}
                {availableHallsFiltered.length > 0 &&
                  availableHallsFiltered.filter((hall) => {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                      (
                        hall.hall_name ||
                        hall.conferenceHallName ||
                        hall.name ||
                        ""
                      )
                        .toLowerCase()
                        .includes(searchLower) ||
                      (hall.venue_name || hall.venueName || "")
                        .toLowerCase()
                        .includes(searchLower) ||
                      (hall.floor_name || hall.floor || "")
                        .toLowerCase()
                        .includes(searchLower) ||
                      (hall.state || "").toLowerCase().includes(searchLower) ||
                      (hall.city || "").toLowerCase().includes(searchLower) ||
                      String(hall.capacity || "").includes(searchLower)
                    );
                  }).length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-2">
                        No conference halls found matching your search.
                      </p>
                      {formData.selectEvent &&
                        formData.startDate &&
                        formData.endDate && (
                          <p className="text-xs text-blue-600">
                            💡 Tip: Halls already booked for the same event with
                            different non-overlapping dates can also be
                            assigned.
                          </p>
                        )}
                    </div>
                  )}
              </div>

              {/* Error Message */}
              {errors.selectedHall && (
                <p className="text-xs text-red-500 mt-3">
                  {errors.selectedHall}
                </p>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t bg-white sm:rounded-b-2xl">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {eventId && eventHalls.length > 0 ? "Done" : "Cancel"}
          </button>

          <button
            onClick={handleAssign}
            disabled={!selectedHall}
            className="w-full sm:w-auto px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-[#0B2F6A] text-white text-sm font-semibold hover:bg-[#092754] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {changeMode ? "Change Hall" : eventId ? "Add Hall" : "Assign"}
          </button>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setHallToRemove(null);
        }}
        onConfirm={confirmRemoveHall}
        title="Remove Conference Hall"
        message="Are you sure you want to remove this conference hall from the event?"
        itemName={
          hallToRemove ? capitalizeFirstLetter(hallToRemove.hall_name) : ""
        }
        isLoading={unassignMutation.isLoading}
        confirmText="Remove"
        loadingText="Removing..."
      />

      {/* Add Conference Hall Drawer */}
      <AddConferenceHallDrawer
        isOpen={showAddHallDrawer}
        onClose={() => setShowAddHallDrawer(false)}
        onAdd={() => {
          setShowAddHallDrawer(false);
        }}
        eventId={eventId}
        eventData={null}
      />
    </>
  );
};

export default AssignHallDrawer;
