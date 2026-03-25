import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useSelector } from "react-redux";
import { Calendar, Clock, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import AccreditationPass from "../../components/ui/AccreditationPass";

const SpeakerDashboard = () => {
  const { data, isLoading: userLoading } = useCurrentUser();
  const firstName = data?.user?.first_name || data?.first_name || "";
  const lastName = data?.user?.last_name || data?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Guest";
  
  const sessions = data?.sessions || [];
  
  // State for menu and pass
  const [menuOpen, setMenuOpen] = useState(null); // Will store session_id
  const [showPass, setShowPass] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  
  // Separate sessions into upcoming and past
  const now = new Date();
  const upcomingSessions = sessions.filter(session => new Date(session.start_datetime) > now);
  const pastSessions = sessions.filter(session => new Date(session.start_datetime) <= now);

  const formatDate = (datetime) => {
    return new Date(datetime).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (datetime) => {
    const date = new Date(datetime);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-container")) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const SessionCard = ({ session, isPast }) => (
    <div className="w-full sm:w-[420px] bg-white rounded-2xl shadow-sm shadow-[rgba(112,111,111,0.1)] hover:shadow-lg transition-all duration-300 p-4 sm:p-6 space-y-3">
      <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium ${
        isPast ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
      }`}>
        {isPast ? 'Past Session' : 'Upcoming Session'}
      </span>

      <h3 className="font-semibold text-[16px] capitalize">{session.session_name}</h3>

      {/* META */}
      <div className="text-sm text-gray-600 space-y-1">
        {/* Date */}
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          {formatDate(session.start_datetime)}
        </div>

        {/* Time */}
        <div className="flex items-center gap-2">
          <Clock size={14} />
          {formatTime(session.start_datetime)} - {formatTime(session.end_datetime)}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2">{session.session_description}</p>

      {/* 3 Dot Dropdown Menu */}
      <div className="flex justify-end pt-2">
        <div className="relative menu-container">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(menuOpen === session.session_id ? null : session.session_id);
            }}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            ⋮
          </button>

          {menuOpen === session.session_id && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border rounded-lg shadow-lg z-[9999]">
              <button
                onClick={() => {
                  setSelectedSession(session);
                  setShowPass(true);
                  setMenuOpen(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-lg"
              >
                Download Pass
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Mobile Header */}
        <h1 className="block sm:hidden text-xl sm:text-2xl font-semibold mt-4">
          Welcome, {fullName}
          <br />
          {data?.user?.role?.name && (
            <span className="inline-block bg-gradient-orange lg:px-3 py-1 rounded-full mt-2 text-sm">
              Role - {data.user.role.name}
            </span>
          )}
        </h1>

        {/* Desktop Header */}
        <h1 className="hidden sm:block text-xl sm:text-2xl font-semibold">
          Dashboard / Sessions
        </h1>

        {/* Sessions Section */}
        <div className="space-y-6">
          {/* Upcoming Sessions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions ({upcomingSessions.length})</h2>
            {upcomingSessions.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.session_id} session={session} isPast={false} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600">No upcoming sessions</p>
              </div>
            )}
          </div>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Sessions ({pastSessions.length})</h2>
              <div className="flex flex-wrap gap-6">
                {pastSessions.map((session) => (
                  <SessionCard key={session.session_id} session={session} isPast={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPass && selectedSession && (
        <AccreditationPass
          userData={data}
          eventData={selectedSession} // Using session data as event data for now
          onClose={() => {
            setShowPass(false);
            setSelectedSession(null);
          }}
        />
      )}
    </>
  );
};

export default SpeakerDashboard;
