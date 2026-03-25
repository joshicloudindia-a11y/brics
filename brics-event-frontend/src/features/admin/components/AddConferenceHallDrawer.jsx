import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { State, City } from "country-state-city";
import SearchableSelect from "../../../components/common/SearchableSelect";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createConferenceHall,
  createMultipleConferenceHalls,
  updateConferenceHall,
} from "../../../services/conferenceHall";
import { getEvents, getManagerEvents } from "../../../services/events";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

/* ✅ Initial Form */
const initialFormState = {
  conferenceHallName: "",
  venueName: "",
  floorName: "",
  state: "",
  stateCode: "",
  city: "",
  capacity: "",
  videoConferenceEnabled: "",
  selectEvent: "",
  startDate: "",
  endDate: "",
};

const AddConferenceHallDrawer = ({
  isOpen,
  onClose,
  onAdd,
  editHallData,
  eventId,
  eventData,
}) => {
  const [halls, setHalls] = useState([
    {
      id: 1,
      data: { ...initialFormState },
      errors: {},
    },
  ]);

  const [nextId, setNextId] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  /* ✅ Get current user */
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const normalizedRole =
    typeof currentUser?.role?.name === "string"
      ? currentUser.role.name.trim().toUpperCase()
      : "";
  const isEventManager = normalizedRole === "EVENT MANAGER";

  /* ✅ Animation handling */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  /* ✅ ESC key handler */
  /* Duplicate ESC handler removed (handled earlier) */

  /* ✅ Body scroll lock */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ✅ Fetch all events */
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: isEventManager ? ["manager-events"] : ["events-list"],
    queryFn: () => (isEventManager ? getManagerEvents() : getEvents()),
    enabled: !userLoading,
  });

  const eventsList = Array.isArray(eventsData?.events)
    ? eventsData.events
    : Array.isArray(eventsData?.data)
      ? eventsData.data
      : Array.isArray(eventsData)
        ? eventsData
        : [];

  /* ✅ Map events with correct ID structure */
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

  /* ✅ Mutation for creating halls */
  const createMutation = useMutation({
    mutationFn: (hallsData) => {
      if (hallsData.length === 1) {
        return createConferenceHall(hallsData[0]);
      }
      return createMultipleConferenceHalls({ halls: hallsData });
    },
    onSuccess: () => {
      toast.success(`Conference Hall(s) created successfully`);
      onAdd();
      handleClose();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to create conference hall",
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  /* ✅ Mutation for updating hall */
  const updateMutation = useMutation({
    mutationFn: ({ hallId, hallData }) =>
      updateConferenceHall(hallId, hallData),
    onSuccess: () => {
      toast.success("Conference Hall updated successfully");
      onAdd();
      handleClose();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to update conference hall",
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  /* ✅ ESC KEY CLOSE */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  /* ✅ Edit Mode Fill */
  useEffect(() => {
    if (editHallData && isOpen) {
      // Find the state code for the given state name
      const allStates = State.getStatesOfCountry("IN"); // India
      const stateName = (editHallData.state || "").trim();
      const stateObj = allStates.find(
        (s) => s.name.toLowerCase() === stateName.toLowerCase(),
      );
      const stateCode = stateObj?.isoCode || "";

      setHalls([
        {
          id: 1,
          data: {
            conferenceHallName:
              editHallData.hall_name || editHallData.conferenceHallName || "",
            venueName: editHallData.venue_name || editHallData.venueName || "",
            floorName: editHallData.floor_name || editHallData.floor || "",
            state: editHallData.state || "",
            stateCode: stateCode,
            city: editHallData.city || "",
            capacity: String(editHallData.capacity) || "",
            videoConferenceEnabled: editHallData.video_conference_enabled
              ? "Yes"
              : "No",
            selectEvent: editHallData.event_id || eventId || "",
            startDate: editHallData.start_date
              ? editHallData.start_date.split("T")[0]
              : "",
            endDate: editHallData.end_date
              ? editHallData.end_date.split("T")[0]
              : "",
          },
          errors: {},
        },
      ]);
    } else if (!editHallData && isOpen) {
      // Reset to initial state when adding new hall
      setHalls([
        {
          id: 1,
          data: {
            ...initialFormState,
            selectEvent: eventId || "",
          },
          errors: {},
        },
      ]);
      setNextId(2);
    }
  }, [editHallData, isOpen, eventId]);

  /* ✅ Input Change + Remove Error */
  const handleInputChange = (hallId, field, value) => {
    // Filter floor name to only allow alphanumeric characters and spaces
    let filteredValue = value;
    if (field === "floorName") {
      filteredValue = value.replace(/[^a-zA-Z0-9\s]/g, "");
    }

    setHalls((prev) =>
      prev.map((hall) =>
        hall.id === hallId
          ? {
              ...hall,
              data: {
                ...hall.data,
                [field]: filteredValue,
                ...(field === "stateCode" ? { city: "" } : {}),
                // Clear dates when event is deselected
                ...(field === "selectEvent" && !value
                  ? { startDate: "", endDate: "" }
                  : {}),
              },
              errors: { ...hall.errors, [field]: "" },
            }
          : hall,
      ),
    );
  };

  /* ✅ Validation */
  const validateHall = (hall) => {
    let errors = {};

    if (!hall.data.conferenceHallName.trim())
      errors.conferenceHallName = "Conference Hall Name is required";

    if (!hall.data.venueName.trim())
      errors.venueName = "Venue Name is required";

    if (!hall.data.floorName.trim())
      errors.floorName = "Floor Name is required";

    if (!hall.data.state.trim()) errors.state = "State is required";

    if (!hall.data.city.trim()) errors.city = "City is required";

    if (!hall.data.capacity.trim()) errors.capacity = "Capacity is required";
    else if (
      isNaN(Number(hall.data.capacity)) ||
      Number(hall.data.capacity) < 1
    )
      errors.capacity = "Capacity must be at least 1";

    if (!hall.data.videoConferenceEnabled.trim())
      errors.videoConferenceEnabled = "Video Conference selection is required";

    // Validate dates if event is selected
    if (hall.data.selectEvent) {
      if (!hall.data.startDate.trim()) {
        errors.startDate = "Start Date is required when event is selected";
      }
      if (!hall.data.endDate.trim()) {
        errors.endDate = "End Date is required when event is selected";
      }
      if (hall.data.startDate && hall.data.endDate) {
        if (new Date(hall.data.startDate) > new Date(hall.data.endDate)) {
          errors.endDate = "End Date must be after Start Date";
        }
      }
    }

    return errors;
  };

  /* ✅ Add More */
  const handleAddMore = () => {
    if (editHallData) return;

    const newId = nextId;
    setNextId(newId + 1);

    setHalls((prev) => [
      ...prev,
      {
        id: newId,
        data: { ...initialFormState },
        errors: {},
      },
    ]);
  };

  /* ✅ Remove Hall */
  const handleRemoveHall = (hallId) => {
    if (halls.length === 1) {
      toast.warning("You must have at least one hall");
      return;
    }

    setHalls((prev) => prev.filter((h) => h.id !== hallId));
  };

  /* ✅ Submit */
  const handleAdd = () => {
    if (isSubmitting) return;

    let allValid = true;

    const updated = halls.map((hall) => {
      const errors = validateHall(hall);

      if (Object.keys(errors).length > 0) {
        allValid = false;
      }

      return { ...hall, errors };
    });

    setHalls(updated);

    if (!allValid) return;

    setIsSubmitting(true);

    // Transform form data to API format
    const hallsData = updated.map((h) => ({
      hall_name: h.data.conferenceHallName.trim(),
      venue_name: h.data.venueName.trim(),
      floor_name: h.data.floorName.trim(),
      state: h.data.state,
      city: h.data.city.trim(),
      capacity: parseInt(h.data.capacity),
      video_conference_enabled: h.data.videoConferenceEnabled === "Yes",
      event_id: h.data.selectEvent || null,
      start_date:
        h.data.selectEvent && h.data.startDate ? h.data.startDate : null,
      end_date: h.data.selectEvent && h.data.endDate ? h.data.endDate : null,
    }));

    if (editHallData && (editHallData._id || editHallData.id)) {
      // Update existing hall
      updateMutation.mutate({
        hallId: editHallData._id || editHallData.id,
        hallData: hallsData[0],
      });
    } else {
      // Create new hall(s)
      createMutation.mutate(hallsData);
    }
  };

  /* ✅ Close with animation */
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setHalls([
        {
          id: 1,
          data: { ...initialFormState },
          errors: {},
        },
      ]);
      setNextId(2);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const indiaStates = State.getStatesOfCountry("IN");

  const getCitiesByState = (stateCode) => {
    return City.getCitiesOfState("IN", stateCode);
  };

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
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
            {editHallData ? "Edit Conference Hall" : "Add Conference Hall"}
          </h2>

          <button
            onClick={handleClose}
            type="button"
            className="hover:bg-gray-100 rounded-md p-1.5 sm:p-2 -mr-1"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {halls.map((hall, index) => (
            <div
              key={hall.id}
              className="bg-gray-50 rounded-xl p-4 sm:p-5 space-y-4 sm:space-y-5"
            >
              {/* Hall Count */}
              <div className="flex justify-between items-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  CONFERENCE HALL - {index + 1}
                </p>

                {!editHallData && halls.length > 1 && (
                  <button
                    onClick={() => handleRemoveHall(hall.id)}
                    className="text-xs text-red-600 font-medium hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Conference Hall Name */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Conference Hall Name <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="eg. Ambedkar Centre"
                  value={hall.data.conferenceHallName}
                  onChange={(e) =>
                    handleInputChange(
                      hall.id,
                      "conferenceHallName",
                      e.target.value,
                    )
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    hall.errors.conferenceHallName
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {hall.errors.conferenceHallName && (
                  <p className="text-xs text-red-500 mt-1">
                    {hall.errors.conferenceHallName}
                  </p>
                )}
              </div>

              {/* Venue Name */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="eg. Building A"
                  value={hall.data.venueName}
                  onChange={(e) =>
                    handleInputChange(hall.id, "venueName", e.target.value)
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    hall.errors.venueName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {hall.errors.venueName && (
                  <p className="text-xs text-red-500 mt-1">
                    {hall.errors.venueName}
                  </p>
                )}
              </div>

              {/* Floor Name */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Floor Name <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="eg. Ground Floor"
                  value={hall.data.floorName}
                  onChange={(e) =>
                    handleInputChange(hall.id, "floorName", e.target.value)
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    hall.errors.floorName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {hall.errors.floorName && (
                  <p className="text-xs text-red-500 mt-1">
                    {hall.errors.floorName}
                  </p>
                )}
              </div>

              {/* State + City */}
              <div className="grid grid-cols-2 gap-4">
                {/* State */}
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    State <span className="text-red-500">*</span>
                  </label>
                    <div className="mt-1">
                      <SearchableSelect
                        options={indiaStates.map((s) => ({ value: s.isoCode, label: s.name }))}
                        value={hall.data.stateCode}
                        onChange={(val) => {
                          const selectedState = indiaStates.find((s) => s.isoCode === val);
                          handleInputChange(hall.id, "stateCode", val);
                          handleInputChange(hall.id, "state", selectedState?.name || "");
                        }}
                        placeholder="Select State"
                        maxVisible={5}
                      />
                    </div>

                  {hall.errors.state && (
                    <p className="text-xs text-red-500 mt-1">
                      {hall.errors.state}
                    </p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <SearchableSelect
                      options={hall.data.stateCode ? getCitiesByState(hall.data.stateCode).map((c) => ({ value: c.name, label: c.name })) : []}
                      value={hall.data.city}
                      onChange={(val) => handleInputChange(hall.id, "city", val)}
                      placeholder={hall.data.stateCode ? "Select City" : "Select State First"}
                      maxVisible={5}
                      disabled={!hall.data.stateCode}
                    />
                  </div>
                </div>
              </div>

              {/* Capacity + Video */}
              <div className="grid grid-cols-2 gap-4">
                {/* Capacity */}
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="eg. 200"
                    value={hall.data.capacity}
                    onChange={(e) =>
                      handleInputChange(hall.id, "capacity", e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "e" ||
                        e.key === "E" ||
                        e.key === "+" ||
                        e.key === "-"
                      ) {
                        e.preventDefault();
                      }
                    }}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      hall.errors.capacity
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {hall.errors.capacity && (
                    <p className="text-xs text-red-500 mt-1">
                      {hall.errors.capacity}
                    </p>
                  )}
                </div>

                {/* Video Enabled */}
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Video Conference Enabled{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-3 flex items-center gap-6">
                    {/* YES */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      {/* hidden real radio */}
                      <input
                        type="radio"
                        name={`video-${hall.id}`}
                        value="Yes"
                        checked={hall.data.videoConferenceEnabled === "Yes"}
                        onChange={(e) =>
                          handleInputChange(
                            hall.id,
                            "videoConferenceEnabled",
                            e.target.value,
                          )
                        }
                        className="sr-only"
                      />

                      {/* custom outer circle */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200
          ${
            hall.data.videoConferenceEnabled === "Yes"
              ? "border-[#0B2F6A]"
              : "border-gray-300"
          }`}
                      >
                        {/* inner dot */}
                        <div
                          className={`w-2 h-2 rounded-full bg-[#0B2F6A] transition-all duration-200
            ${
              hall.data.videoConferenceEnabled === "Yes"
                ? "scale-100 opacity-100"
                : "scale-0 opacity-0"
            }`}
                        />
                      </div>

                      <span className="text-sm text-gray-700">Yes</span>
                    </label>

                    {/* NO */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name={`video-${hall.id}`}
                        value="No"
                        checked={hall.data.videoConferenceEnabled === "No"}
                        onChange={(e) =>
                          handleInputChange(
                            hall.id,
                            "videoConferenceEnabled",
                            e.target.value,
                          )
                        }
                        className="sr-only"
                      />

                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200
          ${
            hall.data.videoConferenceEnabled === "No"
              ? "border-[#0B2F6A]"
              : "border-gray-300"
          }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-[#0B2F6A] transition-all duration-200
            ${
              hall.data.videoConferenceEnabled === "No"
                ? "scale-100 opacity-100"
                : "scale-0 opacity-0"
            }`}
                        />
                      </div>

                      <span className="text-sm text-gray-700">No</span>
                    </label>
                  </div>

                  {hall.errors.videoConferenceEnabled && (
                    <p className="text-xs text-red-500 mt-1">
                      {hall.errors.videoConferenceEnabled}
                    </p>
                  )}
                </div>
              </div>

              {/* Select Event */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Select Event
                </label>
                <div className="mt-1">
                  <SearchableSelect
                    options={mappedEventsList.map((ev) => ({ value: ev._id, label: ev.event_name }))}
                    value={hall.data.selectEvent}
                    onChange={(val) => handleInputChange(hall.id, "selectEvent", val)}
                    placeholder={eventsLoading ? "Loading events..." : "Select Event (Optional)"}
                    maxVisible={5}
                    disabled={!!eventId}
                  />
                </div>
                {!eventsLoading && eventsList.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No events available
                  </p>
                )}
              </div>

              {/* Start Date & End Date - Show only when event is selected */}
              {hall.data.selectEvent && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={hall.data.startDate}
                      onChange={(e) =>
                        handleInputChange(hall.id, "startDate", e.target.value)
                      }
                      min={getEventDateRange(hall.data.selectEvent).start}
                      max={getEventDateRange(hall.data.selectEvent).end}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        hall.errors.startDate
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hall.errors.startDate && (
                      <p className="text-xs text-red-500 mt-1">
                        {hall.errors.startDate}
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
                      value={hall.data.endDate}
                      onChange={(e) =>
                        handleInputChange(hall.id, "endDate", e.target.value)
                      }
                      min={
                        hall.data.startDate ||
                        getEventDateRange(hall.data.selectEvent).start
                      }
                      max={getEventDateRange(hall.data.selectEvent).end}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        hall.errors.endDate
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hall.errors.endDate && (
                      <p className="text-xs text-red-500 mt-1">
                        {hall.errors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add More Button */}
          {!editHallData && (
            <button
              onClick={handleAddMore}
              className="flex items-center gap-2 text-[var(--color-text-primary)] font-medium text-sm hover:text-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add More Halls
            </button>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t bg-white sm:rounded-b-2xl">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleAdd}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-[#0B2F6A] text-white text-sm font-semibold hover:bg-[#092754] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isSubmitting ? "Saving..." : editHallData ? "Update" : "Add"}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AddConferenceHallDrawer;
