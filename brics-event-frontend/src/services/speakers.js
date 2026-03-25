import api from "./axios";

/**
 * Get all speakers (global) with pagination
 */
export const getAllSpeakers = async (params = {}) => {
  const { page = 1, limit = 20, search = "", status = "" } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(status && { status })
  });

  const res = await api.get(`/api/auth/speakers?${queryParams}`);
  return res.data;
};

/**
 * Get current speaker profile
 */
export const getCurrentSpeakerProfile = async (userId) => {
  if (!userId) return null;
  const res = await api.get(`/api/auth/speakers/${userId}`);
  return res.data;
};

/**
 * Get a single speaker by ID
 */
export const getSpeakerById = async (speakerId) => {
  if (!speakerId) return null;
  const res = await api.get(`/api/speakers/${speakerId}`);
  return res.data;
};

/**
 * Add a new speaker (global, not event-specific)
 */
export const addSpeaker = async (payload, config = {}) => {
  const defaultConfig = { headers: { "Content-Type": "multipart/form-data" } };
  const mergedConfig = { ...defaultConfig, ...config };
  const res = await api.post(`/api/speakers`, payload, mergedConfig);
  return res.data;
};

/**
 * Update a speaker
 */
export const updateSpeaker = async (speakerId, payload, config = {}) => {
  const defaultConfig = { headers: { "Content-Type": "multipart/form-data" } };
  const mergedConfig = { ...defaultConfig, ...config };
  const res = await api.put(`/api/speakers/${speakerId}`, payload, mergedConfig);
  return res.data;
};

/**
 * Delete a speaker
 */
export const deleteSpeaker = async (speakerId) => {
  const res = await api.delete(`/api/speakers/${speakerId}`);
  return res.data;
};

/**
 * Update speaker status
 */
export const updateSpeakerStatus = async (speakerId, status) => {
  const res = await api.patch(`/api/speakers/${speakerId}/status`, { status });
  return res.data;
};

/**
 * Update speaker profile (for speaker user)
 */
export const updateSpeakerProfile = async (userId, payload, config = {}) => {
  // Check if payload is FormData or JSON
  const isFormData = payload instanceof FormData;
  const defaultConfig = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : { headers: { "Content-Type": "application/json" } };

  const mergedConfig = { ...defaultConfig, ...config };
  const res = await api.patch(`/api/auth/speakers/${userId}`, payload, mergedConfig);
  return res.data;
};

/**
 * Add speakers using new JSON API endpoint
 */
export const addSpeakersJSON = async (speakersData) => {
  const res = await api.post(`/api/auth/speakers`, speakersData);
  return res.data;
};
