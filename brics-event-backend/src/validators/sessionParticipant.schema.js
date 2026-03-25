import Joi from "joi";

/**
 * =========================================================
 * ADD PARTICIPANTS TO SESSION SCHEMA
 * =========================================================
 */
export const addParticipantsSchema = Joi.object({
  user_ids: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().required()).min(1),
      Joi.string().required()
    )
    .required()
    .messages({
      "alternatives.match": "user_ids must be a string or an array of strings",
      "any.required": "user_ids is required"
    }),
  
  participant_type: Joi.string()
    .valid("attendee", "speaker")
    .required()
    .messages({
      "any.only": "participant_type must be either 'attendee' or 'speaker'",
      "any.required": "participant_type is required"
    })
});

/**
 * =========================================================
 * REMOVE PARTICIPANT SCHEMA
 * =========================================================
 */
export const removeParticipantSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required"
  })
});

/**
 * =========================================================
 * CHECK IN PARTICIPANT SCHEMA
 * =========================================================
 */
export const checkInParticipantSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required"
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
