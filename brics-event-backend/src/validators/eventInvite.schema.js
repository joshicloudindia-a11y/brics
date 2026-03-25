import Joi from "joi";
import { sanitizeHtmlString } from "../data/sanitize.js";

/* ======================================================
   COMMON SANITIZER
====================================================== */
const cleanString = (value) => {
  if (typeof value !== "string") return value;
  return sanitizeHtmlString(value);
};

/* ======================================================
   DELEGATE ITEM SCHEMA
====================================================== */
const delegateSchema = Joi.object({
  firstName: Joi.string().custom(cleanString).max(50).required(),

  middleName: Joi.string().custom(cleanString).max(50).allow("", null),

  lastName: Joi.string().custom(cleanString).max(50).allow("", null),

  email: Joi.string().email().lowercase().trim().required(),

  inviteAs: Joi.string()
    .valid(
      "DELEGATE",
      "HEAD OF DELEGATE",
      "DAO",
      "EVENT MANAGER",
      "SECURITY OFFICER",
      "INTERPRETER",
      "MEDIA",
      "DEPUTY",
      "DELEGATION CONTACT OFFICER",
      "SPEAKER",
    )
    .required(),
});

/* ======================================================
   DELEGATE INVITE PAYLOAD
====================================================== */
export const inviteDelegateSchema = Joi.object({
  event_id: Joi.string().required(),

  delegates: Joi.array().items(delegateSchema).min(1).required(),

  daoId: Joi.string().optional().allow(null, "").messages({
    "string.base": "daoId must be a string (user ID of the DAO)",
  }),
});

/* ======================================================
   DAO ITEM SCHEMA
====================================================== */
const daoSchema = Joi.object({
  firstName: Joi.string().custom(cleanString).max(50).required(),

  middleName: Joi.string().custom(cleanString).max(50).allow("", null),

  lastName: Joi.string().custom(cleanString).max(50).allow("", null),

  email: Joi.string().email().lowercase().trim().required(),

  country: Joi.string().custom(cleanString).max(100).allow("", null),

  citizenship: Joi.string().custom(cleanString).max(100).allow("", null),

  organisation: Joi.string().custom(cleanString).max(200).allow("", null),

  participantType: Joi.string().custom(cleanString).max(100).allow("", null),

  foreignRepType: Joi.string().custom(cleanString).max(50).allow("", null),
});

/* ======================================================
   DAO INVITE PAYLOAD
====================================================== */
export const inviteDaoSchema = Joi.object({
  daos: Joi.array().items(daoSchema).min(1).required(),
});

/* ======================================================
   OPEN INVITE - SINGLE
   - delegate: object matching delegateSchema
   - expires_in_days: optional number
====================================================== */
export const openInviteSchema = Joi.object({
  firstName: Joi.string().max(50).required(),
  lastName: Joi.string().max(50).allow("", null),
  email: Joi.string().email().lowercase().trim().required(),

  phoneCountry: Joi.string().max(5).optional(),
  phone: Joi.string().max(20).optional(),
  gender: Joi.string().optional(),
  dob: Joi.date().optional(),
  country: Joi.string().optional(),

  inviteAs: Joi.string()
    .valid(
      "Delegate",
      "Govt. officials",
      "Speakers",
      "Industry",
      "Academia",
      "Media",
      "Others",
    )
    .required(),

  docType: Joi.string().optional(),
  docNumber: Joi.string().optional(),

  declaration1: Joi.boolean().optional(),
  declaration2: Joi.boolean().optional(),

  inviteToken: Joi.string().optional(),
  expires_in_days: Joi.number().integer().min(1).max(365).optional(),
});

/* ======================================================
   SPEAKER ITEM SCHEMA
====================================================== */
const speakerSchema = Joi.object({
  firstName: Joi.string().custom(cleanString).max(50).required(),
  first_name: Joi.string().custom(cleanString).max(50).optional(),

  middleName: Joi.string().custom(cleanString).max(50).allow("", null),
  middle_name: Joi.string().custom(cleanString).max(50).allow("", null),

  lastName: Joi.string().custom(cleanString).max(50).allow("", null),
  last_name: Joi.string().custom(cleanString).max(50).allow("", null),

  title: Joi.string().custom(cleanString).max(50).allow("", null),

  email: Joi.string().email().lowercase().trim().required(),

  organisationName: Joi.string().custom(cleanString).max(200).allow("", null),
  organisation: Joi.string().custom(cleanString).max(200).allow("", null),

  designation: Joi.string().custom(cleanString).max(100).allow("", null),

  session: Joi.string().custom(cleanString).max(200).allow("", null),
  session_id: Joi.string().custom(cleanString).max(200).allow("", null),

  about_yourself: Joi.string().custom(cleanString).max(500).allow("", null),
  about: Joi.string().custom(cleanString).max(500).allow("", null),

  youtube: Joi.string().custom(cleanString).max(200).allow("", null),

  instagram: Joi.string().custom(cleanString).max(200).allow("", null),

  linkedin: Joi.string().custom(cleanString).max(200).allow("", null),

  twitter: Joi.string().custom(cleanString).max(200).allow("", null),

  // Additional fields from Speaker model
  professional_title: Joi.string().custom(cleanString).max(100).allow("", null),

  country: Joi.string().custom(cleanString).max(100).allow("", null),

  photoIdType: Joi.string().valid('passport', 'national_id', 'driving_license', 'other').allow("", null),
  photoIdType: Joi.string().valid('passport', 'national_id', 'driving_license', 'other').allow("", null),

  photoIdNumber: Joi.string().custom(cleanString).max(50).allow("", null),
  photoIdNumber: Joi.string().custom(cleanString).max(50).allow("", null),

  passportType: Joi.string().valid('ordinary', 'diplomatic', 'official', 'service', 'emergency').allow("", null),
  passport_type: Joi.string().valid('ordinary', 'diplomatic', 'official', 'service', 'emergency').allow("", null),

  passportNumber: Joi.string().custom(cleanString).max(50).allow("", null),
  passport_number: Joi.string().custom(cleanString).max(50).allow("", null),

  placeOfIssue: Joi.string().custom(cleanString).max(100).allow("", null),
  place_of_issue: Joi.string().custom(cleanString).max(100).allow("", null),

  passportExpiry: Joi.date().allow(null),
  passport_expiry: Joi.date().allow(null),

  // Base64 uploads
  photo: Joi.string().allow("", null), // Base64 image

  passport_document: Joi.string().allow("", null), // Base64 passport document
  // Health / dietary fields
  blood_group: Joi.string().max(10).allow("", null),
  bloodGroup: Joi.string().max(10).allow("", null),
  dietary_preferences: Joi.string().custom(cleanString).max(500).allow("", null),
  dietaryPreferences: Joi.string().custom(cleanString).max(500).allow("", null),
}).unknown(true);

