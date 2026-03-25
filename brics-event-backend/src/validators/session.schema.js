import Joi from "joi";

/**
 * =========================================================
 * CREATE SESSION SCHEMA
 * =========================================================
 */
export const createSessionSchema = Joi.object({
  name: Joi.string().min(2).max(200).required().messages({
    "string.empty": "Session name is required",
    "string.min": "Session name must be at least 2 characters",
    "string.max": "Session name cannot exceed 200 characters"
  }),

  type: Joi.string()
    .valid("in-person", "virtual", "hybrid")
    .required()
    .messages({
      "any.only": "Type must be one of: in-person, virtual, hybrid",
      "string.empty": "Session type is required"
    }),

  category: Joi.string().max(100).optional().allow(""),

  description: Joi.string().max(2000).optional().allow(""),

  start_datetime: Joi.date().iso().required().messages({
    "date.base": "Start datetime must be a valid date",
    "any.required": "Start datetime is required"
  }),

  end_datetime: Joi.date().iso().greater(Joi.ref("start_datetime")).required().messages({
    "date.base": "End datetime must be a valid date",
    "date.greater": "End datetime must be after start datetime",
    "any.required": "End datetime is required"
  }),

  use_event_location: Joi.boolean().optional().default(false),

  location: Joi.string().max(300).when("use_event_location", {
    is: false,
    then: Joi.optional().allow(""),
    otherwise: Joi.optional().allow("")
  }),

  meeting_url: Joi.string().optional().allow(""),

  capacity: Joi.number().integer().min(1).optional().messages({
    "number.min": "Capacity must be at least 1"
  }),

  conference_hall_id: Joi.string().optional().allow("", null),

  photo_base64: Joi.string().optional().allow(""), // For base64 photo upload

  agendas: Joi.alternatives().try(
    Joi.string(),
    Joi.array()
  ).optional()
});

/**
 * =========================================================
 * UPDATE SESSION SCHEMA
 * =========================================================
 */
export const updateSessionSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),

  type: Joi.string()
    .valid("in-person", "virtual", "hybrid")
    .optional()
    .messages({
      "any.only": "Type must be one of: in-person, virtual, hybrid"
    }),

  category: Joi.string().max(100).optional().allow(""),

  description: Joi.string().max(2000).optional().allow(""),

  start_datetime: Joi.date().iso().optional(),

  end_datetime: Joi.date().iso().optional(),

  use_event_location: Joi.boolean().optional(),

  location: Joi.string().max(300).optional().allow(""),

  meeting_url: Joi.string().optional().allow(""),

  capacity: Joi.number().integer().min(1).optional(),

  conference_hall_id: Joi.string().optional().allow("", null),

  photo_base64: Joi.string().optional().allow(""),

  agendas: Joi.alternatives().try(
    Joi.string(),
    Joi.array()
  ).optional()
}).min(1); // At least one field must be updated

/**
 * =========================================================
 * EVENT ID PARAM SCHEMA
 * =========================================================
 */
export const eventIdParamSchema = Joi.object({
  eventId: Joi.string().required().messages({
    "string.empty": "Event ID is required"
  })
});

/**
 * =========================================================
 * SESSION ID PARAM SCHEMA
 * =========================================================
 */
export const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().required().messages({
    "string.empty": "Session ID is required"
  })
});
