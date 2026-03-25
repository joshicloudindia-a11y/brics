// brics-event-backend/src/controllers/ministry.controller.js

import mongoose from "mongoose";
import Ministry from "../models/Ministry.js";
import User from "../models/User.js"; 
import Activity from "../models/Activity.js";
import { sendPushNotification } from "../utils/notification.js"; 

export const getAllMinistries = async (req, res) => {
  try {
    const { page, limit, active } = req.query;

    const query = {};

    if (active !== undefined) {
      query.is_active = active === "true";
    }

    if (!page && !limit) {
      const ministries = await Ministry.find(query).sort({ ministry_name: 1 });

      return res.json({
        message: "Ministries retrieved successfully",
        data: ministries,
      });
    }

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 50;

    const skip = (pageNumber - 1) * limitNumber;

    const ministries = await Ministry.find(query)
      .skip(skip)
      .limit(limitNumber)
      .sort({ ministry_name: 1 });

    const total = await Ministry.countDocuments(query);

    return res.json({
      message: "Ministries retrieved successfully",
      data: ministries,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });

  } catch (error) {
    console.error("getAllMinistries error:", error);
    return res.status(500).json({ message: "Failed to fetch ministries" });
  }
};

export const getSingleMinistry = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ministry ID" });
    }

    const ministry = await Ministry.findById(id);
    if (!ministry) {
      return res.status(404).json({ message: "Ministry not found" });
    }

    return res.json({ message: "Ministry retrieved successfully", ministry });
  } catch (error) {
    console.error("getSingleMinistry error:", error);
    return res.status(500).json({ message: "Failed to fetch ministry" });
  }
};