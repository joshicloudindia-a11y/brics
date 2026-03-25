import api from "./axios";

/**
 * Get designation list
 */
export const getDesignations = async (params = {}) => {
  const res = await api.get("/api/designations", { params });
  return res.data;
};

/**
 * Create new designation
 */
export const createDesignation = async (payload) => {
  const res = await api.post("/api/designations", payload);
  return res.data;
};