// brics-event-backend/src/controllers/event.controller.js

import fs from "fs";
import path from "path";
import _ from "lodash";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import axios from "axios";
import UserEvent from "../models/UserEvent.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Activity from "../models/Activity.js";
import Role from "../models/Role.js";
import Travel from "../models/Travel.js";
import Ministry from "../models/Ministry.js";
import Organization from "../models/Organization.js";
import { getSignedS3Url, uploadToS3 } from "../config/uploadToS3.js";
import { eventManagerInviteTemplate } from "../template/eventManagerInvite.template.js";
import { sendEmail } from "../config/sendEmail.js";
import { sanitizeHtmlString } from "../data/sanitize.js";

import Hotel from "../models/Hotel.js";
import HotelMaster from "../models/HotelMaster.js";

import capitalizeTitle from "../utils/capitalizeTitle.js";
import formatDate from "../utils/formatDate.js";
import { sendPushNotification } from "../utils/notification.js";


const eventsFilePath = path.join(process.cwd(), "src/data/events.json");

const generateEventCode = async () => {
  let eventCode;
  let exists = true;

  while (exists) {
    eventCode = `EVT-${_.uniqueId()}`;
    const event = await Event.findOne({ event_code: eventCode });
    exists = !_.isNil(event);
  }

  return eventCode;
};

/* =========================================================
   CREATE EVENT (ADMIN)
   =========================================================
   - Protected route
   - Generates unique event_code
   - Stores event details in MongoDB
   ========================================================= */

export const generateRegistrationId = () => {
  return `REG-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
};

export const upsertEvent = async (req, res) => {
  try {
    const { id } = req.body;

    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let event = null;
    let isUpdate = false;

    if (id) {
      event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      isUpdate = true;
    }

    let logoUrl = event?.logo || null;
    if (req.files?.logo?.[0]) {
      logoUrl = await uploadToS3(req.files.logo[0], user.id, "event-logos");
    } else if (req.body.logo_base64) {
      logoUrl = await uploadToS3(req.body.logo_base64, user.id, "event-logos");
    }

    const delegateCount = Number(req.body.delegateCount || event?.delegate_count || 1);
    if (delegateCount < 0) {
      return res.status(400).json({ message: "Delegate count cannot be negative" });
    }

    const payload = {
      name: req.body.name ? sanitizeHtmlString(req.body.name) : event?.name,
      description: req.body.description ? sanitizeHtmlString(req.body.description) : event?.description,
      start_date: req.body.startDate || event?.start_date,
      end_date: req.body.endDate || event?.end_date,
      event_type: req.body.eventMode ? sanitizeHtmlString(req.body.eventMode) : event?.event_type,
      category: req.body.category ? sanitizeHtmlString(req.body.category) : event?.category || "General",
      source_language: req.body.source_language ? sanitizeHtmlString(req.body.source_language) : event?.source_language || "English",
      capacity: req.body.capacity ? sanitizeHtmlString(req.body.capacity) : event?.capacity,
      delegate_count: delegateCount,
      venue: req.body.venue ? sanitizeHtmlString(req.body.venue) : event?.venue,
      location: req.body.location ? sanitizeHtmlString(req.body.location) : event?.location,
      logo: logoUrl,
      meeting_url: req.body.meeting_url ? sanitizeHtmlString(req.body.meeting_url) : event?.meeting_url,
      ministry_name: req.body.ministry ? sanitizeHtmlString(req.body.ministry) : event?.ministry_name,
      organization_id: req.body.organization_id || event?.organization_id || null,
      organization_name: req.body.organization_name ? sanitizeHtmlString(req.body.organization_name) : (event?.organization_name || null),
      status: req.body.status || event?.status || "published"
    };

    if (payload.status === "published" && (!event || event.status === "draft")) {
      payload.published_at = new Date();
    }

    if (payload.organization_name && !payload.organization_id) {
      try {
        const existingOrg = await Organization.findOne({
          organization_name: { $regex: new RegExp(`^${payload.organization_name.trim()}$`, "i") }
        });

        if (existingOrg) {
          payload.organization_id = existingOrg._id;
        } else {
          const _ = await import("lodash");
          const orgCode = `ORG-${_.default.uniqueId()}`;
          const newOrg = await Organization.create({
            organization_code: orgCode,
            organization_name: payload.organization_name.trim(),
            description: "",
            ministry_id: null,
            ministry_name: null,
            is_active: true,
            created_by: user.id
          });
          payload.organization_id = newOrg._id;
        }
      } catch (orgError) {
        console.error("Organization creation error:", orgError);
        payload.organization_id = null;
      }
    }

    if (!isUpdate) {
      const eventCode = await generateEventCode();
      payload.event_code = eventCode;
      payload.created_by = user.id;

      event = await Event.create(payload);
    } else {
      payload.updated_by = user.id;
      event = await Event.findByIdAndUpdate(id, payload, { new: true });
    }

    let managerUserObj = null;

    try {
      const existing = await UserEvent.findOne({
        event_id: event._id,
        role: "EVENT MANAGER",
      });

      if (req.body.manager) {
        const manager = await User.findOne({ id: req.body.manager });
        if (manager) {
          managerUserObj = manager; 

          if (!existing) {
            const duplicateCheck = await UserEvent.findOne({ user_id: manager.id, event_id: event._id });
            
            if(!duplicateCheck) {
              await UserEvent.create({
                registration_id: generateRegistrationId(),
                user_id: manager.id,
                event_id: event._id,
                role: "EVENT MANAGER",
                status: "invited",
                created_by: user.id,
              });
            }
          } else if (existing.user_id !== manager.id) {
            existing.user_id = manager.id;
            existing.status = "invited";
            existing.updated_by = user.id;
            await existing.save();
          }

          sendEmail({
            to: manager.email,
            subject: `Appointment as Event Manager – ${sanitizeHtmlString(event.name)}`,
            html: eventManagerInviteTemplate({
              name: sanitizeHtmlString(manager.name || manager.email),
              eventName: sanitizeHtmlString(event.name),
              start: formatDateTime(event.start_date),
              end: formatDateTime(event.end_date),
              venue: sanitizeHtmlString(event.venue || "Venue to be communicated"),
            }),
          }).catch(e => console.log("Email error: ", e.message));
        }
      } else {
        if (existing) {
          await UserEvent.deleteOne({ _id: existing._id });
        }
      }
    } catch (userEventError) {
      console.warn("⚠️ Warning: Event Manager assign karte waqt choti error aayi, par Event Create/Update ho chuka hai.", userEventError.message);
    }

    if (user && user.fcm_token) {
      try {
        const notifTitle = isUpdate ? "Event Updated" : "Event Created";
        const notifBody = isUpdate 
          ? `Event "${event.name}" details updated successfully.` 
          : `New event "${event.name}" created successfully.`;

        await sendPushNotification(user.fcm_token, notifTitle, notifBody);
        console.log(`✅ Push sent to Creator (${user.email})`);
      } catch (err) {
        console.error("❌ Push Failed for Creator:", err.message);
      }
    }

    if (managerUserObj && managerUserObj.fcm_token) {
      try {
        const notifTitle = isUpdate ? "Event Assigned Updated" : "New Event Assigned";
        const notifBody = isUpdate 
          ? `Details for your assigned event "${event.name}" have been updated.` 
          : `You have been assigned as Event Manager for "${event.name}".`;

        await sendPushNotification(managerUserObj.fcm_token, notifTitle, notifBody);
        console.log(`✅ Push sent to Manager (${managerUserObj.email})`);
      } catch (err) {
        console.error("❌ Push Failed for Manager:", err.message);
      }
    }

    await Activity.logActivity({
      activityType: isUpdate ? "EVENT_UPDATE" : "EVENT_CREATE",
      description: isUpdate ? `Updated event: ${event.name}` : `Created new event: ${event.name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "EVENT",
      resourceId: event._id,
      metadata: { eventName: event.name, eventCode: event.event_code },
    });

    return res.status(isUpdate ? 200 : 201).json({
      mode: isUpdate ? "updated" : "created",
      event,
    });
  } catch (error) {
    console.error("Upsert Event Error:", error);
    return res.status(500).json({
      message: "Event save failed",
      error: error.message,
    });
  }
};

const formatTimeAMPM = (time24) => {
  if (!time24) return "";

  const [hour, minute] = time24.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
};

const formatDateTime = (date, time) => {
  if (!date) return "";

  const d = new Date(date);

  // If time is not provided, just format the date
  if (!time) {
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const [hour, minute] = time.split(":").map(Number);
  d.setHours(hour, minute);

  const datePart = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `${datePart}, ${formatTimeAMPM(time)}`;
};

/* =========================================================
   GET EVENTS (PUBLIC / ADMIN DASHBOARD)
   =========================================================
   - Aggregates event list
   - Calculates invited delegate count
   - Sorted by start_date (latest first)
   - Supports filtering by organization_id
   ========================================================= */
export const getEvents = async (req, res) => {
  try {
    const { organization_id, status } = req.query;

    // Build match stage for aggregation
    const matchStage = {};
    if (organization_id) {
      if (!mongoose.Types.ObjectId.isValid(organization_id)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }
      matchStage.organization_id = new mongoose.Types.ObjectId(organization_id);
    }

    // Filter by status (draft or published)
    // If status is provided, filter by it. Otherwise show all events.
    if (status) {
      if (!["draft", "published"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'draft' or 'published'" });
      }
      matchStage.status = status;
    }
    // Note: If no status parameter is provided, all events (both draft and published) will be shown

    // Fetch all events with basic aggregation
    const events = await Event.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $addFields: {
          event_id_str: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: "userevents",
          localField: "event_id_str",
          foreignField: "event_id",
          as: "user_events",
        },
      },
      {
        $addFields: {
          total_invite_count: {
            $size: {
              $filter: {
                input: "$user_events",
                as: "ue",
                cond: { $eq: ["$$ue.status", "invited"] },
              },
            },
          },
        },
      },
      { $sort: { created_at: -1 } },
    ]);

    // Get all user IDs from all events
    const allUserIds = new Set();
    events.forEach((event) => {
      event.user_events.forEach((ue) => {
        if (ue.user_id) allUserIds.add(ue.user_id);
      });
    });

    // Fetch users with their roles
    const users = await User.find({ id: { $in: Array.from(allUserIds) } });
    const roleIds = [...new Set(users.map((u) => u.role_id).filter(Boolean))];
    const roles = await Role.find({ id: { $in: roleIds } });

    // Create a map of user_id -> role_name
    const userRoleMap = {};
    users.forEach((user) => {
      const role = roles.find((r) => r.id === user.role_id);
      userRoleMap[user.id] = role?.name || null;
    });

    // Calculate counts for each event
    const enrichedEvents = events.map((event) => {
      const eventIdStr = event.event_id_str || event._id.toString();

      let daoCount = 0;
      let delegateCount = 0;

      /* ===== ADD MANAGER VARIABLE ===== */
      let manager = null;

      event.user_events.forEach((ue) => {
        if (ue.status === "cancelled") return;

        const userSystemRole = userRoleMap[ue.user_id];

        if (userSystemRole === "DAO") {
          daoCount++;
        } else if (
          userSystemRole === "DELEGATE" ||
          userSystemRole === "HEAD OF DELEGATE" ||
          userSystemRole === "SECURITY OFFICER" ||
          userSystemRole === "INTERPRETER" ||
          userSystemRole === "MEDIA" ||
          userSystemRole === "DEPUTY" ||
          userSystemRole === "DELEGATION CONTACT OFFICER" ||
          userSystemRole === "SPEAKER"
        ) {

          delegateCount++;

        }

        /* ===== ADD MANAGER LOGIC ===== */

        if (ue.role === "EVENT MANAGER") {

          const managerUser = users.find(
            (u) => u.id === ue.user_id
          );

          if (managerUser) {

            manager = {
              manager_id: managerUser.id,
              manager_name: managerUser.name,
              manager_email: managerUser.email,
              ministry_name: managerUser.ministry_name || event.ministry_name,
            };

          }

        }

      });

      const result = { ...event };

      delete result.user_events;
      delete result.event_id_str;

      result.dao_invite_count = daoCount;
      result.delegate_invite_count = delegateCount;

      /* ===== ADD MANAGER TO RESULT ===== */

      result.manager_id = manager?.manager_id || null;
      result.manager_name = manager?.manager_name || null;
      result.manager_email = manager?.manager_email || null;
      result.ministry_name = manager?.ministry_name || null;
      
      /* ===== ADD STATUS FLAGS ===== */
      result.status = event.status || "published";
      result.is_draft = event.status === "draft";
      result.is_published = event.status === "published";
      result.published_at = event.published_at || null;

      return result;

    });

    // Sign S3 URLs for logos
    for (const event of enrichedEvents) {

      if (event.logo) {

        event.logo = await getSignedS3Url(event.logo);

      }

    }

    return res.json(enrichedEvents);

  } catch (error) {

    console.error("getEvents error:", error);

    return res.status(500).json({
      message: "Failed to fetch events",
    });

  }
};

