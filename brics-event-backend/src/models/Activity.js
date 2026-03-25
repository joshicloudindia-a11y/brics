import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true
    },
    activityType: {
      type: String,
      required: true,
      enum: [
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
        'HOTEL_CREATE',
        'HOTEL_UPDATE',
        'HOTEL_DELETE',
        'HALL_CREATE',
        'HALL_UPDATE',
        'HALL_DELETE',
        'HALL_VIEW',
        'HALL_ASSIGN',
        'HALL_UNASSIGN',
        'ROLE_ASSIGN',
        'ROLE_REMOVE',
        'FILE_UPLOAD',
        'FILE_DELETE',
        'EMAIL_SENT',
        'API_ACCESS',
        'EXPORT_DATA',
        'IMPORT_DATA',
        'BULK_DAO_IMPORT',
        'AGENDA_CREATE',
        'AGENDA_UPDATE',
        'AGENDA_DELETE',
        'AGENDA_VIEW',
        'AGENDA_SPEAKER_ADD',
        'AGENDA_SPEAKER_REMOVE',
        'SESSION_CREATE',
        'SESSION_UPDATE',
        'SESSION_DELETE',
        'SESSION_VIEW',
        'OTHER'
      ],
      index: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      default: 'SUCCESS',
      index: true
    },
    errorMessage: {
      type: String,
      default: null
    },
    resourceType: {
      type: String,
      enum: ['USER', 'EVENT', 'TRAVEL', 'HOTEL', 'CONFERENCE_HALL', 'ROLE', 'FILE', 'SESSION', 'AGENDA', 'SPEAKER', 'OTHER'],
      default: 'OTHER'
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ activityType: 1, createdAt: -1 });

// Static method to log activity
activitySchema.statics.logActivity = async function(data) {
  try {
    const activity = new this(data);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

// Method to get user activities
activitySchema.statics.getUserActivities = async function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Method to get activities by type
activitySchema.statics.getActivitiesByType = async function(activityType, limit = 50) {
  return this.find({ activityType })
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
