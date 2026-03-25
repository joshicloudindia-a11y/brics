import api from "./axios";

/**
 * Get all sessions
 */
export const getAllSessions = async (page = 1, limit = 100) => {
  const res = await api.get(`/api/sessions`, {
    params: { page, limit },
  });
  return res.data;
};

/**
 * Get all sessions for an event
 */
export const getEventSessions = async (eventId) => {
  const res = await api.get(`/api/events/${eventId}/sessions`);
  return res.data;
};

/**
 * Get a single session by ID
 */
export const getSessionById = async (sessionId) => {
  const res = await api.get(`/api/sessions/${sessionId}`);
  return res.data;
};

/**
 * Create a new session
 */
export const createSession = async (eventId, sessionData) => {
  try {
    const res = await api.post(`/api/events/${eventId}/sessions`, sessionData);
    // Handle new response structure for hall booking
    if (res.data.hall_booking?.success) {
      return { ...res.data, hallBooked: true };
    } else if (res.data.booking_error) {
      throw new Error(res.data.message || 'Hall booking failed');
    }
    return res.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a session
 */
export const updateSession = async (sessionId, sessionData) => {
  try {
    const res = await api.put(`/api/sessions/${sessionId}`, sessionData);
    // Handle new response structure for hall booking
    if (res.data.hall_booking?.success) {
      return { ...res.data, hallBooked: true };
    } else if (res.data.booking_error) {
      throw new Error(res.data.message || 'Hall update failed');
    }
    return res.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a session
 */
export const deleteSession = async (sessionId) => {
  const res = await api.delete(`/api/sessions/${sessionId}`);
  return res.data;
};

/**
 * Add participant to session
 */
export const addSessionParticipant = async (sessionId, participantData) => {
  const res = await api.post(
    `/api/sessions/${sessionId}/participants`,
    participantData
  );
  return res.data;
};

/**
 * Remove participant from session
 */
export const removeSessionParticipant = async (sessionId, userId) => {
  const res = await api.delete(
    `/api/sessions/${sessionId}/participants/${userId}`
  );
  return res.data;
};

/**
 * Get session participants
 */
export const getSessionParticipants = async (sessionId) => {
  const res = await api.get(`/api/sessions/${sessionId}/participants`);
  return res.data;
};
