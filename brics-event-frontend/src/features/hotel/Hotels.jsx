import { useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  BedDouble as HotelIcon,
  Plus,
  Search,
  Building2,
} from "lucide-react";
import { toast } from "react-toastify";
import HotelDetailsDrawer from "./HotelDetailsDrawer";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getHotel } from "../../services/hotel";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const formatDateLabel = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getEventName = (event) =>
  event?.name ?? event?.event_name ?? event?.title ?? "Untitled Event";

const HotelCard = ({ hotel, onEdit }) => {
  const { data } = useCurrentUser();

  const badgeClass =
    hotel.for_whom === "delegate"
      ? "bg-blue-100 text-blue-700"
      : "bg-blue-50 text-[#1f4788]";

  // Calculate number of nights
  const calculateNights = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : "-";
  };

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-[1px] border-gray-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {hotel.first_name} {hotel.last_name}
            </h3>
            {/* Country Chip */}
            {hotel.country && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-blue-50 text-[#1f4788]">
                {hotel.country}
              </span>
            )}
            {/* Role Chip */}
            {hotel.event_role && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase bg-blue-50 text-[#1f4788]">
                {hotel.event_role}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 capitalize">
            {hotel.eventName}
          </p>
          {hotel?.position && (
            <span className="text-sm text-gray-500 capitalize">
              {hotel.position}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onEdit(hotel)}
          className="rounded-lg border border-[#003366] px-4 py-1 text-sm font-medium text-[#003366] transition hover:bg-[#003366] hover:text-white"
        >
          Edit
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {/* Hotel Info */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f4788] mb-3">
            Hotel Details
          </p>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[#1f4788]" />
              <span className="font-medium">{hotel.hotelName || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#1f4788]" />
              <span>
                {hotel.city}, {hotel.state}
              </span>
            </div>
          </div>
        </div>

        {/* Stay Duration */}
        <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Check-in
            </p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-emerald-600" />
                <span>{formatDateLabel(hotel.stayStartDate)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
              Check-out
            </p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-orange-500" />
                <span>{formatDateLabel(hotel.stayEndDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Duration Badge */}
        <div className="pt-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
            <HotelIcon size={14} />
            {calculateNights(hotel.stayStartDate, hotel.stayEndDate)}
          </span>
        </div>
      </div>
    </div>
  );
};

const Hotels = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const {
    data: hotelEntries = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-hotels"],
    queryFn: getHotel,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialHotel, setInitialHotel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const viewerUserId = useMemo(() => {
    const candidates = [
      currentUser?.user?.id,
      currentUser?.user?.user_id,
      currentUser?.user?.uuid,
      currentUser?.user?._id,
      currentUser?.id,
      currentUser?.user_id,
      currentUser?._id,
    ];
    const match = candidates.find(
      (value) => value !== undefined && value !== null && value !== "",
    );
    return match ? String(match) : "";
  }, [currentUser]);

  const normalizedHotels = useMemo(() => {
    const rawArray = Array.isArray(hotelEntries)
      ? hotelEntries
      : Array.isArray(hotelEntries?.data)
        ? hotelEntries.data
        : [];

    return rawArray.map((entry) => {
      const raw = entry?.hotel_accommodation ?? entry;
      const eventObj =
        raw?.event ?? entry?.event ?? raw?.user_event?.event ?? null;

      return {
        id: raw?._id ?? entry?._id ?? null,
        eventId: eventObj?._id ?? eventObj?.event_id ?? eventObj?.id ?? null,
        eventName: getEventName(eventObj),
        event: eventObj,
        first_name:
          raw?.user?.first_name ?? currentUser?.user?.first_name ?? "",
        last_name: raw?.user?.last_name ?? currentUser?.user?.last_name ?? "",
        country: raw?.user?.country ?? currentUser?.user?.country ?? "",
        event_role: raw?.user_event?.role ?? entry?.role ?? "",
        position: raw?.user?.position ?? currentUser?.user?.position ?? "",
        for_whom: raw?.for_whom ?? "myself",
        user_id: raw?.user_id ?? raw?.user?._id ?? raw?.user?.id ?? null,
        delegate_user: raw?.user ?? null,
        stayStartDate: raw?.stay_start_date ?? null,
        stayEndDate: raw?.stay_end_date ?? null,
        city: raw?.city ?? "",
        state: raw?.state ?? "",
        hotelId: raw?.hotel_id ?? raw?.hotel?.id ?? null,
        hotelName: raw?.hotel?.name || raw?.hotel_name || "",
        hotelInfo: raw?.hotel ?? null,
        hotel_type: raw?.hotel_type ?? "master_list",
      };
    });
  }, [hotelEntries, currentUser]);

  const filteredHotels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedHotels;

    return normalizedHotels.filter((hotel) => {
      const eventName = hotel.eventName?.toLowerCase() ?? "";
      const city = hotel.city?.toLowerCase() ?? "";
      const state = hotel.state?.toLowerCase() ?? "";
      const hotelName = hotel.hotelName?.toLowerCase() ?? "";

      return (
        eventName.includes(query) ||
        city.includes(query) ||
        state.includes(query) ||
        hotelName.includes(query)
      );
    });
  }, [normalizedHotels, searchQuery]);

  const handleAddNew = () => {
    setInitialHotel(null);
    setDrawerOpen(true);
  };

  const handleEdit = (hotel) => {
    // Transform to drawer format
    const normalizedForWhom = (hotel.for_whom || "myself").trim().toUpperCase();
    const recordUserId = hotel.user_id ? String(hotel.user_id) : "";
    const isOtherUsersRecord =
      recordUserId && viewerUserId && recordUserId !== viewerUserId;
    const isDelegateEntry =
      normalizedForWhom !== "MYSELF" || isOtherUsersRecord;
    const participantType = isDelegateEntry ? "delegate" : "myself";

    // If it was added for someone else, surface their identity for the drawer
    const baseDelegate = isDelegateEntry ? hotel.delegate_user || null : null;
    const fallbackFirstName =
      baseDelegate?.first_name ?? hotel.first_name ?? "";
    const fallbackLastName = baseDelegate?.last_name ?? hotel.last_name ?? "";
    const fallbackEmail =
      baseDelegate?.email ?? baseDelegate?.user?.email ?? "";
    const fallbackIdentifier = (() => {
      if (recordUserId) return recordUserId;
      if (fallbackEmail) return `email:${fallbackEmail.toLowerCase()}`;
      const phoneCandidate =
        baseDelegate?.phone ??
        baseDelegate?.mobile ??
        baseDelegate?.user?.phone ??
        baseDelegate?.user?.mobile ??
        null;
      if (phoneCandidate) return `phone:${String(phoneCandidate)}`;
      const combinedName = `${fallbackFirstName} ${fallbackLastName}`.trim();
      return combinedName ? `name:${combinedName.toLowerCase()}` : "";
    })();

    const delegateId = isDelegateEntry ? fallbackIdentifier : "";
    const delegateData = isDelegateEntry
      ? (baseDelegate ?? {
          email: fallbackEmail,
          first_name: fallbackFirstName,
          id: fallbackIdentifier,
          last_name: fallbackLastName,
          _id: fallbackIdentifier,
          user: {
            email: fallbackEmail,
            first_name: fallbackFirstName,
            last_name: fallbackLastName,
          },
        })
      : null;

    const transformed = {
      id: hotel._id || hotel.id || null,
      eventId: hotel.eventId,
      event: hotel.event,
      stayStartDate: hotel.stayStartDate || "",
      stayEndDate: hotel.stayEndDate || "",
      city: hotel.city || "",
      state: hotel.state || "",
      hotelId: hotel.hotelId || "",
      hotelName: hotel.hotelName || "",
      hotel_type: hotel?.hotel_type || "master_list",
      for_whom: normalizedForWhom,
      participantType: participantType,
      delegateId: delegateId,
      delegate: delegateData,
    };

    setInitialHotel(transformed);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setInitialHotel(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries(["my-hotels"]);
    setDrawerOpen(false);
    setInitialHotel(null);
    toast.success("Hotel accommodation details saved successfully");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#003366]" />
          <p className="mt-4 text-sm text-gray-600">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
        Failed to load hotel accommodation details. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 sm:p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hotel Accommodation
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your hotel bookings and accommodation details
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#003366] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#002244] sm:w-auto"
        >
          <Plus size={18} />
          Add Hotel Details
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by event, city, state, or hotel..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
        />
      </div>

      {/* Hotel Cards */}
      {filteredHotels.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <div className="rounded-full bg-blue-100 p-4">
            <HotelIcon size={32} className="text-[#003366]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {searchQuery ? "No hotels found" : "No hotel accommodation added"}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            {searchQuery
              ? "Try adjusting your search criteria"
              : "Start by adding your hotel accommodation details for upcoming events"}
          </p>
          {!searchQuery && (
            <button
              onClick={handleAddNew}
              className="mt-6 flex items-center gap-2 rounded-lg bg-[#003366] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#002244]"
            >
              <Plus size={18} />
              Add Hotel Details
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredHotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Drawer */}
      <HotelDetailsDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSuccess={handleSuccess}
        initialEvent={initialHotel?.event || null}
        initialHotel={initialHotel}
      />
    </div>
  );
};

export default Hotels;
