import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AddManager from "../../assets/images/add_manager.svg";
import AddManagers from "../admin/components/AddManagers";
import Profile from "../profile/profile";
import AccreditationPass from "../../components/ui/AccreditationPass";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useParams } from "react-router-dom";
import { getEventDelegatesWithInviters } from "../../services/events";
import PageLoader from "../../components/common/PageLoader";

const Manager = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedManagerId, setExpandedManagerId] = useState(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [passManager, setPassManager] = useState(null);
  
  const { data: currentUser } = useCurrentUser();
  const { eventId } = useParams();
  
  // Fetch delegates with inviters from API
  const { data: delegatesData, isLoading, error } = useQuery({
    queryKey: ["delegates-with-inviters", eventId],
    queryFn: () => getEventDelegatesWithInviters(eventId),
    enabled: !!eventId,
  });

  // Filter for EVENT MANAGER role_name items
  const managerList = (delegatesData || []).filter((item) => item.dao?.role_name === "EVENT MANAGER");

  const toggleManager = (managerId) => {
    setExpandedManagerId((prev) => (prev === managerId ? null : managerId));
  };

  // Show loader while fetching data
  if (isLoading) {
    return <PageLoader />;
  }

  // Show error message if request fails
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Failed to load managers. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="">
      {managerList.length === 0 ? (
        /* EMPTY STATE */
        <div className="mt-10 flex flex-col items-center space-y-3">
          <img src={AddManager} alt="Add Manager" />
          <h2 className="text-xl font-semibold">Manager not added</h2>
          <p className="text-sm text-gray-400">
            Assign a manager to manage the event.
          </p>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-lg bg-[#1f4788] px-8 py-3 text-sm font-medium text-white hover:bg-[#163766] transition"
          >
            Add Manager
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold">Event Manager's</h2>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="rounded-lg bg-[#1f4788] px-6 sm:px-8 py-2 text-sm font-medium text-white hover:bg-[#163766] transition w-full sm:w-auto"
            >
              Add Manager
            </button>
          </div>
          {managerList.map((item) => {
            const manager = item.dao;
            const delegates = item.delegates || [];
            const managerId = manager.dao_id;

            return (
              <div
                key={managerId}
                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6"
              >
                {/* MANAGER HEADER */}
                <div
                  className="flex flex-col sm:flex-row cursor-pointer items-start sm:items-center justify-between gap-3 sm:gap-0"
                  onClick={() => toggleManager(managerId)}
                >
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    {/* Avatar */}
                    {manager.user?.documents?.photo_url ? (
                      <img
                        src={manager.user.documents.photo_url}
                        alt={manager.name}
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700 flex-shrink-0 uppercase">
                        {manager.first_name?.charAt(0)}{manager.last_name?.charAt(0) || "M"}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <p
                          className="font-semibold text-sm sm:text-base text-[#1B2433] underline cursor-pointer hover:text-[#1f4788] truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedManager(manager);
                            setProfileDrawerOpen(true);
                          }}
                        >
                          {manager.name}
                        </p>
                        <span className="rounded-full bg-green-100 px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs text-green-700 font-medium w-fit">
                          {manager.role_name}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-[#6F7D94] truncate">{manager.email}</p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    {(() => {
                      const isProfileComplete = manager.profile_completion?.percentage >= 63;
                      return (
                        <button
                          disabled={!isProfileComplete}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isProfileComplete) {
                              setPassManager({
                                user: manager.user,
                                role: { name: manager.role_name },
                                profile_completion: manager.profile_completion,
                                event: {
                                  ...item.event,
                                  user_event_id: manager.user_event_id,
                                }
                              });
                              setShowPass(true);
                            }
                          }}
                          className={`flex-1 sm:flex-initial rounded-lg border px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium transition ${
                            isProfileComplete
                              ? "border-[#1f4788] text-[#1f4788] hover:bg-blue-50 cursor-pointer"
                              : "border-gray-300 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          Download Pass
                        </button>
                      );
                    })()}

                    {/* Arrow */}
                    <svg
                      className={`h-5 w-5 transform transition-transform duration-300 ${
                        expandedManagerId === managerId ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* EXPANDABLE SECTION WITH ANIMATION */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedManagerId === managerId ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {delegates.length > 0 && (
                    <>
                      <div className="my-4 border-t border-gray-200" />

                      <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500">
                          {delegates.length} DELEGATE(S) / HEAD OF DELEGATE(S)
                        </p>

                        <button
                          disabled={!delegates.every(d => d.profile_completion?.percentage >= 63)}
                          className={`w-full sm:w-auto rounded-lg border px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium transition ${
                            delegates.every(d => d.profile_completion?.percentage >= 63)
                              ? "border-[#1f4788] text-[#1f4788] hover:bg-blue-50 cursor-pointer"
                              : "border-gray-300 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          Download All Passes
                        </button>
                      </div>

                      <div className="space-y-3 pb-2">
                        {delegates.map((delegate) => (
                          <div
                            key={delegate.user_id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                              {delegate.user?.documents?.photo_url ? (
                                <img
                                  src={delegate.user.documents.photo_url}
                                  alt={delegate.name}
                                  className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-600 flex-shrink-0">
                                  {delegate.name?.charAt(0)}{delegate.name?.split(" ")[1]?.charAt(0)}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <p 
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedManager(delegate);
                                    setProfileDrawerOpen(true);
                                  }}
                                className="text-xs sm:text-sm font-medium text-gray-900 underline cursor-pointer truncate">
                                  {delegate.name}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 sm:items-center">
                                  <p className="text-xs sm:text-sm text-[#6F7D94] truncate">
                                    {delegate.email}
                                  </p>
                                  <span className="text-[10px] sm:text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded w-fit">
                                    {delegate.role_name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button 
                            onClick={() => {
                              if (delegate.profile_completion?.percentage >= 63) {
                                setPassManager({
                                  user: delegate.user,
                                  role: { name: delegate.role_name },
                                  profile_completion: delegate.profile_completion,
                                  event: {
                                    ...item.event,
                                    user_event_id: delegate.user_event_id,
                                  }
                                });
                                setShowPass(true);
                              }
                            }}
                            className={`text-xs sm:text-sm font-medium transition w-full sm:w-auto text-center sm:text-left ${
                              delegate.profile_completion?.percentage >= 63
                                ? "text-[#1f4788] hover:underline cursor-pointer"
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={delegate.profile_completion?.percentage < 63}
                            >
                              Download Pass
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      <AddManagers
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        eventId={eventId}
      />

      {/* Manager Profile Drawer */}
      {profileDrawerOpen && (
        <div className="">
          <div
            className="fixed inset-0 z-40 bg-black/40 p-12"
            onClick={() => setProfileDrawerOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-full flex-col rounded-none bg-white sm:max-w-[520px] sm:rounded-l-xl lg:max-w-[740px] overflow-y-auto">
            {/* Header */}
            <header className="flex items-center justify-between border-b px-4 sm:px-6 py-3 sm:py-4 bg-white sticky top-0 z-10">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Manager Profile
              </h2>
              <button
                onClick={() => setProfileDrawerOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </header>

            {/* Profile Form */}
            <div className="flex-1 overflow-y-auto">
              <Profile 
                userId={selectedManager?.user_id || selectedManager?.user?.id || selectedManager?.id}
                onProfileUpdate={() => setProfileDrawerOpen(false)}
                defaultValues={{
                  title: selectedManager?.user?.title?.toLowerCase() || selectedManager?.title?.toLowerCase(),
                  firstName: selectedManager?.user?.first_name || selectedManager?.first_name,
                  middleName: selectedManager?.user?.middle_name || selectedManager?.middle_name,
                  surname: selectedManager?.user?.last_name || selectedManager?.last_name,
                  country: selectedManager?.user?.country || selectedManager?.country,
                  phoneNumber: selectedManager?.user?.mobile || selectedManager?.mobile,
                  email: selectedManager?.user?.email || selectedManager?.email,
                  position: selectedManager?.user?.position || selectedManager?.position,
                  positionHeldSince: (selectedManager?.user?.position_held_since || selectedManager?.position_held_since)?.split('T')[0],
                  gender: selectedManager?.user?.gender?.toLowerCase() || selectedManager?.gender?.toLowerCase(),
                  photoIdType: selectedManager?.user?.document_type || selectedManager?.document_type,
                  photoIdNumber: selectedManager?.user?.document_number || selectedManager?.document_number,
                  bloodGroup: selectedManager?.user?.blood_group || selectedManager?.blood_group,
                  medicalConditions: selectedManager?.user?.medical_conditions || selectedManager?.medical_conditions,
                  passportType: selectedManager?.user?.passport?.passport_type?.toLowerCase() || selectedManager?.passport?.passport_type?.toLowerCase(),
                  passportNumber: selectedManager?.user?.passport?.passport_number || selectedManager?.passport?.passport_number,
                  placeOfIssue: selectedManager?.user?.passport?.place_of_issue || selectedManager?.passport?.place_of_issue,
                  passportExpiry: (selectedManager?.user?.passport?.expiry_date || selectedManager?.passport?.expiry_date)?.split('T')[0],
                  photoUrl: selectedManager?.user?.documents?.photo_url || selectedManager?.documents?.photo_url,
                  passportDocumentUrl: selectedManager?.user?.documents?.passport_document_url || selectedManager?.documents?.passport_document_url
                }}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Accreditation Pass Modal */}
      {showPass && passManager && (
        <AccreditationPass
          userData={passManager}
          eventData={passManager?.event}
          onClose={() => {
            setShowPass(false);
            setPassManager(null);
          }}
        />
      )}
    </div>
  );
};

export default Manager;
