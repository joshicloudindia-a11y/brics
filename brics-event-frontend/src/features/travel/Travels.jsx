import { useMemo, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Clock,
  MapPin,
  Plane,
  Plus,
  Search,
} from "lucide-react";
import TravelDetailsDrawer from "./TravelDetailsDrawer";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getTravel } from "../../services/travel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";


// const DEFAULT_TIME_DISPLAY = "--:--";

const normalizeDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const formatDateLabel = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDelegateDisplayName = (delegate) => {
  if (!delegate) return "Delegate";
  const first = delegate?.first_name ?? delegate?.firstName ?? "";
  const last = delegate?.last_name ?? delegate?.lastName ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return delegate?.email ?? delegate?.user?.email ?? "Delegate";
};

const getUserDisplayName = (userData) => {
  if (!userData) return "You";
  const source = userData?.user ?? userData;
  const first = source?.first_name ?? source?.firstName ?? "";
  const last = source?.last_name ?? source?.lastName ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return source?.email ?? "You";
};

const getEventName = (event) =>
  event?.name ?? event?.event_name ?? event?.title ?? "Untitled Event";

const buildLocationLabel = (city, country) => {
  if (city && country) return `${city}, ${country}`;
  return city || country || "-";
};

const TravelCard = ({ travel, onEdit }) => {



  const { data, isLoading } = useCurrentUser();
  const arrivalLocation = buildLocationLabel(
    travel.arrivalPort,
    travel.arrivalCountry,
  );
  const departureLocation = buildLocationLabel(
    travel.departurePort,
    travel.departureCountry,
  );
  const arrivalFlightLabel = travel.arrivalFlight
    ? `Flight: ${travel.arrivalFlight}`
    : "Flight: —";
  const departureFlightLabel = travel.departureFlight
    ? `Flight: ${travel.departureFlight}`
    : "Flight: —";
  const badgeClass =
    travel.badgeLabel === "Delegate"
      ? "bg-blue-100 text-blue-700"
      : "bg-blue-50 text-[#1f4788]";


  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-[1px] border-gray-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {travel.first_name} {travel.last_name}
            </h3>
            {/* Country Chip */}
            {travel.country && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                {travel.country}
              </span>
            )}
            {/* Role Chip */}
            {travel.event_role && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-[#1f4788]">
                {travel.event_role}
              </span>
            )}
            {/* For Whom Badge */}
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass}`}
            >
              {travel.for_whom}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 capitalize">{travel.eventName}</p>
          {travel?.position && (
            <span className="text-sm text-gray-500 capitalize">{travel.position}</span>
          )}
        </div>


        <button
          type="button"
          onClick={() => onEdit(travel)}
          className="rounded-lg border border-[#003366] px-4 py-1 text-sm font-medium text-[#003366] transition hover:bg-[#003366] hover:text-white"
        >
          Edit
        </button>

      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Arrival
          </p>
          <div className="mt-3 space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600" />
              <span>{arrivalLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-emerald-600" />
              <span>{formatDateLabel(travel.arrivalDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Plane size={16} className="text-emerald-600" />
              <span>{arrivalFlightLabel}</span>
            </div>
            
            {/* Connecting Flight Information */}
            {travel.hasConnectingFlight && (
              <>
                <div className="mt-4 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Connecting Flight
                  </p>
                </div>
                {travel.connectingFlightNumber && (
                  <div className="flex items-center gap-2">
                    <Plane size={16} className="text-blue-600" />
                    <span>Flight: {travel.connectingFlightNumber}</span>
                  </div>
                )}
                {travel.connectingPort && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    <span>{travel.connectingPort}</span>
                  </div>
                )}
                {travel.connectingDate && (
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-blue-600" />
                    <span>{formatDateLabel(travel.connectingDate)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
            Departure
          </p>
          <div className="mt-3 space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-orange-500" />
              <span>{departureLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-orange-500" />
              <span>{formatDateLabel(travel.departureDate)}</span>
            </div>
            {/* <div className="flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              <span>{travel.departureTime || DEFAULT_TIME_DISPLAY}</span>
            </div> */}
            <div className="flex items-center gap-2">
              <Plane size={16} className="text-orange-500" />
              <span>{departureFlightLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Travels = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const {
    data: travelEntries = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-travels"],
    queryFn: getTravel,
  });



  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTravel, setEditingTravel] = useState(null);
  const [drawerInitialEvent, setDrawerInitialEvent] = useState(null);
  
  const handleTravelUpdate = () => {
    // Invalidate and refetch the travels list
    queryClient.invalidateQueries({ queryKey: ["my-travels"] });
  };

  const currentUserName = useMemo(
    () => getUserDisplayName(currentUser),
    [currentUser],
  );

  const actionButtonLabel = editingTravel
    ? "Update Travel Details"
    : "Add Travel Details";

  const { upcomingTravels, pastTravels } = useMemo(() => {
    const today = (() => {
      const instance = new Date();
      instance.setHours(0, 0, 0, 0);
      return instance.getTime();
    })();

    const upcoming = [];
    const past = [];

    travelEntries.forEach((entry) => {
      const departureDate = entry.departure?.departure_date ?? "";
      const arrivalTime =
        entry.arrival?.arrivalTime ?? entry.arrival?.time ?? "";
      const departureTime =
        entry.departure?.departureTime ?? entry.departure?.time ?? "";
      const arrivalPort = entry.arrival?.port_of_entry ?? "";
      const arrivalCountry = entry.arrival?.country_from ?? "";
      const arrivalDate = entry.arrival?.arrival_date ?? "";
      const arrivalFlight = entry.arrival?.flight_number ?? "";
      const hasConnectingFlight = entry.arrival?.has_connecting_flight === true || entry.arrival?.has_connecting_flight === "true" || false;
      const connectingFlightNumber = entry.arrival?.connecting_flight?.flight_number ?? "";
      const connectingPort = entry.arrival?.connecting_flight?.port ?? "";
      const connectingDate = entry.arrival?.connecting_flight?.date ?? "";
      const departurePort = entry.departure?.port_of_exit ?? "";
      const departureCountry = entry.departure?.country_to ?? "";
      const departureFlight = entry.departure?.flight_number ?? "";
      const compareTarget = departureDate || arrivalDate;
      const normalizedCompare = normalizeDateValue(compareTarget);
      const compareValue = normalizedCompare?.getTime() ?? null;
      const isPast =
        typeof compareValue === "number" ? compareValue < today : false;

      const participantName =
        entry.participantType === "DELEGATE"
          ? getDelegateDisplayName(entry.delegate)
          : currentUserName;


      const prepared = {
        ...entry,
        participantName,
        badgeLabel: entry.participantType === "delegate" ? "Delegate" : "You",
        eventName: getEventName(entry?.event_id),
        arrivalDate,
        departureDate,
        arrivalTime,
        departureTime,
        arrivalPort,
        arrivalCountry,
        arrivalFlight,
        hasConnectingFlight,
        connectingFlightNumber,
        connectingPort,
        connectingDate,
        departurePort,
        departureCountry,
        departureFlight,
        compareValue,
      };

      if (isPast) past.push(prepared);
      else upcoming.push(prepared);
    });

    upcoming.sort((a, b) => {
      const aValue =
        typeof a.compareValue === "number" ? a.compareValue : Infinity;
      const bValue =
        typeof b.compareValue === "number" ? b.compareValue : Infinity;
      return aValue - bValue;
    });

    past.sort((a, b) => {
      const aValue =
        typeof a.compareValue === "number" ? a.compareValue : -Infinity;
      const bValue =
        typeof b.compareValue === "number" ? b.compareValue : -Infinity;
      return bValue - aValue;
    });

    return { upcomingTravels: upcoming, pastTravels: past };
  }, [travelEntries, currentUserName]);

  const filteredTravels = useMemo(() => {
    const baseList = activeTab === "upcoming" ? upcomingTravels : pastTravels;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return baseList;

    return baseList.filter((travel) => {
      const fields = [
        travel.participantName,
        travel.eventName,
        travel.arrivalPort,
        travel.departurePort,
        travel.country,
        travel.event_role,
      ];
      return fields.some((field) => field?.toLowerCase().includes(query));
    });
  }, [activeTab, searchQuery, upcomingTravels, pastTravels]);

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingTravel(null);
    setDrawerInitialEvent(null);
  };

  const handleAddTravel = () => {
    setEditingTravel(null);
    setDrawerInitialEvent(null);
    setDrawerOpen(true);
  };

  const handleEditTravel = (travel) => {






    
    // Extract event ID - event_id can be an object or string
    const eventIdValue = typeof travel.event_id === 'object' 
      ? (travel.event_id?._id || travel.event_id?.id || "")
      : (travel.event_id || "");
    
    // Format dates to YYYY-MM-DD for date inputs
    const formatDateForInput = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    
    // Determine participant type - must match exactly "myself" or "delegate"
    const isForDelegate = travel.for_whom?.toUpperCase() === "DELEGATE";

    
    const participantTypeValue = isForDelegate ? "delegate" : "myself";

    
    const normalized = {
      eventId: eventIdValue,
      participantType: participantTypeValue,
      delegateId: isForDelegate ? (travel.user_id || "") : "",

      arrival: {
        country: travel.arrival?.country_from || "",
        flightNumber: travel.arrival?.flight_number || "",
        portOfEntry: travel.arrival?.port_of_entry || "",
        arrivalDate: formatDateForInput(travel.arrival?.arrival_date || ""),
        ticketFile: null,
        existingTicketUrl: travel.arrival?.ticket_url || travel.arrival?.arrival_ticket_url || null,
        hasConnectingFlight: travel.arrival?.has_connecting_flight === true || travel.arrival?.has_connecting_flight === "true" || false,
        connectingFlightNumber: travel.arrival?.connecting_flight?.flight_number || "",
        connectingPortOfEntry: travel.arrival?.connecting_flight?.port || "",
        connectingArrivalDate: formatDateForInput(travel.arrival?.connecting_flight?.date || ""),
      },

      departure: {
        flightNumber: travel.departure?.flight_number || "",
        portOfExit: travel.departure?.port_of_exit || "",
        departureDate: formatDateForInput(travel.departure?.departure_date || ""),
        ticketFile: null,
        existingTicketUrl: travel.departure?.ticket_url || travel.departure?.departure_ticket_url || null,
      },

      event: typeof travel.event_id === 'object' ? travel.event_id : (travel.event || null),
      delegate: travel.delegate || null,
    };
    
    setEditingTravel(normalized);
    setDrawerInitialEvent(null); // Don't pass initialEvent when editing so event selection is shown
    setDrawerOpen(true);
  };

  const upcomingCount = upcomingTravels.length;
  const pastCount = pastTravels.length;

  if (isLoading) {
    return <div className="p-10 text-gray-500">Loading travels...</div>;
  }

  if (isError) {
    return <div className="p-10 text-red-500">Failed to load travels</div>;
  }


  if (travelEntries.length === 0) {
    return (
      <div className="flex flex-col">
        <header className="py-6">
          <h1 className="text-[20px] font-semibold text-[#111827]">
            Travel Details
          </h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="flex h-[95px] w-[95px] items-center justify-center rounded-full bg-[#EAF2FF]">
                <Briefcase className="h-[42px] w-[42px] text-[#2563EB]" />
              </div>
              <div className="absolute bottom-1 right-1 flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#2563EB] shadow-md">
                <Plus className="h-[18px] w-[18px] text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[22px] font-semibold text-[#111827]">
                No travel details added
              </p>
              <p className="max-w-md text-[15px] text-[#6B7280]">
                Add arrival and departure information for event participants.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddTravel}
              className="mt-1 inline-flex items-center gap-2 rounded-[8px] bg-[#1E3A8A] px-6 py-[10px] text-[14px] font-medium text-white transition hover:bg-[#172554]"
            >
              Add Travel Details
              <Plus className="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>
        <TravelDetailsDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          initialEvent={drawerInitialEvent}
          initialTravel={editingTravel}
          onSuccess={handleTravelUpdate}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-3 border-b border-gray-100 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">
            Travel Details
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage travel plans for upcoming events.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddTravel}
          className="inline-flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#002244]"
        >
          <Plus size={16} /> {actionButtonLabel}
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="overflow-y-auto rounded-3xl  py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("upcoming")}
                  className={`pb-1 text-sm font-medium transition ${
                    activeTab === "upcoming"
                      ? "text-[#003366]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Upcoming Travel ({upcomingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("past")}
                  className={`pb-1 text-sm font-medium transition ${
                    activeTab === "past"
                      ? "text-[#003366]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Past Travel ({pastCount})
                </button>
              </div>

              <div className="h-6 w-px bg-white/60" aria-hidden="true" />

              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, role, country..."
                  className="w-full rounded-xl border border-white/70 bg-white/80 py-2 pl-10 pr-3 text-sm text-gray-700 placeholder:text-gray-400 shadow-sm focus:border-[#003366] focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
                />
              </div>
            </div>

            {filteredTravels.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/70 bg-white/60 p-6 text-center text-sm text-gray-500">
                <p className="text-base font-semibold text-gray-700">
                  No matches found
                </p>
                <p>Try adjusting your search or switch tabs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 ">
                {filteredTravels.map((travel) => (
                  <TravelCard
                    key={travel.id}
                    travel={travel}
                    onEdit={handleEditTravel}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <TravelDetailsDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        initialEvent={drawerInitialEvent}
        initialTravel={editingTravel}
        onSuccess={handleTravelUpdate}
      />
    </div>
  );
};

export default Travels;
