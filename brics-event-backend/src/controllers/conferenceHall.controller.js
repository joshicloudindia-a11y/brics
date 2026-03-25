//brics-event-backend/src/controllers/conferenceHall.controller.js

import ConferenceHall from "../models/ConferenceHall.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Activity from "../models/Activity.js";
import { sanitizeHtmlString } from "../data/sanitize.js";
import UserEvent from "../models/UserEvent.js";
import Session from "../models/Session.js";
import { sendPushNotification } from "../utils/notification.js";

export const createConferenceHall = async (req, res) => {
  try {
    const {
      hall_name,
      venue_name,
      floor_name,
      state,
      city,
      capacity,
      video_conference_enabled,
      event_id,
      session_id,
      session_name,
      start_date,
      end_date,
    } = req.body;

    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (
      !authRole ||
      !["SUPER ADMIN", "EVENT MANAGER"].includes(authRole.name)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      !hall_name ||
      !venue_name ||
      !floor_name ||
      !state ||
      !city ||
      !capacity
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const safeHallName = sanitizeHtmlString(hall_name.trim());
    const safeVenueName = sanitizeHtmlString(venue_name.trim());
    const safeFloorName = sanitizeHtmlString(floor_name.trim());
    const safeState = sanitizeHtmlString(state.trim());
    const safeCity = sanitizeHtmlString(city.trim());

    const hallData = {
      hall_name: safeHallName,
      venue_name: safeVenueName,
      floor_name: safeFloorName,
      state: safeState,
      city: safeCity,
      capacity: parseInt(capacity),
      video_conference_enabled:
        video_conference_enabled === true ||
        video_conference_enabled === "true",
      created_by: req.user.user_id,
      status: "available", 
    };

    if (event_id) {
      if (!event_id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          message: "Invalid event_id format. Must be a valid MongoDB ObjectId",
        });
      }

      const event = await Event.findById(event_id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      let sessionNameToUse = null;
      if (session_id) {
        const session = await Session.findById(session_id);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }
        sessionNameToUse = session.name;
      }

      const startDateObj = start_date ? new Date(start_date) : event.start_date;
      const endDateObj = end_date ? new Date(end_date) : event.end_date;

      const existingHall = await ConferenceHall.findOne({
        hall_name: safeHallName,
        venue_name: safeVenueName,
        floor_name: safeFloorName,
        status: "booked",
        is_active: true,
        $or: [
          {
            start_date: { $lte: startDateObj },
            end_date: { $gte: startDateObj },
          },
          { start_date: { $lte: endDateObj }, end_date: { $gte: endDateObj } },
          {
            start_date: { $gte: startDateObj },
            end_date: { $lte: endDateObj },
          },
        ],
      });

      if (existingHall) {
        return res.status(409).json({
          message: "This hall is already booked for overlapping dates",
          conflict: {
            hall_name: existingHall.hall_name,
            venue_name: existingHall.venue_name,
            floor_name: existingHall.floor_name,
            event_id: existingHall.event_id,
            session_name: existingHall.session_name,
            booked_from: existingHall.start_date,
            booked_to: existingHall.end_date,
          },
        });
      }

      const eventExistingHalls = await ConferenceHall.find({
        event_id: event_id,
        is_active: true,
      });

      for (const eventHall of eventExistingHalls) {
        const existingStart = new Date(eventHall.start_date);
        const existingEnd = new Date(eventHall.end_date);

        const hasDateOverlap =
          (startDateObj >= existingStart && startDateObj <= existingEnd) ||
          (endDateObj >= existingStart && endDateObj <= existingEnd) ||
          (startDateObj <= existingStart && endDateObj >= existingEnd);

        if (hasDateOverlap) {
          return res.status(409).json({
            success: false,
            message:
              "This event already has another hall booked for overlapping dates",
            conflict: {
              hall_name: eventHall.hall_name,
              venue_name: eventHall.venue_name,
              floor_name: eventHall.floor_name,
              event_name: event.name,
              booked_from: eventHall.start_date,
              booked_to: eventHall.end_date,
            },
            suggestion:
              "An event can have multiple halls only if booking dates don't overlap. Please select a different date range.",
          });
        }
      }

      hallData.event_id = event_id;
      hallData.session_id = session_id || null;
      hallData.session_name = sessionNameToUse || session_name || event.name;
      hallData.assigned_by = req.user.user_id;
      hallData.assigned_date = new Date();
      hallData.start_date = startDateObj;
      hallData.end_date = endDateObj;
      hallData.status = "booked"; 
    }

    const hall = await ConferenceHall.create(hallData);

    try {
      if (authUser && authUser.fcm_token) {
        await sendPushNotification(
          authUser.fcm_token,
          "Conference Hall Created 🏛️",
          `Hall '${hall.hall_name}' at ${hall.venue_name} has been created successfully.`
        );
        console.log(`✅ Push sent to Admin (${authUser.email}) regarding Hall Creation.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Hall Create notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: "HALL_CREATE",
      description: `Created conference hall: ${hall.hall_name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "CONFERENCE_HALL",
      metadata: {
        hallId: hall.id,
        hallName: hall.hall_name,
        eventId: event_id,
      },
    });

    let eventDetails = null;
    if (event_id) {
      const event = await Event.findById(event_id);
      if (event) {
        eventDetails = {
          event_id: event._id,
          event_name: event.name,
          event_start: event.start_date,
          event_end: event.end_date,
        };
      }
    }

    return res.status(201).json({
      success: true,
      message: "Conference hall created successfully",
      hall: {
        ...hall.toObject(),
        is_available: hall.status === "available",
        is_booked: hall.status === "booked",
        booking_details: hall.event_id
          ? {
              event_id: hall.event_id,
              session_id: hall.session_id,
              session_name: hall.session_name,
              start_date: hall.start_date,
              end_date: hall.end_date,
              assigned_date: hall.assigned_date,
            }
          : null,
        event: eventDetails,
      },
    });
  } catch (error) {
    console.error("createConferenceHall error:", error);
    return res
      .status(500)
      .json({ message: "Failed to create conference hall" });
  }
};

export const createMultipleConferenceHalls = async (req, res) => {
  try {
    const { halls } = req.body;

    // AUTH CHECK
    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (
      !authRole ||
      !["SUPER ADMIN", "EVENT MANAGER"].includes(authRole.name)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // VALIDATION
    if (!halls || !Array.isArray(halls) || halls.length === 0) {
      return res.status(400).json({ message: "halls array is required" });
    }

    const createdHalls = [];
    const errors = [];

    for (let i = 0; i < halls.length; i++) {
      const hallInput = halls[i];

      try {
        const {
          hall_name,
          venue_name,
          floor_name,
          state,
          city,
          capacity,
          video_conference_enabled,
          event_id,
          session_id,
          session_name,
          start_date,
          end_date,
        } = hallInput;

        // VALIDATION
        if (
          !hall_name ||
          !venue_name ||
          !floor_name ||
          !state ||
          !city ||
          !capacity
        ) {
          errors.push({
            index: i,
            hall_name: hall_name || "Unknown",
            error: "Missing required fields",
          });
          continue;
        }

        // SANITIZE
        const safeHallName = sanitizeHtmlString(hall_name.trim());
        const safeVenueName = sanitizeHtmlString(venue_name.trim());
        const safeFloorName = sanitizeHtmlString(floor_name.trim());
        const safeState = sanitizeHtmlString(state.trim());
        const safeCity = sanitizeHtmlString(city.trim());

        // CREATE HALL DATA
        const hallData = {
          hall_name: safeHallName,
          venue_name: safeVenueName,
          floor_name: safeFloorName,
          state: safeState,
          city: safeCity,
          capacity: parseInt(capacity),
          video_conference_enabled:
            video_conference_enabled === true ||
            video_conference_enabled === "true",
          created_by: req.user.user_id,
          status: "available", // Default: hall is available
        };

        // IF EVENT PROVIDED, ADD ASSIGNMENT AND MARK AS BOOKED
        if (event_id) {
          const event = await Event.findById(event_id);
          if (!event) {
            errors.push({
              index: i,
              hall_name: safeHallName,
              error: "Event not found",
            });
            continue;
          }

          const startDateObj = start_date
            ? new Date(start_date)
            : event.start_date;
          const endDateObj = end_date ? new Date(end_date) : event.end_date;

          // CHECK FOR DOUBLE-BOOKING
          const existingHall = await ConferenceHall.findOne({
            hall_name: safeHallName,
            venue_name: safeVenueName,
            floor_name: safeFloorName,
            status: "booked",
            is_active: true,
            $or: [
              {
                start_date: { $lte: startDateObj },
                end_date: { $gte: startDateObj },
              },
              {
                start_date: { $lte: endDateObj },
                end_date: { $gte: endDateObj },
              },
              {
                start_date: { $gte: startDateObj },
                end_date: { $lte: endDateObj },
              },
            ],
          });

          if (existingHall) {
            errors.push({
              index: i,
              hall_name: safeHallName,
              error: `Hall already booked from ${existingHall.start_date} to ${existingHall.end_date}`,
            });
            continue;
          }

          // CHECK IF SAME EVENT ALREADY HAS ANOTHER HALL FOR OVERLAPPING DATES
          const eventExistingHalls = await ConferenceHall.find({
            event_id: event_id,
            is_active: true,
          });

          let hasEventDateConflict = false;
          for (const eventHall of eventExistingHalls) {
            const existingStart = new Date(eventHall.start_date);
            const existingEnd = new Date(eventHall.end_date);

            const hasDateOverlap =
              (startDateObj >= existingStart && startDateObj <= existingEnd) ||
              (endDateObj >= existingStart && endDateObj <= existingEnd) ||
              (startDateObj <= existingStart && endDateObj >= existingEnd);

            if (hasDateOverlap) {
              errors.push({
                index: i,
                hall_name: safeHallName,
                error: `Event already has ${eventHall.hall_name} booked for overlapping dates (${eventHall.start_date} to ${eventHall.end_date})`,
              });
              hasEventDateConflict = true;
              break;
            }
          }

          if (hasEventDateConflict) {
            continue;
          }

          let sessionNameToUse = null;
          if (session_id) {
            const session = await Session.findById(session_id);
            if (!session) {
              errors.push({
                index: i,
                hall_name: safeHallName,
                error: "Session not found",
              });
              continue;
            }
            sessionNameToUse = session.name;
          }
          hallData.event_id = event_id;
          hallData.session_id = session_id || null;
          hallData.session_name = sessionNameToUse || session_name || event.name;
          hallData.assigned_by = req.user.user_id;
          hallData.assigned_date = new Date();
          hallData.start_date = startDateObj;
          hallData.end_date = endDateObj;
          hallData.status = "booked"; // Mark as booked when event is assigned
        }

        const hall = await ConferenceHall.create(hallData);
        createdHalls.push(hall);
      } catch (error) {
        errors.push({
          index: i,
          hall_name: hallInput.hall_name || "Unknown",
          error: error.message,
        });
      }
    }

    // LOG ACTIVITY
    if (createdHalls.length > 0) {
      await Activity.logActivity({
        activityType: "HALL_CREATE",
        description: `Created ${createdHalls.length} conference halls`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "SUCCESS",
        resourceType: "CONFERENCE_HALL",
        metadata: {
          totalCreated: createdHalls.length,
          totalFailed: errors.length,
        },
      });
    }

    return res.status(201).json({
      message: `Successfully created ${createdHalls.length} hall(s)`,
      created: createdHalls.length,
      failed: errors.length,
      halls: createdHalls,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("createMultipleConferenceHalls error:", error);
    return res
      .status(500)
      .json({ message: "Failed to create conference halls" });
  }
};

/**
 * GET ALL CONFERENCE HALLS
 * - Supports filters: date range, status, state, city
 * - Pagination support
 * - Access: SUPER ADMIN and EVENT MANAGER only
 * - Role-based filtering:
 *   * SUPER ADMIN: sees all halls
 *   * EVENT MANAGER: sees only halls assigned to their events + available halls
 */
export const getAllConferenceHalls = async (req, res) => {
  try {
    const authUserId = req.user.user_id;
    const { start_date, end_date, status, state, city, search, event_id } =
      req.query;

    /* ===============================
       GET AUTH USER ROLE
    =============================== */
    const authUser = await User.findOne({ id: authUserId });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!authRole) {
      return res.status(403).json({ message: "Role not found" });
    }

    const roleName = authRole.name;

    if (roleName !== "SUPER ADMIN" && roleName !== "EVENT MANAGER") {
      return res.status(403).json({
        message:
          "Access denied. Only SUPER ADMIN and EVENT MANAGER can view conference halls",
      });
    }

    /* ===============================
       BUILD FILTER
    =============================== */
    const filter = { is_active: true };

    if (event_id) filter.event_id = event_id;
    if (status) filter.status = status;
    if (state) filter.state = state;
    if (city) filter.city = city;

    if (search) {
      filter.$or = [
        { hall_name: { $regex: search, $options: "i" } },
        { venue_name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    // If date range provided → show only available halls
    if (start_date && end_date) {
      filter.status = "available";
      filter.event_id = null;
    }

    // PAGINATION
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // total count for filters
    const total = await ConferenceHall.countDocuments(filter);

    // fetch paginated halls
    const halls = await ConferenceHall.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    /* ===============================
       ENHANCE HALL DATA
    =============================== */
    const enhancedHalls = await Promise.all(
      halls.map(async (hall) => {
        const hallObj = hall.toObject();

        hallObj.is_available = hall.status === "available";
        hallObj.is_booked = hall.status === "booked";

        // Populate session name if missing
        if (hall.session_id && !hall.session_name) {
          const session = await Session.findById(hall.session_id);
          if (session) hallObj.session_name = session.name;
        }

        // Booking details
        if (hall.event_id) {
          hallObj.booking_details = {
            event_id: hall.event_id,
            session_id: hall.session_id,
            session_name: hallObj.session_name,
            start_date: hall.start_date,
            end_date: hall.end_date,
            assigned_date: hall.assigned_date,
            assigned_by: hall.assigned_by,
          };

          // Session assignment
          hallObj.session_assignment = hall.session_id
            ? {
                session_id: hall.session_id,
                session_name: hallObj.session_name,
              }
            : null;

          // Booking duration
          if (hall.start_date && hall.end_date) {
            const start = new Date(hall.start_date);
            const end = new Date(hall.end_date);
            const diffDays =
              Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            hallObj.booking_duration_days = diffDays;
          }
        }

        return hallObj;
      })
    );

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      total: total,
      page: page,
      perPage: limit,
      totalPages: totalPages,
      filters_applied: {
        event_id: event_id || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: status || null,
        state: state || null,
        city: city || null,
        search: search || null,
      },
      halls: enhancedHalls,
    });
  } catch (error) {
    console.error("getAllConferenceHalls error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch conference halls" });
  }
};

/**
 * GET SINGLE CONFERENCE HALL
 */
export const getSingleConferenceHall = async (req, res) => {
  try {
    const { hallId } = req.params;

    // Search by UUID 'id' or MongoDB '_id'
    let hall;
    if (hallId.match(/^[0-9a-fA-F]{24}$/)) {
      // MongoDB ObjectId format
      hall = await ConferenceHall.findOne({ _id: hallId, is_active: true });
    } else {
      // UUID format
      hall = await ConferenceHall.findOne({ id: hallId, is_active: true });
    }

    if (!hall) {
      return res.status(404).json({ message: "Conference hall not found" });
    }

    // Populate event details if assigned
    let hallData = hall.toObject();

    // Add availability flags
    hallData.is_available = hall.status === "available";
    hallData.is_booked = hall.status === "booked";

    // Add booking details if booked
    if (hall.event_id) {
      hallData.booking_details = {
        event_id: hall.event_id,
        session_id: hall.session_id,
        session_name: hall.session_name,
        start_date: hall.start_date,
        end_date: hall.end_date,
        assigned_date: hall.assigned_date,
      };

      const event = await Event.findById(hall.event_id);
      if (event) {
        hallData.event = {
          event_id: event._id,
          event_name: event.name,
          event_start: event.start_date,
          event_end: event.end_date,
          venue: event.venue,
        };
      }
    } else {
      hallData.booking_details = null;
      hallData.event = null;
    }

    return res.json({
      success: true,
      hall: hallData,
    });
  } catch (error) {
    console.error("getSingleConferenceHall error:", error);
    return res.status(500).json({ message: "Failed to fetch conference hall" });
  }
};


export const updateConferenceHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const {
      hall_name,
      venue_name,
      floor_name,
      state,
      city,
      capacity,
      video_conference_enabled,
      status,
      event_id,
      session_id,
      session_name,
      start_date,
      end_date,
    } = req.body;

    const hasUpdateData =
      hall_name ||
      venue_name ||
      floor_name ||
      state ||
      city ||
      capacity !== undefined ||
      video_conference_enabled !== undefined ||
      status ||
      event_id !== undefined ||
      start_date ||
      end_date;

    if (!hasUpdateData) {
      return res.status(400).json({
        message:
          "No update data provided. Please provide at least one field to update",
      });
    }

    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (
      !authRole ||
      !["SUPER ADMIN", "EVENT MANAGER"].includes(authRole.name)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    let hall;
    if (hallId.match(/^[0-9a-fA-F]{24}$/)) {
      hall = await ConferenceHall.findOne({ _id: hallId, is_active: true });
    } else {
      hall = await ConferenceHall.findOne({ id: hallId, is_active: true });
    }

    if (!hall) {
      return res.status(404).json({ message: "Conference hall not found" });
    }

    if (hall_name) hall.hall_name = sanitizeHtmlString(hall_name.trim());
    if (venue_name) hall.venue_name = sanitizeHtmlString(venue_name.trim());
    if (floor_name) hall.floor_name = sanitizeHtmlString(floor_name.trim());
    if (state) hall.state = sanitizeHtmlString(state.trim());
    if (city) hall.city = sanitizeHtmlString(city.trim());
    if (capacity) hall.capacity = parseInt(capacity);
    if (video_conference_enabled !== undefined) {
      hall.video_conference_enabled =
        video_conference_enabled === true ||
        video_conference_enabled === "true";
    }
    if (status) hall.status = status;

    if (event_id !== undefined) {
      if (event_id === null || event_id === "") {
        hall.event_id = null;
        hall.session_id = null;
        hall.session_name = null;
        hall.assigned_by = null;
        hall.assigned_date = null;
        hall.start_date = null;
        hall.end_date = null;
        hall.status = "available";
      } else {
        if (!event_id.match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({
            message:
              "Invalid event_id format. Must be a valid MongoDB ObjectId",
          });
        }

        const event = await Event.findById(event_id);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        const startDateObj = start_date
          ? new Date(start_date)
          : event.start_date;
        const endDateObj = end_date ? new Date(end_date) : event.end_date;

        const conflictingHall = await ConferenceHall.findOne({
          _id: { $ne: hall._id },
          hall_name: hall.hall_name,
          venue_name: hall.venue_name,
          floor_name: hall.floor_name,
          status: "booked",
          is_active: true,
          $or: [
            {
              start_date: { $lte: startDateObj },
              end_date: { $gte: startDateObj },
            },
            {
              start_date: { $lte: endDateObj },
              end_date: { $gte: endDateObj },
            },
            {
              start_date: { $gte: startDateObj },
              end_date: { $lte: endDateObj },
            },
          ],
        });

        if (conflictingHall) {
          return res.status(409).json({
            message: "This hall is already booked for overlapping dates",
            conflict: {
              hall_name: conflictingHall.hall_name,
              venue_name: conflictingHall.venue_name,
              floor_name: conflictingHall.floor_name,
              event_id: conflictingHall.event_id,
              session_name: conflictingHall.session_name,
              booked_from: conflictingHall.start_date,
              booked_to: conflictingHall.end_date,
            },
          });
        }

        const eventExistingHalls = await ConferenceHall.find({
          _id: { $ne: hall._id },
          event_id: event_id,
          is_active: true,
        });

        for (const eventHall of eventExistingHalls) {
          const existingStart = new Date(eventHall.start_date);
          const existingEnd = new Date(eventHall.end_date);

          const hasDateOverlap =
            (startDateObj >= existingStart && startDateObj <= existingEnd) ||
            (endDateObj >= existingStart && endDateObj <= existingEnd) ||
            (startDateObj <= existingStart && endDateObj >= existingEnd);

          if (hasDateOverlap) {
            return res.status(409).json({
              success: false,
              message:
                "This event already has another hall for overlapping dates",
              conflict: {
                hall_name: eventHall.hall_name,
                venue_name: eventHall.venue_name,
                floor_name: eventHall.floor_name,
                event_name: event.name,
                booked_from: eventHall.start_date,
                booked_to: eventHall.end_date,
              },
              suggestion:
                "An event can have multiple halls only if booking dates don't overlap. Please select a different date range.",
            });
          }
        }

        hall.event_id = event_id;
        hall.session_id = session_id || hall.session_id || null;
        hall.session_name = session_name || hall.session_name || event.name;
        hall.assigned_by = req.user.user_id;
        hall.assigned_date = new Date();
        hall.start_date = startDateObj;
        hall.end_date = endDateObj;
        hall.status = "booked";
      }
    } else if (start_date || end_date) {
      if (hall.event_id) {
        const startDateObj = start_date
          ? new Date(start_date)
          : hall.start_date;
        const endDateObj = end_date ? new Date(end_date) : hall.end_date;

        const conflictingHall = await ConferenceHall.findOne({
          _id: { $ne: hall._id },
          hall_name: hall.hall_name,
          venue_name: hall.venue_name,
          floor_name: hall.floor_name,
          status: "booked",
          is_active: true,
          $or: [
            {
              start_date: { $lte: startDateObj },
              end_date: { $gte: startDateObj },
            },
            {
              start_date: { $lte: endDateObj },
              end_date: { $gte: endDateObj },
            },
            {
              start_date: { $gte: startDateObj },
              end_date: { $lte: endDateObj },
            },
          ],
        });

        if (conflictingHall) {
          return res.status(409).json({
            message: "This hall is already booked for overlapping dates",
            conflict: {
              hall_name: conflictingHall.hall_name,
              booked_from: conflictingHall.start_date,
              booked_to: conflictingHall.end_date,
            },
          });
        }

        const eventExistingHalls = await ConferenceHall.find({
          _id: { $ne: hall._id },
          event_id: hall.event_id,
          is_active: true,
        });

        for (const eventHall of eventExistingHalls) {
          const existingStart = new Date(eventHall.start_date);
          const existingEnd = new Date(eventHall.end_date);

          const hasDateOverlap =
            (startDateObj >= existingStart && startDateObj <= existingEnd) ||
            (endDateObj >= existingStart && endDateObj <= existingEnd) ||
            (startDateObj <= existingStart && endDateObj >= existingEnd);

          if (hasDateOverlap) {
            return res.status(409).json({
              message:
                "This event already has another hall for overlapping dates",
              conflict: {
                hall_name: eventHall.hall_name,
                booked_from: eventHall.start_date,
                booked_to: eventHall.end_date,
              },
            });
          }
        }

        hall.start_date = startDateObj;
        hall.end_date = endDateObj;
      }
    }

    await hall.save();

    try {
      if (authUser && authUser.fcm_token) {
        await sendPushNotification(
          authUser.fcm_token,
          "Conference Hall Updated 🏛️",
          `Hall '${hall.hall_name}' at ${hall.venue_name} has been updated successfully.`
        );
        console.log(`✅ Push sent to Admin (${authUser.email}) regarding Hall Update.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Hall Update notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: "HALL_UPDATE",
      description: `Updated conference hall: ${hall.hall_name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "CONFERENCE_HALL",
      metadata: {
        hallId: hall.id,
        hallName: hall.hall_name,
      },
    });

    const hallData = hall.toObject();
    hallData.is_available = hall.status === "available";
    hallData.is_booked = hall.status === "booked";

    if (hall.event_id) {
      hallData.booking_details = {
        event_id: hall.event_id,
        session_id: hall.session_id,
        session_name: hall.session_name,
        start_date: hall.start_date,
        end_date: hall.end_date,
        assigned_date: hall.assigned_date,
      };

      try {
        const event = await Event.findById(hall.event_id);
        if (event) {
          hallData.event = {
            event_id: event._id,
            event_name: event.name,
            event_start: event.start_date,
            event_end: event.end_date,
          };
        }
      } catch (err) {
        console.error("Error fetching event:", err);
      }
    } else {
      hallData.booking_details = null;
      hallData.event = null;
    }

    return res.json({
      success: true,
      message: "Conference hall updated successfully",
      hall: hallData,
    });
  } catch (error) {
    console.error("updateConferenceHall error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update conference hall" });
  }
};


export const deleteConferenceHall = async (req, res) => {
  try {
    const { hallId } = req.params;

    // AUTH CHECK
    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (
      !authRole ||
      !["SUPER ADMIN", "EVENT MANAGER"].includes(authRole.name)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Search by UUID 'id' or MongoDB '_id'
    let hall;
    if (hallId.match(/^[0-9a-fA-F]{24}$/)) {
      // MongoDB ObjectId format
      hall = await ConferenceHall.findOne({ _id: hallId, is_active: true });
    } else {
      // UUID format
      hall = await ConferenceHall.findOne({ id: hallId, is_active: true });
    }

    if (!hall) {
      return res.status(404).json({
        message: "Conference hall not found",
        canDelete: false,
      });
    }

    // CHECK IF HALL IS CURRENTLY ASSIGNED TO ANY EVENT
    if (hall.event_id) {
      return res.status(409).json({
        message: "Cannot delete hall that is currently assigned to an event",
        reason: "Hall is assigned to an event. Please unassign it first.",
        canDelete: false,
        assignedEvent: hall.event_id,
      });
    }

    // Soft delete
    hall.is_active = false;
    await hall.save();

    await Activity.logActivity({
      activityType: "HALL_DELETE",
      description: `Deleted conference hall: ${hall.hall_name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "CONFERENCE_HALL",
      metadata: {
        hallId: hall.id,
        hallName: hall.hall_name,
      },
    });

    return res.json({
      message: "Conference hall deleted successfully",
    });
  } catch (error) {
    console.error("deleteConferenceHall error:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete conference hall" });
  }
};

/**
 * ASSIGN HALL TO EVENT/SESSION
 * - Checks availability for date range
 * - Updates hall status to booked
 */
export const assignHallToEvent = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { event_id, session_id, session_name, start_date, end_date } = req.body;

    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (
      !authRole ||
      !["SUPER ADMIN", "EVENT MANAGER"].includes(authRole.name)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!event_id) {
      return res.status(400).json({ message: "event_id is required" });
    }

    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const hall = await ConferenceHall.findOne({ _id: hallId, is_active: true });
    if (!hall) {
      return res.status(404).json({ message: "Conference hall not found" });
    }

    const startDateObj = start_date ? new Date(start_date) : event.start_date;
    const endDateObj = end_date ? new Date(end_date) : event.end_date;

    if (
      hall.status === "booked" &&
      hall.event_id &&
      hall.event_id !== event_id
    ) {
      const hallStart = new Date(hall.start_date);
      const hallEnd = new Date(hall.end_date);

      const hasConflict =
        (startDateObj >= hallStart && startDateObj <= hallEnd) ||
        (endDateObj >= hallStart && endDateObj <= hallEnd) ||
        (startDateObj <= hallStart && endDateObj >= hallEnd);

      if (hasConflict) {
        const conflictEvent = await Event.findById(hall.event_id);

        return res.status(409).json({
          success: false,
          message: "This hall is already booked for overlapping dates",
          can_book: false,
          requested_dates: {
            start: startDateObj,
            end: endDateObj,
          },
          conflict: {
            hall_name: hall.hall_name,
            venue_name: hall.venue_name,
            floor_name: hall.floor_name,
            event_id: hall.event_id,
            event_name: conflictEvent?.name || "Unknown Event",
            session_id: hall.session_id,
            session_name: hall.session_name,
            booked_from: hall.start_date,
            booked_to: hall.end_date,
          },
          suggestion:
            "Please select a different date range or choose another hall",
        });
      }
    }

    const eventExistingHalls = await ConferenceHall.find({
      event_id: event_id,
      is_active: true,
      _id: { $ne: hallId }, 
    });

    for (const existingHall of eventExistingHalls) {
      const existingStart = new Date(existingHall.start_date);
      const existingEnd = new Date(existingHall.end_date);

      const hasDateOverlap =
        (startDateObj >= existingStart && startDateObj <= existingEnd) ||
        (endDateObj >= existingStart && endDateObj <= existingEnd) ||
        (startDateObj <= existingStart && endDateObj >= existingEnd);

      if (hasDateOverlap) {
        return res.status(409).json({
          success: false,
          message:
            "This event already has another hall booked for overlapping dates",
          can_book: false,
          requested_dates: {
            start: startDateObj,
            end: endDateObj,
          },
          conflict: {
            hall_name: existingHall.hall_name,
            venue_name: existingHall.venue_name,
            floor_name: existingHall.floor_name,
            event_id: existingHall.event_id,
            event_name: event.name,
            session_id: existingHall.session_id,
            session_name: existingHall.session_name,
            booked_from: existingHall.start_date,
            booked_to: existingHall.end_date,
          },
          suggestion:
            "An event can have multiple halls only if booking dates don't overlap. Please select a different date range.",
        });
      }
    }

    if (session_id) {
      const existingHallQuery = {
        event_id: event_id,
        session_id: session_id,
        is_active: true,
        _id: { $ne: hallId }, 
      };

      const existingHalls = await ConferenceHall.find(existingHallQuery);

      if (existingHalls.length > 0) {
        for (const existingHall of existingHalls) {
          existingHall.event_id = null;
          existingHall.session_id = null;
          existingHall.session_name = null;
          existingHall.assigned_date = null;
          existingHall.assigned_by = null;
          existingHall.start_date = null;
          existingHall.end_date = null;
          existingHall.status = "available";
          await existingHall.save();

          await Activity.logActivity({
            activityType: "HALL_UNASSIGN",
            description: `Auto-unassigned hall ${existingHall.hall_name} from session ${session_id}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("user-agent"),
            status: "SUCCESS",
            resourceType: "CONFERENCE_HALL",
            metadata: {
              hallId: existingHall.id,
              hallName: existingHall.hall_name,
              eventId: event_id,
              sessionId: session_id,
              reason: "session_hall_replaced",
            },
          });
        }
      }
    }

    let sessionNameToUse = null;
    if (session_id) {
      const session = await Session.findById(session_id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      sessionNameToUse = session.name;
    }
    
    hall.event_id = event_id;
    hall.session_id = session_id || null;
    hall.session_name = sessionNameToUse || session_name || event.name;
    hall.assigned_by = req.user.user_id;
    hall.assigned_date = new Date();
    hall.start_date = startDateObj;
    hall.end_date = endDateObj;
    hall.status = "booked";

    await hall.save();

    try {
      if (authUser && authUser.fcm_token) {
        const assignmentTarget = sessionNameToUse || event.name;
        await sendPushNotification(
          authUser.fcm_token,
          "Conference Hall Assigned 🏛️",
          `Hall '${hall.hall_name}' has been assigned to '${assignmentTarget}' at the event '${event.name}'.`
        );
        console.log(`✅ Push sent to Admin (${authUser.email}) regarding Hall Assignment.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Hall Assignment notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: "HALL_ASSIGN",
      description: `Assigned hall ${hall.hall_name} to ${session_name || event.name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "CONFERENCE_HALL",
      metadata: {
        hallId: hall.id,
        hallName: hall.hall_name,
        eventId: event_id,
        sessionId: session_id,
      },
    });

    const hallData = hall.toObject();
    hallData.is_available = false;
    hallData.is_booked = true;
    hallData.booking_details = {
      event_id: hall.event_id,
      session_id: hall.session_id,
      session_name: hall.session_name,
      start_date: hall.start_date,
      end_date: hall.end_date,
      assigned_date: hall.assigned_date,
      assigned_by: hall.assigned_by,
    };
    hallData.event = {
      event_id: event._id,
      event_name: event.name,
      event_start: event.start_date,
      event_end: event.end_date,
      venue: event.venue,
    };

    return res.json({
      success: true,
      message: "Hall assigned successfully",
      hall: hallData,
    });
  } catch (error) {
    console.error("assignHallToEvent error:", error);
    return res.status(500).json({ message: "Failed to assign hall" });
  }
};

/**
 * UNASSIGN/CHANGE HALL
 * - Removes specific assignment
 * - Updates status if no more assignments
 */
export const unassignHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { event_id, session_id } = req.body;

    // AUTH CHECK
    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (
      !authRole ||
      !["SUPER ADMIN", "EVENT MANAGER"].includes(authRole.name)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const hall = await ConferenceHall.findOne({ _id: hallId, is_active: true });
    if (!hall) {
      return res.status(404).json({ message: "Conference hall not found" });
    }

    // CHECK IF ASSIGNMENT EXISTS
    if (!hall.event_id || hall.event_id !== event_id) {
      return res.status(404).json({ message: "No matching assignment found" });
    }

    if (session_id && hall.session_id !== session_id) {
      return res
        .status(404)
        .json({ message: "No matching session assignment found" });
    }

    // REMOVE ASSIGNMENT
    hall.event_id = null;
    hall.session_id = null;
    hall.session_name = null;
    hall.assigned_date = null;
    hall.assigned_by = null;
    hall.start_date = null;
    hall.end_date = null;
    hall.status = "available";

    await hall.save();

    await Activity.logActivity({
      activityType: "HALL_UNASSIGN",
      description: `Unassigned hall ${hall.hall_name} from event`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "CONFERENCE_HALL",
      metadata: {
        hallId: hall.id,
        hallName: hall.hall_name,
        eventId: event_id,
        sessionId: session_id,
      },
    });

    return res.json({
      message: "Hall unassigned successfully",
      hall,
    });
  } catch (error) {
    console.error("unassignHall error:", error);
    return res.status(500).json({ message: "Failed to unassign hall" });
  }
};

/**
 * GET AVAILABLE HALLS FOR DATE/EVENT
 * - Returns halls not booked for specified date range
 */
export const getAvailableHalls = async (req, res) => {
  try {
    const { start_date, end_date, capacity_min, event_id } = req.query;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ message: "start_date and end_date are required" });
    }

    // Parse dates properly to avoid timezone issues
    const startDateObj = new Date(start_date + "T00:00:00Z");
    const endDateObj = new Date(end_date + "T23:59:59Z");

    // const filter = {
    //   is_active: true,
    //   $or: [
    //     // No assignment at all
    //     { event_id: null },
    //     // Or same event with different non-overlapping dates
    //     event_id
    //       ? {
    //           event_id: event_id,
    //           $or: [
    //             { start_date: { $gt: endDateObj } }, // Ends after requested range
    //             { end_date: { $lt: startDateObj } }, // Starts before requested range
    //           ],
    //         }
    //       : null,
    //     // Or different event with non-overlapping dates
    //     {
    //       event_id: { $ne: null, $ne: event_id || null },
    //       $or: [
    //         { start_date: { $gt: endDateObj } },
    //         { end_date: { $lt: startDateObj } },
    //       ],
    //     },
    //   ].filter(Boolean),
    // };
    let filter = {
      is_active: true,
    };

    if (capacity_min) {
      filter.capacity = { $gte: parseInt(capacity_min) };
    }

    // const availableHalls = await ConferenceHall.find(filter).sort({
    //   capacity: -1,
    // });
    const allHalls = await ConferenceHall.find(filter);

    // Filter in application to check for date overlaps
    const availableHalls = allHalls.filter((hall) => {
      // If hall has no dates assigned, it's available
      if (!hall.start_date || !hall.end_date) {
        return true;
      }

      const hallStart = new Date(hall.start_date);
      const hallEnd = new Date(hall.end_date);

      // Check if there's NO overlap between hall's dates and requested dates
      // No overlap occurs when:
      // - Hall ends before requested range starts, OR
      // - Hall starts after requested range ends
      const noOverlap = hallEnd < startDateObj || hallStart > endDateObj;

      // If no overlap, hall is available
      // If overlap exists and it's the same event_id, it's available
      // If overlap exists and it's different event_id, it's NOT available
      if (noOverlap) {
        return true;
      }

      // There is an overlap - check if it's the same event
      if (event_id && hall.event_id === event_id) {
        return true;
      }

      // Overlap with different event means not available
      return false;
    });

    return res.json({
      success: true,
      total: availableHalls.length,
      halls: availableHalls,
    });
  } catch (error) {
    console.error("getAvailableHalls error:", error);
    return res.status(500).json({ message: "Failed to fetch available halls" });
  }
};

