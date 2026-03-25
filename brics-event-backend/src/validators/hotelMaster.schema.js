import Joi from "joi";

export const hotelMasterSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(200),
  city: Joi.string().required().trim().min(1).max(100),
  state: Joi.string().required().trim().min(1).max(100),
  address: Joi.string().optional().trim().max(300).allow(null, ""),
  contactName: Joi.string().optional().trim().max(100).allow(null, ""),
  contactNumber: Joi.string().optional().trim().max(100).allow(null, ""),
  status: Joi.string().valid("active", "inactive").optional()
});

export const updateHotelMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  city: Joi.string().trim().min(1).max(100).optional(),
  state: Joi.string().trim().min(1).max(100).optional(),
  address: Joi.string().trim().max(300).optional().allow(null, ""),
  contactName: Joi.string().trim().max(100).optional().allow(null, ""),
  contactNumber: Joi.string().trim().max(100).optional().allow(null, ""),
  status: Joi.string().valid("active", "inactive").optional()
}).min(1);
