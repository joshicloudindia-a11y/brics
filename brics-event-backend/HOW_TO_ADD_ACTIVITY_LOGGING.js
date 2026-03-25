/**
 * =========================================================
 * HOW TO ADD ACTIVITY LOGGING IN CONTROLLERS
 * =========================================================
 * Activity logging should be done in controllers, not routes
 * This gives you better control and context
 */

import Activity from '../models/Activity.js';

/* ===============================================================
   EXAMPLE 1: Login Controller with Activity Logging
   =============================================================== */

export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Your login logic here...
    const user = await User.findOne({ email });
    if (!user) {
      // Log FAILED login attempt
      await Activity.logActivity({
        user: null,
        activityType: 'LOGIN',
        description: `Failed login attempt for ${email}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'FAILED',
        errorMessage: 'Invalid credentials'
      });
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify OTP...
    // Generate token...
    
    // Log SUCCESSFUL login
    await Activity.logActivity({
      user: user._id,
      activityType: 'LOGIN',
      description: `User ${user.name || user.email} logged in successfully`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    return res.json({ 
      success: true,
      token: accessToken 
    });

  } catch (error) {
    // Log error
    await Activity.logActivity({
      user: null,
      activityType: 'LOGIN',
      description: `Login error: ${error.message}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'FAILED',
      errorMessage: error.message
    });

    return res.status(500).json({ message: 'Internal server error' });
  }
};

/* ===============================================================
   EXAMPLE 2: Logout Controller
   =============================================================== */

