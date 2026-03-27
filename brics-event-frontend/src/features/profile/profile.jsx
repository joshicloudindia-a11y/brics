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

import Cropper from "react-easy-crop";

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        file.name = "profile-photo.jpeg";
        resolve(file);
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, "image/jpeg", 0.95);
  });
};

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

const nameRegex = /^[a-zA-Z\s\-']+$/;
const nameErrorMsg = "Only alphabets, spaces, hyphens, and apostrophes are allowed";

const positionRegex = /^[a-zA-Z\s\-\'\.\,]+$/;
const positionErrorMsg = "Only alphabets and basic punctuation are allowed";

const profileSchema = z
  .object({
    title: z.string().nullable().optional().transform(val => val || ""),
    
    firstName: z.string().min(2, "First name is required").regex(nameRegex, nameErrorMsg),
    middleName: z.string().nullable().optional().transform(val => val || "").refine(val => !val || nameRegex.test(val), nameErrorMsg),
    surname: z.string().min(1, "Surname is required").regex(nameRegex, nameErrorMsg),
    
    country: z.string().min(1, "Please select country"),
    phoneNumber: z.string().trim().min(10, "Phone number is required"),
    email: z.string().email("Invalid email address"),
    designation: z.string().min(1, "Designation is required"),
    
    customDesignation: z.string().nullable().optional().transform(val => val || "").refine(val => !val || positionRegex.test(val), positionErrorMsg),
    ministryName: z.string().nullable().optional().transform(val => val || "").refine(val => !val || positionRegex.test(val), positionErrorMsg),
    
    positionHeldSince: z
      .string()
      .nullable()
      .optional()
      .transform(val => val || "")
      .refine(
        (value) => {
          if (!value) return true;
          const parts = value.split("-");
          if (parts.length !== 3) return false;
          const [year, month, day] = parts.map((part) => Number(part));
          if ([year, month, day].some((num) => Number.isNaN(num))) return false;
          
          const selectedDate = new Date(year, month - 1, day);
          if (Number.isNaN(selectedDate.getTime())) return false;
          
          const today = new Date();
          selectedDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);

          const minDate = new Date(1950, 0, 1);
          if (selectedDate < minDate) return false;

          return selectedDate <= today;
        },
        {
          message: "Please select a date between 1950 and today",
        },
      ),
    gender: z.string().nullable().optional().transform(val => val || ""),

    photoIdType: z.string().nullable().optional().transform(val => val || ""),
    photoIdNumber: z.string().nullable().optional().transform(val => val || ""),
    bloodGroup: z.string().nullable().optional().transform(val => val || ""),
    
    medicalConditions: z.string().nullable().optional().transform(val => val || "").refine(val => !val || val.length <= 500, "Maximum 500 characters allowed"),

    passportType: z.string().nullable().optional().transform(val => val || ""),
    passportNumber: z.string().nullable().optional().transform(val => val || ""),
    placeOfIssue: z.string().nullable().optional().transform(val => val || ""),
    passportExpiry: z.string().nullable().optional().transform(val => val || ""),

    passportFile: z.any().optional(),
    photoFile: z.any().optional(),
  })
  .superRefine((data, ctx) => {
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

  // 🔥 BUG 6 States for Cropper
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
    mode: "onBlur",
    defaultValues: defaultValues || {
      country: "india",
    },
    shouldFocusError: false,
  });

  useEffect(() => {
    if (defaultValues) {
      const normalizedDefaults = {
        ...defaultValues,
        designation: defaultValues.designation || defaultValues.position,
      };
      reset(normalizedDefaults);
      if (defaultValues.photoUrl) {
        loadImageAsBase64(defaultValues.photoUrl)
          .then((base64) => { if (base64) setPhotoPreview(base64); })
          .catch(() => setPhotoPreview(defaultValues.photoUrl));
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
    const baseOptions = [...presetDesignationOptions, ...customDesignations];
    const sortedOptions = baseOptions.sort((a, b) => a.label.localeCompare(b.label));
    return [...sortedOptions, { value: "others", label: "Others" }];
  }, [presetDesignationOptions, customDesignations]);

  const photoIdTypes = [
    { value: "pan", label: "PAN Card", placeholder: "Enter PAN Card Number" },
    { value: "driving_license", label: "Driving License", placeholder: "Enter Driving License Number" },
    { value: "voter_id", label: "Voter ID", placeholder: "Enter Voter ID Number" },
    { value: "passport", label: "Passport", placeholder: "Enter Passport Number" },
    { value: "national_id", label: "National ID", placeholder: "Enter National ID Number" },
  ];

  const selectedCountry = watch("country");
  const selectedDesignation = watch("designation");
  const showPassportSection = selectedCountry && selectedCountry !== "india";
  const showCustomDesignation = selectedDesignation === "others" || (defaultValues?.designation === "others" && !selectedDesignation) || (defaultValues?.position === "others" && !selectedDesignation);
  const showMinistryName = selectedDesignation === "minister" || (defaultValues?.designation === "minister" && !selectedDesignation) || (defaultValues?.position === "minister" && !selectedDesignation);

  const selectedPhotoIdType = watch("photoIdType");
  const selectedPhotoIdPlaceholder = photoIdTypes.find((d) => d.value === selectedPhotoIdType)?.placeholder || "Enter Document Number";

  const getTodayInputValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const today = getTodayInputValue();

  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find((c) => c.value === selectedCountry);
      if (country && country.phoneCode) setPhoneCode(country.phoneCode);
    }
  }, [selectedCountry]);

  const processFileSelection = (file, type) => {
    if (!file) return false;

    if (type === "photo") {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPEG, JPG, and PNG files are allowed for profile photo");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Profile photo size must not exceed 5 MB");
        return false;
      }

      const previewUrl = URL.createObjectURL(file);
      setImageToCrop(previewUrl);
      setShowCropModal(true);
      return true;
    }

    if (type === "passport") {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPEG, JPG, PNG, and PDF files are allowed for passport document");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
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

  const handleCropComplete = async () => {
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });
      
      setPhotoFile(croppedFile);
      setValue("photoFile", croppedFile, { shouldValidate: true });
      setPhotoPreview(URL.createObjectURL(croppedBlob));
      setHasNewPhoto(true);
      setShowCropModal(false);
    } catch (e) {
      toast.error("Error cropping image");
    }
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files && event.target.files[0];
    const isValid = processFileSelection(file, type);
    if (!isValid) event.target.value = "";
  };

  const handlePhotoDragOver = (e) => { e.preventDefault(); setIsPhotoDragActive(true); };
  const handlePhotoDragLeave = (e) => { e.preventDefault(); setIsPhotoDragActive(false); };
  const handlePhotoDrop = (e) => {
    e.preventDefault();
    setIsPhotoDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    processFileSelection(file, "photo");
  };

  const handlePassportDragOver = (e) => { e.preventDefault(); setIsPassportDragActive(true); };
  const handlePassportDragLeave = (e) => { e.preventDefault(); setIsPassportDragActive(false); };
  const handlePassportDrop = (e) => {
    e.preventDefault();
    setIsPassportDragActive(false);
    const file = e.dataTransfer?.files?.[0];
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
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  useEffect(() => {
    if (selectedCountry !== "india") {
      setValue("photoIdType", undefined);
      setValue("photoIdNumber", undefined);
    }
  }, [selectedCountry, setValue]);

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
      if (defaultValues.photoUrl) {
        loadImageAsBase64(defaultValues.photoUrl)
          .then((base64) => { if (base64) setPhotoPreview(base64); })
          .catch(() => setPhotoPreview(defaultValues.photoUrl));
      }
      if (defaultValues.passportDocumentUrl) {
        setPassportFile({ name: "Passport already uploaded" });
        setPassportDocumentUrl(defaultValues.passportDocumentUrl);
      }
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (defaultValues) return;
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
          positionHeldSince: user.position_held_since ? user.position_held_since.split("T")[0] : "",
          gender: user.gender?.toLowerCase(),
          photoIdType: normalizeDocumentType(user.document_type),
          photoIdNumber: normalizeDocumentNumber(user.document_number),
          bloodGroup: user.blood_group,
          medicalConditions: user.medical_conditions,
          passportType: user.passport?.passport_type?.toLowerCase(),
          passportNumber: user.passport?.passport_number,
          placeOfIssue: user.passport?.place_of_issue,
          passportExpiry: user.passport?.expiry_date ? user.passport.expiry_date.split("T")[0] : "",
          profile: user?.documents?.profile,
        });

        if (user?.documents?.photo_url) {
          loadImageAsBase64(user.documents.photo_url)
            .then((base64) => { if (base64) setPhotoPreview(base64); })
            .catch(() => setPhotoPreview(user.documents.photo_url));
        }
        if (user?.documents?.passport_document_url) {
          setPassportFile({ name: "Passport already uploaded" });
          setPassportDocumentUrl(user?.documents?.passport_document_url);
        }
      } catch (err) {
        if (err?.response?.status !== 401) toast.error("Failed to load profile");
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

      const hasChanges = userId ? true : isDirty || hasNewPhoto || hasNewPassport;
      if (!hasChanges) { toast.info("No changes detected"); return; }

      const payload = {
        title: data.title || "",
        first_name: data.firstName,
        middle_name: data.middleName || "",
        last_name: data.surname || "",
        mobile: data.phoneNumber || "",
        country: data.country,
        custom_designation: data.customDesignation || "",
        ministry_name: data.ministryName || "",
        position_held_since: data.positionHeldSince || "",
        gender: data.gender || "",
        document_type: data.photoIdType || "",
        document_number: data.photoIdNumber ? data.photoIdNumber.toUpperCase() : "",
        blood_group: data.bloodGroup || "",
        medical_conditions: data.medicalConditions || "",
      };

      if (data.country !== "india") {
        payload.passport_type = data.passportType;
        payload.passport_number = data.passportNumber;
        payload.place_of_issue = data.placeOfIssue;
        payload.expiry_date = data.passportExpiry;
      }

      let finalDesignationValue = data.designation;

      if (data.designation === "others" && data.customDesignation) {
        finalDesignationValue = data.customDesignation.toLowerCase();
        try {
          setCustomDesignationLoading(true);
          await createDesignation({ designation_name: data.customDesignation });
          try {
            queryClient.setQueryData(["designations"], (old) => {
              if (!old || !old.data) return old;
              const exists = old.data.find(d => d.designation_name.toLowerCase() === data.customDesignation.toLowerCase());
              if (exists) return old;
              return { ...old, data: [...old.data, { designation_name: data.customDesignation }] };
            });
          } catch (e) {}
          await queryClient.invalidateQueries(["designations"]);
        } catch (err) {
          if (err?.response?.status !== 409) console.warn("Failed to create Enter Designation:", err);
        } finally { setCustomDesignationLoading(false); }

        try { setValue("designation", finalDesignationValue, { shouldValidate: true }); } catch (e) {}
      }

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
          if (err?.response?.status !== 409) console.warn("Failed to create ministry designation:", err);
        } finally { setCustomDesignationLoading(false); }

        finalDesignationValue = ministryVal;
        try { setValue("designation", finalDesignationValue, { shouldValidate: true }); } catch (e) {}
      }

      payload.position = finalDesignationValue;

      if (photoFile && hasNewPhoto) {
        payload.photo = await fileToBase64(photoFile);
      }

      if (passportFile && hasNewPassport) {
        payload.passport_document = await fileToBase64(passportFile);
      }

      if (userId) {
        try {
          await updateUserDetailsById(userId, payload);
          toast.success("Profile updated successfully");
          queryClient.invalidateQueries({ queryKey: ["delegates-with-inviters"] });
          if (onProfileUpdate) onProfileUpdate();
        } catch (updateError) {
          if (updateError?.response?.status === 500) {
            toast.warning("Profile updated but server returned an error. Please refresh.");
            queryClient.invalidateQueries({ queryKey: ["delegates-with-inviters"] });
            if (onProfileUpdate) onProfileUpdate();
          } else { throw updateError; }
        }
      } else {
        await updateUserDetails(payload);
        toast.success("Profile updated successfully");
        reset({}, { keepValues: true });
        setHasNewPhoto(false);
        setHasNewPassport(false);
      }
    } catch (err) {
      if (err?.response?.status === 401) toast.error(err?.response?.data?.message || "Session expired.");
      else if (err?.response?.status === 403) toast.error(err?.response?.data?.message || "Permission denied");
      else toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  const onSubmitInvalid = (errors) => {
    try {
      const firstKey = Object.keys(errors || {})[0];
      if (!firstKey) return;
      let el = document.querySelector(`[name="${firstKey}"]`);
      if (!el) el = document.querySelector('[aria-invalid="true"]');
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
      }
    } catch (e) {}
  };

  return (
    <>
      {showCropModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold mb-4 text-[#101828]">Adjust Profile Photo</h3>
            <p className="text-sm text-gray-500 mb-4">Drag to move, use slider to zoom</p>
            
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden mb-6">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
              />
            </div>
            
            <div className="mb-6 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">Zoom</span>
              <input 
                type="range" 
                min={1} max={3} step={0.1} 
                value={zoom} 
                onChange={(e) => setZoom(e.target.value)} 
                className="w-full accent-[#1e4788]" 
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => { setShowCropModal(false); setImageToCrop(null); document.getElementById('photo-upload').value = ''; }} 
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCropComplete} 
                className="px-5 py-2.5 bg-[#1e4788] text-white font-medium rounded-xl hover:bg-[#163761] shadow-md active:scale-95"
              >
                Apply Photo
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmitValid, onSubmitInvalid)}
        className="space-y-8 w-full md:max-w-3xl mx-auto bg-white p-6 rounded-2xl my-6 relative z-10"
      >
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
              <label
                htmlFor="photo-upload"
                onDragOver={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                className={`border-2 w-32 h-32 rounded-full
                ${isPhotoDragActive ? "border-[#1e4788] bg-blue-50" : "border-gray-300"}
                hover:border-[#1e4788] transition-colors flex items-center justify-center
                cursor-pointer overflow-hidden relative shadow-sm`}
              >
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "photo")}
                />
                {!photoPreview && (
                  <p className="text-sm text-gray-600 text-center px-2">
                    Click or drag to upload photo
                  </p>
                )}
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                  />
                )}
              </label>
              
              <div className="text-center mt-2">
                <p className="text-xs font-medium text-gray-700">
                  Profile Photo<span className="text-red-500">*</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <SearchableSelect
                options={titles}
                value={watch("title")}
                onChange={(val) => setValue("title", val, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select Your Title"
                maxVisible={5}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Enter your First Name"
                {...register("firstName")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.firstName ? "border-red-500" : "border-gray-300"}`}
                style={{ minHeight: '44px' }}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name (Optional)</label>
              <input
                type="text"
                placeholder="Enter your Middle Name"
                {...register("middleName")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.middleName ? "border-red-500" : "border-gray-300"}`}
                style={{ minHeight: '44px' }}
              />
               {errors.middleName && <p className="text-red-500 text-xs mt-1">{errors.middleName.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Surname/Lastname<span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Enter your Surname"
                {...register("surname")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.surname ? "border-red-500" : "border-gray-300"}`}
                style={{ minHeight: '44px' }}
              />
              {errors.surname && <p className="text-red-500 text-xs mt-1">{errors.surname.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country<span className="text-red-500">*</span></label>
              <SearchableSelect
                options={countries}
                value={watch("country")}
                onChange={(val) => setValue("country", val, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select"
                maxVisible={5}
              />
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number (Preferably Whatsapp Enabled)<span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  className="w-20 sm:w-24 px-2 py-3 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white appearance-none"
                  style={{ minHeight: '44px' }}
                >
                  {countries.map((country) => (
                    <option key={country.value} value={country.phoneCode}>{country.phoneCode}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter Your Mobile Number"
                  {...register("phoneNumber")}
                  onKeyDown={(event) => {
                    const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"];
                    if (allowedKeys.includes(event.key)) return;
                    if (!/[0-9]/.test(event.key)) event.preventDefault();
                  }}
                  onInput={(event) => {
                    const sanitizedValue = event.target.value.replace(/[^0-9]/g, "");
                    event.target.value = sanitizedValue;
                    setValue("phoneNumber", sanitizedValue, { shouldDirty: true, shouldValidate: true });
                  }}
                  maxLength={15}
                  minLength={10}
                  className={`flex-1 px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.phoneNumber ? "border-red-500" : "border-gray-300"}`}
                  style={{ minHeight: '44px' }}
                />
              </div>
              {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Registered Email ID<span className="text-red-500">*</span></label>
              <input
                type="email"
                placeholder="email@example.com"
                disabled
                {...register("email")}
                className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-gray-100 cursor-not-allowed ${errors.email ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation<span className="text-red-500">*</span></label>
              <SearchableSelect
                options={allDesignationOptions}
                value={watch("designation")}
                onChange={(val) => setValue("designation", val, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select Your Designation"
                className={`${errors.designation ? "border-red-500" : "border-gray-300"}`}
                maxVisible={5}
              />
              {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation.message}</p>}
            </div>
            
            {showCustomDesignation && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Designation<span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Your Designation"
                  {...register("customDesignation")}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.customDesignation ? "border-red-500" : "border-gray-300"}`}
                  style={{ minHeight: '44px' }}
                />
                {errors.customDesignation && <p className="text-red-500 text-xs mt-1">{errors.customDesignation.message}</p>}
              </div>
            )}
            
            {showMinistryName && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ministry Name<span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Ministry Name"
                  {...register("ministryName")}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.ministryName ? "border-red-500" : "border-gray-300"}`}
                  style={{ minHeight: '44px' }}
                />
                {errors.ministryName && <p className="text-red-500 text-xs mt-1">{errors.ministryName.message}</p>}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position held since (Optional)</label>
              <input
                type="date"
                {...register("positionHeldSince")}
                max={today}
                min="1950-01-01"
                className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              />
              {errors.positionHeldSince && <p className="text-red-500 text-xs mt-1">{errors.positionHeldSince.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender (Optional)</label>
              <SearchableSelect
                options={genders}
                value={watch("gender")}
                onChange={(val) => setValue("gender", val, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select Your Gender"
                maxVisible={5}
              />
            </div>
            
            {selectedCountry === "india" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photo ID Document Type<span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={photoIdTypes}
                    value={watch("photoIdType")}
                    onChange={(val) => setValue("photoIdType", val, { shouldDirty: true, shouldValidate: true })}
                    placeholder="Select Document Type"
                    maxVisible={5}
                  />
                  {errors.photoIdType && <p className="text-red-500 text-xs mt-1">{errors.photoIdType.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Number<span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder={selectedPhotoIdPlaceholder}
                    {...register("photoIdNumber")}
                    onInput={(event) => {
                      const sanitizedValue = event.target.value.toUpperCase().replace(/\s+/g, "");
                      event.target.value = sanitizedValue;
                      setValue("photoIdNumber", sanitizedValue, { shouldDirty: true, shouldValidate: true });
                    }}
                    className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.photoIdNumber ? "border-red-500" : "border-gray-300"}`}
                    style={{ minHeight: '44px' }}
                  />
                  {errors.photoIdNumber && <p className="text-red-500 text-xs mt-1">{errors.photoIdNumber.message}</p>}
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
              <SearchableSelect
                options={bloodGroups}
                value={watch("bloodGroup")}
                onChange={(val) => setValue("bloodGroup", val, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select"
                maxVisible={5}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Please enter your dietary restrictions, allergies. (Optional)</label>
              <textarea
                placeholder="Please enter your dietary restrictions, allergies here"
                {...register("medicalConditions")}
                rows="4"
                maxLength={500}
                className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${watch("medicalConditions")?.length === 500 ? "text-red-500 font-bold" : "text-gray-500"}`}>
                  {watch("medicalConditions")?.length || 0}/500 characters
                </span>
              </div>
              {errors.medicalConditions && <p className="text-red-500 text-xs">{errors.medicalConditions.message}</p>}
            </div>
          </div>
        </div>

        {showPassportSection && (
          <div className="mt-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Passport Details</h2>
            <p className="text-gray-600 text-sm mb-6">Please provide your passport details</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport Type<span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={passportTypes}
                  value={watch("passportType")}
                  onChange={(val) => setValue("passportType", val, { shouldDirty: true, shouldValidate: true })}
                  placeholder="Select"
                  maxVisible={5}
                />
                {errors.passportType && <p className="text-red-500 text-xs mt-1">{errors.passportType.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number<span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="ABC01234"
                  {...register("passportNumber")}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.passportNumber ? "border-red-500" : "border-gray-300"}`}
                  style={{ minHeight: '44px' }}
                />
                {errors.passportNumber && <p className="text-red-500 text-xs mt-1">{errors.passportNumber.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Place of issue<span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Place of Issue Here"
                  {...register("placeOfIssue")}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.placeOfIssue ? "border-red-500" : "border-gray-300"}`}
                  style={{ minHeight: '44px' }}
                />
                {errors.placeOfIssue && <p className="text-red-500 text-xs mt-1">{errors.placeOfIssue.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport Date of Expiry<span className="text-red-500">*</span></label>
                <input
                  type="date"
                  {...register("passportExpiry")}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.passportExpiry ? "border-red-500" : "border-gray-300"}`}
                  style={{ minHeight: '44px' }}
                />
                {errors.passportExpiry && <p className="text-red-500 text-xs mt-1">{errors.passportExpiry.message}</p>}
              </div>
            </div>
          </div>
        )}

        {showPassportSection && (
          <div className="mt-4 ">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Documents</h2>
            <p className="text-gray-600 text-sm mb-6">Please provide your documents</p>
            <div className=" ">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload your Passport</label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isPassportDragActive ? "border-[#1e4788] bg-blue-50" : "border-gray-300 hover:border-[#1e4788]"}`}
                onDragOver={handlePassportDragOver}
                onDragLeave={handlePassportDragLeave}
                onDrop={handlePassportDrop}
              >
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  Please upload a <span className="font-medium text-gray-700">clear and readable image</span> of your passport. The file size must not exceed <span className="font-medium text-gray-700">5 MB</span>.
                </p>
                <input
                  type="file"
                  id="passport-upload"
                  onChange={(e) => handleFileUpload(e, "passport")}
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                />
                <label htmlFor="passport-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2 mt-4">
                    <FiUpload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-600">Choose a file or drag and drop it here</p>
                    <p className="text-xs text-gray-500">Please upload a PDF format file up to 5 MB</p>
                    <p className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Browse File</p>
                  </div>
                </label>
                {passportFile && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <p className="text-sm text-green-600 font-medium">✓ {passportFile?.name}</p>
                    {passportDocumentUrl && (
                      <a href={passportDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">(view)</a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 pb-8">
          <button
            type="submit"
            className="px-8 py-3 text-white rounded-lg transition-colors font-medium bg-[#1e4788] hover:bg-[#163761] shadow-md active:scale-95"
          >
            Update Profile
          </button>
        </div>
      </form>
    </>
  );
};

export default profile;