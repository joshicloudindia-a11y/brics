import api from "./axios";

/**
 * Save hotel accommodation details
 */
export const saveHotel = async (payload) => {
  const res = await api.post("/api/hotel", payload);
  return res.data;
};

/**
 * Get hotel accommodation list
 */
export const getHotel = async (params) => {
  const res = await api.get("/api/hotel/list", { params });
  return res.data;
};

/**
 * Get event hotel details
 */
export const getEventHotelDetails = async (eventId) => {
  const res = await api.get(`/api/hotel/event/${eventId}`);
  return res.data;
};


/**
 * Hotel Master CRUD APIs
 */
export const createHotelMaster = async (payload) => {
  const res = await api.post("/api/hotel-master", payload);
  return res.data;
};

export const getHotelMasterList = async (params) => {
  const res = await api.get("/api/hotel-master", { params });
  return res.data;
};

export const updateHotelMaster = async (id, payload) => {
  const res = await api.put(`/api/hotel-master/${id}`, payload);
  return res.data;
};

export const deleteHotelMaster = async (id) => {
  const res = await api.delete(`/api/hotel-master/${id}`);
  return res.data;
};
