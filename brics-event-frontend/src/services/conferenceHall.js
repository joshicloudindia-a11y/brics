import api from "./axios";

export const createConferenceHall = async (hallData) => {
  const res = await api.post("/api/conference/halls", hallData);
  return res.data;
};

export const createMultipleConferenceHalls = async (hallsData) => {
  const res = await api.post("/api/conference/halls/bulk", hallsData);
  return res.data;
};

export const getAllConferenceHalls = async (params) => {
  const res = await api.get("/api/conference/halls", { params });
  return res.data;
};

export const getAvailableHalls = async (params) => {
  const res = await api.get("/api/conference/halls/available", { params });
  return res.data;
};

export const getSingleConferenceHall = async (hallId) => {
  const res = await api.get(`/api/conference/halls/${hallId}`);
  return res.data;
};

export const updateConferenceHall = async (hallId, hallData) => {
  const payload = {
    hall_name: hallData.hall_name,
    venue_name: hallData.venue_name,
    floor_name: hallData.floor_name,
    state: hallData.state,
    city: hallData.city,
    capacity: hallData.capacity,
    video_conference_enabled: hallData.video_conference_enabled,
    event_id: hallData.event_id,
    start_date: hallData.start_date,
    end_date: hallData.end_date,
  };
  const res = await api.put(`/api/conference/halls/${hallId}`, payload);
  return res.data;
};

export const deleteConferenceHall = async (hallId) => {
  const res = await api.delete(`/api/conference/halls/${hallId}`);
  return res.data;
};

export const assignHallToEvent = async (hallId, assignmentData) => {
  const res = await api.post(`/api/conference/halls/${hallId}/assign`, assignmentData);
  return res.data;
};

export const unassignHall = async (hallId, unassignmentData) => {
  const res = await api.post(`/api/conference/halls/${hallId}/unassign`, unassignmentData);
  return res.data;
};

export const getEventHalls = async (eventId) => {
  const res = await api.get(`/api/conference/halls/event/${eventId}`);
  return res.data;
};
