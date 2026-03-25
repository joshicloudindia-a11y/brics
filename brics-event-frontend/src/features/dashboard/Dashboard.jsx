import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown } from "lucide-react";
import { attendEventList } from "../../services/events";
import EventCard from "./EventCard";
import EventListCard from "./EventListCard";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import EventTabs from "./EventTabs";
import SpeakerDashboard from "./SpeakerDashboard";
import { sendPassEmail } from "../../services/auth";
import { useNavigate } from "react-router-dom";

const DashboardPage = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const firstName = currentUser?.user?.first_name || "";
  const lastName = currentUser?.user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Guest";

  // Check if user is a speaker
  const roleName =
    currentUser?.role?.name || currentUser?.user?.role?.name || "";
  const isSpeaker = (roleName || "").toLowerCase() === "speaker";

  // For speakers, show the dedicated speaker dashboard
  if (isSpeaker) {
    return <SpeakerDashboard />;
  }

  // For other users (delegates, etc), show the delegate dashboard
  const [sentEmails, setSentEmails] = useState(new Set());

  // Fetch events for email sending logic
  const { data: events = [] } = useQuery({
    queryKey: ["attend-events"],
    queryFn: attendEventList,
    enabled: !!currentUser?.user,
  });

  // Send email when delegate profile becomes complete
  useEffect(() => {
    if (!currentUser?.user || !events.length) return;

    const roleName = currentUser.user.role?.name;
    const isDelegate = [
      "DELEGATE",
      "HEAD OF DELEGATE",
      "SECURITY OFFICER",
      "INTERPRETER",
      "MEDIA",
      "DEPUTY",
      "DELEGATION CONTACT OFFICER",
      "SPEAKER",
    ].includes(roleName?.toUpperCase());

    if (!isDelegate) return;

    const profileComplete = currentUser.profile_completion?.percentage >= 100;

    if (profileComplete) {
      // Send email for each registered event where email hasn't been sent
      events.forEach(async (event) => {
        const emailKey = `${currentUser.user.id}-${event.id}`;
        if (!sentEmails.has(emailKey)) {
          try {
            await sendPassEmail({
              userId: currentUser.user.id,
              eventId: event.id,
            });
            setSentEmails((prev) => new Set([...prev, emailKey]));
          } catch (error) {
            console.error("Failed to send pass email:", error);
          }
        }
      });
    }
  }, [currentUser, events, sentEmails]);

  if (userLoading) {
    return <div>Loading...</div>;
  }

  // Check if user is non-admin (DAO, Media, etc.)
  const isEventManager =
    currentUser?.role?.name === "EVENT MANAGER" ||
    currentUser?.user?.role?.name === "EVENT MANAGER";
  const isSuperAdmin =
    currentUser?.role?.name === "SUPER ADMIN" ||
    currentUser?.user?.role?.name === "SUPER ADMIN";
  const isAdminOrEventManager = isSuperAdmin || isEventManager;

  // For non-admin roles, show enhanced dashboard with filters
  if (!isAdminOrEventManager && !userLoading) {
    return <DashboardWithFilters fullName={fullName} />;
  }

  // For admin/event manager, show original EventTabs
  return (
    <div className="space-y-6 pb-6">
      {/* Mobile Header */}
      <h1 className="block sm:hidden text-xl sm:text-2xl font-semibold mt-4">
        Welcome, {fullName}
        <br />
        {currentUser?.user?.role?.name && (
          <span className="inline-block bg-gradient-orange lg:px-3 py-1 rounded-full mt-2 text-sm">
            Role - {currentUser.user.role.name}
          </span>
        )}
      </h1>

      {/* Desktop Header */}
      <h1 className="hidden sm:block text-xl sm:text-2xl font-semibold">
        Dashboard / Events
      </h1>

      <EventTabs />
    </div>
  );
};