/**
 * GET HALLS FOR SPECIFIC EVENT
 * - Shows all halls booked for a specific event
 * - Includes different date ranges for same event
 */
export const getEventHalls = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }


    // Find all halls assigned directly to this event
    const eventHalls = await ConferenceHall.find({
      event_id: eventId,
      is_active: true,
    });

    // Find all sessions for this event
    const sessions = await Session.find({ event_id: eventId });

    // Collect all unique hall IDs from sessions
    const sessionHallIds = sessions
      .map((s) => s.conference_hall_id)
      .filter((id) => !!id);

    // Fetch ConferenceHall docs for session-assigned halls not already in eventHalls
    const eventHallIds = eventHalls.map((h) => h._id.toString());
    const extraSessionHalls = sessionHallIds.length
      ? await ConferenceHall.find({
          _id: { $in: sessionHallIds.filter((id) => !eventHallIds.includes(id.toString())) },
          is_active: true,
        })
      : [];

    // Merge and deduplicate halls
    const allHallsMap = new Map();
    for (const hall of [...eventHalls, ...extraSessionHalls]) {
      allHallsMap.set(hall._id.toString(), hall);
    }
    const allHalls = Array.from(allHallsMap.values());

    // Enhance halls with detailed booking info
    const enhancedHalls = await Promise.all(
      allHalls.map(async (hall) => {
        const hallObj = hall.toObject();

        hallObj.is_available = false; // Booked for this event/session
        hallObj.is_booked = true;

        // Populate session_name if session_id exists and session_name is null
        let sessionName = hall.session_name;
        if (hall.session_id && !sessionName) {
          try {
            const session = await Session.findById(hall.session_id);
            if (session) {
              sessionName = session.name;
              hallObj.session_name = session.name;
            }
          } catch (err) {
            console.error("Error fetching session for hall:", err);
          }
        }

        hallObj.booking_details = {
          event_id: hall.event_id,
          session_id: hall.session_id,
          session_name: sessionName,
          start_date: hall.start_date,
          end_date: hall.end_date,
          assigned_date: hall.assigned_date,
          assigned_by: hall.assigned_by,
        };

        // Calculate booking duration in days
        if (hall.start_date && hall.end_date) {
          const start = new Date(hall.start_date);
          const end = new Date(hall.end_date);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          hallObj.booking_duration_days = diffDays + 1; // Include both start and end date
        }

        return hallObj;
      })
    );

    return res.json({
      success: true,
      event: {
        event_id: event._id,
        event_name: event.name,
        event_start: event.start_date,
        event_end: event.end_date,
        venue: event.venue,
      },
      total_halls_booked: enhancedHalls.length,
      halls: enhancedHalls,
    });
  } catch (error) {
    console.error("getEventHalls error:", error);
    return res.status(500).json({ message: "Failed to fetch event halls" });
  }
};
