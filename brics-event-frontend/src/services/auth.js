import api from "./axios";

/* =========================================================
   REGISTRATION FLOW
   ========================================================= */

/**
 * Send OTP Login
 * Backend: POST /api/auth/login/send-otp
 */
export const sendRegisterOtp = async (payload) => {
  const res = await api.post("/api/auth/login/send-otp", payload);
  return res.data;
};

/**
 * Verify Login OTP
 * Backend: POST /api/auth/login/verify-otp
 */
export const verifyRegisterOtp = async (payload) => {
  const res = await api.post("/api/auth/login/verify-otp", payload);
  return res.data;
};

/**
 * Save / Update User Profile
 * Backend: POST /api/auth/profile
 * (NO event registration here)
 */
export const saveUserProfile = async (payload) => {
  const res = await api.post("/api/auth/profile", payload);
  return res.data;
};

/* =========================================================
   LOGIN FLOW (OTP + JWT)
   ========================================================= */

/**
 * Send OTP for ADMIN Login
 * Backend: POST /api/auth/login/send-otp
 */
export const sendLoginOtp = async (payload) => {
  const res = await api.post("/api/auth/login/send-otp", payload);
  return res.data;
};

export const logOut = async () => {
  const res = await api.post("/api/auth/logout");
  return res.data;
};

/**
 * Verify ADMIN Login OTP (JWT issued)
 * Backend: POST /api/auth/login/verify-otp
 */
export const verifyLoginOtp = async (payload) => {
  const res = await api.post("/api/auth/login/verify-otp", payload);
  return res.data;
};

export const refreshToken = async () => {
  const res = await api.post("/api/auth/refresh", {
    withCredentials: true,
  });
  return res.data;
};

/** Get logged-in user details */
export const getUserDetails = async () => {
  const res = await api.get("/api/auth/details");
  return res.data;
};

export const updateUserDetails = async (payload) => {
  const res = await api.put("/api/auth/update", payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res.data;
};

/** Update specific user details by userId (role-based permissions) */
export const updateUserDetailsById = async (userId, payload) => {
  // console.log("Updating user profile for ID:", userId, "with payload:", payload);
  try {
    const res = await api.put(`/api/auth/users/${userId}/update`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    // console.log("Update response:", res);
    return res.data;
  } catch (error) {
    console.error("Update failed with error:", error);
    console.error("Error response:", error.response);
    throw error;
  }
};

/**
 * Create DAO users for a specific event
 */
export const createDaoForEvent = async (eventId, payload) => {
  const res = await api.post(`/api/auth/events/${eventId}/dao`, payload);
  return res.data;
};

/**
 * Bulk import DAO users for a specific event (from Excel)
 * Backend: POST /api/auth/events/{eventId}/bulk-daos
 * @param {string} eventId - The ID of the event
 * @param {object} payload - { daos: [{firstName, lastName, email, ...}, ...] }
 * @returns {Promise} Response with import results
 */
export const createBulkDaosForEvent = async (eventId, payload) => {
  const res = await api.post(`/api/auth/events/${eventId}/bulk-daos`, payload);
  return res.data;
};

/**
 * Toggle user status (activate/deactivate)
 * Backend: PATCH /api/auth/users/{userId}/status
 * @param {string} userId - The ID of the user to activate/deactivate
 * @param {string} action - 'activate' or 'deactivate'
 * @returns {Promise} Response with affected users and status information
 */
export const toggleUserStatus = async (userId, action) => {
  const res = await api.patch(`/api/auth/users/${userId}/status`, {
    action: action, // 'activate' or 'deactivate'
  });
  return res.data;
};

/**
 * Update User Role
 * Backend: PUT /api/auth/user/update-role
 * @param {string} userId - The UUID of the user
 * @param {string} role - The name of the role to assign (e.g., 'INTERPRETER', 'DELEGATE')
 * @returns {Promise} Response with updated user information
 */
export const updateUserRole = async (userId, role) => {
  const res = await api.put("/api/auth/user/update-role", {
    user_id: userId,
    role: role,
  }, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res.data;
};

/* =========================================================
   PASS EMAIL & DOWNLOAD
   ========================================================= */

/**
 * Send Pass Email Notification
 * Backend: POST /api/auth/send-pass-email
 * @param {Object} payload - { userId, eventId }
 * @returns {Promise} Response with success status
 */
export const sendPassEmail = async (payload) => {
  const res = await api.post("/api/auth/send-pass-email", payload);
  return res.data;
};

/**
 * Download Pass PDF (Authenticated)
 * Backend: GET /api/auth/download-pass
 * @param {Object} params - { userId, eventId } (optional, uses current user if not provided)
 * @returns {Promise} PDF blob for download
 */
export const downloadPass = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const url = `/api/auth/download-pass${queryParams ? `?${queryParams}` : ""}`;
  const res = await api.get(url, { responseType: "blob" });
  return res.data;
};
