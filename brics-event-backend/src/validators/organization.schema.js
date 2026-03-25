import Joi from "joi";

/* ===============================
   CREATE ORGANIZATION
================================ */
export const createOrganizationSchema = Joi.object({
  organization_name: Joi.string().min(2).max(200).required(),
  ministry_id: Joi.string().hex().length(24).allow("", null),
  description: Joi.string().max(1000).allow("", null)
});

/* ===============================
   UPDATE ORGANIZATION
================================ */
export const updateOrganizationSchema = Joi.object({
  organization_name: Joi.string().min(2).max(200).optional(),
  ministry_id: Joi.string().hex().length(24).allow("", null),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(1000).allow("", null)
});
