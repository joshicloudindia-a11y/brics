import Joi from "joi";

/**
 * =========================================================
 * CREATE SPEAKER SCHEMA
 * =========================================================
 */
export const createSpeakerSchema = Joi.object({
  firstname: Joi.string().min(1).max(100).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 1 character",
    "string.max": "First name cannot exceed 100 characters"
  }),

  lastname: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 1 character",
    "string.max": "Last name cannot exceed 100 characters"
  }),

  middlename: Joi.string().max(100).optional().allow(""),

  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required"
  }),

  organizationName: Joi.string().min(1).max(200).required().messages({
    "string.empty": "Organization name is required",
    "string.min": "Organization name must be at least 1 character",
    "string.max": "Organization name cannot exceed 200 characters"
  }),

  designation: Joi.string().min(1).max(200).required().messages({
    "string.empty": "Designation is required",
    "string.min": "Designation must be at least 1 character",
    "string.max": "Designation cannot exceed 200 characters"
  }),

  professional_title: Joi.string().max(200).optional().allow(""),

  country: Joi.string().max(100).optional().allow(""),

  photoIdType: Joi.string()
    .valid('passport', 'national_id', 'driving_license', 'other')
    .optional()
    .allow("")
    .messages({
      "any.only": "Photo ID type must be one of: passport, national_id, driving_license, other"
    }),

  photoIdNumber: Joi.string().max(50).optional().allow(""),

  passportType: Joi.string()
    .valid('ordinary', 'diplomatic', 'official', 'service', 'emergency')
    .optional()
    .allow("")
    .messages({
      "any.only": "Passport type must be one of: ordinary, diplomatic, official, service, emergency"
    }),

  passportNumber: Joi.string().max(50).optional().allow(""),

  placeOfIssue: Joi.string().max(100).optional().allow(""),

  passportExpiry: Joi.date().optional().allow(null),

  photo: Joi.string().optional().allow(""), // For base64 image upload

  passport_document: Joi.string().optional().allow("") // For base64 passport document upload
  ,
  blood_group: Joi.string().max(10).optional().allow(""),
  dietary_preferences: Joi.string().max(500).optional().allow("") // dietary restrictions / allergies
});

/**
 * =========================================================
 * UPDATE SPEAKER SCHEMA
 * =========================================================
 */
export const updateSpeakerSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).optional().allow("", null),

  last_name: Joi.string().min(1).max(100).optional().allow("", null),

  middle_name: Joi.string().max(100).optional().allow("", null),

  email: Joi.string().email().optional().allow("", null),

  organisation: Joi.string().min(1).max(200).optional().allow("", null),

  designation: Joi.string().min(1).max(200).optional().allow("", null),

  professional_title: Joi.string().max(200).optional().allow("", null),

  country: Joi.string().max(100).optional().allow("", null),

  photoIdType: Joi.string()
    .valid('passport', 'national_id', 'driving_license', 'other')
    .optional()
    .allow("", null)
    .messages({
      "any.only": "Photo ID type must be one of: passport, national_id, driving_license, other"
    }),

  photoIdNumber: Joi.string().max(50).optional().allow("", null),

  passport_type: Joi.string()
    .valid('ordinary', 'diplomatic', 'official', 'service', 'emergency')
    .optional()
    .allow("", null)
    .messages({
      "any.only": "Passport type must be one of: ordinary, diplomatic, official, service, emergency"
    }),

  passport_number: Joi.string().max(50).optional().allow("", null),

  place_of_issue: Joi.string().max(100).optional().allow("", null),

  passport_expiry: Joi.date().optional().allow(null),

  photo: Joi.string().optional().allow("", null), // For base64 image upload

  passport_document: Joi.string().optional().allow("", null) // For base64 passport document upload
  ,
  blood_group: Joi.string().max(10).optional().allow("", null),
  dietary_preferences: Joi.string().max(500).optional().allow("", null) // dietary restrictions / allergies
}).min(1).unknown(true).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * =========================================================
 * SPEAKER ID PARAM SCHEMA
 * =========================================================
 */
export const speakerIdParamSchema = Joi.object({
  speakerId: Joi.string().required().messages({
    "string.empty": "Speaker ID is required"
  })
});