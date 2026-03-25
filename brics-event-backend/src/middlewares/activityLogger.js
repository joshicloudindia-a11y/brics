import Activity from '../models/Activity.js';

/**
 * Middleware to automatically log activities
 * Usage: Add to routes where you want to track activities
 */
const logActivity = (activityType, getDescription, options = {}) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;

    res.json = function (data) {
      // Get request details
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      // Determine status based on response
      const status = res.statusCode < 400 ? 'SUCCESS' : 'FAILED';

      // Create activity log
      const activityData = {
        activityType,
        description: typeof getDescription === 'function' ? getDescription(req, data) : getDescription,
        ipAddress,
        userAgent,
        status,
        metadata: {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ...(options.metadata || {})
        }
      };

      // Add user only if available
      if (req.user?._id || req.user?.user_id) {
        activityData.user = req.user._id || req.user.user_id;
      }

      // Add resource info if provided
      if (options.resourceType) {
        activityData.resourceType = options.resourceType;
      }
      if (options.getResourceId && typeof options.getResourceId === 'function') {
        activityData.resourceId = options.getResourceId(req, data);
      }

      // Add error message for failed activities
      if (status === 'FAILED' && data.message) {
        activityData.errorMessage = data.message;
      }

      // Log activity asynchronously (don't wait for it)
      Activity.logActivity(activityData).catch(err => {
        console.error('Failed to log activity:', err);
      });

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Manual activity logger (use in controllers)
 */
const logManualActivity = async (data) => {
  try {
    await Activity.logActivity(data);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export { logActivity, logManualActivity };
