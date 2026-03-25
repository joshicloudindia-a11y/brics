// brics-event-backend/src/controllers/masterDesignation.controller.js

import MasterDesignation from "../models/MasterDesignation.js";
import User from "../models/User.js";
import { sendPushNotification } from "../utils/notification.js"; 

export const createDesignationIfNotExists = async (req, res) => {
  try {
    const { designation_name } = req.body;
    if (!designation_name || designation_name.trim().length === 0) {
      return res.status(400).json({ message: "designation_name is required" });
    }

    const name = designation_name.trim();

    const existing = await MasterDesignation.findOne({ designation_name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      return res.status(200).json({ message: "Designation already exists", designation: existing });
    }

    const createdBy = req.user ? req.user.user_id : null;
    const designation = await MasterDesignation.create({ designation_name: name, created_by: createdBy });

    try {
      if (createdBy) {
        const adminUser = await User.findOne({ id: createdBy });
        if (adminUser && adminUser.fcm_token) {
          await sendPushNotification(
            adminUser.fcm_token,
            "Designation Added 📝",
            `New designation '${designation.designation_name}' has been successfully added to the master list.`
          );
          console.log(`✅ Push sent to Admin (${adminUser.email}) regarding Designation Creation.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Designation Creation notice:", pushErr.message);
    }

    return res.status(201).json({ message: "Designation created", designation });
  } catch (error) {
    console.error("createDesignationIfNotExists error:", error);
    return res.status(500).json({ message: "Failed to create designation" });
  }
};

export const getAllDesignations = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active !== undefined) query.is_active = active === "true" || active === "1";

    const designations = await MasterDesignation.find(query).sort({ designation_name: 1 });
    return res.json({ message: "Designations retrieved", data: designations });
  } catch (error) {
    console.error("getAllDesignations error:", error);
    return res.status(500).json({ message: "Failed to fetch designations" });
  }
};