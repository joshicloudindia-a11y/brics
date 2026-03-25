import api from "./axios";

export const upsertEvent = async (payload) => {
  const res = await api.post("/api/events/save", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// upsertEvent

/** Get list of events */
export const getEvents = async () => {
  const res = await api.get("/api/events/list");
  return res.data;
};

/** Get events scoped to the authenticated event manager */
export const getManagerEvents = async () => {
  const res = await api.get("/api/events/manager/my-events");
  const payload = res?.data;

  if (!payload) return [];

  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.events)) return payload.events;

  if (Array.isArray(payload?.data)) return payload.data;

  return payload.events || payload.data || [];
};

/**
 * Attend Event
 */
export const attendEvent = async (payload) => {
  const res = await api.post("/api/events/user-event", payload);
  return res.data;
};

export const getUserEventStatus = async (eventId) => {
  if (!eventId) return null;

  const res = await api.get("/api/events/user/all");
  const payload = res?.data?.data ?? res?.data ?? [];

  if (!Array.isArray(payload)) return null;

  const normalizedId = String(eventId);

  const match = payload.find((entry) => {
    if (!entry || typeof entry !== "object") return false;

    const candidateIds = [
      entry.event_id,
      entry._id,
      entry.id,
      entry?.event?._id,
      entry?.event?.event_id,
    ]
      .filter(Boolean)
      .map(String);

    return candidateIds.includes(normalizedId);
  });

  return match || null;
};

export const attendEventList = async (view = null) => {
  const res = await api.get("/api/events/user/list", {
    params: view ? { view } : {},
  });
  return res.data;
};

/**
 * Verify QR Accreditation
 */
export const verifyQrAccreditation = async (accreditationId) => {
  const res = await api.get(`/api/auth/event/verify/${accreditationId}`);
  return res.data;
};

export const getUserEventList = async () => {
  const res = await api.get("/api/events/user/all");
  return res.data;
};

/**
 * Get Single Event By ID
 */
export const getEventById = async (eventId) => {
  const res = await api.get(`/api/events/${eventId}`);
  return res.data;
};

/**
 * Get Event Managers (Super Admin only)
 */
export const getEventManagers = async () => {
  const res = await api.get("/api/events/admin/event-managers");
  return res.data;
};

// Create / Assign Event Manager (Super Admin)
export const addEventManager = async (payload) => {
  const res = await api.post("/api/events/admin/event-managers", payload);
  return res.data;
};

// Update Event Manager (Super Admin) - Backend API endpoint required
export const updateEventManager = async (managerId, payload) => {
  const res = await api.put(`/api/events/admin/event-managers/${managerId}`, payload);
  return res.data;
};

export const getSignleEventDetails = async (payload) => {
  const res = await api.get(`/api/events/${payload}`);
  return res.data;
};

/** Get dashboard counts */
export const getDashboardCounts = async () => {
  const res = await api.get("/api/events/admin/dashboard-counts");
  return res.data;
};

/**
 * Get Delegates with Inviters for an Event
 */
export const getEventDelegatesWithInviters = async (eventId) => {
  if (!eventId) return null;
  const res = await api.get(`/api/events/${eventId}/delegates-with-inviters`);
  return res.data;
};

/**
 * Get Travel Details for an Event
 */
export const getEventTravelDetails = async (eventId) => {
  if (!eventId) return null;
  const res = await api.get(`/api/events/${eventId}/travel-details`);
  return res.data;
};

/**
 * Get Hotel Accommodation Details for an Event
 */
export const getEventHotelDetails = async (eventId) => {
  if (!eventId) return null;
  const res = await api.get(`/api/events/${eventId}/hotel-details`);
  return res.data;
};

export const downloadEventReport = async (eventId, type = "default") => {
  if (!eventId) return;

  return await api.get(`/api/events/${eventId}/report`, {
    params: { type }, // ✅ THIS IS IMPORTANT
    responseType: "blob",
  });
};
