import Joi from "joi";

/**
 * Joi validation middleware
 * @param {Joi.Schema} schema - Joi schema
 * @param {string} property - req property to validate (body, params, query)
 */
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    // Use the data as-is without flattening arrays
    
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true, // removes extra injected fields
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        message: "Validation failed",
        errors
      });
    }

    // Replace request data with validated & sanitized data
    req[property] = value;
    next();
  };
};

export default validate;
