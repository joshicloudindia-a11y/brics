import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MoreVertical, Plus, X } from "lucide-react";
import { toast } from "react-toastify";
import PageLoader from "../../../components/common/PageLoader";
import SearchableSelect from "../../../components/common/SearchableSelect";
import SortableHeader from "../../../components/common/SortableHeader";
import useSorting from "../../../hooks/useSorting";
import { getEvents } from "../../../services/events";
import { getAllSpeakers } from "../../../services/speakers";
import AddSpeakerDrawer from "../../events/AddSpeakerDrawer";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

const SpeakersManagement = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  /* ================= STATES ================= */
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenuSpeakerId, setOpenMenuSpeakerId] = useState(null);
  const menuRef = useRef(null);
  const [addSpeakerDrawerOpen, setAddSpeakerDrawerOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filterEventId, setFilterEventId] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  /* ================= QUERIES ================= */
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events-list"],
    queryFn: () => getEvents(),
  });

  const { data: allSpeakers = [], isLoading: speakersLoading } = useQuery({
    queryKey: ["all-speakers"],
    queryFn: () => getAllSpeakers({ limit: 1000 }), // Get more speakers for admin view
  });

  const speakers = allSpeakers?.speakers || [];

  /* ================= FILTER & SEARCH ================= */
  const filteredSpeakers = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return speakers
      .filter((speaker) => {
        const name = (speaker?.name || "").toLowerCase();
        const role = (speaker?.role || "").toLowerCase();
        const company = (speaker?.organisation || speaker?.company || "").toLowerCase();
        const eventName = (speaker?.eventName || speaker?.event_name || "").toLowerCase();
        const sessionName = (speaker?.sessions && speaker.sessions[0] && (speaker.sessions[0].session_name || speaker.sessions[0].name)) ? (speaker.sessions[0].session_name || speaker.sessions[0].name).toLowerCase() : "";
        const professionalTitle = (speaker?.professional_title || "").toLowerCase();
        const combinedTitleName = (((speaker?.professional_title ? speaker.professional_title + " " : "") + (speaker?.name || "")).toLowerCase());
        const country = (speaker?.country || "").toLowerCase();

        const searchMatch =
          name.includes(q) ||
          professionalTitle.includes(q) ||
          combinedTitleName.includes(q) ||
          role.includes(q) ||
          company.includes(q) ||
          eventName.includes(q) ||
          sessionName.includes(q) ||
          country.includes(q);
        if (!searchMatch) return false;

        if (filterEventId && String(speaker?.eventId || speaker?.event_id || "") !== String(filterEventId)) return false;

        if (filterCountry) {
          const speakerCountry = speaker?.country ? speaker.country.charAt(0).toUpperCase() + speaker.country.slice(1) : "";
          if (speakerCountry !== filterCountry) return false;
        }

        return true;
      });
  }, [speakers, searchTerm, filterEventId, filterCountry]);

  // Custom sort configuration for speaker fields
  const sortConfig = {
    name: (speaker) => {
      const title = speaker?.professional_title || "";
      const name = speaker?.name || "";
      return `${title} ${name}`.toLowerCase().trim();
    },
    organisation: (speaker) => (speaker?.organisation || speaker?.company || "").toLowerCase(),
    session_name: (speaker) => (speaker?.sessions?.[0]?.session_name || "not assigned").toLowerCase(),
    country: (speaker) => {
      const country = speaker?.country || "";
      return country ? country.charAt(0).toUpperCase() + country.slice(1) : "zzz"; // Put empty countries at the end
    }
  };

  // Use the sorting hook with default sort by speaker name in ascending order
  const {
    sortedData: sortedSpeakers,
    handleSort,
    getColumnSortInfo,
  } = useSorting(filteredSpeakers, sortConfig, { column: "name", order: "asc" });

  const totalSpeakers = sortedSpeakers.length;
  const totalPages = Math.max(1, Math.ceil(totalSpeakers / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (menuRef.current && !menuRef.current.contains(event.target)) {
  //       setOpenMenuSpeakerId(null);
  //     }
  //   };
  //   document.addEventListener("mousedown", handleClickOutside);
  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //   };
  // }, []);

  const paginatedSpeakers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedSpeakers.slice(startIndex, startIndex + pageSize);
  }, [sortedSpeakers, currentPage, pageSize]);

  const pageSizeOptions = [
    { value: 5, label: "5 / page" },
    { value: 10, label: "10 / page" },
    { value: 20, label: "20 / page" },
    { value: 50, label: "50 / page" },
  ];

  const eventOptions = useMemo(() => {
    const base = [{ value: "", label: "All events" }];
    const opts = (events || []).map((ev) => ({ value: ev._id || ev.id || "", label: ev.name || ev.title || ev.event_name || "Untitled" }));
    return base.concat(opts);
  }, [events]);

  const countryOptions = useMemo(() => {
    const set = new Set();
    (speakers || []).forEach((s) => {
      if (s?.country) set.add(s.country.charAt(0).toUpperCase() + s.country.slice(1));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c }));
  }, [speakers]);

  /* ================= HANDLERS ================= */
  const handleEditSpeaker = (speaker, e) => {
    if (e) {
      e.stopPropagation();
    }
    setOpenMenuSpeakerId(null);
    setEditingSpeaker(speaker);
    setSelectedEventId(speaker.eventId || null);
    setAddSpeakerDrawerOpen(true);
  };

  const handleAddSpeaker = () => {
    setEditingSpeaker(null);
    setSelectedEventId(null);
    setAddSpeakerDrawerOpen(true);
  };

  const handleSpeakerAdded = (newSpeaker, isEdit = false) => {
    // console.log("🔄 ADMIN SPEAKER LIST UPDATE - Received:", { newSpeaker, isEdit });

    if (isEdit) {
      // For edits, invalidate the query to refetch fresh data
      // console.log("🔄 ADMIN SPEAKER LIST UPDATE - Invalidating all-speakers query for edit");
      queryClient.invalidateQueries({ queryKey: ["all-speakers"] });
      toast.success("Speaker updated successfully");
    } else {
      // Add new speaker - invalidate query to refetch from server
      // console.log("🔄 ADMIN SPEAKER LIST UPDATE - Invalidating all-speakers query for new speaker");
      queryClient.invalidateQueries({ queryKey: ["all-speakers"] });
      toast.success("Speaker added successfully");
    }
  };

  /* ================= LOADING STATE ================= */
  // Loading state managed inline for table skeleton

  /* ================= JSX ================= */
  return (
    <div className="sm:px-6 pt-4 sm:pt-6 pb-10">
      {/* HEADER */}
      <div className="mb-4 sm:mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-[20px] font-semibold text-[#0F172A]">Speaker List</h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1">
            Manage speaker list for events
          </p>
        </div>
        <button
          className="text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium"
          style={{ background: "var(--color-primary-blue)" }}
          onClick={handleAddSpeaker}
        >
          <Plus size={16} /> Add Speaker
        </button>
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
              placeholder="Search speaker, session name, country"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[42px] pl-11 pr-4 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <div className="w-[220px]">
              <SearchableSelect
                options={eventOptions}
                value={filterEventId}
                onChange={(v) => setFilterEventId(v)}
                placeholder="Filter by event"
                searchable={true}
                id="speakers-filter-event"
              />
            </div>
            <div className="w-[160px]">
              <SearchableSelect
                options={[{ value: "", label: "All Countries" }].concat(countryOptions)}
                value={filterCountry}
                onChange={(v) => setFilterCountry(v)}
                placeholder="Country"
                searchable={true}
                id="speakers-filter-country"
              />
            </div>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          {eventsLoading || speakersLoading ? (
            <div className="text-center py-6 text-sm">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left border-b bg-gray-50">
                  <th className="px-4 py-3 text-base text-[#0F172A] font-semibold">S. No.</th>
                  <SortableHeader
                    column="name"
                    onSort={handleSort}
                    sortInfo={getColumnSortInfo("name")}
                    className="px-4 py-3  text-base text-[#0F172A] font-semibold"
                  >
                    Speaker
                  </SortableHeader>
                  <SortableHeader
                    column="session_name"
                    onSort={handleSort}
                    sortInfo={getColumnSortInfo("session_name")}
                    className=" py-3  text-base text-[#0F172A] font-semibold"
                  >
                    Session Name
                  </SortableHeader>
                  <SortableHeader
                    column="country"
                    onSort={handleSort}
                    sortInfo={getColumnSortInfo("country")}
                    className=" py-3 text-left text-base text-[#0F172A] font-semibold"
                  >
                    Country
                  </SortableHeader>
                  <th className="pr-4 py-3 text-right text-base text-[#0F172A] font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSpeakers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-sm">
                      {speakers.length === 0 ? "No speakers added yet" : "No speakers match your search"}
                    </td>
                  </tr>
                ) : (
                  paginatedSpeakers.map((speaker, idx) => (
                    <tr key={speaker._id} className="border-b ">
                      <td className="px-4 py-4 text-gray-700 font-base font-semibold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[var(--color-primary-blue)] flex items-center justify-center text-white font-bold text-xl overflow-hidden capitalize">
                            {speaker?.photo_signed_url || speaker?.documents?.photo_signed_url ? (
                              <img
                                src={speaker?.photo_signed_url || speaker?.documents?.photo_signed_url}
                                alt={speaker?.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              speaker?.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-base capitalize text-[var(--color-primary-blue)] font-semibold">
                              {speaker?.professional_title && `${speaker.professional_title} `}
                              {speaker?.name}
                            </p>
                            <p className="text-sm  capitalize text-[var(--color-primary-blue)]">
                              {speaker?.organisation || speaker?.company}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="">
                        <span className="text-[var(--color-primary-blue)] text-base ">
                          {speaker?.sessions?.[0]?.session_name || "Not Assigned"}
                        </span>
                      </td>
                      <td className="">
                        <span className="text-[var(--color-primary-blue)] text-base ">
                          {speaker?.country
                            ? speaker.country.charAt(0).toUpperCase() + speaker.country.slice(1)
                            : "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-4 relative">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openMenuSpeakerId === speaker._id) {
                                setOpenMenuSpeakerId(null);
                              } else {
                                setOpenMenuSpeakerId(speaker._id);
                              }
                            }}
                            className="p-2 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        {openMenuSpeakerId === speaker._id && (
                          <div
                            ref={menuRef}
                            className="absolute right-4 top-10 w-32 bg-white border rounded shadow-md z-50"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleEditSpeaker(speaker, e)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden">
          {eventsLoading || speakersLoading ? (
            <div className="text-center py-6 text-sm">Loading...</div>
          ) : paginatedSpeakers.length === 0 ? (
            <div className="text-center py-6 text-sm">
              {speakers.length === 0 ? "No speakers added yet" : "No speakers match your search"}
            </div>
          ) : (
            paginatedSpeakers.map((speaker, idx) => (
              <div key={speaker._id} className="border-b p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Speaker #{(currentPage - 1) * pageSize + idx + 1}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                        {speaker?.photo_signed_url || speaker?.documents?.photo_signed_url ? (
                          <img
                            src={speaker?.photo_signed_url || speaker?.documents?.photo_signed_url}
                            alt={speaker?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          speaker?.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-base" style={{ color: "var(--color-primary-blue)" }}>
                          {speaker?.professional_title && `${speaker.professional_title} `}
                          {speaker?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {speaker?.organisation || speaker?.company}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Session Name:</span>
                    <span className="text-gray-700 text-right ml-2">{speaker?.sessions?.[0]?.session_name || "Not Assigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Country:</span>
                    <span className="text-gray-700">
                      {speaker?.country ? speaker.country.charAt(0).toUpperCase() + speaker.country.slice(1) : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-2 text-right relative flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (openMenuSpeakerId === speaker._id) {
                        setOpenMenuSpeakerId(null);
                      } else {
                        setOpenMenuSpeakerId(speaker._id);
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuSpeakerId === speaker._id && (
                    <div
                      ref={menuRef}
                      className="absolute right-4 bottom-10 w-32 bg-white border rounded shadow-md z-50"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleEditSpeaker(speaker, e)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}
        <div className="px-4 py-3 flex items-center justify-between border-t bg-white">
          <div className="text-sm text-gray-600">
            Showing {paginatedSpeakers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            {" - "}
            {paginatedSpeakers.length === 0 ? 0 : (currentPage - 1) * pageSize + paginatedSpeakers.length}
            {" "}of {totalSpeakers}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[110px]">
              <SearchableSelect
                options={pageSizeOptions}
                value={pageSize}
                onChange={(val) => setPageSize(Number(val))}
                placeholder="Page size"
                searchable={false}
                id="speakers-page-size"
                maxVisible={4}
              />
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border ${currentPage === 1 ? "text-gray-400" : ""}`}
            >
              Prev
            </button>
            <div className="text-sm">{currentPage} / {totalPages}</div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border ${currentPage === totalPages ? "text-gray-400" : ""}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Speaker Drawer */}
      <AddSpeakerDrawer
        isOpen={addSpeakerDrawerOpen}
        onClose={() => {
          setAddSpeakerDrawerOpen(false);
          setEditingSpeaker(null);
          setSelectedEventId(null);
        }}
        eventId={selectedEventId}
        events={events}
        editingSpeaker={editingSpeaker}
        onSpeakerAdded={handleSpeakerAdded}
      />
    </div>
  );
};

export default SpeakersManagement;
