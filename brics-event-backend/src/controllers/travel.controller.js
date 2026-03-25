// brics-event-backend/src/controllers/travel.controller.js

import Travel from "../models/Travel.js";
import UserEvent from "../models/UserEvent.js";
import { sanitizeHtmlString } from "../data/sanitize.js";
import { uploadToS3 } from "../config/uploadToS3.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Event from "../models/Event.js"; 
import Activity from "../models/Activity.js";
import { sendPushNotification } from "../utils/notification.js"; // 🔥 Added FCM Import

export const saveTravel = async (req, res) => {
  try {
    const {
      event_id,
      user_id,
      for_whom = "MYSELF",

      country_from,
      arrival_flight_number,
      port_of_entry,
      arrival_date,
      arrival_has_connecting_flight,
      arrival_connecting_flight_number,
      arrival_connecting_port,
      arrival_connecting_date,
      arrival_connecting_country,

      country_to,
      departure_flight_number,
      port_of_exit,
      departure_date,
      departure_has_connecting_flight,
      departure_connecting_flight_number,
      departure_connecting_port,
      departure_connecting_date,
      departure_connecting_country,
    } = req.body;

    const loggedUser = await User.findOne({ id: req.user.user_id });
    let systemRole = null;

    if (loggedUser?.role_id) {
      const roleDoc = await Role.findOne({ id: loggedUser.role_id });
      systemRole = roleDoc?.name;
    }

    const isSuperAdmin = systemRole === "SUPER ADMIN";

    const targetUserEvent = await UserEvent.findOne({ user_id, event_id });
    if (!targetUserEvent)
      return res.status(404).json({ message: "Target user not in event" });

    if (!isSuperAdmin) {
      const loggedUserEvent = await UserEvent.findOne({
        user_id: req.user.user_id,
        event_id,
      });

      if (!loggedUserEvent)
        return res
          .status(403)
          .json({ message: "You are not part of this event" });
    }

    if (for_whom === "MYSELF" && user_id !== req.user.user_id)
      return res.status(403).json({ message: "Cannot add for other user" });

    if (for_whom === "DELEGATE") {
      if (!isSuperAdmin) {
        const loggedUserEvent = await UserEvent.findOne({
          user_id: req.user.user_id,
          event_id,
        });

        const hasEventPermission =
          loggedUserEvent &&
          [
            "DAO",
            "EVENT MANAGER",
            "DELEGATE",
            "HEAD OF DELEGATE",
            "SECURITY OFFICER",
            "INTERPRETER",
            "MEDIA",
            "DEPUTY",
            "DELEGATION CONTACT OFFICER",
            "SPEAKER",
          ].includes(loggedUserEvent.role);
        const hasSystemPermission = [
          "DAO",
          "EVENT MANAGER",
          "DELEGATE",
          "HEAD OF DELEGATE",
          "SECURITY OFFICER",
          "INTERPRETER",
          "MEDIA",
          "DEPUTY",
          "DELEGATION CONTACT OFFICER",
          "SPEAKER",
        ].includes(systemRole);

        if (!hasEventPermission && !hasSystemPermission) {
          return res.status(403).json({
            message: "Not allowed for delegates",
            eventRole: loggedUserEvent?.role,
            systemRole: systemRole,
          });
        }
      }
    }

    let arrivalTicketKey = null;
    let departureTicketKey = null;

    if (req.files?.arrival_ticket?.[0]) {
      arrivalTicketKey = await uploadToS3(
        req.files.arrival_ticket[0],
        user_id,
        "travel-arrival",
      );
    } else if (req.body.arrival_ticket_base64) {
      arrivalTicketKey = await uploadToS3(
        req.body.arrival_ticket_base64,
        user_id,
        "travel-arrival",
      );
    }

    if (req.files?.departure_ticket?.[0]) {
      departureTicketKey = await uploadToS3(
        req.files.departure_ticket[0],
        user_id,
        "travel-departure",
      );
    } else if (req.body.departure_ticket_base64) {
      departureTicketKey = await uploadToS3(
        req.body.departure_ticket_base64,
        user_id,
        "travel-departure",
      );
    }

    const safeArrival = {
      country_from: sanitizeHtmlString(country_from),
      flight_number: sanitizeHtmlString(arrival_flight_number),
      port_of_entry: sanitizeHtmlString(port_of_entry),
      arrival_date: new Date(arrival_date),
      ticket_url: arrivalTicketKey,
      has_connecting_flight:
        arrival_has_connecting_flight === "true" ||
        arrival_has_connecting_flight === true ||
        false,
    };

    if (
      safeArrival.has_connecting_flight ||
      arrival_connecting_flight_number ||
      arrival_connecting_port ||
      arrival_connecting_date ||
      arrival_connecting_country
    ) {
      safeArrival.connecting_flight = {};
      if (arrival_connecting_flight_number)
        safeArrival.connecting_flight.flight_number = sanitizeHtmlString(
          arrival_connecting_flight_number,
        );
      if (arrival_connecting_port)
        safeArrival.connecting_flight.port = sanitizeHtmlString(
          arrival_connecting_port,
        );
      if (arrival_connecting_date)
        safeArrival.connecting_flight.date = new Date(arrival_connecting_date);
      if (arrival_connecting_country)
        safeArrival.connecting_flight.country = sanitizeHtmlString(
          arrival_connecting_country,
        );
    }

    const safeDeparture = {};
    if (country_to) {
      safeDeparture.country_to = sanitizeHtmlString(country_to);
    }
    if (departure_flight_number) {
      safeDeparture.flight_number = sanitizeHtmlString(departure_flight_number);
    }
    if (port_of_exit) {
      safeDeparture.port_of_exit = sanitizeHtmlString(port_of_exit);
    }
    if (departure_date) {
      safeDeparture.departure_date = new Date(departure_date);
    }
    if (departureTicketKey) {
      safeDeparture.ticket_url = departureTicketKey;
    }
    safeDeparture.has_connecting_flight =
      departure_has_connecting_flight === "true" ||
      departure_has_connecting_flight === true ||
      false;

    if (
      safeDeparture.has_connecting_flight ||
      departure_connecting_flight_number ||
      departure_connecting_port ||
      departure_connecting_date ||
      departure_connecting_country
    ) {
      safeDeparture.connecting_flight = {};
      if (departure_connecting_flight_number)
        safeDeparture.connecting_flight.flight_number = sanitizeHtmlString(
          departure_connecting_flight_number,
        );
      if (departure_connecting_port)
        safeDeparture.connecting_flight.port = sanitizeHtmlString(
          departure_connecting_port,
        );
      if (departure_connecting_date)
        safeDeparture.connecting_flight.date = new Date(
          departure_connecting_date,
        );
      if (departure_connecting_country)
        safeDeparture.connecting_flight.country = sanitizeHtmlString(
          departure_connecting_country,
        );
    }

    const existingTravel = await Travel.findOne({ user_id, event_id });
    const isUpdate = !!existingTravel; 

    if (existingTravel) {
      if (!arrivalTicketKey && existingTravel.arrival?.ticket_url) {
        safeArrival.ticket_url = existingTravel.arrival.ticket_url;
      }
      if (!departureTicketKey && existingTravel.departure?.ticket_url) {
        safeDeparture.ticket_url = existingTravel.departure.ticket_url;
      }
    }

    await Travel.findOneAndUpdate(
      { user_id, event_id },
      {
        user_event_id: targetUserEvent.registration_id,
        added_by: req.user.user_id,
        for_whom,
        arrival: safeArrival,
        departure: safeDeparture,
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
          
          const notifTitle = isUpdate ? "Travel Details Updated ✈️" : "Travel Details Added ✈️";
          let notifBody = `Travel details ${isUpdate ? 'updated' : 'submitted'} for ${delegateName} traveling for the event ${eventName}.`;

          if (user_id === req.user.user_id) {
            notifBody = `Your travel details have been saved successfully.`;
          }

          await sendPushNotification(targetUser.fcm_token, notifTitle, notifBody);
          console.log(`✅ Push sent to ${targetUser.email} regarding Travel details.`);
        } else {
          console.log(`⏭️ Push skipped: Event is Virtual OR User is not DAO/Delegate.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Travel notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: isUpdate ? "TRAVEL_UPDATE" : "TRAVEL_CREATE",
      description: `Saved travel details for event ${event_id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "TRAVEL",
      metadata: {
        eventId: event_id,
        userId: user_id,
        forWhom: for_whom,
      },
    });

    res.json({ message: "Travel details saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save travel" });
  }
};

export const getTravel = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const delegateUserEvents = await UserEvent.find({
      created_by: user_id,
      role: {
        $in: [
          "DELEGATE",
          "HEAD OF DELEGATE",
          "SECURITY OFFICER",
          "INTERPRETER",
          "MEDIA",
          "DEPUTY",
          "DELEGATION CONTACT OFFICER",
          "SPEAKER",
        ],
      },
    });

    const delegateUserIds = delegateUserEvents.map((ue) => ue.user_id);

    const travels = await Travel.find({
      $or: [
        { user_id: user_id },
        { added_by: user_id },
        { user_id: { $in: delegateUserIds } },
      ],
    }).populate("event_id");

    if (!travels || travels.length === 0) {
      return res.json([]);
    }

    const response = await Promise.all(
      travels.map(async (travel) => {
        const user = await User.findOne(
          { id: travel.user_id }, 
        );

        const eventId = travel.event_id?._id
          ? String(travel.event_id._id)
          : String(travel.event_id);

        const userEvent = await UserEvent.findOne({
          user_id: travel.user_id,
          event_id: eventId,
        });

        return {
          ...travel.toObject(),
          user_name:
            user?.name ||
            `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
            null,
          first_name: user?.first_name || null,
          last_name: user?.last_name || null,
          position: user?.position || null,
          event_role: userEvent?.role || null, 
          is_self: travel.user_id === user_id, 
          is_delegate: delegateUserIds.includes(travel.user_id), 
          filled_by_me: travel.added_by === user_id, 
        };
      }),
    );

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch travel" });
  }
};

export const getEventTravels = async (req, res) => {
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

    const travels = await Travel.find({
      event_id: req.params.eventId,
    });

    res.json(travels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch event travels" });
  }
};