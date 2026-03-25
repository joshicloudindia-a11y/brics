// brics-event-backend/src/controllers/activity.controller.js

import Activity from '../models/Activity.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { sendPushNotification } from "../utils/notification.js"; 

const resolveAuthUser = async (req) => {
  const authUser = await User.findOne({ id: req.user?.user_id }).select('_id role_id');
  if (!authUser) return { authUser: null, isAdmin: false };

  const role = authUser.role_id
    ? await Role.findOne({ id: authUser.role_id }).select('name')
    : null;

  const roleName = role?.name || '';
  const isAdmin = ['SUPER ADMIN', 'ADMIN', 'EVENT MANAGER'].includes(roleName);

  return { authUser, isAdmin };
};

const resolveUserObjectId = async (rawUserId) => {
  if (!rawUserId) return null;
  if (mongoose.Types.ObjectId.isValid(rawUserId)) {
    return new mongoose.Types.ObjectId(rawUserId);
  }
  const user = await User.findOne({ id: rawUserId }).select('_id');
  return user?._id || null;
};

export const getAllActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { activityType, status, userId, startDate, endDate } = req.query;

    const filter = {};
    if (activityType) filter.activityType = activityType;
    if (status) filter.status = status;
    if (userId) {
      const userObjectId = await resolveUserObjectId(userId);
      if (!userObjectId) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit
          }
        });
      }
      filter.user = userObjectId;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const activities = await Activity.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Activity.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message
    });
  }
};

export const getMyActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { authUser } = await resolveAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const activities = await Activity.find({ user: authUser._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Activity.countDocuments({ user: authUser._id });

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your activities',
      error: error.message
    });
  }
};

export const getActivityById = async (req, res) => {
  try {
    const { authUser, isAdmin } = await resolveAuthUser(req);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const activity = await Activity.findById(req.params.id)
      .populate('user', 'name email role');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    if (!isAdmin && activity.user?._id?.toString() !== authUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this activity'
      });
    }

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching activity',
      error: error.message
    });
  }
};

export const getActivityStats = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const { authUser, isAdmin } = await resolveAuthUser(req);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const filter = {};
    if (userId && isAdmin) {
      const userObjectId = await resolveUserObjectId(userId);
      if (!userObjectId) {
        return res.status(200).json({
          success: true,
          data: {
            totalActivities: 0,
            activityBreakdown: []
          }
        });
      }
      filter.user = userObjectId;
    } else if (!isAdmin) {
      filter.user = authUser._id;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Activity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalActivities = await Activity.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        totalActivities,
        activityBreakdown: stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching activity statistics',
      error: error.message
    });
  }
};

export const deleteOldActivities = async (req, res) => {
  try {
    const { days } = req.query;
    const daysToKeep = parseInt(days) || 90;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);

    const result = await Activity.deleteMany({
      createdAt: { $lt: dateThreshold }
    });

    res.status(200).json({
      success: true,
      message: `Deleted activities older than ${daysToKeep} days`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting old activities',
      error: error.message
    });
  }
};