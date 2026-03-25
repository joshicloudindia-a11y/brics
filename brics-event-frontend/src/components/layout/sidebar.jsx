import {
  LayoutGrid,
  CalendarDays,
  CalendarCheck,
  HelpCircle,
  Plane,
  User,
  X,
  ChevronDown,
  Layers,
  Building2,
  LogOut,
  BedDouble,
  Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { logout } from "../../utils/logout"; // Adjust path as needed

const Sidebar = ({ mobileOpen, onClose }) => {
  const location = useLocation();
  const { data, isLoading } = useCurrentUser();
  const role = data?.role?.name;

  const [eventsOpen, setEventsOpen] = useState(true);

  const normalizedRole = (role ?? "").toLowerCase().trim();
  const isDelegateRole = [
    "delegate",
    "head of delegate",
    "security officer",
    "interpreter",
    "media",
    "deputy",
    "delegation contact officer",
    "speaker",
    "dao",
  ].includes(normalizedRole);
  const isSpeakerRole = normalizedRole === "speaker";
  const isAdminRole =
    normalizedRole === "super admin" || normalizedRole === "event manager";

  /* Auto-open Manage Events when inside events routes */
  useEffect(() => {
    if (location.pathname.startsWith("/admin/events")) {
      setEventsOpen(true);
    }
  }, [location.pathname]);

  const isEventsActive = location.pathname.startsWith("/admin/events");
  const isEventManager = normalizedRole === "event manager";

  const handleLogout = () => {
    onClose();
    logout();
  };

  if (isLoading) return null;

  // ADMIN SIDEBAR for Super Admin / Event Manager
  if (isAdminRole) {
    return (
      <>
        {/* MOBILE OVERLAY */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[90] bg-black/40 md:hidden"
            onClick={onClose}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`
            fixed md:static
            top-0 left-0 bottom-0
            z-[95] md:z-auto
            w-[256px]
            bg-white
            transform transition-transform duration-300
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
            flex flex-col
            max-h-screen
          `}
          style={{ height: "100dvh" }}
        >
          {/* MOBILE HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b md:hidden flex-shrink-0">
            <span className="font-semibold text-gray-800">Menu</span>
            <button onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* NAV */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4 pb-2">
            <div className="space-y-2">
              {/* Dashboard */}
              <NavLink
                to="/admin/dashboard"
                onClick={onClose}
                className={({ isActive }) =>
                  `
                  flex items-center gap-3
                  h-[44px] px-4
                  rounded-[10px]
                  text-sm font-medium
                  transition-all
                  ${
                    isActive
                      ? "bg-[#EEF4FF] text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `
                }
              >
                <LayoutGrid size={18} />
                Dashboard
              </NavLink>

              {/* Profile */}
              <NavLink
                to="/admin/profile"
                onClick={onClose}
                className={({ isActive }) =>
                  `
                  mt-2
                  flex items-center gap-3
                  h-[44px] px-4
                  rounded-[10px]
                  text-sm font-medium
                  transition-all
                  ${
                    isActive
                      ? "bg-[#EEF4FF] text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `
                }
              >
                <User size={18} />
                Profile
              </NavLink>
              {/* CONFERENCE HALL */}
              <NavLink
                to="/admin/conference-halls"
                onClick={onClose}
                className={({ isActive }) =>
                  `
                mt-2
                flex items-center gap-3
                h-[44px] px-4
                rounded-[10px]
                text-sm font-medium
                transition-all
                ${
                  isActive
                    ? "bg-[#EEF4FF] text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `
                }
              >
                <Building2 size={18} />
                Conference Hall
              </NavLink>

              {/* SPEAKERS */}
              <NavLink
                to="/admin/speakers"
                onClick={onClose}
                className={({ isActive }) =>
                  `
                mt-2
                flex items-center gap-3
                h-[44px] px-4
                rounded-[10px]
                text-sm font-medium
                transition-all
                ${
                  isActive
                    ? "bg-[#EEF4FF] text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `
                }
              >
                <Users size={18} />
                Speakers
              </NavLink>
              {/* HOTEL MASTER (VISIBLE FOR SUPER ADMIN & EVENT MANAGER) */}
              <NavLink
                to="/admin/hotel-master"
                onClick={onClose}
                className={({ isActive }) =>
                  `
                    mt-2
                    flex items-center gap-3
                    h-[44px] px-4
                    rounded-[10px]
                    text-sm font-medium
                    transition-all
                    ${
                      isActive
                        ? "bg-[#EEF4FF] text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  `
                }
              >
                <BedDouble size={18} />
                Hotel List
              </NavLink>

              {/* EVENT MANAGERS (VISIBLE ONLY FOR SUPER ADMIN) */}
              {!isEventManager && (
                <NavLink
                  to="/admin/event-managers"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
                  mt-2
                  flex items-center gap-3
                  h-[44px] px-4
                  rounded-[10px]
                  text-sm font-medium
                  transition-all
                  ${
                    isActive
                      ? "bg-[#EEF4FF] text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `
                  }
                >
                  <Layers size={18} />
                  Event Managers
                </NavLink>
              )}

              {/* Manage Events */}
              <button
                type="button"
                onClick={() => setEventsOpen((p) => !p)}
                className={`
                mt-2
                flex items-center gap-3
                h-[44px] w-full px-4
                rounded-[10px]
                text-sm font-medium
                transition-all
                ${
                  isEventsActive
                    ? "bg-[#EEF4FF] text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `}
              >
                <CalendarDays size={18} />
                <span className="flex-1 text-left">Manage Events</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    eventsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* EVENT SUB MENU */}
              {eventsOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-gray-200 space-y-1">
                  {[
                    { to: "/admin/events", label: "All Events" },
                    { to: "/admin/events/upcoming", label: "Upcoming Events" },
                    { to: "/admin/events/drafts", label: "Drafts" },
                    { to: "/admin/events/past", label: "Past Events" },
                  ].map((item) => {
                    const active = location.pathname === item.to;

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={`
                        relative flex items-center
                        h-[40px] px-3
                        rounded-[6px]
                        text-sm font-medium
                        transition-all
                        ${
                          active
                            ? "bg-[#EEF4FF] text-blue-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }
                      `}
                      >
                        {active && (
                          <span className="absolute -left-[18px] w-2 h-2 rounded-full bg-blue-600" />
                        )}
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}

              {/* HELP */}
              <NavLink
                to="/admin/help"
                onClick={onClose}
                className={({ isActive }) =>
                  `
                  mt-2
                  flex items-center gap-3
                  h-[44px] px-4
                  rounded-[10px]
                  text-sm font-medium
                  transition-all
                  ${
                    isActive
                      ? "bg-[#EEF4FF] text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `
                }
              >
                <HelpCircle size={18} />
                Help
              </NavLink>
            </div>
          </div>

          {/* LOGOUT (Mobile Only) - Always Visible at Bottom */}
          <div className="md:hidden border-t border-gray-200 px-3 py-3 bg-white flex-shrink-0">
            <button
              onClick={handleLogout}
              className="
                flex items-center justify-center gap-3
                h-[48px] w-full px-4
                rounded-[10px]
                text-sm font-medium
                text-red-700 bg-red-50 hover:bg-red-100 border border-red-200
                transition-all
              "
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>
      </>
    );
  }

  // NORMAL USER SIDEBAR
  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-lg transition
     ${
       isActive
         ? "bg-blue-100 text-blue-700 font-medium"
         : "text-gray-700 hover:bg-gray-100"
     }`;

  // Hide My Itinerary for super admin and event manager
  const showItinerary = !isAdminRole;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[90] md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static z-[95] top-0 left-0 bottom-0
          w-64 bg-white
          transform transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          flex flex-col
          max-h-screen
        `}
        style={{ height: "100dvh" }}
      >
        <div className="flex justify-between items-center p-4 md:hidden flex-shrink-0">
          <span className="font-semibold">Menu</span>
          <X onClick={onClose} className="cursor-pointer" />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          <div className="space-y-2">
            {/* <NavLink to="/overview" className={navClass} onClick={onClose}>
              <LayoutGrid size={18} /> Overview
            </NavLink> */}

            <NavLink to="/dashboard" className={navClass} onClick={onClose}>
              <CalendarCheck size={18} /> My Events
            </NavLink>

            {/* My Itinerary - visible for non-admin roles */}
            {showItinerary && (
              <NavLink to="/itinerary" className={navClass} onClick={onClose}>
                <CalendarDays size={18} /> My Itinerary
              </NavLink>
            )}

            <NavLink to="/profile" className={navClass} onClick={onClose}>
              <User size={18} /> Profile
            </NavLink>

            {/* DELEGATE-SPECIFIC MENU */}
            {isDelegateRole && (
              <>
                <NavLink to="/travels" className={navClass} onClick={onClose}>
                  <Plane size={18} /> Travel Details
                </NavLink>

                <NavLink to="/hotels" className={navClass} onClick={onClose}>
                  <BedDouble size={18} /> Hotel Accommodation
                </NavLink>
              </>
            )}

            {/* Events only if NOT DELEGATE */}
            {/* {!isDelegateRole && (
              <NavLink to="/events" className={navClass} onClick={onClose}>
                <CalendarDays size={18} /> Events
              </NavLink>
            )} */}

            <NavLink to="/help" className={navClass} onClick={onClose}>
              <HelpCircle size={18} /> Help
            </NavLink>
          </div>
        </div>

        {/* LOGOUT (Mobile Only) - Always Visible at Bottom */}
        <div className="md:hidden border-t border-gray-200 p-3 bg-white flex-shrink-0">
          <button
            onClick={handleLogout}
            className="
              flex items-center justify-center gap-3
              w-full px-4 py-3
              rounded-lg
              text-sm font-medium
              text-red-700 bg-red-50 hover:bg-red-100 border border-red-200
              transition
            "
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
