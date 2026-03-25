import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { State, City } from "country-state-city";
import { attendEventList } from "../../services/events";
import api from "../../services/axios";
import { saveHotel, getHotelMasterList } from "../../services/hotel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import SearchableSelect from "../../components/common/SearchableSelect";

const requiredString = (message) => z.string().trim().min(1, message);

const dateString = (message) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => {
      const parsed = new Date(value);
      return !Number.isNaN(parsed.getTime());
    }, "Enter a valid date");

const createHotelFormSchema = (isEditMode = false) => {
  return z
    .object({
      eventId: z.string().trim().optional().or(z.literal("")),
      participantType: z.enum(["myself", "delegate"]),
      delegateId: z.string().trim().optional().or(z.literal("")),
      stayStartDate: dateString("Stay start date is required"),
      stayEndDate: dateString("Stay end date is required"),
      stateCode: requiredString("State is required"),
      state: requiredString("State is required"),
      city: requiredString("City is required"),
      hotelId: requiredString("Please select a hotel"),
      hotelName: z.string().trim().optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      if (data.participantType === "delegate") {
        const hasDelegate = data.delegateId && data.delegateId.trim();
        if (!hasDelegate && !isEditMode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please select a delegate",
            path: ["delegateId"],
          });
        }
      }
      // Validate that end date is after start date
      const startDate = new Date(data.stayStartDate);
      const endDate = new Date(data.stayEndDate);
      if (endDate < startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Stay end date must be after start date",
          path: ["stayEndDate"],
        });
      }
      // If "other" is selected, validate hotelName
      if (data.hotelId === "other") {
        if (!data.hotelName || !data.hotelName.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter hotel name",
            path: ["hotelName"],
          });
        }
      }
    });
};

