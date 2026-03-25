import Joi from "joi";

/* ===============================
   CREATE ROLE
================================ */
export const createRoleSchema = Joi.object({
  id: Joi.string()
    .uppercase()
    .min(2)
    .max(30)
    .required(),

  name: Joi.string()
    .min(2)
    .max(50)
    .required(),

  type: Joi.string()
    .valid("SYSTEM", "EVENT")
    .required()
});

/* ===============================
   DELETE ROLE (PARAM)
================================ */
export const roleIdParamSchema = Joi.object({
  id: Joi.string()
    .uppercase()
    .min(2)
    .max(30)
    .required()
});

/* ===============================
   GET ROLES (QUERY)
================================ */
export const getRolesQuerySchema = Joi.object({
  type: Joi.string()
    .valid("SYSTEM", "EVENT")
    .optional()
});
