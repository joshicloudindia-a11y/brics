import {
  X,
  MapPin,
  Clock,
  Calendar,
  Users,
  Check,
  Upload,
  UserPlus,
  ListPlus,
  Edit2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  createSession,
  updateSession,
  addSessionParticipant,
} from "../../services/sessions";
import {
  getAvailableHalls,
  assignHallToEvent,
} from "../../services/conferenceHall";
import { createAgendas } from "../../services/agenda";
import { getEventById } from "../../services/events";
import { EVENT_CATEGORIES } from "../../constants/eventCategories";
import AddParticipantsDrawer from "./AddParticipantsDrawer";
import AddAgendaDrawer from "./AddAgendaDrawer";

const AddSessionDrawer = ({
  open,
  onClose,
  eventId,
  onSessionAdded,
  editSession,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conferenceHalls, setConferenceHalls] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [eventDetails, setEventDetails] = useState(null);
  const [dateValidationError, setDateValidationError] = useState("");
  const [participantsDrawerOpen, setParticipantsDrawerOpen] = useState(false);
  const [agendaDrawerOpen, setAgendaDrawerOpen] = useState(false);
  const [agendas, setAgendas] = useState([]);
  const [editingAgendaIndex, setEditingAgendaIndex] = useState(null);

  const [formData, setFormData] = useState({
    sessionName: "",
    sessionType: "in-person", // in-person, virtual, hybrid
    category: "",
    description: "",
    meetingUrl: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    conferenceHall: "",
    speakers: [],
    attendees: [],
    sameAsMainEvent: false,
    image: null,
    agendas: [],
  });

  /* ================= FETCH CONFERENCE HALLS & EVENT DETAILS ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!eventId) {
          // console.warn("No eventId provided to AddSessionDrawer");
          return;
        }

        const eventData = await getEventById(eventId);
        // Event data is in the 'data' property of the response
        const event = eventData?.data || eventData?.event || eventData;

        // console.log("Event data received:", event);
        setEventDetails(event);

        // Extract dates from various possible field names
        const eventStart =
          event?.start_datetime ||
          event?.start_date ||
          event?.startDate ||
          event?.event_start ||
          event?.start;
        const eventEnd = event?.end_datetime ||
          event?.end_date ||
          event?.endDate ||
          event?.event_end ||
          event?.end;

        // console.log("Extracted dates - Start:", eventStart, "End:", eventEnd);

        // Fetch available halls for the event
        const params = {
          event_id: eventId,
        };

        // Add date range if available
        if (eventStart && eventEnd) {
          try {
            const startDate = new Date(eventStart).toISOString().split("T")[0];
            const endDate = new Date(eventEnd).toISOString().split("T")[0];
            params.start_date = startDate;
            params.end_date = endDate;
            // console.log("API params:", params);
          } catch (err) {
            // console.error("Date parsing error:", err);
          }
        } else {
          // console.warn("Event start or end date not found in event data");
        }

        // Try to fetch available halls
        try {
          if (params.start_date && params.end_date) {
            const hallsData = await getAvailableHalls(params);
            // console.log("Available halls response:", hallsData);
            // Handle both array and object response formats
            const halls = Array.isArray(hallsData)
              ? hallsData
              : hallsData?.halls || hallsData?.data || [];
            setConferenceHalls(halls);
          } else {
            // console.warn("Missing required date parameters for available halls API, will load as needed");
          }
        } catch (err) {
          // console.error("Failed to fetch available halls:", err);
          // If available halls API fails, still let the user use the form
        }
      } catch (err) {
        // console.error("Failed to fetch event data:", err);
        toast.error("Failed to load event details");
      }
    };

    if (open && eventId) {
      fetchData();
    }
  }, [open, eventId]);

  /* ================= POPULATE FORM FOR EDIT MODE ================= */
  useEffect(() => {
    if (open && editSession) {
      // Format start date and time - use start_datetime or start_time
      const startField = editSession.start_datetime || editSession.start_time;
      const endField = editSession.end_datetime || editSession.end_time;

      const startDateTime = startField ? new Date(startField) : null;
      const endDateTime = endField ? new Date(endField) : null;

      let formattedStartDate = "";
      let formattedStartTime = "";
      let formattedEndDate = "";
      let formattedEndTime = "";

      if (startDateTime) {
        // Format date as YYYY-MM-DD
        formattedStartDate = startDateTime.toISOString().split("T")[0];
        // Format time as HH:MM using UTC to avoid timezone conversion
        const hours = String(startDateTime.getUTCHours()).padStart(2, "0");
        const minutes = String(startDateTime.getUTCMinutes()).padStart(2, "0");
        formattedStartTime = `${hours}:${minutes}`;
      }

      if (endDateTime) {
        // Format date as YYYY-MM-DD
        formattedEndDate = endDateTime.toISOString().split("T")[0];
        // Format time as HH:MM using UTC to avoid timezone conversion
        const hours = String(endDateTime.getUTCHours()).padStart(2, "0");
        const minutes = String(endDateTime.getUTCMinutes()).padStart(2, "0");
        formattedEndTime = `${hours}:${minutes}`;
      }

      setFormData({
        sessionName: editSession.name || "",
        sessionType: editSession.session_type || "in-person",
        category: editSession.category || "",
        description: editSession.description || "",
        meetingUrl: editSession.meeting_url || "",
        startDate: formattedStartDate,
        startTime: formattedStartTime,
        endDate: formattedEndDate,
        endTime: formattedEndTime,
        location: editSession.location || "",
        conferenceHall: editSession.conference_hall_id
          ? String(editSession.conference_hall_id)
          : "",

        speakers: editSession.speakers || [],
        attendees: editSession.attendees || [],
        sameAsMainEvent: editSession.same_as_main_event || false,
        image: null,
        agendas: editSession.agendas || [],
      });

      // Set agendas state from editSession
      if (editSession.agendas && Array.isArray(editSession.agendas)) {
        setAgendas(editSession.agendas);
      }

      // Set image preview if exists
      if (editSession.photo_signed_url) {
        setImagePreview(editSession.photo_signed_url);
      }
    } else if (open && !editSession) {
      // Reset agendas for new session
      setAgendas([]);
      // Reset form data for new session
      setFormData({
        sessionName: "",
        sessionType: "in-person",
        category: "",
        description: "",
        meetingUrl: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        location: "",
        conferenceHall: "",
        speakers: [],
        attendees: [],
        sameAsMainEvent: false,
        image: null,
        agendas: [],
      });
      setImagePreview(null);
    }
  }, [open, editSession]);

  /* ================= ANIMATION HANDLING ================= */
  useEffect(() => {
    if (open) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  /* ================= REFRESH AVAILABLE HALLS WHEN DATES CHANGE ================= */
  useEffect(() => {
    const refreshAvailableHalls = async () => {
      if (!eventId || !formData.startDate || !open) return;

      try {
        const params = {
          event_id: eventId,
          start_date: formData.startDate,
          end_date: formData.startDate,
        };

        const hallsData = await getAvailableHalls(params);
        const halls = Array.isArray(hallsData)
          ? hallsData
          : hallsData?.halls || hallsData?.data || [];
        setConferenceHalls(halls);
      } catch (err) {
        // console.error("Failed to refresh available halls:", err);
      }
    };

    // Debounce the refresh to avoid too many API calls
    const timeout = setTimeout(refreshAvailableHalls, 500);
    return () => clearTimeout(timeout);
  }, [formData.startDate, eventId, open]);

  /* ================= LOCATION SEARCH ================= */
  useEffect(() => {
    if (formData.location.length < 3 || formData.sameAsMainEvent) {
      setLocationSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(formData.location)}`,
        );
        const data = await res.json();
        setLocationSuggestions(data);
      } catch (err) {
        // console.error("Failed to fetch location suggestions:", err);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [formData.location, formData.sameAsMainEvent]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      resetForm();
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    }, 300);
  };

  const resetForm = () => {
    setFormData({
      sessionName: "",
      sessionType: "in-person",
      category: "",
      description: "",
      meetingUrl: "",
      startDate: "",
      startTime: "",
      endTime: "",
      location: "",
      conferenceHall: "",
      speakers: [],
      attendees: [],
      sameAsMainEvent: false,
      image: null,
    });
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate dates when start or end dates/times change
    if (
      name === "startDate" ||
      name === "startTime" ||
      name === "endDate" ||
      name === "endTime"
    ) {
      validateDates({ ...formData, [name]: value });
    }
  };

  const validateDates = (data) => {
    if (!eventDetails) return;

    const eventStart = new Date(eventDetails.start_datetime);
    const eventEnd = new Date(eventDetails.end_datetime);

    if (!data.startDate || !data.startTime || !data.endDate || !data.endTime) {
      setDateValidationError("");
      return;
    }

    const sessionStart = new Date(`${data.startDate}T${data.startTime}:00Z`);
    const sessionEnd = new Date(`${data.endDate}T${data.endTime}:00Z`);

    if (sessionStart < eventStart) {
      setDateValidationError(
        "Session start date cannot be before event start date",
      );
      return;
    }

    if (sessionEnd > eventEnd) {
      setDateValidationError("Session end date cannot be after event end date");
      return;
    }

    if (sessionStart >= sessionEnd) {
      setDateValidationError("Session start must be before end date/time");
      return;
    }

    setDateValidationError("");
  };

  const getEventDateBoundaries = () => {
    if (!eventDetails) return { minDate: '', maxDate: '' };

    // Try different possible field names
    const eventStart = eventDetails.start_datetime ||
      eventDetails.start_date ||
      eventDetails.startDate ||
      eventDetails.event_start ||
      eventDetails.start;
    const eventEnd = eventDetails.end_datetime ||
      eventDetails.end_date ||
      eventDetails.endDate ||
      eventDetails.event_end ||
      eventDetails.end;

    // console.log('Event details:', eventDetails);
    // console.log('Start:', eventStart, 'End:', eventEnd);

    if (!eventStart || !eventEnd) return { minDate: '', maxDate: '' };

    try {
      const startDate = new Date(eventStart).toISOString().split("T")[0];
      const endDate = new Date(eventEnd).toISOString().split("T")[0];
      return { minDate: startDate, maxDate: endDate };
    } catch (err) {
      // console.error('Date parsing error:', err);
      return { minDate: '', maxDate: '' };
    }
  };

  const formatEventPeriod = () => {
    if (!eventDetails) return 'Loading...';

    const eventStart = eventDetails.start_datetime ||
      eventDetails.start_date ||
      eventDetails.startDate ||
      eventDetails.event_start ||
      eventDetails.start;
    const eventEnd = eventDetails.end_datetime ||
      eventDetails.end_date ||
      eventDetails.endDate ||
      eventDetails.event_end ||
      eventDetails.end;

    if (!eventStart || !eventEnd) return 'Event dates not available';

    try {
      const startDate = new Date(eventStart).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const endDate = new Date(eventEnd).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      return `${startDate} to ${endDate}`;
    } catch (err) {
      // console.error('Date formatting error:', err);
      return 'Event dates not available';
    }
  };

  const handleSessionTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      sessionType: type,
    }));
  };

  const processImageFile = (file) => {
    if (!file) return false;

    const allowed = ["image/jpeg", "image/png"];
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowed.includes(file.type.toLowerCase())) {
      toast.error("Only JPEG and PNG files are allowed");
      return false;
    }

    if (file.size > maxSizeBytes) {
      toast.error("Maximum file size is 5MB");
      return false;
    }

    const objectUrl = URL.createObjectURL(file);
    setFormData((p) => ({ ...p, image: file }));
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    return true;
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    const success = processImageFile(file);
    if (!success && e.target) {
      e.target.value = "";
    }
  };

  const handleImageDragOver = (event) => {
    event.preventDefault();
    setIsImageDragActive(true);
  };

  const handleImageDragLeave = (event) => {
    event.preventDefault();
    setIsImageDragActive(false);
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    setIsImageDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    processImageFile(file);
  };

  const handleParticipantsSelected = (speakers, attendees) => {
    setFormData((prev) => ({
      ...prev,
      speakers: speakers || [],
      attendees: attendees || [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sessionName.trim()) {
      toast.error("Session name is required");
      return;
    }

    if (!formData.startDate || !formData.startTime) {
      toast.error("Start date and time are required");
      return;
    }

    if (!formData.endDate || !formData.endTime) {
      toast.error("End date and time are required");
      return;
    }

    if (dateValidationError) {
      toast.error(dateValidationError);
      return;
    }

    // Determine if we're creating or updating
    const isEditing = editSession && editSession._id;
    const sessionId = isEditing ? editSession._id : null;

    try {
      setSubmitting(true);

      const fd = new FormData();

      // Add basic fields
      fd.append("name", formData.sessionName);
      fd.append("type", formData.sessionType);
      fd.append(
        "start_datetime",
        `${formData.startDate}T${formData.startTime}:00Z`,
      );
      fd.append("end_datetime", `${formData.endDate}T${formData.endTime}:00Z`);
      fd.append("use_event_location", formData.sameAsMainEvent);
      fd.append("capacity", "500");

      // Add optional fields
      if (formData.category) {
        fd.append("category", formData.category);
      }

      if (formData.description) {
        fd.append("description", formData.description);
      }

      if (formData.meetingUrl) {
        fd.append("meeting_url", formData.meetingUrl);
      }

      // Only include location if not using event location
      if (!formData.sameAsMainEvent && formData.location) {
        fd.append("location", formData.location);
      }

      // Include conference hall if selected
      if (formData.conferenceHall) {
        fd.append("conference_hall_id", formData.conferenceHall);
      }

      // Include image file if uploaded
      if (formData.image) {
        fd.append("photo", formData.image);
      }

      // Include agendas ensure speaker data is always strictly formatted correctly
      const sanitizedAgendas = (agendas || []).map(agenda => ({
        ...agenda,
        speakers: (agenda.speakers || []).map(s => ({
          user_id: s.user_id || s.id || s._id || '',
          user_name: s.user_name || s.name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || '',
          email: s.email || '',
          organisation: s.organization || s.organisation || '',
          designation: s.designation || '',
          photo_url: s.photo_url || null,
          photo_signed_url: s.photo_signed_url || null
        }))
      }));
      fd.append("agendas", JSON.stringify(sanitizedAgendas));

      let res;
      if (isEditing) {
        // Update existing session
        res = await updateSession(sessionId, fd);
      } else {
        // Create new session
        res = await createSession(eventId, fd);
      }

      if (res) {
        // Extract session ID from response
        const newSessionId =
          res.session?._id || res._id || (isEditing ? sessionId : null);

        // Handle hall booking success/error from backend
        if (res.hallBooked) {
          toast.success(
            `Session ${isEditing ? "updated" : "created"} and hall booked: ${res.hall_booking.hall.hall_name}`,
          );
        } else if (res.booking_error) {
          // Show conflict details
          const errorMessage = res.message || "Hall booking failed";
          const conflict = res.conflict;
          if (conflict) {
            toast.error(
              `Hall Conflict: ${errorMessage}. ${conflict.hall_name} is booked for ${conflict.booked_event} from ${conflict.booked_from} to ${conflict.booked_to}`,
            );
          } else {
            toast.error(
              `Session ${isEditing ? "updated" : "created"} but hall booking failed: ${errorMessage}`,
            );
          }
        } else {
          toast.success(
            isEditing
              ? "Session updated successfully"
              : "Session created successfully",
          );
        }

        // Add speakers if any were selected
        if (formData.speakers && formData.speakers.length > 0 && newSessionId) {
          try {
            await addSessionParticipant(newSessionId, {
              user_ids: formData.speakers,
              participant_type: "speaker",
            });
          } catch (participantErr) {
            // console.error("Error adding speakers to session:", participantErr);
            toast.warning("Session saved but some speakers could not be added");
          }
        }

        // Add attendees if any were selected
        if (
          formData.attendees &&
          formData.attendees.length > 0 &&
          newSessionId
        ) {
          try {
            await addSessionParticipant(newSessionId, {
              user_ids: formData.attendees,
              participant_type: "attendee",
            });
          } catch (participantErr) {
            // console.error("Error adding attendees to session:", participantErr);
            toast.warning("Session saved but some attendees could not be added");
          }
        }

        // Agendas are now passed inside FormData directly, no need for separate createAgendas call
        /*
        if (agendas && agendas.length > 0 && newSessionId) {
          try {
            await createAgendas(newSessionId, agendas);
            toast.success(
              `${agendas.length} agenda${agendas.length > 1 ? "s" : ""} created successfully`,
            );
          } catch (agendaErr) {
            // console.error("Error creating agendas:", agendaErr);
            toast.warning("Session saved but some agendas could not be created");
          }
        }
        */

        toast.success(
          isEditing
            ? "Session updated successfully"
            : "Session created successfully",
        );
        if (onSessionAdded) {
          const sessionPayload = res.session ? { ...res.session } : { ...res };
          // Optimistically attach agendas so UI updates instantly without requiring a full fetch
          sessionPayload.agendas = sanitizedAgendas;

          if (res.session) {
            onSessionAdded({ ...res, session: sessionPayload }, isEditing);
          } else {
            onSessionAdded(sessionPayload, isEditing);
          }
        }
        handleClose();
      }
    } catch (err) {
      // console.error("Error with session:", err);
      const action = isEditing ? "updating" : "creating";
      toast.error(err.response?.data?.message || `Failed to ${action} session`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {open && (
        <>
          {/* Overlay */}
          <div
            className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${isAnimating ? "opacity-40" : "opacity-0"
              }`}
            onClick={handleClose}
            style={{ margin: 0, padding: 0 }}
          />

          {/* Drawer */}
          <aside
            className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
              left-0 right-0 bottom-0 rounded-t-2xl
              sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
              md:w-[600px] lg:w-[820px]
              ${isAnimating
                ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
                : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
              }`}
            style={{ top: "64px", maxHeight: "calc(100vh - 64px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
                {editSession ? "Edit Session" : "Add Session"}
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Session Overview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Session Overview
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      {
                        type: "in-person",
                        icon: MapPin,
                        label: "In-person",
                        desc: "Conduct in-venue at a physical event",
                      },
                      {
                        type: "virtual",
                        icon: Users,
                        label: "Virtual",
                        desc: "Host a virtual event for remote participants",
                      },
                      {
                        type: "hybrid",
                        icon: Users,
                        label: "Hybrid",
                        desc: "Combine in-person & remote participation",
                      },
                    ].map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => handleSessionTypeChange(option.type)}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${formData.sessionType === option.type
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <div className="flex justify-center mb-1">
                          <option.icon
                            size={20}
                            className={
                              formData.sessionType === option.type
                                ? "text-blue-600"
                                : "text-gray-400"
                            }
                          />
                        </div>
                        <p className="text-xs sm:text-sm font-medium">
                          {option.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {option.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Name *
                  </label>
                  <input
                    type="text"
                    name="sessionName"
                    value={formData.sessionName}
                    onChange={handleInputChange}
                    placeholder="Enter session name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                  >
                    <option value="">Select category</option>
                    {EVENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter session description"
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                  />
                </div>

                {/* Meeting URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting URL
                  </label>
                  <input
                    type="url"
                    name="meetingUrl"
                    value={formData.meetingUrl || ""}
                    onChange={handleInputChange}
                    placeholder="https://meet.example.com/session-123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Date & Location */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    Date & Location
                  </h3>

                  {eventDetails && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                      <strong>Event Period:</strong> {formatEventPeriod()}
                    </div>
                  )}

                  {/* All Date & Time in Two Rows */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        min={getEventDateBoundaries().minDate}
                        max={getEventDateBoundaries().maxDate}
                        className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        min={formData.startDate || getEventDateBoundaries().minDate}
                        max={getEventDateBoundaries().maxDate}
                        className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Date Validation Error */}
                  {dateValidationError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      {dateValidationError}
                    </div>
                  )}
                </div>

                {/* Location with Checkbox */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MapPin size={18} />
                      Location
                    </label>
                    <div
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          sameAsMainEvent: !prev.sameAsMainEvent,
                        }))
                      }
                      className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 cursor-pointer select-none hover:text-gray-900"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.sameAsMainEvent
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300'
                        }`}>
                        {formData.sameAsMainEvent && (
                          <Check
                            size={14}
                            className="text-white"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                      <span>Same as main event location</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Search location name"
                    disabled={formData.sameAsMainEvent}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />

                  {/* Location Suggestions */}
                  {locationSuggestions.length > 0 &&
                    !formData.sameAsMainEvent && (
                      <ul className="mt-2 border border-gray-300 rounded-lg shadow-lg bg-white max-h-60 overflow-y-auto">
                        {locationSuggestions.map((suggestion) => (
                          <li
                            key={suggestion.place_id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm transition-colors"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                location: suggestion.display_name,
                              }));
                              setLocationSuggestions([]);
                            }}
                          >
                            {suggestion.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                </div>

                {/* Image Upload and Map */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Session Image
                    </label>
                    {imagePreview ? (
                      <div
                        className={`relative h-36 border-2 rounded-lg overflow-hidden group ${isImageDragActive ? "border-blue-600 bg-blue-50" : "border-gray-200"
                          }`}
                        onDragOver={handleImageDragOver}
                        onDragLeave={handleImageDragLeave}
                        onDrop={handleImageDrop}
                      >
                        <img
                          src={imagePreview}
                          alt="Session preview"
                          className="w-full h-full object-cover"
                        />
                        <label
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
                          onDragOver={handleImageDragOver}
                          onDragLeave={handleImageDragLeave}
                          onDrop={handleImageDrop}
                        >
                          <Upload size={20} />
                          <span className="text-sm mt-1">Change Image</span>
                          <input
                            type="file"
                            hidden
                            accept="image/jpeg,image/png"
                            onChange={handleImage}
                          />
                        </label>
                      </div>
                    ) : (
                      <label
                        className={`h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${isImageDragActive
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                          }`}
                        onDragOver={handleImageDragOver}
                        onDragLeave={handleImageDragLeave}
                        onDrop={handleImageDrop}
                      >
                        <Upload size={20} className="text-gray-400" />
                        <span className="text-sm text-gray-600 mt-1">
                          Upload Image
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          JPEG, PNG (Max 5MB)
                        </span>
                        <input
                          type="file"
                          hidden
                          accept="image/jpeg,image/png"
                          onChange={handleImage}
                        />
                      </label>
                    )}
                  </div>

                  {/* Map */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Session Location Map
                    </label>
                    <div className="h-36 border-2 border-gray-200 rounded-lg overflow-hidden">
                      {formData.location ? (
                        <iframe
                          title="session-map"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${encodeURIComponent(
                            formData.location,
                          )}&output=embed`}
                        />
                      ) : (
                        <div className="h-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                          Enter location to see map
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conference Hall */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conference Hall
                  </label>
                  <select
                    name="conferenceHall"
                    value={formData.conferenceHall}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                  >
                    <option value="">Select conference hall</option>
                    {conferenceHalls
                      .filter(hall => hall.status === "available")
                      .map((hall) => (
                        <option
                          key={hall._id || hall.id}
                          value={String(hall._id || hall.id)}
                        >
                          {hall.hall_name || hall.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Add Participants */}
                <div>
                  <h3 className="text-sm font-medium text-gray-800 mb-3">
                    Add Participants
                  </h3>
                  <div className="border border-gray-300 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-full">
                          <UserPlus size={24} className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Invite Participants
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formData.speakers.length > 0 ||
                              formData.attendees.length > 0
                              ? `${formData.speakers.length} speaker${formData.speakers.length !== 1 ? "s" : ""}, ${formData.attendees.length} attendee${formData.attendees.length !== 1 ? "s" : ""} selected`
                              : "Select speakers and attendees for this session"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setParticipantsDrawerOpen(true)}
                        className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add Agenda */}
                <div>
                  <h3 className="text-sm font-medium text-gray-800 mb-3">
                    Add Agenda
                  </h3>
                  <div className="border border-gray-300 rounded-lg p-4 bg-white">
                    {agendas.length > 0 ? (
                      <div className="space-y-3">
                        {agendas.map((agenda, index) => (
                          <div
                            key={index}
                            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mb-1">
                                <Clock size={12} />
                                <span>
                                  {agenda.start_time} - {agenda.end_time}
                                </span>
                              </div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-1">
                                {agenda.title}
                              </h5>
                              {agenda.description && (
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                  {agenda.description}
                                </p>
                              )}
                              {agenda.speaker_ids && agenda.speaker_ids.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Users size={12} />
                                  <span>
                                    {agenda.speaker_ids.length} speaker(s)
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAgendaIndex(index);
                                  setAgendaDrawerOpen(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAgendas(agendas.filter((_, i) => i !== index));
                                  toast.success("Agenda removed");
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAgendaIndex(null);
                            setAgendaDrawerOpen(true);
                          }}
                          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
                        >
                          Add More Agenda
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 rounded-full">
                            <ListPlus size={24} className="text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              Agenda Added
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {agendas.length > 0
                                ? `${agendas.length} agenda${agendas.length !== 1 ? "s" : ""}`
                                : "Add schedule and topics for this session"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAgendaIndex(null);
                            setAgendaDrawerOpen(true);
                          }}
                          className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                        >
                          Add More
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition text-sm font-medium"
                  >
                    {submitting
                      ? editSession
                        ? "Updating..."
                        : "Adding..."
                      : editSession
                        ? "Update"
                        : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </aside>

          {/* Add Participants Drawer */}
          <AddParticipantsDrawer
            open={participantsDrawerOpen}
            onClose={() => setParticipantsDrawerOpen(false)}
            sessionId={null}
            eventId={eventId}
            onParticipantsAdded={handleParticipantsSelected}
            isSelectMode={true}
            initialSpeakers={formData.speakers}
            initialAttendees={formData.attendees}
          />

          {/* Add Agenda Drawer */}
          <AddAgendaDrawer
            open={agendaDrawerOpen}
            onClose={() => {
              setAgendaDrawerOpen(false);
              setEditingAgendaIndex(null);
            }}
            sessionId={null}
            sessionData={{
              start_time: formData.startTime,
              end_time: formData.endTime,
              startTime: formData.startTime,
              endTime: formData.endTime,
            }}
            eventId={eventId}
            onAgendaAdded={(newAgendas, isUpdate, updateIndex) => {
              const targetIndex = editingAgendaIndex !== null ? editingAgendaIndex : updateIndex;
              if (targetIndex !== null && targetIndex !== undefined) {
                // Update existing agenda
                const updatedAgendas = [...agendas];
                updatedAgendas[targetIndex] = Array.isArray(newAgendas) ? newAgendas[0] : newAgendas;
                setAgendas(updatedAgendas);
                toast.success("Agenda updated");
              } else {
                // Add new agenda(s)
                const agendasToAdd = Array.isArray(newAgendas) ? newAgendas : [newAgendas];
                setAgendas([...agendas, ...agendasToAdd]);
                toast.success(`${agendasToAdd.length} agenda${agendasToAdd.length > 1 ? "s" : ""} added`);
              }
              // Don't close drawer - let user add/edit more agendas
              // Only reset editing state if it was an update
              if (isUpdate) {
                setEditingAgendaIndex(null);
              }
            }}
            onEditAgenda={(agenda, index) => {
              // Reset first to trigger re-render
              setEditingAgendaIndex(null);
              setTimeout(() => {
                setEditingAgendaIndex(index);
              }, 0);
            }}
            onCancelEdit={() => {
              setEditingAgendaIndex(null);
            }}
            editAgenda={editingAgendaIndex !== null ? agendas[editingAgendaIndex] : null}
            localAgendas={agendas}
            editingAgendaIndex={editingAgendaIndex}
          />
        </>
      )}
    </>
  );
};

export default AddSessionDrawer;