const parseISODate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeDateValue = (date) => {
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDateForInput = (date) => {
  if (!date) return "";
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const getEventId = (event) => {
  if (!event) return "";
  const identifier =
    event?._id ??
    event?.event_id ??
    event?.id ??
    event?.uuid ??
    event?.eventId ??
    null;
  return identifier !== null && identifier !== undefined
    ? String(identifier)
    : "";
};

const getEventStartDate = (event) =>
  event?.start_date ?? event?.startDate ?? event?.start ?? null;

const getEventEndDate = (event) =>
  event?.end_date ?? event?.endDate ?? event?.end ?? null;

const getDelegateId = (delegate) => {
  const identifier =
    delegate?.user_id ??
    delegate?.userId ??
    delegate?.user_uuid ??
    delegate?.userUUID ??
    delegate?.user?._id ??
    delegate?.user?.id ??
    delegate?.user?.user_id ??
    delegate?.user?.userId ??
    delegate?.user?.uuid ??
    delegate?.user?.user_uuid ??
    delegate?.uuid ??
    delegate?._id ??
    delegate?.id ??
    null;
  return identifier !== null && identifier !== undefined
    ? String(identifier)
    : (() => {
        const email = delegate?.email ?? delegate?.user?.email ?? null;
        if (email) {
          return `email:${String(email).toLowerCase()}`;
        }

        const phone =
          delegate?.phone ??
          delegate?.mobile ??
          delegate?.user?.phone ??
          delegate?.user?.mobile ??
          null;
        if (phone) {
          return `phone:${String(phone)}`;
        }

        const firstName = delegate?.first_name ?? delegate?.firstName ?? "";
        const lastName = delegate?.last_name ?? delegate?.lastName ?? "";
        const combinedName = `${firstName} ${lastName}`.trim();
        if (combinedName) {
          return `name:${combinedName.toLowerCase()}`;
        }

        return "";
      })();
};

const getDelegateDisplayName = (delegate) => {
  const fullName =
    `${delegate?.first_name ?? ""} ${delegate?.last_name ?? ""}`.trim();
  if (fullName) return fullName;
  return delegate?.email ?? delegate?.user?.email ?? "Unknown Delegate";
};

const fieldClass = (hasError) =>
  `mt-2 w-full rounded-md border px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:ring-1 ${
    hasError
      ? "border-red-400 focus:ring-red-300"
      : "border-gray-300 focus:ring-[#003366]"
  }`;

const primaryButtonClass = (disabled) =>
  `rounded-md px-8 py-2 text-sm font-medium transition-colors ${
    disabled
      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
      : "bg-[#003366] text-white hover:bg-[#002244]"
  }`;

const HotelDetailsDrawer = ({
  open,
  onClose,
  initialEvent = null,
  onSuccess,
  targetUser = null,
  initialHotel = null,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const normalizedRoleName = (currentUser?.role?.name ?? "").toUpperCase();
  const isDelegateRole = [
    "DELEGATE",
    "HEAD OF DELEGATE",
    "SECURITY OFFICER",
    "INTERPRETER",
    "MEDIA",
    "DEPUTY",
    "DELEGATION CONTACT OFFICER",
    "SPEAKER",
  ].includes(normalizedRoleName);
  const isSuperAdmin = normalizedRoleName === "SUPER ADMIN";
  const canAssignOtherUsers = normalizedRoleName ? !isDelegateRole : false;

  // If targetUser is provided (filling for someone from pending list)
  // force delegate mode - NO "Myself" option for anyone including SUPER ADMIN
  const isFillingForOther = !!targetUser;
  const shouldForceDelegate = isFillingForOther || isSuperAdmin;
  const shouldShowParticipantTypeDropdown =
    canAssignOtherUsers && !shouldForceDelegate;

  const [delegates, setDelegates] = useState([]);
  const [delegateSearch, setDelegateSearch] = useState("");
  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const [delegateLoading, setDelegateLoading] = useState(false);
  const [delegateFetchError, setDelegateFetchError] = useState("");
  const [delegateDropdownOpen, setDelegateDropdownOpen] = useState(false);
  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const delegateInputRef = useRef(null);
  const delegateSelectionRef = useRef(null);
  const previousEventIdRef = useRef("");
  const hotelInitializedRef = useRef(false);
  const isDelegateLocked = !!initialHotel || !!targetUser;
  const isEditingDelegateEntry = initialHotel?.participantType === "delegate";
  const delegateContextActive = shouldForceDelegate || isEditingDelegateEntry;

  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    setValue,
    reset,
    trigger,
    clearErrors,
    setError,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createHotelFormSchema(!!initialHotel)),
    defaultValues: {
      eventId: "",
      participantType: "myself",
      delegateId: "",
      stayStartDate: "",
      stayEndDate: "",
      stateCode: "",
      state: "",
      city: "",
      hotelId: "",
      hotelName: "",
    },
  });

  const participantType = watch("participantType");
  const stayStartDate = watch("stayStartDate");
  const stayEndDate = watch("stayEndDate");
  const stateCode = watch("stateCode");
  const state = watch("state");
  const city = watch("city");
  const hotelId = watch("hotelId");
  const hotelName = watch("hotelName");
  const delegateId = watch("delegateId");

  // Participant options based on context
  const participantOptions = canAssignOtherUsers
    ? [
        { value: "myself", label: "Myself" },
        { value: "delegate", label: "Delegate" },
      ]
    : [{ value: "myself", label: "Myself" }];

  const participantTypeRegister = register("participantType");
  const eventIdRegister = register("eventId");

  const shouldShowEventSelection = !initialEvent;

  // Fetch events for dropdown only if no initialEvent
  const {
    data: eventsResponse = [],
    isLoading: isEventsLoading,
    isError: isEventsError,
  } = useQuery({
    queryKey: ["events", "hotel"],
    queryFn: attendEventList,
    enabled: open && shouldShowEventSelection,
  });

  // Fetch hotel master list
  const {
    data: hotelsResponse = [],
    isLoading: isHotelsLoading,
    isError: isHotelsError,
  } = useQuery({
    queryKey: ["hotels", "master"],
    queryFn: async () => {
      try {
        // Fetch all hotels without pagination limit
        return await getHotelMasterList({ limit: 10000 });
      } catch (error) {
        toast.error("Failed to load hotel list");
        return [];
      }
    },
    enabled: open,
    retry: 2,
  });

  const indiaStates = useMemo(() => State.getStatesOfCountry("IN"), []);

  const getCitiesByState = (stateCode) => {
    if (!stateCode) return [];
    return City.getCitiesOfState("IN", stateCode);
  };

  const citiesForSelectedState = useMemo(() => {
    return getCitiesByState(stateCode);
  }, [stateCode]);

  const hotelOptions = useMemo(() => {
    if (isHotelsError) return [];
    
    // Handle multiple possible response structures
    let hotels = [];
    if (Array.isArray(hotelsResponse?.data)) {
      hotels = hotelsResponse.data;
    } else if (Array.isArray(hotelsResponse?.hotels)) {
      hotels = hotelsResponse.hotels;
    } else if (Array.isArray(hotelsResponse)) {
      hotels = hotelsResponse;
    }

    // Filter hotels by selected city
    if (!city) return [];

    const filtered = hotels.filter((hotel) => {
      const hotelCity = (hotel.city || "").toLowerCase().trim();
      const selectedCity = city.toLowerCase().trim();
      return hotelCity === selectedCity;
    });

    // Log for debugging
    if (filtered.length === 0 && hotels.length > 0) {
      console.log("No hotels found for city:", city);
      console.log("Available hotels:", hotels.map(h => ({ name: h.name, city: h.city })));
    }

    return filtered;
  }, [hotelsResponse, isHotelsError, city]);

  const eventOptions = useMemo(() => {
    const normalized = Array.isArray(eventsResponse)
      ? [...eventsResponse]
      : Array.isArray(eventsResponse?.data)
        ? [...eventsResponse.data]
        : [];

    const appendEventIfMissing = (event) => {
      if (!event) return;
      const presetId = getEventId(event);
      if (
        presetId &&
        !normalized.some((eventOption) => getEventId(eventOption) === presetId)
      ) {
        normalized.push(event);
      }
    };

    appendEventIfMissing(initialEvent);
    appendEventIfMissing(initialHotel?.event);

    return normalized;
  }, [eventsResponse, initialEvent, initialHotel]);

  const selectedEventId = watch("eventId");

  const selectedEvent = useMemo(() => {
    if (shouldShowEventSelection && selectedEventId) {
      return (
        eventOptions.find(
          (eventOption) => getEventId(eventOption) === selectedEventId,
        ) || null
      );
    }
    return initialEvent ?? null;
  }, [selectedEventId, eventOptions, initialEvent, shouldShowEventSelection]);

  const activeEventId = useMemo(() => {
    const eventId = getEventId(selectedEvent);
    return eventId;
  }, [selectedEvent]);

  const normalizedEventStartDate = useMemo(() => {
    const startDate = getEventStartDate(selectedEvent);
    if (!startDate) return null;
    const parsed = new Date(startDate);
    return Number.isNaN(parsed.getTime()) ? null : normalizeDateValue(parsed);
  }, [selectedEvent]);

  const normalizedEventEndDate = useMemo(() => {
    const endDate = getEventEndDate(selectedEvent);
    if (!endDate) return null;
    const parsed = new Date(endDate);
    return Number.isNaN(parsed.getTime()) ? null : normalizeDateValue(parsed);
  }, [selectedEvent]);

  const today = useMemo(() => normalizeDateValue(new Date()), []);

  // Animation handling
  useEffect(() => {
    if (open) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  // Initialize form
  useEffect(() => {
    if (!open) return;

    const fallbackEvent = initialHotel?.event ?? initialEvent ?? null;
    const fallbackEventId = getEventId(fallbackEvent);

    // Determine participant type based on context
    let fallbackParticipantType = "myself";
    if (delegateContextActive) {
      // Filling for someone from pending list (non-SUPER ADMIN)
      fallbackParticipantType = "delegate";
    } else if (canAssignOtherUsers) {
      // Normal flow: use initialHotel value or default
      fallbackParticipantType = initialHotel?.participantType ?? "myself";
    }

    const fallbackDelegateId =
      (canAssignOtherUsers || delegateContextActive) &&
      fallbackParticipantType === "delegate"
        ? (initialHotel?.delegateId ??
          (targetUser?.user_id || targetUser?._id || targetUser?.id || ""))
        : "";
    const fallbackDelegate =
      (canAssignOtherUsers || delegateContextActive) &&
      fallbackParticipantType === "delegate"
        ? (initialHotel?.delegate ?? targetUser ?? null)
        : null;

    // Format dates for input fields (YYYY-MM-DD format)
    const formatDate = (dateValue) => {
      if (!dateValue) return "";
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      return formatDateForInput(date);
    };

    // Find state code from state name
    const allStates = State.getStatesOfCountry("IN");
    const stateName = (initialHotel?.state || "").trim().toLowerCase();
    const stateObj = allStates.find(
      (s) => s?.name.trim().toLowerCase() === stateName,
    );
    const initialStateCode = stateObj?.isoCode ?? "";

    let hotel_type = "master_list";
    if (initialHotel?.hotelId === "other") {
      hotel_type = "manual_entry";
    }

    const resetData = {
      eventId: shouldShowEventSelection
        ? (initialHotel?.eventId ?? fallbackEventId ?? "")
        : (fallbackEventId ?? ""),
      participantType: fallbackParticipantType,
      delegateId: fallbackDelegateId,
      stayStartDate: formatDate(initialHotel?.stayStartDate),
      stayEndDate: formatDate(initialHotel?.stayEndDate),
      stateCode: initialStateCode,
      state: initialHotel?.state ?? "",
      city: initialHotel?.city ?? "",
      hotelId:
        initialHotel?.hotel_type === "manual_entry"
          ? "other"
          : (initialHotel?.hotelId ?? ""),

      hotelName:
        initialHotel?.hotel_type === "manual_entry"
          ? (initialHotel?.hotelName ?? "")
          : "",
    };

    // console.log("🏨 Resetting form with data:", resetData);
    setTimeout(() => trigger("delegateId"), 0);
    reset(resetData);

    clearErrors();
    setDelegates([]);
    setDelegateSearch("");
    setSelectedDelegate(fallbackDelegate);
    setDelegateLoading(false);
    setDelegateFetchError("");
    setDelegateDropdownOpen(false);
    setHotelSuggestions([]);
    previousEventIdRef.current = fallbackEventId ?? "";
    hotelInitializedRef.current = false; // Reset flag when form re-initializes
  }, [
    open,
    initialEvent,
    initialHotel,
    shouldShowEventSelection,
    reset,
    clearErrors,
    canAssignOtherUsers,
    delegateContextActive,
  ]);

  // Re-set hotelId after hotelOptions are loaded (for edit mode) - only once
  useEffect(() => {
    if (!open || !initialHotel?.hotelId) return;
    if (hotelInitializedRef.current) return; // Already initialized, don't reset again

    // console.log("🏨 Checking hotel initialization:", {
    //   city,
    //   hotelOptionsCount: hotelOptions.length,
    //   initialHotelId: initialHotel.hotelId,
    //   hotelOptions: hotelOptions.map((h) => ({
    //     id: h._id || h.id,
    //     name: h.name,
    //   })),
    // });

    // Wait for city to be set and hotelOptions to be populated
    if (city && hotelOptions.length > 0) {
      const hotelExists = hotelOptions.some(
        (hotel) => (hotel._id || hotel.id) === initialHotel.hotelId,
      );

      // console.log("🏨 Hotel exists in options:", hotelExists);

      if (hotelExists) {
        setValue("hotelId", initialHotel.hotelId, { shouldValidate: true });
        hotelInitializedRef.current = true; // Mark as initialized
        // console.log("🏨 Hotel ID set:", initialHotel.hotelId);
      }
    }
  }, [open, initialHotel, city, hotelOptions, setValue]);

  // Fetch delegates when needed
  useEffect(() => {
    if (!open) return;

    // If user cannot assign to others AND not forcing delegate mode, set to myself
    if (!canAssignOtherUsers && !delegateContextActive) {
      if (participantType !== "myself") {
        setValue("participantType", "myself", {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
      if (delegateId) {
        setValue("delegateId", "", {
          shouldValidate: false,
          shouldDirty: false,
        });
        clearErrors("delegateId");
      }
      setDelegates([]);
      setDelegateSearch("");
      setSelectedDelegate(null);
      setDelegateFetchError("");
      setDelegateDropdownOpen(false);
      previousEventIdRef.current = activeEventId ?? "";
      return;
    }

    // If not in delegate mode and not forcing, skip delegate fetch
    if (participantType !== "delegate" && !delegateContextActive) {
      setDelegates([]);
      setDelegateSearch("");
      setSelectedDelegate(null);
      setDelegateFetchError("");
      setDelegateDropdownOpen(false);
      if (delegateId) {
        setValue("delegateId", "", {
          shouldValidate: false,
          shouldDirty: false,
        });
        clearErrors("delegateId");
      }
      previousEventIdRef.current = activeEventId ?? "";
      return;
    }

    if (!activeEventId) {
      setDelegates([]);
      setDelegateFetchError("");
      setSelectedDelegate(null);
      setDelegateDropdownOpen(false);
      setValue("delegateId", "", { shouldValidate: false, shouldDirty: false });
      clearErrors("delegateId");
      previousEventIdRef.current = "";
      return;
    }

    const eventChanged = previousEventIdRef.current !== activeEventId;
    let cancelled = false;

    const fetchDelegates = async () => {
      try {
        setDelegateLoading(true);
        setDelegateFetchError("");
        const isEditMode = !!initialHotel;
        if (eventChanged) {
          setDelegates([]);
          setDelegateSearch("");

          if (!isEditMode && !shouldForceDelegate) {
            setSelectedDelegate(null);
            setValue("delegateId", "", {
              shouldValidate: false,
              shouldDirty: false,
            });
            clearErrors("delegateId");
          }
        }

        // Don't open dropdown if forcing delegate mode (pre-selected)
        if (!delegateContextActive) {
          setDelegateDropdownOpen(true);
        }
        const response = await api.get(`/api/events/${activeEventId}/users`);
        if (cancelled) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setDelegates(list);
        const currentDelegateId = getValues("delegateId");
        if (currentDelegateId) {
          const match = list.find(
            (item) => getDelegateId(item) === currentDelegateId,
          );
          if (match) {
            setSelectedDelegate(match);
          } else {
            const isEditWithDelegate =
              !!initialHotel && !!initialHotel.delegate;
            if (isEditWithDelegate) {
              // In edit mode, fallback to initialHotel.delegate if not found in list
              setSelectedDelegate(initialHotel.delegate);
            } else if (!delegateContextActive && !initialHotel) {
              setDelegateSearch("");
              setSelectedDelegate(null);
              setValue("delegateId", "", {
                shouldValidate: false,
                shouldDirty: false,
              });
              clearErrors("delegateId");
            }
          }
        }
        previousEventIdRef.current = activeEventId;
      } catch (error) {
        if (cancelled) return;
        setDelegates([]);
        const status = error?.response?.status;
        const message =
          error?.response?.data?.message ||
          "Unable to load delegates for this event.";

        if (status === 404) {
          setDelegateFetchError("");
          previousEventIdRef.current = activeEventId;
          return;
        }

        setDelegateFetchError(message);
        toast.error(message);
        previousEventIdRef.current = activeEventId;
      } finally {
        if (!cancelled) {
          setDelegateLoading(false);
        }
      }
    };

    fetchDelegates();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    participantType,
    activeEventId,
    setValue,
    clearErrors,
    delegateId,
    canAssignOtherUsers,
    shouldForceDelegate,
    delegateContextActive,
    initialHotel,
  ]);

  // Hotel name suggestions
  useEffect(() => {
    const hotelName = getValues("hotelName");
    if (!hotelName || hotelName.length < 3) {
      setHotelSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(hotelName)}&limit=5`,
        );
        const data = await res.json();
        setHotelSuggestions(data);
      } catch (err) {
        // Handle error silently
        setHotelSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [watch("hotelName")]);

  // Handle click outside delegate dropdown
  useEffect(() => {
    if (!delegateDropdownOpen) return;

    const handleOutsideInteraction = (event) => {
      if (!delegateSelectionRef.current) return;
      if (!delegateSelectionRef.current.contains(event.target)) {
        setDelegateDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction);

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
    };
  }, [delegateDropdownOpen]);

  // Validate dates are within event range
  useEffect(() => {
    if (!normalizedEventStartDate || !normalizedEventEndDate) return;
    if (!stayStartDate && !stayEndDate) return;

    const eventStart = normalizedEventStartDate;
    // Removed event date restriction validation for hotel stay dates
  }, []);

  const filteredDelegates = useMemo(() => {
    const query = delegateSearch.trim().toLowerCase();
    if (!query) return delegates;
    return delegates.filter((delegate) => {
      const name = getDelegateDisplayName(delegate).toLowerCase();
      const email =
        delegate?.email?.toLowerCase() ??
        delegate?.user?.email?.toLowerCase() ??
        "";
      return name.includes(query) || email.includes(query);
    });
  }, [delegates, delegateSearch]);

  const handleDelegateSelect = (delegate) => {
    const identifier = getDelegateId(delegate);
    if (!identifier) return;
    setSelectedDelegate(delegate);
    setDelegateSearch("");
    setValue("delegateId", identifier, {
      shouldValidate: true,
      shouldDirty: true,
    });
    clearErrors("delegateId");
    setDelegateDropdownOpen(false);
  };

  const handleDelegateChange = () => {
    setSelectedDelegate(null);
    setDelegateSearch("");
    setValue("delegateId", "", { shouldValidate: false, shouldDirty: true });
    clearErrors("delegateId");
    setDelegateDropdownOpen(true);
    setTimeout(() => {
      delegateInputRef.current?.focus();
    }, 0);
  };

  const onSubmit = async (formData) => {
    try {
      setIsSubmitting(true);

      // Removed event date restriction validation for hotel stay dates

      // Determine user_id and for_whom based on participant type
      let userId;
      let forWhom;

      if (
        (canAssignOtherUsers && participantType === "delegate") ||
        shouldForceDelegate
      ) {
        forWhom = "DELEGATE";
        userId = formData.delegateId;
      } else {
        forWhom = "MYSELF";
        // Use targetUser if provided (DAO filling for someone), otherwise current user
        const loggedUserId = currentUser?.user?.id || currentUser?.id;
        userId =
          targetUser?.user_id ||
          targetUser?._id ||
          targetUser?.id ||
          loggedUserId;
      }

      if (!userId) {
        toast.error(
          "Unable to determine user ID. Please try logging in again.",
        );
        setIsSubmitting(false);
        return;
      }

      if (!activeEventId) {
        toast.error("Event not found. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Build JSON payload
      const payload = {
        event_id: activeEventId,
        user_id: userId,
        for_whom: forWhom,
        stay_start_date: formData.stayStartDate,
        stay_end_date: formData.stayEndDate,
        city: formData.city,
        state: formData.state,
      };

      // Always send hotel name
      let selectedHotelName = "";

      // If master hotel selected → find name from hotelOptions
      if (formData.hotelId !== "other") {
        const selectedHotel = hotelOptions.find(
          (hotel) => (hotel._id || hotel.id) === formData.hotelId,
        );

        selectedHotelName = selectedHotel?.name || "";

        payload.hotel_id = formData.hotelId;
        payload.hotel_type = "master_list";
      } else {
        selectedHotelName = formData.hotelName;
        payload.hotel_id = formData.hotelId;
        payload.hotel_type = "manual_entry";
      }

      // Always send hotel_name
      payload.hotel_name = selectedHotelName;

      // If editing existing hotel
      if (initialHotel?.id) {
        payload.hotel_accommodation_id = initialHotel.id;
      }

      await saveHotel(payload);

      queryClient.invalidateQueries(["hotel"]);
      queryClient.invalidateQueries(["events"]);

      // Let parent component handle success toast via onSuccess callback
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save hotel accommodation details";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay - Full screen without gaps */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${
          isAnimating ? "opacity-40" : "opacity-0"
        }`}
        onClick={onClose}
        style={{ margin: 0, padding: 0 }}
      />

      {/* Drawer - Mobile: bottom sheet, Desktop: side drawer */}
      <aside
        className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out overflow-hidden
          left-0 right-0 bottom-0 rounded-t-2xl
          sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
          md:w-[700px] lg:w-[620px]
          ${
            isAnimating
              ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
          }`}
        style={{ top: "64px", maxHeight: "calc(100vh - 64px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
            {initialHotel
              ? "Edit Hotel Accommodation"
              : "Add Hotel Accommodation"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md -mr-1 transition-colors"
            type="button"
          >
            <X size={20} className="sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleFormSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Event <span className="text-red-500">*</span>
              </label>
              {!shouldShowEventSelection && initialEvent ? (
                <input
                  type="text"
                  value={
                    initialEvent?.name ||
                    initialEvent?.event_name ||
                    initialEvent?.title ||
                    "Event"
                  }
                  disabled
                  className="mt-2 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-700 cursor-not-allowed"
                />
              ) : (
                <>
                  <SearchableSelect
                    options={
                      [{ value: "", label: isEventsLoading && eventOptions.length === 0 ? "Loading events..." : isEventsError ? "Unable to load events" : "Select an event" }]
                        .concat(
                          eventOptions.map((eventOption) => ({
                            value: getEventId(eventOption),
                            label: eventOption?.name || eventOption?.event_name || "Unnamed Event",
                          })),
                        )
                    }
                    value={selectedEventId}
                    onChange={(val) => {
                      setValue("eventId", val, { shouldValidate: true, shouldDirty: true });
                    }}
                    className={fieldClass(errors.eventId)}
                    searchable={true}
                    sort={true}
                    disabled={isEventsLoading}
                  />
                  {errors.eventId && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.eventId.message}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Participant Type */}
            {shouldShowParticipantTypeDropdown && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Adding Details For <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={participantOptions}
                  value={participantType}
                  onChange={(val) => setValue("participantType", val, { shouldValidate: true, shouldDirty: true })}
                  className={fieldClass(errors.participantType)}
                  searchable={false}
                  sort={false}
                />
                {errors.participantType && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.participantType.message}
                  </p>
                )}
              </div>
            )}

            {/* Delegate Selection */}
            {((canAssignOtherUsers && participantType === "delegate") ||
              delegateContextActive) && (
              <div ref={delegateSelectionRef}>
                <label className="block text-sm font-medium text-gray-700">
                  Select Delegate <span className="text-red-500">*</span>
                </label>
                {selectedDelegate ? (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-gray-300 px-3 py-2 bg-gray-100">
                    <span className="text-sm">
                      {getDelegateDisplayName(selectedDelegate)}
                    </span>

                    {!isDelegateLocked && (
                      <button
                        type="button"
                        onClick={handleDelegateChange}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Change
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={delegateInputRef}
                      type="text"
                      value={delegateSearch}
                      onChange={(e) => {
                        setDelegateSearch(e.target.value);
                        if (!delegateDropdownOpen)
                          setDelegateDropdownOpen(true);
                      }}
                      onFocus={() => setDelegateDropdownOpen(true)}
                      placeholder={
                        delegateLoading
                          ? "Loading delegates..."
                          : "Search for delegate..."
                      }
                      className={fieldClass(errors.delegateId)}
                      disabled={delegateLoading || !activeEventId}
                    />
                    {delegateDropdownOpen && !delegateLoading && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
                        {filteredDelegates.length > 0 ? (
                          filteredDelegates.map((delegate) => {
                            const id = getDelegateId(delegate);
                            const name = getDelegateDisplayName(delegate);
                            const email =
                              delegate?.email ?? delegate?.user?.email ?? "";
                            return (
                              <div
                                key={id}
                                onClick={() => handleDelegateSelect(delegate)}
                                className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                              >
                                <div className="text-sm font-medium">
                                  {name}
                                </div>
                                {email && (
                                  <div className="text-xs text-gray-500">
                                    {email}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No delegates found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {errors.delegateId && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.delegateId.message}
                  </p>
                )}
                {delegateFetchError && (
                  <p className="mt-1 text-xs text-red-500">
                    {delegateFetchError}
                  </p>
                )}
              </div>
            )}

            {/* Stay Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stay Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("stayStartDate")}
                className={fieldClass(errors.stayStartDate)}
              />
              {errors.stayStartDate && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.stayStartDate.message}
                </p>
              )}
            </div>

            {/* Stay End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stay End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("stayEndDate")}
                min={stayStartDate || undefined}
                className={fieldClass(errors.stayEndDate)}
              />

              {errors.stayEndDate && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.stayEndDate.message}
                </p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                State <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[{ value: "", label: "Select a state" }].concat(
                  indiaStates.map((s) => ({ value: s.isoCode, label: s.name })),
                )}
                value={stateCode}
                onChange={(val) => {
                  const selectedState = indiaStates.find((s) => s.isoCode === val);
                  setValue("stateCode", val, { shouldValidate: true });
                  setValue("state", selectedState?.name || "", { shouldValidate: true });
                  setValue("city", "", { shouldValidate: false });
                  setValue("hotelId", "", { shouldValidate: false });
                }}
                className={fieldClass(errors.stateCode || errors.state)}
                searchable={true}
                sort={true}
              />
              {(errors.stateCode || errors.state) && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.stateCode?.message || errors.state?.message}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={
                  [{ value: "", label: stateCode ? "Select a city" : "Select state first" }]
                    .concat(
                      initialHotel?.city && !citiesForSelectedState.some((c) => c?.name === initialHotel.city)
                        ? [{ value: initialHotel.city, label: initialHotel.city }]
                        : [],
                    )
                    .concat(
                      citiesForSelectedState
                        .filter((c) => c?.name)
                        .map((c) => ({ value: c.name, label: c.name })),
                    )
                }
                value={city || ""}
                onChange={(val) => {
                  setValue("city", val, { shouldValidate: true });
                  setValue("hotelId", "", { shouldValidate: false });
                }}
                disabled={!stateCode}
                className={`${fieldClass(errors.city)} ${!stateCode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                searchable={true}
                sort={true}
              />
              {errors.city && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.city.message}
                </p>
              )}
            </div>

            {/* Hotel Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hotel <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={
                  [{ value: "", label: isHotelsLoading ? "Loading hotels..." : !city ? "Please select city first" : "Select a hotel" }]
                    .concat(
                      hotelOptions.map((hotel) => ({ value: hotel._id || hotel.id, label: hotel?.name || "" })),
                    )
                    .concat([{ value: "other", label: "Other (Enter manually)" }])
                }
                value={hotelId}
                onChange={(val) => {
                  setValue("hotelId", val, { shouldValidate: true });
                  if (val !== "other") {
                    setValue("hotelName", "", { shouldValidate: false });
                    setHotelSuggestions([]);
                  }
                }}
                className={fieldClass(errors.hotelId)}
                disabled={isHotelsLoading || !city}
                searchable={true}
                sort={true}
              />
              {city && !isHotelsLoading && hotelOptions.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No hotels found in {city}
                </p>
              )}
              {errors.hotelId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.hotelId.message}
                </p>
              )}
            </div>

            {/* Manual Hotel Name Input (shown when "Other" is selected) */}
            {hotelId === "other" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hotel Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("hotelName")}
                  placeholder="Search hotel name"
                  className={fieldClass(errors.hotelName)}
                  onChange={(e) => {
                    setValue("hotelName", e.target.value, {
                      shouldValidate: true,
                    });
                  }}
                />
                {hotelSuggestions.length > 0 && (
                  <ul className="border rounded-lg shadow bg-white mt-1 max-h-40 overflow-y-auto">
                    {hotelSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.place_id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setValue("hotelName", suggestion.display_name, {
                            shouldValidate: true,
                          });
                          setHotelSuggestions([]);
                        }}
                      >
                        {suggestion.display_name}
                      </li>
                    ))}
                  </ul>
                )}
                {errors.hotelName && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.hotelName.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-[#0B2F6A] text-white text-sm font-semibold hover:bg-[#092754] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
};

export default HotelDetailsDrawer;
