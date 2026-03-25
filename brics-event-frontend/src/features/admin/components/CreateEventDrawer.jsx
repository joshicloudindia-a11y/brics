import { X, MapPin, Video, Users, Upload } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { z } from "zod";
import { EVENT_CATEGORIES, MINISTRIES } from "../../../constants/eventCategories";
import SearchableSelect from "../../../components/common/SearchableSelect";
import { getEventManagers, upsertEvent } from "../../../services/events";
import { getMinistries } from "../../../services/ministries";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { getOrganizations } from "../../../services/organizations";


const inputBase =
  "w-full h-12 px-4 mt-1 border rounded-lg text-sm focus:outline-none focus:ring-[1px] focus:ring-[#1e4788] transition-all ";

// const numberInputBase =
//   "w-full h-12 px-4 mt-1 border rounded-lg text-sm focus:outline-none focus:ring-[1px] focus:ring-[#1e4788] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const numberInputBase =
  "w-full h-12 px-4 mt-1 border rounded-lg text-sm focus:outline-none focus:ring-[1px] focus:ring-[#1e4788] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

/* VALIDATION */
const schema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  eventMode: z.string().min(1),
  location: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  delegateCount: z.string().min(1),
});

const MODES = [
  {
    id: "In-Person",
    label: "In-Person",
    desc: "Conduct an event at a physical venue",
    icon: MapPin,
  },
  {
    id: "Virtual",
    label: "Virtual",
    desc: "Host a digital event for remote participants",
    icon: Video,
  },
  {
    id: "Hybrid",
    label: "Hybrid",
    desc: "Combine in-person & remote participation",
    icon: Users,
  },
];