export const logout = async (req, res) => {
  try {
    const userId = req.user._id || req.user.user_id;
    
    // Logout logic (clear session, redis, etc.)
    await redisClient.del(`user_session:${userId}`);
    
    // Log activity
    await Activity.logActivity({
      user: userId,
      activityType: 'LOGOUT',
      description: 'User logged out',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    return res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   EXAMPLE 3: Event Create/Update Controller
   =============================================================== */

export const upsertEvent = async (req, res) => {
  try {
    const { id, name, description, startDate, endDate } = req.body;
    const userId = req.user._id || req.user.user_id;

    let event;
    let isUpdate = false;

    if (id) {
      // Update existing event
      event = await Event.findByIdAndUpdate(id, req.body, { new: true });
      isUpdate = true;
    } else {
      // Create new event
      event = await Event.create(req.body);
    }

    // Log activity
    await Activity.logActivity({
      user: userId,
      activityType: isUpdate ? 'EVENT_UPDATE' : 'EVENT_CREATE',
      description: isUpdate 
        ? `Updated event: ${event.name}` 
        : `Created new event: ${event.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'EVENT',
      resourceId: event._id,
      metadata: {
        eventName: event.name,
        startDate: event.startDate,
        endDate: event.endDate
      }
    });

    return res.json({ 
      success: true, 
      data: event 
    });

  } catch (error) {
    // Log failed attempt
    await Activity.logActivity({
      user: req.user?._id || req.user?.user_id,
      activityType: 'EVENT_CREATE',
      description: `Failed to create/update event: ${error.message}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'FAILED',
      errorMessage: error.message
    });

    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   EXAMPLE 4: Profile Update Controller
   =============================================================== */

export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.user_id;
    const { first_name, last_name, mobile } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { first_name, last_name, mobile },
      { new: true }
    );

    // Log activity
    await Activity.logActivity({
      user: userId,
      activityType: 'PROFILE_UPDATE',
      description: `User updated their profile`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'USER',
      resourceId: userId,
      metadata: {
        updatedFields: Object.keys(req.body)
      }
    });

    return res.json({ success: true, data: user });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   EXAMPLE 5: Travel Create Controller
   =============================================================== */

export const saveTravel = async (req, res) => {
  try {
    const userId = req.user._id || req.user.user_id;
    const { event_id, arrival, departure } = req.body;

    const travel = await Travel.create({
      user_id: userId,
      event_id,
      arrival,
      departure
    });

    // Log activity
    await Activity.logActivity({
      user: userId,
      activityType: 'TRAVEL_CREATE',
      description: `Created travel request for event ${event_id}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'TRAVEL',
      resourceId: travel._id,
      metadata: {
        eventId: event_id,
        arrivalDate: arrival.arrival_date,
        departureDate: departure.departure_date
      }
    });

    return res.json({ success: true, data: travel });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   EXAMPLE 6: Invite Delegates Controller
   =============================================================== */

export const inviteDelegateToEvent = async (req, res) => {
  try {
    const userId = req.user._id || req.user.user_id;
    const { eventId } = req.params;
    const { delegates } = req.body;

    // Send invitations...
    for (const delegate of delegates) {
      // Send email logic
      await sendEmail({ to: delegate.email });
    }

    // Log activity
    await Activity.logActivity({
      user: userId,
      activityType: 'EMAIL_SENT',
      description: `Invited ${delegates.length} delegates to event`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'EVENT',
      resourceId: eventId,
      metadata: {
        delegateCount: delegates.length,
        delegateEmails: delegates.map(d => d.email)
      }
    });

    return res.json({ 
      success: true, 
      message: 'Invitations sent' 
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   EXAMPLE 7: Role Create Controller
   =============================================================== */

export const createRole = async (req, res) => {
  try {
    const userId = req.user._id || req.user.user_id;
    const { id, name, type } = req.body;

    const role = await Role.create({ id, name, type });

    // Log activity
    await Activity.logActivity({
      user: userId,
      activityType: 'ROLE_ASSIGN',
      description: `Created new role: ${name} (${id})`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'ROLE',
      metadata: {
        roleId: id,
        roleName: name,
        roleType: type
      }
    });

    return res.json({ success: true, data: role });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   EXAMPLE 8: Delete Role Controller
   =============================================================== */

export const deleteRole = async (req, res) => {
  try {
    const userId = req.user._id || req.user.user_id;
    const { id } = req.params;

    const role = await Role.findOneAndDelete({ id });

    // Log activity
    await Activity.logActivity({
      user: userId,
      activityType: 'ROLE_REMOVE',
      description: `Deleted role: ${role.name} (${id})`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'ROLE',
      metadata: {
        roleId: id,
        roleName: role.name
      }
    });

    return res.json({ success: true, message: 'Role deleted' });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   QUICK TEMPLATE - Copy & Modify This
   =============================================================== */

export const yourControllerFunction = async (req, res) => {
  try {
    const userId = req.user._id || req.user.user_id;

    // Your business logic here
    // ...

    // Log activity AFTER success
    await Activity.logActivity({
      user: userId,
      activityType: 'YOUR_ACTIVITY_TYPE', // LOGIN, EVENT_CREATE, etc.
      description: 'Description of what happened',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'EVENT', // Optional: EVENT, USER, TRAVEL, ROLE
      resourceId: someResourceId, // Optional: ObjectId of resource
      metadata: { // Optional: Any extra data
        key: 'value'
      }
    });

    return res.json({ success: true });

  } catch (error) {
    // Log FAILED activity
    await Activity.logActivity({
      user: req.user?._id || req.user?.user_id,
      activityType: 'YOUR_ACTIVITY_TYPE',
      description: `Failed: ${error.message}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'FAILED',
      errorMessage: error.message
    });

    return res.status(500).json({ message: error.message });
  }
};

/* ===============================================================
   AVAILABLE ACTIVITY TYPES
   =============================================================== */
/*
  'LOGIN'
  'LOGOUT'
  'REGISTER'
  'PASSWORD_CHANGE'
  'PROFILE_UPDATE'
  'EVENT_CREATE'
  'EVENT_UPDATE'
  'EVENT_DELETE'
  'EVENT_VIEW'
  'TRAVEL_CREATE'
  'TRAVEL_UPDATE'
  'TRAVEL_DELETE'
  'ROLE_ASSIGN'
  'ROLE_REMOVE'
  'FILE_UPLOAD'
  'FILE_DELETE'
  'EMAIL_SENT'
  'API_ACCESS'
  'EXPORT_DATA'
  'IMPORT_DATA'
  'OTHER'
*/