/* =========================================================
   GET PUBLIC EVENTS (FROM JSON FILE)
   =========================================================
   - Reads events from local JSON
   - Returns only active events
   ========================================================= */
export const getPublicEvents = async (req, res) => {
  try {
    const fileData = fs.readFileSync(eventsFilePath, "utf-8");
    const events = JSON.parse(fileData);

    const activeEvents = events.filter((event) => event.is_active === true);

    res.json(activeEvents);
  } catch (error) {
    res.status(500).json({
      message: "Unable to load events",
      error: error.message,
    });
  }
};

/* =========================================================
   ADD USER EVENT (ATTEND / REGISTER EVENT)
   =========================================================
   - Logged-in user registers for an event
   - Prevents duplicate registrations
   - Generates unique registration_id
   ========================================================= */
export const addUserEvent = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    let { event_id, role } = req.body;

    /* ---------- Validation ---------- */
    if (!event_id) {
      return res.status(400).json({
        message: "event_id is required",
      });
    }

    const safeRole = sanitizeHtmlString(role || "DELEGATE");

    /* ---------- Check Event ---------- */
    const event = await Event.findOne({ _id: event_id, is_active: true });

    if (!event) {
      return res.status(404).json({
        message: "Event not found or inactive",
      });
    }

    if (!event.registration_open) {
      return res.status(400).json({
        message: "Registration is closed for this event",
      });
    }

    /* ---------- Check Existing UserEvent ---------- */
    let userEvent = await UserEvent.findOne({
      user_id,
      event_id,
    });

    /* ---------- If UserEvent Exists ---------- */
    if (userEvent) {
      if (userEvent.attended === true) {
        return res.status(200).json({
          message: "User already attended the event",
          registration_id: userEvent.registration_id,
          data: userEvent,
        });
      }

      userEvent.status = "confirmed";
      userEvent.attended = true;
      userEvent.check_in_time = new Date();
      userEvent.role = safeRole || userEvent.role || "DELEGATE";

      await userEvent.save();

      return res.status(200).json({
        message: "User accreditation recorded successfully",
        registration_id: userEvent.registration_id,
        data: userEvent,
      });
    }

    /* ---------- Generate Registration ID ---------- */
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);

    const registration_id = `ADS${year}${month}${random}`;

    /* ---------- Create UserEvent (Direct Attend) ---------- */
    userEvent = await UserEvent.create({
      user_id,
      event_id,
      registration_id,
      role: safeRole || "DELEGATE",
      status: "confirmed",
      attended: true,
      check_in_time: new Date(),
      created_by: req.user.user_id,
    });

    await Activity.logActivity({
      activityType: "EVENT_VIEW",
      description: `User registered for event`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "EVENT",
      resourceId: event_id,
    });

    return res.status(201).json({
      message: "Event registered and attended successfully",
      registration_id,
      data: userEvent,
    });
  } catch (err) {
    console.error("addUserEvent error:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* =========================================================
   GET EVENTS FOR LOGGED-IN USER
   =========================================================
   - Returns events user is registered/invited to
   - Includes total delegate count per event
   ========================================================= */
export const getUserEvents = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    /* ===============================
       GET USER ROLE
    =============================== */
    const user = await User.findOne({ id: user_id });
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = await Role.findOne({ id: user.role_id });
    if (!role) {
      return res.status(403).json({ message: "Role not found" });
    }

    const loginRole = role.name;

    /* ===============================
       BUILD MATCH STAGE (SUPER ADMIN sees all)
    =============================== */
    const matchStage = loginRole === "SUPER ADMIN" ? {} : { user_id };

    /* ===============================
       BUILD DAO CONDITION
    =============================== */
    const delegateFilterCond =
      loginRole === "DAO"
        ? {
            $and: [
              {
                $in: [
                  "$$ue.role",
                  [
                    "DELEGATE",
                    "HEAD OF DELEGATE",
                    "SECURITY OFFICER",
                    "INTERPRETER",
                    "MEDIA",
                    "DEPUTY",
                    "DELEGATION CONTACT OFFICER",
                    "SPEAKER",
                  ],
                ],
              },
              {
                $or: [
                  {
                    // Delegates created by DAO (any non-cancelled)
                    $and: [
                      { $eq: ["$$ue.created_by", user_id] },
                      { $ne: ["$$ue.status", "cancelled"] },
                    ],
                  },
                  {
                    // DAO himself (only if confirmed)
                    $and: [
                      { $eq: ["$$ue.user_id", user_id] },
                      { $eq: ["$$ue.status", "confirmed"] },
                    ],
                  },
                ],
              },
            ],
          }
        : {
            $and: [
              {
                $in: [
                  "$$ue.role",
                  [
                    "DELEGATE",
                    "HEAD OF DELEGATE",
                    "SECURITY OFFICER",
                    "INTERPRETER",
                    "MEDIA",
                    "DEPUTY",
                    "DELEGATION CONTACT OFFICER",
                    "SPEAKER",
                  ],
                ],
              },
              { $ne: ["$$ue.status", "cancelled"] },
            ],
          };

    /* ===============================
       AGGREGATION
    =============================== */
    let events = await UserEvent.aggregate([
      { $match: matchStage },

      { $addFields: { eventObjectId: { $toObjectId: "$event_id" } } },
      {
        $lookup: {
          from: "events",
          localField: "eventObjectId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $lookup: {
          from: "userevents",
          localField: "event_id",
          foreignField: "event_id",
          as: "all_user_events",
        },
      },
      {
        $addFields: {
          total_delegates: {
            $size: {
              $filter: {
                input: "$all_user_events",
                as: "ue",
                cond: delegateFilterCond,
              },
            },
          },
        },
      },
      /* ===============================
         GROUP BY EVENT_ID TO REMOVE DUPLICATES
      =============================== */
      {
        $group: {
          _id: "$event_id",
          user_event_id: { $first: { $toString: "$_id" } },
          event_id: { $first: "$event_id" },
          event_code: { $first: "$event.event_code" },
          name: { $first: "$event.name" },
          description: { $first: "$event.description" },
          start_date: { $first: "$event.start_date" },
          end_date: { $first: "$event.end_date" },
          start_time: { $first: "$event.start_time" },
          end_time: { $first: "$event.end_time" },
          location: { $first: "$event.location" },
          venue: { $first: "$event.venue" },
          logo: { $first: "$event.logo" },
          category: { $first: "$event.category" },
          event_type: { $first: "$event.event_type" },
          registration_open: { $first: "$event.registration_open" },
          delegate_count: { $first: "$event.delegate_count" },
          registration_id: { $first: "$registration_id" },
          role: { $first: "$role" },
          status: { $first: "$status" },
          attended: { $first: "$attended" },
          registered_at: { $first: "$createdAt" },
          total_delegates: { $first: "$total_delegates" },
          meeting_url: { $first: "$event.meeting_url" },
        },
      },
      {
        $project: {
          _id: 0,
          user_event_id: 1,
          event_id: 1,
          event_code: 1,
          name: 1,
          description: 1,
          start_date: 1,
          end_date: 1,
          start_time: 1,
          end_time: 1,
          location: 1,
          venue: 1,
          logo: 1,
          category: 1,
          event_type: 1,
          registration_open: 1,
          delegate_count: 1,
          registration_id: 1,
          role: 1,
          status: 1,
          attended: 1,
          registered_at: 1,
          meeting_url: 1,
          total_delegates: 1,
        },
      },
      { $sort: { start_date: -1 } },
    ]);

    /* ===============================
       SIGN S3 LOGOS & ADD USER PARTICIPATION FLAG
    =============================== */
    events = await Promise.all(
      events.map(async (event) => {
        if (event.logo) {
          event.logo = await getSignedS3Url(event.logo);
        }

        // Check if calling user is DELEGATE in this event
        const userParticipation = await UserEvent.findOne({
          user_id: user_id,
          event_id: event.event_id,
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
          status: { $ne: "cancelled" },
        });

        event.is_user_delegate = !!userParticipation;

        return event;
      }),
    );

    return res.json(events);
  } catch (err) {
    console.error("getUserEvents error:", err);
    return res.status(500).json({
      message: "Failed to fetch user events",
    });
  }
};

/* =========================================================
   GET USERS OF A SPECIFIC EVENT
   =========================================================
   - Lists all users registered/invited to event
   ========================================================= */

export const calculateProfileCompletion = (user) => {
  let completed = 0;
  let totalFields = 0;

  // ===== CORE INFO ===== (3)
  totalFields += 3;
  if (user.first_name) completed++;
  if (user.last_name) completed++;
  if (user.email) completed++;

  // ===== PERSONAL INFO ===== (2)
  totalFields += 2;
  if (user.title) completed++;
  if (user.gender) completed++;

  // ===== CONTACT INFO ===== (2)
  totalFields += 2;
  if (user.mobile) completed++;
  if (user.country) completed++;

  // ===== PASSPORT INFO ===== (3) → only if NOT India
  const isIndia = user.country?.toLowerCase() === "india";

  if (!isIndia) {
    totalFields += 4;
    if (user.passport?.passport_number) completed++;
    if (user.passport?.place_of_issue) completed++;
    if (user.passport?.expiry_date) completed++;
    if (user.documents?.passport_document_url) completed++;
  }

  // ===== DOCUMENTS ===== (2)
  totalFields += 1;
  if (user.documents?.photo_url) completed++;

  const percentage = Math.round((completed / totalFields) * 100);

  return {
    completed_fields: completed,
    total_fields: totalFields,
    percentage,
  };
};