export default function CreateEventDrawer({ eventData, open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    meetingUrl: "",
    category: "",
    eventMode: "In-Person",
    location: "",
    venue: "",
    startDate: "",
    endDate: "",
    ministry: "",
    organization: "",
    manager: "",
    delegateCount: "",
    logo: null,
    status: "published", // 'draft' or 'published'
  });

  const [preview, setPreview] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [customOrganization, setCustomOrganization] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [delegateCountError, setDelegateCountError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const { data, isLoading } = useCurrentUser();
  const isEventManager = data?.role?.name === "EVENT MANAGER";
  const update = useCallback((k, v) => setForm((p) => ({ ...p, [k]: v })), []);

  /* ================= FETCH MINISTRIES ================= */
  const { data: ministriesData, isLoading: ministriesLoading } = useQuery({
    queryKey: ["ministries"],
    queryFn: () => getMinistries(),
    staleTime: 5 * 60 * 1000,
  });

  const ministryOptions = (() => {
    if (!ministriesData) return MINISTRIES.map((m) => ({ key: m.key, value: m.value }));
    const arr = Array.isArray(ministriesData) ? ministriesData : (ministriesData?.data ?? []);
    return arr.map((m) => ({ key: m.id ?? m._id ?? m.key ?? m.name ?? null, value: (m.name ?? m.ministry_name ?? m.value ?? "").toString().trim() }));
  })();

  /* ================= FETCH ORGANIZATIONS ================= */
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => getOrganizations(),
    staleTime: 5 * 60 * 1000,
  });

  const organizationOptions = useMemo(() => {
    if (!orgData) return [];
    const arr = Array.isArray(orgData) ? orgData : (orgData?.data ?? []);
    return arr.map((o) => ({ id: o.id ?? o._id ?? o.organization_id ?? o.org_id ?? null, name: (o.name ?? o.organization_name ?? "").toString().trim() }));
  }, [orgData]);

  /* ANIMATION HANDLING */
  useEffect(() => {
    if (open) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  /* POPULATE FORM WITH EVENT DATA FOR EDITING */
  useEffect(() => {
    if (eventData && open) {
      // Format dates to YYYY-MM-DD for date inputs
      const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
      };

      // Support cases where eventData may be nested inside an `event` key
      const src = eventData.event || eventData;

      // console.log("source ",src)

      // Debug: log incoming eventData shapes when editing
      // (remove this after verification)
      // eslint-disable-next-line no-console
      console.log("CreateEventDrawer: populating form from src:", {
        srcMeeting_url: src.meeting_url,
        srcMeetingUrl: src.meetingUrl,
        src,
      });

      setForm({
        name: src.name || "",
        description: src.description || "",
        meetingUrl: src.meeting_url || src.meetingUrl || "",
        category: src.category || "",
        eventMode: src.type || src.event_type || "In-Person",
        location: src.location || "",
        venue: src.venue || "",
        startDate: formatDate(src.start_date || src.startDate),
        endDate: formatDate(src.end_date || src.endDate),
        ministry: src.ministry || src.ministry_name || "",
        organization: src.organization || src.organization_name || "",
        manager:
          src.manager_id ||
          src.assigned_manager_id ||
          src.manager ||
          "",
        delegateCount:
          String(src.delegate_count) ||
          String(src.delegateCount) ||
          String(src.max_delegates_per_dao) ||
          "",
        logo: null,
        status: src.status || "published",
      });

      // Set preview if image exists (support multiple keys)
      if (src.image || src.logo || src.logo_url) {
        setPreview(src.image || src.logo || src.logo_url);
      }
    }

    // Reset form when drawer closes
    if (!open) {
      setForm({
        name: "",
        meetingUrl: "",
        category: "",
        eventMode: "In-Person",
        location: "",
        venue: "",
        startDate: "",
        endDate: "",
        ministry: "",
        organization: "",
        manager: "",
        delegateCount: "",
        logo: null,
        status: "published",
      });
      setPreview(null);
    }
  }, [eventData, open]);

  /* LOCATION SEARCH */
  useEffect(() => {
    if (form.location.length < 3) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(form.location)}`,
        );
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        // Handle error silently
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [form.location]);

  /* MANAGER + MINISTRY API */
  useEffect(() => {
    if (isLoading) return;

    if (isEventManager) return;

    const fetchManagers = async () => {
      try {
        const res = await getEventManagers();
        setManagers(res);
        const uniqueMinistries = [...new Set(res.map((d) => d.ministry_name))];
        setMinistries(uniqueMinistries);
      } catch (err) {
        // Handle error silently
      }
    };

    fetchManagers();
  }, [isLoading, isEventManager]);

  useEffect(() => {
    if (!isLoading && isEventManager && data?.user) {
      setForm((prev) => ({
        ...prev,
        ministry: data.user.ministry_name || "",
        manager: data.user.id || "",
      }));
    }
  }, [isLoading, isEventManager, data]);

  const processImageFile = (file) => {
    if (!file) return false;

    const allowed = ["image/jpeg", "image/png"];
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowed.includes(file.type.toLowerCase())) {
      toast.error("Only JPEG and PNG files are allowed");
      return false;
    }

    if (file.size > maxSizeBytes) {
      toast.error("Maximum file size is 5MB");
      return false;
    }

    const objectUrl = URL.createObjectURL(file);
    setForm((p) => ({ ...p, logo: file }));
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    return true;
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    const success = processImageFile(file);
    if (!success && e.target) {
      e.target.value = "";
    }
  };

  const handleImageDragOver = (event) => {
    event.preventDefault();
    setIsImageDragActive(true);
  };

  const handleImageDragLeave = (event) => {
    event.preventDefault();
    setIsImageDragActive(false);
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    setIsImageDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    processImageFile(file);
  };

  const handleSaveDraft = async () => {
    // For draft, only require name
    if (!form.name?.trim()) {
      toast.warning("Event name is required");
      return;
    }

    setIsDraftSaving(true);
    await handleSubmit("draft");
    setIsDraftSaving(false);
  };

  const handleSubmit = async (statusOverride = null) => {
    const isDraft = statusOverride === "draft" || form.status === "draft";

    // For published events, validate all required fields
    if (!isDraft) {
      // Validate delegate count
      if (!form.delegateCount) {
        setDelegateCountError("Delegate count is required");
        toast.warning("Please fill all mandatory fields");
        return;
      }

      if (Number(form.delegateCount) < 1) {
        setDelegateCountError("Delegate count must be at least 1");
        toast.warning("Please enter a valid delegate count");
        return;
      }

      if (!schema.safeParse(form).success) {
        toast.warning("Please fill all mandatory fields");
        return;
      }

      // Validate custom organization when 'Others' selected (only for published events)
      if (form.organization === "Others" && !customOrganization?.trim()) {
        toast.error("Please enter organization name");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const fd = new FormData();

      // If editing, add event ID
      if (eventData && (eventData._id || eventData.id)) {
        const eventId = eventData._id || eventData.id;
        fd.append("id", eventId);
        console.log("Updating existing event with ID:", eventId);
      } else {
        console.log("Creating new event");
      }

      // Copy form
      const payload = { ...form };

      // Set status - use override if provided, otherwise use form status
      payload.status = statusOverride || form.status || "published";

      // Attach organization_id and organization_name when possible
      if (form.organization) {
        if (form.organization === "Others") {
          payload.organization_name = customOrganization;
        } else {
          const orgList = Array.isArray(orgData) ? orgData : (orgData?.data ?? []);
          const found = orgList.find((o) => {
            const name = (o.name ?? o.organization_name ?? "").toString().trim().toLowerCase();
            return name === (form.organization ?? "").toString().trim().toLowerCase();
          });
          const foundId = found?._id ?? found?.id ?? found?.organization_id ?? found?.org_id ?? null;
          if (found) {
            if (foundId !== null && foundId !== undefined) payload.organization_id = foundId;
            payload.organization_name = (found.name ?? found.organization_name ?? form.organization).toString().trim();
          } else {
            payload.organization_name = form.organization;
          }
        }
      }

      // RULE:
      // If ministry selected but no manager → remove ministry
      // if (payload.ministry && !payload.manager) {
      //   delete payload.ministry;
      // }

      // Don't send logo if it's null during edit (preserve existing image)
      if (eventData && payload.logo === null) {
        delete payload.logo;
      }

      // Append only valid values (map meetingUrl -> meeting_url for backend)
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== "") {
          const key = k === "meetingUrl" ? "meeting_url" : k;
          fd.append(key, v);
        }
      });

      console.log("Sending event with status:", payload.status);
      console.log("Form data check - status:", fd.get("status"));
      console.log("Form data check - id:", fd.get("id"));

      await upsertEvent(fd);
      const isDraftSaved = statusOverride === "draft" || payload.status === "draft";
      toast.success(
        isDraftSaved 
          ? "Event Saved as Draft" 
          : (eventData ? "Event Updated Successfully" : "Event Created Successfully"),
      );
      onClose();

      // Refresh events list without page reload
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Event save error:", err);
      toast.error(
        isDraft 
          ? "Failed to save draft" 
          : (eventData ? "Update failed" : "Create failed")
      );
    } finally {
      setIsSubmitting(false);
    }
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
        className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${isAnimating ? 'opacity-40' : 'opacity-0'
          }`}
        onClick={handleClose}
        style={{ margin: 0, padding: 0 }}
      />

      {/* Drawer/Bottom Sheet */}
      <aside
        className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-2xl
          sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
          md:w-[600px] lg:w-[720px]
          ${isAnimating
            ? 'translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0'
          }`}
        style={{ top: '64px', maxHeight: 'calc(100vh - 64px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
            {eventData ? "Edit Event" : "Create Event"}
          </h2>
          <button onClick={handleClose} type="button" className="hover:bg-gray-100 rounded-md p-1.5 sm:p-2 -mr-1">
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* MODE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  onClick={() => update("eventMode", m.id)}
                  className={`p-3 sm:p-4 border rounded-xl cursor-pointer transition-all active:scale-[0.98]
                  ${form.eventMode === m.id ? "border-[#1e4788] bg-[#eff8ff]" : "hover:border-blue-400"}`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 lg:block">
                    <Icon
                      className="text-[#1e4788] lg:mb-3 bg-[#dbeefe] w-9 h-9 sm:w-10 sm:h-10 p-2 rounded-full flex-shrink-0"
                      size={20}
                    />
                    <div className="font-medium text-sm sm:text-base">{m.label}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5 sm:mt-2 lg:mt-0">{m.desc}</div>
                </div>
              );
            })}
          </div>

          <label className="block  text-gray-800 text-xs ">
            Event Name <span className="text-red-500">*</span>
            <input
              className={inputBase}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Enter your Event Name"
            />
          </label>

          <label className="block text-gray-800 text-xs">
            Event Description (optional)
            <textarea
              className="w-full px-4 py-3 mt-1 border rounded-lg text-sm focus:outline-none focus:ring-[1px] focus:ring-[#1e4788] transition-all resize-none"
              value={form.description || ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Enter a brief description of the event"
              rows={3}
              maxLength={2000}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {form.description?.length || 0}/2000 characters
            </div>
          </label>

          <label className="block text-gray-800 text-xs">
            Meeting URL (optional)
            <input
              type="url"
              className={inputBase}
              value={form.meetingUrl}
              onChange={(e) => update("meetingUrl", e.target.value)}
              placeholder="Enter meeting URL (e.g., meet.example.com)"
            />
            {form.meetingUrl && (
              <a
                href={form.meetingUrl.startsWith("http") ? form.meetingUrl : `https://${form.meetingUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1e4788] mt-1 inline-block ml-2 hover:underline"
              >
                Open Link
              </a>
            )}
          </label>

          <label className="block  text-gray-800 text-xs">
            Category
            <div className="mt-1">
              <SearchableSelect
                options={EVENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                value={form.category}
                onChange={(val) => update("category", val)}
                placeholder="Select"
                maxVisible={5}
                className=""
              />
            </div>
          </label>

          <label className="block text-xs  text-gray-800">
            Location
            <input
              className={inputBase}
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Search location name"
            />
          </label>

          {suggestions.length > 0 && (
            <ul className="border rounded-lg shadow bg-white">
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    update("location", s.display_name);
                    setSuggestions([]);
                  }}
                >
                  {s.display_name}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <label className="text-xs">
              Event Location
              <div className="h-36 border rounded-xl overflow-hidden">
                {form.location ? (
                  <iframe
                    title="map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      form.location,
                    )}&output=embed`}
                  />
                ) : (
                  <div className="h-full bg-gray-100 flex items-center justify-center text-gray-500">
                    Not Found
                  </div>
                )}
              </div>
            </label>

            <div>
              <label className="block text-xs  text-gray-800">
                Event Image
              </label>
              {preview ? (
                <div
                  className={`relative h-36 border-2 rounded-xl overflow-hidden group ${isImageDragActive ? "border-[#1e4788] bg-blue-50" : ""
                    }`}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                >
                  <img src={preview} className="w-full h-full object-cover" />
                  <label
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
                    onDragOver={handleImageDragOver}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDrop}
                  >
                    <Upload size={22} />
                    <span>Change Image</span>
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png"
                      onChange={handleImage}
                    />
                  </label>
                </div>
              ) : (
                <label
                  className={`h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${isImageDragActive ? "border-[#1e4788] bg-blue-50" : ""
                    }`}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                >
                  <Upload size={22} />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png"
                    onChange={handleImage}
                  />
                </label>
              )}
            </div>
          </div>

          <label className="block text-xs  text-gray-800">
            Venue
            <input
              className={inputBase}
              value={form.venue}
              onChange={(e) => update("venue", e.target.value)}
              placeholder="Enter venue"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs  text-gray-800">
                Start Date <span className="text-red-500">*</span>
                <input
                  type="date"
                  className={`${inputBase} text-gray-400`}
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </label>
            </div>
            <div>
              <label className="block text-xs  text-gray-800">
                End Date <span className="text-red-500">*</span>
                <input
                  type="date"
                  className={`${inputBase} text-gray-400`}
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                  min={form.startDate || new Date().toISOString().split("T")[0]}
                />
              </label>
            </div>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <label className="block text-xs  text-gray-800">
              {" "}
              Ministry List
              <div className="mt-1">
                <SearchableSelect
                  options={ministryOptions.map((m) => ({ value: m.value, label: m.value }))}
                  value={form.ministry}
                  onChange={(val) => {
                    update("ministry", val);
                    update("manager", "");
                  }}
                  placeholder="Select"
                  maxVisible={5}
                  disabled={isEventManager}
                />
              </div>
            </label>

            <label className="block text-xs  text-gray-800">
              Organization List
              <div className="mt-1">
                <SearchableSelect
                  options={organizationOptions.map((o) => ({ value: o.name, label: o.name }))}
                  value={form.organization}
                  onChange={(val) => update("organization", val)}
                  placeholder="Select"
                  maxVisible={5}
                />
              </div>

            </label>
          </div>

          {/* Custom Organization Text Input - Shows when "Others" is selected */}
          {form.organization === "Others" && (
            <label className="block text-xs  text-gray-800">
              Enter Organization Name<span className="text-red-500">*</span>
              <input
                type="text"
                className={inputBase}
                placeholder="Enter custom organization name"
                value={customOrganization}
                onChange={(e) => setCustomOrganization(e.target.value)}
              />
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-1 gap-6">
            <label className="block text-xs  text-gray-800">
              Assign Manager
              <div className="mt-1">
                <SearchableSelect
                  options={isEventManager
                    ? [{ value: data.user.id, label: `${data.user.name} (${data.user.email})` }]
                    : managers
                        .filter((m) => {
                          const matchMinistry = form.ministry && m.ministry_name === form.ministry;
                          const matchOrganization = form.organization && (m.organization_name === form.organization || (m.organization && m.organization === form.organization));
                          return matchMinistry || matchOrganization;
                        })
                        .map((m) => ({ value: m.manager_id, label: `${m.name} (${m.email})` }))}
                  value={form.manager}
                  onChange={(val) => update("manager", val)}
                  placeholder="Select"
                  maxVisible={5}
                  disabled={isEventManager}
                />
              </div>

            </label>
          </div>

          <label className="block text-xs text-gray-800">
            Delegate Count Per DAO <span className="text-red-500">*</span>
            <input
              type="number"
              className={`${numberInputBase} ${delegateCountError ? "border-red-500 focus:ring-red-500" : ""}`}
              value={form.delegateCount}
              onChange={(e) => {
                update("delegateCount", e.target.value);
                if (e.target.value) {
                  setDelegateCountError("");
                }
              }}
              onBlur={() => {
                if (!form.delegateCount) {
                  setDelegateCountError("Delegate count is required");
                } else if (Number(form.delegateCount) < 1) {
                  setDelegateCountError("Delegate count must be at least 1");
                }
              }}
              onWheel={(e) => e.target.blur()}
              placeholder="Enter delegate count"
              min="1"
              required
            />
            {delegateCountError && (
              <p className="text-xs text-red-500 mt-1">{delegateCountError}</p>
            )}
          </label>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t">
          {/* Show Save Draft button only for new events or draft events */}
          {(!eventData || eventData?.status === "draft") && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isDraftSaving || isSubmitting}
              className="px-5 sm:px-6 py-2.5 sm:py-2 border rounded-lg text-[#1e4788] border-[#1e4788] text-sm sm:text-base font-medium min-h-[44px] active:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDraftSaving ? "Saving..." : "Save Draft"}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit("published")}
            disabled={isSubmitting || isDraftSaving}
            className="px-5 sm:px-6 py-2.5 sm:py-2 bg-[#1e4788] text-white rounded-lg text-sm sm:text-base font-medium min-h-[44px] active:bg-[#0f2844] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? eventData?.status === "draft"
                ? "Publishing..."
                : eventData
                ? "Updating..."
                : "Publishing..."
              : eventData?.status === "draft"
                ? "Publish Event"
                : eventData
                ? "Update"
                : "Publish Event"}
          </button>
        </div>
      </aside>
    </>
  );
}

