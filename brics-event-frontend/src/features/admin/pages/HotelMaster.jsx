import { useState, useMemo, useRef } from "react";
import { useEffect } from "react";
import { Search, Plus, ChevronDown, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { State, City } from "country-state-city";
import SortableHeader from "../../../components/common/SortableHeader";
import useSorting from "../../../hooks/useSorting";
import {
  createHotelMaster,
  getHotelMasterList,
  updateHotelMaster,
  deleteHotelMaster,
} from "../../../services/hotel";
import { MoreVertical } from "lucide-react";

const HotelMaster = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editHotel, setEditHotel] = useState(null);
  const menuRef = useRef(null);
  const initialHotelState = {
    name: "",
    city: "",
    state: "",
    stateCode: "",
    address: "",
    contactName: "",
    contactNumber: "",
  };
  const [hotelForms, setHotelForms] = useState([
    { id: 1, data: { ...initialHotelState }, errors: {} },
  ]);
  const [nextId, setNextId] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Get Indian states list
  const indiaStates = useMemo(() => State.getStatesOfCountry("IN"), []);

  // Function to get cities by state code
  const getCitiesByState = (stateCode) => {
    if (!stateCode) return [];
    return City.getCitiesOfState("IN", stateCode);
  };

  // Fetch hotel master list (server-side pagination)
