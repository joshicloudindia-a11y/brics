// Derive a friendly label for meeting links based on host/subdomain
export const getMeetingLabel = (rawUrl) => {
  if (!rawUrl) return "Join Meeting";
  try {
    const parsed = rawUrl.startsWith("http") ? new URL(rawUrl) : new URL(`https://${rawUrl}`);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host.includes("zoom")) return "Join Zoom Meeting";
    if (host.includes("meet.google") || (host.includes("google") && rawUrl.includes("meet"))) return "Join Google Meet";
    if (host.includes("teams.microsoft") || (host.includes("microsoft") && rawUrl.includes("teams"))) return "Join Teams";
    if (host.includes("webex")) return "Join Webex";
    if (host.includes("jit.si") || host.includes("jitsi")) return "Join Jitsi";
    if (host.includes("gotomeeting")) return "Join GoToMeeting";
    if (host.includes("whereby")) return "Join Whereby";

    // Fallback to generic label
    return "Join Meeting";
  } catch (err) {
    return "Join Meeting";
  }
};