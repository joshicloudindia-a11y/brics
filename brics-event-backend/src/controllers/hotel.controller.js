// brics-event-backend/src/controllers/hotel.controller.js

import Hotel from "../models/Hotel.js";
import HotelMaster from "../models/HotelMaster.js";
import UserEvent from "../models/UserEvent.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Activity from "../models/Activity.js";
import Event from "../models/Event.js";
import { sanitizeHtmlString } from "../data/sanitize.js";
import { sendPushNotification } from "../utils/notification.js"; 

const DELEGATE_ROLES = [
  "DELEGATE",
  "HEAD OF DELEGATE",
  "SECURITY OFFICER",
  "DEPUTY",
  "DELEGATION CONTACT OFFICER",
  "INTERPRETER",
  "MEDIA",
  "SPEAKER",
];

export const saveHotel = async (req, res) => {
  try {
    const {
      event_id,
      user_id,
      for_whom = "MYSELF",
      stay_start_date,
      stay_end_date,
      city,
      state,
      hotel_id,
      hotel_type,
      hotel_name,
    } = req.body;

    const startDate = new Date(stay_start_date);
    const endDate = new Date(stay_end_date);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        message: "Invalid stay_start_date or stay_end_date",
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        message: "Stay end date cannot be before start date",
      });
    }

    const loggedUser = await User.findOne({ id: req.user.user_id });
    let systemRole = null;

    if (loggedUser?.role_id) {
      const roleDoc = await Role.findOne({ id: loggedUser.role_id });
      systemRole = roleDoc?.name;
    }

    const isSuperAdmin = systemRole === "SUPER ADMIN";

    const targetUserEvent = await UserEvent.findOne({
      user_id,
      event_id,
    });

    if (!targetUserEvent) {
      return res.status(404).json({
        message: "Target user not in event",
      });
    }

    if (!isSuperAdmin) {
      const loggedUserEvent = await UserEvent.findOne({
        user_id: req.user.user_id,
        event_id,
      });

      if (!loggedUserEvent) {
        return res.status(403).json({
          message: "You are not part of this event",
        });
      }

      const canManageOthers =
        ["DAO", "EVENT MANAGER"].includes(loggedUserEvent.role) ||
        ["DAO", "EVENT MANAGER"].includes(systemRole);

      if (user_id !== req.user.user_id) {
        if (!canManageOthers) {
          return res.status(403).json({
            message: "Not allowed to add hotel for other users",
            eventRole: loggedUserEvent.role,
            systemRole,
          });
        }
      }
    }

    let finalHotelId = null;
    let finalHotelName = null;
    let finalHotelType = "master_list";

    if (hotel_type === "manual_entry" || hotel_id === "other") {
      if (!hotel_name) {
        return res.status(400).json({
          message: "Hotel name is required for manual entry",
        });
      }

      finalHotelName = sanitizeHtmlString(hotel_name);
      finalHotelType = "manual_entry";
    } else {
      const hotelExists = await HotelMaster.findOne({ _id: hotel_id });

      if (!hotelExists) {
        return res.status(404).json({
          message: "Hotel not found in master list",
        });
      }

      finalHotelName = hotelExists.name;
    }

    const safeHotelData = {
      stay_start_date: startDate,
      stay_end_date: endDate,
      city: sanitizeHtmlString(city),
      state: sanitizeHtmlString(state),
      hotel_id: hotel_id,
      hotel_name: sanitizeHtmlString(finalHotelName),
      hotel_type: sanitizeHtmlString(finalHotelType),
    };

    const existingHotel = await Hotel.findOne({ user_id, event_id });
    const isUpdate = !!existingHotel;

    await Hotel.findOneAndUpdate(
      { user_id, event_id }, 
      {
        user_event_id: targetUserEvent.registration_id,
        added_by: req.user.user_id, 
        for_whom,
        ...safeHotelData,
        status: "submitted",
      },
      { upsert: true, runValidators: true },
    );

    try {
      const eventDetails = await Event.findById(event_id);
      const targetUser = await User.findOne({ id: user_id });

      if (eventDetails && targetUser && targetUser.fcm_token) {
        const isPhysicalOrHybrid = ["physical", "hybrid", "Physical", "Hybrid", "PHYSICAL", "HYBRID"].includes(eventDetails.event_type);
        const allowedRoles = ["DAO", "DELEGATE", "HEAD OF DELEGATE", "SECURITY OFFICER", "INTERPRETER", "MEDIA", "DEPUTY", "DELEGATION CONTACT OFFICER", "SPEAKER"];

        if (isPhysicalOrHybrid && allowedRoles.includes(targetUserEvent.role)) {
          const delegateName = targetUser.name || `${targetUser.first_name} ${targetUser.last_name || ''}`.trim();
          const eventName = eventDetails.name;
          
          const notifTitle = isUpdate ? "Accommodation Updated 🏨" : "Accommodation Submitted 🏨";
          let notifBody = `Accommodation details ${isUpdate ? 'updated' : 'submitted'} for ${delegateName} traveling for the event ${eventName}.`;

          if (user_id === req.user.user_id) {
              notifBody = `Your accommodation details have been saved successfully.`;
          }

          await sendPushNotification(targetUser.fcm_token, notifTitle, notifBody);
          console.log(`✅ Push sent to ${targetUser.email} regarding Accommodation details.`);
        } else {
          console.log(`⏭️ Push skipped: Event is Virtual OR User is not DAO/Delegate.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Accommodation notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: isUpdate ? "HOTEL_UPDATE" : "HOTEL_CREATE",
      description: `Saved hotel accommodation for event ${event_id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "HOTEL",
      metadata: {
        eventId: event_id,
        userId: user_id,
        forWhom: for_whom,
      },
    });

    res.json({
      message: "Hotel accommodation details saved successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to save hotel accommodation",
    });
  }
};

export const getHotel = async (req, res) => {
  try {
    const loggedUserId = req.user.user_id;

    const delegateUserEvents = await UserEvent.find({
      created_by: loggedUserId,
      role: {
        $in: DELEGATE_ROLES,
      },
    });

    const delegateUserIds = delegateUserEvents.map((ue) => ue.user_id);

    const hotels = await Hotel.find({
      $or: [
        { user_id: loggedUserId },
        { added_by: loggedUserId },
        { user_id: { $in: delegateUserIds } },
      ],
    }).lean();

    const hotelsWithDetails = await Promise.all(
      hotels.map(async (hotel) => {
        const hotelMaster = await HotelMaster.findOne({
          id: hotel.hotel_id,
        }).lean();

        const user = await User.findOne({ id: hotel.user_id }).lean();

        const userEvent = await UserEvent.findOne({
          user_id: hotel.user_id,
          event_id: hotel.event_id,
        }).lean();

        let event = null;
        if (hotel.event_id) {
          event = await Event.findOne({ _id: hotel.event_id }).lean();
        }

        let resolvedOrganisation = user?.organisation
          ? sanitizeHtmlString(user.organisation)
          : null;

        if (!resolvedOrganisation && userEvent?.created_by) {
          const creator = await User.findOne({ id: userEvent.created_by }).lean();
          if (creator?.organisation) {
            resolvedOrganisation = sanitizeHtmlString(creator.organisation);
          }
        }

        if (!resolvedOrganisation && hotel?.added_by) {
          const addedByUser = await User.findOne({ id: hotel.added_by }).lean();
          if (addedByUser?.organisation) {
            resolvedOrganisation = sanitizeHtmlString(addedByUser.organisation);
          }
        }

        return {
          ...hotel,
          hotel: hotelMaster,
          user: user,
          user_event: userEvent,
          event: event,
          event_role: userEvent?.role || null,
          is_self: hotel.user_id === loggedUserId,
          is_delegate: delegateUserIds.includes(hotel.user_id),
          filled_by_me: hotel.added_by === loggedUserId,
          organisation: resolvedOrganisation,
        };
      }),
    );

    res.json(hotelsWithDetails);
  } catch (err) {
    console.error("Error in getHotel:", err);
    res.status(500).json({ message: "Failed to fetch hotel accommodations" });
  }
};

export const getEventHotels = async (req, res) => {
  try {
    const loggedUserEvent = await UserEvent.findOne({
      user_id: req.user.user_id,
      event_id: req.params.eventId,
    });

    if (
      !loggedUserEvent ||
      !["EVENT MANAGER", "DAO"].includes(loggedUserEvent.role)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const hotels = await Hotel.find({
      event_id: req.params.eventId,
    }).populate("hotel_id");

    res.json(hotels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch event hotels" });
  }
};

export const getHotelMaster = async (req, res) => {
  try {
    const hotels = await HotelMaster.find({ status: "active" })
      .select("id name city state address contact")
      .sort({ name: 1 });

    res.json(hotels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch hotel master list" });
  }
};