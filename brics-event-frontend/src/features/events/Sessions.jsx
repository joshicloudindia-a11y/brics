
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, MapPin, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useParams } from 'react-router-dom';
import AddSessionDrawer from './AddSessionDrawer';
import AddParticipantsDrawer from './AddParticipantsDrawer';
import AttendeesDrawer from './AttendeesDrawer';
import SpeakerModal from './SpeakerModal';
import AddAgendaDrawer from './AddAgendaDrawer';
import { getEventSessions, getSessionParticipants } from '../../services/sessions';
import { getEventHalls } from '../../services/conferenceHall';
import { getSessionAgendas } from '../../services/agenda';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getMeetingLabel } from '../../utils/getMeetingLabel';

const Sessions = () => {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [participantsDrawerOpen, setParticipantsDrawerOpen] = useState(false);
  const [attendeesDrawerOpen, setAttendeesDrawerOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentParticipantType, setCurrentParticipantType] = useState('attendee');
  const [activeTab, setActiveTab] = useState({});
  const [sessionParticipants, setSessionParticipants] = useState({});
  const [loadingParticipants, setLoadingParticipants] = useState({});
  const [editSession, setEditSession] = useState(null);
  const [conferenceHalls, setConferenceHalls] = useState({});
  const [speakerModalOpen, setSpeakerModalOpen] = useState(false);
  const [currentSpeakerId, setCurrentSpeakerId] = useState(null);
  const [currentSpeakerData, setCurrentSpeakerData] = useState(null);
  const [addAgendaOpen, setAddAgendaOpen] = useState(false);
  const [sessionAgendas, setSessionAgendas] = useState({});
  const [loadingAgendas, setLoadingAgendas] = useState({});
  const [editAgenda, setEditAgenda] = useState(null);

  useEffect(() => {
    if (eventId) {
      fetchSessions();
      fetchConferenceHalls();
    }
  }, [eventId]);

  // Fetch participants for all sessions when sessions are loaded
  useEffect(() => {
    if (sessions.length > 0) {
      sessions.forEach(session => {
        if (session._id && !sessionParticipants[session._id]) {
          fetchSessionParticipants(session._id);
        }
      });
    }
  }, [sessions]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getEventSessions(eventId);
      const sessionsArray = Array.isArray(data) ? data : data?.sessions || [];
      setSessions(sessionsArray);

      // Extract agendas from session data
      const agendasMap = {};
      sessionsArray.forEach(session => {
        if (session._id && session.agendas) {
          agendasMap[session._id] = session.agendas;
        }
      });
      setSessionAgendas(agendasMap);

    } catch (err) {
      // console.error('Failed to fetch sessions:', err);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchConferenceHalls = async () => {
    try {
      const data = await getEventHalls(eventId);
      const hallsArray = Array.isArray(data) ? data : data?.halls || [];
      // Create a mapping of hall ID to hall name
      const hallsMap = {};
      hallsArray.forEach(hall => {
        const hallId = hall._id || hall.id;
        const hallName = hall.hall_name || hall.name;
        if (hallId && hallName) {
          hallsMap[hallId] = hallName;
        }
      });
      setConferenceHalls(hallsMap);
    } catch (err) {
      console.error('Failed to fetch conference halls:', err);
    }
  };

  const handleSessionAdded = (newSession, isEdit = false) => {
    const sessionData = newSession.session || newSession;
    if (isEdit) {
      // Update existing session in the list
      setSessions((prev) =>
        prev.map((session) =>
          session._id === sessionData._id
            ? { ...session, ...sessionData }
            : session
        )
      );
    } else {
      // Add new session to the list
      setSessions((prev) => [...prev, sessionData]);
    }

    // Update local agendas state if provided in the session update
    if (sessionData._id && sessionData.agendas) {
      setSessionAgendas((prev) => ({
        ...prev,
        [sessionData._id]: sessionData.agendas
      }));
    }

    // Refresh conference hall data in case hall was auto-booked
    queryClient.invalidateQueries(['event-halls', eventId]);
  };

  const fetchSessionParticipants = async (sessionId) => {
    if (sessionParticipants[sessionId]) return; // Already fetched

    try {
      setLoadingParticipants((prev) => ({ ...prev, [sessionId]: true }));
      const data = await getSessionParticipants(sessionId);

      // Handle new structured response with speakers and attendees
      const participantsData = {
        speakers: data?.speakers || [],
        attendees: data?.attendees || [],
        all: data?.all_participants || [],
      };

      setSessionParticipants((prev) => ({
        ...prev,
        [sessionId]: participantsData,
      }));
    } catch (err) {
      console.error('Failed to fetch session participants:', err);
    } finally {
      setLoadingParticipants((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const fetchSessionAgendas = async (sessionId) => {
    // Check if agendas are already loaded from session data
    if (sessionAgendas[sessionId] !== undefined) return;

    try {
      setLoadingAgendas((prev) => ({ ...prev, [sessionId]: true }));
      const data = await getSessionAgendas(sessionId);
      const agendasArray = Array.isArray(data) ? data : data?.agendas || data?.sessions?.[0]?.agendas || [];

      setSessionAgendas((prev) => ({
        ...prev,
        [sessionId]: agendasArray,
      }));
    } catch (err) {
      console.error('Failed to fetch session agendas:', err);
      toast.error('Failed to load agendas');
    } finally {
      setLoadingAgendas((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const toggleSession = (sessionId) => {
    setExpandedSessions((prev) => {
      const newState = {
        ...prev,
        [sessionId]: !prev[sessionId],
      };
      // Fetch participants when expanding (agendas are already loaded with session)
      if (newState[sessionId]) {
        fetchSessionParticipants(sessionId);
      }
      return newState;
    });
  };

  const handleParticipantsAdded = async (userObjectsToAdd, participantType) => {
    // console.log('🔵 handleParticipantsAdded called:', { userObjectsToAdd, participantType, currentSessionId });
    // If we have user objects, do optimistic update
    if (userObjectsToAdd && Array.isArray(userObjectsToAdd) && userObjectsToAdd.length > 0) {
      setSessionParticipants((prev) => {
        const currentData = prev[currentSessionId] || { speakers: [], attendees: [], all: [] };

        // Map users to participant format with needed fields
        const newParticipants = userObjectsToAdd.map(user => ({
          _id: user._id || user.id,
          user_name: user.name || user.user_name,
          user_photo: user.photo_url || user.avatar || user.user_photo,
          email: user.email,
          name: user.name || user.user_name,
          participant_type: participantType || currentParticipantType,
        }));

        // Add to appropriate array based on type
        const updatedData = {
          speakers: participantType === 'speaker'
            ? [...currentData.speakers, ...newParticipants]
            : currentData.speakers,
          attendees: participantType === 'attendee'
            ? [...currentData.attendees, ...newParticipants]
            : currentData.attendees,
          all: [...currentData.all, ...newParticipants],
        };

        return {
          ...prev,
          [currentSessionId]: updatedData,
        };
      });
    } else {
      // Clear cached data to force refetch if no data provided
      setSessionParticipants((prev) => ({
        ...prev,
        [currentSessionId]: undefined,
      }));
    }
  };

  const handleParticipantsRemoved = (removedUserIds, participantType) => {
    // Update state to remove participants immediately
    if (removedUserIds && Array.isArray(removedUserIds) && removedUserIds.length > 0) {
      setSessionParticipants((prev) => {
        const currentData = prev[currentSessionId] || { speakers: [], attendees: [], all: [] };

        // Remove from appropriate array based on type
        const updatedData = {
          speakers: participantType === 'speaker'
            ? currentData.speakers.filter(s => !removedUserIds.includes(s.user_id || s._id || s.id))
            : currentData.speakers,
          attendees: participantType === 'attendee'
            ? currentData.attendees.filter(a => !removedUserIds.includes(a.user_id || a._id || a.id))
            : currentData.attendees,
          all: currentData.all.filter(p => !removedUserIds.includes(p.user_id || p._id || p.id)),
        };

        return {
          ...prev,
          [currentSessionId]: updatedData,
        };
      });
    }

    // After a small delay, refetch to ensure data consistency
    setTimeout(() => {
      fetchSessionParticipants(currentSessionId);
    }, 300);
  };

  const handleAgendaAdded = () => {
    // Refetch sessions to get updated agendas
    fetchSessions();
  };

  const formatTime = (datetime) => {
    // Extract time from UTC datetime without timezone conversion
    const date = new Date(datetime);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (datetime) => {
    return new Date(datetime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const groupSessionsByDate = (sessions) => {
    const grouped = {};
    sessions.forEach((session) => {
      const date = new Date(session.start_datetime).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(session);
    });
    return grouped;
  };

  // Check if user has permission to add/edit sessions
  const canManageSessions =
    currentUser?.role?.name === "SUPER ADMIN" ||
    currentUser?.role?.name === "EVENT MANAGER";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading sessions...</div>
      </div>
    );
  }

  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <>
      {sessions.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="mb-6">
            <div className="relative inline-flex">
              {/* Background circle */}
              <div className="absolute inset-0 bg-[var(--color-primary-blue-light)] rounded-full opacity-50 blur-xl scale-150" />
              {/* Calendar icon */}
              <div className="relative bg-[var(--color-primary-blue-light)] p-6 rounded-full">
                <Calendar className="w-12 h-12 text-[var(--color-primary-blue)]" />
                {/* Plus badge */}
                <div className="absolute -top-2 -right-2 bg-[var(--color-primary-blue)] text-white rounded-full p-2 shadow-lg">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sessions not added
          </h2>
          <p className="text-gray-500 text-center mb-6">
            Add sessions to divide the event into sessions
          </p>

          {canManageSessions && (
            <button
              onClick={() => setAddSessionOpen(true)}
              className="px-8 py-3 bg-[var(--color-primary-blue)] text-white font-semibold rounded-lg hover:bg-[var(--color-primary-blue-dark)] transition-colors shadow-md"
            >
              Add Session
            </button>
          )}
        </div>
      ) : (
        /* Sessions List */
        <div className=" min-h-screen">
          <div className=" mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sessions ({sessions.length})</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {/* {sessions.length} session{sessions.length !== 1 ? 's' : ''} scheduled */}
                </p>
              </div>
              {canManageSessions && (
                <button
                  onClick={() => setAddSessionOpen(true)}
                  className="btn-primary-enabled text-white px-5 py-2 rounded-md"
                >
                  Add Session
                </button>
              )}
            </div>

            {/* Sessions grouped by date */}
            {Object.entries(groupedSessions).map(([date, dateSessions]) => (
              <div key={date} className="mb-6">
                {/* Date Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-[var(--color-primary-blue)] rounded-lg px-3 py-2 text-center min-w-[60px] bg-[#DBEEFE]">
                    <div className="text-xs font-medium uppercase">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-2xl font-bold">
                      {new Date(date).getDate()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(date)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {dateSessions.length} session{dateSessions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Session Cards with Timeline */}
                <div className="relative pl-[76px]">
                  {/* Timeline vertical line */}
                  <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-300" />

                  <div className="space-y-3">
                    {dateSessions.map((session, idx) => (
                      <div key={session._id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[59px] top-4 w-3 h-3 bg-[var(--color-primary-blue)] rounded-full border-2 shadow-sm" />

                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="p-4">
                            {/* Session Header */}
                            <div className="flex items-start gap-3 mb-3">
                              {/* Time Badge */}
                              <div className="px-3 py-1 bg-[#E3E8F0] rounded text-sm font-semibold whitespace-nowrap bg-[var(--color-primary-blue)] text-white">
                                {formatTime(session.start_datetime)} - {formatTime(session.end_datetime)}
                              </div>

                              {/* Category Badge */}
                              {session.category && (
                                <div className="px-3 py-1 bg-[var(--color-primary-blue-light)] text-[var(--color-primary-blue)] rounded-full border-2 border-[#C0E2FD] text-xs font-medium">
                                  {session.category}
                                </div>
                              )}

                              {/* Conference Hall */}
                              {/* {session.conference_hall_id && (() => {
                              // console.log("Rendering hall name:", {
                              //   sessionId: session._id,
                              //   conference_hall_id: session.conference_hall_id,
                              //   hallName: conferenceHalls[session.conference_hall_id],
                              //   conferenceHalls,
                              // });
                              return conferenceHalls[session.conference_hall_id];
                            })() && (
                              <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">
                                  {conferenceHalls[session.conference_hall_id]}
                                </span>
                              </div>
                            )} */}
                              <div className="flex-1" />

                              {/* Actions */}
                              {canManageSessions && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const latestAgendas = await getSessionAgendas(session._id);
                                      const agendasArray = Array.isArray(latestAgendas)
                                        ? latestAgendas
                                        : latestAgendas?.agendas || latestAgendas?.sessions?.[0]?.agendas || [];

                                      const sessionWithAgendas = {
                                        ...session,
                                        agendas: agendasArray
                                      };
                                      setEditSession(sessionWithAgendas);
                                      setAddSessionOpen(true);
                                    } catch (error) {
                                      console.error("Failed to fetch latest agendas before edit", error);
                                      const sessionWithAgendas = {
                                        ...session,
                                        agendas: sessionAgendas[session._id] || session.agendas || []
                                      };
                                      setEditSession(sessionWithAgendas);
                                      setAddSessionOpen(true);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-blue-light)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-primary-blue-light)] transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  <span className="text-sm font-medium">Edit</span>
                                </button>
                              )}
                              <button
                                onClick={() => toggleSession(session._id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {expandedSessions[session._id] ? (
                                  <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </button>
                            </div>

                            {/* Session Title */}
                            <h3 className="text-base font-semibold text-gray-900 mb-2">
                              {session.name}
                            </h3>

                            {/* Description */}
                            {session.description && (
                              <p className="text-sm text-gray-600 mb-3">
                                {session.description}
                              </p>
                            )}
                            {/* Meeting URL Button */}
                            {(() => {
                              const meetingRaw = session.meeting_url || session.meetingUrl;
                              if (!meetingRaw) return null;
                              const meetingHref = meetingRaw.startsWith("http")
                                ? meetingRaw
                                : `https://${meetingRaw}`;
                              const label = getMeetingLabel(meetingHref);
                              return (
                                <a
                                  href={meetingHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs lg:text-sm border border-[var(--text-primary)] rounded px-2 py-1 text-[var(--text-primary)] hover:bg-[#dbeafe] mb-2"
                                  style={{ display: 'inline-block', maxWidth: 'fit-content' }}
                                >
                                  {label}
                                </a>
                              );
                            })()}

                            {/* Conference Hall */}
                            {session.conference_hall_id && conferenceHalls[session.conference_hall_id] && (
                              <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">{conferenceHalls[session.conference_hall_id]}</span>
                              </div>
                            )}

                            {/* Collapsed View: show Speakers/Attendees as tabs */}
                            {!expandedSessions[session._id] && (
                              <div className="mt-3">
                                <div className="flex gap-6 border-b border-gray-200">
                                  <button
                                    onClick={() => setActiveTab({ ...activeTab, [session._id]: 'speakers' })}
                                    className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${(activeTab[session._id] || 'speakers') === 'speakers'
                                      ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                      }`}
                                  >
                                    Speakers
                                  </button>
                                  <button
                                    onClick={() => setActiveTab({ ...activeTab, [session._id]: 'attendees' })}
                                    className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${(activeTab[session._id] || 'speakers') === 'attendees'
                                      ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                      }`}
                                  >
                                    Attendees
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveTab({ ...activeTab, [session._id]: 'agenda' });
                                    }}
                                    className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${(activeTab[session._id] || 'speakers') === 'agenda'
                                      ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                      }`}
                                  >
                                    Agenda
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                                  <div className="flex flex-col w-full">
                                    <span className="font-medium">{(activeTab[session._id] || 'speakers') === 'speakers' ? '' : ''}</span>
                                    <div className="w-full">
                                      <div className="w-full">
                                        {((activeTab[session._id] || 'speakers') === 'speakers') ? (
                                          // Speakers: keep original behavior (show 4 chips)
                                          sessionParticipants[session._id]?.speakers && sessionParticipants[session._id].speakers.length > 0 ? (
                                            (sessionParticipants[session._id]?.speakers || []).slice(0, 4).map((person, idx) => (
                                              <div
                                                key={person._id || idx}
                                                className="inline-flex items-center gap-3 px-2 py-1.5 bg-[var(--color-primary-blue-light)] text-sm rounded-full mr-2"
                                                title={person.user_name || person.name || person.email}
                                              >
                                                <div className="w-12 h-12 rounded-full bg-[var(--color-primary-blue)] flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden ">
                                                  {person.user_photo || person.photo_url || person.avatar ? (
                                                    <img src={person.user_photo || person.photo_url || person.avatar} alt={person.user_name || person.name} className="w-full h-full object-cover" />
                                                  ) : (
                                                    <span className="text-xs">{(person.user_name || person.name || 'U').substring(0, 2).toUpperCase()}</span>
                                                  )}
                                                </div>
                                                <div className="flex flex-col text-left mr-3">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setCurrentSpeakerId(person.user_id || person._id);
                                                      setCurrentSpeakerData(person);
                                                      setSpeakerModalOpen(true);
                                                    }}
                                                    className="text-sm font-medium text-gray-900 truncate text-left hover:underline "
                                                  >
                                                    {(() => {
                                                      const full = person.user_name || person.name || '';
                                                      const parts = full.split(' ');
                                                      const first = parts[0] || '';
                                                      const last = parts.slice(1).join(' ');
                                                      const org = person.organisation || person.organization || person.org || '';
                                                      return `${first}${last ? ' ' + last : ''}${org ? ', ' + org : ''}`;
                                                    })()}
                                                  </button>
                                                  <span className="text-xs text-gray-500 truncate">
                                                    {person.designation || person.professional_title || person.role || person.position || ''}
                                                  </span>
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <span className="text-xs text-gray-400">No speakers</span>
                                          )
                                        ) : (activeTab[session._id] === 'attendees') ? (
                                          // Attendees: overlapping avatars with count
                                          sessionParticipants[session._id]?.attendees && sessionParticipants[session._id].attendees.length > 0 ? (
                                            <div className="flex items-center">
                                              <div className="flex items-center -space-x-2 ">
                                                {(sessionParticipants[session._id]?.attendees || []).slice(0, 5).map((person, idx, arr) => (
                                                  <div
                                                    key={person._id || idx}
                                                    title={person.user_name || person.name || person.email}
                                                    style={{ zIndex: (arr.length - idx) + 10 }}
                                                    className="w-9 h-9 rounded-full bg-gray-400 border-2 border-white overflow-hidden flex-shrink-0"
                                                  >
                                                    {person.user_photo || person.photo_url || person.avatar ? (
                                                      <img src={person.user_photo || person.photo_url || person.avatar} alt={person.user_name || person.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                      <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold">
                                                        {(person.user_name || person.name || 'U').substring(0, 2).toUpperCase()}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>

                                              {/* Attendee count label (only when attendees tab active) handled below */}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-400">No attendees</span>
                                          )
                                        ) : (
                                          // Agenda: show agenda items
                                          sessionAgendas[session._id] && sessionAgendas[session._id].length > 0 ? (
                                            <div className="w-full space-y-4 mt-2">
                                              {(sessionAgendas[session._id] || []).map((agendaItem, idx) => (
                                                <div key={agendaItem._id || idx} className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                                  <div className="flex flex-col gap-3">
                                                    {/* Time */}
                                                    <div className="text-xs font-bold text-[var(--color-primary-blue)] uppercase tracking-wide">
                                                      {agendaItem.start_time} - {agendaItem.end_time}
                                                    </div>

                                                    {/* Title */}
                                                    <h4 className="text-base font-bold text-gray-900 leading-snug">
                                                      {agendaItem.title}
                                                    </h4>

                                                    {/* Description */}
                                                    {agendaItem.description && (
                                                      <p className="text-sm text-gray-600 leading-relaxed">
                                                        {agendaItem.description}
                                                      </p>
                                                    )}

                                                    {/* Speakers */}
                                                    {agendaItem.speakers && agendaItem.speakers.length > 0 && (
                                                      <div className="pt-3 border-t border-gray-200">
                                                        <div className="text-sm font-semibold text-gray-700 mb-3">
                                                          {agendaItem.speakers.length === 1 ? 'Speaker' : 'Speakers'}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                          {agendaItem.speakers.map((speaker, sIdx) => {
                                                            const speakerName = speaker.user_name || speaker.name || "";
                                                            const designation = speaker.designation || speaker.professional_title || speaker.role || speaker.position || "";
                                                            const organization = speaker.organisation || speaker.organization || speaker.org || "";
                                                            const photoUrl = speaker.photo_signed_url || speaker.photo_url || speaker.user_photo || speaker.avatar;
                                                            const initials = speakerName
                                                              .split(' ')
                                                              .map(n => n[0])
                                                              .join('')
                                                              .substring(0, 2)
                                                              .toUpperCase() || "SP";

                                                            return (
                                                              <div 
                                                                key={speaker._id || speaker.user_id || sIdx} 
                                                                className="inline-flex items-center gap-2.5 bg-[#e3f2fd] text-gray-700 rounded-full pl-1.5 pr-4 py-1.5"
                                                              >
                                                                <div className="w-9 h-9 rounded-full bg-blue-600 overflow-hidden flex-shrink-0">
                                                                  {photoUrl ? (
                                                                    <img
                                                                      src={photoUrl}
                                                                      alt={speakerName}
                                                                      className="w-full h-full object-cover"
                                                                      onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">${initials}</div>`;
                                                                      }}
                                                                    />
                                                                  ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">
                                                                      {initials}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                                <div className="flex flex-col min-w-0 max-w-[200px]">
                                                                  <div className="text-[13px] font-semibold leading-tight truncate">
                                                                    {speakerName}
                                                                  </div>
                                                                  {(designation || organization) && (
                                                                    <div className="text-[10px] leading-tight truncate opacity-90">
                                                                      {[designation, organization].filter(Boolean).join(', ')}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-400">No agenda</span>
                                          )
                                        )}
                                      </div>
                                      {/* Attendee count label (only when attendees tab active) - overlapping on top */}
                                      {((activeTab[session._id] || 'speakers') === 'attendees') && (
                                        <button
                                          onClick={() => {
                                            setCurrentSessionId(session._id);
                                            setAttendeesDrawerOpen(true);
                                          }}
                                          className="mt-2 relative z-30 text-sm font-medium bg-white px-2 py-0.5 rounded-full border border-gray-200 shadow-sm hover:underline"
                                          style={{ zIndex: 50 }}
                                        >
                                          {`${(sessionParticipants[session._id]?.attendees?.length || 0)} Attendee${(sessionParticipants[session._id]?.attendees?.length || 0) === 1 ? '' : 's'}`}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {canManageSessions && (
                                  <div className="mt-3">
                                    <button
                                      onClick={() => {
                                        const currentTab = activeTab[session._id] || 'speakers';
                                        if (currentTab === 'agenda') {
                                          setCurrentSessionId(session._id);
                                          setAddAgendaOpen(true);
                                        } else {
                                          setCurrentSessionId(session._id);
                                          setCurrentParticipantType(currentTab === 'speakers' ? 'speaker' : 'attendee');
                                          // console.log('🟢 Opening drawer with:', {
                                          //   sessionId: session._id,
                                          //   participantType: currentTab === 'speakers' ? 'speaker' : 'attendee',
                                          //   currentSpeakers: sessionParticipants[session._id]?.speakers?.map(s => s._id || s.id),
                                          //   currentAttendees: sessionParticipants[session._id]?.attendees?.map(a => a._id || a.id),
                                          //   firstAttendeeObject: sessionParticipants[session._id]?.attendees?.[0],
                                          //   allParticipants: sessionParticipants[session._id]
                                          // });
                                          setParticipantsDrawerOpen(true);
                                        }
                                      }}
                                      className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] font-medium"
                                    >
                                      + Add {(activeTab[session._id] || 'speakers') === 'speakers' ? 'Speaker' : (activeTab[session._id] === 'attendees' ? 'Attendee' : 'Agenda')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}


                            {/* Expanded Content */}
                            {expandedSessions[session._id] && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                {/* Tabs */}
                                <div className="flex gap-6 border-b border-gray-200">
                                  <button
                                    onClick={() => setActiveTab({ ...activeTab, [session._id]: 'speakers' })}
                                    className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${(activeTab[session._id] || 'speakers') === 'speakers'
                                      ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                      }`}
                                  >
                                    Speakers
                                  </button>
                                  <button
                                    onClick={() => setActiveTab({ ...activeTab, [session._id]: 'attendees' })}
                                    className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab[session._id] === 'attendees'
                                      ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                      }`}
                                  >
                                    Attendees
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveTab({ ...activeTab, [session._id]: 'agenda' });
                                    }}
                                    className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab[session._id] === 'agenda'
                                      ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                      }`}
                                  >
                                    Agenda
                                  </button>
                                </div>

                                {/* Speakers Section */}
                                {(activeTab[session._id] || 'speakers') === 'speakers' && (
                                  <div className="mt-4">
                                    {loadingParticipants[session._id] ? (
                                      <span className="text-xs text-gray-500">Loading...</span>
                                    ) : (sessionParticipants[session._id]?.speakers && sessionParticipants[session._id].speakers.length > 0) ? (
                                      <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                                        {(sessionParticipants[session._id]?.speakers || []).map((participant, idx) => (
                                          <div
                                            key={participant._id || idx}
                                            className="inline-flex items-center gap-3 px-3 py-1.5 bg-[var(--color-primary-blue-light)] text-sm rounded-full mr-2"
                                          >
                                            <div className="w-6 h-6 rounded-full bg-[var(--color-primary-blue-light)] flex items-center justify-center text-[var(--color-text-primary)] font-semibold flex-shrink-0 overflow-hidden">
                                              {participant.user_photo || participant.photo_url || participant.avatar ? (
                                                <img src={participant.user_photo || participant.photo_url || participant.avatar} alt={participant.user_name || participant.name} className="w-full h-full object-cover" />
                                              ) : (
                                                <span className="text-xs">{(participant.user_name || participant.name || 'U').substring(0, 2).toUpperCase()}</span>
                                              )}
                                            </div>
                                            <div className="flex flex-col text-left">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setCurrentSpeakerId(participant.user_id || participant._id);
                                                  setCurrentSpeakerData(participant);
                                                  setSpeakerModalOpen(true);
                                                }}
                                                className="text-sm font-medium text-gray-900 truncate text-left hover:underline"
                                              >
                                                {(() => {
                                                  const full = participant.user_name || participant.name || '';
                                                  const parts = full.split(' ');
                                                  const first = parts[0] || '';
                                                  const last = parts.slice(1).join(' ');
                                                  const org = participant.organisation || participant.organization || participant.org || '';
                                                  return `${first}${last ? ' ' + last : ''}${org ? ', ' + org : ''}`;
                                                })()}
                                              </button>
                                              <span className="text-xs text-gray-500 truncate">
                                                {participant.designation || participant.professional_title || participant.role || participant.position || ''}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-500">No speakers yet</span>
                                    )}
                                    {canManageSessions && (
                                      <button
                                        onClick={() => {
                                          setCurrentSessionId(session._id);
                                          setCurrentParticipantType('speaker');
                                          setParticipantsDrawerOpen(true);
                                        }}
                                        className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] font-medium mt-3"
                                      >
                                        + Add Speaker
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Attendees Section */}
                                {activeTab[session._id] === 'attendees' && (
                                  <div className="mt-4">
                                    {loadingParticipants[session._id] ? (
                                      <span className="text-xs text-gray-500">Loading...</span>
                                    ) : (sessionParticipants[session._id]?.attendees && sessionParticipants[session._id].attendees.length > 0) ? (
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center -space-x-2 max-h-[200px] overflow-y-auto">
                                          {(sessionParticipants[session._id]?.attendees || []).slice(0, 5).map((participant, idx) => (
                                            <div
                                              key={participant._id || idx}
                                              className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white overflow-hidden flex-shrink-0"
                                              title={participant.user_name || participant.name || participant.email}
                                            >
                                              {participant.user_photo || participant.photo_url || participant.avatar ? (
                                                <img src={participant.user_photo || participant.photo_url || participant.avatar} alt={participant.user_name || participant.name} className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold">
                                                  {(participant.user_name || participant.name || "U").substring(0, 2).toUpperCase()}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                          {/* {(sessionParticipants[session._id]?.attendees?.length || 0) > 5 && (
                                          <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-semibold border-2 border-white">
                                            +{(sessionParticipants[session._id]?.attendees?.length || 0) - 5}
                                          </div>
                                        )} */}
                                        </div>
                                        <button
                                          onClick={() => {
                                            setCurrentSessionId(session._id);
                                            setAttendeesDrawerOpen(true);
                                          }}
                                          className="text-sm font-medium text-[var(--color-text-primary)] hover:underline"
                                        >
                                          {`${(sessionParticipants[session._id]?.attendees?.length || 0)} Attendee${(sessionParticipants[session._id]?.attendees?.length || 0) === 1 ? '' : 's'}`}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-500">No attendees yet</span>
                                    )}
                                    {canManageSessions && (
                                      <button
                                        onClick={() => {
                                          setCurrentSessionId(session._id);
                                          setCurrentParticipantType('attendee');
                                          setParticipantsDrawerOpen(true);
                                        }}
                                        className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] font-medium mt-3"
                                      >
                                        + Add Attendee
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Agenda Section */}
                                {activeTab[session._id] === 'agenda' && (
                                  <div className="mt-4">
                                    {loadingAgendas[session._id] ? (
                                      <div className="flex items-center justify-center py-8">
                                        <div className="text-sm text-gray-500">Loading agendas...</div>
                                      </div>
                                    ) : (sessionAgendas[session._id] && sessionAgendas[session._id].length > 0) ? (
                                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                        {(sessionAgendas[session._id] || []).map((agendaItem, idx) => (
                                          <div key={agendaItem._id || idx} className="bg-[#F8FAFB] border border-gray-250 rounded-md p-3.5 relative hover:shadow-sm transition-shadow hover:bg-white">
                                            {/* Edit Button - Top Right */}
                                            {canManageSessions && (
                                              <button
                                                onClick={() => {
                                                  setCurrentSessionId(session._id);
                                                  setEditAgenda(agendaItem);
                                                  setAddAgendaOpen(true);
                                                }}
                                                className="absolute top-3.5 right-3.5 p-1.5 hover:bg-gray-100 rounded transition-colors"
                                                title="Edit agenda"
                                              >
                                                <Edit2 className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                              </button>
                                            )}

                                            {/* Time */}
                                            <div className="text-xs font-bold text-[var(--color-primary-blue)] mb-2 uppercase tracking-wide">
                                              {agendaItem.start_time} - {agendaItem.end_time}
                                            </div>

                                            {/* Title */}
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2 pr-8 line-clamp-2">{agendaItem.title}</h4>

                                            {/* Description */}
                                            {agendaItem.description && (
                                              <p className="text-xs text-gray-600 mb-3 leading-relaxed line-clamp-2">{agendaItem.description}</p>
                                            )}

                                            {/* Speakers Section */}
                                            {agendaItem.speakers && agendaItem.speakers.length > 0 && (
                                              <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="text-sm font-semibold text-gray-700 mb-3">
                                                  {agendaItem.speakers.length === 1 ? 'Speaker' : 'Speakers'}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                  {agendaItem.speakers.map((speaker, sIdx) => {
                                                    const speakerName = speaker.user_name || speaker.name || "";
                                                    const designation = speaker.designation || speaker.professional_title || speaker.role || speaker.position || "";
                                                    const organization = speaker.organisation || speaker.organization || speaker.org || "";
                                                    const photoUrl = speaker.photo_signed_url || speaker.photo_url || speaker.user_photo || speaker.avatar;
                                                    const initials = speakerName
                                                      .split(' ')
                                                      .map(n => n[0])
                                                      .join('')
                                                      .substring(0, 2)
                                                      .toUpperCase() || "SP";

                                                    return (
                                                      <div 
                                                        key={speaker._id || speaker.user_id || sIdx} 
                                                        className="inline-flex items-center gap-2.5 bg-[#e3f2fd] text-gray-700 rounded-full pl-1.5 pr-4 py-1.5"
                                                      >
                                                        <div className="w-9 h-9 rounded-full bg-blue-600 overflow-hidden flex-shrink-0">
                                                          {photoUrl ? (
                                                            <img
                                                              src={photoUrl}
                                                              alt={speakerName}
                                                              className="w-full h-full object-cover"
                                                              onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">${initials}</div>`;
                                                              }}
                                                            />
                                                          ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">
                                                              {initials}
                                                            </div>
                                                          )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 max-w-[200px]">
                                                          <div className="text-[13px] font-semibold leading-tight truncate">
                                                            {speakerName}
                                                          </div>
                                                          {(designation || organization) && (
                                                            <div className="text-[10px] leading-tight truncate opacity-90">
                                                              {[designation, organization].filter(Boolean).join(', ')}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <p className="text-sm text-gray-400 mb-2">No agenda</p>
                                      </div>
                                    )}
                                    {canManageSessions && (
                                      <button
                                        onClick={() => {
                                          setCurrentSessionId(session._id);
                                          setEditAgenda(null);
                                          setAddAgendaOpen(true);
                                        }}
                                        className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] font-medium mt-4"
                                      >
                                        + Add Agenda
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Session Drawer */}
      <AddSessionDrawer
        open={addSessionOpen}
        onClose={() => {
          setAddSessionOpen(false);
          setEditSession(null);
        }}
        eventId={eventId}
        onSessionAdded={handleSessionAdded}
        editSession={editSession}
      />

        {/* Add Participants Drawer */}
        <AddParticipantsDrawer
          open={participantsDrawerOpen}
          onClose={() => {
            setParticipantsDrawerOpen(false);
            setCurrentSessionId(null);
            setCurrentParticipantType('attendee');
          }}
          sessionId={currentSessionId}
          eventId={eventId}
          participantType={currentParticipantType}
          onParticipantsAdded={(userObjects) => handleParticipantsAdded(userObjects, currentParticipantType)}
          onParticipantsRemoved={(userIds) => handleParticipantsRemoved(userIds, currentParticipantType)}
          initialSpeakers={sessionParticipants[currentSessionId]?.speakers?.map(s => s.user_id || s._id || s.id) || []}
          initialAttendees={sessionParticipants[currentSessionId]?.attendees?.map(a => a.user_id || a._id || a.id) || []}
        />

      {/* Attendees List Drawer */}
      <AttendeesDrawer
        open={attendeesDrawerOpen}
        onClose={() => {
          setAttendeesDrawerOpen(false);
          setCurrentSessionId(null);
        }}
        title={`${(sessionParticipants[currentSessionId]?.attendees?.length || 0)} Attendees`}
        attendees={sessionParticipants[currentSessionId]?.attendees || []}
      />

      {/* Speaker Modal */}
      <SpeakerModal
        open={speakerModalOpen}
        onClose={() => {
          setSpeakerModalOpen(false);
          setCurrentSpeakerId(null);
        }}
        speakerId={currentSpeakerId}
        initialSpeaker={currentSpeakerData}
      />

      {/* Add Agenda Drawer */}
      <AddAgendaDrawer
        open={addAgendaOpen}
        onClose={() => {
          setAddAgendaOpen(false);
          setCurrentSessionId(null);
          setEditAgenda(null);
        }}
        sessionId={currentSessionId}
        sessionData={sessions.find(s => s._id === currentSessionId)}
        eventId={eventId}
        onAgendaAdded={handleAgendaAdded}
        editAgenda={editAgenda}
      />
    </>
  );
};

export default Sessions;