// Enhanced Dashboard for non-admin roles (DAO, Media, etc.)
const DashboardWithFilters = ({ fullName }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [viewType, setViewType] = useState("card"); // 'card' or 'list'
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc"); // newest first

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    try {
      const response = await attendEventList();

      const normalizedEvents = Array.isArray(response)
        ? response
        : Array.isArray(response?.events)
          ? response.events
          : Array.isArray(response?.data)
            ? response.data
            : [];

      setEvents(normalizedEvents || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= FETCH EVENTS ================= */
  useEffect(() => {
    if (userLoading) return;

    fetchEvents();
  }, [userLoading, fetchEvents]);

  const getEventEndDateTime = useCallback((e) => {
    if (!e?.end_date) return null;

    const date = e.end_date.split("T")[0];
    const time = e.end_time || "23:59";

    return new Date(`${date}T${time}:00`);
  }, []);

  const eventCounts = useMemo(() => {
    const now = new Date();

    const upcoming = events.filter((e) => {
      const end = getEventEndDateTime(e);
      return end && end >= now;
    }).length;

    const past = events.filter((e) => {
      const end = getEventEndDateTime(e);
      return end && end < now;
    }).length;

    return {
      upcoming,
      past,
    };
  }, [events, getEventEndDateTime]);

  const processedEvents = useMemo(() => {
    const now = new Date();

    return (
      events
        // 🔍 Search
        .filter((e) => e.name?.toLowerCase().includes(searchTerm.toLowerCase()))

        // 📅 Tabs logic
        .filter((e) => {
          const end = getEventEndDateTime(e);
          if (!end) return false;

          if (activeTab === "upcoming") return end >= now;
          if (activeTab === "past") return end < now;

          return true;
        })

        // 🔃 Sort
        .sort((a, b) => {
          const d1 = new Date(a.start_date);
          const d2 = new Date(b.start_date);
          return sortOrder === "asc" ? d1 - d2 : d2 - d1;
        })
    );
  }, [events, searchTerm, sortOrder, activeTab, getEventEndDateTime]);

  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
      </div>
    );
  }

  return (
    <>
      <div className="lg:px-6 pt-6 pb-10">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#0F172A]">
              My Events
            </h1>
            <p className="text-[13px] text-[#64748B] mt-1">
              View and manage all your events
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex overflow-x-auto lg:overflow-x-visible gap-6 border-b border-[#E2E8F0] mb-6 scrollbar-hide">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap ${
              activeTab === "upcoming"
                ? "text-[#2563EB] border-b-2 border-[#2563EB]"
                : "text-[#64748B]"
            }`}
          >
            Upcoming Events ({eventCounts.upcoming})
          </button>

          <button
            onClick={() => setActiveTab("past")}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap ${
              activeTab === "past"
                ? "text-[#2563EB] border-b-2 border-[#2563EB]"
                : "text-[#64748B]"
            }`}
          >
            Past Events ({eventCounts.past})
          </button>
        </div>

        {/* CONTROLS */}
        <div className="rounded-[12px]">
          {/* TOP BAR */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 py-3">
            {/* SEARCH */}
            <div className="relative w-full lg:max-w-lg">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-[32px] w-full pl-9 pr-3 rounded-md text-sm p-4"
              />
            </div>

            {/* SORT & VIEW */}
            <div className="flex gap-2 relative w-full lg:w-auto">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="h-[32px] px-3 rounded-md bg-white text-[12px] flex items-center gap-1"
              >
                Sort <ChevronDown size={12} />
              </button>

              {sortOpen && (
                <div className="absolute right-[90px] lg:right-[90px] top-9 bg-white rounded-md shadow-md text-[12px] w-[140px] z-10 p-1">
                  <button
                    onClick={() => {
                      setSortOrder("desc");
                      setSortOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    Newest First
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder("asc");
                      setSortOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    Oldest First
                  </button>
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => setViewMenuOpen((v) => !v)}
                  className="h-[32px] px-3 rounded-md bg-white text-[12px] flex items-center gap-1"
                >
                  {viewType === "card" ? "Card View" : "List View"}{" "}
                  <ChevronDown size={16} />
                </button>

                {viewMenuOpen && (
                  <div className="absolute right-0 top-9 bg-white rounded-md shadow-md text-[12px] w-[120px] z-10 p-1">
                    <button
                      onClick={() => {
                        setViewType("card");
                        setViewMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg"
                    >
                      Card View
                    </button>
                    <button
                      onClick={() => {
                        setViewType("list");
                        setViewMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg"
                    >
                      List View
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* EVENT DISPLAY */}
          {!loading &&
            processedEvents.length > 0 &&
            (viewType === "card" ? (
              <div className="flex flex-wrap gap-8 mt-6">
                {processedEvents.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onCardClick={() =>
                      navigate(`/events/${event._id || event.event_id}`)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-6">
                {processedEvents.map((event) => (
                  <EventListCard
                    key={event._id}
                    event={event}
                    onCardClick={() =>
                      navigate(`/events/${event._id || event.event_id}`)
                    }
                  />
                ))}
              </div>
            ))}

          {/* EMPTY STATE */}
          {!loading && processedEvents.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              No {activeTab} events found.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