export const getEventUsers = async (req, res) => {
  try {
    const { eventId } = req.params;
    const authUserId = req.user.user_id;

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    /* ===============================
       AUTH USER + ROLE
    =============================== */
    const authUser = await User.findOne({ id: authUserId });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!authRole) {
      return res.status(403).json({ message: "Role not found" });
    }

    const loginRole = authRole.name;
    // SUPER ADMIN | EVENT MANAGER | DAO | HEAD OF DELEGATE | DELEGATE | SECURITY OFFICER | INTERPRETER | MEDIA | DEPUTY | DELEGATION CONTACT OFFICER | SPEAKER

    /* ===============================
       Check user is part of event
    =============================== */
    const requesterEvent = await UserEvent.findOne({
      event_id: eventId,
      user_id: authUserId,
    });

    if (!requesterEvent && loginRole !== "SUPER ADMIN") {
      return res.status(403).json({
        message: "You are not part of this event",
      });
    }

    /* ===============================
       ROLE BASED VISIBILITY
    =============================== */
    const matchStage = { event_id: eventId };

    if (loginRole === "DAO") {
      matchStage.role = {
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
      };
      matchStage.$or = [
        {
          created_by: authUserId,
          status: { $ne: "cancelled" }, // delegates created by DAO
        },
        {
          user_id: authUserId,
          status: "confirmed", // DAO himself only if confirmed
        },
      ];
    }

    if (
      loginRole === "DELEGATE" ||
      loginRole === "HEAD OF DELEGATE" ||
      loginRole === "SECURITY OFFICER" ||
      loginRole === "INTERPRETER" ||
      loginRole === "MEDIA" ||
      loginRole === "DEPUTY" ||
      loginRole === "DELEGATION CONTACT OFFICER" ||
      loginRole === "SPEAKER"
    ) {
      return res.json([]);
    }

    // SUPER ADMIN & EVENT MANAGER -> no filter

    /* ===============================
       Fetch user events
    =============================== */
    const userEvents = await UserEvent.find(matchStage);
    if (!userEvents.length) return res.json([]);

    const userIds = userEvents.map((ue) => ue.user_id);

    const users = await User.find({
      id: { $in: userIds },
    });

    const event = await Event.findById(eventId);

    /* ===============================
       Build response
    =============================== */
    const response = await Promise.all(
      userEvents.map(async (ue) => {
        const user = users.find((u) => u.id === ue.user_id);
        const profileProgress = calculateProfileCompletion(user);

        let eventDetails = null;
        if (event) {
          eventDetails = event.toObject();
          eventDetails.user_event_id = ue._id.toString();
          if (event.logo) {
            try {
              eventDetails.logo = await getSignedS3Url(event.logo);
            } catch {}
          }
        }

        let userDetails = null;
        if (user) {
          userDetails = user.toObject();
          if (user.profile_picture) {
            try {
              userDetails.profile_picture = await getSignedS3Url(
                user.profile_picture,
              );
            } catch {}
          }
          if (user.id_proof) {
            try {
              userDetails.id_proof = await getSignedS3Url(user.id_proof);
            } catch {}
          }
          if (userDetails.documents?.photo_url) {
            try {
              userDetails.documents.photo_url = await getSignedS3Url(
                userDetails.documents.photo_url,
              );
            } catch {}
          }
          if (userDetails.documents?.passport_document_url) {
            try {
              userDetails.documents.passport_document_url =
                await getSignedS3Url(
                  userDetails.documents.passport_document_url,
                );
            } catch {}
          }
        }

        return {
          user_event_id: ue._id.toString(),
          user_id: ue.user_id,
          registration_id: ue.registration_id,
          role: ue.role,
          status: ue.status,
          registered_at: ue.createdAt,
          attended: ue.attended,

          name: user?.name || null,
          email: user?.email || null,
          first_name: user?.first_name || null,
          middle_name: user?.middle_name || null,
          last_name: user?.last_name || null,
          role_id: user?.role_id || null,
          profile_completion: profileProgress,

          user: userDetails,
          event: eventDetails,
        };
      }),
    );

    return res.json(response);
  } catch (error) {
    console.error("getEventUsers error:", error);
    return res.status(500).json({
      message: "Failed to fetch event users",
    });
  }
};

/* =========================================================
   GET DELEGATES WITH INVITERS (FLAT STRUCTURE)
   =========================================================
   - Returns managers with DAOs they created
   - Returns DAOs with Delegates they invited
   - Same flat structure for easy filtering
   - Role-based filtering:
     * SUPER ADMIN → sees all managers, DAOs, delegates
     * EVENT MANAGER → sees only themselves + their DAOs + their delegates
     * DAO → sees only themselves + their delegates
     * DELEGATE → sees only themselves
   ========================================================= */
export const getDelegatesWithInviters = async (req, res) => {
  try {
    const { eventId } = req.params;
    const authUserId = req.user.user_id;

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    /* ===============================
       GET AUTHENTICATED USER INFO
    =============================== */
    const authUser = await User.findOne({ id: authUserId });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authUserRole = await Role.findOne({ id: authUser.role_id });
    const systemRole = authUserRole?.name || null;

    const authUserEvent = await UserEvent.findOne({
      event_id: eventId,
      user_id: authUserId,
    });

    const eventRole = authUserEvent?.role || null;

    /* ===============================
       Fetch ALL EVENT_MANAGERs (BASED ON USER TABLE ROLE)
    =============================== */
    const allUserEvents = await UserEvent.find({ event_id: eventId });
    const allUserIds = [...new Set(allUserEvents.map((ue) => ue.user_id))];

    const users = await User.find({ id: { $in: allUserIds } });
    const roleIds = [...new Set(users.map((u) => u.role_id).filter(Boolean))];
    const roles = await Role.find({ id: { $in: roleIds } });

    // Map users to their system roles
    const usersWithRoles = users.map((user) => {
      const role = roles.find((r) => r.id === user.role_id);
      return {
        ...user.toObject(),
        system_role_name: role?.name || null,
      };
    });

    // Group UserEvents by user's SYSTEM role
    let allManagers = allUserEvents.filter((ue) => {
      const user = usersWithRoles.find((u) => u.id === ue.user_id);
      return user?.system_role_name === "EVENT MANAGER";
    });

    let allDaos = allUserEvents.filter((ue) => {
      const user = usersWithRoles.find((u) => u.id === ue.user_id);
      return user?.system_role_name === "DAO";
    });

    let allDelegates = allUserEvents.filter((ue) => {
      const user = usersWithRoles.find((u) => u.id === ue.user_id);
      return (
        user?.system_role_name === "DELEGATE" ||
        user?.system_role_name === "HEAD OF DELEGATE" ||
        user?.system_role_name === "SECURITY OFFICER" ||
        user?.system_role_name === "INTERPRETER" ||
        user?.system_role_name === "MEDIA" ||
        user?.system_role_name === "DEPUTY" ||
        user?.system_role_name === "DELEGATION CONTACT OFFICER" ||
        user?.system_role_name === "SPEAKER"
      );
    });

    /* ===============================
       ROLE-BASED FILTERING
    =============================== */
    if (systemRole !== "SUPER ADMIN") {
      if (eventRole === "EVENT MANAGER" || systemRole === "EVENT MANAGER") {
        // Manager sees: all DAOs and all their delegates (same as SUPER ADMIN)
        // No filtering applied - show everything
      } else if (systemRole === "DAO") {
        // DAO sees: only themselves + delegates they created
        // System role takes priority over event role
        allManagers = []; // DAOs don't see managers
        allDaos = allDaos.filter((d) => d.user_id === authUserId);
        allDelegates = allDelegates.filter(
          (del) => del.created_by === authUserId,
        );
      } else if (
        systemRole === "DELEGATE" ||
        systemRole === "HEAD OF DELEGATE" ||
        systemRole === "SECURITY OFFICER" ||
        systemRole === "INTERPRETER" ||
        systemRole === "MEDIA" ||
        systemRole === "DEPUTY" ||
        systemRole === "DELEGATION CONTACT OFFICER" ||
        systemRole === "SPEAKER"
      ) {
        // Delegates see nothing (or only themselves)
        // System role takes priority - if they're a delegate in system, show nothing
        allManagers = [];
        allDaos = [];
        allDelegates = [];
      }
    }

    // Get unique user IDs
    const managerUserIds = allManagers.map((m) => m.user_id);
    const daoUserIds = allDaos.map((d) => d.user_id);
    const delegateUserIds = allDelegates.map((d) => d.user_id);

    const event = await Event.findById(eventId);

    const response = [];

    /* ===============================
       MANAGERS WITH THEIR DAOs
    =============================== */
    const managersWithDaos = await Promise.all(
      allManagers.map(async (managerRecord) => {
        const managerUserId = managerRecord.user_id;
        const managerUser = usersWithRoles.find((u) => u.id === managerUserId);
        const managerRole = managerUser
          ? roles.find((r) => r.id === managerUser.role_id)
          : null;

        let managerDetails = null;
        if (managerUser) {
          managerDetails = { ...managerUser };

          if (managerDetails.documents?.photo_url) {
            try {
              managerDetails.documents.photo_url = await getSignedS3Url(
                managerDetails.documents.photo_url,
              );
            } catch {}
          }
          if (managerDetails.documents?.passport_document_url) {
            try {
              managerDetails.documents.passport_document_url =
                await getSignedS3Url(
                  managerDetails.documents.passport_document_url,
                );
            } catch {}
          }
          if (managerUser.profile_picture) {
            try {
              managerDetails.profile_picture = await getSignedS3Url(
                managerUser.profile_picture,
              );
            } catch {}
          }
          if (managerUser.id_proof) {
            try {
              managerDetails.id_proof = await getSignedS3Url(
                managerUser.id_proof,
              );
            } catch {}
          }
        }

        // Return managers without delegates - DAOs are shown separately below
        const daosData = [];

        let eventDetails = null;
        if (event) {
          eventDetails = event.toObject();
          if (event.logo) {
            try {
              eventDetails.logo = await getSignedS3Url(event.logo);
            } catch {}
          }
        }

        return {
          dao: {
            user_event_id: managerRecord._id.toString(),
            dao_id: managerUserId,
            name: managerUser?.name || null,
            email: managerUser?.email || null,
            first_name: managerUser?.first_name || null,
            middle_name: managerUser?.middle_name || null,
            last_name: managerUser?.last_name || null,
            role_id: managerUser?.role_id || null,
            role_name: managerRole?.name || null,
            profile_completion: calculateProfileCompletion(managerUser),
            user: managerDetails,
          },
          delegates: daosData,
          delegates_count: daosData.length,
          event: eventDetails,
        };
      }),
    );

    response.push(...managersWithDaos);

    /* ===============================
       DAOs WITH THEIR DELEGATES
    =============================== */
    const daosWithDelegates = await Promise.all(
      allDaos.map(async (daoRecord) => {
        const daoUserId = daoRecord.user_id;
        const daoUser = usersWithRoles.find((u) => u.id === daoUserId);
        const daoRole = daoUser
          ? roles.find((r) => r.id === daoUser.role_id)
          : null;

        let daoDetails = null;
        if (daoUser) {
          daoDetails = { ...daoUser };

          if (daoDetails.documents?.photo_url) {
            try {
              daoDetails.documents.photo_url = await getSignedS3Url(
                daoDetails.documents.photo_url,
              );
            } catch {}
          }
          if (daoDetails.documents?.passport_document_url) {
            try {
              daoDetails.documents.passport_document_url = await getSignedS3Url(
                daoDetails.documents.passport_document_url,
              );
            } catch {}
          }
          if (daoUser.profile_picture) {
            try {
              daoDetails.profile_picture = await getSignedS3Url(
                daoUser.profile_picture,
              );
            } catch {}
          }
          if (daoUser.id_proof) {
            try {
              daoDetails.id_proof = await getSignedS3Url(daoUser.id_proof);
            } catch {}
          }
        }

        // Get delegates invited by this DAO
        const delegatesByThisDao = allDelegates.filter(
          (d) => d.created_by === daoUserId,
        );

        // Build delegates array
        const delegatesData = await Promise.all(
          delegatesByThisDao.map(async (delegate) => {
            const delegateUser = usersWithRoles.find(
              (u) => u.id === delegate.user_id,
            );
            const delegateRole = delegateUser
              ? roles.find((r) => r.id === delegateUser.role_id)
              : null;
            const delegateProfileProgress =
              calculateProfileCompletion(delegateUser);

            let delegateDetails = null;
            if (delegateUser) {
              delegateDetails = { ...delegateUser };

              if (delegateDetails.documents?.photo_url) {
                try {
                  delegateDetails.documents.photo_url = await getSignedS3Url(
                    delegateDetails.documents.photo_url,
                  );
                } catch {}
              }
              if (delegateDetails.documents?.passport_document_url) {
                try {
                  delegateDetails.documents.passport_document_url =
                    await getSignedS3Url(
                      delegateDetails.documents.passport_document_url,
                    );
                } catch {}
              }
              if (delegateUser.profile_picture) {
                try {
                  delegateDetails.profile_picture = await getSignedS3Url(
                    delegateUser.profile_picture,
                  );
                } catch {}
              }
            }

            return {
              user_event_id: delegate._id.toString(),
              user_id: delegate.user_id,
              registration_id: delegate.registration_id,
              role: delegate.role,
              status: delegate.status,
              registered_at: delegate.createdAt,
              attended: delegate.attended,
              name: delegateUser?.name || null,
              email: delegateUser?.email || null,
              first_name: delegateUser?.first_name || null,
              middle_name: delegateUser?.middle_name || null,
              last_name: delegateUser?.last_name || null,
              role_id: delegateUser?.role_id || null,
              role_name: delegateRole?.name || null,
              profile_completion: delegateProfileProgress,
              user: delegateDetails,
            };
          }),
        );

        let eventDetails = null;
        if (event) {
          eventDetails = event.toObject();
          if (event.logo) {
            try {
              eventDetails.logo = await getSignedS3Url(event.logo);
            } catch {}
          }
        }

        return {
          dao: {
            user_event_id: daoRecord._id.toString(),
            dao_id: daoUserId,
            name: daoUser?.name || null,
            email: daoUser?.email || null,
            first_name: daoUser?.first_name || null,
            middle_name: daoUser?.middle_name || null,
            last_name: daoUser?.last_name || null,
            role_id: daoUser?.role_id || null,
            role_name: daoRole?.name || null,
            profile_completion: calculateProfileCompletion(daoUser),
            user: daoDetails,
          },
          delegates: delegatesData,
          delegates_count: delegatesData.length,
          event: eventDetails,
        };
      }),
    );

    response.push(...daosWithDelegates);

    return res.json(response);
  } catch (error) {
    console.error("getDelegatesWithInviters error:", error);
    return res.status(500).json({
      message: "Failed to fetch delegates with inviters",
    });
  }
};

