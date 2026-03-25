import Joi from "joi";

/**
 * SAVE FULL TRAVEL (ARRIVAL + DEPARTURE)
 * Used with multipart/form-data
 */
export const saveTravelSchema = Joi.object({
  event_id: Joi.string().required(),
  user_id: Joi.string().required(),
  for_whom: Joi.string().valid("MYSELF", "DELEGATE").optional(),

  // ARRIVAL
  country_from: Joi.string().required(),
  arrival_flight_number: Joi.string().required(),
  port_of_entry: Joi.string().required(),
  arrival_date: Joi.date().required(),
  arrival_has_connecting_flight: Joi.boolean().optional(),
  arrival_connecting_flight_number: Joi.string().optional().allow("", null),
  arrival_connecting_port: Joi.string().optional().allow("", null),
  arrival_connecting_date: Joi.date().optional().allow("", null),
  arrival_connecting_country: Joi.string().optional().allow("", null),

  // DEPARTURE
  country_to: Joi.string().optional().allow("", null),
  departure_flight_number: Joi.string().optional().allow("", null),
  port_of_exit: Joi.string().optional().allow("", null),
  departure_date: Joi.date().optional().allow("", null),
  departure_has_connecting_flight: Joi.boolean().optional(),
  departure_connecting_flight_number: Joi.string().optional().allow("", null),
  departure_connecting_port: Joi.string().optional().allow("", null),
  departure_connecting_date: Joi.date().optional().allow("", null),
  departure_connecting_country: Joi.string().optional().allow("", null)
});

/**
 * GET TRAVEL
 */
export const getTravelSchema = Joi.object({
  event_id: Joi.string().required(),
  user_id: Joi.string().required()
});
