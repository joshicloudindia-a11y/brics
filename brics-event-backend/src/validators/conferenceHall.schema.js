import Joi from "joi";

export const createHallSchema = Joi.object({
    hall_name: Joi.string().required().trim().min(1).max(200),
    venue_name: Joi.string().required().trim().min(1).max(200),
    floor_name: Joi.string().required().trim().min(1).max(100),
    state: Joi.string().required().trim().min(1).max(100),
    city: Joi.string().required().trim().min(1).max(100),
    capacity: Joi.number().integer().min(1).required(),
    video_conference_enabled: Joi.boolean().default(false),
    event_id: Joi.string().optional().allow(null, ""),
    session_id: Joi.string().optional().allow(null, ""),
    session_name: Joi.string().optional().allow(null, ""),
    start_date: Joi.date().optional().allow(null),
    end_date: Joi.date().optional().min(Joi.ref("start_date")).allow(null),
});

export const updateHallSchema = Joi.object({
    hall_name: Joi.string().trim().min(1).max(200).optional(),
    venue_name: Joi.string().trim().min(1).max(200).optional(),
    floor_name: Joi.string().trim().min(1).max(100).optional(),
    state: Joi.string().trim().min(1).max(100).optional(),
    city: Joi.string().trim().min(1).max(100).optional(),
    capacity: Joi.number().integer().min(1).optional(),
    video_conference_enabled: Joi.boolean().optional(),
    status: Joi.string().valid("available", "booked", "maintenance").optional(),
    event_id: Joi.string().optional().allow(null, ""),
    session_id: Joi.string().optional().allow(null, ""),
    session_name: Joi.string().optional().allow(null, ""),
    start_date: Joi.date().optional().allow(null),
    end_date: Joi.date().optional().allow(null),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

export const assignHallSchema = Joi.object({
    event_id: Joi.string().required(),
    session_id: Joi.string().optional().allow(null, ""),
    session_name: Joi.string().optional().allow(null, ""),
    start_date: Joi.date().optional().allow(null),
    end_date: Joi.date().optional().greater(Joi.ref("start_date")).allow(null),
});

export const unassignHallSchema = Joi.object({
    event_id: Joi.string().required(),
    session_id: Joi.string().optional().allow(null, ""),
});

export const hallIdParamSchema = Joi.object({
  hallId: Joi.string().required(),
});

export const availableHallsQuerySchema = Joi.object({
  start_date: Joi.date().required(),
  end_date: Joi.date().required().greater(Joi.ref("start_date")).allow(null),
  capacity_min: Joi.number().integer().min(1).optional(),
  event_id: Joi.string().optional().allow(null, ""),
});
