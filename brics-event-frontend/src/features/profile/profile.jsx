import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { saveUserProfile } from "../../services/auth";
import { toast } from "react-toastify";
import { FiUpload } from "react-icons/fi";
import {
  getUserDetails,
  updateUserDetails,
  updateUserDetailsById,
} from "../../services/auth";
import { FaCamera } from "react-icons/fa";
import { fileToBase64 } from "../../utils/fileToBase64";

import { countries } from "../../constants/eventCategories";
import SearchableSelect from "../../components/common/SearchableSelect";
import { getDesignations, createDesignation } from "../../services/designations";

const documentValidators = {
  pan: {
    regex: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    message: "Enter a valid PAN number (e.g. ABCDE1234F)",
  },
  driving_license: {
    regex: /^[A-Z]{2}[0-9]{2}[0-9A-Z]{11}$/,
    message: "Enter a valid Driving License number",
  },
  voter_id: {
    regex: /^[A-Z]{3}[0-9]{7}$/,
    message: "Enter a valid Voter ID number",
  },
  passport: {
    regex: /^[A-Z][0-9]{7}$/,
    message: "Enter a valid Passport number",
  },
  national_id: {
    regex: /^[0-9]{12}$/,
    message: "Enter a valid 12-digit National ID number",
  },
};

const normalizeDocumentType = (value) => {
  if (!value) return undefined;
  const raw = value.toString().toLowerCase();
  if (raw === "undefined" || raw === "null") return undefined;
  if (raw.includes("pan")) return "pan";
  if (raw.includes("driving")) return "driving_license";
  if (raw.includes("voter")) return "voter_id";
  if (raw.includes("passport")) return "passport";
  if (raw.includes("national")) return "national_id";
  return undefined;
};

const normalizeDocumentNumber = (value) => {
  if (!value) return "";
  const trimmed = value.toString().trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined") {
    return "";
  }
  return trimmed.toUpperCase();
};

// Updated schema - removed DOB and citizenship fields
const profileSchema = z
  .object({
    // Personal Information
    title: z.string().nullable().optional().transform(val => val || ""),
    firstName: z.string().min(2, "First name is required"),
    middleName: z.string().nullable().optional().transform(val => val || ""),
    surname: z.string().min(1, "Surname is required"),
    country: z.string().min(1, "Please select country"),
    phoneNumber: z.string().trim().min(10, "Phone number is required"),
    email: z.string().email("Invalid email address"),
    designation: z.string().min(1, "Designation is required"),
    customDesignation: z.string().nullable().optional().transform(val => val || ""),
    ministryName: z.string().nullable().optional().transform(val => val || ""),
    positionHeldSince: z
      .string()
      .nullable()
      .optional()
      .transform(val => val || "")
      .refine(
        (value) => {
          if (!value) return true;

          const parts = value.split("-");
          if (parts.length !== 3) {
            return false;
          }

          const [year, month, day] = parts.map((part) => Number(part));
          if ([year, month, day].some((num) => Number.isNaN(num))) {
            return false;
          }

          const selectedDate = new Date(year, month - 1, day);
          if (Number.isNaN(selectedDate.getTime())) {
            return false;
          }

          const today = new Date();
          selectedDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          return selectedDate <= today;
        },
        {
          message: "Please select a past or current date",
        },
      ),
    gender: z.string().nullable().optional().transform(val => val || ""),

    photoIdType: z.string().nullable().optional().transform(val => val || ""),
    photoIdNumber: z.string().nullable().optional().transform(val => val || ""),

    bloodGroup: z.string().nullable().optional().transform(val => val || ""),
    medicalConditions: z.string().nullable().optional().transform(val => val || ""),

    // Passport Details - conditional
    passportType: z.string().nullable().optional().transform(val => val || ""),
    passportNumber: z.string().nullable().optional().transform(val => val || ""),
    placeOfIssue: z.string().nullable().optional().transform(val => val || ""),
    passportExpiry: z.string().nullable().optional().transform(val => val || ""),

    // Documents
    passportFile: z.any().optional(),
    photoFile: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    // Designation validation
    if (data.designation === "others" && (!data.customDesignation || data.customDesignation.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Designation is required",
        path: ["customDesignation"],
      });
    }
    
    if (data.designation === "minister" && (!data.ministryName || data.ministryName.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ministry name is required",
        path: ["ministryName"],
      });
    }
    
    // 🇮🇳 Photo ID mandatory ONLY for India
    if (data.country === "india") {
      if (!data.photoIdType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select photo ID document type",
          path: ["photoIdType"],
        });
      }

      const docNumber = data.photoIdNumber?.replace(/\s+/g, "") || "";
      if (!docNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Document number is required",
          path: ["photoIdNumber"],
        });
      } else {
        const validator = documentValidators[data.photoIdType];
        if (validator) {
          const normalized = docNumber.toUpperCase();
          if (!validator.regex.test(normalized)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validator.message,
              path: ["photoIdNumber"],
            });
          }
        } else if (docNumber.length < 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter valid document number",
            path: ["photoIdNumber"],
          });
        }
      }
    }
    // If country is not India, passport fields are required
    if (data.country && data.country !== "india") {
      if (!data.passportType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select passport type",
          path: ["passportType"],
        });
      }
      if (!data.passportNumber || data.passportNumber.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passport number required",
          path: ["passportNumber"],
        });
      }
      if (!data.placeOfIssue || data.placeOfIssue.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Place of issue required",
          path: ["placeOfIssue"],
        });
      }
      if (!data.passportExpiry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date required",
          path: ["passportExpiry"],
        });
      }
    }
  });

