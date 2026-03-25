import api from "./axios";

export const getMinistries = async (params = {}) => {
  const res = await api.get(`/api/ministries`, { params });
  return res.data;
};

export default { getMinistries };
