import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Clock, ChevronLeft, Edit2 } from "lucide-react";
import { toast } from "react-toastify";
import { createAgendas, updateAgenda, getSessionAgendas } from "../../services/agenda";
import { getAllSpeakers } from "../../services/speakers";
import api from "../../services/axios";

const AddAgendaDrawer = ({
  open,
  onClose,
  sessionId,
  sessionData,
  eventId,
  onAgendaAdded,
  editAgenda = null,
  localAgendas = [],
  editingAgendaIndex = null,
  onEditAgenda,
  onCancelEdit,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [delegates, setDelegates] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [existingAgendas, setExistingAgendas] = useState([]);
  const [editingAgendaId, setEditingAgendaId] = useState(null);
  const [editingAgendaData, setEditingAgendaData] = useState(null);
  const formRef = useRef(null);

  const [agendaItems, setAgendaItems] = useState([
    {
      id: Date.now(),
      title: "",
      start_time: "",
      end_time: "",
      speaker_ids: [],
      description: "",
      errors: {},
    },
  ]);

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      fetchSpeakers();
      fetchDelegates();
      setOpenDropdown(null);

      if (sessionId) {
        setAgendaItems([]);
        fetchAgendas();
      } else {
        if (localAgendas && localAgendas.length > 0) {
          setAgendaItems([]);
        } else {
          setAgendaItems([
            {
              id: Date.now(),
              title: "",
              start_time: "",
              end_time: "",
              speaker_ids: [],
              description: "",
              errors: {},
            },
          ]);
        }
      }
    } else {
      setIsAnimating(false);
      setOpenDropdown(null);
    }
  }, [open, sessionId, eventId]);

  // Separate effect to handle editAgenda changes
  useEffect(() => {
    if (open && editAgenda) {
      const agendaId = editAgenda._id || editAgenda.id;
      setEditingAgendaId(agendaId);

      // Extract speaker IDs from speakers array if speaker_ids is not available
      let speakerIds = editAgenda.speaker_ids || [];
      if ((!speakerIds || speakerIds.length === 0) && editAgenda.speakers && editAgenda.speakers.length > 0) {
        speakerIds = editAgenda.speakers.map(speaker => {
          // Try multiple possible ID fields and convert to string
          const id = speaker._id || speaker.user_id || speaker.id || speaker.speakerId;
          return String(id);
        }).filter(id => id && id !== 'undefined');
      }

      // Store a deep copy of the agenda data for editing to avoid reference issues
      setEditingAgendaData({
        ...editAgenda,
        speakers: editAgenda.speakers || [],
        speaker_ids: speakerIds
      });
      // Scroll to the edited agenda when editing
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else if (open && !editAgenda) {
      setEditingAgendaId(null);
      setEditingAgendaData(null);
    }
  }, [editAgenda, open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.speaker-dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdown]);

  const fetchSpeakers = async () => {
    try {
      // Fetch all speakers without pagination limit
      const data = await getAllSpeakers({ limit: 10000 });
      const speakersArray = Array.isArray(data) ? data : data?.speakers || data?.data || [];
      setSpeakers(speakersArray);
    } catch (err) {
      toast.error("Failed to load speakers");
    }
  };

  const fetchDelegates = async () => {
    try {
      // Try to get eventId from prop first, then fallback to sessionData
      let actualEventId = eventId;
      
      if (!actualEventId && sessionData) {
        actualEventId = sessionData.event_id || 
                       sessionData.eventId || 
                       sessionData.event?._id || 
                       sessionData.event?.id;
      }
      
      if (!actualEventId) {
        return;
      }

      const response = await api.get(`/api/events/${actualEventId}/users`);
      const rawDelegates = Array.isArray(response.data) ? response.data : [];
      
      // Filter out DAO, Event Manager, and Superadmin roles
      const delegatesArray = rawDelegates.filter(delegate => {
        const roleName = delegate?.role.toUpperCase() || '';
        return !['DAO', 'EVENT MANAGER', 'SUPER ADMIN'].includes(roleName);
      });
      
      setDelegates(delegatesArray);
    } catch (err) {
      // Don't show error toast - delegates are optional
    }
  };

  // Combine speakers and delegates into a single list for selection
  const allSpeakerOptions = [...speakers, ...delegates];


  const fetchAgendas = async () => {
    try {
      const data = await getSessionAgendas(sessionId);
      const agendasArray = Array.isArray(data) ? data : data?.agendas || data?.data || [];
      setExistingAgendas(agendasArray);
      if (agendasArray.length === 0) {
        setAgendaItems([
          {
            id: Date.now(),
            title: "",
            start_time: "",
            end_time: "",
            speaker_ids: [],
            description: "",
            errors: {},
          },
        ]);
      } else {
        setAgendaItems([]);
      }
    } catch (err) {
      // Fallback
      setAgendaItems([
        {
          id: Date.now(),
          title: "",
          start_time: "",
          end_time: "",
          speaker_ids: [],
          description: "",
          errors: {},
        },
      ]);
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      setAgendaItems([]);
    }, 300);
  };

  const updateAgendaItem = (id, field, value) => {
    setAgendaItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value, errors: { ...item.errors, [field]: "" } } : item
      )
    );
  };

  const addMoreAgenda = () => {
    setAgendaItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        start_time: "",
        end_time: "",
        speaker_ids: [],
        description: "",
        errors: {},
      },
    ]);
  };

  const removeAgendaItem = (id) => {
    setAgendaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const validateAgendaItem = (item) => {
    const errors = {};
    if (!item.title?.trim()) errors.title = "Agenda title is required";
    if (!item.start_time) errors.start_time = "Start time is required";
    if (!item.end_time) errors.end_time = "End time is required";
    if (item.start_time && item.end_time && item.end_time <= item.start_time) {
      errors.end_time = "End time must be after start time";
    }

    if (sessionData) {
      const sessionStart = sessionData.start_time || sessionData.startTime;
      const sessionEnd = sessionData.end_time || sessionData.endTime;
      if (sessionStart && item.start_time && item.start_time < sessionStart) {
        errors.start_time = "Start time must be within session duration";
      }
      if (sessionEnd && item.end_time && item.end_time > sessionEnd) {
        errors.end_time = "End time must be within session duration";
      }
    }
    return errors;
  };

  const checkTimeOverlap = () => {
    const sortedItems = [...agendaItems].sort((a, b) =>
      (a.start_time || "").localeCompare(b.start_time || "")
    );
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const current = sortedItems[i];
      const next = sortedItems[i + 1];
      if (current.start_time && current.end_time && next.start_time) {
        if (current.end_time > next.start_time) {
          return {
            hasOverlap: true,
            message: `Time overlap detected between "${current.title}" and "${next.title}"`,
          };
        }
      }
    }
    return { hasOverlap: false };
  };

  const formatSpeakerData = (id, globalSpeakers, oldSpeakers) => {
    const isMatch = (sp) => String(sp._id) === String(id) || String(sp.user_id) === String(id) || String(sp.speakerId) === String(id) || String(sp.id) === String(id);
    const s = globalSpeakers.find(isMatch) || (oldSpeakers || []).find(isMatch) || {};

    return {
      user_id: s?.user_id || s?.id || s?._id || id,
      user_name: s.name || s.user_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || '',
      email: s.email || '',
      organisation: s.organization || s.organisation || '',
      designation: s.designation || '',
      photo_url: s.photo_url || null,
      photo_signed_url: s.photo_signed_url || null
    };
  };

  const handleSubmit = async () => {
    try {
      if (!editAgenda && agendaItems.length === 0) {
        handleClose();
        return;
      }

      let hasErrors = false;
      const updatedItems = agendaItems.map((item) => {
        const errors = validateAgendaItem(item);
        if (Object.keys(errors).length > 0) {
          hasErrors = true;
          return { ...item, errors };
        }
        return item;
      });

      if (hasErrors) {
        setAgendaItems(updatedItems);
        toast.error("Please fix validation errors");
        return;
      }

      const overlapCheck = checkTimeOverlap();
      if (overlapCheck.hasOverlap) {
        toast.error(overlapCheck.message);
        return;
      }

      setSubmitting(true);

      if (editAgenda) {
        // Use editingAgendaData which contains the updated speaker selections
        const speakerIds = editingAgendaData?.speaker_ids || agendaItems[0]?.speaker_ids || [];
        const payload = {
          title: editingAgendaData?.title || agendaItems[0]?.title,
          start_time: editingAgendaData?.start_time || agendaItems[0]?.start_time,
          end_time: editingAgendaData?.end_time || agendaItems[0]?.end_time,
          speaker_ids: speakerIds,
          speakers: speakerIds.map(id => formatSpeakerData(id, allSpeakerOptions, editingAgendaData?.speakers)),
          description: editingAgendaData?.description || agendaItems[0]?.description,
        };

        if (!sessionId) {
          if (onAgendaAdded) onAgendaAdded(payload, true);
          // Exit edit mode but don't close drawer
          if (onCancelEdit) {
            onCancelEdit();
          }
          setEditingAgendaId(null);
          setEditingAgendaData(null);
          setSubmitting(false);
          return;
        }

        const result = await updateAgenda(editAgenda._id || editAgenda.id, payload);
        toast.success("Agenda updated successfully");
        if (onAgendaAdded) onAgendaAdded(result, true);
        await fetchAgendas();

        // Exit edit mode but don't close drawer
        if (onCancelEdit) {
          onCancelEdit();
        }
        setEditingAgendaId(null);
        setEditingAgendaData(null);
      } else {
        const payload = agendaItems.map((item) => ({
          title: item.title,
          start_time: item.start_time,
          end_time: item.end_time,
          speaker_ids: item.speaker_ids,
          speakers: (item.speaker_ids || []).map(id => formatSpeakerData(id, allSpeakerOptions, item.speakers)),
          description: item.description,
        }));

        if (!sessionId) {
          if (onAgendaAdded) onAgendaAdded(payload);
          // Reset form instead of closing drawer
          setAgendaItems([]);
          setSubmitting(false);
          return;
        }

        const result = await createAgendas(sessionId, payload);
        toast.success(`${agendaItems.length} agenda item(s) added successfully`);
        if (onAgendaAdded) onAgendaAdded(result);
        await fetchAgendas();

        // Reset form instead of closing drawer
        setAgendaItems([]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save agenda");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    const timePart = timeString.includes("T") ? timeString.split("T")[1] : timeString;
    const [hours, minutes] = timePart.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const extractTimeForInput = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const timePart = dateTimeStr.includes("T") ? dateTimeStr.split("T")[1] : dateTimeStr;
    const parts = timePart.split(":");
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return dateTimeStr;
  };

  if (!open) return null;

  const headerTitle = "Add Agenda";

  // Combine lists to match Figma screenshot (Timeline logic)
  const baseAgendas = sessionId ? existingAgendas : localAgendas;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-[9999] transition-opacity duration-300 ${isAnimating ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={handleClose}
      />

      {/* Right Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[10000] flex flex-col w-full sm:w-[600px] max-w-full bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:rounded-l-2xl ${isAnimating ? "translate-x-0" : "translate-x-full"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
              {headerTitle}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="relative">

            {/* 1. Render previously added agendas (Display mode) */}
            {baseAgendas.map((agenda, index) => {
              // Check if this agenda is being edited - either by index (from AddSessionDrawer) or by ID (from Agenda.jsx)
              const agendaId = agenda._id || agenda.id || agenda.tempId;
              const isBeingEdited = String(editingAgendaId) === String(agendaId);
              const displayData = isBeingEdited && editingAgendaData ? editingAgendaData : agenda;

              return (
                <React.Fragment key={agenda._id || agenda.id || index}>
                  <div className="relative pl-8 pb-8" ref={isBeingEdited ? formRef : null}>
                    {/* Timeline dot */}
                    <div className={`absolute left-[3px] top-4 w-[7px] h-[7px] rounded-full z-10 ${isBeingEdited ? 'bg-blue-500 animate-pulse' : 'bg-[#003B73]'}`} />

                    {/* Vertical connecting line */}
                    <div className="absolute left-[6px] top-5 bottom-[-16px] w-[1px] bg-gray-200" />

                    <div className={`rounded-lg p-5 shadow-sm transition-all ${isBeingEdited ? 'border-2 border-blue-500 ring-2 ring-blue-100 bg-blue-50/30' : 'border border-gray-200 bg-white hover:shadow-md'}`}>
                      {/* Edit mode header */}
                      {isBeingEdited && (
                        <div className="mb-4 pb-3 border-b border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Edit2 size={14} className="text-blue-600" />
                              <div>
                                <h4 className="text-xs font-bold text-gray-800">Edit Agenda Details</h4>
                                <p className="text-[10px] text-gray-500 mt-0.5">Make changes below</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (onCancelEdit) {
                                  onCancelEdit();
                                }
                                setEditingAgendaId(null);
                                setEditingAgendaData(null);
                              }}
                              className="text-[10px] font-medium text-gray-600 hover:text-gray-800 underline"
                            >
                              Cancel Edit
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Time Badge and Edit Button */}
                      <div className="flex justify-between items-start mb-3">
                        {!isBeingEdited ? (
                          <div className="bg-[#F0F2F5] text-gray-700 font-semibold px-2.5 py-1 rounded text-[11px] inline-flex items-center border border-gray-200">
                            {formatTime(agenda.start_time)} - {formatTime(agenda.end_time)}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-green-600 bg-green-50 rounded-md border border-green-200">
                            <Edit2 size={12} strokeWidth={2.5} />
                            Editing...
                          </div>
                        )}

                        {!isBeingEdited && (
                          <button
                            onClick={() => {
                              if (onEditAgenda) {
                                onEditAgenda(agenda, index);
                              } else {
                                // Handle edit internally when onEditAgenda is not provided (from Agenda.jsx)
                                const agendaId = agenda._id || agenda.id || agenda.tempId;
                                setEditingAgendaId(agendaId);
                                setEditingAgendaData({
                                  ...agenda,
                                  speakers: agenda.speakers ? [...agenda.speakers] : [],
                                  speaker_ids: agenda.speaker_ids ? [...agenda.speaker_ids] : []
                                });
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-[#003B73] hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 size={12} strokeWidth={2.5} />
                            Edit
                          </button>
                        )}
                      </div>

                      {/* Title - View or Edit mode */}
                      {isBeingEdited ? (
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                            Agenda Title<span className="text-red-500 ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            value={displayData.title || ''}
                            onChange={(e) => {
                              setEditingAgendaData({ ...editingAgendaData, title: e.target.value });
                            }}
                            placeholder="e.g., Keynote Speech"
                            maxLength={150}
                            className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg outline-none focus:border-blue-500 transition-colors bg-white"
                          />
                        </div>
                      ) : (
                        <h3 className="text-[14px] font-bold text-gray-900 mb-1.5 leading-snug">
                          {agenda.title}
                        </h3>
                      )}

                      {/* Time Fields - Edit mode only */}
                      {isBeingEdited && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                              Start Time
                            </label>
                            <div className="relative">
                              <input
                                type="time"
                                value={displayData.start_time || ''}
                                min={extractTimeForInput(sessionData?.start_time || sessionData?.startTime)}
                                max={extractTimeForInput(displayData.end_time || sessionData?.end_time || sessionData?.endTime)}
                                onChange={(e) => {
                                  setEditingAgendaData({ ...editingAgendaData, start_time: e.target.value });
                                }}
                                className="w-full px-3 py-2 text-sm border border-blue-300 hover:border-blue-400 rounded-lg outline-none focus:border-blue-500 transition-colors bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                              End Time
                            </label>
                            <div className="relative">
                              <input
                                type="time"
                                value={displayData.end_time || ''}
                                min={extractTimeForInput(displayData.start_time || sessionData?.start_time || sessionData?.startTime)}
                                max={extractTimeForInput(sessionData?.end_time || sessionData?.endTime)}
                                onChange={(e) => {
                                  setEditingAgendaData({ ...editingAgendaData, end_time: e.target.value });
                                }}
                                className="w-full px-3 py-2 text-sm border border-blue-300 hover:border-blue-400 rounded-lg outline-none focus:border-blue-500 transition-colors bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Description - View or Edit mode */}
                      {isBeingEdited ? (
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                            Description
                          </label>
                          <textarea
                            value={displayData.description || ''}
                            onChange={(e) => {
                              setEditingAgendaData({ ...editingAgendaData, description: e.target.value });
                            }}
                            placeholder="Enter description..."
                            maxLength={200}
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-blue-300 hover:border-blue-400 rounded-lg outline-none focus:border-blue-500 resize-none text-gray-700 transition-colors bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1 text-right">
                            {(displayData.description || '').length}/200 characters
                          </p>
                        </div>
                      ) : (
                        agenda.description && (
                          <p className="text-xs text-gray-500 mb-4 leading-relaxed tracking-wide">
                            {agenda.description}
                          </p>
                        )
                      )}

                      {/* Speakers - Edit mode */}
                      {isBeingEdited && (
                        <div className="relative speaker-dropdown-container">
                          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                            Select Speaker
                          </label>

                          {/* Dropdown Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdown(openDropdown === agendaId ? null : agendaId)
                            }
                            className="w-full px-3 py-2 text-sm border border-blue-400 rounded-lg bg-white flex items-center justify-between"
                          >
                            <span className="text-gray-600 truncate">
                              {editingAgendaData?.speaker_ids?.length > 0 ? (
                                editingAgendaData.speaker_ids.length === 1 ? (
                                  // Show single speaker name
                                  (() => {
                                    const speakerId = editingAgendaData.speaker_ids[0];
                                    const speaker = speakers.find(s => String(s._id || s.id) === String(speakerId));
                                    return speaker ? (speaker.name || `${speaker.first_name || ''} ${speaker.last_name || ''}`.trim() || 'Speaker') : '1 selected';
                                  })()
                                ) : (
                                  // Show count for multiple speakers 
                                  `${editingAgendaData.speaker_ids.length} speakers selected`
                                )
                              ) : "Select"}
                            </span>

                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${openDropdown === agendaId ? "rotate-180" : ""
                                }`}
                            />
                          </button>

                          {/* Dropdown List */}
                          {openDropdown === agendaId && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                              {allSpeakerOptions.map((speaker) => {
                                const speakerId = speaker._id || speaker.user_id || speaker.id;
                                const speakerIdString = String(speakerId);

                                // More comprehensive selection check - match against multiple possible ID formats
                                const storedIds = editingAgendaData?.speaker_ids || [];
                                const selected = storedIds.some(storedId => {
                                  const storedIdString = String(storedId);
                                  const match = storedIdString === speakerIdString ||
                                    storedIdString === String(speaker._id) ||
                                    storedIdString === String(speaker.user_id) ||
                                    storedIdString === String(speaker.id);

                                  return match;
                                });

                                const name =
                                  speaker.name ||
                                  speaker.user_name ||
                                  `${speaker.first_name || ""} ${speaker.last_name || ""}`.trim();

                                return (
                                  <label
                                    key={speakerId}
                                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${selected ? "bg-blue-50/30" : ""
                                      }`}
                                  >
                                    {/* Custom checkbox */}
                                    <div
                                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected
                                        ? "bg-[#003B73] border-[#003B73]"
                                        : "bg-white border-gray-300 hover:border-gray-400"
                                        }`}
                                    >
                                      {selected && (
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                    </div>

                                    {/* Hidden checkbox */}
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => {
                                        const current = editingAgendaData?.speaker_ids || [];

                                        let updated;
                                        if (selected) {
                                          // Uncheck - remove this speaker ID from the list
                                          // Use comprehensive filtering to handle different ID formats
                                          updated = current.filter((storedId) => {
                                            const storedIdString = String(storedId);
                                            const shouldRemove = storedIdString === speakerIdString ||
                                              storedIdString === String(speaker._id) ||
                                              storedIdString === String(speaker.user_id) ||
                                              storedIdString === String(speaker.id);
                                            return !shouldRemove;
                                          });
                                        } else {
                                          // Check - add this speaker ID to the list
                                          updated = [...current, speakerIdString];
                                        }

                                        setEditingAgendaData({
                                          ...editingAgendaData,
                                          speaker_ids: updated,
                                        });
                                      }}
                                      className="hidden"
                                    />

                                    <span className="text-sm text-gray-700">
                                      {name}
                                      {(speaker.designation || speaker.organization) && (
                                        <span className="text-xs text-gray-400 block">
                                          {speaker.designation}
                                          {speaker.designation && speaker.organization ? " - " : ""}
                                          {speaker.organization}
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Speakers - View mode */}
                      {!isBeingEdited && agenda.speakers && agenda.speakers.length > 0 && (
                        <div className="mt-3 text-gray-700">
                          <p className="text-xs font-semibold text-gray-600 mb-2">
                            {agenda.speakers.length === 1 ? "Speaker" : "Speakers"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {agenda.speakers.map((speaker, idx) => {
                              const speakerName = speaker.name || speaker.user_name || `${speaker.first_name || ""} ${speaker.last_name || ""}`.trim();
                              const designation = speaker.designation || speaker.title || "";
                              const organization = speaker.organization || speaker.organisation || "";
                              const photoUrl = speaker.photo_signed_url || speaker.photo_url || speaker.avatar || speaker.image;
                              const initials = speakerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "SP";

                              return (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-2 bg-[#e3f2fd] text-gray-700 rounded-full pl-1 pr-3 py-1"
                                >
                                  <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden flex-shrink-0">
                                    {photoUrl ? (
                                      <img
                                        src={photoUrl}
                                        alt={speakerName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">${initials}</div>`;
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                                        {initials}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0 max-w-[150px]">
                                    <span className="text-[11px] font-semibold leading-tight truncate">
                                      {speakerName}
                                    </span>
                                    {(designation || organization) && (
                                      <span className="text-[9px] leading-tight truncate opacity-90">
                                        {[designation, organization].filter(Boolean).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons - Edit mode only */}
                      {isBeingEdited && (
                        <div className="flex justify-end gap-3 pt-3 mt-3 border-t border-blue-200">
                          <button
                            onClick={() => {
                              if (onCancelEdit) {
                                onCancelEdit();
                              }
                              setEditingAgendaId(null);
                              setEditingAgendaData(null);
                            }}
                            className="px-4 py-2 text-xs font-semibold border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const payload = {
                                  title: editingAgendaData.title,
                                  start_time: editingAgendaData.start_time,
                                  end_time: editingAgendaData.end_time,
                                  speaker_ids: editingAgendaData.speaker_ids || [],
                                  speakers: (editingAgendaData.speaker_ids || []).map(id => formatSpeakerData(id, speakers, editingAgendaData?.speakers)),
                                  description: editingAgendaData.description,
                                };

                                if (sessionId) {
                                  // For existing event sessions - API call
                                  await updateAgenda(agenda._id || agenda.id, payload);
                                  toast.success('Agenda updated successfully');
                                  await fetchAgendas();
                                } else {
                                  // For local agendas (new session) - update via callback
                                  const updatedAgenda = { ...editingAgendaData, ...payload };
                                  if (onAgendaAdded) {
                                    onAgendaAdded(updatedAgenda, true, index);
                                  }
                                }

                                if (onCancelEdit) {
                                  onCancelEdit();
                                }
                                setEditingAgendaId(null);
                                setEditingAgendaData(null);
                              } catch (err) {
                                toast.error('Failed to update agenda');
                              }
                            }}
                            className="px-4 py-2 text-xs font-semibold bg-[#003B73] text-white rounded-md hover:bg-[#002B54] transition-colors"
                          >
                            Update
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* 2. Render Forms - Always visible */}
            {agendaItems.map((item, index) => {
              const showRemoveBtn = true;
              const hasConnectingLine = index < agendaItems.length - 1;

              return (
                <div
                  key={item.id}
                  className="relative pl-8 pb-5"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[3px] top-5 w-[7px] h-[7px] bg-[#003B73] rounded-full z-10" />

                  {/* Vertical connecting line ONLY if not the last item */}
                  {hasConnectingLine && (
                    <div className="absolute left-[6px] top-6 bottom-[-16px] w-[1px] bg-gray-200" />
                  )}

                  <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-800 w-full mb-0">
                        Agenda Title<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      {showRemoveBtn && (
                        <button
                          onClick={() => removeAgendaItem(item.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateAgendaItem(item.id, "title", e.target.value)}
                        placeholder="e.g., Keynote Speech"
                        maxLength={150}
                        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500 transition-colors ${item.errors.title ? "border-red-500" : "border-gray-200"
                          }`}
                      />
                      {item.errors.title && (
                        <p className="text-xs text-red-500 mt-1">{item.errors.title}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                          Start Time
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            value={item.start_time}
                            min={extractTimeForInput(sessionData?.start_time || sessionData?.startTime)}
                            max={extractTimeForInput(item.end_time || sessionData?.end_time || sessionData?.endTime)}
                            onChange={(e) => updateAgendaItem(item.id, "start_time", e.target.value)}
                            className={`w-full px-3 py-2 text-sm border hover:border-gray-400 rounded-lg outline-none focus:border-blue-500 transition-colors ${item.errors.start_time ? "border-red-500" : "border-gray-200"
                              }`}
                          />
                        </div>
                        {item.errors.start_time && (
                          <p className="text-xs text-red-500 mt-1">{item.errors.start_time}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                          End Time
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            value={item.end_time}
                            min={extractTimeForInput(item.start_time || sessionData?.start_time || sessionData?.startTime)}
                            max={extractTimeForInput(sessionData?.end_time || sessionData?.endTime)}
                            onChange={(e) => updateAgendaItem(item.id, "end_time", e.target.value)}
                            className={`w-full px-3 py-2 text-sm border hover:border-gray-400 rounded-lg outline-none focus:border-blue-500 transition-colors ${item.errors.end_time ? "border-red-500" : "border-gray-200"
                              }`}
                          />
                        </div>
                        {item.errors.end_time && (
                          <p className="text-xs text-red-500 mt-1">{item.errors.end_time}</p>
                        )}
                      </div>
                    </div>

                    <div className="relative speaker-dropdown-container">
                      <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                        Select Speaker
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 hover:border-gray-400 rounded-lg bg-white text-left flex items-center justify-between focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <span className={item.speaker_ids?.length > 0 ? "text-gray-900" : "text-gray-400"}>
                          {item.speaker_ids?.length > 0 ? `${item.speaker_ids.length} selected` : "Select"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === item.id ? "rotate-180" : ""}`} />
                      </button>

                      {openDropdown === item.id && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                          {allSpeakerOptions.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-gray-500 text-center">No speakers or delegates available</div>
                          ) : (
                            allSpeakerOptions.map((speaker) => {
                              const speakerId = speaker._id || speaker.id;
                              const currentSpeakerIds = (item.speaker_ids || []).map(id => String(id));
                              const isSelected = currentSpeakerIds.includes(String(speakerId));
                              const speakerName = speaker.name || `${speaker.first_name || ""} ${speaker.last_name || ""}`.trim();

                              return (
                                <label
                                  key={speakerId}
                                  className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${isSelected ? "bg-blue-50/30" : ""
                                    }`}
                                >
                                  <div
                                    className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected
                                      ? "bg-[#003B73] border-[#003B73]"
                                      : "bg-white border-gray-300 hover:border-gray-400"
                                      }`}
                                  >
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      const currentSpeakers = item.speaker_ids || [];
                                      const newSpeakers = isSelected
                                        ? currentSpeakers.filter(id => String(id) !== String(speakerId))
                                        : [...currentSpeakers, String(speakerId)];
                                      updateAgendaItem(item.id, "speaker_ids", newSpeakers);
                                    }}
                                    className="hidden"
                                  />
                                  <span className={`text-sm ${isSelected ? "text-gray-900 font-medium" : "text-gray-700"}`}>
                                    {speakerName}
                                    {(speaker.designation || speaker.organization) && (
                                      <span className="text-xs text-gray-400 font-normal block mt-0.5">
                                        {speaker.designation}{speaker.designation && speaker.organization ? ' - ' : ''}{speaker.organization}
                                      </span>
                                    )}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateAgendaItem(item.id, "description", e.target.value)}
                        placeholder="Enter description..."
                        maxLength={200}
                        rows={3}
                        className="w-full px-3 py-3 text-sm border border-gray-200 hover:border-gray-400 rounded-lg outline-none focus:border-blue-500 resize-none text-gray-700 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {item.description.length}/200 characters
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add More Agenda link aligned neatly - Always visible */}
            <div className="pl-8 pt-2 pb-4">
              <button
                type="button"
                onClick={addMoreAgenda}
                className="text-[13px] font-semibold text-[#003B73] focus:outline-none"
              >
                Add More Agenda
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Always visible for adding new agendas */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white z-10">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-6 py-2 text-[13px] font-semibold border border-[#003B73] rounded-md text-[#003B73] hover:bg-blue-50 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || editAgenda}
            className="px-6 py-2 text-[13px] font-semibold bg-[#003B73] text-white rounded-md hover:bg-[#002B54] focus:ring-2 focus:ring-blue-900 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddAgendaDrawer;
