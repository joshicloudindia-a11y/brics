import Joi from "joi";
import { sanitizeHtmlString } from "../data/sanitize.js";

/* ======================================================
   CUSTOM SANITIZER
====================================================== */
const cleanString = (value) => {
  if (typeof value !== "string") return value;
  return sanitizeHtmlString(value);
};

/* ======================================================
   SEND LOGIN OTP
====================================================== */
export const sendOtpSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
}).options({
  allowUnknown: false
});


/* ======================================================
   VERIFY LOGIN OTP
====================================================== */
export const verifyOtpSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]{6}$/)
    .required(),
});

/* ======================================================
   USER PROFILE (CREATE / UPDATE)
====================================================== */
export const userProfileSchema = Joi.object({
  user_id: Joi.string().optional(),

  title: Joi.string().custom(cleanString).max(20).allow("", null),

  first_name: Joi.string().custom(cleanString).max(50).allow("", null),
  middle_name: Joi.string().custom(cleanString).max(50).allow("", null),
  last_name: Joi.string().custom(cleanString).max(50).allow("", null),

  organisation: Joi.string().custom(cleanString).max(100).allow("", null),
  ministry_name: Joi.string().custom(cleanString).max(150).allow("", null),

  position: Joi.string().custom(cleanString).max(100).allow("", null),
  position_held_since: Joi.date().allow("",null),

  gender: Joi.string().allow("", null),
  blood_group: Joi.string().max(5).allow("", null),

  medical_conditions: Joi.string().custom(cleanString).max(255).allow("", null),
  dietary_preferences: Joi.string().custom(cleanString).max(255).allow("", null),

  mobile: Joi.string().pattern(/^[0-9]{8,15}$/).optional().allow("", null),

  country: Joi.string().custom(cleanString).max(50).allow("", null),
  state: Joi.string().custom(cleanString).max(50).allow("", null),
  city: Joi.string().custom(cleanString).max(50).allow("", null),
  pincode: Joi.string().max(10).allow("", null),

  full_address: Joi.string().custom(cleanString).max(255).allow("", null),

  passport_type: Joi.string().custom(cleanString).allow("", null),
  passport_number: Joi.string().custom(cleanString).allow("", null),
  place_of_issue: Joi.string().custom(cleanString).allow("", null),
  expiry_date: Joi.date().iso().allow("", null),

  document_type: Joi.string().custom(cleanString).allow("", null),
  document_number: Joi.string().custom(cleanString).allow("", null),
});

/* ======================================================
   ACTIVATE / DEACTIVATE USER
====================================================== */
export const activateDeactivateUserSchema = Joi.object({
  action: Joi.string()
    .valid('activate', 'deactivate')
    .required()
    .messages({
      'any.only': 'Action must be either "activate" or "deactivate"',
      'any.required': 'Action is required'
    })
});

/* ======================================================
   UPDATE USER ROLE
====================================================== */
export const updateUserRoleSchema = Joi.object({
  user_id: Joi.string()
    .required()
    .messages({
      'any.required': 'user_id is required'
    }),

  role: Joi.string()
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
      "SUPER ADMIN"
    )
    .required()
    .messages({
      'any.required': 'role is required',
      'any.only': 'role must be a valid role name'
    })
});

