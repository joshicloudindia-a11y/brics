import api from "./axios";

/**
 * Get all agendas for a session
 */
export const getSessionAgendas = async (sessionId) => {
  const res = await api.get(`/api/sessions/${sessionId}/agendas`);
  return res.data;
};

/**
 * Get single agenda by ID
 */
export const getAgendaById = async (agendaId) => {
  const res = await api.get(`/api/agendas/${agendaId}`);
  return res.data;
};

/**
 * Create agenda(s) for a session - supports bulk creation
 */
export const createAgendas = async (sessionId, agendasData) => {
  const res = await api.post(`/api/sessions/${sessionId}/agendas`, {
    agendas: Array.isArray(agendasData) ? agendasData : [agendasData],
  });
  return res.data;
};

/**
 * Update an agenda
 */
export const updateAgenda = async (agendaId, agendaData) => {
  const res = await api.put(`/api/agendas/${agendaId}`, agendaData);
  return res.data;
};

/**
 * Delete an agenda (soft delete)
 */
export const deleteAgenda = async (agendaId) => {
  const res = await api.delete(`/api/agendas/${agendaId}`);
  return res.data;
};

/**
 * Add speakers to agenda
 */
export const addAgendaSpeakers = async (agendaId, speakerIds) => {
  const res = await api.post(`/api/agendas/${agendaId}/speakers`, {
    speaker_ids: speakerIds,
  });
  return res.data;
};

/**
 * Remove speaker from agenda
 */
export const removeAgendaSpeaker = async (agendaId, speakerId) => {
  const res = await api.delete(`/api/agendas/${agendaId}/speakers/${speakerId}`);
  return res.data;
};

/**
 * Validate agenda time overlap
 */
export const validateAgendaTime = async (sessionId, startTime, endTime, excludeAgendaId = null) => {
  const res = await api.post(`/api/sessions/${sessionId}/agendas/validate-time`, {
    start_time: startTime,
    end_time: endTime,
    exclude_agenda_id: excludeAgendaId,
  });
  return res.data;
};
