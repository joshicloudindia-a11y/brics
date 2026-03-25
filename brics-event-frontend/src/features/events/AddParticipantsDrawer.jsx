import { X, ChevronLeft, Upload, User, ChevronUp, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getEventDelegatesWithInviters } from "../../services/events";
import { getAllSpeakers } from "../../services/speakers";
import { addSessionParticipant, removeSessionParticipant } from "../../services/sessions";

const AddParticipantsDrawer = ({ open, onClose, sessionId, eventId, onParticipantsAdded, onParticipantsRemoved, isSelectMode = false, participantType = "speaker", initialSpeakers = [], initialAttendees = [] }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState("speakers");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // User selection state
  const [users, setUsers] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [daoGroups, setDaoGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState(initialSpeakers || []);
  const [selectedAttendees, setSelectedAttendees] = useState(initialAttendees || []);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedDaos, setExpandedDaos] = useState({});

  /* ================= ANIMATION HANDLING ================= */
  useEffect(() => {
    if (open) {
      // console.log('🟡 AddParticipantsDrawer opened:', {
      //   isSelectMode,
      //   participantType,
      //   initialSpeakers,
      //   initialAttendees
      // });
      // Initialize selections from props
      if (isSelectMode) {
        setSelectedSpeakers(initialSpeakers || []);
        setSelectedAttendees(initialAttendees || []);
      } else {
        // In add mode, set activeTab based on participantType
        setActiveTab(participantType === "attendee" ? "attendees" : "speakers");
        // Initialize both selectedSpeakers and selectedAttendees in add mode too
        setSelectedSpeakers(initialSpeakers || []);
        setSelectedAttendees(initialAttendees || []);
      }
      setTimeout(() => setIsAnimating(true), 10);
      // Fetch event users and speakers
      fetchEventUsers();
      fetchSpeakers();
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  // Sync initial selections when they change (works in both select and add modes)
  useEffect(() => {
    if (open) {
      setSelectedSpeakers(initialSpeakers || []);
      setSelectedAttendees(initialAttendees || []);
    }
  }, [initialSpeakers, initialAttendees, open]);

  // Reset selectAll when switching tabs
  useEffect(() => {
    setSelectAll(false);
  }, [activeTab]);

  /* ================= FETCH EVENT USERS ================= */
  const fetchEventUsers = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const data = await getEventDelegatesWithInviters(eventId);
      
      // Parse nested structure: array of { dao, delegates[] }
      const allUsers = [];
      
      if (Array.isArray(data)) {
        data.forEach(group => {
          // Add DAO user
          if (group.dao) {
            allUsers.push({
              ...group.dao,
              _id: group.dao.dao_id || group.dao.user?.id,
              id: group.dao.dao_id || group.dao.user?.id,
              name: group.dao.name,
              email: group.dao.email,
              role: group.dao.role_name,
              role_name: group.dao.role_name,
              avatar: group.dao.user?.documents?.photo_url,
              photo_url: group.dao.user?.documents?.photo_url,
              user_type: group.dao.role_name,
              country: group.dao.user?.country || group.dao.country || ""
            });
          }
          
          // Add all delegates
          if (Array.isArray(group.delegates)) {
            group.delegates.forEach(delegate => {
              allUsers.push({
                ...delegate,
                _id: delegate.user_id || delegate.user?.id,
                id: delegate.user_id || delegate.user?.id,
                name: delegate.name,
                email: delegate.email,
                role: delegate.role_name || delegate.role,
                role_name: delegate.role_name || delegate.role,
                avatar: delegate.user?.documents?.photo_url,
                photo_url: delegate.user?.documents?.photo_url,
                user_type: delegate.role_name || delegate.role,
                country: delegate.user?.country || delegate.country || ""
              });
            });
          }
        });
      }
      
      setUsers(allUsers);
      
      // Create DAO groups structure
      const groupedByDao = [];
      if (Array.isArray(data)) {
        data.forEach(group => {
          const daoEntry = {
            dao: group.dao ? {
              ...group.dao,
              _id: group.dao.dao_id || group.dao.user?.id,
              id: group.dao.dao_id || group.dao.user?.id,
              name: group.dao.name,
              email: group.dao.email,
              role: group.dao.role_name,
              role_name: group.dao.role_name,
              avatar: group.dao.user?.documents?.photo_url,
              photo_url: group.dao.user?.documents?.photo_url,
              user_type: group.dao.role_name,
              country: group.dao.user?.country || group.dao.country || ""
            } : null,
            delegates: Array.isArray(group.delegates) ? group.delegates.map(delegate => ({
              ...delegate,
              _id: delegate.user_id || delegate.user?.id,
              id: delegate.user_id || delegate.user?.id,
              name: delegate.name,
              email: delegate.email,
              role: delegate.role_name || delegate.role,
              role_name: delegate.role_name || delegate.role,
              avatar: delegate.user?.documents?.photo_url,
              photo_url: delegate.user?.documents?.photo_url,
              user_type: delegate.role_name || delegate.role,
              country: delegate.user?.country || delegate.country || ""
            })) : []
          };
          groupedByDao.push(daoEntry);
        });
      }
      setDaoGroups(groupedByDao);
    } catch (error) {
      console.error("Error fetching event users:", error);
      toast.error("Failed to load event participants");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH SPEAKERS ================= */
  const fetchSpeakers = async () => {
    try {
      const data = await getAllSpeakers({ limit: 10000 });
      const speakersArray = Array.isArray(data) ? data : data?.speakers || [];
      
      const formattedSpeakers = speakersArray.map(speaker => ({
        ...speaker,
        _id: speaker.id || speaker._id,
        id: speaker.id || speaker._id,
        name: speaker.name,
        email: speaker.email,
        avatar: speaker.documents?.photo_signed_url || speaker.photo_signed_url,
        photo_url: speaker.documents?.photo_signed_url || speaker.photo_signed_url,
        user_type: "Speaker"
      }));
      
      setSpeakers(formattedSpeakers);
    } catch (error) {
      console.error("Error fetching speakers:", error);
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      resetForm();
    }, 300);
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedFile(null);
    setActiveTab("speakers");
    setSelectAll(false);
    // In add mode, keep the selections; in select mode, reset them
    if (isSelectMode) {
      setSelectedSpeakers([]);
      setSelectedAttendees([]);
    }
  };

  /* ================= SELECTION HANDLERS ================= */
  const toggleDaoExpand = (daoId) => {
    setExpandedDaos(prev => ({
      ...prev,
      [daoId]: !prev[daoId]
    }));
  };

  const handleDaoToggle = (daoId, delegates) => {
    const delegateIds = delegates.map(d => d._id || d.id);
    const allIds = [daoId, ...delegateIds];
    
    // Select based on active tab (works for both SELECT and ADD modes)
    if (activeTab === "speakers") {
      setSelectedSpeakers(prev => {
        const isSelected = allIds.some(id => prev.includes(id));
        if (isSelected) {
          return prev.filter(id => !allIds.includes(id));
        } else {
          // Auto-expand DAO when selecting
          setExpandedDaos(prevExpanded => ({
            ...prevExpanded,
            [daoId]: true
          }));
          return [...new Set([...prev, ...allIds])];
        }
      });
    } else {
      setSelectedAttendees(prev => {
        const isSelected = allIds.some(id => prev.includes(id));
        if (isSelected) {
          return prev.filter(id => !allIds.includes(id));
        } else {
          // Auto-expand DAO when selecting
          setExpandedDaos(prevExpanded => ({
            ...prevExpanded,
            [daoId]: true
          }));
          return [...new Set([...prev, ...allIds])];
        }
      });
    }
  };

  const isDaoSelected = (daoId, delegates) => {
    const delegateIds = delegates.map(d => d._id || d.id);
    const allIds = [daoId, ...delegateIds];
    
    // Check based on active tab (works for both SELECT and ADD modes)
    if (activeTab === "speakers") {
      return allIds.some(id => selectedSpeakers.includes(id));
    } else {
      return allIds.some(id => selectedAttendees.includes(id));
    }
  };

  const handleUserToggle = (userId) => {
    if (activeTab === "speakers") {
      setSelectedSpeakers(prev => {
        if (prev.includes(userId)) {
          return prev.filter(id => id !== userId);
        } else {
          return [...prev, userId];
        }
      });
    } else {
      setSelectedAttendees(prev => {
        if (prev.includes(userId)) {
          return prev.filter(id => id !== userId);
        } else {
          return [...prev, userId];
        }
      });
    }
  };

  const handleSelectAll = () => {
    if (isSelectMode) {
      // In selection mode, select based on active tab
      if (activeTab === "speakers") {
        const filteredUsers = (isSpeakersTab ? [...speakers, ...users] : users).filter(user => {
          const searchLower = searchQuery.toLowerCase();
          const name = user.name || user.full_name || "";
          const email = user.email || "";
          const role = user.role || user.user_type || "";
          return name.toLowerCase().includes(searchLower) || 
                 email.toLowerCase().includes(searchLower) ||
                 role.toLowerCase().includes(searchLower);
        });
        if (selectAll) {
          setSelectedSpeakers([]);
        } else {
          setSelectedSpeakers(filteredUsers.map(u => u._id || u.id));
        }
      } else {
        const visibleIds = [];
        daoGroups.forEach(group => {
          const dao = group.dao;
          const delegates = group.delegates || [];
          if (dao) {
            visibleIds.push(dao._id || dao.id);
          }
          const filteredDelegates = delegates.filter(user => 
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          filteredDelegates.forEach(delegate => {
            visibleIds.push(delegate._id || delegate.id);
          });
        });
        if (selectAll) {
          setSelectedAttendees([]);
        } else {
          setSelectedAttendees([...new Set(visibleIds)]);
        }
      }
    } else {
      // In add mode, update selected speakers/attendees based on active tab
      if (activeTab === "speakers") {
        const filteredUsers = (isSpeakersTab ? [...speakers, ...users] : users).filter(user => {
          const searchLower = searchQuery.toLowerCase();
          const name = user.name || user.full_name || "";
          const email = user.email || "";
          const role = user.role || user.user_type || "";
          return name.toLowerCase().includes(searchLower) || 
                 email.toLowerCase().includes(searchLower) ||
                 role.toLowerCase().includes(searchLower);
        });
        if (selectAll) {
          setSelectedSpeakers([]);
        } else {
          setSelectedSpeakers(filteredUsers.map(u => u._id || u.id));
        }
      } else {
        const visibleIds = [];
        daoGroups.forEach(group => {
          const dao = group.dao;
          const delegates = group.delegates || [];
          if (dao) {
            visibleIds.push(dao._id || dao.id);
          }
          const filteredDelegates = delegates.filter(user => 
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          filteredDelegates.forEach(delegate => {
            visibleIds.push(delegate._id || delegate.id);
          });
        });
        if (selectAll) {
          setSelectedAttendees([]);
        } else {
          setSelectedAttendees([...new Set(visibleIds)]);
        }
      }
    }
    setSelectAll(!selectAll);
  };

  // Filter users based on search and active tab
  // In select mode: show speakers + users for speakers tab, only users for attendees tab
  // In add mode: also use activeTab to allow switching between speakers and attendees
  const isSpeakersTab = activeTab === "speakers";
  
  const filteredUsers = (isSpeakersTab ? [...speakers, ...users] : users).filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const name = user.name || user.full_name || "";
    const email = user.email || "";
    const role = user.role || user.user_type || "";
    
    return name.toLowerCase().includes(searchLower) || 
           email.toLowerCase().includes(searchLower) ||
           role.toLowerCase().includes(searchLower);
  });

  // Calculate visible attendees count for select all display
  const visibleAttendeesCount = daoGroups.reduce((total, group) => {
    const dao = group.dao;
    const delegates = group.delegates || [];
    
    // DAO is always visible if it exists
    let count = dao ? 1 : 0;
    
    // Filter delegates based on search
    const filteredDelegates = delegates.filter(user => 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Add visible delegates
    count += filteredDelegates.length;
    
    return total + count;
  }, 0);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file) => {
    if (!file) return false;

    const allowed = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB

    if (!allowed.includes(file.type)) {
      toast.error("Only CSV and XLS files are allowed");
      return false;
    }

    if (file.size > maxSizeBytes) {
      toast.error("Maximum file size is 2MB");
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    processFile(file);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Handle selection mode (for session creation)
      if (isSelectMode) {
        const totalSelected = selectedSpeakers.length + selectedAttendees.length;
        if (totalSelected === 0 && !selectedFile) {
          toast.error("Please select users or upload a file");
          setSubmitting(false);
          return;
        }

        if (totalSelected > 0) {
          toast.success(
            `${totalSelected} participant${totalSelected > 1 ? "s" : ""} selected! (${selectedSpeakers.length} speaker${selectedSpeakers.length !== 1 ? 's' : ''}, ${selectedAttendees.length} attendee${selectedAttendees.length !== 1 ? 's' : ''})`
          );
          // Call callback with separate speaker and attendee arrays
          if (onParticipantsAdded) {
            onParticipantsAdded(selectedSpeakers, selectedAttendees);
          }
          handleClose();
          return;
        }
      }

      // Validate selected users for add mode
      // Use selectedSpeakers for speaker adds, selectedAttendees for attendee adds
      const selectedUserIds = participantType === 'speaker' 
        ? selectedSpeakers 
        : selectedAttendees;
      
      if (selectedUserIds.length === 0 && !selectedFile) {
        toast.error("Please select users or upload a file");
        setSubmitting(false);
        return;
      }

      // Handle add mode (for adding to existing session)
      if (selectedUserIds.length > 0 && sessionId) {
        // Calculate what was ADDED and REMOVED
        const initialIds = participantType === 'speaker' ? initialSpeakers : initialAttendees;
        const newlyAddedIds = selectedUserIds.filter(id => !initialIds.includes(id));
        const removedIds = initialIds.filter(id => !selectedUserIds.includes(id));
        
        // If no changes, show message and close
        if (newlyAddedIds.length === 0 && removedIds.length === 0) {
          toast.info("No changes made");
          handleClose();
          return;
        }
        
        let addedCount = 0;
        let removedCount = 0;
        
        try {
          // Remove participants
          if (removedIds.length > 0) {
            for (const userId of removedIds) {
              try {
                await removeSessionParticipant(sessionId, userId);
                removedCount++;
              } catch (err) {
                console.error(`Failed to remove participant ${userId}:`, err);
              }
            }
            // Call callback with removed user IDs for optimistic update
            if (onParticipantsRemoved && removedCount > 0) {
              onParticipantsRemoved(removedIds, participantType);
            }
          }
          
          // Add new participants
          if (newlyAddedIds.length > 0) {
            // Get the selected user objects for optimistic update (only new ones)
            let selectedUserObjects = users.filter(u => newlyAddedIds.includes(u._id || u.id));
            
            // For speakers, also include speakers from speakers list
            if (participantType === 'speaker') {
              speakers.forEach(speaker => {
                const speakerId = speaker._id || speaker.id;
                if (newlyAddedIds.includes(speakerId) && !selectedUserObjects.find(u => (u._id || u.id) === speakerId)) {
                  selectedUserObjects.push(speaker);
                }
              });
            }
            
            // For attendees, also include DAOs and delegates
            if (participantType === 'attendee') {
              daoGroups.forEach(group => {
                const dao = group.dao;
                const delegates = group.delegates || [];
                const daoId = dao?._id || dao?.id;
                if (newlyAddedIds.includes(daoId)) {
                  selectedUserObjects.push(dao);
                }
                delegates.forEach(delegate => {
                  const delegateId = delegate._id || delegate.id;
                  if (newlyAddedIds.includes(delegateId)) {
                    selectedUserObjects.push(delegate);
                  }
                });
              });
            }
            
            const response = await addSessionParticipant(sessionId, {
              user_ids: newlyAddedIds,
              participant_type: participantType || 'attendee'
            });

            if (response) {
              addedCount = response.added_count || newlyAddedIds.length;
              
              // Deduplicate selected user objects before optimistic update
              const seen = new Set();
              const dedupedSelectedUserObjects = [];
              selectedUserObjects.forEach((u) => {
                const id = u._id || u.id || u.user_id;
                if (!id) return;
                if (!seen.has(id)) {
                  seen.add(id);
                  dedupedSelectedUserObjects.push(u);
                }
              });
              // Call callback with deduplicated user objects for optimistic update
              if (onParticipantsAdded) {
                onParticipantsAdded(dedupedSelectedUserObjects);
              }
            }
          }
          
          // Show success message
          const messages = [];
          if (addedCount > 0) {
            messages.push(`${addedCount} ${participantType === 'speaker' ? "Speaker" : "Attendee"}${addedCount > 1 ? "s" : ""} added`);
          }
          if (removedCount > 0) {
            messages.push(`${removedCount} ${participantType === 'speaker' ? "Speaker" : "Attendee"}${removedCount > 1 ? "s" : ""} removed`);
          }
          
          if (messages.length > 0) {
            toast.success(messages.join(" and ") + " successfully!");
          }
          
          handleClose();
        } catch (err) {
          console.error("Error updating participants:", err);
          toast.error("Failed to update participants");
        }
      }

      // Handle file submission (for later implementation)
      if (selectedFile) {
        toast.info("File upload feature coming soon");
      }
    } catch (err) {
      console.error("Error with participants:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to process participants";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {open && (
        <>
          {/* Overlay */}
          <div
            className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[202] transition-opacity duration-300 ${
              isAnimating ? "opacity-40" : "opacity-0"
            }`}
            onClick={handleClose}
            style={{ margin: 0, padding: 0 }}
          />

          {/* Drawer */}
          <aside
            className={`fixed z-[203] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
              left-0 right-0 bottom-0 rounded-t-2xl
              sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
              md:w-[500px]
              ${
                isAnimating
                  ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
                  : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
              }`}
            style={{ top: "64px", maxHeight: "calc(100vh - 64px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-100 rounded-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
                  Add Participants
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-4 sm:px-6">
              <button
                onClick={() => setActiveTab("speakers")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "speakers"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Speakers
              </button>
              <button
                onClick={() => setActiveTab("attendees")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "attendees"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Attendees
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder={`Search ${activeTab === "speakers" ? "Speakers" : "Attendees"}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Select All */}
              {/* Select All - Show only for correct view */}
              {activeTab === "speakers" ? (
                // For Speakers - show if flat users list has items
                filteredUsers.length > 0 && (
                  <div className="mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      {`${selectedSpeakers.length} of ${filteredUsers.length} selected`}
                    </span>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectAll ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                )
              ) : (
                // For Attendees - show if DAO groups exist
                daoGroups.length > 0 && (
                  <div className="mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      {`${selectedAttendees.length} of ${visibleAttendeesCount} selected`}
                    </span>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectAll ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                )
              )}

              {/* Users List */}
              {/* Show hierarchical DAO/delegates only for Attendees tab */}
              {activeTab === "attendees" ? (
                // DAO GROUPS VIEW FOR ATTENDEES
                <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading participants...</p>
                  </div>
                ) : daoGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {searchQuery ? "No participants found" : "No participants available"}
                    </p>
                  </div>
                ) : (
                  daoGroups.map((group) => {
                    const dao = group.dao;
                    const delegates = group.delegates || [];
                    const daoId = dao?._id || dao?.id;
                    const isExpanded = expandedDaos[daoId];
                    const isDaoSel = isDaoSelected(daoId, delegates);
                    
                    // Filter delegates based on search
                    const filteredDelegates = delegates.filter(user => 
                      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    return (
                      <div key={daoId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* DAO Header */}
                        {dao && (
                          <div className={`p-3 flex items-center gap-3 cursor-pointer transition-all ${isDaoSel ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"}`}>
                            {/* Checkbox */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDaoToggle(daoId, delegates);
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isDaoSel
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {isDaoSel && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold flex-shrink-0">
                              {dao.photo_url || dao.avatar ? (
                                <img
                                  src={dao.photo_url || dao.avatar}
                                  alt={dao.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                (dao.name || "D").charAt(0).toUpperCase()
                              )}
                            </div>

                            {/* DAO Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {dao.name} <span className="text-xs text-gray-500 font-normal">({delegates.length} delegates)</span>
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {dao.role || dao.user_type}
                              </p>
                              {dao.country && (
                                <p className="text-xs text-gray-400 truncate">
                                  {dao.country}
                                </p>
                              )}
                            </div>

                            {/* Expand/Collapse */}
                            {delegates.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDaoExpand(daoId);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Delegates List */}
                        {isExpanded && delegates.length > 0 && (
                          <div className="bg-gray-50 border-t border-gray-200 space-y-0">
                            {filteredDelegates.map((delegate) => {
                              const delegateId = delegate._id || delegate.id;
                              const isSelected = activeTab === "speakers" 
                                ? selectedSpeakers.includes(delegateId)
                                : selectedAttendees.includes(delegateId);
                              
                              return (
                                <div
                                  key={delegateId}
                                  onClick={() => handleUserToggle(delegateId)}
                                  className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-blue-50"
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                      isSelected
                                        ? "bg-blue-600 border-blue-600"
                                        : "border-gray-300 bg-white"
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path d="M5 13l4 4L19 7"></path>
                                      </svg>
                                    )}
                                  </div>

                                  {/* Avatar */}
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                                    {delegate.photo_url || delegate.avatar ? (
                                      <img
                                        src={delegate.photo_url || delegate.avatar}
                                        alt={delegate.name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      (delegate.name || "U").charAt(0).toUpperCase()
                                    )}
                                  </div>

                                  {/* User Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {delegate.name || "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {delegate.role || delegate.user_type}
                                    </p>
                                    {delegate.country && (
                                      <p className="text-xs text-gray-400 truncate">
                                        {delegate.country}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              ) : (
                // FLAT USERS LIST FOR SPEAKERS
                <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading participants...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {searchQuery ? "No participants found" : "No participants available"}
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const userId = user._id || user.id;
                    const isSelected = activeTab === "speakers" 
                      ? selectedSpeakers.includes(userId)
                      : selectedAttendees.includes(userId);
                    
                    return (
                      <div
                        key={userId}
                        onClick={() => handleUserToggle(userId)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                          {user.profile_pic || user.avatar ? (
                            <img
                              src={user.profile_pic || user.avatar}
                              alt={user.name || user.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            (user.name || user.full_name || "U").charAt(0).toUpperCase()
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.name || user.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.role || user.user_type || user.email}
                          </p>
                          {user.country && (
                            <p className="text-xs text-gray-400 truncate">
                              {user.country}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              )}

              {/* Or Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              {/* File Upload */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragActive
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    Choose a file or drag and drop it here.
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    CSV, XLS formats up to 2 MB.
                  </p>
                  <label className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer text-sm font-medium">
                    Browse File
                    <input
                      type="file"
                      hidden
                      accept=".csv,.xls,.xlsx"
                      onChange={handleFileChange}
                    />
                  </label>
                  {selectedFile && (
                    <p className="mt-3 text-sm text-gray-700">
                      Selected: <span className="font-medium">{selectedFile.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 bg-gray-50">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (isSelectMode 
                  ? (selectedSpeakers.length === 0 && selectedAttendees.length === 0 && !selectedFile)
                  : (participantType === 'speaker' ? selectedSpeakers.length === 0 : selectedAttendees.length === 0) && !selectedFile)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition text-sm font-medium"
              >
                {submitting
                  ? isSelectMode ? "Selecting..." : "Adding..."
                  : isSelectMode
                    ? `Select (${selectedSpeakers.length + selectedAttendees.length})`
                    : `Add ${participantType === "speaker" ? "Speaker" : "Attendee"}${
                        (participantType === "speaker" ? selectedSpeakers.length : selectedAttendees.length) > 0 
                          ? ` (${participantType === "speaker" ? selectedSpeakers.length : selectedAttendees.length})` 
                          : ""
                      }`}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default AddParticipantsDrawer;