const profile = ({
  onNext,
  onBack,
  defaultValues,
  userId,
  onProfileUpdate,
}) => {
  const queryClient = useQueryClient();
  const [passportFile, setPassportFile] = useState(null);
  const [passportDocumentUrl, setPassportDocumentUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [phoneCode, setPhoneCode] = useState("+91");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isPhotoDragActive, setIsPhotoDragActive] = useState(false);
  const [isPassportDragActive, setIsPassportDragActive] = useState(false);
  const [hasNewPhoto, setHasNewPhoto] = useState(false);
  const [hasNewPassport, setHasNewPassport] = useState(false);
  const [customDesignationLoading, setCustomDesignationLoading] = useState(false);

  // Function to convert S3 image URL to base64 for better compatibility
  const loadImageAsBase64 = async (url) => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const blob = await res.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return null;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: "onBlur", // Only validate on blur, not on every change
    defaultValues: defaultValues || {
      country: "india",
    },
    shouldFocusError: false,
  });

  // Update form when defaultValues changes
  useEffect(() => {
    if (defaultValues) {
      // Map position field to designation for proper form prefilling
      const normalizedDefaults = {
        ...defaultValues,
        designation: defaultValues.designation || defaultValues.position,
      };
      
      reset(normalizedDefaults);
      // Set photo preview from user data if available
      if (defaultValues.photoUrl) {
        loadImageAsBase64(defaultValues.photoUrl)
          .then((base64) => {
            if (base64) setPhotoPreview(base64);
          })
          .catch((err) => {
            setPhotoPreview(defaultValues.photoUrl); // Fallback to direct URL
          });
      }
    }
  }, [defaultValues, reset]);

  const presetDesignationOptions = [
    { value: "minister", label: "Minister" },
    { value: "sherpa", label: "Sherpa" },
    { value: "sous-sherpa", label: "Sous Sherpa" },
    { value: "ambassador", label: "Ambassador" },
    { value: "dcm", label: "DCM" },
    { value: "councillor", label: "Councillor" },
    { value: "1st-secretary", label: "1st Secretary" },
    { value: "2nd-secretary", label: "2nd Secretary" },
    { value: "3rd-secretary", label: "3rd Secretary" },
    { value: "attache", label: "Attache" },
  ];

  // Fetch designations from API
  const { data: designationsResponse } = useQuery({
    queryKey: ["designations"],
    queryFn: () => getDesignations({ active: true }),
    enabled: true,
  });

  const customDesignations = useMemo(() => {
    if (!designationsResponse?.data) return [];
    return designationsResponse.data.map(d => ({
      value: d.designation_name.toLowerCase(),
      label: d.designation_name,
    }));
  }, [designationsResponse]);

  const allDesignationOptions = useMemo(() => {
    const baseOptions = [
      ...presetDesignationOptions,
      ...customDesignations,
    ];
    
    // Sort alphabetically but keep "Others" at the end
    const sortedOptions = baseOptions.sort((a, b) => a.label.localeCompare(b.label));
    
    return [
      ...sortedOptions,
      { value: "others", label: "Others" },
    ];
  }, [presetDesignationOptions, customDesignations]);

  const photoIdTypes = [
    { value: "pan", label: "PAN Card", placeholder: "Enter PAN Card Number" },
    {
      value: "driving_license",
      label: "Driving License",
      placeholder: "Enter Driving License Number",
    },
    {
      value: "voter_id",
      label: "Voter ID",
      placeholder: "Enter Voter ID Number",
    },
    {
      value: "passport",
      label: "Passport",
      placeholder: "Enter Passport Number",
    },
    {
      value: "national_id",
      label: "National ID",
      placeholder: "Enter National ID Number",
    },
  ];

  const selectedCountry = watch("country");
  const selectedDesignation = watch("designation");
  const showPassportSection = selectedCountry && selectedCountry !== "india";
  const showCustomDesignation = selectedDesignation === "others" || (defaultValues?.designation === "others" && !selectedDesignation) || (defaultValues?.position === "others" && !selectedDesignation);
  const showMinistryName = selectedDesignation === "minister" || (defaultValues?.designation === "minister" && !selectedDesignation) || (defaultValues?.position === "minister" && !selectedDesignation);

  const selectedPhotoIdType = watch("photoIdType");
  const selectedPhotoIdPlaceholder =
    photoIdTypes.find((d) => d.value === selectedPhotoIdType)?.placeholder ||
    "Enter Document Number";

  const getTodayInputValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getTodayInputValue();

  // Update phone code when country changes
  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find((c) => c.value === selectedCountry);
      if (country && country.phoneCode) {
        setPhoneCode(country.phoneCode);
      }
    }
  }, [selectedCountry]);

  const processFileSelection = (file, type) => {
    if (!file) return false;

    if (type === "photo") {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Only JPEG, JPG, and PNG files are allowed for profile photo",
        );
        return false;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Profile photo size must not exceed 5 MB");
        return false;
      }

      setPhotoFile(file);
      setValue("photoFile", file, { shouldValidate: true });
      const preview = URL.createObjectURL(file);
      setPhotoPreview(preview);
      setHasNewPhoto(true);
      return true;
    }

    if (type === "passport") {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Only JPEG, JPG, PNG, and PDF files are allowed for passport document",
        );
        return false;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Passport document size must not exceed 5 MB");
        return false;
      }
      setPassportFile(file);
      setValue("passportFile", file, { shouldValidate: true });
      setHasNewPassport(true);
      return true;
    }

    return false;
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files && event.target.files[0];
    const isValid = processFileSelection(file, type);
    if (!isValid) {
      event.target.value = "";
    }
  };

  const handlePhotoDragOver = (event) => {
    event.preventDefault();
    setIsPhotoDragActive(true);
  };

  const handlePhotoDragLeave = (event) => {
    event.preventDefault();
    setIsPhotoDragActive(false);
  };

  const handlePhotoDrop = (event) => {
    event.preventDefault();
    setIsPhotoDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    processFileSelection(file, "photo");
  };

  const handlePassportDragOver = (event) => {
    event.preventDefault();
    setIsPassportDragActive(true);
  };

  const handlePassportDragLeave = (event) => {
    event.preventDefault();
    setIsPassportDragActive(false);
  };

  const handlePassportDrop = (event) => {
    event.preventDefault();
    setIsPassportDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    processFileSelection(file, "passport");
  };

  const titles = [
    { value: "mr", label: "Mr." },
    { value: "mrs", label: "Mrs." },
    { value: "ms", label: "Ms." },
    { value: "dr", label: "Dr." },
    { value: "prof", label: "Prof." },
  ];

  const genders = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Prefer Not to Say" },
  ];

  const bloodGroups = [
    { value: "a+", label: "A+" },
    { value: "a-", label: "A-" },
    { value: "b+", label: "B+" },
    { value: "b-", label: "B-" },
    { value: "o+", label: "O+" },
    { value: "o-", label: "O-" },
    { value: "ab+", label: "AB+" },
    { value: "ab-", label: "AB-" },
  ];

  const passportTypes = [
    { value: "ordinary", label: "Ordinary" },
    { value: "diplomatic", label: "Diplomatic" },
    { value: "official", label: "Official" },
  ];

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    if (selectedCountry !== "india") {
      setValue("photoIdType", undefined);
      setValue("photoIdNumber", undefined);
    }
  }, [selectedCountry, setValue]);

  // Handle prefilling when defaultValues are provided (viewing another user)
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
      if (defaultValues.photoUrl) {
        loadImageAsBase64(defaultValues.photoUrl)
          .then((base64) => {
            if (base64) setPhotoPreview(base64);
          })
          .catch((err) => {
            setPhotoPreview(defaultValues.photoUrl); // Fallback to direct URL
          });
      }
      if (defaultValues.passportDocumentUrl) {
        setPassportFile({
          name: "Passport already uploaded",
        });
        setPassportDocumentUrl(defaultValues.passportDocumentUrl);
      }
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // If defaultValues are provided (viewing another user), skip loading current user
        if (defaultValues) {
          return;
        }

        const res = await getUserDetails();
        const user = res.user;

        reset({
          title: user.title?.toLowerCase(),
          firstName: user.first_name,
          middleName: user.middle_name,
          surname: user.last_name,
          country: user.country,
          phoneNumber: user.mobile,
          email: user.email,
          designation: user.position,
          customDesignation: user.custom_designation || "",
          ministryName: user.ministry_name || "",
          positionHeldSince: user.position_held_since
            ? user.position_held_since.split("T")[0]
            : "",
          gender: user.gender?.toLowerCase(),
          photoIdType: normalizeDocumentType(user.document_type),
          photoIdNumber: normalizeDocumentNumber(user.document_number),
          bloodGroup: user.blood_group,
          medicalConditions: user.medical_conditions,
          passportType: user.passport?.passport_type?.toLowerCase(),
          passportNumber: user.passport?.passport_number,
          placeOfIssue: user.passport?.place_of_issue,
          passportExpiry: user.passport?.expiry_date
            ? user.passport.expiry_date.split("T")[0]
            : "",
          profile: user?.documents?.profile,
        });

        if (user?.documents?.photo_url) {
          loadImageAsBase64(user.documents.photo_url)
            .then((base64) => {
              if (base64) setPhotoPreview(base64);
            })
            .catch((err) => {
              setPhotoPreview(user.documents.photo_url); // Fallback to direct URL
            });
        }

        if (user?.documents?.passport_document_url) {
          setPassportFile({
            name: "Passport already uploaded",
          });
          setPassportDocumentUrl(user?.documents?.passport_document_url);
        }
      } catch (err) {
        // only show if not auth issue
        if (err?.response?.status !== 401) {
          toast.error("Failed to load profile");
        }
      }
    };

    loadProfile();
  }, [reset, defaultValues]);

  const onSubmitValid = async (data) => {
    try {
      if (!photoFile && !photoPreview) {
        toast.error("Photo is required");
        return;
      }

      // Check if there are any changes
      const hasChanges = userId ? true : isDirty || hasNewPhoto || hasNewPassport;
      if (!hasChanges) {
        toast.info("No changes detected");
        return;
      }

      // ===== BUILD REQUEST PAYLOAD =====
      const payload = {
        title: data.title || "",
        first_name: data.firstName,
        middle_name: data.middleName || "",
        last_name: data.surname || "",
        mobile: data.phoneNumber || "",
        country: data.country,
        // position will be assigned after handling custom/ministry designations
        custom_designation: data.customDesignation || "",
        ministry_name: data.ministryName || "",
        position_held_since: data.positionHeldSince || "",
        gender: data.gender || "",
        document_type: data.photoIdType || "",
        document_number: data.photoIdNumber ? data.photoIdNumber.toUpperCase() : "",
        blood_group: data.bloodGroup || "",
        medical_conditions: data.medicalConditions || "",
      };

      // ===== PASSPORT (if applicable) =====
      if (data.country !== "india") {
        payload.passport_type = data.passportType;
        payload.passport_number = data.passportNumber;
        payload.place_of_issue = data.placeOfIssue;
        payload.expiry_date = data.passportExpiry;
      }

      // ===== DESIGNATION MASTER INSERTION =====
      // Handle custom designation creation and ensure the form and payload
      // use the created designation so the dropdown shows it immediately.
      let finalDesignationValue = data.designation;

      // Store Enter Designation when "Others" is selected
      if (data.designation === "others" && data.customDesignation) {
        finalDesignationValue = data.customDesignation.toLowerCase();
        try {
          setCustomDesignationLoading(true);
          await createDesignation({ designation_name: data.customDesignation });
          // optimistically add the new designation into the cache so the select shows it immediately
          try {
            queryClient.setQueryData(["designations"], (old) => {
              if (!old || !old.data) return old;
              const exists = old.data.find(d => d.designation_name.toLowerCase() === data.customDesignation.toLowerCase());
              if (exists) return old;
              return { ...old, data: [...old.data, { designation_name: data.customDesignation }] };
            });
          } catch (e) {}
          // ensure designations query is refetched so the new value appears
          await queryClient.invalidateQueries(["designations"]);
        } catch (err) {
          if (err?.response?.status !== 409) {
            console.warn("Failed to create Enter Designation:", err);
          }
        } finally {
          setCustomDesignationLoading(false);
        }

        // update form value so UI reflects saved designation immediately
        try {
          setValue("designation", finalDesignationValue, { shouldValidate: true });
        } catch (e) {}
      }

      // Store ministry name when "Minister" is selected — save ministry name as designation too
      if (data.designation === "minister" && data.ministryName) {
        const ministryVal = data.ministryName.toLowerCase();
        try {
          setCustomDesignationLoading(true);
          await createDesignation({ designation_name: data.ministryName });
          try {
            queryClient.setQueryData(["designations"], (old) => {
              if (!old || !old.data) return old;
              const exists = old.data.find(d => d.designation_name.toLowerCase() === data.ministryName.toLowerCase());
              if (exists) return old;
              return { ...old, data: [...old.data, { designation_name: data.ministryName }] };
            });
          } catch (e) {}
          await queryClient.invalidateQueries(["designations"]);
        } catch (err) {
          if (err?.response?.status !== 409) {
            console.warn("Failed to create ministry designation:", err);
          }
        } finally {
          setCustomDesignationLoading(false);
        }

        finalDesignationValue = ministryVal;
        try {
          setValue("designation", finalDesignationValue, { shouldValidate: true });
        } catch (e) {}
      }

      // ensure payload position uses finalDesignationValue (handles 'others' and minister)
      payload.position = finalDesignationValue;

      // ===== FILES - Convert to base64 ONLY if new files =====
      if (photoFile && hasNewPhoto) {
        payload.photo = await fileToBase64(photoFile);
      }

      if (passportFile && hasNewPassport) {
        payload.passport_document = await fileToBase64(passportFile);
      }

      // Use appropriate update function based on whether we're updating another user or current user
      if (userId) {
        try {
          await updateUserDetailsById(userId, payload);
          toast.success("Profile updated successfully");
          // Invalidate delegates query to refresh the data
          queryClient.invalidateQueries({
            queryKey: ["delegates-with-inviters"],
          });
          // Call callback if provided
          if (onProfileUpdate) {
            onProfileUpdate();
          }
        } catch (updateError) {
          console.error("Profile update error:", updateError);
          // Check if it's a 500 error but data was actually updated
          if (updateError?.response?.status === 500) {
            toast.warning("Profile updated but server returned an error. Please refresh the page to verify changes.");
            // Still invalidate queries in case update was successful
            queryClient.invalidateQueries({
              queryKey: ["delegates-with-inviters"],
            });
            if (onProfileUpdate) {
              onProfileUpdate();
            }
          } else {
            throw updateError; // Re-throw for general error handling
          }
        }
      } else {
        await updateUserDetails(payload);
        toast.success("Profile updated successfully");
        // Reset form state to mark as pristine (no changes)
        reset({}, { keepValues: true });
        // Reset file upload flags
        setHasNewPhoto(false);
        setHasNewPassport(false);
      }
    } catch (err) {
      // Handle error silently
      // Handle specific error cases
      if (err?.response?.status === 401) {
        toast.error(
          err?.response?.data?.message ||
            "Your session has expired. Please log in again.",
        );
      } else if (err?.response?.status === 403) {
        toast.error(
          err?.response?.data?.message ||
            "You don't have permission to update this profile",
        );
      } else {
        toast.error(err?.response?.data?.message || "Update failed");
      }
    }
  };

  const onSubmitInvalid = (errors) => {
    try {
      // Find first field name in errors
      const firstKey = Object.keys(errors || {})[0];
      if (!firstKey) return;
      // Try to find element by name
      let el = document.querySelector(`[name="${firstKey}"]`);
      if (!el) {
        // fallback: any element with aria-invalid
        el = document.querySelector('[aria-invalid="true"]');
      }
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmitValid, onSubmitInvalid)}
      className="space-y-8 w-full md:max-w-3xl mx-auto bg-white  p-6 rounded-2xl my-6"
    >
      {/* Personal Information Section */}
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Personal Information
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Please provide your personal details
            </p>
          </div>

          <div className="mt-4">
            {/* Whole circle is clickable */}
            <label
              htmlFor="photo-upload"
              onDragOver={handlePhotoDragOver}
              onDragLeave={handlePhotoDragLeave}
              onDrop={handlePhotoDrop}
              className={`border-2 w-32 h-32 rounded-full
              ${isPhotoDragActive ? "border-[#1e4788] bg-blue-50" : "border-gray-300"}
              hover:border-[#1e4788] transition-colors
              flex items-center justify-center
              cursor-pointer overflow-hidden relative`}
            >
              <input
                type="file"
                id="photo-upload"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "photo")}
              />

              {/* If NO photo */}
              {!photoPreview && (
                <p className="text-sm text-gray-600 text-center px-2">
                  Click or drag to upload photo
                </p>
              )}

              {/* If photo exists */}
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover rounded-full"
                />
              )}
            </label>
            {!photoPreview ? (
              <label className="block text-xs mt-1 text-gray-700 mb-2 text-center">
                Upload your Photo<span className="text-red-500">*</span>
              </label>
            ) : (
              <div className="text-center mt-2">
                <p className="text-xs text-gray-600">
                  Changed Photo<span className="text-red-500">*</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <SearchableSelect
              options={titles}
              value={watch("title")}
              onChange={(val) =>
                setValue("title", val, { shouldDirty: true, shouldValidate: true })
              }
              placeholder="Select Your Title"
              maxVisible={5}
              className=""
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">
                {errors.title.message}
              </p>
            )}
          </div>
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your First Name"
              {...register("firstName")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>
          {/* Middle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Middle Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter your Middle Name"
              {...register("middleName")}
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              style={{ minHeight: '44px' }}
            />
          </div>
          {/* Surname/Lastname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Surname/Lastname<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your Surname"
              {...register("surname")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.surname ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.surname && (
              <p className="text-red-500 text-xs mt-1">
                {errors.surname.message}
              </p>
            )}
          </div>
          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country<span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={countries}
              value={watch("country")}
              onChange={(val) =>
                setValue("country", val, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder="Select"
              className=""
              maxVisible={5}
            />
            {errors.country && (
              <p className="text-red-500 text-xs mt-1">
                {errors.country.message}
              </p>
            )}
          </div>
          {/* Phone Number */}
          <div className="">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number (Preferably Whatsapp Enabled)<span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className="w-20 sm:w-24 px-2 py-3 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white appearance-none"
                style={{ minHeight: '44px' }}
              >
                {countries.map((country) => (
                  <option key={country.value} value={country.phoneCode}>
                    {country.phoneCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter Your Mobile Number"
                {...register("phoneNumber")}
                onKeyDown={(event) => {
                  const allowedKeys = [
                    "Backspace",
                    "Tab",
                    "ArrowLeft",
                    "ArrowRight",
                    "Delete",
                  ];
                  if (allowedKeys.includes(event.key)) {
                    return;
                  }
                  if (!/[0-9]/.test(event.key)) {
                    event.preventDefault();
                  }
                }}
                onInput={(event) => {
                  const sanitizedValue = event.target.value.replace(
                    /[^0-9]/g,
                    "",
                  );
                  event.target.value = sanitizedValue;
                  setValue("phoneNumber", sanitizedValue, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                maxLength={15}
                minLength={10}
                className={`flex-1 px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.phoneNumber ? "border-red-500" : "border-gray-300"
                }`}
                style={{ minHeight: '44px' }}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>
          {/* Registered Email ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registered Email ID<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              disabled
              {...register("email")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-gray-100 cursor-not-allowed${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          {/* Designation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Designation<span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={allDesignationOptions}
              value={watch("designation")}
              onChange={(val) =>
                setValue("designation", val, { shouldDirty: true, shouldValidate: true })
              }
              placeholder="Select Your Designation"
              className={`${
                errors.designation ? "border-red-500" : "border-gray-300"
              }`}
              maxVisible={5}
            />
            {errors.designation && (
              <p className="text-red-500 text-xs mt-1">
                {errors.designation.message}
              </p>
            )}
          </div>
          {/* Enter Designation - Show only when "Others" is selected */}
          {showCustomDesignation && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Designation<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Your Designation"
                {...register("customDesignation")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.customDesignation ? "border-red-500" : "border-gray-300"
                }`}
                style={{ minHeight: '44px' }}
              />
              {errors.customDesignation && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.customDesignation.message}
                </p>
              )}
            </div>
          )}
          {/* Ministry Name - Show only when "Minister" is selected */}
          {showMinistryName && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ministry Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Ministry Name"
                {...register("ministryName")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.ministryName ? "border-red-500" : "border-gray-300"
                }`}
                style={{ minHeight: '44px' }}
              />
              {errors.ministryName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.ministryName.message}
                </p>
              )}
            </div>
          )}
          {/* Position held since (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position held since (Optional)
            </label>
            <input
              type="date"
              {...register("positionHeldSince")}
              max={today}
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
            />
            {errors.positionHeldSince && (
              <p className="text-red-500 text-xs mt-1">
                {errors.positionHeldSince.message}
              </p>
            )}
          </div>
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender (Optional)
            </label>
            <SearchableSelect
              options={genders}
              value={watch("gender")}
              onChange={(val) =>
                setValue("gender", val, { shouldDirty: true, shouldValidate: true })
              }
              placeholder="Select Your Gender"
              maxVisible={5}
              className=""
            />
          </div>
          {selectedCountry === "india" && (
            <>
              {/* Photo ID Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo ID Document Type<span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={photoIdTypes}
                  value={watch("photoIdType")}
                  onChange={(val) =>
                    setValue("photoIdType", val, { shouldDirty: true, shouldValidate: true })
                  }
                  placeholder="Select Document Type"
                  maxVisible={5}
                />
                {errors.photoIdType && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.photoIdType.message}
                  </p>
                )}
              </div>

              {/* Photo ID Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Number<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={selectedPhotoIdPlaceholder}
                  {...register("photoIdNumber")}
                  onInput={(event) => {
                    const sanitizedValue = event.target.value
                      .toUpperCase()
                      .replace(/\s+/g, "");
                    event.target.value = sanitizedValue;
                    setValue("photoIdNumber", sanitizedValue, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                    errors.photoIdNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  style={{ minHeight: '44px' }}
                />
                {errors.photoIdNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.photoIdNumber.message}
                  </p>
                )}
              </div>
            </>
          )}
          {/* Blood Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blood Group
            </label>
            <SearchableSelect
              options={bloodGroups}
              value={watch("bloodGroup")}
              onChange={(val) =>
                setValue("bloodGroup", val, { shouldDirty: true, shouldValidate: true })
              }
              placeholder="Select"
              maxVisible={5}
            />
          </div>
          {/* Medical Conditions, Allergies & Dietary Preferences - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please enter your dietary restrictions, allergies. (Optional)
            </label>
            <textarea
              placeholder="Please enter your dietary restrictions, allergies here"
              {...register("medicalConditions")}
              rows="4"
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Passport Details Section - Only show if country is NOT India */}
      {showPassportSection && (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Passport Details
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Please provide your passport details
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Passport Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passport Type<span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={passportTypes}
                value={watch("passportType")}
                onChange={(val) =>
                  setValue("passportType", val, { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Select"
                maxVisible={5}
              />
              {errors.passportType && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.passportType.message}
                </p>
              )}
            </div>

            {/* Passport Number */}
            <div className="">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passport Number<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="ABC01234"
                {...register("passportNumber")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.passportNumber ? "border-red-500" : "border-gray-300"
                }`}
                style={{ minHeight: '44px' }}
              />
              {errors.passportNumber && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.passportNumber.message}
                </p>
              )}
            </div>

            {/* Place of Issue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Place of issue<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Place of Issue Here"
                {...register("placeOfIssue")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.placeOfIssue ? "border-red-500" : "border-gray-300"
                }`}
                style={{ minHeight: '44px' }}
              />
              {errors.placeOfIssue && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.placeOfIssue.message}
                </p>
              )}
            </div>

            {/* Passport Date of Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passport Date of Expiry<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("passportExpiry")}
                min={new Date().toISOString().split("T")[0]}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.passportExpiry ? "border-red-500" : "border-gray-300"
                }`}
                style={{ minHeight: '44px' }}
              />
              {errors.passportExpiry && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.passportExpiry.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Documents Section */}
      {/* <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Documents</h2>
        <p className="text-gray-600 text-sm mb-6">Please provide your documents</p> */}

      {/* Upload Passport - Only show if country is NOT India */}
      {showPassportSection && (
        <div className="mt-4 ">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Upload Documents
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Please provide your documents
          </p>
          <div className=" ">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload your Passport
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isPassportDragActive
                  ? "border-[#1e4788] bg-blue-50"
                  : "border-gray-300 hover:border-[#1e4788]"
              }`}
              onDragOver={handlePassportDragOver}
              onDragLeave={handlePassportDragLeave}
              onDrop={handlePassportDrop}
            >
              <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                Please upload a{" "}
                <span className="font-medium text-gray-700">
                  clear and readable image
                </span>{" "}
                of your passport. The file size must not exceed{" "}
                <span className="font-medium text-gray-700">5 MB</span>.
              </p>
              <input
                type="file"
                id="passport-upload"
                onChange={(e) => handleFileUpload(e, "passport")}
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
              />
              <label htmlFor="passport-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <FiUpload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Choose a file or drag and drop it here
                  </p>
                  <p className="text-xs text-gray-500">
                    Please upload a PDF format file up to 5 MB
                  </p>
                  <p className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Browse File
                  </p>
                </div>
              </label>
              {passportFile && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <p className="text-sm text-green-600 font-medium">
                    ✓ {passportFile?.name}
                  </p>
                  {passportDocumentUrl && (
                    <a
                      href={passportDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      (view)
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo */}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 pb-8">
        {/* <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          Back
        </button> */}
        <button
          type="submit"
          className="px-8 py-3 text-white rounded-lg transition-colors font-medium bg-[#1e4788] hover:bg-[#163761]"
          // disabled={isDirty}
        >
          Update Profile
        </button>
      </div>
    </form>
  );
};

export default profile;