export const getAllUserEvents = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    if (!user_id) {
      return res.status(401).json({
        message: "Invalid token or user not authenticated",
      });
    }

    /* ===============================
       BASE MATCH: USER ONLY
    =============================== */
    const matchStage = {
      user_id,
    };

    const events = await UserEvent.aggregate([
      { $match: matchStage },

      /* Convert event_id (string) to ObjectId */
      {
        $addFields: {
          eventObjectId: { $toObjectId: "$event_id" },
        },
      },

      /* Join events collection */
      {
        $lookup: {
          from: "events",
          localField: "eventObjectId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },

      /* Fetch all user-event records for delegate count */
      {
        $lookup: {
          from: "userevents",
          localField: "event_id",
          foreignField: "event_id",
          as: "all_user_events",
        },
      },

      /* Count only active delegates */
      {
        $addFields: {
          total_delegates: {
            $size: {
              $filter: {
                input: "$all_user_events",
                as: "ue",
                cond: {
                  $and: [
                    { $eq: ["$$ue.role", "DELEGATE"] },
                    { $ne: ["$$ue.status", "cancelled"] },
                  ],
                },
              },
            },
          },
        },
      },

      /* Final response */
      {
        $project: {
          _id: 0,
          user_event_id: { $toString: "$_id" },
          event_id: "$event_id",
          event_code: "$event.event_code",
          name: "$event.name",
          description: "$event.description",
          category: "$event.category",
          venue: "$event.venue",
          location: "$event.location",
          start_date: "$event.start_date",
          end_date: "$event.end_date",
          start_time: "$event.start_time",
          end_time: "$event.end_time",
          event_type: "$event.event_type",
          registration_open: "$event.registration_open",
          delegate_count: "$event.delegate_count",
          registration_id: "$registration_id",
          role: "$role", // kept only as info
          status: "$status",
          attended: "$attended",
          registered_at: "$createdAt",
          total_delegates: 1,
        },
      },

      { $sort: { start_date: -1 } },
    ]);

    return res.json(events);
  } catch (err) {
    console.error("getAllUserEvents error:", err);
    return res.status(500).json({
      message: "Failed to fetch user events",
    });
  }
};

/* =========================================================
   GET ALL EVENT MANAGERS WHO HAVE EVENTS
   =========================================================
   - SUPER ADMIN only
   - Fetch managers from userevents
   - Count distinct events per manager
   ========================================================= */
export const getEventManagersWithEvents = async (req, res) => {
  try {
    const adminUser = await User.findOne({ id: req.user.user_id });
    const adminRole = await Role.findOne({ id: adminUser.role_id });

    if (adminRole.name !== "SUPER ADMIN") {
      return res.status(403).json({
        message: "Access denied. Super Admin only.",
      });
    }

    // Determine if pagination requested. If not, keep legacy response (array)
    const paginationRequested =
      Object.prototype.hasOwnProperty.call(req.query, "page") ||
      Object.prototype.hasOwnProperty.call(req.query, "limit");

    // When pagination is requested, parse params
    const page = paginationRequested
      ? Math.max(1, parseInt(req.query.page) || 1)
      : null;
    const limit = paginationRequested
      ? Math.max(1, parseInt(req.query.limit) || 20)
      : null;
    const skip = paginationRequested ? (page - 1) * limit : null;

    const basePipeline = [
      // Join with roles
      {
        $lookup: {
          from: "roles",
          localField: "role_id",
          foreignField: "id",
          as: "role",
        },
      },
      { $unwind: "$role" },

      // Filter event managers
      { $match: { "role.name": "EVENT MANAGER" } },

      // Join with UserEvent
      {
        $lookup: {
          from: "userevents",
          localField: "id",
          foreignField: "user_id",
          as: "user_events",
        },
      },

      {
        $addFields: {
          events_count: { $size: "$user_events" },
        },
      },
    ];
    // If pagination is NOT requested, return legacy array response
    if (!paginationRequested) {
      const legacyPipeline = [
        ...basePipeline,
        {
          $project: {
            _id: 0,
            manager_id: "$id",
            name: 1,
            email: 1,
            ministry_name: 1,
            organization_id: 1,
            organization_name: 1,
            events_count: 1,
            created_at: "$createdAt",
          },
        },
        { $sort: { created_at: -1 } },
      ];

      const managers = await User.aggregate(legacyPipeline);
      return res.json(managers);
    }

    // Get total count for pagination
    const countPipeline = [...basePipeline, { $count: "total" }];
    const countResult = await User.aggregate(countPipeline);
    const total = (countResult[0] && countResult[0].total) || 0;

    // Fetch paginated results
    const managersPipeline = [
      ...basePipeline,
      {
        $project: {
          _id: 0,
          manager_id: "$id",
          name: 1,
          email: 1,
          ministry_name: 1,
          organization_id: 1,
          organization_name: 1,
          events_count: 1,
          created_at: "$createdAt",
        },
      },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const managers = await User.aggregate(managersPipeline);

    return res.json({
      success: true,
      total,
      page,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
      managers,
    });
  } catch (error) {
    console.error("getEventManagersWithEvents error:", error);
    return res.status(500).json({
      message: "Failed to fetch event managers",
    });
  }
};

/* =========================================================
   ADD EVENT MANAGER
   ========================================================= */
export const addEventManager = async (req, res) => {
  try {
    /* ===============================
       SUPER ADMIN CHECK
    =============================== */
    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!authRole || authRole.name !== "SUPER ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    let {
      name,
      first_name,
      last_name,
      email,
      ministry_name,
      organization_name,
      organization_id,
      event_id,
      location,
    } = req.body;

    /* ===============================
       VALIDATION
    =============================== */
    if (!first_name || !email) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const safeFirstName = sanitizeHtmlString(first_name.trim());
    const safeLastName = sanitizeHtmlString(last_name ? last_name.trim() : "");
    const safeName = sanitizeHtmlString(
      name
        ? name.trim()
        : [safeFirstName, safeLastName].filter(Boolean).join(" "),
    );
    const safeMinistry = sanitizeHtmlString(ministry_name || "");
    const safeLocation = sanitizeHtmlString(location || "");
    const safeOrgName = sanitizeHtmlString(organization_name || "");

    /* ===============================
       ORGANIZATION HANDLING
    =============================== */
    let finalOrgId = organization_id || null;
    let finalOrgName = safeOrgName || null;
    let linkedMinistry = safeMinistry; // Start with provided ministry

    if (safeOrgName && !organization_id) {
      try {
        // Check if organization exists
        const existingOrg = await Organization.findOne({
          organization_name: { $regex: new RegExp(`^${safeOrgName.trim()}$`, "i") }
        });

        if (existingOrg) {
          finalOrgId = existingOrg._id;
          finalOrgName = existingOrg.organization_name;
          // If organization has a linked ministry and no ministry provided, use it
          if (existingOrg.ministry_name && !safeMinistry) {
            linkedMinistry = existingOrg.ministry_name;
          }
        } else {
          // Create new organization
          const _ = await import("lodash");
          const orgCode = `ORG-${_.default.uniqueId()}`;
          
          const newOrg = await Organization.create({
            organization_code: orgCode,
            organization_name: safeOrgName.trim(),
            description: "",
            ministry_id: null,
            ministry_name: null,
            is_active: true,
            created_by: req.user.user_id
          });

          finalOrgId = newOrg._id;
          finalOrgName = newOrg.organization_name;
        }
      } catch (orgError) {
        console.error("Organization handling error:", orgError);
        // Continue without organization if handling fails
        finalOrgId = null;
        finalOrgName = null;
      }
    } else if (organization_id) {
      try {
        const org = await Organization.findOne({ id: organization_id });
        if (org) {
          finalOrgId = org._id;
          finalOrgName = org.organization_name;
          // If organization has a linked ministry and no ministry provided, use it
          if (org.ministry_name && !safeMinistry) {
            linkedMinistry = org.ministry_name;
          }
        }
      } catch (orgError) {
        console.error("Organization lookup error:", orgError);
      }
    }

    /* ===============================
       ROLE POWER
    =============================== */
    const ROLE_POWER = {
      "SUPER ADMIN": 4,
      "EVENT MANAGER": 3,
      DAO: 2,
      "HEAD OF DELEGATE": 1,
      DELEGATE: 0,
      "SECURITY OFFICER": 0,
      INTERPRETER: 0,
      MEDIA: 0,
      DEPUTY: 0,
      "DELEGATION CONTACT OFFICER": 0,
      SPEAKER: 0,
    };

    /* ===============================
       GET EVENT MANAGER ROLE
    =============================== */
    const managerRole = await Role.findOne({ name: "EVENT MANAGER" });
    if (!managerRole) {
      return res.status(500).json({ message: "Event Manager role not found" });
    }

    /* ===============================
       FIND OR CREATE USER
    =============================== */
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      user = await User.create({
        id: uuidv4(),
        user_code: `USR-${uniqueSuffix}`,
        role_id: managerRole.id,
        email: normalizedEmail,
        name: safeName,
        first_name: safeFirstName,
        last_name: safeLastName,
        ministry_name: linkedMinistry,
        organization_id: finalOrgId,
        organization_name: finalOrgName,
        location: safeLocation,
        created_by: req.user.user_id,
      });
    } else {
      const currentRole = await Role.findOne({ id: user.role_id });
      if (!currentRole) {
        return res
          .status(500)
          .json({ message: "User system role misconfigured" });
      }

      // Only upgrade system role if EVENT MANAGER has higher power than current role
      // This prevents downgrading (e.g., SUPER ADMIN cannot be downgraded to EVENT MANAGER)
      if (ROLE_POWER["EVENT MANAGER"] > ROLE_POWER[currentRole.name]) {
        user.role_id = managerRole.id;
      }
      // Note: User can still have EVENT MANAGER role in UserEvent table for specific events

      user.first_name = user.first_name || safeFirstName;
      user.last_name = user.last_name || safeLastName;
      user.name = user.name || safeName;
      user.ministry_name = user.ministry_name || linkedMinistry;
      user.organization_id = user.organization_id || finalOrgId;
      user.organization_name = user.organization_name || finalOrgName;
      user.location = user.location || safeLocation;

      await user.save();
    }

    /* ===============================
       IF NO EVENT → STOP HERE
    =============================== */
    if (!event_id) {
      return res.status(201).json({
        message: "User created successfully (no event assigned)",
        user,
        userEvent: null,
      });
    }

    /* ===============================
       GET EVENT
    =============================== */
    const event = await Event.findOne({ _id: event_id });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    /* ===============================
       CREATE USER EVENT
    =============================== */
    // const existingEventManager = await UserEvent.findOne({
    //   event_id,
    //   role: "EVENT MANAGER",
    // });

    // if (existingEventManager) {
    //   return res.status(409).json({
    //     message: "An Event Manager is already assigned to this event",
    //   });
    // }

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const userEvent = await UserEvent.create({
      registration_id: `REG-${uniqueSuffix}`,
      user_id: user.id,
      event_id,
      role: "EVENT MANAGER",
      status: "invited",
      attended: false,
      created_by: req.user.user_id,
    });

    /* ===============================
       SEND EMAIL
    =============================== */
    try {
      await sendEmail({
        to: user.email,
        subject: `Appointment as Event Manager – ${sanitizeHtmlString(event.name)}`,
        html: eventManagerInviteTemplate({
          name: sanitizeHtmlString(user.name || user.email),
          eventName: sanitizeHtmlString(event.name),
          start: formatDateTime(event.start_date),
          end: formatDateTime(event.end_date),
          venue: sanitizeHtmlString(event.venue || "Venue to be communicated"),
        }),
      });
    } catch (mailErr) {
      console.error("Event Manager email failed:", mailErr);
    }

    /* ===============================
       FINAL RESPONSE
    =============================== */
    await Activity.logActivity({
      activityType: "ROLE_ASSIGN",
      description: `Added event manager: ${user.email} to event`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "EVENT",
      resourceId: event._id,
      metadata: {
        managerEmail: user.email,
        eventName: event.name,
      },
    });

    return res.status(201).json({
      message: "Event manager added successfully",
      user,
      userEvent,
    });
  } catch (error) {
    console.error("addEventManager error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate key error",
        key: error.keyValue,
      });
    }

    return res.status(500).json({ message: "Failed to add event manager" });
  }
};

