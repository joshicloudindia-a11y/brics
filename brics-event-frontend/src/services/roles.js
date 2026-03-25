import api from "./axios";

export const getRoles = async () => {
  const response = await api.get("/api/roles", {
    params: { type: "EVENT" },
  });
  return response.data;
};

