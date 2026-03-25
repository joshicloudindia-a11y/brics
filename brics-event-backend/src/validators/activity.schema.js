import Joi from 'joi';

// Activity query validation
export const activityQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  activityType: Joi.string().valid(
    'LOGIN',
    'LOGOUT',
    'REGISTER',
    'PASSWORD_CHANGE',
    'PROFILE_UPDATE',
    'EVENT_CREATE',
    'EVENT_UPDATE',
    'EVENT_DELETE',
    'EVENT_VIEW',
    'TRAVEL_CREATE',
    'TRAVEL_UPDATE',
    'TRAVEL_DELETE',
    'ROLE_ASSIGN',
    'ROLE_REMOVE',
    'FILE_UPLOAD',
    'FILE_DELETE',
    'EMAIL_SENT',
    'API_ACCESS',
    'EXPORT_DATA',
    'IMPORT_DATA',
    'OTHER'
  ),
  status: Joi.string().valid('SUCCESS', 'FAILED', 'PENDING'),
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate'))
});

// Cleanup validation
export const cleanupSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(90)
});
