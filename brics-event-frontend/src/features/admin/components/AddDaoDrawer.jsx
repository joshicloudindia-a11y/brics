import { X, Trash2, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { createDaoForEvent, updateUserDetailsById } from "../../../services/auth";
import { getRoles } from "../../../services/roles";
import api from "../../../services/axios";
import { countries } from "../../../constants/eventCategories";
import { ORGANISATIONS } from "../../../constants/eventCategories";
import SearchableSelect from "../../../components/common/SearchableSelect";
/* ======================
   ZOD SCHEMA
====================== */
const daoSchema = z
  .object({
    firstName: z.string().min(1, "First Name is required"),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email"),
    citizenship: z.enum(["Indian", "Foreign"]),
    participantType: z.string().optional(),
    foreignRepType: z.string().optional(),
    country: z.string().optional(),
    organisation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validation for Indian citizenship
    if (data.citizenship === "Indian") {
      if (!data.participantType) {
        ctx.addIssue({
          path: ["participantType"],
          message: "Select participant type",
          code: z.ZodIssueCode.custom,
        });
      }
    }

    // Validation for Foreign citizenship
    if (data.citizenship === "Foreign") {
      if (!data.foreignRepType) {
        ctx.addIssue({
          path: ["foreignRepType"],
          message: "Select Country or Organisation",
          code: z.ZodIssueCode.custom,
        });
      }

      if (data.foreignRepType === "Country" && !data.country) {
        ctx.addIssue({
          path: ["country"],
          message: "Country is required",
          code: z.ZodIssueCode.custom,
        });
      }

      if (data.foreignRepType === "Organisation" && !data.organisation) {
        ctx.addIssue({
          path: ["organisation"],
          message: "Organisation is required",
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

const inputBase =
  "w-full h-12 px-4 border rounded-lg text-sm focus:outline-none focus:ring-[1px] focus:ring-[var(--color-primary-blue)] transition-all ";

/* ======================
   PARTICIPANT TYPE OPTIONS
====================== */
const INDIAN_PARTICIPANT_TYPES = [
  "Delegate",
  "Govt. officials",
  "Speakers",
  "Industry",
  "Academia",
  "Media",
  "Others",
];

const FOREIGN_PARTICIPANT_TYPES = ["DAO"];

/* ======================
   COMPONENT
====================== */
const AddDaoDrawer = ({ open, onClose, eventId, onSuccess, initialDaos = null, editMode = false }) => {
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState(false);
  const [daos, setDaos] = useState([
    {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      citizenship: "Indian",
      participantType: "",
    },
  ]);

  // If the drawer is opened in edit mode with initial data, prefill the form
  useEffect(() => {
    if (open && initialDaos && Array.isArray(initialDaos) && initialDaos.length > 0) {
      const mapped = initialDaos.map((d) => ({
        // Map backend dao shape to drawer shape
        firstName: d.first_name || d.firstName || d.first || "",
        middleName: d.middle_name || d.middleName || "",
        lastName: d.last_name || d.lastName || d.last || "",
        email: d.email || "",
        citizenship:
          d.citizenship ||
          (d.user?.country
            ? (String(d.user.country).toLowerCase() === "india" ? "Indian" : "Foreign")
            : d.country
            ? (String(d.country).toLowerCase() === "india" ? "Indian" : "Foreign")
            : "Indian"),
        participantType:
          d.participantType || d.role_name || d.role || d.user?.role?.name || "",
        foreignRepType: d.foreignRepType || "",
        country: d.country || d.user?.country || "",
        organisation:
          d.organisation || d.user?.organisation || d.user?.organisation_name || "",
        // Keep reference to user id for updating
        userId: d.user?.id || d.user_id || d.id || null,
      }));
      setDaos(mapped);
    }
  }, [open, initialDaos]);

  // If editing and we have user ids, fetch full user details to prefill role/organisation
  useEffect(() => {
    if (!open || !initialDaos || !Array.isArray(initialDaos)) return;
    const userIds = initialDaos
      .map((d) => d.user?.id || d.user_id || d.id)
      .filter(Boolean);
    if (userIds.length === 0) return;

    let ignore = false;

    const fetchDetails = async () => {
      try {
        const promises = userIds.map((id) => api.get(`/api/auth/users/${id}`));
        const results = await Promise.all(promises);
        if (ignore) return;

        const usersById = {};
        results.forEach((res) => {
          const user = res?.data || res;
          if (user && user.id) usersById[user.id] = user;
        });

        setDaos((prev) =>
          prev.map((item) => {
            const uid = item.userId || item.user_id || item.id;
            if (!uid) return item;
            const user = usersById[uid];
            if (!user) return item;

            // Prefer explicit role from user.role or item.role_name
            const roleName = user.role?.name || item.participantType || item.role_name;

            const org = user.organisation || item.organisation || user.organisation_name;

            const updated = {
              ...item,
              participantType: roleName || item.participantType,
              organisation: org || item.organisation,
            };

            // If organisation exists, set foreignRepType to Organisation so it shows preselected
            if (org) {
              updated.foreignRepType = "Organisation";
            }

            return updated;
          }),
        );
      } catch (err) {
        console.error("Failed to fetch user details for edit mode", err);
      }
    };

    fetchDetails();

    return () => {
      ignore = true;
    };
  }, [open, initialDaos]);

  // Fetch available event roles when drawer opens (used for edit mode)
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    const fetchRoles = async () => {
      try {
        const res = await getRoles();
        if (ignore) return;
        // getRoles returns response.data in service, but handle both shapes
        setRoles(res?.data || res || []);
      } catch (err) {
        console.error("Failed to fetch roles", err);
        setRoles([]);
      }
    };

    fetchRoles();
    return () => {
      ignore = true;
    };
  }, [open]);

  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ANIMATION TRIGGER */
  useEffect(() => {
    if (open) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  /* CLOSE WITH ANIMATION */
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  /* ESC KEY */
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && handleClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  /* BODY LOCK */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const update = (i, key, value) => {
    const copy = [...daos];
    copy[i][key] = value;

    // When citizenship changes
    if (key === "citizenship") {
      copy[i].participantType = "";

      if (value === "Foreign") {
        // ✅ DEFAULT to Country
        copy[i].foreignRepType = "Country";
        copy[i].country = "";
        copy[i].organisation = "";
      } else {
        // Reset foreign-only fields
        copy[i].foreignRepType = "";
        copy[i].country = "";
        copy[i].organisation = "";
      }
    }

    // When switching between Country / Organisation
    if (key === "foreignRepType") {
      copy[i].country = "";
      copy[i].organisation = "";
    }

    setDaos(copy);
  };

  /* ADD DAO CARD */
  const addDao = () => {
    setDaos([
      ...daos,
      {
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        citizenship: "Indian",
        participantType: "",
      },
    ]);
  };

  /* REMOVE DAO CARD */
  const removeDao = (i) => {
    if (daos.length === 1) return;
    setDaos(daos.filter((_, idx) => idx !== i));
  };

  /* ✅ GET PARTICIPANT TYPES BASED ON CITIZENSHIP */
  const getParticipantTypes = (citizenship) => {
    return citizenship === "Foreign"
      ? FOREIGN_PARTICIPANT_TYPES
      : INDIAN_PARTICIPANT_TYPES;
  };

  /* SUBMIT */
  const handleSubmit = async () => {
    const validationErrors = [];

    daos.forEach((dao, i) => {
      const result = daoSchema.safeParse(dao);
      if (!result.success) {
        const fieldErrors = {};
        result.error.issues.forEach((e) => {
          fieldErrors[e.path[0]] = e.message;
        });
        validationErrors[i] = fieldErrors;
      }
    });

    setErrors(validationErrors);

    const hasErrors = validationErrors.some(
      (err) => err && Object.keys(err).length > 0,
    );

    if (hasErrors) return;

    setIsSubmitting(true);

    try {
      // Clean the data before sending
      const cleanedDaos = daos.map((dao) => {
        const cleanDao = {
          firstName: dao.firstName,
          middleName: dao.middleName || undefined,
          lastName: dao.lastName || undefined,
          email: dao.email,
          citizenship: dao.citizenship,
          userId: dao.userId || dao.user_id || dao.id || null,
        };

        // For Indian citizenship - only send participantType
        if (dao.citizenship === "Indian") {
          cleanDao.participantType = dao.participantType;
        }

        // For Foreign citizenship - send foreignRepType and either country or organisation
        if (dao.citizenship === "Foreign") {
          cleanDao.foreignRepType = dao.foreignRepType;
          if (dao.foreignRepType === "Country") {
            cleanDao.country = dao.country;
          } else if (dao.foreignRepType === "Organisation") {
            cleanDao.organisation = dao.organisation;
          }
        }

        return cleanDao;
      });

      const payload = {
        daos: cleanedDaos,
      };

      if (editMode) {
        // Send cleaned DAOs to the same create API with userId included so backend can handle updates
        const editPayload = {
          daos: cleanedDaos.map((d) => ({
            ...d,
            userId: d.userId || d.user_id || d.id || null,
          })),
        };


        try {
          await createDaoForEvent(eventId, editPayload);
          toast.success("DAO(s) updated via create API");
          queryClient.invalidateQueries({ queryKey: ["delegates-with-inviters"] });
          onClose();
          if (onSuccess) onSuccess();
        } catch (err) {
          console.error("Failed to update DAOs via create API", err);
          toast.error("Failed to update DAO(s)");
        }
      } else {
        await createDaoForEvent(eventId, payload);

        toast.success("DAO(s) added successfully");
        // Invalidate the delegates query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["delegates-with-inviters"] });
        onClose();
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }

        setDaos([
          {
            firstName: "",
            middleName: "",
            lastName: "",
            email: "",
            citizenship: "Indian",
            participantType: "",
          },
        ]);
        setErrors([]);
      }
    } catch (error) {
      toast.error("Failed to add DAO. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* OVERLAY - Full screen without gaps */}
      <div 
        className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${
          isAnimating ? 'opacity-40' : 'opacity-0'
        }`}
        onClick={handleClose}
        style={{ margin: 0, padding: 0 }}
      />

      {/* DRAWER - Mobile: bottom sheet, Desktop: side drawer */}
      <aside
        className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-2xl
          sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
          md:w-[600px] lg:w-[620px]
          ${
            isAnimating 
              ? 'translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100' 
              : 'translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0'
          }`}
        style={{ top: '64px', maxHeight: 'calc(100vh - 64px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold">{editMode ? "Edit DAO" : "Add DAO"}</h2>
          <button
            onClick={handleClose}
            type="button"
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md -mr-1"
          >
            <X size={20} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
          {daos.map((dao, i) => (
            <div key={i} className="bg-[#f9fafd] rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">DAO - {i + 1}</p>
                {daos.length > 1 && (
                  <button
                    onClick={() => removeDao(i)}
                    className="flex items-center gap-1 text-red-600 text-xs hover:text-red-700"
                  >
                    <Trash2Icon size={14} />
                    Remove
                  </button>
                )}
              </div>

              {/* FIRST + MIDDLE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm text-[#212121]">First Name <span className="text-red-500">*</span></label>
                  <input
                    placeholder="Enter your First Name"
                    className={`${inputBase} ${editMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    value={dao.firstName}
                    onChange={(e) => update(i, "firstName", e.target.value)}
                    disabled={editMode}

                  />
                  {errors[i]?.firstName && (
                    <p className="text-xs text-red-500">
                      {errors[i].firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-[#212121]">Middle Name</label>
                  <input
                    placeholder="Enter your Middle Name"
                    className={`${inputBase} ${editMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    value={dao.middleName}
                    onChange={(e) => update(i, "middleName", e.target.value)}
                    disabled={editMode}

                  />
                </div>
              </div>

              {/* LAST + EMAIL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm text-[#212121]">Last Name</label>
                  <input
                    placeholder="Enter your Last Name"
                    className={`${inputBase} ${editMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    value={dao.lastName}
                    onChange={(e) => update(i, "lastName", e.target.value)}
                    disabled={editMode}

                  />
                </div>

                <div>
                  <label className="text-sm text-[#212121]">Email <span className="text-red-500">*</span></label>
                  <input
                    placeholder="Enter your Email ID"
                    className={`${inputBase} ${editMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    value={dao.email}
                    onChange={(e) => update(i, "email", e.target.value)}
                    disabled={editMode}
                  />
                  {errors[i]?.email && (
                    <p className="text-xs text-red-500">{errors[i].email}</p>
                  )}
                </div>
                {/* When editing, allow selecting Role from server-side roles list */}
                {editMode && roles.length > 0 && (
                  <div className="w-full sm:w-1/2">
                    <label className="text-sm text-[#212121]">Role <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      options={roles.map((r) => ({ value: r.name, label: r.name }))}
                      value={dao.participantType}
                      onChange={(val) => update(i, "participantType", val)}
                      placeholder="Select"
                      searchable
                      sort
                      maxVisible={5}
                      className={inputBase}
                    />
                    {errors[i]?.participantType && (
                      <p className="text-xs text-red-500">{errors[i].participantType}</p>
                    )}
                  </div>
                )}
              </div>

              {/* CITIZENSHIP */}
              <div>
                <label className="text-sm text-[#212121] block mb-2">
                  Citizenship
                </label>
                <div className="flex gap-4 text-sm">
                  {[
                    { value: "Indian", label: "Indian" },
                    { value: "Foreign", label: "Foreign National" },
                  ].map((c) => (
                    <label
                      key={c.value}
                      className="flex gap-2 items-center cursor-pointer"
                    >
                      <input
                        type="radio"
                        checked={dao.citizenship === c.value}
                        onChange={() => update(i, "citizenship", c.value)}
                        className="sr-only"
                      />
                      {/* Custom Radio Circle */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          dao.citizenship === c.value
                            ? "border-[var(--color-primary-blue)]"
                            : "border-gray-300"
                        }`}
                      >
                        {/* Inner dot */}
                        <div
                          className={`w-2 h-2 rounded-full bg-[var(--color-primary-blue)] transition-all duration-200 ${
                            dao.citizenship === c.value
                              ? "scale-100 opacity-100"
                              : "scale-0 opacity-0"
                          }`}
                        />
                      </div>
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* SHOW ONLY FOR INDIAN */}
              {dao.citizenship === "Indian" && (
                <div className="w-full sm:w-1/2">
                  <label className="text-sm text-[#212121]">
                    Participant Type <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={getParticipantTypes(dao.citizenship).map((t) => ({ value: t, label: t }))}
                    value={dao.participantType}
                    onChange={(val) => update(i, "participantType", val)}
                    placeholder="Select"
                    searchable
                    sort
                    maxVisible={5}
                    className={inputBase}
                  />
                  {errors[i]?.participantType && (
                    <p className="text-xs text-red-500">
                      {errors[i].participantType}
                    </p>
                  )}
                </div>
              )}

              {/* SHOW ONLY FOR FOREIGN */}
              {dao.citizenship === "Foreign" && (
                <>
                  <div>
                    <label className="text-sm text-[#212121] block mb-2">
                      Representing a country or organisation?
                    </label>

                    <div className="flex gap-4 text-sm">
                      {/* "Country", "Organisation" */}
                      {["Country","Organisation"].map((type) => (
                        <label
                          key={type}
                          className="flex gap-2 items-center cursor-pointer"
                        >
                          <input
                            type="radio"
                            checked={dao.foreignRepType === type}
                            onChange={() => update(i, "foreignRepType", type)}
                            className="sr-only"
                          />
                          {/* Custom Radio Circle */}
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              dao.foreignRepType === type
                                ? "border-[var(--color-primary-blue)]"
                                : "border-gray-300"
                            }`}
                          >
                            {/* Inner dot */}
                            <div
                              className={`w-2 h-2 rounded-full bg-[var(--color-primary-blue)] transition-all duration-200 ${
                                dao.foreignRepType === type
                                  ? "scale-100 opacity-100"
                                  : "scale-0 opacity-0"
                              }`}
                            />
                          </div>
                          {type}
                        </label>
                      ))}
                    </div>

                    {errors[i]?.foreignRepType && (
                      <p className="text-xs text-red-500">
                        {errors[i].foreignRepType}
                      </p>
                    )}
                  </div>

                  {dao.foreignRepType === "Country" && (
                    <div className="w-full sm:w-1/2">
                      <label className="text-sm text-[#212121]">
                        Select Country <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={countries.map((c) => ({ value: c.value, label: c.label }))}
                        value={dao.country}
                        onChange={(val) => update(i, "country", val)}
                        placeholder="Select"
                        searchable
                        sort
                        maxVisible={5}
                        className={inputBase}
                      />
                      {errors[i]?.country && (
                        <p className="text-xs text-red-500">
                          {errors[i].country}
                        </p>
                      )}
                    </div>
                  )}

                  {dao.foreignRepType === "Organisation" && (
                    <div className="w-full sm:w-1/2">
                      <label className="text-sm text-[#212121]">
                        Select Organisation <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={ORGANISATIONS.map((org) => ({ value: org.value, label: org.value }))}
                        value={dao.organisation}
                        onChange={(val) => update(i, "organisation", val)}
                        placeholder="Select"
                        searchable
                        sort
                        maxVisible={5}
                        className={inputBase}
                      />
                      {errors[i]?.organisation && (
                        <p className="text-xs text-red-500">
                          {errors[i].organisation}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {!editMode &&  <button
            onClick={addDao}
            className="text-[var(--color-primary-blue)] text-sm font-medium"
          >
            Add More DAOs
          </button>
          } 
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex justify-end">
          <button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-[var(--color-primary-blue)] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg disabled:bg-gray-400 text-sm sm:text-base font-medium"
          >
            {isSubmitting ? (editMode ? "Updating..." : "Adding...") : editMode ? "Update" : "Add"}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AddDaoDrawer;

