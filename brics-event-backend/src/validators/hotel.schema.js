import Joi from "joi";

export const saveHotelSchema = Joi.object({
  event_id: Joi.string().required(),
  user_id: Joi.string().required(),
  for_whom: Joi.string().valid("MYSELF", "DELEGATE").default("MYSELF"),
  stay_start_date: Joi.date().required(),
  stay_end_date: Joi.date().min(Joi.ref("stay_start_date")).required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  hotel_id: Joi.string().optional().allow("", null),
  hotel_type: Joi.string().valid("master_list", "manual_entry").optional(),
  hotel_name: Joi.string().optional().allow("", null)
}).or('hotel_id', 'hotel_name');

export const getHotelSchema = Joi.object({
  event_id: Joi.string().optional(),
  user_id: Joi.string().optional()
});