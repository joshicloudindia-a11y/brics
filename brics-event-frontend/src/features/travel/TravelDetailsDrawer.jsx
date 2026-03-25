import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Upload, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import { ALL_INDIAN_AIRPORTS } from "../../constants/airports";
import { countries as COUNTRY_OPTIONS } from "../../constants/eventCategories";
import { attendEventList, getEvents } from "../../services/events";
import api from "../../services/axios";
import { saveTravel } from "../../services/travel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import SearchableSelect from "../../components/common/SearchableSelect";

const ACCEPTED_TICKET_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
]);
const MAX_TICKET_SIZE_BYTES = 5 * 1024 * 1024;

const stepLabels = [
  { id: 1, name: "Arrival Details" },
  { id: 2, name: "Departure Details" },
];

const createArrivalDefaults = () => ({
  country: "",
  flightNumber: "",
  portOfEntry: "",
  arrivalDate: "",
  ticketFile: null,
  existingTicketUrl: null,
  hasConnectingFlight: false,
  connectingFlightNumber: "",
  connectingPortOfEntry: "",
  connectingArrivalDate: "",
});

const createDepartureDefaults = () => ({
  flightNumber: "",
  portOfExit: "",
  departureDate: "",
  ticketFile: null,
  existingTicketUrl: null,
});

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

const optionalString = () =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string(),
  );

const optionalDateString = (message) =>
  z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : ""),
      z.string(),
    )
    .superRefine((value, ctx) => {
      if (!value) return;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
        });
      }
    });

const travelFormSchema = z
  .object({
    eventId: requiredString("Please select an event"),
    participantType: z.enum(["myself", "delegate"]),
    delegateId: z.string().trim().optional().or(z.literal("")),
    arrival: z.object({
      country: requiredString("Country is required"),
      flightNumber: requiredString("Flight number is required"),
      portOfEntry: requiredString("Port of entry is required"),
      arrivalDate: dateString("Arrival date is required"),
      ticketFile: z.any().nullable().optional(),
      existingTicketUrl: z.string().nullable().optional(),
      hasConnectingFlight: z.boolean().optional(),
      connectingFlightNumber: optionalString(),
      connectingPortOfEntry: optionalString(),
      connectingArrivalDate: optionalDateString("Enter a valid date"),
    }),
    departure: z.object({
      flightNumber: optionalString(),
      portOfExit: optionalString(),
      departureDate: optionalDateString("Enter a valid date"),
      ticketFile: z.any().nullable().optional(),
      existingTicketUrl: z.string().nullable().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.participantType === "delegate") {
      if (!data.delegateId || !data.delegateId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select a delegate",
          path: ["delegateId"],
        });
      }
    }
  });

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
  `mt-2 w-full rounded-md border px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:ring-1 ${hasError
    ? "border-red-400 focus:ring-red-300"
    : "border-gray-300 focus:ring-[var(--color-primary-blue)]"
  }`;

const primaryButtonClass = (disabled) =>
  `rounded-md px-8 py-2 text-sm font-medium transition-colors ${disabled
    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
    : "bg-[var(--color-primary-blue)] text-white hover:bg-[var(--color-primary-blue-dark)]"
  }`;

