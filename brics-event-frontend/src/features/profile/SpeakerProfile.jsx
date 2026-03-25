import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getCurrentSpeakerProfile, updateSpeakerProfile } from "../../services/speakers";
import { getUserDetails } from "../../services/auth";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { fileToBase64 } from "../../utils/fileToBase64";
import { useQuery } from "@tanstack/react-query";
import { countries } from "../../constants/eventCategories";
import { FiUpload } from "react-icons/fi";
import { da } from "date-fns/locale";

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

const speakerProfileSchema = z.object({
  title: z.string().nullable().optional().transform(val => val || ""),
  professional_title: z.string().nullable().optional().transform(val => val || ""),
  firstname: z.string().min(1, "First name is required"),
  middlename: z.string().nullable().optional().transform(val => val || ""),
  lastname: z.string().nullable().optional().transform(val => val || ""),
  email: z.string().email("Invalid email address"),
  organisation: z.string().min(1, "Organisation name is required"),
  designation: z.string().min(1, "Designation is required"),
  country: z.string().min(1, "Please select country"),
  photoIdType: z.string().nullable().optional(),
  photoIdNumber: z.string().nullable().optional(),
  passportType: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  placeOfIssue: z.string().nullable().optional(),
  passportExpiry: z.string().nullable().optional(),
  about: z.string().nullable().optional().transform(val => val || ""),
  bloodGroup: z.string().nullable().optional().transform(val => val || ""),
  medicalConditions: z.string().nullable().optional().transform(val => val || ""),
  youtube: z.string().url("Invalid YouTube URL").optional().or(z.literal("")).refine(
    (val) => !val || val.length <= 200,
    "YouTube URL must be less than 200 characters"
  ),
  instagram: z.string().optional().refine(
    (val) => !val || val.length <= 200,
    "Instagram handle must be less than 200 characters"
  ),
  linkedin: z.string().optional().refine(
    (val) => !val || val.length <= 200,
    "LinkedIn URL must be less than 200 characters"
  ),
  twitter: z.string().optional().refine(
    (val) => !val || val.length <= 200,
    "Twitter URL must be less than 200 characters"
  ),
  hasOtherCitizenship: z.boolean().optional(),
  isOciCardHolder: z.boolean().optional(),
  photoFile: z.any().optional(),
}).superRefine((data, ctx) => {
  // Only validate Photo ID fields if country is explicitly set to "india"
  if (data.country === "india") {
    if (!data.photoIdType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select photo ID document type",
        path: ["photoIdType"],
      });
    }
    if (!data.photoIdNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Document number is required",
        path: ["photoIdNumber"],
      });
    } else {
      const validator = documentValidators[data.photoIdType];
      if (validator) {
        const normalized = data.photoIdNumber.toUpperCase();
        if (!validator.regex.test(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validator.message,
            path: ["photoIdNumber"],
          });
        }
      }
    }
  }
  // Validate Passport fields for non-India countries
  if (data.country && data.country !== "india") {
    if (!data.passportType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select passport type",
        path: ["passportType"],
      });
    }
    if (!data.passportNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passport number required",
        path: ["passportNumber"],
      });
    }
    if (!data.placeOfIssue) {
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

const SpeakerProfile = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isPhotoDragActive, setIsPhotoDragActive] = useState(false);
  const [hasNewPhoto, setHasNewPhoto] = useState(false);
  const [passportFile, setPassportFile] = useState(null);
  const [isPassportDragActive, setIsPassportDragActive] = useState(false);
  const [speakerData, setSpeakerData] = useState(null);
  const [passportDocumentUrl, setPassportDocumentUrl] = useState(null);
  const [hasNewPassport, setHasNewPassport] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(speakerProfileSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      professional_title: "",
      firstname: "",
      middlename: "",
      lastname: "",
      email: "",
      organisation: "",
      designation: "",
      country: "",
      photoIdType: "",
      photoIdNumber: "",
      passportType: "",
      passportNumber: "",
      placeOfIssue: "",
      passportExpiry: "",
      hasOtherCitizenship: false,
      isOciCardHolder: false,
      about: "",
      youtube: "",
      instagram: "",
      linkedin: "",
      twitter: "",
      bloodGroup: "",
      medicalConditions: "",
    },
    shouldFocusError: false,
  });

  // Load speaker profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = currentUser?.user?.id || currentUser?.id;
        if (!userId) return;

        const res = await getCurrentSpeakerProfile(userId);
        const speaker = res.speaker || res;
        setSpeakerData(speaker);

        const passportUrl = speaker?.user?.documents?.passport_document_url || speaker?.documents?.passport_document_url || currentUser?.documents?.passport_document_url;
        if (passportUrl) {
          setPassportFile({ name: "Passport already uploaded" });
          
          // Use signed URL from speaker data if available
          const signedPassportUrl = speaker?.documents?.passport_document_signed_url;
          if (signedPassportUrl) {
            setPassportDocumentUrl(signedPassportUrl);
          } else {
            // Fallback to fetching signed URL
            try {
              const detailsRes = await getUserDetails();
              const fetchedSignedUrl = detailsRes?.user?.documents?.passport_document_url;
              if (fetchedSignedUrl) {
                setPassportDocumentUrl(fetchedSignedUrl);
              } else {
                // Fallback to constructed URL if signed URL not available
                setPassportDocumentUrl(passportUrl.startsWith('http') ? passportUrl : `https://brics-dev-event-bucket.s3.ap-south-1.amazonaws.com/${passportUrl}`);
              }
            } catch (error) {
              // console.error("Failed to get signed passport URL:", error);
              // Fallback to constructed URL
              setPassportDocumentUrl(passportUrl.startsWith('http') ? passportUrl : `https://brics-dev-event-bucket.s3.ap-south-1.amazonaws.com/${passportUrl}`);
            }
          }
        }

        reset({
          title: speaker.title || "",
          professional_title: speaker.professional_title || "",
          firstname: speaker.first_name || speaker.firstname || "",
          middlename: speaker.middle_name || speaker.middlename || "",
          lastname: speaker.last_name || speaker.lastname || "",
          email: speaker.email || "",
          organisation: speaker.organisation || speaker.organization || "",
          designation: speaker.designation || "",
          country: speaker.country || "",
          photoIdType: speaker.document_type || speaker.photo_id_type || "",
          photoIdNumber: speaker.document_number || speaker.photo_id_number || "",
          passportType: speaker.passport?.passport_type || speaker.passport_type || "",
          passportNumber: speaker.passport?.passport_number || speaker.passport_number || "",
          placeOfIssue: speaker.passport?.place_of_issue || speaker.place_of_issue || "",
          passportExpiry: speaker.passport?.expiry_date ? speaker.passport.expiry_date.split("T")[0] : speaker.passport_expiry ? speaker.passport_expiry.split("T")[0] : "",
          hasOtherCitizenship: speaker.has_other_citizenship || speaker.hasOtherCitizenship || false,
          isOciCardHolder: speaker.is_oci_card_holder || speaker.isOciCardHolder || false,
          about: speaker.about_yourself || speaker.about || "",
          youtube: speaker.social_media?.youtube || speaker.youtube || "",
          instagram: speaker.social_media?.instagram || speaker.instagram || "",
          linkedin: speaker.social_media?.linkedin || speaker.linkedin || "",
          twitter: speaker.social_media?.twitter || speaker.twitter || "",
          bloodGroup: speaker.blood_group || speaker.user?.blood_group || "",
          medicalConditions: speaker.dietary_preferences || speaker.medical_conditions || "",
        });

        // Load photo after a small delay to ensure component is ready
        setTimeout(() => {
          // Use photo URL from currentUser (details endpoint) which has full signed URLs
          if (currentUser?.documents?.photo_url) {
            setPhotoPreview(currentUser.documents.photo_url);
          } else if (speaker?.documents?.photo_signed_url) {
            setPhotoPreview(speaker.documents.photo_signed_url);
          } else if (speaker?.photo_signed_url) {
            setPhotoPreview(speaker.photo_signed_url);
          }
        }, 100);

        // Debug: log currentUser documents
        // console.log("Current User Documents:", currentUser?.documents);
        // console.log("Selected Country:", speaker.country);
        // console.log("Show Passport Section:", showPassportSection);
      } catch (err) {
        if (err?.response?.status !== 401) {
          // console.error("Failed to load speaker profile:", err);
        }
      }
    };

    loadProfile();
  }, [currentUser]);

  const processFileSelection = (file) => {
    if (!file) return false;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, JPG, and PNG files are allowed");
      return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Photo size must not exceed 5 MB");
      return false;
    }

    setPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setHasNewPhoto(true);
    return true;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processFileSelection(file);
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
    if (file) {
      processFileSelection(file);
    }
  };

  const processPassportFile = (file) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PDF, JPEG, or PNG.");
      return false;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit");
      return false;
    }

    setPassportFile(file);
    setHasNewPassport(true);
    return true;
  };

  const handlePassportFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processPassportFile(file);
    }
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
    if (file) {
      processPassportFile(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (!photoFile && !photoPreview) {
        toast.error("Photo is required");
        return;
      }

      const hasChanges = isDirty || hasNewPhoto || hasNewPassport;
      if (!hasChanges) {
        toast.info("No changes detected");
        return;
      }

      const userId = currentUser?.user?.id || currentUser?.id;
      if (!userId) {
        toast.error("Unable to identify user");
        return;
      }

      // console.log("=== SPEAKER PROFILE UPDATE DEBUG ===");
      // console.log("Form Data:", data);
      // console.log("Has New Photo:", hasNewPhoto);
      // console.log("Photo File:", photoFile);
      // console.log("Has New Passport:", hasNewPassport);
      // console.log("Passport File:", passportFile);
      // console.log("User ID:", userId);

      // Create FormData payload with correct field names for backend
      const formData = new FormData();

      // Add basic fields with correct names
      formData.append("first_name", data.firstname);
      formData.append("last_name", data.lastname || "");
      formData.append("email", data.email);
      formData.append("organisation", data.organisation);
      formData.append("designation", data.designation);
      formData.append("country", data.country);

      // Add optional fields
      if (data.middlename) {
        formData.append("middle_name", data.middlename);
      }

      if (data.title) {
        formData.append("title", data.title);
      }

      if (data.professional_title) {
        formData.append("professional_title", data.professional_title);
      }

      // is

      if (data.about) {
        formData.append("about_yourself", data.about);
      }

      // Add social media as individual fields (try different formats)
      if (data.youtube) {
        formData.append("youtube", data.youtube);
        formData.append("social_media_youtube", data.youtube);
      }
      if (data.instagram) {
        formData.append("instagram", data.instagram);
        formData.append("social_media_instagram", data.instagram);
      }
      if (data.linkedin) {
        formData.append("linkedin", data.linkedin);
        formData.append("social_media_linkedin", data.linkedin);
      }
      if (data.twitter) {
        formData.append("twitter", data.twitter);
        formData.append("social_media_twitter", data.twitter);
      }

      // Add passport fields as individual fields (try different formats)
      if (data.passportType) {
        formData.append("passport_type", data.passportType);
        formData.append("passport[passport_type]", data.passportType);
      }
      if (data.passportNumber) {
        formData.append("passport_number", data.passportNumber);
        formData.append("passport[passport_number]", data.passportNumber);
      }
      if (data.placeOfIssue) {
        formData.append("place_of_issue", data.placeOfIssue);
        formData.append("passport[place_of_issue]", data.placeOfIssue);
      }
      if (data.passportExpiry) {
        formData.append("passport_expiry", data.passportExpiry);
        formData.append("passport[expiry_date]", data.passportExpiry);
      }

      // Add citizenship fields
      formData.append("has_other_citizenship", data.hasOtherCitizenship || false);
      formData.append("is_oci_card_holder", data.isOciCardHolder || false);

      // Add blood group and dietary/medical info
      if (data.bloodGroup) {
        formData.append("blood_group", data.bloodGroup);
      }
      if (data.medicalConditions) {
        formData.append("medical_conditions", data.medicalConditions);
        formData.append("dietary_preferences", data.medicalConditions);
      }

      // Add photo if changed
      if (photoFile) {
        formData.append("photo", photoFile);
      }

      // Add passport document if changed
      if (hasNewPassport && passportFile instanceof File) {
        formData.append("passport_document", passportFile);
      }

      // Add Photo ID fields for India (both common and fallback keys)
      if (data.country === "india") {
        if (data.photoIdType) {
          formData.append("document_type", data.photoIdType);
          formData.append("photo_id_type", data.photoIdType);
        }
        if (data.photoIdNumber) {
          formData.append("document_number", data.photoIdNumber);
          formData.append("photo_id_number", data.photoIdNumber);
        }
      }

      // Debug: log FormData entries being sent
      try {
        // console.log("FormData being sent:");
        for (const entry of formData.entries()) {
          const [key, value] = entry;
          if (value instanceof File) {
            // console.log(key, {
            //   name: value.name,
            //   type: value.type,
            //   size: value.size,
            // });
          } else {
            // console.log(key, value);
          }
        }
      } catch (err) {
        // console.warn("Failed to enumerate FormData for debug:", err);
      }

      const response = await updateSpeakerProfile(userId, formData);
      // console.log("Update Response:", response);
      
      const updatedSpeaker = response.speaker || response;
      setSpeakerData(updatedSpeaker);
      
      reset({
        title: updatedSpeaker.title || "",
        professional_title: updatedSpeaker.professional_title || "",
        firstname: updatedSpeaker.first_name || "",
        middlename: updatedSpeaker.middle_name || "",
        lastname: updatedSpeaker.last_name || "",
        email: updatedSpeaker.email || "",
        organisation: updatedSpeaker.organisation || "",
        designation: updatedSpeaker.designation || "",
        country: updatedSpeaker.country || "",
        photoIdType: updatedSpeaker.document_type || "",
        photoIdNumber: updatedSpeaker.document_number || "",
        passportType: updatedSpeaker.passport?.passport_type || "",
        passportNumber: updatedSpeaker.passport?.passport_number || "",
        placeOfIssue: updatedSpeaker.passport?.place_of_issue || "",
        passportExpiry: updatedSpeaker.passport?.expiry_date ? updatedSpeaker.passport.expiry_date.split("T")[0] : "",
        hasOtherCitizenship: updatedSpeaker.has_other_citizenship || false,
        isOciCardHolder: updatedSpeaker.is_oci_card_holder || false,
        sessionId: updatedSpeaker.session || (currentUser?.sessions?.[0]?.session_id || ""),
        about: updatedSpeaker.about_yourself || "",
        youtube: updatedSpeaker.social_media?.youtube || "",
        instagram: updatedSpeaker.social_media?.instagram || "",
        linkedin: updatedSpeaker.social_media?.linkedin || "",
        twitter: updatedSpeaker.social_media?.twitter || "",
      });

      // Update photo preview with the new signed URL from response
      if (updatedSpeaker?.documents?.photo_signed_url) {
        setPhotoPreview(updatedSpeaker.documents.photo_signed_url);
      } else if (updatedSpeaker?.photo_signed_url) {
        setPhotoPreview(updatedSpeaker.photo_signed_url);
      }

      // Update passport document URL with signed URL from response
      if (updatedSpeaker?.documents?.passport_document_signed_url) {
        setPassportDocumentUrl(updatedSpeaker.documents.passport_document_signed_url);
      }

      toast.success("Profile updated successfully");
      setHasNewPhoto(false);
      setHasNewPassport(false);
      if (passportDocumentUrl) {
        setPassportFile({ name: "Passport already uploaded" });
      } else {
        setPassportFile(null);
      }
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    } catch (err) {
      if (err?.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
      } else {
        toast.error(err?.response?.data?.message || "Update failed");
      }
    }
  };

  const titles = [
    { value: "mr", label: "Mr." },
    { value: "mrs", label: "Mrs." },
    { value: "ms", label: "Ms." },
    { value: "dr", label: "Dr." },
    { value: "prof", label: "Prof." },
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
  
  const photoIdTypes = [
    { value: "pan", label: "PAN Card", placeholder: "Enter PAN Card Number" },
    { value: "driving_license", label: "Driving License", placeholder: "Enter Driving License Number" },
    { value: "voter_id", label: "Voter ID", placeholder: "Enter Voter ID Number" },
    { value: "passport", label: "Passport", placeholder: "Enter Passport Number" },
    { value: "national_id", label: "National ID", placeholder: "Enter National ID Number" },
  ];

  const passportTypes = [
    { value: "official", label: "Official Passport" },
    { value: "diplomatic_passport", label: "Diplomatic Passport" },
    { value: "official_travel_document", label: "Official Travel Document" },
  ];

  const selectedCountry = watch("country");
  const selectedPhotoIdType = watch("photoIdType");
  const selectedPhotoIdPlaceholder = photoIdTypes.find((d) => d.value === selectedPhotoIdType)?.placeholder || "Enter Document Number";
  const showPassportSection = selectedCountry && selectedCountry !== "india";

  if (!currentUser) {
    return (
      <div className="w-full md:max-w-3xl mx-auto bg-white p-6 rounded-2xl my-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e4788] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 w-full md:max-w-3xl mx-auto bg-white p-6 rounded-2xl my-6"
    >
      {/* Speaker Profile Section */}
      <div>
        {/* Read-only Information */}
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Speaker Profile
            </h2>
            <p className="text-gray-600 text-sm">
              Please provide your professional details
            </p>
          </div>

          {/* Profile Photo Upload */}
          <div className="text-center">
            <label
              htmlFor="photo-upload"
              onDragOver={handlePhotoDragOver}
              onDragLeave={handlePhotoDragLeave}
              onDrop={handlePhotoDrop}
              className={`border-2 w-32 h-32 rounded-full
              ${isPhotoDragActive ? "border-[#1e4788] bg-blue-50" : "border-gray-300"}
              hover:border-[#1e4788] transition-colors
              flex items-center justify-center
              cursor-pointer overflow-hidden relative block`}
            >
              <input
                type="file"
                id="photo-upload"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileUpload}
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
            <label className="block text-xs mt-2 text-gray-700">
              Upload Photo<span className="text-red-500">*</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <select
              {...register("title")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white appearance-none ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            >
              <option value="">Select Title</option>
              {titles.map((title) => (
                <option key={title.value} value={title.value}>
                  {title.label}
                </option>
              ))}
            </select>
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Professional Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Professional Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., CEO, Director, Manager"
              {...register("professional_title")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.professional_title ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.professional_title && (
              <p className="text-red-500 text-xs mt-1">{errors.professional_title.message}</p>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter First Name"
              {...register("firstname")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.firstname ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.firstname && (
              <p className="text-red-500 text-xs mt-1">{errors.firstname.message}</p>
            )}
          </div>

          {/* Middle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Middle Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter Middle Name"
              {...register("middlename")}
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter Last Name"
              {...register("lastname")}
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              disabled
              {...register("email")}
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-gray-100 cursor-not-allowed"
              style={{ minHeight: '44px' }}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Organisation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organisation Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Organisation Name"
              {...register("organisation")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.organisation ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.organisation && (
              <p className="text-red-500 text-xs mt-1">{errors.organisation.message}</p>
            )}
          </div>

          {/* Designation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Designation<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Designation"
              {...register("designation")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.designation ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.designation && (
              <p className="text-red-500 text-xs mt-1">{errors.designation.message}</p>
            )}
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blood Group
            </label>
            <select
              {...register("bloodGroup")}
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white appearance-none"
              style={{ minHeight: '44px' }}
            >
              <option value="">Select</option>
              {bloodGroups.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
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

          {/* Country */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country<span className="text-red-500">*</span>
            </label>
            <select
              {...register("country")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white appearance-none ${
                errors.country ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            >
              <option value="">Select a Country</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>
            )}
          </div>

          {/* Photo ID Section - India Only */}
          {selectedCountry === "india" && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo ID Document Type<span className="text-red-500">*</span>
                </label>
                <select
                  {...register("photoIdType")}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white appearance-none ${
                    errors.photoIdType ? "border-red-500" : "border-gray-300"
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <option value="">Select Document Type</option>
                  {photoIdTypes.map((doc) => (
                    <option key={doc.value} value={doc.value}>
                      {doc.label}
                    </option>
                  ))}
                </select>
                {errors.photoIdType && (
                  <p className="text-red-500 text-xs mt-1">{errors.photoIdType.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Number<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={selectedPhotoIdPlaceholder}
                  {...register("photoIdNumber")}
                  onInput={(event) => {
                    const sanitizedValue = event.target.value.toUpperCase().replace(/\s+/g, "");
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
                  <p className="text-red-500 text-xs mt-1">{errors.photoIdNumber.message}</p>
                )}
              </div>
            </>
          )}

          {/* Passport Section - Non-India */}
          {showPassportSection && (
            <>
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-gray-900">Passport Details</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passport Type<span className="text-red-500">*</span>
                </label>
                <select
                  {...register("passportType")}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white appearance-none ${
                    errors.passportType ? "border-red-500" : "border-gray-300"
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <option value="">Select Passport Type</option>
                  {passportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.passportType && (
                  <p className="text-red-500 text-xs mt-1">{errors.passportType.message}</p>
                )}
              </div>
              <div>
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
                  <p className="text-red-500 text-xs mt-1">{errors.passportNumber.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Place of Issue<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Place of Issue"
                  {...register("placeOfIssue")}
                  className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                    errors.placeOfIssue ? "border-red-500" : "border-gray-300"
                  }`}
                  style={{ minHeight: '44px' }}
                />
                {errors.placeOfIssue && (
                  <p className="text-red-500 text-xs mt-1">{errors.placeOfIssue.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passport Expiry Date<span className="text-red-500">*</span>
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
                  <p className="text-red-500 text-xs mt-1">{errors.passportExpiry.message}</p>
                )}
              </div>

              {/* Citizenship Fields */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register("hasOtherCitizenship")}
                    className="mr-2 h-4 w-4 text-[#1e4788] focus:ring-[#1e4788] border-gray-300 rounded"
                  />
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register("isOciCardHolder")}
                    className="mr-2 h-4 w-4 text-[#1e4788] focus:ring-[#1e4788] border-gray-300 rounded"
                  />
                </label>
              </div>
            </>
          )}

          {/* Upload Documents Section for Non-India Countries */}
          {showPassportSection && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Passport Document<span className="text-red-500">*</span>
              </label>

              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                  isPassportDragActive
                    ? "border-[#1e4788] bg-blue-50"
                    : "border-gray-300 bg-gray-50"
                }`}
                onDragOver={handlePassportDragOver}
                onDragLeave={handlePassportDragLeave}
                onDrop={handlePassportDrop}
                onClick={() => document.getElementById("passport-file-input").click()}
              >
                <input
                  id="passport-file-input"
                  type="file"
                  accept=".pdf,.jpeg,.jpg,.png"
                  onChange={handlePassportFileUpload}
                  className="hidden"
                />
                <FiUpload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Drag & drop your passport document or click to browse
                </p>
                <p className="text-xs text-gray-500">PDF (max 5MB)</p>
              </div>
              {passportFile && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <p className="text-sm text-green-600 font-medium">
                    ✓ {passportFile?.name}
                  </p>
                  {passportDocumentUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(passportDocumentUrl, { cache: 'no-store' });
                          if (!res.ok) throw new Error('Failed to fetch file');
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          const disposition = res.headers.get('content-disposition');
                          let filename = 'passport_document';
                          if (disposition) {
                            const match = /filename\*=UTF-8''(.+)$/.exec(disposition) || /filename="?([^";]+)"?/.exec(disposition);
                            if (match && match[1]) filename = decodeURIComponent(match[1]);
                          } else {
                            const urlParts = passportDocumentUrl.split('/');
                            const last = urlParts[urlParts.length - 1].split('?')[0];
                            if (last) filename = last;
                          }
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          // console.error('Download failed', err);
                          window.open(passportDocumentUrl, '_blank', 'noopener');
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      (view)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* About Yourself - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About Yourself (Optional)
            </label>
            <textarea
              placeholder="Tell us about yourself, your experience, and expertise"
              {...register("about")}
              rows="4"
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] resize-none"
            />
          </div>

          {/* YouTube URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://youtube.com/..."
              {...register("youtube")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.youtube ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.youtube && (
              <p className="text-red-500 text-xs mt-1">{errors.youtube.message}</p>
            )}
          </div>

          {/* Instagram Handle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram Handle (Optional)
            </label>
            <input
              type="text"
              placeholder="@username"
              {...register("instagram")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.instagram ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.instagram && (
              <p className="text-red-500 text-xs mt-1">{errors.instagram.message}</p>
            )}
          </div>

          {/* LinkedIn URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/..."
              {...register("linkedin")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.linkedin ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.linkedin && (
              <p className="text-red-500 text-xs mt-1">{errors.linkedin.message}</p>
            )}
          </div>

          {/* Twitter URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://x.com/..."
              {...register("twitter")}
              className={`w-full px-3 sm:px-4 py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.twitter ? "border-red-500" : "border-gray-300"
              }`}
              style={{ minHeight: '44px' }}
            />
            {errors.twitter && (
              <p className="text-red-500 text-xs mt-1">{errors.twitter.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 pb-8">
        <button
          type="submit"
          className="px-8 py-3 text-white rounded-lg transition-colors font-medium bg-[#1e4788] hover:bg-[#163761]"
        >
          Update Profile
        </button>
      </div>
    </form>
  );
};

export default SpeakerProfile;
