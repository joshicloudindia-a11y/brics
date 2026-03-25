// brics-event-backend/src/controllers/hotelMaster.controller.js

import HotelMaster from "../models/HotelMaster.js";
import { sanitizeHtmlString } from "../data/sanitize.js";
import User from "../models/User.js"; 
import { sendPushNotification } from "../utils/notification.js"; 

export const createHotelMaster = async (req, res) => {
  try {
    const { name, city, state, address, contactName, contactNumber, status } = req.body;
    const hotel = new HotelMaster({
      id: `HOTEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: sanitizeHtmlString(name),
      city: sanitizeHtmlString(city),
      state: sanitizeHtmlString(state),
      address: address ? sanitizeHtmlString(address) : undefined,
      contactName: contactName ? sanitizeHtmlString(contactName) : undefined,
      contactNumber: contactNumber ? sanitizeHtmlString(contactNumber) : undefined,
      status: status || "active"
    });
    
    await hotel.save();

    try {
      if (req.user && req.user.user_id) {
        const adminUser = await User.findOne({ id: req.user.user_id });
        if (adminUser && adminUser.fcm_token) {
          await sendPushNotification(
            adminUser.fcm_token,
            "Hotel Added 🏨",
            `Hotel '${hotel.name}' has been successfully added to the master list.`
          );
          console.log(`✅ Push sent to Admin (${adminUser.email}) regarding Hotel Creation.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Hotel Creation notice:", pushErr.message);
    }

    res.status(201).json({ message: "Hotel master created", hotel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create hotel master" });
  }
};

export const getHotelMasterList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = { status: "active" };

    const total = await HotelMaster.countDocuments(filter);

    const hotels = await HotelMaster.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      total,
      page,
      perPage: limit,
      totalPages,
      hotels,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch hotel master list" });
  }
};

export const updateHotelMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    
    if ("name" in req.body)
      updateData.name = sanitizeHtmlString(req.body.name);

    if ("city" in req.body)
      updateData.city = sanitizeHtmlString(req.body.city);

    if ("state" in req.body)
      updateData.state = sanitizeHtmlString(req.body.state);

    if ("address" in req.body)
      updateData.address = sanitizeHtmlString(req.body.address);

    if ("contactName" in req.body)
      updateData.contactName = sanitizeHtmlString(req.body.contactName);

    if ("contactNumber" in req.body)
      updateData.contactNumber = sanitizeHtmlString(req.body.contactNumber);

    if ("status" in req.body)
      updateData.status = req.body.status;

    const hotel = await HotelMaster.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!hotel)
      return res.status(404).json({
        message: "Hotel master not found"
      });

    try {
      if (req.user && req.user.user_id) {
        const adminUser = await User.findOne({ id: req.user.user_id });
        if (adminUser && adminUser.fcm_token) {
          await sendPushNotification(
            adminUser.fcm_token,
            "Hotel Updated 🏨",
            `Hotel '${hotel.name}' has been successfully updated.`
          );
          console.log(`✅ Push sent to Admin (${adminUser.email}) regarding Hotel Update.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Hotel Update notice:", pushErr.message);
    }

    res.json({
      message: "Hotel master updated",
      hotel
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to update hotel master"
    });
  }
};

export const deleteHotelMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const hotel = await HotelMaster.findOneAndUpdate({ _id: id }, { status: "inactive" }, { new: true });
    
    if (!hotel) return res.status(404).json({ message: "Hotel master not found" });

    try {
      if (req.user && req.user.user_id) {
        const adminUser = await User.findOne({ id: req.user.user_id });
        if (adminUser && adminUser.fcm_token) {
          await sendPushNotification(
            adminUser.fcm_token,
            "Hotel Removed 🗑️",
            `Hotel '${hotel.name}' has been removed from the active master list.`
          );
          console.log(`✅ Push sent to Admin (${adminUser.email}) regarding Hotel Deletion.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Hotel Deletion notice:", pushErr.message);
    }

    res.json({ message: "Hotel master deleted", hotel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete hotel master" });
  }
};