const generateClientId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `travel-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const TravelDetailsDrawer = ({
  open,
  onClose,
  initialEvent = null,
  onSave = () => { },
  initialTravel = null,
  onSuccess,
  targetUser = null, // User for whom travel details are being added
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const { data: currentUser } = useCurrentUser();
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
  const canAssignOtherUsers = normalizedRoleName ? !isDelegateRole : false;

  const [activeDropzone, setActiveDropzone] = useState({
    arrivalTicket: false,
    departureTicket: false,
  });
  const [delegates, setDelegates] = useState([]);
  const [delegateSearch, setDelegateSearch] = useState("");
  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const [delegateLoading, setDelegateLoading] = useState(false);
  const [delegateFetchError, setDelegateFetchError] = useState("");
  const [delegateDropdownOpen, setDelegateDropdownOpen] = useState(false);
  const delegateInputRef = useRef(null);
  const delegateSelectionRef = useRef(null);
  const previousEventIdRef = useRef("");

  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    setValue,
    reset,
    trigger,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(travelFormSchema),
    defaultValues: {
      eventId: "",
      participantType: "myself",
      delegateId: "",
      arrival: createArrivalDefaults(),
      departure: createDepartureDefaults(),
    },
  });

  const shouldShowEventSelection = !initialEvent;

  const selectedEventId = watch("eventId");
  const participantType = watch("participantType");
  const arrivalCountryValue = watch("arrival.country");
  const arrivalFlightValue = watch("arrival.flightNumber");
  const arrivalPortValue = watch("arrival.portOfEntry");
  const arrivalDateValue = watch("arrival.arrivalDate");
  const arrivalTicketFile = watch("arrival.ticketFile");
  const arrivalExistingTicketUrl = watch("arrival.existingTicketUrl");
  const hasConnectingFlight = watch("arrival.hasConnectingFlight");
  const connectingFlightNumber = watch("arrival.connectingFlightNumber");
  const connectingPortOfEntry = watch("arrival.connectingPortOfEntry");
  const connectingArrivalDate = watch("arrival.connectingArrivalDate");
  const departureFlightValue = watch("departure.flightNumber");
  const departurePortValue = watch("departure.portOfExit");
  const departureDateValue = watch("departure.departureDate");
  const departureTicketFile = watch("departure.ticketFile");
  const departureExistingTicketUrl = watch("departure.existingTicketUrl");
  const delegateId = watch("delegateId");
  const participantOptions = canAssignOtherUsers
    ? [
      { value: "myself", label: "Myself" },
      { value: "delegate", label: "Delegate" },
    ]
    : [{ value: "myself", label: "Myself" }];

  const eventIdRegister = register("eventId");
  const participantTypeRegister = register("participantType");
  const arrivalCountryRegister = register("arrival.country");
  const arrivalFlightRegister = register("arrival.flightNumber");
  const arrivalPortRegister = register("arrival.portOfEntry");
  const arrivalDateRegister = register("arrival.arrivalDate");
  const connectingFlightRegister = register("arrival.connectingFlightNumber");
  const connectingPortRegister = register("arrival.connectingPortOfEntry");
  const connectingDateRegister = register("arrival.connectingArrivalDate");
  const departureFlightRegister = register("departure.flightNumber");
  const departurePortRegister = register("departure.portOfExit");
  const departureDateRegister = register("departure.departureDate");

  const {
    data: eventsResponse = [],
    isLoading: isEventsLoading,
    isError: isEventsError,
  } = useQuery({
    queryKey: ["events", "travel"],
    queryFn: attendEventList,
    enabled: open && shouldShowEventSelection,
  });

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
    appendEventIfMissing(initialTravel?.event);

    return normalized;
  }, [eventsResponse, initialEvent, initialTravel]);

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

  const activeEventId = useMemo(
    () => getEventId(selectedEvent),
    [selectedEvent],
  );

  const normalizedEventEndDate = useMemo(() => {
    const endDate = getEventEndDate(selectedEvent);
    if (!endDate) return null;
    const parsed = new Date(endDate);
    return Number.isNaN(parsed.getTime()) ? null : normalizeDateValue(parsed);
  }, [selectedEvent]);

  const today = useMemo(() => normalizeDateValue(new Date()), []);

  const assignedSessions = useMemo(() => {
    if (!currentUser) return [];
    const roleName = (
      currentUser?.role?.name ?? currentUser?.user?.role?.name ?? ""
    ).toUpperCase();
    if (roleName !== "SPEAKER") return [];

    const raw =
      Array.isArray(currentUser.sessions) && currentUser.sessions.length
        ? currentUser.sessions
        : Array.isArray(currentUser.user?.sessions) && currentUser.user.sessions.length
        ? currentUser.user.sessions
        : Array.isArray(currentUser?.sessions?.data) && currentUser.sessions.data.length
        ? currentUser.sessions.data
        : [];

    return raw.map((s, idx) => {
      const id =
        s?.session_id ?? s?.id ?? s?.sessionId ?? s?.session?.session_id ?? `assigned-${idx}`;
      const name =
        s?.session_name ?? s?.name ?? s?.sessionName ?? s?.session?.name ?? "";
      return { session_id: id, session_name: name, _raw: s };
    });
  }, [currentUser]);

  useEffect(() => {
    try {
      // console.debug("TravelDetailsDrawer: normalizedRoleName=", normalizedRoleName);
      // console.debug("TravelDetailsDrawer: currentUser=", currentUser);
      // console.debug("TravelDetailsDrawer: assignedSessions=", assignedSessions);
    } catch (e) {
      /* ignore logging errors */
    }
  }, [normalizedRoleName, currentUser, assignedSessions]);

  /* ================= ANIMATION HANDLING ================= */
  useEffect(() => {
    if (open) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const defaultArrival = createArrivalDefaults();
    const defaultDeparture = createDepartureDefaults();
    const fallbackEvent = initialTravel?.event ?? initialEvent ?? null;
    const fallbackEventId = getEventId(fallbackEvent);
    const fallbackParticipantType = canAssignOtherUsers
      ? (initialTravel?.participantType ?? "myself")
      : "myself";
    const fallbackDelegateId =
      canAssignOtherUsers && fallbackParticipantType === "delegate"
        ? (initialTravel?.delegateId ?? "")
        : "";
    const fallbackDelegate =
      canAssignOtherUsers && fallbackParticipantType === "delegate"
        ? (initialTravel?.delegate ?? null)
        : null;

    const arrivalData = {
      ...defaultArrival,
      ...(initialTravel?.arrival ?? {}),
    };

    const departureData = {
      ...defaultDeparture,
      ...(initialTravel?.departure ?? {}),
    };

    setCurrentStep(1);
    setActiveDropzone({ arrivalTicket: false, departureTicket: false });
    reset({
      eventId: shouldShowEventSelection
        ? (initialTravel?.eventId ?? fallbackEventId ?? "")
        : (fallbackEventId ?? ""),
      participantType: fallbackParticipantType,
      delegateId: fallbackDelegateId,
      arrival: arrivalData,
      departure: departureData,
    });
    clearErrors();
    setDelegates([]);
    setDelegateSearch("");
    setSelectedDelegate(fallbackDelegate);
    setDelegateLoading(false);
    setDelegateFetchError("");
    setDelegateDropdownOpen(false);
    previousEventIdRef.current = fallbackEventId ?? "";
  }, [
    open,
    initialEvent,
    initialTravel,
    shouldShowEventSelection,
    reset,
    clearErrors,
    canAssignOtherUsers,
  ]);

  useEffect(() => {
    if (shouldShowEventSelection && isEventsError) {
      toast.error("Failed to load events");
    }
  }, [shouldShowEventSelection, isEventsError]);

  useEffect(() => {
    if (!open) return;

    if (!canAssignOtherUsers) {
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

    if (participantType !== "delegate") {
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
        if (eventChanged) {
          setDelegates([]);
          setDelegateSearch("");
          setSelectedDelegate(null);
          setValue("delegateId", "", {
            shouldValidate: false,
            shouldDirty: false,
          });
          clearErrors("delegateId");
        }
        setDelegateDropdownOpen(true);
        const response = await api.get(`/api/events/${activeEventId}/users`);
        if (cancelled) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setDelegates(list);
        const currentDelegateId = delegateId;
        if (currentDelegateId) {
          const match = list.find(
            (item) => getDelegateId(item) === currentDelegateId,
          );
          if (match) {
            setSelectedDelegate(match);
          } else {
            setDelegateSearch("");
            setSelectedDelegate(null);
            setValue("delegateId", "", {
              shouldValidate: false,
              shouldDirty: false,
            });
            clearErrors("delegateId");
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
  ]);

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

  const normalizedArrivalDate = useMemo(() => {
    if (!arrivalDateValue) return null;
    const parsed = parseISODate(arrivalDateValue);
    return parsed ? normalizeDateValue(parsed) : null;
  }, [arrivalDateValue]);

  const normalizedDepartureDate = useMemo(() => {
    if (!departureDateValue) return null;
    const parsed = parseISODate(departureDateValue);
    return parsed ? normalizeDateValue(parsed) : null;
  }, [departureDateValue]);

  const normalizedConnectingArrivalDate = useMemo(() => {
    if (!connectingArrivalDate) return null;
    const parsed = parseISODate(connectingArrivalDate);
    return parsed ? normalizeDateValue(parsed) : null;
  }, [connectingArrivalDate]);

  const isArrivalStepComplete = useMemo(() => {
    const hasCountry = Boolean(arrivalCountryValue?.trim?.());
    const hasFlight = Boolean(arrivalFlightValue?.trim?.());
    const hasPort = Boolean(arrivalPortValue?.trim?.());
    const hasEssentials = hasCountry && hasFlight && hasPort;

    if (!hasEssentials) return false;

    if (!normalizedArrivalDate) return false;

    return true;
  }, [
    arrivalCountryValue,
    arrivalFlightValue,
    arrivalPortValue,
    normalizedArrivalDate,
  ]);

  const isDepartureStepComplete = useMemo(() => {
    const hasFlight = Boolean(departureFlightValue?.trim?.());
    const hasPort = Boolean(departurePortValue?.trim?.());
    const hasDate = Boolean(departureDateValue?.trim?.());

    if (!hasFlight && !hasPort && !hasDate) {
      return true;
    }

    if (hasDate) {
      if (!normalizedDepartureDate) {
        return false;
      }

      // Determine reference date: use meeting city arrival date if present, otherwise use arrival date
      let referenceDate = normalizedArrivalDate;
      if (hasConnectingFlight && normalizedConnectingArrivalDate) {
        referenceDate = normalizedConnectingArrivalDate;
      }

      if (
        referenceDate &&
        normalizedDepartureDate.getTime() < referenceDate.getTime()
      ) {
        return false;
      }
    }

    return true;
  }, [
    departureFlightValue,
    departurePortValue,
    departureDateValue,
    normalizedDepartureDate,
    normalizedArrivalDate,
    normalizedConnectingArrivalDate,
    hasConnectingFlight,
  ]);

  const referenceDateForDeparture = useMemo(() => {
    // Use meeting city arrival date if present and has connecting flight, otherwise use arrival date
    if (hasConnectingFlight && normalizedConnectingArrivalDate) {
      return normalizedConnectingArrivalDate;
    }
    return normalizedArrivalDate;
  }, [
    hasConnectingFlight,
    normalizedConnectingArrivalDate,
    normalizedArrivalDate,
  ]);

  const isDelegateSelectionComplete =
    !canAssignOtherUsers ||
    participantType !== "delegate" ||
    Boolean(delegateId?.trim());

  const canProceedFromStepOne =
    isArrivalStepComplete &&
    Boolean(selectedEvent) &&
    isDelegateSelectionComplete;

  const validateStep = async () => {
    if (currentStep === 1) {
      const fieldsToValidate = [
        "arrival.country",
        "arrival.flightNumber",
        "arrival.portOfEntry",
        "arrival.arrivalDate",
      ];

      if (shouldShowEventSelection) {
        fieldsToValidate.push("eventId");
      }

      if (canAssignOtherUsers && participantType === "delegate") {
        fieldsToValidate.push("delegateId");
      }

      const isValid = await trigger(fieldsToValidate, { shouldFocus: true });
      if (!isValid) return false;

      if (!normalizedArrivalDate) {
        setError("arrival.arrivalDate", {
          type: "manual",
          message: "Enter a valid date",
        });
        return false;
      }

      clearErrors("arrival.arrivalDate");
      return true;
    }

    if (shouldShowEventSelection) {
      const eventValid = await trigger("eventId", { shouldFocus: true });
      if (!eventValid) return false;
    }

    if (canAssignOtherUsers && participantType === "delegate") {
      const delegateValid = await trigger("delegateId", { shouldFocus: true });
      if (!delegateValid) return false;
    }

    // Validate connecting flight arrival date if present
    if (hasConnectingFlight) {
      const connectingDateValue = watch("arrival.connectingArrivalDate");
      if (connectingDateValue?.trim?.()) {
        const connectingDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!connectingDateRegex.test(connectingDateValue)) {
          setError("arrival.connectingArrivalDate", {
            type: "manual",
            message: "Enter a valid date",
          });
          return false;
        }

        const parsedConnectingDate = parseISODate(connectingDateValue);
        if (!parsedConnectingDate) {
          setError("arrival.connectingArrivalDate", {
            type: "manual",
            message: "Enter a valid date",
          });
          return false;
        }

        const normalizedConnDate = normalizeDateValue(parsedConnectingDate);
        if (
          normalizedArrivalDate &&
          normalizedConnDate.getTime() < normalizedArrivalDate.getTime()
        ) {
          setError("arrival.connectingArrivalDate", {
            type: "manual",
            message:
              "Meeting city arrival date must be greater than or equal to India arrival date",
          });
          return false;
        }
        clearErrors("arrival.connectingArrivalDate");
      }
    }

    const isValid = await trigger(
      [
        "departure.flightNumber",
        "departure.portOfExit",
        "departure.departureDate",
      ],
      { shouldFocus: true },
    );

    if (!isValid) return false;

    const hasDepartureDate = Boolean(departureDateValue?.trim?.());

    if (!hasDepartureDate) {
      clearErrors("departure.departureDate");
      return true;
    }

    if (!normalizedDepartureDate) {
      setError("departure.departureDate", {
        type: "manual",
        message: "Enter a valid date",
      });
      return false;
    }

    // Determine the reference date for departure: use meeting city arrival date if present, otherwise use arrival date
    const connectingDateValue = watch("arrival.connectingArrivalDate");
    let referenceDateForDeparture = normalizedArrivalDate;

    if (hasConnectingFlight && connectingDateValue?.trim?.()) {
      const connectingDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (connectingDateRegex.test(connectingDateValue)) {
        const parsedConnectingDate = parseISODate(connectingDateValue);
        if (parsedConnectingDate) {
          referenceDateForDeparture = normalizeDateValue(parsedConnectingDate);
        }
      }
    }

    if (
      referenceDateForDeparture &&
      normalizedDepartureDate.getTime() < referenceDateForDeparture.getTime()
    ) {
      const referenceLabel =
        hasConnectingFlight && connectingDateValue?.trim?.()
          ? "meeting city arrival date"
          : "arrival date";
      setError("departure.departureDate", {
        type: "manual",
        message: `Departure date must be greater than or equal to ${referenceLabel}`,
      });
      return false;
    }

    clearErrors("departure.departureDate");
    return true;
  };

  const goNext = async () => {
    const isValid = await validateStep();
    if (!isValid) return;
    setCurrentStep(2);
  };

  const goBack = () => setCurrentStep(1);

  const processSubmit = async (formData) => {
    const isValid = await validateStep();
    if (!isValid) return;
    try {
      const loggedUserId = currentUser?.user?.id || currentUser?.id;
      const participantTypeValue = canAssignOtherUsers
        ? formData.participantType
        : "myself";
      const delegateTargetId =
        canAssignOtherUsers && participantTypeValue === "delegate"
          ? formData.delegateId
          : "";

      // Use targetUser if provided (from pending travel details), otherwise use delegate or logged user
      const targetUserId =
        targetUser?.user_id ||
        (participantTypeValue === "delegate" ? delegateTargetId : loggedUserId);

      // If targetUser is provided, it's always for a delegate, otherwise follow participantType
      const forWhomValue = targetUser
        ? "DELEGATE"
        : participantTypeValue === "delegate"
          ? "DELEGATE"
          : "MYSELF";

      const fd = new FormData();

      // CORE
      fd.append("event_id", activeEventId);
      fd.append("user_id", targetUserId);
      fd.append("for_whom", forWhomValue);

      // ARRIVAL (FLAT)
      fd.append("country_from", formData.arrival.country);
      fd.append("arrival_flight_number", formData.arrival.flightNumber);
      fd.append("port_of_entry", formData.arrival.portOfEntry);
      fd.append("arrival_date", formData.arrival.arrivalDate);

      // CONNECTING FLIGHT FOR ARRIVAL
      fd.append(
        "arrival_has_connecting_flight",
        formData.arrival.hasConnectingFlight ? "true" : "false",
      );
      if (formData.arrival.hasConnectingFlight) {
        if (formData.arrival.connectingFlightNumber) {
          fd.append(
            "arrival_connecting_flight_number",
            formData.arrival.connectingFlightNumber,
          );
        }
        if (formData.arrival.connectingPortOfEntry) {
          fd.append(
            "arrival_connecting_port",
            formData.arrival.connectingPortOfEntry,
          );
        }
        if (formData.arrival.connectingArrivalDate) {
          fd.append(
            "arrival_connecting_date",
            formData.arrival.connectingArrivalDate,
          );
        }
        // Country is same as arrival country
        fd.append("arrival_connecting_country", formData.arrival.country);
      }

      // DEPARTURE (FLAT)
      fd.append("country_to", formData.arrival.country);
      fd.append("departure_flight_number", formData.departure.flightNumber);
      fd.append("port_of_exit", formData.departure.portOfExit);
      fd.append("departure_date", formData.departure.departureDate);

      // FILES
      if (formData.arrival.ticketFile) {
        fd.append("arrival_ticket", formData.arrival.ticketFile);
      } else if (formData.arrival.existingTicketUrl) {
        fd.append("keep_arrival_ticket", "true");
      }

      if (formData.departure.ticketFile) {
        fd.append("departure_ticket", formData.departure.ticketFile);
      } else if (formData.departure.existingTicketUrl) {
        fd.append("keep_departure_ticket", "true");
      }

      await saveTravel(fd);

      toast.success("Travel details saved successfully");
      onClose();

      // Call onSuccess callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save travel details",
      );
    }
  };

  const submitForm = handleFormSubmit(processSubmit);

  const renderStepIndicator = () => (
    <div className="flex flex-wrap items-center gap-4 sm:gap-8">
      {stepLabels.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${isCompleted
                  ? "border-[var(--color-primary-blue)] bg-[var(--color-primary-blue)] text-white"
                  : isActive
                    ? "border-[var(--color-primary-blue)] text-[var(--color-primary-blue)]"
                    : "border-gray-300 text-gray-400"
                }`}
            >
              {isCompleted ? "✓" : step.id}
            </div>

            <p
              className={`text-sm font-medium ${isActive ? "text-[var(--color-primary-blue)]" : "text-gray-400"
                }`}
            >
              {step.name}
            </p>

            {index !== stepLabels.length - 1 && (
              <div className="hidden h-[1px] w-20 bg-gray-200 sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDropzone = (zoneKey, fieldPath, fileState) => {
    const isActive = Boolean(activeDropzone[zoneKey]);

    const updateActiveState = (value) => {
      setActiveDropzone((previous) => ({ ...previous, [zoneKey]: value }));
    };

    const handleFileSelection = (file) => {
      if (!file) {
        setValue(fieldPath, null, { shouldDirty: true, shouldValidate: true });
        clearErrors(fieldPath);
        return;
      }

      if (!ACCEPTED_TICKET_TYPES.has(file.type)) {
        toast.error("Only JPG, JPEG, PNG, or PDF tickets are allowed");
        return;
      }

      if (file.size > MAX_TICKET_SIZE_BYTES) {
        toast.error("Ticket must be 5 MB or smaller");
        return;
      }

      setValue(fieldPath, file, { shouldDirty: true, shouldValidate: true });
      clearErrors(fieldPath);
    };

    const handleInputChange = (event) => {
      handleFileSelection(event.target.files?.[0] || null);
    };

    const handleDragOver = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      if (!isActive) {
        updateActiveState(true);
      }
    };

    const handleDragLeave = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.contains(event.relatedTarget)) return;
      updateActiveState(false);
    };

    const handleDrop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      updateActiveState(false);
      const file = event.dataTransfer.files?.[0];
      handleFileSelection(file ?? null);
    };

    return (
      <label
        className={`mt-2 flex w-full cursor-pointer flex-col gap-4 rounded-lg border border-dashed px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${isActive
            ? "border-[#003366] bg-[#e6f0ff]"
            : "border-gray-300 bg-gray-50"
          }`}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-[var(--color-primary-blue)]" />
          <div>
            <p className="text-sm text-gray-600">
              Choose a file or drag and drop it here.
            </p>
            <p className="text-xs text-gray-400">
              JPEG, PNG, PDF formats up to 5 MB.
            </p>
            {fileState && (
              <p className="mt-1 text-xs text-gray-600">{fileState.name}</p>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <span className="rounded-md border border-[var(--color-primary-blue)] px-4 py-1 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-primary-blue)] hover:text-white">
            Browse File
          </span>
        </div>

        {/* THIS LINE IS THE FIX */}
        <input
          type="file"
          name={fieldPath} // 👈 this is the critical fix
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </label>
    );
  };

  if (!open) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${isAnimating ? "opacity-40" : "opacity-0"
          }`}
        onClick={handleClose}
        style={{ margin: 0, padding: 0 }}
      />

      {/* Drawer - Bottom sheet on mobile, side drawer on desktop */}
      <aside
        className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-2xl
          sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
          md:w-[600px] lg:w-[740px]
          ${isAnimating
            ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
          }`}
        style={{ top: "64px", maxHeight: "calc(100vh - 64px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
            Add Travel Details
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md -mr-1"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </header>

        {shouldShowEventSelection && (
          <div className="space-y-5 border-b px-4 sm:px-6 py-4 sm:py-5">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Select Event <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={
                  [{ value: "", label: isEventsLoading && eventOptions.length === 0 ? "Loading events..." : isEventsError ? "Unable to load events" : "Select Event" }]
                    .concat(
                      eventOptions.map((eventOption) => ({
                        value: getEventId(eventOption),
                        label: eventOption?.event_name || eventOption?.name || "Untitled Event",
                      }))
                    )
                }
                value={selectedEventId}
                onChange={(val) => {
                  setValue("eventId", val, { shouldValidate: true, shouldDirty: true });
                  clearErrors("eventId");
                }}
                className={fieldClass(Boolean(errors.eventId))}
                searchable={true}
                sort={true}
                disabled={isEventsLoading && eventOptions.length === 0}
              />
              {errors.eventId ? (
                <p className="mt-2 text-xs text-red-500">
                  {errors.eventId.message}
                </p>
              ) : (
                !isEventsLoading &&
                !isEventsError &&
                eventOptions.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    No events available. Create an event to add travel details.
                  </p>
                )
              )}
              {isEventsError && !errors.eventId && (
                <p className="mt-2 text-xs text-red-500">
                  Unable to fetch events. Please refresh and try again.
                </p>
              )}
              {/* Show assigned sessions for speaker immediately after event selection */}
              {normalizedRoleName === "SPEAKER" && assignedSessions.length > 0 && (
                <div className="mt-3 text-sm text-gray-700">
                  <label className="text-sm font-medium text-gray-700 block">
                    Assigned Session{assignedSessions.length > 1 ? "s" : ""}
                  </label>
                  <div className="mt-2">
                    {assignedSessions.map((s) => (
                      <div key={s.session_id} className="py-1">
                        {s.session_name || "(Unnamed session)"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">
                Who are you adding travel details for?{" "}
                <span className="text-red-500">*</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {participantOptions.map((option) => {
                  const isActive = participantType === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${isActive
                          ? "cursor-default border-[var(--color-primary-blue)] bg-[var(--color-primary-blue-light)] text-[var(--color-text-primary)]"
                          : "cursor-pointer border-gray-300 text-gray-700 hover:border-[var(--color-primary-blue)]"
                        }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={isActive}
                        className="sr-only"
                        {...participantTypeRegister}
                        onChange={(event) => {
                          participantTypeRegister.onChange(event);
                        }}
                        disabled={
                          !canAssignOtherUsers && option.value !== "myself"
                        }
                        aria-hidden={false}
                      />

                      <div
                        aria-hidden
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-2 transition-all duration-200 ${isActive ? 'border-[#003366]' : 'border-gray-300'} ${!canAssignOtherUsers && option.value !== 'myself' ? 'opacity-50' : ''}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-[#003366] transition-all duration-200 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                        />
                      </div>

                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>

              {!canAssignOtherUsers && (
                <p className="mt-2 text-xs text-gray-500">
                  Delegates can only submit their own travel details.
                </p>
              )}

              {participantType === "delegate" && canAssignOtherUsers && (
                <div className="mt-4" ref={delegateSelectionRef}>
                  <label className="text-sm font-medium text-gray-700">
                    Select Delegate <span className="text-red-500">*</span>
                  </label>
                  {activeEventId ? (
                    <>
                      {selectedDelegate ? (
                        <div className="mt-2 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {getDelegateDisplayName(selectedDelegate)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {selectedDelegate?.email ??
                                selectedDelegate?.user?.email ??
                                ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDelegateChange}
                            className="text-xs font-medium text-[var(--color-text-primary)] hover:underline"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2">
                            <input
                              ref={delegateInputRef}
                              type="text"
                              value={delegateSearch}
                              onChange={(event) => {
                                setDelegateSearch(event.target.value);
                                setSelectedDelegate(null);
                                setValue("delegateId", "", {
                                  shouldValidate: false,
                                  shouldDirty: true,
                                });
                                clearErrors("delegateId");
                                setDelegateDropdownOpen(true);
                              }}
                              placeholder="Search delegate by name or email"
                              onFocus={() => setDelegateDropdownOpen(true)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
                            />
                          </div>

                          {delegateDropdownOpen && (
                            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
                              {delegateLoading ? (
                                <p className="px-3 py-2 text-sm text-gray-500">
                                  Loading delegates...
                                </p>
                              ) : delegateFetchError ? (
                                <p className="px-3 py-2 text-sm text-red-500">
                                  {delegateFetchError}
                                </p>
                              ) : filteredDelegates.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-gray-500">
                                  No delegates found.
                                </p>
                              ) : (
                                filteredDelegates.map((delegate, index) => {
                                  const candidateId = getDelegateId(delegate);
                                  const optionKey =
                                    candidateId || `delegate-${index}`;
                                  const isSelected = candidateId === delegateId;
                                  const delegateEmail =
                                    delegate?.email ??
                                    delegate?.user?.email ??
                                    "";
                                  return (
                                    <button
                                      key={optionKey}
                                      type="button"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() =>
                                        handleDelegateSelect(delegate)
                                      }
                                      className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm transition ${isSelected
                                          ? "bg-[var(--color-primary-blue-light)] text-[var(--color-text-primary)]"
                                          : "hover:bg-gray-100"
                                        }`}
                                    >
                                      <span>
                                        {getDelegateDisplayName(delegate)}
                                        {delegateEmail && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            {delegateEmail}
                                          </span>
                                        )}
                                      </span>
                                      {isSelected && (
                                        <span className="text-xs font-medium text-[#003366]">
                                          Selected
                                        </span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {errors.delegateId && (
                        <p className="mt-2 text-xs text-red-500">
                          {errors.delegateId.message}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      Select an event before choosing a delegate.
                    </p>
                  )}
                </div>
              )}
            </div>
            </div>
          )}

        <div className="px-4 sm:px-6 py-3 sm:py-4">{renderStepIndicator()}</div>

        <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {currentStep === 1 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Which Country are you travelling from?{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={[{ value: "", label: "Select" }].concat(
                    COUNTRY_OPTIONS.map((countryOption) => ({
                      value: countryOption.label || countryOption.value || countryOption,
                      label: countryOption.label || countryOption.value || countryOption,
                    })),
                  )}
                  value={arrivalCountryValue}
                  onChange={(val) => setValue("arrival.country", val, { shouldValidate: true, shouldDirty: true })}
                  className={fieldClass(Boolean(errors.arrival?.country))}
                  searchable={true}
                  sort={true}
                />
                {errors.arrival?.country && (
                  <p className="mt-2 text-xs text-red-500">
                    {errors.arrival.country.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Flight Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...arrivalFlightRegister}
                  className={fieldClass(Boolean(errors.arrival?.flightNumber))}
                  placeholder="Enter your Flight Number"
                />
                {errors.arrival?.flightNumber && (
                  <p className="mt-2 text-xs text-red-500">
                    {errors.arrival.flightNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Port of Entry in India <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={ALL_INDIAN_AIRPORTS.map((airport) => ({
                    value: airport.city,
                    label: `${airport.city} - ${airport.name} (${airport.code})`,
                  }))}
                  value={arrivalPortValue}
                  onChange={(val) => setValue("arrival.portOfEntry", val, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Select"
                  className={fieldClass(Boolean(errors.arrival?.portOfEntry))}
                  searchable={true}
                  sort={true}
                  maxVisible={5}
                />
                {errors.arrival?.portOfEntry && (
                  <p className="mt-2 text-xs text-red-500">
                    {errors.arrival.portOfEntry.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Arrival Date in India <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...arrivalDateRegister}
                  className={fieldClass(Boolean(errors.arrival?.arrivalDate))}
                />
                {errors.arrival?.arrivalDate && (
                  <p className="mt-2 text-xs text-red-500">
                    {errors.arrival.arrivalDate.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-gray-700">
                  Upload your Tickets (Optional)
                </p>
                {arrivalExistingTicketUrl && !arrivalTicketFile && (
                  <div className="mt-2 mb-2 flex items-center gap-2 text-sm">
                    <CheckCircle
                      size={16}
                      className="text-green-600 flex-shrink-0"
                    />
                    <span className="font-medium text-green-600">
                      Ticket already uploaded
                    </span>
                    <a
                      href={arrivalExistingTicketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--color-text-primary)] hover:underline"
                    >
                      (View)
                    </a>
                  </div>
                )}
                {arrivalTicketFile && (
                  <div className="mt-2 mb-2 flex items-center gap-2 text-sm">
                    <CheckCircle
                      size={16}
                      className="text-green-600 flex-shrink-0"
                    />
                    <span className="font-medium text-green-600">
                      New ticket selected
                    </span>
                    <span className="text-gray-600">
                      ({arrivalTicketFile.name})
                    </span>
                  </div>
                )}
                {arrivalExistingTicketUrl && arrivalTicketFile && (
                  <div className="mt-2 mb-2 flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        size={16}
                        className="text-green-600 flex-shrink-0"
                      />
                      <span className="font-medium text-green-600">
                        Current ticket
                      </span>
                          <a
                            href={arrivalExistingTicketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[var(--color-text-primary)] hover:underline"
                          >
                            (View)
                          </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        size={16}
                        className="text-green-600 flex-shrink-0"
                      />
                      <span className="font-medium text-green-600">
                        New ticket selected
                      </span>
                      <span className="text-gray-600">
                        ({arrivalTicketFile.name})
                      </span>
                    </div>
                  </div>
                )}
                {renderDropzone(
                  "arrivalTicket",
                  "arrival.ticketFile",
                  arrivalTicketFile ?? null,
                )}
              </div>

              {/* Connecting Flight Section */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Connecting Flight to Meeting City
                </label>
                <div className="flex gap-4 text-sm">
                  {[
                    { value: false, label: "No" },
                    { value: true, label: "Yes" },
                  ].map((option) => (
                    <label
                      key={option.label}
                      className="flex gap-2 items-center cursor-pointer"
                    >
                      <input
                        type="radio"
                        checked={hasConnectingFlight === option.value}
                        onChange={() =>
                          setValue("arrival.hasConnectingFlight", option.value)
                        }
                        className="sr-only"
                      />
                      {/* Custom Radio Circle */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${hasConnectingFlight === option.value
                            ? "border-[#003366]"
                            : "border-gray-300"
                          }`}
                      >
                        {/* Inner dot */}
                        <div
                          className={`w-2 h-2 rounded-full bg-[#003366] transition-all duration-200 ${hasConnectingFlight === option.value
                              ? "scale-100 opacity-100"
                              : "scale-0 opacity-0"
                            }`}
                        />
                      </div>
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Connecting Flight Details - Show when Yes is selected */}
              {hasConnectingFlight && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Flight Number
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        (Optional)
                      </span>
                    </label>
                    <input
                      {...connectingFlightRegister}
                      className={fieldClass(
                        Boolean(errors.arrival?.connectingFlightNumber),
                      )}
                      placeholder="Enter your Flight Number"
                    />
                    {errors.arrival?.connectingFlightNumber && (
                      <p className="mt-2 text-xs text-red-500">
                        {errors.arrival.connectingFlightNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Select Meeting City
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        (Optional)
                      </span>
                    </label>
                    <SearchableSelect
                      options={ALL_INDIAN_AIRPORTS.map((airport) => ({
                        value: airport.city,
                        label: `${airport.city} - ${airport.name} (${airport.code})`,
                      }))}
                      value={connectingPortOfEntry}
                      onChange={(val) => setValue("arrival.connectingPortOfEntry", val, { shouldValidate: true, shouldDirty: true })}
                      placeholder="Select"
                      className={fieldClass(Boolean(errors.arrival?.connectingPortOfEntry))}
                      searchable={true}
                      sort={true}
                      maxVisible={5}
                    />
                    {errors.arrival?.connectingPortOfEntry && (
                      <p className="mt-2 text-xs text-red-500">
                        {errors.arrival.connectingPortOfEntry.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Arrival Date in Meeting City
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        (Optional)
                      </span>
                    </label>
                    <input
                      type="date"
                      min={
                        normalizedArrivalDate
                          ? formatDateForInput(normalizedArrivalDate)
                          : undefined
                      }
                      {...connectingDateRegister}
                      className={fieldClass(
                        Boolean(errors.arrival?.connectingArrivalDate),
                      )}
                      placeholder="dd/mm/yyyy"
                    />
                    {errors.arrival?.connectingArrivalDate && (
                      <p className="mt-2 text-xs text-red-500">
                        {errors.arrival.connectingArrivalDate.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 text-sm font-semibold text-gray-800">
                Details of Departure from the Nearest Airport
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (All fields optional)
                </span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Flight Number
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    (Optional)
                  </span>
                </label>
                <input
                  {...departureFlightRegister}
                  className={fieldClass(
                    Boolean(errors.departure?.flightNumber),
                  )}
                  placeholder="Enter your Flight Number"
                />
                {errors.departure?.flightNumber && (
                  <p className="mt-2 text-xs text-red-500">
                    {errors.departure.flightNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Port of Exit from India
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    (Optional)
                  </span>
                </label>
                <SearchableSelect
                  options={ALL_INDIAN_AIRPORTS.map((airport) => ({
                    value: airport.city,
                    label: `${airport.city} - ${airport.name} (${airport.code})`,
                  }))}
                  value={departurePortValue}
                  onChange={(val) => setValue("departure.portOfExit", val, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Select"
                  className={fieldClass(Boolean(errors.departure?.portOfExit))}
                  searchable={true}
                  sort={true}
                  maxVisible={5}
                />
                {errors.departure?.portOfExit && (
                  <p className="mt-2 text-xs text-red-500">
                    {errors.departure.portOfExit.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Departure Date in India
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    (Optional)
                  </span>
                </label>
                <input
                  type="date"
                  min={
                    referenceDateForDeparture
                      ? formatDateForInput(referenceDateForDeparture)
                      : undefined
                  }
                  {...departureDateRegister}
                  className={fieldClass(
                    Boolean(errors.departure?.departureDate),
                  )}
                />
                {errors.departure?.departureDate && (
                  <p className="mt-2 text-xs text-red-500">
                    {errors.departure.departureDate.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-gray-700">
                  Upload your Tickets (Optional)
                </p>
                {departureExistingTicketUrl && !departureTicketFile && (
                  <div className="mt-2 mb-2 flex items-center gap-2 text-sm">
                    <CheckCircle
                      size={16}
                      className="text-green-600 flex-shrink-0"
                    />
                    <span className="font-medium text-green-600">
                      Ticket already uploaded
                    </span>
                    <a
                      href={departureExistingTicketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      (View)
                    </a>
                  </div>
                )}
                {departureTicketFile && (
                  <div className="mt-2 mb-2 flex items-center gap-2 text-sm">
                    <CheckCircle
                      size={16}
                      className="text-green-600 flex-shrink-0"
                    />
                    <span className="font-medium text-green-600">
                      New ticket selected
                    </span>
                    <span className="text-gray-600">
                      ({departureTicketFile.name})
                    </span>
                  </div>
                )}
                {departureExistingTicketUrl && departureTicketFile && (
                  <div className="mt-2 mb-2 flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        size={16}
                        className="text-green-600 flex-shrink-0"
                      />
                      <span className="font-medium text-green-600">
                        Current ticket
                      </span>
                      <a
                        href={departureExistingTicketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--color-text-primary)] hover:underline"
                      >
                        (View)
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        size={16}
                        className="text-green-600 flex-shrink-0"
                      />
                      <span className="font-medium text-green-600">
                        New ticket selected
                      </span>
                      <span className="text-gray-600">
                        ({departureTicketFile.name})
                      </span>
                    </div>
                  </div>
                )}
                {renderDropzone(
                  "departureTicket",
                  "departure.ticketFile",
                  departureTicketFile ?? null,
                )}
              </div>
            </div>
          )}
        </section>

        <footer className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 border-t px-4 sm:px-6 py-3 sm:py-4">
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceedFromStepOne}
              className={`${primaryButtonClass(!canProceedFromStepOne)} w-full sm:w-auto`}
            >
              Next
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={goBack}
                className="w-full rounded-md border border-gray-300 px-8 py-2 text-sm sm:w-auto"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submitForm}
                disabled={!isDepartureStepComplete}
                className={`${primaryButtonClass(!isDepartureStepComplete)} w-full sm:w-auto`}
              >
                Add
              </button>
            </>
          )}
        </footer>
      </aside>
    </>
  );
};

export default TravelDetailsDrawer;