export const updateEventManager = async (req, res) => {
  try {
    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!authRole || authRole.name !== "SUPER ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const eventManager = await User.findOne({ id });
    if (!eventManager) {
      return res.status(404).json({ message: "Event manager not found" });
    }

    const managerRole = await Role.findOne({ id: eventManager.role_id });
    if (!managerRole || managerRole.name !== "EVENT MANAGER") {
      return res.status(400).json({ 
        message: "User is not an event manager" 
      });
    }

    let {
      name,
      email,
      ministry_name,
      organization_name,
      event_id,
    } = req.body;

    if (name) {
      const safeName = sanitizeHtmlString(name.trim());
      eventManager.name = safeName;
      
      const nameParts = safeName.split(' ');
      if (nameParts.length > 0) {
        eventManager.first_name = nameParts[0];
        if (nameParts.length > 1) {
          eventManager.last_name = nameParts.slice(1).join(' ');
        }
      }
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      
      const existingUser = await User.findOne({ 
        email: normalizedEmail,
        id: { $ne: id }
      });
      
      if (existingUser) {
        return res.status(409).json({ 
          message: "Email already in use by another user" 
        });
      }
      
      eventManager.email = normalizedEmail;
    }

    if (ministry_name !== undefined) {
      eventManager.ministry_name = ministry_name ? sanitizeHtmlString(ministry_name.trim()) : null;
    }

    if (organization_name !== undefined) {
      const safeOrgName = organization_name ? sanitizeHtmlString(organization_name.trim()) : null;
      
      if (safeOrgName) {
        try {
          const existingOrg = await Organization.findOne({
            organization_name: { $regex: new RegExp(`^${safeOrgName}$`, "i") }
          });

          if (existingOrg) {
            eventManager.organization_id = existingOrg._id;
            eventManager.organization_name = existingOrg.organization_name;
            if (existingOrg.ministry_name && !ministry_name) {
              eventManager.ministry_name = existingOrg.ministry_name;
            }
          } else {
            const orgCode = `ORG-${_.uniqueId()}`;
            
            const newOrg = await Organization.create({
              organization_code: orgCode,
              organization_name: safeOrgName,
              description: "",
              ministry_id: null,
              ministry_name: null,
              is_active: true,
              created_by: req.user.user_id
            });

            eventManager.organization_id = newOrg._id;
            eventManager.organization_name = newOrg.organization_name;
          }
        } catch (orgError) {
          console.error("Organization handling error:", orgError);
        }
      } else {
        eventManager.organization_id = null;
        eventManager.organization_name = null;
      }
    }

    await eventManager.save();

    try {
      if (authUser && authUser.fcm_token) {
        const managerName = eventManager.first_name || eventManager.name || "Event Manager";
        await sendPushNotification(
          authUser.fcm_token,
          "Event Manager Updated 👔",
          `Event Manager '${managerName}' has been updated successfully.`
        );
        console.log(`✅ Push sent to Admin (${authUser.email}) regarding Event Manager Update.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Event Manager Update notice:", pushErr.message);
    }
    if (event_id) {
      const event = await Event.findOne({ _id: event_id });
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const existingUserEvent = await UserEvent.findOne({
        user_id: eventManager.id,
        event_id,
      });

      if (!existingUserEvent) {
        const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

        await UserEvent.create({
          registration_id: `REG-${uniqueSuffix}`,
          user_id: eventManager.id,
          event_id,
          role: "EVENT MANAGER",
          status: "invited",
          attended: false,
          created_by: req.user.user_id,
        });

        try {
          await sendEmail({
            to: eventManager.email,
            subject: `Appointment as Event Manager – ${sanitizeHtmlString(event.name)}`,
            html: eventManagerInviteTemplate({
              name: sanitizeHtmlString(eventManager.name || eventManager.email),
              eventName: sanitizeHtmlString(event.name),
              start: formatDateTime(event.start_date),
              end: formatDateTime(event.end_date),
              venue: sanitizeHtmlString(event.venue || "Venue to be communicated"),
            }),
          });
        } catch (mailErr) {
          console.error("Event Manager email failed:", mailErr);
        }
      }
    }

    await Activity.logActivity({
      activityType: "PROFILE_UPDATE",
      description: `Updated event manager: ${eventManager.email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "USER",
      resourceId: eventManager._id,
      metadata: {
        managerEmail: eventManager.email,
        updatedFields: Object.keys(req.body),
      },
    });

    return res.status(200).json({
      message: "Event manager updated successfully",
      user: eventManager,
    });
  } catch (error) {
    console.error("updateEventManager error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate key error",
        key: error.keyValue,
      });
    }

    return res.status(500).json({ message: "Failed to update event manager" });
  }
};

export const getSingleEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Fetch event with basic aggregation
    const events = await Event.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(eventId) },
      },
      {
        $addFields: {
          event_id_str: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: "userevents",
          localField: "event_id_str",
          foreignField: "event_id",
          as: "user_events",
        },
      },
      {
        $addFields: {
          total_registrations: { $size: "$user_events" },
          total_invite_count: {
            $size: {
              $filter: {
                input: "$user_events",
                as: "ue",
                cond: { $eq: ["$$ue.status", "invited"] },
              },
            },
          },
        },
      },
    ]);

    if (!events || events.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = events[0];
    const eventIdStr = event.event_id_str || event._id.toString();

    /* ===============================
       DRAFT ACCESS CONTROL
    =============================== */
    if (event.status === "draft") {
      // Get authenticated user
      const authUser = await User.findOne({ id: req.user.user_id });
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user's role
      const authRole = await Role.findOne({ id: authUser.role_id });
      const isAdmin = authRole && authRole.name === "SUPER ADMIN";

      // Check if user is event creator
      const isCreator = event.created_by === authUser.id;

      // Check if user is event manager
      const isEventManager = await UserEvent.findOne({
        user_id: authUser.id,
        event_id: eventIdStr,
        role: "EVENT MANAGER"
      });

      // Deny access if not admin, creator, or event manager
      if (!isAdmin && !isCreator && !isEventManager) {
        return res.status(403).json({ 
          message: "Access denied. Draft events can only be viewed by their creator, assigned manager, or Super Admin" 
        });
      }
    }

    // Get all user IDs from user_events
    const userIds = event.user_events.map((ue) => ue.user_id).filter(Boolean);

    // Fetch users with their roles
    const users = await User.find({ id: { $in: userIds } });

    const roleIds = [...new Set(users.map((u) => u.role_id).filter(Boolean))];

    const roles = await Role.find({ id: { $in: roleIds } });

    // Create a map of user_id -> role_name
    const userRoleMap = {};
    users.forEach((user) => {
      const role = roles.find((r) => r.id === user.role_id);
      userRoleMap[user.id] = role?.name || null;
    });

    // Calculate counts based on User table roles

    let daoCount = 0;
    let delegateCount = 0;
    let delegateInviteCount = 0;
    /* ===== ADD THIS ===== */

    let manager = null;


    event.user_events.forEach((ue) => {
      const userSystemRole = userRoleMap[ue.user_id];
      // DAO counts
      if (userSystemRole === "DAO" && ue.status !== "cancelled") {
        daoCount++;
      }

      // Delegate counts
      if (
        (
          userSystemRole === "DELEGATE" ||
          userSystemRole === "HEAD OF DELEGATE" ||
          userSystemRole === "SECURITY OFFICER" ||
          userSystemRole === "INTERPRETER" ||
          userSystemRole === "MEDIA" ||
          userSystemRole === "DEPUTY" ||
          userSystemRole === "SPEAKER" ||
          userSystemRole === "DELEGATION CONTACT OFFICER"
        ) &&
        ue.status !== "cancelled"
      ) {
        delegateCount++;
      }

      // Delegate invite count
      if (ue.role === "DELEGATE" && ue.status === "invited") {
        delegateInviteCount++;
      }

      /* ===== ADD THIS BLOCK ===== */
      if (ue.role === "EVENT MANAGER") {
        const managerUser = users.find(
          (u) => u.id === ue.user_id
        );
        if (managerUser) {
          manager = {
            manager_id: managerUser.id,
            manager_name: managerUser.name,
            manager_email: managerUser.email,
            ministry_name: managerUser.ministry_name || event.ministry_name,
          };
        }
      }
    });

    /* ===============================
       GET SIGNED S3 URL FOR LOGO
    =============================== */
    if (event.logo) {

      event.logo = await getSignedS3Url(event.logo);

    }

    /* ===============================
       BUILD RESPONSE
    =============================== */

    const response = {
      id: event._id.toString(),
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      type: event.event_type,
      location: event.location,
      venue: event.venue,
      image: event.logo,
      category: event.category,
      description: event.description,
      capacity: event.capacity,
      delegate_count: event.delegate_count,
      total_registrations: event.total_registrations,
      total_dao_count: daoCount,
      dao_invite_count: daoCount,
      delegate_invite_count: delegateInviteCount,
      total_invite_count: event.total_invite_count,
      is_active: event.is_active,
      registration_open: event.registration_open,
      meeting_url: event.meeting_url,
      status: event.status || "published",
      published_at: event.published_at || null,
      /* ===== ADD THIS ===== */
      manager_id: manager?.manager_id || null,
      manager_name: manager?.manager_name || null,
      manager_email: manager?.manager_email || null,
      ministry_name: manager?.ministry_name || event.ministry_name || null,
      organization_name: event.organization_name || null,
      organization_id: event.organization_id || null,
    };
    return res.status(200).json({
      message: "Event details fetched successfully",
      data: response,
    });

  } catch (error) {
    console.error("getSingleEvent error:", error);
    return res.status(500).json({
      message: "Failed to fetch event details"
    });
  }
};

