const STORAGE_KEY = "brics_admin_events";

export const getEvents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveEvent = (event) => {
  const events = getEvents();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...events, event]));
};
