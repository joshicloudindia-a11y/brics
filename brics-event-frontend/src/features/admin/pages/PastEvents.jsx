import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";
import SortableHeader from "../../../components/common/SortableHeader";
import useSorting from "../../../hooks/useSorting";
import AddDaoDrawer from "../components/AddDaoDrawer";
import { getEvents, getManagerEvents } from "../../../services/events";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

const PastEvents = () => {
  const [addDaoOpen, setAddDaoOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc"); // newest first

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const normalizeEvents = useCallback((payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.events)) return payload.events;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }, []);

  const isEventManager =
    (currentUser?.role?.name || "").toUpperCase().trim() === "EVENT MANAGER";

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    try {
      const response = isEventManager
        ? await getManagerEvents()
        : await getEvents();
      const normalized = normalizeEvents(response);
      setEvents(normalized || []);
    } catch (error) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [isEventManager, normalizeEvents]);

  /* ================= FETCH EVENTS ================= */
  useEffect(() => {
    if (userLoading) return;

    fetchEvents();
  }, [userLoading, fetchEvents]);

  const openAddDao = (eventId) => {
    setSelectedEventId(eventId);
    setAddDaoOpen(true);
  };

  /* ================= past FILTER + SEARCH + SORT ================= */
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const q = (searchTerm || "").toLowerCase().trim();

    // keep only past events first
    const past = events.filter((e) => {
      const end = new Date(e.end_date || e.endDate || 0);
      return end < now;
    });

    if (!q) return past;

    return past.filter((e) => {
      const name = (e.name || "").toLowerCase();
      const venue = (e.venue || "").toLowerCase();
      const location = (e.location || "").toLowerCase();
      const type = (e.event_type || e.type || "").toLowerCase();
      const combinedLocation = `${location}${venue ? ` ${venue}` : ""}`.trim();

      return (
        name.includes(q) ||
        venue.includes(q) ||
        location.includes(q) ||
        combinedLocation.includes(q) ||
        type.includes(q)
      );
    });
  }, [events, searchTerm]);

  const sortConfig = {
    name: (e) => (e.name || "").toLowerCase(),
    start_date: (e) => new Date(e.start_date || e.startDate).getTime() || 0,
    end_date: (e) => new Date(e.end_date || e.endDate).getTime() || 0,
    venue: (e) => ((e.venue || e.location) || "").toLowerCase(),
    event_type: (e) => (e.event_type || e.type || "").toLowerCase(),
    delegates: (e) => Number(e.delegate_count ?? e.delegateCount ?? 0),
  };

  const {
    sortedData: sortedEvents,
    handleSort,
    getColumnSortInfo,
    sortColumn,
    sortOrder: currentSortOrder,
  } = useSorting(filteredEvents, sortConfig, { column: "start_date", order: "desc" });

  const setSort = (col, order) => {
    if (sortColumn !== col) {
      handleSort(col);
      if (order === "desc") handleSort(col);
    } else {
      if (currentSortOrder !== order) handleSort(col);
    }
    setSortOpen(false);
  };

  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16" />
      </div>
    );
  }

  return (
    <>
      <div className="sm:px-6 pt-4 sm:pt-6 pb-10">
        {/* HEADER */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-[20px] font-semibold text-[#0F172A]">
            Past Events
          </h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1">
            {sortedEvents.length} past BRICS events
          </p>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* TOP BAR */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 py-3 border-b gap-3 sm:gap-0">
            {/* SEARCH */}
            <div className="relative w-full sm:w-[320px] md:w-[360px] lg:w-[400px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                placeholder="Search event, venue, type"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[42px] pl-11 pr-4 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
              />
            </div>

            {/* SORT */}
            <div className="flex gap-2 relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="h-[32px] px-3 rounded-md bg-gray-100 text-[12px] flex items-center gap-1"
              >
                Sort <ChevronDown size={12} />
              </button>

              {sortOpen && (
                <div className="absolute right-0 sm:right-[90px] top-9 bg-white border rounded-md shadow-md text-[12px] w-[140px] z-10">
                  <button
                    onClick={() => setSort("start_date", "desc")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                  >
                    Newest First
                  </button>
                  <button
                    onClick={() => setSort("start_date", "asc")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                  >
                    Oldest First
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <SortableHeader
                      column="name"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("name")}
                      className="px-4 py-3 text-left text-sm text-[#0F172A] font-semibold"
                    >
                      Event Name
                    </SortableHeader>

                    <SortableHeader
                      column="start_date"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("start_date")}
                      className="px-4 py-3 text-left text-sm text-[#0F172A] font-semibold"
                    >
                      Start Date
                    </SortableHeader>

                    <SortableHeader
                      column="end_date"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("end_date")}
                      className="px-4 py-3 text-left text-sm text-[#0F172A] font-semibold"
                    >
                      End Date
                    </SortableHeader>

                    <SortableHeader
                      column="venue"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("venue")}
                      className="px-4 py-3 text-left text-sm text-[#0F172A] font-semibold"
                    >
                      Venue
                    </SortableHeader>

                    <SortableHeader
                      column="event_type"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("event_type")}
                      className="px-4 py-3 text-left text-sm text-[#0F172A] font-semibold"
                    >
                      Event Type
                    </SortableHeader>

                    <SortableHeader
                      column="delegates"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("delegates")}
                      className="px-4 py-3 text-left text-sm text-[#0F172A] font-semibold"
                    >
                      Delegates
                    </SortableHeader>

                    <th className="pr-4 py-3 text-right text-sm text-[#0F172A] font-semibold">Action</th>
                  </tr>
              </thead>

              <tbody>
                {sortedEvents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-6 text-sm">
                      No past events found
                    </td>
                  </tr>
                )}

                {sortedEvents.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--color-primary-blue)] capitalize truncate max-w-[320px]" title={e.name || ""}>
                            {e.name}
                          </p>
                          <p className="text-sm text-[var(--color-primary-blue)] truncate max-w-[320px]" title={`${e.location || ""}${e?.venue ? `, ${e.venue}` : ""}`}>
                            {(() => {
                              const combinedLocation = `${e.location || ""}${e?.venue ? `, ${e.venue}` : ""}`;
                              return combinedLocation || "-";
                            })()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-[var(--color-primary-blue)] text-base" title={new Date(e.start_date || e.startDate).toLocaleString()}>
                      {new Date(e.start_date || e.startDate).toLocaleString()}
                    </td>

                    <td className="px-4 py-4 text-[var(--color-primary-blue)] text-base" title={new Date(e.end_date || e.endDate).toLocaleString()}>
                      {new Date(e.end_date || e.endDate).toLocaleString()}
                    </td>

                    <td className="px-4 py-4">
                      <span className="block truncate max-w-[220px] text-[var(--color-primary-blue)]" title={`${e.location || ""}${e?.venue ? `, ${e.venue}` : ""}`}>
                        {(() => {
                          const combinedLocation = `${e.location || ""}${e?.venue ? `, ${e.venue}` : ""}`;
                          return combinedLocation || "-";
                        })()}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2 py-[2px] rounded-full text-[11px] bg-blue-100 text-[var(--color-primary-blue)]">
                        {e.event_type || e.type || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-4">{e.delegate_count ?? e.delegateCount ?? 0}</td>

                    <td className="pr-4 text-right">
                      <button
                        onClick={() => openAddDao(e._id)}
                        className="py-1 px-3 rounded-md border border-[#1E40AF] text-[#1E40AF] text-[12px]"
                      >
                        Add DAO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="md:hidden">
            {sortedEvents.length === 0 && (
              <div className="text-center py-6 text-sm">
                No past events found
              </div>
            )}

            {sortedEvents.map((e) => (
              <div key={e.id} className="border-b p-4 space-y-3">
                <h3 className="font-medium text-[#1E40AF] capitalize text-base">
                  {e.name}
                </h3>

                  <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <span className="text-[var(--color-primary-blue)] text-base text-right">
                      {new Date(e.start_date || e.startDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">End Date:</span>
                    <span className="text-[var(--color-primary-blue)] text-base text-right">
                      {new Date(e.end_date || e.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Venue:</span>
                    <span className="text-[var(--color-primary-blue)] text-base text-right truncate ml-2 max-w-[60%]">
                      {(() => {
                        const combinedLocation = `${e.location || ""}${e?.venue ? `, ${e.venue}` : ""}`;
                        return combinedLocation || "-";
                      })()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Event Type:</span>
                    <span className="px-2 py-[2px] rounded-full text-[11px] bg-blue-100 text-[#1E40AF]">
                      {e.event_type || e.type || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Delegates:</span>
                    <span className="text-gray-700">
                      {e.delegate_count ?? e.delegateCount ?? 0}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openAddDao(e._id)}
                  className="w-full py-2 px-3 rounded-md border border-[#1E40AF] text-[#1E40AF] text-sm font-medium"
                >
                  Add DAO
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADD DAO DRAWER */}
      <AddDaoDrawer
        open={addDaoOpen}
        eventId={selectedEventId}
        onClose={() => setAddDaoOpen(false)}
      />
    </>
  );
};

export default PastEvents;