/* ======================================================
   SPEAKER INVITE PAYLOAD
====================================================== */
export const inviteSpeakerSchema = Joi.object({
  event_id: Joi.string().optional().allow(null, "").messages({
    "string.base": "event_id must be a string (event ID to assign speaker to)",
  }),

  speakers: Joi.alternatives()
    .try(
      // Try as array first (for JSON requests)
      Joi.array().items(speakerSchema).min(1),
      // Try as JSON string (for multipart/form-data)
      Joi.string().custom((value) => {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new Error("speakers must be a JSON array");
          }
          if (parsed.length === 0) {
            throw new Error("speakers array must contain at least 1 item");
          }
          return parsed;
        } catch (error) {
          throw new Error(`Invalid speakers JSON: ${error.message}`);
        }
      }),
      // Try as single speaker object
      speakerSchema
    )
    .required()
    .messages({
      "alternatives.match": "speakers must be an array, valid JSON string, or single speaker object",
      "any.required": "speakers is required"
    }),
}).unknown(true);

/* ======================================================
   UPDATE SPEAKER PAYLOAD
   Accepts both camelCase and snake_case field names
====================================================== */
export const updateSpeakerSchema = Joi.object({
  title: Joi.string().custom(cleanString).max(50).allow("", null),

  // firstName or first_name
  firstName: Joi.string().custom(cleanString).max(50).optional().allow("", null),
  first_name: Joi.string().custom(cleanString).max(50).optional().allow("", null),

  // middleName or middle_name
  middleName: Joi.string().custom(cleanString).max(50).allow("", null),
  middle_name: Joi.string().custom(cleanString).max(50).allow("", null),

  // lastName or last_name
  lastName: Joi.string().custom(cleanString).max(50).allow("", null),
  last_name: Joi.string().custom(cleanString).max(50).allow("", null),

  // email
  email: Joi.string().email().lowercase().trim().optional().allow("", null),

  // organisationName or organisation
  organisationName: Joi.string().custom(cleanString).max(200).optional().allow("", null),
  organisation: Joi.string().custom(cleanString).max(200).optional().allow("", null),

  // designation
  designation: Joi.string().custom(cleanString).max(100).optional().allow("", null),

  // session or session_id
  session: Joi.string().custom(cleanString).max(200).allow("", null),
  session_id: Joi.string().custom(cleanString).max(200).allow("", null),

  // about_yourself or about
  about_yourself: Joi.string().custom(cleanString).max(500).allow("", null),
  about: Joi.string().custom(cleanString).max(500).allow("", null),

  // youtube
  youtube: Joi.string().custom(cleanString).max(200).allow("", null),

  // instagram
  instagram: Joi.string().custom(cleanString).max(200).allow("", null),

  // linkedin
  linkedin: Joi.string().custom(cleanString).max(200).allow("", null),

  // twitter
  twitter: Joi.string().custom(cleanString).max(200).allow("", null),

  // document_type or photoIdType
  document_type: Joi.string().custom(cleanString).max(50).allow("", null),
  photoIdType: Joi.string().custom(cleanString).max(50).allow("", null),

  // document_number or photoIdNumber
  document_number: Joi.string().custom(cleanString).max(50).allow("", null),
  photoIdNumber: Joi.string().custom(cleanString).max(50).allow("", null),

  // passport_document_base64
  passport_document_base64: Joi.string().allow("", null),

  // passport object
  passport: Joi.object({
    passport_type: Joi.string().custom(cleanString).max(50).allow("", null),
    passportType: Joi.string().custom(cleanString).max(50).allow("", null),
    passport_number: Joi.string().custom(cleanString).max(50).allow("", null),
    passportNumber: Joi.string().custom(cleanString).max(50).allow("", null),
    place_of_issue: Joi.string().custom(cleanString).max(100).allow("", null),
    placeOfIssue: Joi.string().custom(cleanString).max(100).allow("", null),
    expiry_date: Joi.string().custom(cleanString).max(50).allow("", null),
    passportExpiry: Joi.string().custom(cleanString).max(50).allow("", null),
  }).allow(null),
  // Health / dietary fields
  blood_group: Joi.string().max(10).allow("", null),
  bloodGroup: Joi.string().max(10).allow("", null),
  dietary_preferences: Joi.string().custom(cleanString).max(500).allow("", null),
  dietaryPreferences: Joi.string().custom(cleanString).max(500).allow("", null),
}).unknown(true); // Allow other fields to pass through
