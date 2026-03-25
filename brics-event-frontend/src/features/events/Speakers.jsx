import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MoreVertical, Plus } from "lucide-react";
import { toast } from "react-toastify";
import PageLoader from "../../components/common/PageLoader";
import { getAllSpeakers } from "../../services/speakers";
import AddSpeakerDrawer from "./AddSpeakerDrawer";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const Speakers = () => {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  /* ================= STATES ================= */
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuSpeakerId, setOpenMenuSpeakerId] = useState(null);
  const [addSpeakerDrawerOpen, setAddSpeakerDrawerOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  /* ================= QUERIES ================= */
  const { data: speakersData, isLoading: speakersLoading } = useQuery({
    queryKey: ["speakers", currentPage, pageSize, searchTerm],
    queryFn: () => getAllSpeakers({
      page: currentPage,
      limit: pageSize,
      search: searchTerm
    }),
  });

  const speakers = speakersData?.speakers || [];
  const pagination = speakersData?.pagination || { total: 0, page: 1, limit: 20, pages: 1 };

  /* ================= FILTER & SEARCH ================= */
  const filteredSpeakers = speakers;

  /* ================= HANDLERS ================= */
  const handleEditSpeaker = (speaker) => {
    setEditingSpeaker(speaker);
    setAddSpeakerDrawerOpen(true);
    setOpenMenuSpeakerId(null);
  };

  const handleAddSpeaker = () => {
    setEditingSpeaker(null);
    setAddSpeakerDrawerOpen(true);
  };

  const handleSpeakerAdded = (newSpeaker, isEdit = false) => {
    // console.log("🔄 SPEAKER LIST UPDATE - Received:", { newSpeaker, isEdit });
    // console.log("🔄 SPEAKER LIST UPDATE - Current state:", { currentPage, pageSize, searchTerm });

    // Invalidate the specific query and all speakers queries
    const exactQueryKey = ["speakers", currentPage, pageSize, searchTerm];
    // console.log("🔄 SPEAKER LIST UPDATE - Invalidating exact query key:", exactQueryKey);

    queryClient.invalidateQueries({
      queryKey: exactQueryKey,
      exact: true
    });

    // Also invalidate all speakers queries as fallback
    queryClient.invalidateQueries({
      queryKey: ["speakers"],
      exact: false
    });

    if (isEdit) {
      toast.success("Speaker updated successfully");
    } else {
      toast.success("Speaker added successfully");
    }
  };

  /* ================= LOADING STATE ================= */
  if (speakersLoading) {
    return <PageLoader />;
  }

  /* ================= JSX ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Speakers</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage event speakers and their details
            </p>
          </div>
          
          {currentUser?.role?.name === "EVENT MANAGER" && (
            <button
              onClick={handleAddSpeaker}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus size={18} />
              Add Speaker
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name, role, or company..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when search changes
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Speakers Table */}
        {filteredSpeakers.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Speaker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Session Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSpeakers.map((speaker) => (
                    <tr
                      key={speaker._id}
                      className="hover:bg-gray-50 transition"
                    >
                      {/* Speaker Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
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
                            <p className="text-sm font-semibold text-gray-900">
                              {speaker?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {speaker?.organisation || speaker?.company}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {speaker?.role}
                        </span>
                      </td>

                      {/* Session Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {speaker?.sessions?.[0]?.session_name || "Not Assigned"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuSpeakerId(
                                openMenuSpeakerId === speaker._id
                                  ? null
                                  : speaker._id
                              )
                            }
                            className="p-1 hover:bg-gray-100 rounded-lg transition"
                          >
                            <MoreVertical size={18} className="text-gray-600" />
                          </button>

                          {/* Dropdown Menu */}
                          {openMenuSpeakerId === speaker._id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              {currentUser?.role?.name === "EVENT MANAGER" && (
                                <button
                                  onClick={() => handleEditSpeaker(speaker)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                  Edit
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
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              {speakers.length === 0
                ? "No speakers added yet"
                : "No speakers match your search"}
            </p>
            {currentUser?.role?.name === "EVENT MANAGER" && (
              <button
                onClick={handleAddSpeaker}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Add First Speaker
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} speakers
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      pagination.page === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Speaker Drawer */}
      <AddSpeakerDrawer
        isOpen={addSpeakerDrawerOpen}
        onClose={() => {
          setAddSpeakerDrawerOpen(false);
          setEditingSpeaker(null);
        }}
        eventId={eventId}
        editingSpeaker={editingSpeaker}
        onSpeakerAdded={handleSpeakerAdded}
      />
    </div>
  );
};

export default Speakers;
