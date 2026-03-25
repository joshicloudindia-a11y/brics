import axios from "axios";
import { toast } from "react-toastify";

/* API BASE URL */
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fail fast if not set (prevents localhost in production)
if (!BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not defined. Check your environment variables.");
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/* REQUEST INTERCEPTOR */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let browser set FormData content-type automatically
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Single-flight guard to avoid multiple toasts/redirects on concurrent 401s
let handling401 = false;

const handleUnauthorized = (reason) => {
  if (handling401) return;
  handling401 = true;

  localStorage.removeItem("token");

  if (reason === "SESSION_REPLACED") {
    toast.error("Someone logged in from another device");
  } else {
    toast.error("Your session expired. Please login again.");
  }

  setTimeout(() => {
    window.location.replace("/login");
  }, 1500);
};

/* RESPONSE INTERCEPTOR */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    const isUserUpdateEndpoint =
      error.config?.url?.includes("/api/auth/users/") &&
      error.config?.method === "put";

    if (status === 401 && !isUserUpdateEndpoint) {
      const reason = error.response?.data?.message;

      handleUnauthorized(reason);
    }

    return Promise.reject(error);
  }
);

export default api;