import Joi from "joi";

/**
 * =========================================================
 * TIME FORMAT VALIDATION
 * =========================================================
 */
const timeFormat = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * =========================================================
 * CREATE SINGLE AGENDA SCHEMA
 * =========================================================
 */
const agendaItemSchema = Joi.object({
  title: Joi.string().min(1).max(150).required().messages({
    "string.empty": "Agenda title is required",
    "string.min": "Agenda title must be at least 1 character",
    "string.max": "Agenda title cannot exceed 150 characters"
  }),

  start_time: Joi.string().pattern(timeFormat).required().messages({
    "string.pattern.base": "Start time must be in HH:mm format (e.g., 09:30)",
    "string.empty": "Start time is required"
  }),

  end_time: Joi.string().pattern(timeFormat).required().messages({
    "string.pattern.base": "End time must be in HH:mm format (e.g., 10:45)",
    "string.empty": "End time is required"
  }),

  speaker_ids: Joi.array().items(Joi.string()).optional().default([]),

  description: Joi.string().max(1000).optional().allow("").messages({
    "string.max": "Description cannot exceed 1000 characters"
  })
});

/**
 * =========================================================
 * CREATE AGENDA(S) SCHEMA
 * =========================================================
 */
export const createAgendaSchema = Joi.object({
  agendas: Joi.array().items(agendaItemSchema).min(1).required().messages({
    "array.min": "At least one agenda item is required",
    "any.required": "Agendas array is required"
  })
});

/**
 * =========================================================
 * UPDATE AGENDA SCHEMA
 * =========================================================
 */
export const updateAgendaSchema = Joi.object({
  title: Joi.string().min(1).max(150).optional().messages({
    "string.min": "Agenda title must be at least 1 character",
    "string.max": "Agenda title cannot exceed 150 characters"
  }),

  start_time: Joi.string().pattern(timeFormat).optional().messages({
    "string.pattern.base": "Start time must be in HH:mm format (e.g., 09:30)"
  }),

  end_time: Joi.string().pattern(timeFormat).optional().messages({
    "string.pattern.base": "End time must be in HH:mm format (e.g., 10:45)"
  }),

  speaker_ids: Joi.array().items(Joi.string()).optional(),

  description: Joi.string().max(1000).optional().allow("").messages({
    "string.max": "Description cannot exceed 1000 characters"
  })
}).min(1); // At least one field must be updated

/**
 * =========================================================
 * VALIDATE TIME SCHEMA
 * =========================================================
 */
export const validateTimeSchema = Joi.object({
  start_time: Joi.string().pattern(timeFormat).required().messages({
    "string.pattern.base": "Start time must be in HH:mm format (e.g., 09:30)",
    "string.empty": "Start time is required"
  }),

  end_time: Joi.string().pattern(timeFormat).required().messages({
    "string.pattern.base": "End time must be in HH:mm format (e.g., 10:45)",
    "string.empty": "End time is required"
  }),

  exclude_agenda_id: Joi.string().optional().allow("")
});

/**
 * =========================================================
 * ADD SPEAKERS SCHEMA
 * =========================================================
 */
export const addSpeakersSchema = Joi.object({
  speaker_ids: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one speaker ID is required",
    "any.required": "Speaker IDs are required"
  })
});

/**
 * =========================================================
 * PARAM SCHEMAS
 * =========================================================
 */
export const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().required().messages({
    "string.empty": "Session ID is required"
  })
});

export const agendaIdParamSchema = Joi.object({
  agendaId: Joi.string().required().messages({
    "string.empty": "Agenda ID is required"
  })
});

export const speakerIdParamSchema = Joi.object({
  agendaId: Joi.string().required().messages({
    "string.empty": "Agenda ID is required"
  }),
  speakerId: Joi.string().required().messages({
    "string.empty": "Speaker ID is required"
  })
});

/**
 * =========================================================
 * BULK DELETE SCHEMA
 * =========================================================
 */
export const bulkDeleteSchema = Joi.object({
  agenda_ids: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one agenda ID is required",
    "any.required": "Agenda IDs are required"
  })
});

/**
 * =========================================================
 * QUERY SCHEMAS
 * =========================================================
 */
export const getAgendasQuerySchema = Joi.object({
  include_deleted: Joi.boolean().optional().default(false),
  sort: Joi.string().optional().default("start_time")
});