/* =========================================================
   GET TRAVEL DETAILS FOR EVENT
   =========================================================
   - Fetch all users for an event
   - Separate into "Travel Details Added" and "Pending"
   - Show user information with profile completion
   ========================================================= */
export const getEventTravelDetails = async (req, res) => {
  try {
    const { eventId } = req.params;
    const authUserId = req.user.user_id;

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    /* ===============================
       AUTH USER + ROLE
    =============================== */
    const authUser = await User.findOne({ id: authUserId });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!authRole) {
      return res.status(403).json({ message: "Role not found" });
    }

    const loginRole = authRole.name;

    /* ===============================
       Check user is part of event or is SUPER ADMIN
    =============================== */
    const requesterEvent = await UserEvent.findOne({
      event_id: eventId,
      user_id: authUserId,
    });

    if (!requesterEvent && loginRole !== "SUPER ADMIN") {
      return res.status(403).json({
        message: "You are not part of this event",
      });
    }

    /* ===============================
       Fetch all user events for this event
    =============================== */
    const allUserEvents = await UserEvent.find({ event_id: eventId });
    if (!allUserEvents.length) {
      return res.json({
        travel_details_added: [],
        pending_travel_details: [],
        total_added: 0,
        total_pending: 0,
      });
    }

    const userIds = allUserEvents.map((ue) => ue.user_id);

    // Fetch users
    const users = await User.find({ id: { $in: userIds } });

    // Fetch travel details for this event
    const travelDetails = await Travel.find({ event_id: eventId });

    // Create a map of user_id -> travel details
    const travelMap = {};
    travelDetails.forEach((travel) => {
      travelMap[travel.user_id] = travel;
    });

    const event = await Event.findById(eventId);

    // Build response arrays
    const travelDetailsAdded = [];
    const pendingTravelDetails = [];

    for (const userEvent of allUserEvents) {
      const user = users.find((u) => u.id === userEvent.user_id);
      if (!user) continue;

      // Skip cancelled users
      if (userEvent.status === "cancelled") continue;

      const hasTravelDetails = !!travelMap[userEvent.user_id];
      const profileProgress = calculateProfileCompletion(user);

      let userDetails = user.toObject();

      // Sign S3 URLs
      if (user.profile_picture) {
        try {
          userDetails.profile_picture = await getSignedS3Url(
            user.profile_picture,
          );
        } catch {}
      }
      if (user.documents?.photo_url) {
        try {
          userDetails.documents.photo_url = await getSignedS3Url(
            userDetails.documents.photo_url,
          );
        } catch {}
      }

      const userInfo = {
        user_event_id: userEvent._id.toString(),
        user_id: userEvent.user_id,
        registration_id: userEvent.registration_id,
        role: userEvent.role,
        status: userEvent.status,
        name: user.name || null,
        email: user.email || null,
        first_name: user.first_name || null,
        middle_name: user.middle_name || null,
        last_name: user.last_name || null,
        profile_completion: profileProgress,
        user: userDetails,
      };

      if (hasTravelDetails) {
        const travel = travelMap[userEvent.user_id];

        // Sign S3 URLs for tickets
        const signedArrival = travel.arrival ? { ...travel.arrival } : null;
        if (signedArrival?.ticket_url) {
          try {
            signedArrival.ticket_url = await getSignedS3Url(
              signedArrival.ticket_url,
            );
          } catch {}
        }

        const signedDeparture = travel.departure
          ? { ...travel.departure }
          : null;
        if (signedDeparture?.ticket_url) {
          try {
            signedDeparture.ticket_url = await getSignedS3Url(
              signedDeparture.ticket_url,
            );
          } catch {}
        }

        userInfo.travel_details = {
          id: travel._id.toString(),
          for_whom: travel.for_whom,
          arrival: signedArrival,
          departure: signedDeparture,
          hotel: travel.hotel,
          added_at: travel.createdAt,
        };
        travelDetailsAdded.push(userInfo);
      } else {
        pendingTravelDetails.push(userInfo);
      }
    }

    return res.json({
      event: event
        ? {
            id: event._id.toString(),
            name: event.name,
            start_date: event.start_date,
            end_date: event.end_date,
          }
        : null,
      travel_details_added: travelDetailsAdded,
      pending_travel_details: pendingTravelDetails,
      total_added: travelDetailsAdded.length,
      total_pending: pendingTravelDetails.length,
    });
  } catch (error) {
    console.error("getEventTravelDetails error:", error);
    return res.status(500).json({
      message: "Failed to fetch event travel details",
    });
  }
};

export const getDashboardCounts = async (req, res) => {
  try {
    // 1. AUTH USER
    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2. AUTH ROLE
    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!authRole) {
      return res.status(403).json({ message: "Access denied" });
    }

    const roleName = authRole.name;
    const userId = authUser.id;

    let totalEvents = 0;
    let totalDaoInvited = 0;
    let totalDelegatesInvited = 0;
    let totalEventManagers = 0;
    let totalDraftEvents = 0;
    let totalPublishedEvents = 0;

    if (roleName === "SUPER ADMIN") {
      // ========================================
      // SUPER ADMIN: Count from User & Role tables
      // ========================================

      // Total Events
      totalEvents = await Event.countDocuments();
      
      // Draft Events
      totalDraftEvents = await Event.countDocuments({ status: "draft" });
      
      // Published Events
      totalPublishedEvents = await Event.countDocuments({ status: "published" });

      // Total DAOs (from User table)
      const daoRole = await Role.findOne({ name: "DAO" });
      if (daoRole) {
        totalDaoInvited = await User.countDocuments({
          role_id: daoRole.id,
        });
      }

      // Total Delegates (from User table)
      const allRoles = await Role.find({});
      const delegateRoleNames = ["DELEGATE"];

      const delegateRoles = allRoles.filter((role) =>
        delegateRoleNames.includes(role.name),
      );

      if (delegateRoles.length > 0) {
        const delegateRoleIds = delegateRoles.map((r) => r.id);
        totalDelegatesInvited = await User.countDocuments({
          role_id: { $in: delegateRoleIds },
        });
      }

      // Total Event Managers (from User table)
      const eventManagerRole = await Role.findOne({ name: "EVENT MANAGER" });
      if (eventManagerRole) {
        totalEventManagers = await User.countDocuments({
          role_id: eventManagerRole.id,
        });
      }
    } else {
      // ========================================
      // EVENT MANAGER / DAO: Count what THEY created
      // ========================================

      // Fetch UserEvents created by this user
      const myUserEvents = await UserEvent.find({ created_by: userId });

      if (myUserEvents.length === 0) {
        return res.json({
          totalEvents: 0,
          totalDaoInvited: 0,
          totalDelegatesInvited: 0,
          totalEventManagers: 0,
        });
      }

      // Total Events (unique events they are part of)
      const eventIds = [...new Set(myUserEvents.map((ue) => ue.event_id))];
      totalEvents = eventIds.length;
      
      // Count draft and published events for Event Manager
      if (roleName === "EVENT MANAGER") {
        const eventObjects = await Event.find({ 
          $or: [
            { created_by: userId },
            { _id: { $in: eventIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null).filter(Boolean) } }
          ]
        }).select('status');
        
        totalDraftEvents = eventObjects.filter(e => e.status === "draft").length;
        totalPublishedEvents = eventObjects.filter(e => e.status === "published").length;
      }

      // Get unique user IDs they invited
      const invitedUserIds = [...new Set(myUserEvents.map((ue) => ue.user_id))];

      // Fetch those users with their roles
      const invitedUsers = await User.find({ id: { $in: invitedUserIds } });
      const roleIds = [
        ...new Set(invitedUsers.map((u) => u.role_id).filter(Boolean)),
      ];
      const roles = await Role.find({ id: { $in: roleIds } });

      // Create a map of user_id -> role name
      const userRoleMap = {};
      invitedUsers.forEach((user) => {
        const role = roles.find((r) => r.id === user.role_id);
        userRoleMap[user.id] = role?.name || null;
      });

      // Count unique DAOs and Delegates they invited
      const uniqueDaoUsers = new Set();
      const uniqueDelegateUsers = new Set();

      myUserEvents.forEach((ue) => {
        const userSystemRole = userRoleMap[ue.user_id];

        // Count unique DAOs
        if (userSystemRole === "DAO") {
          uniqueDaoUsers.add(ue.user_id);
        }
raftEvents,
      totalPublishedEvents,
      totalD
        // Count unique Delegates
        if (userSystemRole === "DELEGATE") {
          uniqueDelegateUsers.add(ue.user_id);
        }
      });

      totalDaoInvited = uniqueDaoUsers.size;
      totalDelegatesInvited = uniqueDelegateUsers.size;
    }

    return res.json({
      totalEvents,
      totalDaoInvited,
      totalDelegatesInvited,
      totalEventManagers,
    });
  } catch (error) {
    console.error("getDashboardCounts error:", error);
    return res.status(500).json({
      message: "Failed to fetch dashboard counts",
    });
  }
};

export const generateInviteLink = async (req, res) => {
  try {
    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!authRole) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    const roleName = authRole.name;
    const isOwner =
      String(event.created_by) === String(authUser.id) ||
      String(event.created_by) === String(authUser._id);
    if (roleName !== "SUPER ADMIN" && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const expiryDays = parseInt(req.body.expiryDays, 10) || 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // generate unique token (retry loop)
    let token;
    for (let i = 0; i < 6; i++) {
      token = crypto.randomBytes(20).toString("hex");
      // check uniqueness within invites tokens across events
      const exists = await Event.findOne({ "invites.token": token })
        .select("_id")
        .lean();
      if (!exists) break;
      token = null;
    }
    if (!token)
      return res
        .status(500)
        .json({ message: "Failed to generate unique token" });

    const inviteRecord = {
      token,
      created_by: authUser.id || String(authUser._id),
      expires_at: expiresAt,
      created_at: new Date(),
    };

    await Event.findByIdAndUpdate(eventId, {
      $push: { invites: inviteRecord },
    });

    const frontendBase = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const fullLink = `${frontendBase}/open/${eventId}?token=${encodeURIComponent(token)}`;
    return res.json({
      message: "Invite link generated",
      data: { link: fullLink, token, expiresAt },
    });
  } catch (error) {
    console.error("generateInviteLink error:", error);
    return res.status(500).json({ message: "Failed to generate invite link" });
  }
};

