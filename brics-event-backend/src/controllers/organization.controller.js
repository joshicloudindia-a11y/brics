// brics-event-backend/src/controllers/organization.controller.js

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import _ from "lodash";
import Organization from "../models/Organization.js";
import Ministry from "../models/Ministry.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { sendPushNotification } from "../utils/notification.js"; 

const generateOrganizationCode = async () => {
  let orgCode;
  let exists = true;

  while (exists) {
    orgCode = `ORG-${_.uniqueId()}`;
    const org = await Organization.findOne({ organization_code: orgCode });
    exists = !_.isNil(org);
  }

  return orgCode;
};

export const createOrganization = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const authRole = await Role.findOne({ id: user.role_id });
    if (!authRole || authRole.name !== "SUPER ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { organization_name, ministry_id, description } = req.body;

    if (!organization_name || organization_name.trim().length === 0) {
      return res.status(400).json({ message: "Organization name is required" });
    }

    const existing = await Organization.findOne({
      organization_name: { $regex: new RegExp(`^${organization_name.trim()}$`, "i") }
    });

    if (existing) {
      return res.status(409).json({ message: "Organization already exists" });
    }

    let ministryName = null;
    if (ministry_id) {
      try {
        const validObjectId = mongoose.Types.ObjectId.isValid(ministry_id);
        if (!validObjectId) {
          return res.status(400).json({ message: "Invalid ministry ID" });
        }

        const ministry = await Ministry.findById(ministry_id);
        if (!ministry) {
          return res.status(404).json({ message: "Ministry not found" });
        }
        ministryName = ministry.ministry_name;
      } catch (error) {
        return res.status(400).json({ message: "Invalid ministry ID format" });
      }
    }

    const orgCode = await generateOrganizationCode();

    const organization = await Organization.create({
      organization_code: orgCode,
      organization_name: organization_name.trim(),
      description: description ? description.trim() : "",
      ministry_id: ministry_id || null,
      ministry_name: ministryName,
      is_active: true,
      created_by: user.id
    });

    try {
      if (user.fcm_token) {
        await sendPushNotification(
          user.fcm_token,
          "Organization Created 🏢",
          `Organization '${organization.organization_name}' has been successfully created.`
        );
        console.log(`✅ Push sent to Admin (${user.email}) regarding Organization Creation.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Organization Creation notice:", pushErr.message);
    }

    return res.status(201).json({
      message: "Organization created successfully",
      organization
    });
  } catch (error) {
    console.error("createOrganization error:", error);
    return res.status(500).json({ message: "Failed to create organization" });
  }
};

export const getAllOrganizations = async (req, res) => {
  try {
    const { ministry_id, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { is_active: true };

    if (ministry_id) {
      if (!mongoose.Types.ObjectId.isValid(ministry_id)) {
        return res.status(400).json({ message: "Invalid ministry ID" });
      }
      query.ministry_id = new mongoose.Types.ObjectId(ministry_id);
    }

    const organizations = await Organization.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ organization_name: 1 });

    const total = await Organization.countDocuments(query);

    return res.json({
      message: "Organizations retrieved successfully",
      data: organizations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("getAllOrganizations error:", error);
    return res.status(500).json({ message: "Failed to fetch organizations" });
  }
};

export const getSingleOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const organization = await Organization.findById(id).populate("ministry_id");

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    return res.json({
      message: "Organization retrieved successfully",
      organization
    });
  } catch (error) {
    console.error("getSingleOrganization error:", error);
    return res.status(500).json({ message: "Failed to fetch organization" });
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const authRole = await Role.findOne({ id: user.role_id });
    if (!authRole || authRole.name !== "SUPER ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const { organization_name, ministry_id, is_active, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (organization_name && organization_name !== organization.organization_name) {
      const existing = await Organization.findOne({
        organization_name: { $regex: new RegExp(`^${organization_name.trim()}$`, "i") },
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(409).json({ message: "Organization name already exists" });
      }
      organization.organization_name = organization_name.trim();
    }

    if (ministry_id !== undefined) {
      if (ministry_id === null) {
        organization.ministry_id = null;
        organization.ministry_name = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(ministry_id)) {
          return res.status(400).json({ message: "Invalid ministry ID" });
        }
        const ministry = await Ministry.findById(ministry_id);
        if (!ministry) {
          return res.status(404).json({ message: "Ministry not found" });
        }
        organization.ministry_id = ministry_id;
        organization.ministry_name = ministry.ministry_name;
      }
    }

    if (description !== undefined) {
      organization.description = description ? description.trim() : "";
    }

    if (is_active !== undefined) {
      organization.is_active = is_active;
    }

    await organization.save();

    try {
      if (user.fcm_token) {
        await sendPushNotification(
          user.fcm_token,
          "Organization Updated 🏢",
          `Organization '${organization.organization_name}' has been successfully updated.`
        );
        console.log(`✅ Push sent to Admin (${user.email}) regarding Organization Update.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Organization Update notice:", pushErr.message);
    }

    return res.json({
      message: "Organization updated successfully",
      organization
    });
  } catch (error) {
    console.error("updateOrganization error:", error);
    return res.status(500).json({ message: "Failed to update organization" });
  }
};

export const getOrganizationsByMinistry = async (req, res) => {
  try {
    const { ministry_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ministry_id)) {
      return res.status(400).json({ message: "Invalid ministry ID" });
    }

    const organizations = await Organization.find({
      ministry_id: new mongoose.Types.ObjectId(ministry_id),
      is_active: true
    }).sort({ organization_name: 1 });

    return res.json({
      message: "Organizations retrieved successfully",
      data: organizations
    });
  } catch (error) {
    console.error("getOrganizationsByMinistry error:", error);
    return res.status(500).json({ message: "Failed to fetch organizations" });
  }
};