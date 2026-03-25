import { sanitizeHtmlString } from '../data/sanitize.js';
import Role from '../models/Role.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js'; 
import { sendPushNotification } from '../utils/notification.js'; 

export const createRole = async (req, res) => {
  try {
    const payload = {
      id: sanitizeHtmlString(req.body.id),
      name: sanitizeHtmlString(req.body.name),
    };

    const role = await Role.create(payload);

    try {
      if (req.user && req.user.user_id) {
        const adminUser = await User.findOne({ id: req.user.user_id });
        if (adminUser && adminUser.fcm_token) {
          await sendPushNotification(
            adminUser.fcm_token,
            "System Role Created 🛡️",
            `New system role '${role.name}' has been successfully created.`
          );
          console.log(`✅ Push sent to Admin (${adminUser.email}) regarding Role Creation.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Role Creation notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: 'ROLE_ASSIGN',
      description: `Created new role: ${role.name} (${role.id})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'ROLE',
      metadata: {
        roleId: role.id,
        roleName: role.name
      }
    });

    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoles = async (req, res) => {
  let params = {};
  if (req.query.type) {
    params.type = req.query.type;
  }
  const roles = await Role.find(params);
  res.json(roles);
};

export const deleteRole = async (req, res) => {
  try {
    const query = { id: req.params.id };
    const role = await Role.findOne(query);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await Role.deleteOne(query);

    try {
      if (req.user && req.user.user_id) {
        const adminUser = await User.findOne({ id: req.user.user_id });
        if (adminUser && adminUser.fcm_token) {
          await sendPushNotification(
            adminUser.fcm_token,
            "System Role Deleted 🗑️",
            `System role '${role.name}' has been removed.`
          );
          console.log(`✅ Push sent to Admin (${adminUser.email}) regarding Role Deletion.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Role Deletion notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: 'ROLE_REMOVE',
      description: `Deleted role: ${role.name} (${role.id})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'ROLE',
      metadata: {
        roleId: role.id,
        roleName: role.name
      }
    });

    res.json({ message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};