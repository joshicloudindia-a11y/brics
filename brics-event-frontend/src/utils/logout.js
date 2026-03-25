import { queryClient } from "../lib/queryClient";
import { logOut } from "../services/auth";

export const logout = async () => {
  await logOut();
  queryClient.clear();
  localStorage.removeItem("token");
  window.location.href = "/login";
};
