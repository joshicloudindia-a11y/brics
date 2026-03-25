/**
 * EXAMPLE: How to integrate Activity Logging
 * 
 * This file demonstrates how to log user activities in your existing controllers
 */

import Activity from '../models/Activity.js';

/* ===============================================================
   EXAMPLE 1: Manual Activity Logging in Auth Controller
   =============================================================== */

// In your login function (after successful login):
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // ... your existing login logic ...
    
    // After successful login, log the activity
    await Activity.logActivity({
      user: user._id,
      activityType: 'LOGIN',
      description: `User ${user.name} logged in successfully`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      metadata: {
        loginMethod: 'OTP',
        email: user.email
      }
    });

    return res.status(200).json({
      success: true,
      token,
      user
    });

  } catch (error) {
    // Log failed login attempt
    await Activity.logActivity({
      user: req.body.userId || null,
      activityType: 'LOGIN',
      description: `Failed login attempt for ${req.body.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'FAILED',
      errorMessage: error.message
    });

    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================================================
   EXAMPLE 2: Using Activity Logger Middleware
   =============================================================== */

// In your routes file (auth.routes.js):
import { logActivity } from '../middlewares/activityLogger.js';

// Automatically log profile updates
router.put(
  '/profile',
  protect,
  logActivity('PROFILE_UPDATE', (req, data) => {
    return `User updated their profile`;
  }, {
    resourceType: 'USER',
    getResourceId: (req) => req.user._id
  }),
  updateProfile
);

/* ===============================================================
   EXAMPLE 3: Logging Different Activity Types
   =============================================================== */

// Registration
await Activity.logActivity({
  user: newUser._id,
  activityType: 'REGISTER',
  description: `New user registered: ${newUser.email}`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  resourceType: 'USER',
  resourceId: newUser._id
});

// Event Creation
await Activity.logActivity({
  user: req.user._id,
  activityType: 'EVENT_CREATE',
  description: `Created event: ${event.eventName}`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  resourceType: 'EVENT',
  resourceId: event._id,
  metadata: {
    eventName: event.eventName,
    eventType: event.eventType
  }
});

// Event View
await Activity.logActivity({
  user: req.user._id,
  activityType: 'EVENT_VIEW',
  description: `Viewed event: ${event.eventName}`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  resourceType: 'EVENT',
  resourceId: event._id
});

// Password Change
await Activity.logActivity({
  user: req.user._id,
  activityType: 'PASSWORD_CHANGE',
  description: `User changed their password`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  resourceType: 'USER',
  resourceId: req.user._id
});

// File Upload
await Activity.logActivity({
  user: req.user._id,
  activityType: 'FILE_UPLOAD',
  description: `Uploaded file: ${filename}`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  metadata: {
    filename,
    fileSize,
    fileType
  }
});

// Travel Request
await Activity.logActivity({
  user: req.user._id,
  activityType: 'TRAVEL_CREATE',
  description: `Created travel request for ${travel.destination}`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  resourceType: 'TRAVEL',
  resourceId: travel._id,
  metadata: {
    destination: travel.destination,
    departureDate: travel.departureDate
  }
});

// Role Assignment
await Activity.logActivity({
  user: req.user._id,
  activityType: 'ROLE_ASSIGN',
  description: `Assigned role ${role.name} to user ${targetUser.email}`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  resourceType: 'ROLE',
  metadata: {
    roleName: role.name,
    targetUser: targetUser.email
  }
});

// Email Sent
await Activity.logActivity({
  user: req.user._id,
  activityType: 'EMAIL_SENT',
  description: `Sent invitation email to ${recipient.email}`,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'SUCCESS',
  metadata: {
    recipient: recipient.email,
    emailType: 'INVITATION'
  }
});

/* ===============================================================
   EXAMPLE 4: API Endpoints Available
   =============================================================== */

/*
  GET /api/activities/my-activities
  - Get current user's activity history
  - Requires: Authentication
  - Query params: page, limit

  GET /api/activities/:id
  - Get specific activity details
  - Requires: Authentication (own activity or admin)

  GET /api/activities/stats
  - Get activity statistics
  - Requires: Authentication
  - Query params: startDate, endDate, userId (admin only)

  GET /api/activities
  - Get all activities (admin only)
  - Query params: page, limit, activityType, status, userId, startDate, endDate

  DELETE /api/activities/cleanup?days=90
  - Delete activities older than X days (admin only)
*/

/* ===============================================================
   EXAMPLE 5: Frontend Usage Examples
   =============================================================== */

/*
// Fetch user's activity history
const response = await fetch('/api/activities/my-activities?page=1&limit=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get activity statistics
const stats = await fetch('/api/activities/stats?startDate=2025-01-01', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Admin: View all login activities
const logins = await fetch('/api/activities?activityType=LOGIN&status=SUCCESS', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

// Admin: Get user activity report
const userActivities = await fetch('/api/activities?userId=USER_ID&startDate=2025-01-01&endDate=2025-12-31', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
*/

export default {};
