import Joi from "joi";

/* ===============================
   COMMON
================================ */
export const eventIdParamSchema = Joi.object({
  eventId: Joi.string().hex().length(24).required(),
});

export const upsertEventSchema = Joi.object({
  id: Joi.string().optional(),
  status: Joi.string().valid("draft", "published").default("published"),
  
  // Name is always required
  name: Joi.string().min(2).max(100).required(),
  
  // Fields conditionally required based on status
  meeting_url: Joi.string().when("status", {
    is: "published",
    then: Joi.string().optional(),
    otherwise: Joi.string().optional()
  }),
  
  description: Joi.string().when("status", {
    is: "published",
    then: Joi.string().optional(),
    otherwise: Joi.string().optional()
  }),
  
  startDate: Joi.date().when("status", {
    is: "published",
    then: Joi.date().required(),
    otherwise: Joi.date().optional()
  }),
  
  endDate: Joi.date().when("status", {
    is: "published",
    then: Joi.date().required(),
    otherwise: Joi.date().optional()
  }),
  
  eventMode: Joi.string().when("status", {
    is: "published",
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  
  category: Joi.string().when("status", {
    is: "published",
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  
  location: Joi.string().when("status", {
    is: "published",
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  
  delegateCount: Joi.number().min(0).when("status", {
    is: "published",
    then: Joi.number().min(1).required(),
    otherwise: Joi.number().optional()
  }),
  
  source_language: Joi.string().optional(),
  capacity: Joi.number().optional(),
  venue: Joi.string().optional(),
  manager: Joi.string().optional(),
  ministry: Joi.string().optional(),
  organization_id: Joi.string().allow("", null).optional(),
  organization_name: Joi.string().min(2).max(200).allow("", null).optional()
});

/* ===============================
   ADD USER EVENT
================================ */
export const addUserEventSchema = Joi.object({
  event_id: Joi.string().hex().length(24).required(),
  role: Joi.string()
    .valid(
      "EVENT MANAGER",
      "DAO",
      "DELEGATE",
      "HEAD OF DELEGATE",
      "SECURITY OFFICER",
      "INTERPRETER",
      "MEDIA",
      "DEPUTY",
      "DELEGATION CONTACT OFFICER",
      "SPEAKER",
    )
    .optional(),
});

/* ===============================
   ADD EVENT MANAGER
================================ */
export const addEventManagerSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).allow("", null),
  email: Joi.string().email().required(),
  ministry_name: Joi.string().min(2).max(100).allow("", null).optional(),
  organization_name: Joi.string().min(2).max(200).allow("", null).optional(),
  organization_id: Joi.string().allow("", null).optional(),
  event_id: Joi.string().hex().length(24).allow("", null).optional(),
});

/* ===============================
   UPDATE EVENT MANAGER
================================ */
export const updateEventManagerSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  ministry_name: Joi.string().min(2).max(100).allow("", null).optional(),
  organization_name: Joi.string().min(2).max(200).allow("", null).optional(),
  event_id: Joi.string().hex().length(24).allow("", null).optional(),
});
