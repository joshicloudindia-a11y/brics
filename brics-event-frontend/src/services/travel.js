import api from "./axios";

/**
 * Save full travel (arrival + departure)
 */
export const saveTravel = async (formData) => {
  const res = await api.post("/api/travel", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

/**
 * Get travel
 */
export const getTravel = async (params) => {
  const res = await api.get("/api/travel/list", { params });
  return res.data;
};
