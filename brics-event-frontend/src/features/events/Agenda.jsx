import React, { useState, useEffect } from "react";
import {
  Clock,
  Users,
  Edit2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import { getSessionAgendas, deleteAgenda } from "../../services/agenda";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import AddAgendaDrawer from "./AddAgendaDrawer";
import ConfirmModal from "../../components/common/ConfirmModal";

const Agenda = ({ sessionId, sessionData, eventId }) => {
  const { data: currentUser } = useCurrentUser();
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addAgendaOpen, setAddAgendaOpen] = useState(false);
  const [editAgenda, setEditAgenda] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [agendaToDelete, setAgendaToDelete] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});

  // Check user role permissions
  const userRole = currentUser?.role?.name?.toUpperCase();
  const canEdit = ["SUPER ADMIN", "EVENT ADMIN", "SESSION MANAGER"].includes(userRole);
  const canDelete = ["SUPER ADMIN", "EVENT ADMIN"].includes(userRole);

  useEffect(() => {
    if (sessionId) {
      fetchAgendas();
    }
  }, [sessionId]);

  const fetchAgendas = async () => {
    try {
      setLoading(true);
      const data = await getSessionAgendas(sessionId);
      const agendasArray = Array.isArray(data) ? data : data?.agendas || data?.data || [];
      setAgendas(agendasArray);

      // Auto-expand all dates by default
      const dates = getGroupedAgendas(agendasArray);
      const expanded = {};
      Object.keys(dates).forEach((date) => {
        expanded[date] = true;
      });
      setExpandedDates(expanded);
    } catch (err) {
      console.error("Failed to fetch agendas:", err);
      toast.error("Failed to load agendas");
    } finally {
      setLoading(false);
    }
  };

  const getGroupedAgendas = (agendaList) => {
    // Group agendas by session date (since agendas only have time, not date)
    const grouped = {};
    
    // Use session date as the grouping key
    let sessionDate = null;
    
    if (sessionData) {
      // Try to get date from session start_time or startTime
      const sessionStartTime = sessionData.start_time || sessionData.startTime || sessionData.date;
      if (sessionStartTime) {
        // If it's a full ISO string, extract date
        if (sessionStartTime.includes("T")) {
          sessionDate = sessionStartTime.split("T")[0];
        } else if (sessionStartTime.includes("-") && sessionStartTime.length === 10) {
          // If it's already YYYY-MM-DD format
          sessionDate = sessionStartTime;
        } else {
          // Try to parse as date
          const parsed = new Date(sessionStartTime);
          if (!isNaN(parsed.getTime())) {
            sessionDate = parsed.toISOString().split("T")[0];
          }
        }
      }
    }
    
    // If no valid session date found, use today's date
    if (!sessionDate) {
      sessionDate = new Date().toISOString().split("T")[0];
    }
    
    // Group all agendas under the session date
    if (agendaList.length > 0) {
      grouped[sessionDate] = [...agendaList];
      
      // Sort agenda items by start time
      grouped[sessionDate].sort((a, b) => {
        const timeA = a.start_time || a.startTime || "";
        const timeB = b.start_time || b.startTime || "";
        return timeA.localeCompare(timeB);
      });
    }

    return grouped;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    // Extract time part from "2026-03-10T10:00" or "10:00"
    const timePart = timeString.includes("T") ? timeString.split("T")[1] : timeString;
    const [hours, minutes] = timePart.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const toggleDateExpansion = (date) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleEdit = (agenda) => {
    setEditAgenda(agenda);
    setAddAgendaOpen(true);
  };

  const handleDeleteClick = (agenda) => {
    setAgendaToDelete(agenda);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!agendaToDelete) return;

    try {
      await deleteAgenda(agendaToDelete._id || agendaToDelete.id);
      toast.success("Agenda deleted successfully");
      fetchAgendas();
      setDeleteConfirmOpen(false);
      setAgendaToDelete(null);
    } catch (err) {
      console.error("Failed to delete agenda:", err);
      toast.error(err.response?.data?.message || "Failed to delete agenda");
    }
  };

  const handleAgendaAdded = () => {
    fetchAgendas();
    setAddAgendaOpen(false);
    setEditAgenda(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
      </div>
    );
  }

  const groupedAgendas = getGroupedAgendas(agendas);
  const dateKeys = Object.keys(groupedAgendas).sort();

  if (dateKeys.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Agenda Items Added</h3>
        <p className="text-gray-500 mb-6">
          Add agenda items to define the session schedule with timings and speakers.
        </p>
        {canEdit && (
          <button
            onClick={() => setAddAgendaOpen(true)}
            className="px-6 py-2.5 bg-[#1e4788] text-white rounded-lg hover:bg-[#163761] transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Add Agenda
          </button>
        )}

        <AddAgendaDrawer
          open={addAgendaOpen}
          onClose={() => {
            setAddAgendaOpen(false);
            setEditAgenda(null);
          }}
          sessionId={sessionId}
          sessionData={sessionData}
          eventId={eventId}
          onAgendaAdded={handleAgendaAdded}
          editAgenda={editAgenda}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Session Agenda</h3>
          <p className="text-sm text-gray-600">
            {agendas.length} agenda item{agendas.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setAddAgendaOpen(true)}
            className="px-4 py-2 bg-[#1e4788] text-white rounded-lg hover:bg-[#163761] transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Add Agenda
          </button>
        )}
      </div>

      {/* Timeline View - Date-wise Grouping */}
      <div className="space-y-6">
        {dateKeys.map((date) => (
          <div key={date} className="border rounded-lg overflow-hidden">
            {/* Date Header */}
            <button
              onClick={() => toggleDateExpansion(date)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-800">{formatDate(date)}</p>
                  <p className="text-xs text-gray-600">
                    {groupedAgendas[date].length} item{groupedAgendas[date].length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {expandedDates[date] ? (
                <ChevronUp size={20} className="text-gray-600" />
              ) : (
                <ChevronDown size={20} className="text-gray-600" />
              )}
            </button>

            {/* Agenda Items */}
            {expandedDates[date] && (
              <div className="bg-white p-4 space-y-4">
                {groupedAgendas[date].map((agenda, index) => (
                  <div
                    key={agenda._id || agenda.id}
                    className="relative pb-4 last:pb-0"
                  >
                    {/* Time Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                        <Clock size={14} />
                        <span>
                          {formatTime(agenda.start_time || agenda.startTime)} -{" "}
                          {formatTime(agenda.end_time || agenda.endTime)}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(agenda)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(agenda)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-semibold text-gray-900 mb-2">
                      {agenda.title}
                    </h4>

                    {/* Description */}
                    {agenda.description && (
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        {agenda.description}
                      </p>
                    )}

                    {/* Speakers */}
                    {agenda.speakers && agenda.speakers.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                          {agenda.speakers.length === 1 ? "Speaker" : "Speakers"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {agenda.speakers.map((speaker, idx) => {
                            const speakerName = speaker.name || speaker.user_name || `${speaker.first_name || ""} ${speaker.last_name || ""}`.trim();
                            const designation = speaker.designation || speaker.title || "";
                            const organization = speaker.organization || speaker.organisation || speaker.company || "";
                            const photoUrl = speaker.photo_signed_url || speaker.photo_url || speaker.avatar || speaker.image;
                            const initials = speakerName
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase() || "SP";

                            return (
                              <div 
                                key={idx} 
                                className="inline-flex items-center gap-2.5 bg-[#e3f2fd] text-gray-700 rounded-full pl-1.5 pr-4 py-1.5"
                              >
                                {/* Speaker Photo */}
                                <div className="w-9 h-9 rounded-full bg-blue-600 overflow-hidden flex-shrink-0">
                                  {photoUrl ? (
                                    <img 
                                      src={photoUrl} 
                                      alt={speakerName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = `<span class="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">${initials}</span>`;
                                      }}
                                    />
                                  ) : (
                                    <span className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">{initials}</span>
                                  )}
                                </div>
                                
                                {/* Speaker Info */}
                                <div className="flex flex-col min-w-0 max-w-[200px]">
                                  <span className="text-[13px] font-semibold leading-tight truncate">
                                    {speakerName}
                                  </span>
                                  {(designation || organization) && (
                                    <span className="text-[10px] leading-tight truncate opacity-90">
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

                    {/* Divider (except for last item) */}
                    {index !== groupedAgendas[date].length - 1 && (
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Agenda Drawer */}
      <AddAgendaDrawer
        open={addAgendaOpen}
        onClose={() => {
          setAddAgendaOpen(false);
          setEditAgenda(null);
        }}
        sessionId={sessionId}
        sessionData={sessionData}
        eventId={eventId}
        onAgendaAdded={handleAgendaAdded}
        editAgenda={editAgenda}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setAgendaToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Agenda"
        message={`Are you sure you want to delete "${agendaToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default Agenda;