export const validateInviteToken = async (req, res) => {
  try {
    const { eventId } = req.params;
    const token = req.query.token || req.body.token;
    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    const event = await Event.findOne(
      { _id: eventId, "invites.token": token },
      { "invites.$": 1, name: 1 },
    ).lean();

    if (!event || !event.invites || !event.invites.length) {
      return res
        .status(404)
        .json({ valid: false, message: "Invalid token or event" });
    }

    const invite = event.invites[0];
    // if (invite.used) {
    //   return res.status(410).json({ valid: false, message: 'Token already used' });
    // }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ valid: false, message: "Token expired" });
    }

    return res.json({
      valid: true,
      event: { id: eventId, name: event.name },
      expiresAt: invite.expires_at,
    });
  } catch (error) {
    console.error("validateInviteToken error:", error);
    return res.status(500).json({ message: "Failed to validate token" });
  }
};
/* =========================================================
   GET EVENTS FOR EVENT MANAGER (WITH COUNTS)
   =========================================================
   Shows:
   ✅ Events created by manager
   ✅ Events where manager is invited/assigned
   ✅ Includes invite counts (DAO / Delegate+HeadDelegate / Total)
   ✅ Removes duplicates
   ========================================================= */

export const getEventManagerEvents = async (req, res) => {
  try {
    const authUserId = req.user.user_id;

    /* ===============================
       AUTH USER
    =============================== */
    const authUser = await User.findOne({ id: authUserId });

    if (!authUser) {
      return res.status(401).json({
        message: "Unauthorized user",
      });
    }

    /* ===============================
       ROLE CHECK
    =============================== */
    const authRole = await Role.findOne({ id: authUser.role_id });

    if (!authRole || authRole.name !== "EVENT MANAGER") {
      return res.status(403).json({
        message: "Access denied (Event Manager only)",
      });
    }

    /* =========================================================
       COUNTS PIPELINE (DAO + Delegate + Head Delegate)
    ========================================================= */
    const eventCountsPipeline = [
      {
        $addFields: {
          event_id_str: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: "userevents",
          localField: "event_id_str",
          foreignField: "event_id",
          as: "user_events",
        },
      },

      /* INVITE COUNTS */
      {
        $addFields: {
          /* DAO INVITES */
          dao_invite_count: {
            $size: {
              $filter: {
                input: "$user_events",
                as: "ue",
                cond: {
                  $and: [
                    { $eq: ["$$ue.status", "invited"] },
                    { $eq: ["$$ue.role", "DAO"] },
                  ],
                },
              },
            },
          },

          /* DELEGATE + HEAD OF DELEGATE INVITES */
          delegate_invite_count: {
            $size: {
              $filter: {
                input: "$user_events",
                as: "ue",
                cond: {
                  $and: [
                    { $eq: ["$$ue.status", "invited"] },
                    {
                      $in: [
                        "$$ue.role",
                        [
                          "DELEGATE",
                          "HEAD OF DELEGATE",
                          "SECURITY OFFICER",
                          "INTERPRETER",
                          "MEDIA",
                          "DEPUTY",
                          "DELEGATION CONTACT OFFICER",
                          "SPEAKER",
                        ],
                      ],
                    },
                  ],
                },
              },
            },
          },

          /* TOTAL INVITES */
          total_invite_count: {
            $size: {
              $filter: {
                input: "$user_events",
                as: "ue",
                cond: { $eq: ["$$ue.status", "invited"] },
              },
            },
          },
        },
      },

      {
        $project: {
          user_events: 0,
          event_id_str: 0,
        },
      },
    ];

    /* =========================================================
       1. EVENTS CREATED BY THIS MANAGER
    ========================================================= */
    let createdEvents = await Event.aggregate([
      {
        $match: {
          created_by: authUser.id,
        },
      },
      ...eventCountsPipeline,
      { $sort: { created_at: -1 } },
    ]);

    /* SIGN LOGOS */
    createdEvents = await Promise.all(
      createdEvents.map(async (event) => {
        if (event.logo) {
          event.logo = await getSignedS3Url(event.logo);
        }
        return event;
      }),
    );

    /* =========================================================
       2. EVENTS WHERE MANAGER IS INVITED / ASSIGNED
    ========================================================= */
    let invitedEvents = await UserEvent.aggregate([
      {
        $match: {
          user_id: authUser.id,
          role: "EVENT MANAGER",
        },
      },

      {
        $addFields: {
          eventObjectId: { $toObjectId: "$event_id" },
        },
      },

      {
        $lookup: {
          from: "events",
          localField: "eventObjectId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },

      /* Replace root with actual event */
      {
        $replaceRoot: { newRoot: "$event" },
      },

      /* Apply counts pipeline */
      ...eventCountsPipeline,

      { $sort: { created_at: -1 } },
    ]);

    /* SIGN LOGOS */
    invitedEvents = await Promise.all(
      invitedEvents.map(async (event) => {
        if (event.logo) {
          event.logo = await getSignedS3Url(event.logo);
        }
        return event;
      }),
    );

    /* =========================================================
       3. MERGE + REMOVE DUPLICATES
    ========================================================= */
    const merged = [...createdEvents, ...invitedEvents];

    const uniqueEvents = Array.from(
      new Map(merged.map((e) => [String(e._id), e])).values(),
    );

    /* =========================================================
       FINAL RESPONSE
    ========================================================= */
    return res.status(200).json({
      message: "Event Manager events fetched successfully",
      total: uniqueEvents.length,
      events: uniqueEvents,
    });
  } catch (error) {
    console.error("getEventManagerEvents error:", error);

    return res.status(500).json({
      message: "Failed to fetch Event Manager events",
      error: error.message,
    });
  }
};

export const getOpenInviteRegistrations = async (req, res) => {
  try {
    const authUserId = req.user.user_id;

    /* ===============================
       AUTH USER
    =============================== */
    const authUser = await User.findOne({ id: authUserId });

    if (!authUser) {
      return res.status(401).json({
        message: "Unauthorized user",
      });
    }

    /* ===============================
       ROLE CHECK
    =============================== */
    const authRole = await Role.findOne({ id: authUser.role_id });

    if (
      !authRole ||
      (authRole.name !== "EVENT MANAGER" && authRole.name !== "SUPER ADMIN")
    ) {
      return res.status(403).json({
        message: "Access denied (Event Manager or Super Admin only)",
      });
    }

    const { eventId, status } = req.query;

    const query = { registration_source: "open_invite" };

    if (eventId && eventId !== "all") {
      query.created_by = eventId;
    }

    if (status && status !== "all") {
      if (status === "pending") query.account_status = "pending";
      if (status === "approved") query.account_status = "active";
      if (status === "rejected") query.account_status = "rejected";
    }

    const users = await User.find(query)
      .select("-password_hash")
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = [
      ...new Set(users.map((u) => u.created_by).filter(Boolean)),
    ];
    const events = await Event.find({ _id: { $in: eventIds } })
      .select("_id name")
      .lean();

    const eventMap = {};
    events.forEach((e) => {
      eventMap[e._id.toString()] = e.name;
    });

    const registrations = users.map((user) => ({
      _id: user._id || user.id,
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.mobile,
      phoneCountry: "+91",
      gender: user.gender,
      dob: user.date_of_birth,
      country: user.country,
      docType: user.document_type,
      docNumber: user.document_number,
      photoUrl: user.documents?.photo_url,
      participantType: user.position || "Delegate",
      inviteAs: user.position || "Delegate",
      status:
        user.account_status === "active" ? "approved" : user.account_status,
      eventName: eventMap[user.created_by] || "Unknown Event",
      eventId: user.created_by,
      createdAt: user.createdAt,
      rejectionReason: user.rejection_reason,
    }));

    return res.json({
      success: true,
      registrations,
      events: events.map((e) => ({ _id: e._id, name: e.name })),
      total: registrations.length,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch registrations",
    });
  }
};

export const updateOpenInviteStatus = async (req, res) => {
  try {
    const authUserId = req.user.user_id;

    /* ===============================
       AUTH USER
    =============================== */
    const authUser = await User.findOne({ id: authUserId });

    if (!authUser) {
      return res.status(401).json({
        message: "Unauthorized user",
      });
    }

    /* ===============================
       ROLE CHECK
    =============================== */
    const authRole = await Role.findOne({ id: authUser.role_id });

    if (
      !authRole ||
      (authRole.name !== "EVENT MANAGER" && authRole.name !== "SUPER ADMIN")
    ) {
      return res.status(403).json({
        message: "Access denied (Event Manager or Super Admin only)",
      });
    }

    const { userId } = req.params;
    const { action, reason } = req.body;

    // Validate action
    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"',
      });
    }

    // Validate rejection reason
    if (action === "reject" && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Find user
    const user = await User.findOne({
      $or: [{ _id: userId }, { id: userId }],
      registration_source: "open_invite",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // APPROVE
    if (action === "approve") {
      if (user.account_status === "active") {
        return res.status(400).json({
          success: false,
          message: "User already approved",
        });
      }

      user.account_status = "active";
      user.rejection_reason = null;

      if (!user.user_code) {
        user.user_code = `OI${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      }

      await user.save();

      return res.json({
        success: true,
        message: "User approved successfully. They can now login.",
        user: {
          id: user.id,
          email: user.email,
          account_status: user.account_status,
        },
      });
    }

    // REJECT
    if (action === "reject") {
      if (user.account_status === "active") {
        return res.status(400).json({
          success: false,
          message: "Cannot reject an approved user",
        });
      }

      user.account_status = "rejected";
      user.rejection_reason = reason.trim();

      await user.save();

      return res.json({
        success: true,
        message: "User rejected successfully",
        user: {
          id: user.id,
          email: user.email,
          rejection_reason: user.rejection_reason,
        },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

/**
 * Get hotel accommodation details for an event
 * Shows users who have added hotel details and who haven't
 */
export const getEventHotelDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    // ================================
    // CHECK USER ROLE (SUPER ADMIN)
    // ================================
    const loggedUser = await User.findOne({ id: req.user.user_id });
    let systemRole = null;

    if (loggedUser?.role_id) {
      const roleDoc = await Role.findOne({ id: loggedUser.role_id });
      systemRole = roleDoc?.name;
    }

    const isSuperAdmin = systemRole === "SUPER ADMIN";

    // ================================
    // EVENT ACCESS CHECK
    // ================================
    if (!isSuperAdmin) {
      const loggedUserEvent = await UserEvent.findOne({
        user_id: req.user.user_id,
        event_id: eventId,
      });

      if (!loggedUserEvent) {
        return res
          .status(403)
          .json({ message: "You are not part of this event" });
      }

      const allowedRoles = [
        "EVENT MANAGER",
        "DAO",
        "HEAD OF DELEGATE",
        "DELEGATE",
        "SECURITY OFFICER",
        "INTERPRETER",
        "MEDIA",
        "DEPUTY",
        "DELEGATION CONTACT OFFICER",
        "SPEAKER",
      ];

      if (!allowedRoles.includes(loggedUserEvent.role)) {
        return res.status(403).json({
          message:
            "Access denied. Only authorized event roles can view hotel details.",
          yourRole: loggedUserEvent.role,
        });
      }
    }

    // ================================
    // FETCH EVENT
    // ================================
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // ================================
    // FETCH ALL RELATED DATA (OPTIMIZED)
    // ================================
    const allEventUsers = await UserEvent.find({ event_id: eventId });

    const hotelRecords = await Hotel.find({ event_id: eventId });

    // Collect IDs for bulk fetch
    const userIds = allEventUsers.map((u) => u.user_id);
    const hotelIds = hotelRecords.map((h) => h.hotel_id);

    // Bulk fetch users & hotels
    const users = await User.find({ id: { $in: userIds } });

    const hotelMasters = await HotelMaster.find({
      id: { $in: hotelIds },
    });

    // ================================
    // CREATE FAST LOOKUP MAPS
    // ================================
    const userMap = new Map(users.map((u) => [u.id, u]));

    const hotelMap = new Map(hotelRecords.map((h) => [h.user_id, h]));

    const hotelMasterMap = new Map(hotelMasters.map((h) => [h.id, h]));

    // ================================
    // PROCESS USERS
    // ================================
    const usersWithDetails = [];
    const usersWithoutDetails = [];

    for (const userEvent of allEventUsers) {
      const user = userMap.get(userEvent.user_id);
      if (!user) continue;

      let userDetails = {
        profile_picture: user.profile_picture,
        documents: user.documents,
      };

      if (userDetails.documents?.photo_url) {
        try {
          userDetails.documents.photo_url = await getSignedS3Url(
            userDetails.documents.photo_url,
          );
        } catch {}
      }

      if (userDetails.profile_picture) {
        try {
          userDetails.profile_picture = await getSignedS3Url(
            userDetails.profile_picture,
          );
        } catch {}
      }

      const hotelRecord = hotelMap.get(userEvent.user_id);

      // Resolve organisation: prefer user's organisation; fall back to
      // the creator of the userEvent (e.g., DAO) or the user who added the hotel
      let resolvedOrganisation = user?.organisation
        ? sanitizeHtmlString(user.organisation)
        : null;

      if (!resolvedOrganisation && userEvent?.created_by) {
        // Try to get creator from already-fetched users, else DB
        const creator = userMap.get(userEvent.created_by) ||
          (await User.findOne({ id: userEvent.created_by }));
        if (creator?.organisation) {
          resolvedOrganisation = sanitizeHtmlString(creator.organisation);
        }
      }

      if (!resolvedOrganisation && hotelRecord?.added_by) {
        const addedBy = userMap.get(hotelRecord.added_by) ||
          (await User.findOne({ id: hotelRecord.added_by }));
        if (addedBy?.organisation) {
          resolvedOrganisation = sanitizeHtmlString(addedBy.organisation);
        }
      }

      const userInfo = {
        user_event_id: userEvent.registration_id,
        user_id: userEvent.user_id,
        name:
          user.name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        country: user.country,
        organisation: resolvedOrganisation,
        organisation_id: user.organization_id  || null,
        organisation_name: user.organization_name || null,
        role: userEvent.role,
        status: userEvent.status,
        registration_id: userEvent.registration_id,
        user: userDetails,
      };

      if (hotelRecord) {
        const hotelMaster = hotelMasterMap.get(hotelRecord.hotel_id);

        usersWithDetails.push({
          ...userInfo,
          hotel_details: {
            id: hotelRecord._id,
            stay_start_date: hotelRecord.stay_start_date,
            stay_end_date: hotelRecord.stay_end_date,
            city: hotelRecord.city,
            state: hotelRecord.state,
            hotel_id: hotelRecord.hotel_id,
            hotel_type: hotelRecord.hotel_type,
            hotel_name: hotelRecord.hotel_name,
            hotel: hotelMaster
              ? {
                  id: hotelMaster.id,
                  name: hotelMaster.name,
                  city: hotelMaster.city,
                  state: hotelMaster.state,
                  address: hotelMaster.address,
                  contact: hotelMaster.contact,
                }
              : null,
            for_whom: hotelRecord.for_whom,
            added_by: hotelRecord.added_by,
            added_at: hotelRecord.createdAt,
            status: hotelRecord.status,
          },
        });
      } else {
        usersWithoutDetails.push(userInfo);
      }
    }

    // ================================
    // FINAL RESPONSE
    // ================================
    res.json({
      event: {
        id: event._id,
        event_id: event._id,
        event_name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
      },
      hotel_details_added: usersWithDetails,
      pending_hotel_details: usersWithoutDetails,
      summary: {
        total_users: allEventUsers.length,
        hotel_added: usersWithDetails.length,
        hotel_pending: usersWithoutDetails.length,
      },
    });
  } catch (err) {
    console.error("Error fetching event hotel details:", err);

    res.status(500).json({
      message: "Failed to fetch hotel details",
      error: err.message,
    });
  }
};


const getColumnsByType = (type) => {
  const baseColumns = [
    { header: "Salutation", key: "salutation", width: 12 },
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Mobile", key: "mobile", width: 18 },
    { header: "Role", key: "role", width: 18 },
    { header: "Country", key: "country", width: 18 },
  ];

  const travelColumns = [
    { header: "Country From", key: "country_from", width: 18 },
    { header: "Arrival Flight", key: "arrival_flight", width: 16 },
    { header: "Arrival Airport", key: "arrival_airport", width: 18 },
    { header: "Arrival Date", key: "arrival_date", width: 16 },
  { header: "Conn. Flight No", key: "connecting_flight_number", width: 18 },
  { header: "Conn. Airport", key: "connecting_airport", width: 18 },
  { header: "Conn. Date", key: "connecting_date", width: 16 },
  // { header: "Conn. Country", key: "connecting_country", width: 18 },

    { header: "Departure Flight", key: "departure_flight", width: 16 },
    { header: "Departure Airport", key: "departure_airport", width: 18 },
    { header: "Departure Date", key: "departure_date", width: 16 },
  ];

  const hotelColumns = [
    { header: "Hotel Name", key: "hotel_name", width: 25 },
    { header: "Hotel City", key: "hotel_city", width: 18 },
    { header: "Hotel State", key: "hotel_state", width: 18 },
    { header: "Check In Date", key: "check_in", width: 18 },
    { header: "Check Out Date", key: "check_out", width: 18 },
  ];

  const profileColumns = [
    // { header: "Profile Status", key: "profile_status", width: 14 },
    { header: "Photo", key: "photo", width: 15 },
  ];

  switch (type) {
    case "travel":
      return [...baseColumns, ...travelColumns, ...profileColumns];

    case "hotel":
      return [...baseColumns, ...hotelColumns, ...profileColumns];

    case "emc":
      return [...baseColumns, ...profileColumns];

    default:
      return [...baseColumns, ...travelColumns, ...hotelColumns, ...profileColumns];
  }
};

export const downloadEventReport = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type = "default" } = req.query;

    const allowedTypes = ["default", "travel", "hotel", "emc"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid report type" });
    }

    /* ================= ROLE CHECK ================= */

    const authUser = await User.findOne({ id: req.user.user_id });
    if (!authUser) return res.status(401).json({ message: "Unauthorized" });

    const authRole = await Role.findOne({ id: authUser.role_id });
    if (!["SUPER ADMIN", "EVENT MANAGER"].includes(authRole?.name)) {
      return res.status(403).json({ message: "Access denied" });
    }

    /* ================= FETCH EVENT ================= */

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    /* ================= FETCH USERS ================= */

    const userEvents = await UserEvent.find({
      event_id: eventId,
      status: { $ne: "cancelled" },
    });

    const userIds = userEvents.map((u) => u.user_id);
    const users = await User.find({ id: { $in: userIds } ,  account_status: "active",});

    const userMap = new Map(users.map((u) => [u.id, u]));

    /* ================= FETCH TRAVEL & HOTEL ================= */

    const travelData = await Travel.find({ event_id: eventId });
    const hotelData = await Hotel.find({ event_id: eventId });

    const travelMap = new Map(travelData.map((t) => [t.user_id, t]));
    const hotelMap = new Map(hotelData.map((h) => [h.user_id, h]));

    /* ================= EXCEL SETUP ================= */

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Event Report");

    sheet.columns = getColumnsByType(type);
    // sheet.getRow(1).font = { bold: true };

    const headerRow = sheet.getRow(1);

headerRow.eachCell((cell) => {
  cell.font = {
    bold: true,
    color: { argb: "FFFFFFFF" }, // White text
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF000000" }, // Black background
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
});
    let rowIndex = 2;

    /* ================= LOOP USERS ================= */

    for (const ue of userEvents) {
      const user = userMap.get(ue.user_id);
      if (!user) continue;

      const profileCompletion = calculateProfileCompletion(user);

      const travel = travelMap.get(user.id);
      const hotel = hotelMap.get(user.id);

      const arrival = travel?.arrival || {};
      const departure = travel?.departure || {};
      const connecting = arrival?.connecting_flight || {};

      const rowData = {
        salutation: capitalizeTitle(user.title),
        name: user.name?.toUpperCase() || "",
        email: user.email || "",
        mobile: user.mobile || "",
        role: ue.role || "",
        country: user.country || "",
        profile_status: profileCompletion?.percentage
          ? `${profileCompletion.percentage}%`
          : "",
      };

      if (type === "travel" || type === "default") {
  rowData.country_from = arrival.country_from || "";
  rowData.arrival_flight = arrival.flight_number || "";
  rowData.arrival_airport = arrival.port_of_entry || "";
  rowData.arrival_date = formatDateTime(arrival.arrival_date);

  // ✅ Separate Connecting Columns
  if (arrival.has_connecting_flight) {
    rowData.connecting_flight_number = connecting.flight_number || "";
    rowData.connecting_airport = connecting.port || "";
    rowData.connecting_date = formatDateTime(connecting.date);
    rowData.connecting_country = connecting.country || "";
  } else {
    rowData.connecting_flight_number = "";
    rowData.connecting_airport = "";
    rowData.connecting_date = "";
    rowData.connecting_country = "";
  }

  rowData.departure_flight = departure.flight_number || "";
  rowData.departure_airport = departure.port_of_exit || "";
  rowData.departure_date = formatDateTime(departure.departure_date);
}

      if (type === "hotel" || type === "default") {
        rowData.hotel_name = hotel?.hotel_name || "";
        rowData.hotel_city = hotel?.city || "";
        rowData.hotel_state = hotel?.state || "";
        rowData.check_in = formatDateTime(hotel?.stay_start_date);
        rowData.check_out = formatDateTime(hotel?.stay_end_date);
      }

      const row = sheet.addRow(rowData);
      row.height = 60;

    

      /* ================= IMAGE EMBED ================= */

if (user.documents?.photo_url) {
  try {
    // Convert S3 key to signed URL
    const signedUrl = await getSignedS3Url(user.documents.photo_url);

    const response = await axios.get(signedUrl, {
      responseType: "arraybuffer",
    });

    const extension = signedUrl.includes(".jpg") || signedUrl.includes(".jpeg")
  ? "jpeg"
  : "png";

const imageId = workbook.addImage({
  buffer: response.data,
  extension,
});

    sheet.addImage(imageId, {
      tl: { col: sheet.columnCount - 1, row: rowIndex - 1 },
      ext: { width: 60, height: 60 },
    });

  } catch (err) {
    console.error("Image load error:", err.message);
  }
}

      rowIndex++;
    }

    /* ================= SEND FILE ================= */

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${event.name.replace(/\s+/g, "-").toLowerCase()}-${type}-report.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ message: "Failed to generate report" });
  }
};