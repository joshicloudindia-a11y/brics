import { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, Plus, MoreVertical, Eye, Edit2 } from "lucide-react";
import SortableHeader from "../../../components/common/SortableHeader";
import useSorting from "../../../hooks/useSorting";
import { useNavigate } from "react-router-dom";
import { getEventManagers } from "../../../services/events";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import AddManagers from "../components/AddManagers";

const EventManagers = () => {
  const navigate = useNavigate();

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewingManager, setViewingManager] = useState(null);
  const { data, isLoading } = useCurrentUser();
  const isEventManager = data?.role?.name === "EVENT_MANAGER";
  
  /* ================= FETCH MANAGERS ================= */
  const fetchManagers = async () => {
    if (isEventManager) {
      setLoading(false);
      return;
    }

    try {
      const data = await getEventManagers();
      setManagers(data || []);
    } catch (err) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    fetchManagers();
  }, [isLoading, isEventManager]);

  /* ================= CLOSE MENU ON OUTSIDE CLICK ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any menu
      const isMenuButton = event.target.closest('[data-menu-button]');
      const isMenuItem = event.target.closest('[data-menu-dropdown]');
      
      if (!isMenuButton && !isMenuItem) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);


  /* ================= SEARCH + SORT ================= */
  const filteredManagers = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return managers.slice();
    return managers.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const org = (m.organization_name || "").toLowerCase();
      const ministry = (m.ministry_name || "").toLowerCase();
      const events = String(m.events_count || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        org.includes(q) ||
        ministry.includes(q) ||
        events.includes(q)
      );
    });
  }, [managers, searchTerm]);

  const sortConfig = {
    name: (m) => (m.name || "").toLowerCase(),
    email: (m) => (m.email || "").toLowerCase(),
    created_at: (m) => new Date(m.created_at).getTime() || 0,
    organization_name: (m) => (m.organization_name || "").toLowerCase(),
    events_count: (m) => Number(m.events_count) || 0,
  };

  const {
    sortedData: sortedManagers,
    handleSort,
    getColumnSortInfo,
    sortColumn,
    sortOrder,
  } = useSorting(filteredManagers, sortConfig, { column: "created_at", order: "desc" });

  const setSort = (col, order) => {
    if (sortColumn !== col) {
      // set new column (defaults to asc), then toggle if needed
      handleSort(col);
      if (order === "desc") handleSort(col);
    } else {
      if (sortOrder !== order) handleSort(col);
    }
    setSortOpen(false);
  };

  useEffect(() => {
    // reset to first page when filters or sort change
    setCurrentPage(1);
  }, [searchTerm, sortOrder, sortColumn, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedManagers.length / pageSize));
  const paginatedManagers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedManagers.slice(start, start + pageSize);
  }, [sortedManagers, currentPage, pageSize]);

  // Ensure currentPage stays within valid range when totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  return (
    <div className=" sm:px-6 pt-4 sm:pt-6 pb-10">
      {/* HEADER */}
      <div className="mb-4 sm:mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-[20px] font-semibold text-[#0F172A]">
            Event Managers
          </h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1">
            View managers and events created by them
          </p>
        </div>
        {!isEventManager && (
          <button
            className="bg-[#1e4788] text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-[#163761] transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> Add Event Manager
          </button>
        )}
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
              placeholder="Search manager, email, organisation"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[42px] pl-11 pr-4 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
            />
          </div>

          {/* SORT / FILTER */}
          <div className="flex gap-2 relative flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="h-[32px] px-3 rounded-md bg-gray-100 text-[12px] flex items-center gap-1"
            >
              Sort <ChevronDown size={12} />
            </button>

            {sortOpen && (
              <div className="absolute right-0 sm:right-[90px] top-9 bg-white border rounded-md shadow-md text-[12px] w-[140px] z-10">
                <button
                  onClick={() => setSort("created_at", "desc")}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100"
                >
                  Newest First
                </button>
                <button
                  onClick={() => setSort("created_at", "asc")}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100"
                >
                  Oldest First
                </button>
              </div>
            )}

            <button className="h-[32px] px-3 rounded-md bg-gray-100 text-[12px] items-center gap-1 hidden sm:flex">
              Filter: All <ChevronDown size={12} />
            </button>

            <button className="h-[32px] px-3 rounded-md bg-gray-100 text-[12px] items-center gap-1 hidden sm:flex">
              List View <ChevronDown size={12} />
            </button>
            
          </div>
        </div>
        

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="px-4 py-3 text-base text-[#0F172A] font-semibold">S. No.</th>
                <SortableHeader
                  column="name"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("name")}
                  className="px-4 py-3 text-left text-base text-[#0F172A] font-semibold"
                >
                  Manager Name
                </SortableHeader>

                <SortableHeader
                  column="email"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("email")}
                  className=" py-3 text-left text-base text-[#0F172A] font-semibold"
                >
                  Email
                </SortableHeader>

                <SortableHeader
                  column="organization_name"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("organization_name")}
                  className=" py-3 text-left text-base text-[#0F172A] font-semibold"
                >
                  Organisation Name
                </SortableHeader>

                <SortableHeader
                  column="events_count"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("events_count")}
                  className=" py-3 text-left text-base text-[#0F172A] font-semibold"
                >
                  Events Created
                </SortableHeader>

                <SortableHeader
                  column="created_at"
                  onSort={handleSort}
                  sortInfo={getColumnSortInfo("created_at")}
                  className="px-4 py-3 text-left text-base text-[#0F172A] font-semibold"
                >
                  Created On
                </SortableHeader>

                <th className="pr-4 py-3 text-right text-base text-[#0F172A] font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-sm">
                    Loading managers...
                  </td>
                </tr>
              )}

              {!loading && sortedManagers.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-sm">
                    No managers found
                  </td>
                </tr>
              )}

              {paginatedManagers.map((m, index) => (
                <tr key={m.manager_id} className="border-b">
                  <td className="px-4 py-4 text-gray-700 font-base font-semibold">{(currentPage - 1) * pageSize + index + 1}</td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-base capitalize text-[var(--color-primary-blue)] font-semibold truncate max-w-[260px]" title={m.name || ''}>
                          {m.name}
                        </p>
                        <p className="text-sm capitalize text-[var(--color-primary-blue)] truncate max-w-[260px]" title={m.organization_name || m.ministry_name || ''}>
                          {m.organization_name || m.ministry_name || ''}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="text-[var(--color-primary-blue)] text-base block truncate max-w-[180px]" title={m.ministry_name || ''}>{m.ministry_name || 'N/A'}</span>
                  </td>
                  <td>
                    <span className="text-[var(--color-primary-blue)] text-base block truncate max-w-[220px]" title={m.email || ''}>{m.email || '-'}</span>
                  </td>
                  <td>
                    <span className="text-[var(--color-primary-blue)] text-base block truncate max-w-[220px]" title={m.organization_name || ''}>{m.organization_name || '-'}</span>
                  </td>

                  <td className="px-4 py-4 text-[var(--color-primary-blue)]">
                    {new Date(m.created_at).toLocaleDateString("en-IN")}
                  </td>

                  <td className="pr-4 text-center">
                    <div className="relative inline-block">
                      <button
                        data-menu-button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === m.manager_id ? null : m.manager_id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-600" />
                      </button>

                      {openMenuId === m.manager_id && (
                        <div
                          data-menu-dropdown
                          className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewingManager(m);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                          >
                            <Eye size={14} /> View Details
                          </button>
                          {!isEventManager && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingManager(m);
                                setShowAddModal(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t rounded-b-lg"
                            >
                              <Edit2 size={14} /> Edit Manager
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden">
          {loading && (
            <div className="text-center py-6 text-sm">
              Loading managers...
            </div>
          )}

          {!loading && sortedManagers.length === 0 && (
            <div className="text-center py-6 text-sm">
              No managers found
            </div>
          )}

          {paginatedManagers.map((m, index) => (
            <div key={m.manager_id} className="border-b p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Manager #{(currentPage - 1) * pageSize + index + 1}</div>
                  <h3 className="font-medium text-[#1E40AF] capitalize text-base">
                    {m.name}
                  </h3>
                </div>
                <span className="px-2 py-[2px] rounded-full text-[11px] bg-blue-100 text-[#1E40AF] whitespace-nowrap">
                  {m.events_count} Events
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ministry:</span>
                  <span className="text-gray-700 text-right truncate ml-2 max-w-[60%]">
                    {m.ministry_name || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="text-gray-700 text-right truncate ml-2 max-w-[60%]">
                    {m.email}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Organization:</span>
                  <span className="text-gray-700 text-right truncate ml-2 max-w-[60%]">
                    {m.organization_name || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Created On:</span>
                  <span className="text-gray-700">
                    {new Date(m.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="relative">
                <button
                  data-menu-button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === m.manager_id ? null : m.manager_id);
                  }}
                  className="w-full py-2 px-3 rounded-md border border-gray-300 text-gray-700 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <MoreVertical size={16} /> Actions
                </button>

                {openMenuId === m.manager_id && (
                  <div
                    data-menu-dropdown
                    className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setViewingManager(m);
                        setOpenMenuId(null);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                    >
                      <Eye size={14} /> View Details
                    </button>
                    {!isEventManager && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingManager(m);
                          setShowAddModal(true);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t rounded-b-lg"
                      >
                        <Edit2 size={14} /> Edit Manager
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* PAGINATION */}
        <div className="px-4 py-3 flex items-center justify-between border-t">
          <div className="text-sm text-gray-600">Showing {(sortedManagers.length===0)?0:( (currentPage-1)*pageSize + 1)} - {Math.min(sortedManagers.length, currentPage*pageSize)} of {sortedManagers.length}</div>
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

      {/* ADD MANAGER DRAWER */}
      <AddManagers
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingManager(null);
        }}
        editManager={editingManager}
        onSuccess={fetchManagers}
      />

      {/* VIEW MANAGER DETAILS MODAL */}
      {viewingManager && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[200] transition-opacity"
            onClick={() => setViewingManager(null)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Manager Details</h2>
                <button
                  onClick={() => setViewingManager(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold">
                      {viewingManager.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 capitalize">{viewingManager.name}</h3>
                      <p className="text-sm text-gray-500">Event Manager</p>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-900">{viewingManager.email}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Ministry</p>
                    <p className="text-sm font-medium text-gray-900">{viewingManager.ministry_name || "N/A"}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Organization</p>
                    <p className="text-sm font-medium text-gray-900">{viewingManager.organization_name || "N/A"}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Events Created</p>
                    <p className="text-sm font-medium text-gray-900">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-semibold">
                        {viewingManager.events_count} Events
                      </span>
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Manager ID</p>
                    <p className="text-sm font-medium text-gray-900 font-mono">{viewingManager.manager_id}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Created On</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(viewingManager.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3 justify-end">
                {!isEventManager && (
                  <button
                    onClick={() => {
                      setEditingManager(viewingManager);
                      setShowAddModal(true);
                      setViewingManager(null);
                    }}
                    className="px-4 py-2 bg-[#1e4788] text-white rounded-lg hover:bg-[#163761] transition-colors font-medium flex items-center gap-2"
                  >
                    <Edit2 size={16} /> Edit Manager
                  </button>
                )}
                <button
                  onClick={() => setViewingManager(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventManagers;