const { data: hotelsData = {}, isLoading, isFetching } = useQuery({
  queryKey: ["hotel-master-list", currentPage, pageSize, searchTerm],
  queryFn: () =>
    getHotelMasterList({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
    }),
  placeholderData: (prev) => prev,
});

  let hotels = Array.isArray(hotelsData?.data)
    ? hotelsData.data
    : Array.isArray(hotelsData?.hotels)
    ? hotelsData.hotels
    : Array.isArray(hotelsData)
    ? hotelsData
    : [];
  hotels = hotels.slice();
  const totalHotels = hotelsData?.total ?? hotelsData?.count ?? hotelsData?.meta?.total ?? hotelsData?.meta?.count ?? hotels.length;
  const totalPages = Math.max(1, Math.ceil(totalHotels / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payloads) => {
      // payloads: array of hotel objects
      for (const payload of payloads) {
        await createHotelMaster(payload);
      }
    },
    onSuccess: () => {
      toast.success("Hotel(s) created successfully");
      queryClient.invalidateQueries(["hotel-master-list"]);
      setIsSubmitting(false);
      setIsAnimating(false);
      setTimeout(() => setDrawerOpen(false), 300);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to create hotel(s)");
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateHotelMaster(id, data),
    onSuccess: () => {
      toast.success("Hotel updated successfully");
      queryClient.invalidateQueries(["hotel-master-list"]);
      setIsSubmitting(false);
      setIsAnimating(false);
      setTimeout(() => setDrawerOpen(false), 300);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update hotel");
      setIsSubmitting(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteHotelMaster(id),
    onSuccess: () => {
      toast.success("Hotel deleted successfully");
      queryClient.invalidateQueries(["hotel-master-list"]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete hotel");
    },
  });

  // Server-side search is used; keep lightweight client-side fallback filtering
  const filteredHotels = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return hotels;

    return hotels.filter((h) => {
      const name = (h.name || "").toLowerCase();
      const city = (h.city || "").toLowerCase();
      const state = (h.state || "").toLowerCase();
      const address = (h.address || "").toLowerCase();
      const contactName = (h.contactName || "").toLowerCase();
      const contactNumber = (h.contactNumber || "").toLowerCase();

      return (
        name.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        address.includes(q) ||
        contactName.includes(q) ||
        contactNumber.includes(q)
      );
    });
  }, [hotels, searchTerm]);

  // Custom sort configuration for hotel fields
  const sortConfig = {
    name: (hotel) => (hotel.name || "").toLowerCase(),
    city: (hotel) => (hotel.city || "").toLowerCase(),
    state: (hotel) => (hotel.state || "").toLowerCase(),
    address: (hotel) => (hotel.address || "").toLowerCase(),
    contactName: (hotel) => (hotel.contactName || "").toLowerCase(),
    contactNumber: (hotel) => (hotel.contactNumber || "").toLowerCase()
  };

  // Use the sorting hook with default sort by hotel name in ascending order
  const {
    sortedData: sortedHotels,
    handleSort,
    getColumnSortInfo,
  } = useSorting(filteredHotels, sortConfig, { column: "name", order: "asc" });

  // Open modal for create/update
  const handleCreate = () => {
    setEditHotel(null);
    setHotelForms([
      { id: 1, data: { ...initialHotelState }, errors: {} },
    ]);
    setNextId(2);
    setDrawerOpen(true);
    setTimeout(() => setIsAnimating(true), 10);
  };
  const handleEdit = (hotel) => {
    setEditHotel(hotel);
    // Find the state code from state name
    const stateObj = indiaStates.find(
      (s) => s.name.toLowerCase() === (hotel.state || "").toLowerCase()
    );
    const stateCode = stateObj?.isoCode || "";
    setHotelForms([
      { id: 1, data: { ...hotel, stateCode }, errors: {} },
    ]);
    setNextId(2);
    setDrawerOpen(true);
    setTimeout(() => setIsAnimating(true), 10);
  };

  // Table columns: S. No., Hotel Name, City, State, Address, Contact, Status, Created On, Action
  return (
    <div className="sm:px-6 pt-4 sm:pt-6 pb-10">
      {/* HEADER */}
      <div className="mb-4 sm:mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-[20px] font-semibold text-[#0F172A]">Hotel List</h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1">
            Manage hotel list for events
          </p>
        </div>
        <button
          className="text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium"
          style={{ background: "var(--color-primary-blue)" }}
          onClick={handleCreate}
        >
          <Plus size={16} /> Add Hotel
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
                placeholder="Search hotel, city, state, contact name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[42px] pl-11 pr-4 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
              />
            </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          {isLoading && <div className="text-center py-6 text-sm">Loading...</div>}
          <table className="w-full">
            <thead>
                <tr className="text-left border-b bg-gray-50">
                <th className="px-4 py-3 text-base text-[#0F172A] font-semibold">S. No.</th>
                <SortableHeader
                  column="name"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("name")}
                  className="px-4 py-3 text-base text-[#0F172A] font-semibold"
                >
                  Hotel Name
                </SortableHeader>
                <SortableHeader
                  column="city"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("city")}
                  className=" py-3 text-base text-[#0F172A] font-semibold"
                >
                  City
                </SortableHeader>
                <SortableHeader
                  column="state"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("state")}
                  className=" py-3 text-base text-[#0F172A] font-semibold"
                >
                  State
                </SortableHeader>
                <SortableHeader
                  column="address"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("address")}
                  className=" py-3 text-base text-[#0F172A] font-semibold"
                >
                  Address
                </SortableHeader>
                <SortableHeader
                  column="contactName"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("contactName")}
                  className=" py-3 text-base text-[#0F172A] font-semibold"
                >
                  Contact Name
                </SortableHeader>
                <SortableHeader
                  column="contactNumber"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("contactNumber")}
                  className=" py-3 text-base text-[#0F172A] font-semibold"
                >
                  Contact Number
                </SortableHeader>
                <th className="pr-4 py-3 text-right text-base text-[#0F172A] font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedHotels.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-sm">
                    No hotels found
                  </td>
                </tr>
              )}
              {sortedHotels.map((h, idx) => (
                <tr key={h._id || h.id} className="border-b">
                  <td className="px-4 py-4 text-gray-700 font-base font-semibold">{idx + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p
                          className="text-base capitalize text-[var(--color-primary-blue)] font-semibold truncate max-w-[260px]"
                          title={h.name || ''}
                        >
                          {h.name}
                        </p>
                        <p
                          className="text-sm capitalize text-[var(--color-primary-blue)] truncate max-w-[260px]"
                          title={h.city ? `${h.city}${h.state ? ', ' + h.state : ''}` : ''}
                        >
                          {h.city ? `${h.city}${h.state ? ', ' + h.state : ''}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="text-[var(--color-primary-blue)] text-base block truncate max-w-[160px]"
                      title={h.city || ''}
                    >
                      {h.city || '-'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-[var(--color-primary-blue)] text-base block truncate max-w-[140px]"
                      title={h.state || ''}
                    >
                      {h.state || '-'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-[var(--color-primary-blue)] text-base block truncate max-w-[240px]"
                      title={h.address || ''}
                    >
                      {h.address || '-'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-[var(--color-primary-blue)] text-base block truncate max-w-[180px]"
                      title={h.contactName || ''}
                    >
                      {h.contactName || '-'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-[var(--color-primary-blue)] text-base block truncate max-w-[140px]"
                      title={h.contactNumber || ''}
                    >
                      {h.contactNumber || '-'}
                    </span>
                  </td>

                  <td className="px-4 py-4 relative">

                    <div className="flex justify-end">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === (h._id || h.id) ? null : (h._id || h.id));
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical size={16} />
                      </button>

                    </div>

                    {openMenuId === (h._id || h.id) && (

                      <div
                        ref={menuRef}
                        className="absolute right-4 top-10 w-32 bg-white border rounded shadow-md z-50"
                      >

                        <button
                          onClick={() => {
                            handleEdit(h);
                            setOpenMenuId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            deleteMutation.mutate(h._id || h.id);
                            setOpenMenuId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete
                        </button>

                      </div>

                    )}

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden">
          {isLoading && <div className="text-center py-6 text-sm">Loading...</div>}
          {sortedHotels.length === 0 && (
            <div className="text-center py-6 text-sm">No hotels found</div>
          )}
          {sortedHotels.map((h, idx) => (
            <div key={h._id || h.id} className="border-b p-4 space-y-3">
                  <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Hotel #{idx + 1}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                      {h.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-base" style={{ color: "var(--color-primary-blue)" }}>{h.name}</h3>
                      <p className="text-xs text-gray-500">{h.city}{h.state ? ', ' + h.state : ''}</p>
                    </div>
                  </div>
                </div>
                {/* <span className={`px-2 py-[2px] rounded-full text-[11px] ${h.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} whitespace-nowrap`}>
                  {h.status}
                </span> */}


              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">City:</span>
                  <span className="text-gray-700 text-right truncate ml-2 max-w-[60%]">{h.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">State:</span>
                  <span className="text-gray-700">{h.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact Name:</span>
                  <span className="text-gray-700">{h.contactName || '-'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Contact Number:</span>
                  <span className="text-gray-700">{h.contactNumber || '-'}</span>
                </div>
              </div>
              <td className="px-4 py-4 text-right relative">
                <button
                  onClick={() =>
                    setOpenMenuId(openMenuId === (h._id || h.id) ? null : (h._id || h.id))
                  }
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <MoreVertical size={16} />
                </button>

                {openMenuId === (h._id || h.id) && (

                  <div className="absolute right-4 top-8 w-32 bg-white border rounded shadow-md z-50">

                    <button
                      onClick={() => {
                        handleEdit(h);
                        setOpenMenuId(null);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        deleteMutation.mutate(h._id || h.id);
                        setOpenMenuId(null);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Delete
                    </button>

                  </div>

                )}

              </td>
            </div>
          ))}
        </div>
        {/* PAGINATION */}
        <div className="px-4 py-3 flex items-center justify-between border-t">
          <div className="text-sm text-gray-600">Showing {hotels.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
-
{hotels.length === 0 ? 0 : (currentPage - 1) * pageSize + hotels.length}
of {totalHotels}</div>
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
      </div>

      {/* CREATE/UPDATE MODAL (UI only, logic to be added) */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${isAnimating ? "opacity-40" : "opacity-0"
              }`}
            onClick={() => {
              setIsAnimating(false);
              setTimeout(() => setDrawerOpen(false), 300);
            }}
            style={{ margin: 0, padding: 0 }}
          />
          {/* Drawer */}
          <aside
            className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
              left-0 right-0 bottom-0 rounded-t-2xl max-h-[calc(100vh-64px)]
              sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl
              md:w-[700px] lg:w-[820px]
              ${isAnimating
                ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
                : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
              }`}
            style={{ top: "64px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
                {editHotel ? "Edit Hotel" : "Add Hotel"}
              </h2>
              <button
                onClick={() => {
                  setIsAnimating(false);
                  setTimeout(() => setDrawerOpen(false), 300);
                }}
                type="button"
                className="hover:bg-gray-100 rounded-md p-1.5 sm:p-2 -mr-1"
              >
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            {/* BODY */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
              {hotelForms.map((hotel, idx) => (
                <div
                  key={hotel.id}
                  className="bg-gray-50 rounded-xl p-4 sm:p-5 space-y-4 sm:space-y-5"
                >
                  {/* Hotel Count */}
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      HOTEL - {idx + 1}
                    </p>
                    {!editHotel && hotelForms.length > 1 && (
                      <button
                        onClick={() => setHotelForms((prev) => prev.filter((h) => h.id !== hotel.id))}
                        className="text-xs text-red-600 font-medium hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {/* Hotel Name */}
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Hotel Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="eg. Grand Palace"
                      value={hotel.data.name}
                      onChange={(e) => {
                        setHotelForms((prev) => prev.map((h) => h.id === hotel.id ? { ...h, data: { ...h.data, name: e.target.value }, errors: { ...h.errors, name: "" } } : h));
                      }}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] ${hotel.errors.name ? "border-red-500" : "border-gray-300"}`}
                    />
                    {hotel.errors.name && (
                      <p className="text-xs text-red-500 mt-1">{hotel.errors.name}</p>
                    )}
                  </div>
                  {/* State */}
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={hotel.data.stateCode}
                      onChange={(e) => {
                        const selectedStateCode = e.target.value;
                        const selectedState = indiaStates.find((s) => s.isoCode === selectedStateCode);
                        setHotelForms((prev) => prev.map((h) => h.id === hotel.id ? { 
                          ...h, 
                          data: { 
                            ...h.data, 
                            stateCode: selectedStateCode,
                            state: selectedState?.name || "",
                            city: "" // Reset city when state changes
                          }, 
                          errors: { ...h.errors, state: "", city: "" } 
                        } : h));
                      }}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] ${hotel.errors.state ? "border-red-500" : "border-gray-300"}`}
                    >
                      <option value="">Select a state</option>
                      {indiaStates.map((state) => (
                        <option key={state.isoCode} value={state.isoCode}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    {hotel.errors.state && (
                      <p className="text-xs text-red-500 mt-1">{hotel.errors.state}</p>
                    )}
                  </div>
                  {/* City */}
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={hotel.data.city}
                      onChange={(e) => {
                        setHotelForms((prev) => prev.map((h) => h.id === hotel.id ? { ...h, data: { ...h.data, city: e.target.value }, errors: { ...h.errors, city: "" } } : h));
                      }}
                      disabled={!hotel.data.stateCode}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] ${hotel.errors.city ? "border-red-500" : "border-gray-300"} ${!hotel.data.stateCode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    >
                      <option value="">
                        {hotel.data.stateCode ? "Select a city" : "Select state first"}
                      </option>
                      {hotel.data.stateCode && getCitiesByState(hotel.data.stateCode).map((city) => (
                        <option key={city.name} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    {hotel.errors.city && (
                      <p className="text-xs text-red-500 mt-1">{hotel.errors.city}</p>
                    )}
                  </div>
                  {/* Address */}
                  <div>
                    <label className="text-xs font-medium text-gray-700">Address</label>
                    <input
                      placeholder="eg. 123 Main St"
                      value={hotel.data.address}
                      onChange={(e) => {
                        setHotelForms((prev) => prev.map((h) => h.id === hotel.id ? { ...h, data: { ...h.data, address: e.target.value } } : h));
                      }}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Contact Name
                    </label>

                    <input
                      placeholder="eg. John Doe"
                      value={hotel.data.contactName}
                      onChange={(e) => {
                        setHotelForms((prev) =>
                          prev.map((h) =>
                            h.id === hotel.id
                              ? {
                                ...h,
                                data: { ...h.data, contactName: e.target.value },
                              }
                              : h
                          )
                        );
                      }}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm border-gray-300"
                    />

                  </div>
                  {/* Contact Number */}
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Contact Number
                    </label>

                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={15}
                      placeholder="eg. 9876543210"
                      value={hotel.data.contactNumber}

                      // Prevent typing text
                      onKeyDown={(e) => {

                        // Allow control keys
                        if (
                          e.key === "Backspace" ||
                          e.key === "Delete" ||
                          e.key === "ArrowLeft" ||
                          e.key === "ArrowRight" ||
                          e.key === "Tab"
                        ) return;

                        // Block non-numbers
                        if (!/^\d$/.test(e.key)) {
                          e.preventDefault();
                        }

                      }}

                      // Prevent paste text
                      onPaste={(e) => {

                        const paste = e.clipboardData.getData("text");

                        if (!/^\d+$/.test(paste)) {

                          e.preventDefault();

                          toast.error("Only numbers allowed");

                        }

                      }}

                      // Final safety
                      onChange={(e) => {

                        const value = e.target.value.replace(/\D/g, "");

                        setHotelForms((prev) =>
                          prev.map((h) =>
                            h.id === hotel.id
                              ? {
                                ...h,
                                data: {
                                  ...h.data,
                                  contactNumber: value,
                                },
                              }
                              : h
                          )
                        );

                      }}

                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm border-gray-300"
                    />

                  </div>
                  {/* Status */}
                  {/* <div>
                    <label className="text-xs font-medium text-gray-700">Status <span className="text-red-500">*</span></label>
                    <select
                      value={hotel.data.status}
                      onChange={(e) => {
                        setHotelForms((prev) => prev.map((h) => h.id === hotel.id ? { ...h, data: { ...h.data, status: e.target.value }, errors: { ...h.errors, status: "" } } : h));
                      }}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] ${hotel.errors.status ? "border-red-500" : "border-gray-300"}`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {hotel.errors.status && (
                      <p className="text-xs text-red-500 mt-1">{hotel.errors.status}</p>
                    )}
                  </div> */}
                </div>
              ))}
              {!editHotel && (
                  <button
                  type="button"
                  className="font-medium text-sm mt-2 hover:underline"
                  style={{ color: "var(--color-primary-blue)" }}
                  onClick={() => {
                    setHotelForms((prev) => [
                      ...prev,
                      { id: nextId, data: { ...initialHotelState }, errors: {} },
                    ]);
                    setNextId((id) => id + 1);
                  }}
                >
                  + Add More Hotels
                </button>
              )}
            </div>
            {/* FOOTER BUTTONS */}
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                type="button"
                className="px-4 py-2 rounded-md border"
                onClick={() => {
                  setIsAnimating(false);
                  setTimeout(() => setDrawerOpen(false), 300);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md bg-[var(--color-primary-blue)] text-white font-semibold"
                onClick={() => {
                  // Validate all hotels
                  let allValid = true;
                  const updated = hotelForms.map((hotel) => {
                    let errors = {};
                    if (!hotel.data.name.trim()) errors.name = "Hotel Name is required";
                    if (!hotel.data.city.trim()) errors.city = "City is required";
                    if (!hotel.data.state.trim()) errors.state = "State is required";
                    if (Object.keys(errors).length > 0) allValid = false;
                    return { ...hotel, errors };
                  });
                  setHotelForms(updated);
                  if (!allValid) return;
                  setIsSubmitting(true);
                  if (editHotel) {
                    // Update only first hotel (single edit)
                    updateMutation.mutate({
                      id: editHotel._id,
                      data: {
                        name: hotelForms[0].data.name,
                        city: hotelForms[0].data.city,
                        state: hotelForms[0].data.state,
                        address: hotelForms[0].data.address,
                        contactName: hotelForms[0].data.contactName,
                        contactNumber: hotelForms[0].data.contactNumber,
                      }
                    });
                  } else {
                    // Create all
                    createMutation.mutate(
                      updated.map((h) => ({
                        name: h.data.name,
                        city: h.data.city,
                        state: h.data.state,
                        address: h.data.address,
                        contactName: h.data.contactName,
                        contactNumber: h.data.contactNumber,
                      }))
                    );
                  }
                }}
                disabled={isSubmitting}
              >
                {editHotel ? "Update" : "Add"}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default HotelMaster;
