import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronDown,
  MoreVertical,
  Plus,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import { DateRange } from "react-date-range";
import { format } from "date-fns";

import AddConferenceHallDrawer from "../components/AddConferenceHallDrawer";
import AssignHallDrawer from "../components/AssignHallDrawer";
import DeleteConfirmModal from "../../../components/common/DeleteConfirmModal";
import SortableHeader from "../../../components/common/SortableHeader";
import useSorting from "../../../hooks/useSorting";
import {
  getAllConferenceHalls,
  deleteConferenceHall,
  getEventHalls,
} from "../../../services/conferenceHall";
import { attendEventList } from "../../../services/events";

const ConferenceHall = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get("eventId");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    status: "All",
    videoEnabled: "All",
    event: eventIdFromUrl || "All",
    dateRangeFilter: false,
  });

  // Update filter when URL changes
  useEffect(() => {
    if (eventIdFromUrl) {
      setFilterOptions((prev) => ({ ...prev, event: eventIdFromUrl }));
    }
  }, [eventIdFromUrl]);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [selectedHallForAssign, setSelectedHallForAssign] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedHallForEdit, setSelectedHallForEdit] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hallToDelete, setHallToDelete] = useState(null);

  const menuRef = useRef(null);

  /* ✅ React DateRange Picker State */
  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      key: "selection",
    },
  ]);

  const [dateRange, setDateRange] = useState({
    startDate: "Feb 1, 2025",
    endDate: "Feb 7, 2025",
  });

  const [conferenceHalls, setConferenceHalls] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ✅ Fetch all conference halls with optional event filter
   * OPTION 1 (Current): GET /api/conference/halls?event_id=<eventId>
   * OPTION 2 (Alternative): Use getEventHalls(eventId) for dedicated endpoint
   */
  const {
    data: hallsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["all-halls", filterOptions.event],
    queryFn: () => {
      // If specific event is selected, filter by event_id
      const params = {};
      if (filterOptions.event !== "All") {
        params.event_id = filterOptions.event;
      }
      return getAllConferenceHalls(params);

      /* Alternative approach using dedicated endpoint:
      if (filterOptions.event !== "All") {
        return getEventHalls(filterOptions.event);
      }
      return getAllConferenceHalls();
      */
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Update state when data changes
  React.useEffect(() => {
    if (hallsData?.halls) {
      setConferenceHalls(hallsData.halls);
    }
  }, [hallsData]);

  /* ✅ Fetch all events */
  const { data: eventsData } = useQuery({
    queryKey: ["attend-event-list"],
    queryFn: () => attendEventList(),
    staleTime: 2 * 60 * 1000,
  });

  const eventsList = Array.isArray(eventsData?.events)
    ? eventsData.events
    : Array.isArray(eventsData?.data)
      ? eventsData.data
      : Array.isArray(eventsData)
        ? eventsData
        : [];

  /* ✅ Get unique events from halls */
  const uniqueEvents = React.useMemo(() => {
    const eventsMap = new Map();
    conferenceHalls.forEach((hall) => {
      if (hall.event_id) {
        const eventName =
          hall.event?.event_name || hall.event?.name || hall.event_name;
        if (eventName) {
          eventsMap.set(hall.event_id, eventName);
        }
      }
    });
    return Array.from(eventsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [conferenceHalls]);

  /* ✅ Calculate duration between dates */
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
    return diffDays === 1 ? "1 day" : `${diffDays} days`;
  };

  /* ✅ Get display status based on date filter
   * If date filter is active, check if hall is available for that date range
   * Otherwise, use the actual status from the database
   */
  const getDisplayStatus = (hall) => {
    if (!filterOptions.dateRangeFilter || !hall.start_date || !hall.end_date) {
      return hall.status;
    }

    const hallStartDate = new Date(hall.start_date);
    const hallEndDate = new Date(hall.end_date);
    const filterStartDate = new Date(range[0].startDate);
    const filterEndDate = new Date(range[0].endDate);

    // Normalize dates to start of day
    hallStartDate.setHours(0, 0, 0, 0);
    hallEndDate.setHours(0, 0, 0, 0);
    filterStartDate.setHours(0, 0, 0, 0);
    filterEndDate.setHours(0, 0, 0, 0);

    // Check if hall's booking overlaps with selected date range
    const hasOverlap = !(
      hallEndDate < filterStartDate || hallStartDate > filterEndDate
    );

    // If NO overlap, hall is available for the selected dates
    return hasOverlap ? "booked" : "available";
  };

  /* ✅ Get selected event name */
  const selectedEventName = React.useMemo(() => {
    if (filterOptions.event === "All") return null;
    const event = uniqueEvents.find((e) => e.id === filterOptions.event);
    return event?.name || null;
  }, [filterOptions.event, uniqueEvents]);

  /* ✅ Compute active filter label for button */
  const activeFilterLabel = React.useMemo(() => {
    const activeFilters = [];

    if (filterOptions.status !== "All") {
      activeFilters.push(filterOptions.status);
    }
    if (filterOptions.videoEnabled !== "All") {
      activeFilters.push(`Video ${filterOptions.videoEnabled}`);
    }
    if (filterOptions.event !== "All" && selectedEventName) {
      activeFilters.push(selectedEventName);
    }
    if (filterOptions.dateRangeFilter) {
      activeFilters.push("Date Range");
    }

    if (activeFilters.length === 0) return "All";
    if (activeFilters.length === 1) return activeFilters[0];
    return `${activeFilters.length} active`;
  }, [filterOptions, selectedEventName]);

  /* ✅ Mutation for deleting hall */
  const deleteMutation = useMutation({
    mutationFn: (hallId) => deleteConferenceHall(hallId),
    onSuccess: () => {
      toast.success("Hall deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete hall");
    },
  });

  /* ✅ CLICK OUTSIDE CLOSE DROPDOWN + DATEPICKER */
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInMenu = event.target.closest("[data-menu-container]");
      const isClickOnMenuButton = event.target.closest("[data-menu-button]");

      if (!isClickInMenu && !isClickOnMenuButton) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ✅ ESC KEY CLOSE (Dropdown + Calendar + Drawers) */
  useEffect(() => {
    const handleEscClose = (event) => {
      if (event.key === "Escape") {
        // Close dropdown menu
        setOpenMenuId(null);

        // Close date picker
        setShowDatePicker(false);

        // Close filter dropdown
        setShowFilterDropdown(false);

        // Close Add Conference Hall Drawer
        setShowAddModal(false);

        // Close Assign Hall Drawer
        setShowAssignModal(false);

        // Reset selected hall
        setSelectedHallForAssign(null);
      }
    };

    document.addEventListener("keydown", handleEscClose);

    return () => document.removeEventListener("keydown", handleEscClose);
  }, []);

  /* FILTERED DATA */
  const filteredHalls = conferenceHalls.filter((hall) => {
    if (!hall) return false;

    const hallName = (hall.hall_name || "").toLowerCase();
    const venueName = (hall.venue_name || "").toLowerCase();
    const city = (hall.city || "").toLowerCase();
    const state = (hall.state || "").toLowerCase();
    const floorName = (hall.floor_name || "").toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      hallName.includes(searchLower) ||
      venueName.includes(searchLower) ||
      city.includes(searchLower) ||
      state.includes(searchLower) ||
      floorName.includes(searchLower);

    const hallStatus = (hall.status || "Available").toLowerCase();
    const matchesStatus =
      filterOptions.status === "All" ||
      hallStatus === filterOptions.status.toLowerCase();

    const matchesVideo =
      filterOptions.videoEnabled === "All" ||
      (filterOptions.videoEnabled === "Yes"
        ? hall.video_conference_enabled === true
        : hall.video_conference_enabled === false);

    const matchesEvent =
      filterOptions.event === "All" ||
      (hall.event_id && hall.event_id === filterOptions.event);

    // Date range filter - only apply if dateRangeFilter is enabled
    const matchesDateRange =
      !filterOptions.dateRangeFilter ||
      (() => {
        // Show halls that are AVAILABLE (have no conflicting bookings) during the selected date range
        // If hall has no booking dates, it's available for any date range
        if (!hall.start_date || !hall.end_date) return true;

        const hallStartDate = new Date(hall.start_date);
        const hallEndDate = new Date(hall.end_date);
        const filterStartDate = new Date(range[0].startDate);
        const filterEndDate = new Date(range[0].endDate);

        // Normalize dates to start of day for accurate comparison
        hallStartDate.setHours(0, 0, 0, 0);
        hallEndDate.setHours(0, 0, 0, 0);
        filterStartDate.setHours(0, 0, 0, 0);
        filterEndDate.setHours(0, 0, 0, 0);

        // Hall is available if:
        // 1. Hall's booking period ENDS BEFORE filter starts (hall_end < filter_start), OR
        // 2. Hall's booking period STARTS AFTER filter ends (hall_start > filter_end)
        // In other words: NO overlap = available
        return hallEndDate < filterStartDate || hallStartDate > filterEndDate;
      })();

    return (
      matchesSearch &&
      matchesStatus &&
      matchesVideo &&
      matchesEvent &&
      matchesDateRange
    );
  });

  // Custom sort configuration for complex fields
  const sortConfig = {
    hall_name: (hall) => (hall.hall_name || "").toLowerCase(),
    venue_name: (hall) => (hall.venue_name || "").toLowerCase(),
    floor_name: (hall) => (hall.floor_name || "").toLowerCase(),
    state: (hall) => (hall.state || "").toLowerCase(),
    city: (hall) => (hall.city || "").toLowerCase(),
    capacity: (hall) => parseInt(hall.capacity) || 0,
    video_conference_enabled: (hall) => hall.video_conference_enabled ? "yes" : "no",
    status: (hall) => (getDisplayStatus(hall) || "Available").toLowerCase(),
    event_name: (hall) => (
      hall.event?.event_name ||
      hall.event?.name ||
      hall.event_name ||
      ""
    ).toLowerCase(),
    start_date: (hall) => hall.start_date ? new Date(hall.start_date).getTime() : 0,
    end_date: (hall) => hall.end_date ? new Date(hall.end_date).getTime() : 0,
    duration: (hall) => {
      if (!hall.start_date || !hall.end_date) return 0;
      const start = new Date(hall.start_date);
      const end = new Date(hall.end_date);
      return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
  };

  // Use the sorting hook with default sort by hall name in ascending order
  const {
    sortedData: sortedHalls,
    handleSort,
    getColumnSortInfo,
  } = useSorting(filteredHalls, sortConfig, { column: "hall_name", order: "asc" });



  // Reset to first page when user-driven filters/sort/pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, filterOptions]);

  const totalPages = Math.max(1, Math.ceil(sortedHalls.length / pageSize));
  const paginatedHalls = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedHalls.slice(start, start + pageSize);
  }, [sortedHalls, currentPage, pageSize]);

  // Ensure currentPage is within available range to avoid flicker
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);



  /* ACTION HANDLERS */
  const handleMenuClick = (event, hallId) => {
    event.stopPropagation();
    if (openMenuId === hallId) {
      setOpenMenuId(null);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = 130; // approximate height

    // Calculate position
    let top = buttonRect.bottom + 8;
    let left = buttonRect.right - menuWidth;

    // Check if menu would go below viewport
    if (top + menuHeight > window.innerHeight) {
      top = buttonRect.top - menuHeight - 8;
    }

    // Check if menu would go off left edge
    if (left < 8) {
      left = 8;
    }

    // Check if menu would go off right edge
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setMenuPosition({ top, left });
    setOpenMenuId(hallId);
  };

  const handleAssignHall = (id) => {
    const hall = conferenceHalls.find((h) => h._id === id);
    setSelectedHallForAssign(hall);
    setShowAssignModal(true);
    setOpenMenuId(null);
  };

  const handleEditHall = (id) => {
    const hall = conferenceHalls.find((h) => h._id === id);

    setSelectedHallForEdit(hall); // store selected hall
    setShowAddModal(true); // open Add Drawer
    setOpenMenuId(null);
  };



  const handleDeleteHall = (id) => {
    const hall = conferenceHalls.find((h) => h._id === id);
    setHallToDelete(hall);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = () => {
    if (hallToDelete) {
      deleteMutation.mutate(hallToDelete._id);
      setShowDeleteModal(false);
    }
  };

  const handleAddConferenceHall = () => {
    refetch(); // Refresh the halls list after adding
    setShowAddModal(false);
  };

  const handleAssignHallSubmit = () => {
    refetch(); // Refresh the halls list after assigning
    setShowAssignModal(false);
    setSelectedHallForAssign(null);
  };

  return (
    <div className="w-full md:p-6 mt-6 md:mt-0 pb-6">
      {/* HEADER */}
      <div className="rounded-lg  mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Conference Hall
            </h1>
            {selectedEventName && (
              <p className="text-sm text-gray-600 mt-1">
                Showing halls for:{" "}
                <span className="font-semibold text-blue-700">
                  {selectedEventName}
                </span>
                <button
                  onClick={() => {
                    setFilterOptions({ ...filterOptions, event: "All" });
                    setSearchParams({});
                  }}
                  className="ml-2 text-xs text-blue-600 hover:underline"
                >
                  Clear filter
                </button>
              </p>
            )}
            {filterOptions.dateRangeFilter && (
              <p className="text-sm text-gray-600 mt-1">
                Showing halls for period:{" "}
                <span className="font-semibold text-blue-700">
                  {format(range[0].startDate, "MMM d, yyyy")} -{" "}
                  {format(range[0].endDate, "MMM d, yyyy")}
                </span>
                <button
                  onClick={() => {
                    setFilterOptions({
                      ...filterOptions,
                      dateRangeFilter: false,
                    });
                  }}
                  className="ml-2 text-xs text-blue-600 hover:underline"
                >
                  Clear date filter
                </button>
              </p>
            )}
          </div>

          <button
            className="bg-[#1e4788] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-xs md:text-sm hover:bg-[#163761] transition-colors"
            onClick={() => {
              setSelectedHallForEdit(null); // ✅ reset edit mode
              setShowAddModal(true);
            }}
          >
            <Plus size={16} /> Add Conference Hall
          </button>
        </div>
      </div>

      {/* FILTERS AND SEARCH */}
      <div className="bg-white px-4 sm:px-5 py-4 border-b border-gray-200 rounded-tl-xl rounded-tr-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* SEARCH */}
          <div className="relative w-full sm:w-[320px] md:w-[360px] lg:w-[400px]">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search halls, venues, states, cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[42px] pl-11 pr-4
        border border-gray-300 rounded-lg bg-white
        text-sm text-gray-900 placeholder-gray-400
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all
        hover:border-gray-400"
            />
          </div>

          {/* RIGHT CONTROLS (Date + Filter) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* DATE PICKER */}
            <div className="relative flex-1 sm:flex-none">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 w-full sm:w-auto
          h-[42px] px-3 sm:px-4 rounded-lg border
          text-sm font-medium justify-center transition-all duration-200
          ${
            filterOptions.dateRangeFilter
              ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          }`}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>

                <span className="text-sm truncate">
                  <span className="hidden md:inline">
                    {format(range[0].startDate, "MMM d, yyyy")} -{" "}
                    {format(range[0].endDate, "MMM d, yyyy")}
                  </span>
                  <span className="md:hidden">
                    {format(range[0].startDate, "MMM d")} -{" "}
                    {format(range[0].endDate, "MMM d")}
                  </span>
                </span>

                {filterOptions.dateRangeFilter && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full flex-shrink-0">
                    ✓
                  </span>
                )}

                <ChevronDown size={16} className="flex-shrink-0" />
              </button>
            </div>

            {/* FILTER BUTTON */}
            <div className="relative flex-1 sm:flex-none">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center justify-between gap-2 w-full sm:w-auto
          h-[42px] px-3 sm:px-4 rounded-lg border border-gray-300
          bg-white text-sm font-medium text-gray-700
          hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 min-w-[140px] shadow-sm"
              >
                <span className="truncate">Filter: {activeFilterLabel}</span>
                <ChevronDown
                  size={16}
                  className="text-gray-400 flex-shrink-0"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Calendar Popup - Rendered at component root level */}
      {showDatePicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-[9998]"
            onClick={() => setShowDatePicker(false)}
          />
          {/* Modal */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            bg-white border border-gray-200
            rounded-xl shadow-2xl z-[9999] overflow-hidden max-w-[calc(100vw-2rem)] sm:max-w-none"
          >
            {/* Inline Calendar Styling */}
            <style>
              {`
              .rdrCalendarWrapper {
                font-family: Inter, sans-serif;
                font-size: 13px;
              }

              .rdrMonthName {
                font-weight: 600;
                font-size: 13px;
              }

              .rdrInRange,
              .rdrStartEdge,
              .rdrEndEdge {
                background: #1D4ED8 !important;
              }
            `}
            </style>

            <DateRange
              ranges={range}
              onChange={(item) => setRange([item.selection])}
              moveRangeOnFirstSelection={false}
              rangeColors={["#1D4ED8"]}
              showDateDisplay={false}
            />

            {/* Info message */}
            <div className="px-4 py-3 bg-blue-50 border-t border-b border-blue-100">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">ℹ️ Filter Info:</span> Shows all
                halls with booking periods that fall within or overlap with your
                selected date range.
              </p>
            </div>

            {/* Apply and Clear buttons */}
            <div className="flex justify-between items-center px-4 py-2 border-t">
              <button
                onClick={() => {
                  setFilterOptions((prev) => ({
                    ...prev,
                    dateRangeFilter: false,
                  }));
                  setRange([
                    {
                      startDate: new Date(),
                      endDate: new Date(
                        new Date().setDate(new Date().getDate() + 7),
                      ),
                      key: "selection",
                    },
                  ]);
                  setShowDatePicker(false);
                }}
                className="px-4 py-1.5 rounded-lg
                border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Clear Filter
              </button>
              <button
                onClick={() => {
                  setFilterOptions((prev) => ({
                    ...prev,
                    dateRangeFilter: true,
                  }));
                  setShowDatePicker(false);
                }}
                className="px-4 py-1.5 rounded-lg
                bg-blue-700 text-white text-sm font-medium hover:bg-blue-800"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </>
      )}

      {/* ✅ Filter Dropdown - Rendered at component root level */}
      {showFilterDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-[9998]"
            onClick={() => setShowFilterDropdown(false)}
          />
          {/* Modal */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            w-[90vw] sm:w-[400px] max-w-[400px] bg-white border border-gray-200
            rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-[80vh] overflow-y-auto"
          >
            {/* STATUS */}
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-700 mb-2">Status</p>

              {["All", "Available", "Booked"].map((option) => {
                const checked = filterOptions.status === option;

                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 py-1 cursor-pointer select-none"
                  >
                    {/* hidden real radio */}
                    <input
                      type="radio"
                      name="status"
                      value={option}
                      checked={checked}
                      onChange={(e) =>
                        setFilterOptions({
                          ...filterOptions,
                          status: e.target.value,
                        })
                      }
                      className="sr-only"
                    />

                    {/* custom circle */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition
          ${checked ? "border-blue-700" : "border-gray-300"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full bg-blue-700 transition
            ${checked ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                      />
                    </div>

                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                );
              })}
            </div>
            {/* EVENT FILTER */}
            {uniqueEvents.length > 0 && (
              <div className="p-4 border-b">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Event
                </p>

                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="event"
                      value="All"
                      checked={filterOptions.event === "All"}
                      onChange={(e) =>
                        setFilterOptions({
                          ...filterOptions,
                          event: e.target.value,
                        })
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200
                              ${filterOptions.event === "All" ? "border-blue-700" : "border-gray-300"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full bg-blue-700 transition-all duration-200
                                ${filterOptions.event === "All" ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                      />
                    </div>
                    <span className="text-sm text-gray-700">All</span>
                  </label>

                  {uniqueEvents.map((event) => {
                    const checked = filterOptions.event === event.id;
                    return (
                      <label
                        key={event.id}
                        className="flex items-center gap-2 py-1 cursor-pointer select-none"
                      >
                        <input
                          type="radio"
                          name="event"
                          value={event.id}
                          checked={checked}
                          onChange={(e) =>
                            setFilterOptions({
                              ...filterOptions,
                              event: e.target.value,
                            })
                          }
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                  ${checked ? "border-blue-700" : "border-gray-300"}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full bg-blue-700 transition-all duration-200
                                    ${checked ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                          />
                        </div>
                        <span className="text-sm text-gray-700 truncate">
                          {event.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {/* VIDEO */}
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Video Enabled
              </p>

              {["All", "Yes", "No"].map((option) => {
                const checked = filterOptions.videoEnabled === option;

                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 py-1 cursor-pointer select-none"
                  >
                    {/* Hidden native radio */}
                    <input
                      type="radio"
                      name="video"
                      value={option}
                      checked={checked}
                      onChange={(e) =>
                        setFilterOptions({
                          ...filterOptions,
                          videoEnabled: e.target.value,
                        })
                      }
                      className="sr-only"
                    />

                    {/* Custom radio circle */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200
            ${checked ? "border-blue-700" : "border-gray-300"}`}
                    >
                      {/* Inner dot */}
                      <div
                        className={`w-2 h-2 rounded-full bg-blue-700 transition-all duration-200
              ${checked ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                      />
                    </div>

                    {/* Label */}
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                );
              })}
            </div>

            {/* RESET */}
            <div className="p-3 flex justify-end">
              <button
                onClick={() => {
                  setFilterOptions({
                    status: "All",
                    videoEnabled: "All",
                    event: "All",
                    dateRangeFilter: false,
                  });
                  setShowFilterDropdown(false);
                }}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </>
      )}

      {/* TABLE / CARDS */}
      <div className="bg-white border-gray-200 overflow-hidden rounded-bl-xl rounded-br-xl shadow-sm">
        {isLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500 font-medium">
              Loading conference halls...
            </p>
          </div>
        ) : error ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-sm text-red-900 font-semibold">
              Failed to load conference halls
            </p>
          </div>
        ) : filteredHalls.length === 0 ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              No conference halls found
            </p>
          </div>
        ) : (
          <>
            {/* Mobile & Tablet Card View */}
            <div className="md:hidden rounded-bl-xl rounded-br-xl overflow-hidden">
              {paginatedHalls.map((hall, index) => (
                <div
                  key={hall._id}
                  className="border-b border-gray-200 last:border-b-0 p-4 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                          <span className="inline-flex items-center justify-center text-gray-500 text-sm font-semibold min-w-[28px] mt-0.5">
                          {(currentPage - 1) * pageSize + index + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 capitalize text-base leading-snug mb-1">
                            {hall.hall_name}
                          </h3>
                          <p className="text-sm text-gray-600 capitalize flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <span className="truncate">{hall.venue_name}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Menu */}
                    <div className="relative ml-2 flex-shrink-0">
                      <button
                        data-menu-button
                        onClick={(e) => handleMenuClick(e, hall._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-150"
                      >
                        <MoreVertical size={18} className="text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-3">
                    {/* Location & Floor Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1.5">
                          Location
                        </div>
                        <div className="text-sm text-gray-900 capitalize font-medium flex items-start gap-1.5">
                          <svg
                            className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span>
                            {hall.city}, {hall.state}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1.5">
                          Floor Name
                        </div>
                        <div className="text-sm text-gray-900 capitalize font-medium">
                          {hall.floor_name}
                        </div>
                      </div>
                    </div>

                    {/* Capacity & Status Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1.5">
                          Capacity
                        </div>
                        <div className="text-sm text-gray-900 font-semibold flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          {hall.capacity}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1.5">
                          Status
                        </div>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${
                            getDisplayStatus(hall).toLowerCase() === "available"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : "bg-red-100 text-red-600 border-red-300"
                          }`}
                        >
                          {getDisplayStatus(hall)
                            ? getDisplayStatus(hall).charAt(0).toUpperCase() +
                              getDisplayStatus(hall).slice(1).toLowerCase()
                            : "Available"}
                        </span>
                      </div>
                    </div>

                    {/* Video Conference */}
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1.5">
                        Video Conference
                      </div>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${
                          hall.video_conference_enabled
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-red-100 text-red-600 border-red-300"
                        }`}
                      >
                        {hall.video_conference_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    {/* Event Name (if exists) - include fallbacks from booking_details/session_name */}
                    {(hall.event?.event_name || hall.event?.name || hall.event_name || hall.booking_details?.session_name || hall.session_name) && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xs font-medium text-gray-500 mb-1.5">
                          Event
                        </div>
                        <div className="text-sm text-gray-900 font-medium">
                          {hall.event?.event_name || hall.event?.name || hall.event_name || hall.booking_details?.session_name || hall.session_name}
                        </div>
                      </div>
                    )}

                    {/* Booking Period (if exists and status is booked) */}
                    {getDisplayStatus(hall).toLowerCase() === "booked" &&
                      hall.start_date &&
                      hall.end_date && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            Booking Period
                          </div>
                          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500 mb-0.5">
                                Start
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(hall.start_date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </div>
                            </div>
                            <svg
                              className="w-5 h-5 text-gray-400 mx-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </svg>
                            <div className="flex-1 text-right">
                              <div className="text-xs text-gray-500 mb-0.5">
                                End
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(hall.end_date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                            <Calendar size={14} className="text-gray-400" />
                            <span>
                              {calculateDuration(
                                hall.start_date,
                                hall.end_date,
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar rounded-bl-xl rounded-br-xl">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0">
                  <tr className="font-bold text-base border-b border-gray-200 bg-gray-100">
                    <th className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap w-16">
                      S. No.
                    </th>
                    <SortableHeader
                      column="venue_name"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("venue_name")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[120px]"
                    >
                      Venue Name
                    </SortableHeader>
                     <SortableHeader
                      column="hall_name"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("hall_name")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[140px]"
                    >
                      Conference Hall Name
                    </SortableHeader>
                    <SortableHeader
                      column="floor_name"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("floor_name")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[100px]"
                    >
                      Floor Name
                    </SortableHeader>
                    <SortableHeader
                      column="state"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("state")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[100px]"
                    >
                      State
                    </SortableHeader>
                    <SortableHeader
                      column="city"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("city")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[100px]"
                    >
                      City
                    </SortableHeader>
                    <SortableHeader
                      column="capacity"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("capacity")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap w-20"
                    >
                      Capacity
                    </SortableHeader>
                    <SortableHeader
                      column="video_conference_enabled"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("video_conference_enabled")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap w-28"
                    >
                      Video Enabled
                    </SortableHeader>
                    <SortableHeader
                      column="status"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("status")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap w-24"
                    >
                      Status
                    </SortableHeader>
                    <SortableHeader
                      column="event_name"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("event_name")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[120px]"
                    >
                      Event Name
                    </SortableHeader>
                    <SortableHeader
                      column="start_date"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("start_date")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[110px]"
                    >
                      Booking Period
                    </SortableHeader>
                    <SortableHeader
                      column="duration"
                      onSort={handleSort}
                      sortInfo={getColumnSortInfo("duration")}
                      className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap w-24"
                    >
                      Duration
                    </SortableHeader>
                    <th className="px-3 py-4 text-left font-semibold text-gray-700 whitespace-nowrap w-20">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedHalls.map((hall, index) => (
                    <tr
                      key={hall._id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-3 py-3 text-center font-semibold text-base">{(currentPage - 1) * pageSize + index + 1}</td>
                      <td
                        className="px-3 py-3 capitalize max-w-[120px] truncate text-[var(--color-primary-blue)] text-base font-semibold"
                        title={hall.venue_name}
                      >
                        {hall.venue_name}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-base capitalize text-[var(--color-primary-blue)]  truncate max-w-[260px]" title={hall.hall_name || ''}>
                              {hall.hall_name}
                            </p>
                            <p className="text-sm capitalize text-[var(--color-primary-blue)] truncate max-w-[260px]" title={hall.venue_name || ''}>
                              {hall.venue_name}
                            </p>
                          </div>
                        </div>
                      </td>
                     
                      <td className="px-3 py-3">
                        <span className="text-[var(--color-primary-blue)] text-base block truncate max-w-[140px] capitalize" title={hall.floor_name || ''}>{hall.floor_name || '-'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[var(--color-primary-blue)] text-base block truncate max-w-[140px] capitalize" title={hall.state || ''}>{hall.state || '-'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[var(--color-primary-blue)] text-base block truncate max-w-[140px] capitalize" title={hall.city || ''}>{hall.city || '-'}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-[var(--color-primary-blue)] text-base capitalize">{hall.capacity}</td>

                      {/* VIDEO */}
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            hall.video_conference_enabled
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-red-100 text-red-600 border border-red-300"
                          }`}
                        >
                          {hall.video_conference_enabled ? "Yes" : "No"}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            getDisplayStatus(hall).toLowerCase() === "available"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-red-100 text-red-600 border border-red-300"
                          }`}
                        >
                          {getDisplayStatus(hall)
                            ? getDisplayStatus(hall).charAt(0).toUpperCase() +
                              getDisplayStatus(hall).slice(1).toLowerCase()
                            : "Available"}
                        </span>
                      </td>

                      {/* EVENT NAME */}
                      <td className="px-3 py-3 max-w-[180px] truncate" title={hall.event?.event_name || hall.event?.name || hall.event_name || hall.booking_details?.session_name || hall.session_name || ''}>
                        {hall.event?.event_name || hall.event?.name || hall.event_name || hall.booking_details?.session_name || hall.session_name ? (
                          <span className="text-[var(--color-primary-blue)] text-base capitalize">{hall.event?.event_name || hall.event?.name || hall.event_name || hall.booking_details?.session_name || hall.session_name}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* BOOKING PERIOD */}
                      <td
                        className="px-3 py-3"
                        title={
                          getDisplayStatus(hall).toLowerCase() === "booked" &&
                          hall.start_date &&
                          hall.end_date
                            ? `${new Date(hall.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to ${new Date(hall.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                            : ""
                        }
                      >
                        {getDisplayStatus(hall).toLowerCase() === "booked" &&
                        hall.start_date &&
                        hall.end_date ? (
                          <div className="text-[var(--color-primary-blue)] text-base block leading-tight">
                            <div className=" whitespace-nowrap">
                              {new Date(hall.start_date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </div>
                            <div className="text-[var(--color-primary-blue)] text-base block">to</div>
                            <div className="text-[var(--color-primary-blue)] text-base whitespace-nowrap">
                              {new Date(hall.end_date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* DURATION */}
                      <td className="px-3 py-3 text-[var(--color-primary-blue)] text-base ">
                        {getDisplayStatus(hall).toLowerCase() === "booked" &&
                        hall.start_date &&
                        hall.end_date ? (
                          <div className="flex items-center gap-1  whitespace-nowrap">
                            <Calendar size={18} className="text-[var(--color-primary-blue)]" />
                            <span>
                              {calculateDuration(
                                hall.start_date,
                                hall.end_date,
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* ACTION BUTTON */}
                      <td className="px-3 py-3 relative">
                        <button
                          data-menu-button
                          onClick={(e) => handleMenuClick(e, hall._id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* PAGINATION */}
            <div className="px-4 py-3 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">Showing {(sortedHalls.length===0)?0:((currentPage-1)*pageSize + 1)} - {Math.min(sortedHalls.length, currentPage*pageSize)} of {sortedHalls.length}</div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-[40px] pl-3 pr-8 py-1.5 rounded-md border text-[12px] bg-white leading-tight"
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md border ${currentPage===1?"text-gray-400":""}`}
                >Prev</button>
                <div className="text-sm">{currentPage} / {totalPages}</div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md border ${currentPage===totalPages?"text-gray-400":""}`}
                >Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DRAWERS */}
      <AddConferenceHallDrawer
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedHallForEdit(null);
        }}
        onAdd={handleAddConferenceHall}
        editHallData={selectedHallForEdit}
      />

      <AssignHallDrawer
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        hallData={selectedHallForAssign}
        onAssign={handleAssignHallSubmit}
        initialStartDate={
          filterOptions.dateRangeFilter ? range[0].startDate : null
        }
        initialEndDate={filterOptions.dateRangeFilter ? range[0].endDate : null}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setHallToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Conference Hall"
        message="Are you sure you want to delete this conference hall? This action cannot be undone."
        itemName={hallToDelete?.hall_name}
        isLoading={deleteMutation.isPending}
      />

      {/* ✅ Action Menu - Rendered at component root level with smart positioning */}
      {openMenuId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpenMenuId(null)}
          />
          {/* Menu */}
          <div
            data-menu-container
            style={{
              position: "fixed",
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            className="bg-white rounded-lg shadow-2xl border border-gray-200 w-[150px] overflow-hidden z-[9999]"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const hall = conferenceHalls.find((h) => h._id === openMenuId);
                handleAssignHall(openMenuId);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors duration-150"
            >
              {conferenceHalls.find((h) => h._id === openMenuId)?.event_id
                ? "Change Hall"
                : "Assign Hall"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditHall(openMenuId);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors duration-150"
            >
              Edit
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteHall(openMenuId);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ConferenceHall;
