import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";
import AddDaoDrawer from "../components/AddDaoDrawer";
import AddManagers from "../components/AddManagers";
import CreateEventDrawer from "../components/CreateEventDrawer";
import { getEvents, getManagerEvents } from "../../../services/events";
import EventCardView from "../components/EventCardView";
import EventListView from "../components/EventListView";
import InviteDelegatesDrawer from "../../delegates/InviteDelegatesDrawer";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { Plus } from "lucide-react";

const AllEvents = () => {
  const [addDaoOpen, setAddDaoOpen] = useState(false);
  const [addManagerOpen, setAddManagerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [open, setOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewType, setViewType] = useState("card"); // 'card' or 'list'
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const [delegateDrawerOpen, setDelegateDrawerOpen] = useState(false);
  const [delegates, setDelegates] = useState([]);
  const [delegateEventInfo, setDelegateEventInfo] = useState({
    eventId: null,
    maxDelegates: 0,
  });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc"); // newest first

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const normalizedRole =
    typeof currentUser?.role?.name === "string"
      ? currentUser.role.name.trim().toUpperCase()
      : "";

  const isEventManager = normalizedRole === "EVENT MANAGER";

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    try {
      const response = isEventManager
        ? await getManagerEvents()
        : await getEvents();

      const normalizedEvents = Array.isArray(response)
        ? response
        : Array.isArray(response?.events)
          ? response.events
          : Array.isArray(response?.data)
            ? response.data
            : [];

      console.log("Fetched events:", normalizedEvents);
      console.log("Events with status:", normalizedEvents.map(e => ({ name: e.name, status: e.status })));

      setEvents(normalizedEvents || []);
    } catch (error) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [isEventManager]);

  // /* ================= FETCH EVENTS ================= */
  useEffect(() => {
    if (userLoading) return;

    fetchEvents();
  }, [userLoading, fetchEvents]);

  const openAddDao = (eventId) => {
    setSelectedEventId(eventId);
    setAddDaoOpen(true);
  };

  const openAddManager = (eventId) => {
    setSelectedEventId(eventId);
    setAddManagerOpen(true);
  };

  const openAddDelegate = (event) => {
    const eventId = event?._id || event?.event_id || null;
    const maxDelegates = event?.delegate_count || 0;

    if (!eventId) return;

    setDelegates([]);
    setDelegateEventInfo({
      eventId,
      maxDelegates,
    });
    setDelegateDrawerOpen(true);
  };

  const openEditDrawer = (event) => {
    setEventToEdit(event);
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
    setEventToEdit(null);
  };

  const getEventEndDateTime = (e) => {
    if (!e?.end_date) return null;

    const date = e.end_date.split("T")[0];
    const time = e.end_time || "23:59";

    return new Date(`${date}T${time}:00`);
  };

  const eventCounts = useMemo(() => {
    const now = new Date();

    console.log("All events:", events);
    console.log("Events with status field:", events.map(e => ({ 
      name: e.name, 
      status: e.status,
      hasStatus: 'status' in e,
      allKeys: Object.keys(e)
    })));

    // Check for drafts with case-insensitive status check
    const drafts = events.filter((e) => {
      const status = e.status?.toString().toLowerCase();
      const isDraft = status === "draft";
      if (isDraft) {
        console.log("Found draft event:", e.name, "with status:", e.status);
      }
      return isDraft;
    }).length;

    console.log("Total draft count:", drafts);

    // Filter published events (exclude drafts)
    const publishedEvents = events.filter((e) => {
      const status = e.status?.toString().toLowerCase();
      return status !== "draft";
    });

    const upcoming = publishedEvents.filter((e) => {
      const end = getEventEndDateTime(e);
      return end && end >= now;
    }).length;

    const past = publishedEvents.filter((e) => {
      const end = getEventEndDateTime(e);
      return end && end < now;
    }).length;

    return {
      all: publishedEvents.length,
      upcoming,
      past,
      drafts,
    };
  }, [events]);

  const processedEvents = useMemo(() => {
    const now = new Date();

    return (
      events
        // 🔍 Search
        .filter((e) => e.name?.toLowerCase().includes(searchTerm.toLowerCase()))

        // 📅 Tabs logic
        .filter((e) => {
          const status = e.status?.toString().toLowerCase();
          
          // Drafts tab - show only draft events
          if (activeTab === "drafts") {
            const isDraft = status === "draft";
            if (isDraft) {
              console.log("Showing draft in drafts tab:", e.name);
            }
            return isDraft;
          }

          // For other tabs, exclude drafts
          if (status === "draft") {
            console.log("Excluding draft from tab:", activeTab, e.name);
            return false;
          }

          const end = getEventEndDateTime(e);
          if (!end) return false;

          if (activeTab === "upcoming") return end >= now;
          if (activeTab === "past") return end < now;

          return true; // all (published only)
        })

        // 🔃 Sort
        .sort((a, b) => {
          const d1 = new Date(a.start_date);
          const d2 = new Date(b.start_date);
          return sortOrder === "asc" ? d1 - d2 : d2 - d1;
        })
    );
  }, [events, searchTerm, sortOrder, activeTab]);

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
              All Events
            </h1>
            <p className="text-[13px] text-[#64748B] mt-1">
              Create and manage all BRICS 2026 events
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="bg-[#1e4788] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#163761] transition-colors hidden lg:flex lg:items-center lg:gap-2"
          >
            <Plus size={16} />
            Create Event
          </button>

          <CreateEventDrawer 
            open={open} 
            onClose={closeDrawer} 
            eventData={eventToEdit}
            onSuccess={fetchEvents}
          />
        </div>

        {/* CREATE EVENT BUTTON - MOBILE ONLY */}
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden w-full mb-6 bg-[#1e4788] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#163761] transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          <span>Create Event</span>
        </button>

        <div className="flex overflow-x-auto lg:overflow-x-visible gap-6 border-b border-[#E2E8F0] mb-6 scrollbar-hide">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap ${
              activeTab === "all"
                ? "text-[#2563EB] border-b-2 border-[#2563EB]"
                : "text-[#64748B]"
            }`}
          >
            All Events ({eventCounts.all})
          </button>

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
            onClick={() => setActiveTab("drafts")}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap ${
              activeTab === "drafts"
                ? "text-[#2563EB] border-b-2 border-[#2563EB]"
                : "text-[#64748B]"
            }`}
          >
            Drafts ({eventCounts.drafts})
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

        {/* TABLE CARD */}
        <div className=" rounded-[12px] ">
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
                className="h-[32px] w-full pl-9  pr-3 rounded-md  text-sm p-4"
              />
            </div>

            {/* SORT */}
            <div className="flex gap-2 relative w-full lg:w-auto">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="h-[32px] px-3 rounded-md bg-white text-[12px] flex items-center gap-1"
              >
                Sort <ChevronDown size={12} />
              </button>

              {sortOpen && (
                <div className="absolute right-[90px] lg:right-[90px] top-9 bg-white  rounded-md shadow-md text-[12px] w-[140px] z-10 p-1">
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

              {/* <button className="h-[32px] px-3 rounded-md bg-white text-[12px] flex items-center gap-1">
                Filter: All <ChevronDown size={12} />
              </button>
               */}
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

          {/* TABLE */}

        {!loading && processedEvents.length > 0 && (
          viewType === "card" ? (
            <div className="flex flex-wrap gap-8 mt-6">
              {processedEvents.map((event, index) => (
                <EventCardView
                  key={event._id}
                  event={event}
                  index={index}
                  openAddDao={openAddDao}
                  openAddManager={openAddManager}
                  openEditDrawer={openEditDrawer}
                  getEventEndDateTime={getEventEndDateTime}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-6">
              {processedEvents.map((event, index) => (
                <EventListView
                  key={event._id}
                  event={event}
                  index={index}
                  openAddDao={openAddDao}
                  openAddManager={openAddManager}
                  openEditDrawer={openEditDrawer}
                  getEventEndDateTime={getEventEndDateTime}
                />
              ))}
            </div>
          )
        )}
        </div>
      </div>

      {/* ADD DAO DRAWER */}
      <AddDaoDrawer
        open={addDaoOpen}
        eventId={selectedEventId}
        onClose={() => setAddDaoOpen(false)}
      />

      {/* ADD MANAGER DRAWER */}
      <AddManagers
        open={addManagerOpen}
        eventId={selectedEventId}
        onClose={() => setAddManagerOpen(false)}
      />

      <InviteDelegatesDrawer
        open={delegateDrawerOpen}
        onClose={() => {
          setDelegateDrawerOpen(false);
          setDelegates([]);
          setDelegateEventInfo({ eventId: null, maxDelegates: 0 });
        }}
        delegates={delegates}
        setDelegates={setDelegates}
        eventId={delegateEventInfo.eventId}
        delegateCount={delegates.length}
        maxDelegates={delegateEventInfo.maxDelegates}
      />
    </>
  );
};

export default AllEvents;

