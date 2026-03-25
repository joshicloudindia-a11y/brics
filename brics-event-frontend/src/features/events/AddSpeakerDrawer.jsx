import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-toastify";
import {
  addSpeaker,
  updateSpeaker,
  addSpeakersJSON,
  updateSpeakerProfile,
} from "../../services/speakers";
import { getAllSessions } from "../../services/sessions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { countries } from "../../constants/eventCategories";
import { FiUpload } from "react-icons/fi";
import { fileToBase64 } from "../../utils/fileToBase64";
import SearchableSelect from "../../components/common/SearchableSelect";

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

const speakerSchema = z
  .object({
    firstname: z.string().min(1, "First Name is required"),
    middlename: z.string().optional(),
    lastname: z.string().optional(),
    email: z.string().email("Invalid email"),
    title: z.string().optional(),
    professional_title: z.string().optional(),
    about: z.string().optional(),
    youtube: z
      .string()
      .url("Invalid YouTube URL")
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || val.length <= 200,
        "YouTube URL must be less than 200 characters",
      ),
    instagram: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length <= 200,
        "Instagram handle must be less than 200 characters",
      ),
    linkedin: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length <= 200,
        "LinkedIn URL must be less than 200 characters",
      ),
    twitter: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length <= 200,
        "Twitter URL must be less than 200 characters",
      ),
    bloodGroup: z.string().optional(),
    medicalConditions: z.string().optional(),
    sessionId: z.string().optional(),
    organizationName: z.string().optional(),
    designation: z.string().optional(),
    country: z.string().optional(),
    photoIdType: z.string().nullable().optional(),
    photoIdNumber: z.string().nullable().optional(),
    passportType: z.string().nullable().optional(),
    passportNumber: z.string().nullable().optional(),
    placeOfIssue: z.string().nullable().optional(),
    passportExpiry: z.string().nullable().optional(),
    hasOtherCitizenship: z.boolean().optional(),
    isOciCardHolder: z.boolean().optional(),
    profileImage: z.instanceof(FileList).optional(),
  })
  .superRefine((data, ctx) => {
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
    // Only validate Passport fields if country is selected and NOT "india"
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

const AddSpeakerDrawer = ({
  isOpen,
  onClose,
  eventId,
  events = [],
  editingSpeaker,
  onSpeakerAdded,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePreview, setProfilePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [isPassportDragActive, setIsPassportDragActive] = useState(false);
  const [hasNewPhoto, setHasNewPhoto] = useState(false);
  const [hasNewPassport, setHasNewPassport] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);
  // Fetch all sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoadingSessions(true);
        const res = await getAllSessions();
        setSessions(res.sessions || []);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(speakerSchema),
    defaultValues: {
      firstname: "",
      middlename: "",
      lastname: "",
      email: "",
      title: "",
      professional_title: "",
      about: "",
      youtube: "",
      instagram: "",
      linkedin: "",
      twitter: "",
      sessionId: "",
      organizationName: "",
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
      bloodGroup: "",
      medicalConditions: "",
    },
  });

  // Reset form when editingSpeaker changes
  useEffect(() => {
    if (editingSpeaker) {
      // console.log("🔍 EDITING SPEAKER - Full editingSpeaker object:", editingSpeaker);
      // console.log("🔍 EDITING SPEAKER - Available IDs:", {
      //   id: editingSpeaker.id,
      //   user_id: editingSpeaker.user_id,
      //   _id: editingSpeaker._id,
      //   user_id_nested: editingSpeaker.user?.id,
      //   user__id_nested: editingSpeaker.user?._id
      // });

      // Handle name splitting if we have a merged name field
      let firstName =
        editingSpeaker?.firstName ||
        editingSpeaker?.first_name ||
        editingSpeaker?.user?.first_name ||
        editingSpeaker?.user?.firstName ||
        "";
      let middleName =
        editingSpeaker?.middleName ||
        editingSpeaker?.middle_name ||
        editingSpeaker?.user?.middle_name ||
        editingSpeaker?.user?.middleName ||
        "";
      let lastName =
        editingSpeaker?.lastName ||
        editingSpeaker?.last_name ||
        editingSpeaker?.user?.last_name ||
        editingSpeaker?.user?.lastName ||
        "";

      // If individual name fields are empty but we have a merged name field, split it
      if (!firstName && !middleName && !lastName && editingSpeaker?.name) {
        const nameParts = editingSpeaker.name.trim().split(/\s+/);
        if (nameParts.length >= 1) {
          firstName = nameParts[0];
        }
        if (nameParts.length >= 2) {
          lastName = nameParts[nameParts.length - 1];
        }
        if (nameParts.length >= 3) {
          middleName = nameParts.slice(1, -1).join(" ");
        }
      }

      // console.log("🔍 EDITING SPEAKER - Parsed names:", { firstName, middleName, lastName });
      // console.log("🔍 EDITING SPEAKER - Sessions data:", editingSpeaker?.sessions);

      reset({
        firstname: firstName,
        middlename: middleName,
        lastname: lastName,
        email: editingSpeaker?.email || "",
        title: editingSpeaker?.title || "",
        professional_title:
          editingSpeaker?.professional_title ||
          editingSpeaker?.designation ||
          "",
        about: editingSpeaker?.about_yourself || "",
        youtube: editingSpeaker?.social_media?.youtube || "",
        instagram: editingSpeaker?.social_media?.instagram || "",
        linkedin: editingSpeaker?.social_media?.linkedin || "",
        twitter: editingSpeaker?.social_media?.twitter || "",
        sessionId: editingSpeaker?.sessions?.[0]?.session_id || "",
        organizationName: editingSpeaker?.organisation || "",
        designation: editingSpeaker?.designation || "",
        country: editingSpeaker?.country || "",
        photoIdType: editingSpeaker?.document_type || "",
        photoIdNumber: editingSpeaker?.document_number || "",
        passportType: editingSpeaker?.passport?.passport_type || "",
        passportNumber: editingSpeaker?.passport?.passport_number || "",
        placeOfIssue: editingSpeaker?.passport?.place_of_issue || "",
        passportExpiry: editingSpeaker?.passport?.expiry_date
          ? editingSpeaker.passport.expiry_date.split("T")[0]
          : "",
        hasOtherCitizenship:
          editingSpeaker?.hasOtherCitizenship ||
          editingSpeaker?.has_other_citizenship ||
          false,
        isOciCardHolder:
          editingSpeaker?.isOciCardHolder ||
          editingSpeaker?.is_oci_card_holder ||
          false,
        bloodGroup:
          editingSpeaker?.blood_group ||
          editingSpeaker?.user?.blood_group ||
          "",
        medicalConditions:
          editingSpeaker?.dietary_preferences ||
          editingSpeaker?.medical_conditions ||
          "",
      });

      // Set passport file if available
      if (editingSpeaker?.documents?.passport_document_signed_url) {
        setPassportFile({ name: "Passport already uploaded" });
      }
    } else {
      // Reset for adding new speaker
      reset({
        firstname: "",
        middlename: "",
        lastname: "",
        email: "",
        title: "",
        professional_title: "",
        about: "",
        youtube: "",
        instagram: "",
        linkedin: "",
        twitter: "",
        sessionId: "",
        organizationName: "",
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
        bloodGroup: "",
        medicalConditions: "",
      });
      setProfilePreview(null);
      setPhotoFile(null);
      setPassportFile(null);
      setHasNewPhoto(false);
      setHasNewPassport(false);
    }
  }, [editingSpeaker, reset]);

  const profileImage = watch("profileImage");
  const selectedCountry = watch("country");
  const selectedPhotoIdType = watch("photoIdType");
  const emailValue = watch("email");

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
  const passportTypes = [
    { value: "official", label: "Official Passport" },
    { value: "diplomatic_passport", label: "Diplomatic Passport" },
    { value: "official_travel_document", label: "Official Travel Document" },
  ];
  const selectedPhotoIdPlaceholder =
    photoIdTypes.find((d) => d.value === selectedPhotoIdType)?.placeholder ||
    "Enter Document Number";
  const showPassportSection = selectedCountry && selectedCountry !== "india";

  // Handle profile image preview
  useEffect(() => {
    if (editingSpeaker) {
      if (editingSpeaker?.photo_signed_url) {
        setProfilePreview(editingSpeaker.photo_signed_url);
      } else if (editingSpeaker?.documents?.photo_signed_url) {
        setProfilePreview(editingSpeaker.documents.photo_signed_url);
      } else if (editingSpeaker?.documents?.photo_url) {
        setProfilePreview(editingSpeaker.documents.photo_url);
      } else if (editingSpeaker?.profileImage) {
        setProfilePreview(editingSpeaker.profileImage);
      }
    } else {
      setProfilePreview(null);
      setPhotoFile(null);
      setPassportFile(null);
      setHasNewPhoto(false);
      setHasNewPassport(false);
    }
  }, [editingSpeaker]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (profilePreview && profilePreview.startsWith("blob:")) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  // File upload validation
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
      setProfilePreview(preview);
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

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      processFileSelection(file, "photo");
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
      processFileSelection(file, "passport");
    }
  };

  const onSubmit = async (data) => {
    // console.log("🚀 STARTING SPEAKER SAVE PROCESS");
    // console.log("🚀 Raw form data received:", data);
    // console.log("🚀 Editing speaker state:", editingSpeaker);
    // console.log("🚀 Is editing mode:", !!editingSpeaker);
    // console.log("🚀 User ID from editingSpeaker:", editingSpeaker?.user?.id || editingSpeaker?.id);

    try {
      setIsSubmitting(true);

      // Convert files to base64 - only if they are actual File objects
      const photoBase64 =
        photoFile && photoFile instanceof File
          ? await fileToBase64(photoFile)
          : null;
      const passportBase64 =
        passportFile && passportFile instanceof File
          ? await fileToBase64(passportFile)
          : null;

      // console.log("📁 FILE CONVERSION - photoFile:", photoFile, "is File:", photoFile instanceof File);
      // console.log("📁 FILE CONVERSION - passportFile:", passportFile, "is File:", passportFile instanceof File);
      // console.log("📁 FILE CONVERSION - photoBase64:", photoBase64 ? "converted" : "skipped");
      // console.log("📁 FILE CONVERSION - passportBase64:", passportBase64 ? "converted" : "skipped");

      // Create speaker object matching new API structure
      const speakerData = {
        first_name: data.firstname,
        last_name: data.lastname || "",
        email: data.email,
        organisation: data.organizationName || "",
        designation: data.designation || "",
        country: data.country || "",
      };

      // Add blood group and dietary/medical info
      if (data.bloodGroup) {
        speakerData.blood_group = data.bloodGroup;
      }
      if (data.medicalConditions) {
        speakerData.medical_conditions = data.medicalConditions;
        speakerData.dietary_preferences = data.medicalConditions;
      }

      // Add middle name if provided
      if (data.middlename) {
        speakerData.middle_name = data.middlename;
      }

      // Add professional title if provided
      if (data.professional_title) {
        speakerData.professional_title = data.professional_title;
      }

      // Add title if provided
      if (data.title) {
        speakerData.title = data.title;
      }

      // Add about if provided
      if (data.about) {
        speakerData.about_yourself = data.about;
      }

      // Add social media if provided
      const socialMedia = {};
      if (data.youtube) {
        socialMedia.youtube = data.youtube;
      }
      if (data.instagram) {
        socialMedia.instagram = data.instagram;
      }
      if (data.linkedin) {
        socialMedia.linkedin = data.linkedin;
      }
      if (data.twitter) {
        socialMedia.twitter = data.twitter;
      }
      if (Object.keys(socialMedia).length > 0) {
        speakerData.social_media = socialMedia;
      }

      // Add country-specific fields
      if (data.country === "india") {
        if (data.photoIdType) {
          speakerData.document_type = data.photoIdType;
        }
        if (data.photoIdNumber) {
          speakerData.document_number = data.photoIdNumber;
        }
      } else if (data.country) {
        const passport = {};
        if (data.passportType) {
          passport.passport_type = data.passportType;
        }
        if (data.passportNumber) {
          passport.passport_number = data.passportNumber;
        }
        if (data.placeOfIssue) {
          passport.place_of_issue = data.placeOfIssue;
        }
        if (data.passportExpiry) {
          passport.expiry_date = data.passportExpiry;
        }
        if (Object.keys(passport).length > 0) {
          speakerData.passport = passport;
        }
      }

      // Add citizenship fields
      speakerData.has_other_citizenship = data.hasOtherCitizenship || false;
      speakerData.is_oci_card_holder = data.isOciCardHolder || false;

      // Add session if provided
      if (data.sessionId) {
        speakerData.session = data.sessionId;
        speakerData.session_id = data.sessionId; // Also add session_id for consistency
      }

      // Add event_id if provided
      if (eventId) {
        speakerData.event_id = eventId;
      }

      // Create payload with speakers as JSON string
      const payload = {
        speakers: JSON.stringify([speakerData]),
      };

      let response;
      if (editingSpeaker) {
        // console.log("🚀 STARTING SPEAKER UPDATE PROCESS");
        // console.log("🚀 Editing speaker data:", editingSpeaker);
        // console.log("🚀 Form data to submit:", data);

        // Check if we have actual File objects to upload (not placeholder objects)
        const hasFiles =
          (photoFile && photoFile instanceof File) ||
          (passportFile && passportFile instanceof File);
        // console.log("🚀 Has actual files to upload:", hasFiles, {
        //   photoFile: photoFile instanceof File,
        //   passportFile: passportFile instanceof File
        // });

        if (hasFiles) {
          // console.log("🚀 Using FormData path for file upload");
          // Use FormData for file uploads
          const formData = new FormData();

          formData.append("firstname", data.firstname);
          if (data.middlename) {
            formData.append("middle_name", data.middlename);
          }
          if (data.lastname) {
            formData.append("last_name", data.lastname);
          }
          formData.append("email", data.email);

          if (data.title) {
            formData.append("title", data.title);
          }

          if (data.professional_title) {
            formData.append("professional_title", data.professional_title);
          }

          if (data.about) {
            formData.append("about_yourself", data.about);
          }

          if (data.organizationName) {
            formData.append("organisation", data.organizationName);
          }

          if (data.designation) {
            formData.append("designation", data.designation);
          }

          if (data.country) {
            formData.append("country", data.country);
          }

          // Add blood group and dietary/medical info to FormData
          if (data.bloodGroup) {
            formData.append("blood_group", data.bloodGroup);
          }
          if (data.medicalConditions) {
            formData.append("medical_conditions", data.medicalConditions);
            formData.append("dietary_preferences", data.medicalConditions);
          }

          if (data.photoIdType) {
            formData.append("document_type", data.photoIdType);
          }

          if (data.photoIdNumber) {
            formData.append("document_number", data.photoIdNumber);
          }

          // Add social media as individual fields
          if (data.youtube) {
            formData.append("youtube", data.youtube);
          }
          if (data.instagram) {
            formData.append("instagram", data.instagram);
          }
          if (data.linkedin) {
            formData.append("linkedin", data.linkedin);
          }
          if (data.twitter) {
            formData.append("twitter", data.twitter);
          }

          // Add passport fields
          if (data.passportType) {
            formData.append("passport_type", data.passportType);
          }
          if (data.passportNumber) {
            formData.append("passport_number", data.passportNumber);
          }
          if (data.placeOfIssue) {
            formData.append("place_of_issue", data.placeOfIssue);
          }
          if (data.passportExpiry) {
            formData.append("passport_expiry", data.passportExpiry);
          }

          // Add citizenship fields
          formData.append(
            "has_other_citizenship",
            data.hasOtherCitizenship || false,
          );
          formData.append("is_oci_card_holder", data.isOciCardHolder || false);

          // Add photo if it's an actual File object
          if (photoFile && photoFile instanceof File) {
            formData.append("photo", photoFile);
          }

          // Add passport document if it's an actual File object
          if (
            passportFile &&
            passportFile instanceof File &&
            data.country &&
            data.country !== "india"
          ) {
            formData.append("passport_document", passportFile);
          }

          // Add event_id if provided
          if (eventId) {
            formData.append("event_id", eventId);
          }

          // Add session if provided
          if (data.sessionId) {
            formData.append("session_id", data.sessionId);
            formData.append("session", data.sessionId);
          }

          const userIdToUse =
            editingSpeaker.id ||
            editingSpeaker.user?.id ||
            editingSpeaker.user_id ||
            editingSpeaker._id;
          // console.log("🚀 FormData prepared, calling updateSpeakerProfile with userId:", userIdToUse);
          // console.log("🚀 FormData contents:");
          // for (let [key, value] of formData.entries()) {
          //   console.log(`🚀 FormData ${key}:`, value);
          // }

          response = await updateSpeakerProfile(userIdToUse, formData);
          // console.log("🚀 FormData update response:", response);
        } else {
          // Use JSON payload for updates without new files
          // console.log("🚀 Using JSON path for data-only update (no new files)");
          const updateSpeakerData = {
            ...speakerData,
            id: editingSpeaker.id || editingSpeaker._id,
          };

          // Ensure dietary and blood group fields are included in JSON update
          if (data.bloodGroup) updateSpeakerData.blood_group = data.bloodGroup;
          if (data.medicalConditions) {
            updateSpeakerData.medical_conditions = data.medicalConditions;
            updateSpeakerData.dietary_preferences = data.medicalConditions;
          }

          // console.log("🚀 Using JSON payload for update");
          // console.log("🚀 Update speaker data:", updateSpeakerData);
          // console.log("🚀 JSON payload keys:", Object.keys(updateSpeakerData));
          const userIdToUse =
            editingSpeaker.id ||
            editingSpeaker.user?.id ||
            editingSpeaker.user_id ||
            editingSpeaker._id;
          // console.log("🚀 Calling updateSpeakerProfile with userId:", userIdToUse);

          response = await updateSpeakerProfile(userIdToUse, updateSpeakerData);
          // console.log("🚀 JSON update response:", response);
        }
      } else {
        // For creating new speaker, check if we have files
        const hasFiles =
          (photoFile && photoFile instanceof File) ||
          (passportFile && passportFile instanceof File);

        if (hasFiles) {
          // Use FormData for file uploads
          const formData = new FormData();

          // Append the speakers JSON
          formData.append("speakers", JSON.stringify([speakerData]));

          // Also include blood/diet fields on the top level if present (safety)
          if (data.bloodGroup) formData.append("blood_group", data.bloodGroup);
          if (data.medicalConditions) {
            formData.append("medical_conditions", data.medicalConditions);
            formData.append("dietary_preferences", data.medicalConditions);
          }

          // Append files with correct field names
          if (photoFile && photoFile instanceof File) {
            formData.append("photo", photoFile);
          }
          if (passportFile && passportFile instanceof File) {
            formData.append("passport_document", passportFile);
          }

          // console.log("🚀 DEBUG - Using FormData for creation with files");
          // console.log(
          //   "🚀 DEBUG - FormData contents:",
          //   Array.from(formData.entries()),
          // );
          // console.log("🚀 DEBUG - FormData contents:", Array.from(formData.entries()));

          response = await addSpeakersJSON(formData); // Assuming API accepts FormData
        } else {
          // Use JSON payload when no files
          // console.log("🚀 DEBUG - Using JSON for creation (no files)");
          // console.log("🚀 DEBUG - Payload to send to API:", payload);
          // console.log("🚀 DEBUG - Speaker data object:", speakerData);
          response = await addSpeakersJSON(payload);
        }
      }

      // Show success toast
      toast.success(
        editingSpeaker
          ? "Speaker updated successfully"
          : "Speaker created successfully",
      );

      // For updates, create the updated speaker object from form data since API might return old data
      let speakerToUpdate =
        response?.speakers?.[0] || response?.speaker || response;
      // console.log("✅ SUCCESS - Raw API response:", response);
      console.log("✅ SUCCESS - Extracted speaker data:", speakerToUpdate);

      if (editingSpeaker && speakerToUpdate) {
        // Merge the form data with the response to ensure we have the latest data
        speakerToUpdate = {
          ...speakerToUpdate,
          first_name: data.firstname,
          middle_name: data.middlename || "",
          last_name: data.lastname || "",
          email: data.email,
          title: data.title || "",
          professional_title: data.professional_title || "",
          about_yourself: data.about || "",
          organisation: data.organizationName || "",
          designation: data.designation || "",
          country: data.country || "",
          document_type: data.photoIdType || "",
          document_number: data.photoIdNumber || "",
          social_media: {
            youtube: data.youtube || null,
            instagram: data.instagram || null,
            linkedin: data.linkedin || null,
            twitter: data.twitter || null,
          },
          passport:
            data.country && data.country !== "india"
              ? {
                passport_type: data.passportType || "",
                passport_number: data.passportNumber || "",
                place_of_issue: data.placeOfIssue || "",
                expiry_date: data.passportExpiry || "",
              }
              : speakerToUpdate.passport,
          blood_group: data.bloodGroup || speakerToUpdate.blood_group,
          medical_conditions:
            data.medicalConditions || speakerToUpdate.medical_conditions,
          dietary_preferences:
            data.medicalConditions || speakerToUpdate.dietary_preferences,
          sessions: data.sessionId
            ? [
              {
                session_id: data.sessionId,
                session_name:
                  sessions.find((s) => s._id === data.sessionId)?.name || "",
              },
            ]
            : speakerToUpdate.sessions,
        };
        // console.log("✅ SUCCESS - Merged speaker data for UI update:", speakerToUpdate);
      }

      // console.log("✅ SUCCESS - Calling onSpeakerAdded with:", speakerToUpdate, !!editingSpeaker);
      onSpeakerAdded(speakerToUpdate, !!editingSpeaker);
      handleClose();
    } catch (err) {
      // console.error("❌ FAILED TO SAVE SPEAKER");
      // console.error("❌ Error object:", err);
      // console.error("❌ Error response data:", err?.response?.data);
      // console.error("❌ Error response status:", err?.response?.status);
      // console.error("❌ Error response headers:", err?.response?.headers);
      // console.error("❌ Error message:", err?.message);
      // console.error("❌ Editing speaker data:", editingSpeaker);
      // console.error("❌ Form data that failed:", data);

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save speaker";
      // console.error("❌ Final error message shown to user:", errorMessage);

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      reset();
      setProfilePreview(null);
      setPhotoFile(null);
      setPassportFile(null);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${isAnimating ? "opacity-40" : "opacity-0"
          }`}
        onClick={handleClose}
        style={{ margin: 0, padding: 0 }}
      />
      {/* Drawer */}
      <aside
        className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-2xl max-h-[calc(100vh-64px)]
          sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl
          md:w-[700px] lg:w-[820px] overflow-hidden
          ${isAnimating
            ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
          }`}
        style={{ top: "64px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
            {editingSpeaker ? "Edit Speaker" : "Add Speaker"}
          </h2>
          <button
            onClick={handleClose}
            type="button"
            className="hover:bg-gray-100 rounded-md p-1.5 sm:p-2 -mr-1"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-[#f9fafd] p-4 rounded-lg mb-4">
              {/* Profile Photo Section - Circular like profile page */}
              <div className="mb-6 flex justify-center">
                <div className="text-center">
                  <label
                    htmlFor="profile-upload"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 w-32 h-32 rounded-full
                  ${isDragActive ? "border-[#1e4788] bg-blue-50" : "border-gray-300"}
                  hover:border-[#1e4788] transition-colors
                  flex items-center justify-center
                  cursor-pointer overflow-hidden relative block`}
                  >
                    <input
                      type="file"
                      id="profile-upload"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "photo")}
                    />

                    {/* If NO photo */}
                    {!profilePreview && (
                      <p className="text-sm text-gray-600 text-center px-2">
                        Click or drag to upload photo
                      </p>
                    )}

                    {/* If photo exists */}
                    {profilePreview && (
                      <img
                        src={profilePreview}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-full"
                      />
                    )}
                  </label>
                  {!profilePreview ? (
                    <label className="block text-xs mt-2 text-gray-700">
                      Upload Photo
                    </label>
                  ) : (
                    <p className="text-xs text-gray-600 mt-2">Photo Selected</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Title</label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={[{ value: "", label: "Select Your Title" }].concat(titles)}
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                        placeholder="Select Your Title"
                        searchable={true}
                        id="speaker-title"
                      />
                    )}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">
                    Professional Title
                  </label>
                  <input
                    type="text"
                    {...register("professional_title")}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.professional_title ? "border-red-500" : ""}`}
                    placeholder="e.g., CEO, Director, Manager"
                  />
                  {errors.professional_title && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.professional_title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("firstname")}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.firstname ? "border-red-500" : ""}`}
                    placeholder="Enter First Name"
                  />
                  {errors.firstname && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.firstname.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Middle Name</label>
                  <input
                    type="text"
                    {...register("middlename")}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Enter Middle Name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <input
                    type="text"
                    {...register("lastname")}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Enter Last Name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    disabled={
                      !!(
                        editingSpeaker &&
                        (editingSpeaker.email ||
                          editingSpeaker.user?.email ||
                          editingSpeaker.documents?.email)
                      )
                    }
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.email ? "border-red-500" : ""
                      } ${editingSpeaker && (editingSpeaker.email || editingSpeaker.user?.email || editingSpeaker.documents?.email) ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    placeholder="Enter Email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Organization Name</label>
                  <input
                    type="text"
                    {...register("organizationName")}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.organizationName ? "border-red-500" : ""}`}
                    placeholder="Enter Organization Name"
                  />
                  {errors.organizationName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.organizationName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Designation</label>
                  <input
                    type="text"
                    {...register("designation")}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.designation ? "border-red-500" : ""}`}
                    placeholder="Enter Designation"
                  />
                  {errors.designation && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.designation.message}
                    </p>
                  )}
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                  <Controller
                    name="bloodGroup"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={[{ value: "", label: "Select" }].concat(bloodGroups)}
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                        placeholder="Select"
                        searchable={true}
                        id="speaker-bloodgroup"
                      />
                    )}
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

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Country</label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={[{ value: "", label: "Select a Country (Optional)" }].concat(countries)}
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                        placeholder="Select a Country (Optional)"
                        searchable={true}
                        id="speaker-country"
                      />
                    )}
                  />
                  {errors.country && (
                    <p className="mt-1 text-xs text-red-500">{errors.country.message}</p>
                  )}
                </div>

                {/* Photo ID Section - India Only */}
                {selectedCountry === "india" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">
                        Photo ID Document Type{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="photoIdType"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={[{ value: "", label: "Select Document Type" }].concat(photoIdTypes)}
                            value={field.value}
                            onChange={(v) => field.onChange(v)}
                            placeholder="Select Document Type"
                            searchable={true}
                            id="speaker-photoIdType"
                          />
                        )}
                      />
                      {errors.photoIdType && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.photoIdType.message}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">
                        Document Number <span className="text-red-500">*</span>
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
                        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.photoIdNumber ? "border-red-500" : ""}`}
                      />
                      {errors.photoIdNumber && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.photoIdNumber.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Passport Section - Non-India */}
                {showPassportSection && (
                  <>
                    <div className="sm:col-span-2">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">
                        Passport Details
                      </h3>
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Passport Type <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="passportType"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={[{ value: "", label: "Select Passport Type" }].concat(passportTypes)}
                            value={field.value}
                            onChange={(v) => field.onChange(v)}
                            placeholder="Select Passport Type"
                            searchable={true}
                            id="speaker-passportType"
                          />
                        )}
                      />
                      {errors.passportType && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.passportType.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Passport Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="ABC01234"
                        {...register("passportNumber")}
                        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.passportNumber ? "border-red-500" : ""}`}
                      />
                      {errors.passportNumber && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.passportNumber.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Place of Issue <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Place of Issue"
                        {...register("placeOfIssue")}
                        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.placeOfIssue ? "border-red-500" : ""}`}
                      />
                      {errors.placeOfIssue && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.placeOfIssue.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Passport Expiry Date{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        {...register("passportExpiry")}
                        min={new Date().toISOString().split("T")[0]}
                        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.passportExpiry ? "border-red-500" : ""}`}
                      />
                      {errors.passportExpiry && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.passportExpiry.message}
                        </p>
                      )}
                    </div>

                    {/* Upload Documents Section - Passport */}
                    <div className="sm:col-span-2 mt-4 border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        Upload Documents
                      </h3>
                      <p className="text-gray-600 text-xs mb-4">
                        Please provide your documents
                      </p>

                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Upload your Passport
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isPassportDragActive
                          ? "border-[#1e4788] bg-blue-50"
                          : "border-gray-300 hover:border-[#1e4788]"
                          }`}
                        onDragOver={handlePassportDragOver}
                        onDragLeave={handlePassportDragLeave}
                        onDrop={handlePassportDrop}
                      >
                        <p className="text-xs text-gray-500 leading-relaxed">
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
                        <label
                          htmlFor="passport-upload"
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col items-center gap-2 mt-3">
                            <FiUpload className="w-6 h-6 text-gray-400" />
                            <p className="text-xs text-gray-600">
                              Choose a file or drag and drop it here
                            </p>
                            <p className="text-xs text-gray-500">
                              PDF or image file up to 5 MB
                            </p>
                            <p className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50">
                              Browse File
                            </p>
                          </div>
                        </label>
                        {passportFile && (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <p className="text-xs text-green-600 font-medium">
                              ✓ {passportFile?.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Sessions</label>
                  <Controller
                    name="sessionId"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={[{ value: "", label: isLoadingSessions ? "Loading sessions..." : "Select a Session" }].concat(
                          (sessions || []).map((session) => ({
                            value: session._id,
                            label: `${session.name}${session.event_id && session.event_id.name ? ` - ${session.event_id.name}` : ""}`,
                          })),
                        )}
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                        placeholder={isLoadingSessions ? "Loading sessions..." : "Select a Session"}
                        searchable={true}
                        id="speaker-session"
                      />
                    )}
                  />
                  {errors.sessionId && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.sessionId.message}
                    </p>
                  )}
                </div>
                {/* Event - TODO: Replace with sessions 
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Event</label>
                <select
                  {...register("eventId")}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.eventId ? "border-red-500" : ""}`}
                >
                  <option value="">Select an Event</option>
                  {events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.eventName || event.name}
                    </option>
                  ))}
                </select>
                {errors.eventId && (
                  <p className="mt-1 text-xs text-red-500">{errors.eventId.message}</p>
                )}
              </div>
              */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">About Yourself</label>
                  <textarea
                    {...register("about")}
                    rows="4"
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.about ? "border-red-500" : ""}`}
                    placeholder="Tell us about yourself, your experience, and expertise"
                  />
                  {errors.about && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.about.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">YouTube URL</label>
                  <input
                    type="url"
                    {...register("youtube")}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.youtube ? "border-red-500" : ""}`}
                    placeholder="https://youtube.com/..."
                  />
                  {errors.youtube && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.youtube.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Instagram Handle</label>
                  <input
                    type="text"
                    {...register("instagram")}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <input
                    type="url"
                    {...register("linkedin")}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.linkedin ? "border-red-500" : ""}`}
                    placeholder="https://linkedin.com/in/..."
                  />
                  {errors.linkedin && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.linkedin.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">X URL</label>
                  <input
                    type="url"
                    {...register("twitter")}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.twitter ? "border-red-500" : ""}`}
                    placeholder="https://x.com/..."
                  />
                  {errors.twitter && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.twitter.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Submit Button */}
            <div className="flex justify-end gap-2 pb-4 pt-4 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md text-white font-semibold flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--color-primary-blue)" }}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingSpeaker
                    ? "Update Speaker"
                    : "Add Speaker"}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
};

export default AddSpeakerDrawer;
