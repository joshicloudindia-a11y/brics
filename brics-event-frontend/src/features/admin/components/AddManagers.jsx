import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MINISTRIES, ORGANISATIONS } from "../../../constants/eventCategories";
import { getEvents, addEventManager, updateEventManager } from "../../../services/events";
import SearchableSelect from "../../../components/common/SearchableSelect";
import { getMinistries } from "../../../services/ministries";
import { getOrganizations } from "../../../services/organizations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

/* =======================
   ZOD SCHEMA
======================= */
const addManagerSchema = z.object({
  firstName: z.string().min(3, "First Name is required"),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  ministry_name: z.string().optional(),
  organization_name: z.string().optional(),
  event_id: z.string().optional(),
});

const inputBase =
  "w-full h-12 px-4 border rounded-lg text-sm focus:outline-none focus:ring-[1px] focus:ring-[#1e4788] transition-all ";

const AddManagers = ({ open, onClose, eventId, editManager, onSuccess }) => {
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState(false);
  const [customOrganization, setCustomOrganization] = useState("");

  useEffect(() => {
    if (open) {
      // Trigger animation after a small delay to ensure smooth transition
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsAnimating(false);
    setCustomOrganization("");
    setTimeout(() => {
      onClose();
      reset();
    }, 300); // Wait for animation to complete
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addManagerSchema),
    mode: "onChange",
  });


  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const email = watch("email");
  const ministry_name = watch("ministry_name");
  const organization_name = watch("organization_name");

  const isFormValid =
    firstName?.trim() && email?.trim() && 
    (organization_name === "Others" ? customOrganization?.trim() : true)

  /* ================= FETCH EVENTS ================= */
  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
    staleTime: 2 * 60 * 1000,
  });

  /* ================= FETCH MINISTRIES ================= */
  const { data: ministriesData, isLoading: ministriesLoading } = useQuery({
    queryKey: ["ministries"],
    queryFn: () => getMinistries(),
    staleTime: 5 * 60 * 1000,
  });

  const ministryOptions = React.useMemo(() => {
    if (!ministriesData) return MINISTRIES.map((m) => ({ key: m.key, value: m.value }));
    const arr = Array.isArray(ministriesData) ? ministriesData : (ministriesData?.data ?? []);
    return arr.map((m) => ({
      key: m.id ?? m._id ?? m.key ?? m.name ?? m.ministry_key ?? null,
      value: (m.name ?? m.ministry_name ?? m.value ?? "").toString().trim(),
    }));
  }, [ministriesData]);
  
  /* ================= FETCH ORGANIZATIONS ================= */
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => getOrganizations(),
    staleTime: 5 * 60 * 1000,
  });

  const organizationOptions = React.useMemo(() => {
    if (!orgData) return ORGANISATIONS.map((o) => ({ id: null, name: o.value }));
    const arr = Array.isArray(orgData) ? orgData : (orgData?.data ?? []);
    return arr.map((o) => ({
      id: o.id ?? o._id ?? o.organization_id ?? o.org_id ?? null,
      name: (o.name ?? o.organization_name ?? "").trim(),
    }));
  }, [orgData]);

  const upcomingEvents = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const eventsArray = Array.isArray(data) ? data : (data?.data ?? []);
    return eventsArray.filter((e) => new Date(e.end_date) >= now);
  }, [data]);

  useEffect(() => {
    if (eventId) {
      setValue("event_id", eventId);
    }
  }, [eventId, setValue]);

  /* ================= POPULATE FORM IN EDIT MODE ================= */
  useEffect(() => {
    if (editManager && open) {
      const nameParts = editManager.name?.split(" ") || [];
      setValue("firstName", nameParts[0] || "");
      setValue("middleName", nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "");
      setValue("lastName", nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");
      setValue("email", editManager.email || "");
      setValue("ministry_name", editManager.ministry_name || "");
      setValue("organization_name", editManager.organization_name || "");
      if (editManager.event_id) {
        setValue("event_id", editManager.event_id);
      }
    }
  }, [editManager, open, setValue]);


  /* ================= CREATE/UPDATE MANAGER ================= */
  const { mutate, isLoading: submitting } = useMutation({
    mutationFn: (payload) => {
      if (editManager) {
        return updateEventManager(editManager.manager_id, payload);
      }
      return addEventManager(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["event-managers"]);
      queryClient.invalidateQueries({ queryKey: ["delegates-with-inviters"] });
      toast.success(editManager ? "Event Manager updated successfully" : "Event Manager added successfully");
      reset();
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || `Failed to ${editManager ? "update" : "add"} manager`);
    },
  });

  const onSubmit = (formData) => {
    if (formData.organization_name === "Others" && !customOrganization?.trim()) {
      toast.error("Please enter organization name");
      return;
    }
    const fullName = [
      formData.firstName,
      formData.middleName,
      formData.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const payload = {
      name: fullName,
      first_name: formData.firstName.trim(),
      last_name: formData.lastName?.trim() || "",
      email: formData.email.trim(),
    };

    // Add ministry or organization
    if (formData.ministry_name) {
      payload.ministry_name = formData.ministry_name;
    }

    if (formData.organization_name) {
      if (formData.organization_name === "Others") {
        payload.organization_name = customOrganization;
      } else {
        // try to find organization from fetched data (handle different response shapes)
        const orgList = Array.isArray(orgData) ? orgData : (orgData?.data ?? []);
        const found = orgList.find((o) => {
          const name = (o.name ?? o.organization_name ?? "").toString().trim().toLowerCase();
          return name === (formData.organization_name ?? "").toString().trim().toLowerCase();
        });
        const foundId = found?.id ?? found?._id ?? found?.organization_id ?? found?.org_id ?? null;
        if (found) {
          if (foundId !== null && foundId !== undefined) {
            payload.organization_id = foundId;
          }
          payload.organization_name = (found.name ?? found.organization_name ?? formData.organization_name).toString().trim();
        } else {
          // fallback: send the selected name
          payload.organization_name = formData.organization_name;
        }
      }
    }

    // Use eventId from props if available, otherwise use form selection
    if (eventId) {
      payload.event_id = eventId;
    } else if (formData.event_id && formData.event_id.trim()) {
      payload.event_id = formData.event_id.trim();
    }

    mutate(payload);
};

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 z-[200] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Drawer/Bottom Sheet - Mobile: slide-up, Desktop: slide-right */}
      <aside
        className={`fixed z-[201] bg-white shadow-xl flex flex-col transition-all duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-2xl
          sm:inset-auto sm:top-auto sm:max-h-[85vh]
          lg:right-5 lg:top-5 lg:bottom-5 lg:left-auto
          lg:w-[720px] lg:max-h-none lg:h-auto
          lg:rounded-2xl
          ${
            isAnimating 
              ? 'translate-y-0 lg:translate-y-0 lg:translate-x-0' 
              : 'translate-y-full lg:translate-y-0 lg:translate-x-full'
          }`}
        style={{ top: '64px', maxHeight: 'calc(100vh - 64px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
            {editManager ? "Edit Manager" : "Add Manager"}
          </h2>
          <button onClick={handleClose} type="button" className="hover:bg-gray-100 rounded-md p-1.5 sm:p-2 -mr-1">
            <X className="w-5 h-5 sm:w-5 lg:w-6 lg:h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 overflow-y-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
            {/* First Name */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-700 mb-1.5">
                First Name<span className="text-red-500">*</span>
              </label>
              <input
                {...register("firstName")}
                placeholder="Enter your First Name"
                className={`${inputBase} ${
                  errors.firstName ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            {/* Middle Name */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                Middle Name
              </label>
              <input
                {...register("middleName")}
                placeholder="Enter your Middle Name"
                className={`${inputBase} ${
                  errors.middleName ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                Last Name
              </label>
              <input
                {...register("lastName")}
                placeholder="Enter your Last Name"
                className={`${inputBase} ${
                  errors.lastName ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                Email<span className="text-red-500">*</span>
              </label>
              <input
                {...register("email")}
                className={`${inputBase} ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter your Email"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Ministry */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                Ministerial List
              </label>
              <div className="mt-1">
                <SearchableSelect
                  options={ministryOptions.map((m) => ({ value: m.value, label: m.value }))}
                  value={watch("ministry_name")}
                  onChange={(val) => setValue("ministry_name", val, { shouldDirty: true, shouldValidate: true })}
                  placeholder="Select"
                  maxVisible={5}
                  className=""
                />
              </div>
              {errors.ministry_name && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.ministry_name.message}
                </p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                Organization List
              </label>
              <div className="mt-1">
                <SearchableSelect
                  options={organizationOptions.map((o) => ({ value: o.name, label: o.name }))}
                  value={watch("organization_name")}
                  onChange={(val) => setValue("organization_name", val, { shouldDirty: true, shouldValidate: true })}
                  placeholder="Select"
                  maxVisible={5}
                  className=""
                />
              </div>
              {errors.organization_name && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.organization_name.message}
                </p>
              )}
            </div>

            {/* Custom Organization Text Input - Shows when "Others" is selected */}
            {organization_name === "Others" && (
              <div>
                <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                  Enter Organization Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter custom organization name"
                  value={customOrganization}
                  onChange={(e) => setCustomOrganization(e.target.value)}
                  className={`${inputBase} ${
                    organization_name === "Others" && !customOrganization
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
              </div>
            )}

            {/* Event */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-700 mb-1">Assign Event</label>
              {eventId ? (
                <div className={`${inputBase} bg-gray-50 flex items-center border-gray-300`}>
                  <span className="text-gray-700">
                    {upcomingEvents.find((e) => e._id === eventId)?.name || "Loading..."}
                  </span>
                </div>
              ) : (
                <div className="mt-1">
                  <SearchableSelect
                    options={upcomingEvents.map((e) => ({ value: e._id, label: e.name }))}
                    value={watch("event_id")}
                    onChange={(val) => setValue("event_id", val, { shouldDirty: true, shouldValidate: true })}
                    placeholder={isLoading ? "Loading events..." : "Select"}
                    maxVisible={5}
                    className=""
                  />
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-t flex justify-end gap-3">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={!isFormValid || submitting}
            className={`w-full sm:w-auto px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 rounded-lg text-white font-medium text-sm sm:text-base transition-colors min-h-[44px] ${
              isFormValid
                ? "bg-[#1e4788] hover:bg-[#163761] active:bg-[#0f2844]"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? (editManager ? "Updating..." : "Adding...") : (editManager ? "Update" : "Add")}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AddManagers;

