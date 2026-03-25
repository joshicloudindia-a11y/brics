import api from "./axios";

export const getOrganizations = async (params = {}) => {
  const res = await api.get(`/api/organizations`, { params });
  // Expecting API to return array of organizations
  // Return the response data directly
  return res.data;
};

export default { getOrganizations };