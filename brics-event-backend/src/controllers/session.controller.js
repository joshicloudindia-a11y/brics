// brics-event-backend/src/controllers/session.controller.js

import mongoose from "mongoose";
import Session from "../models/Session.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import UserEvent from "../models/UserEvent.js";
import SessionParticipant from "../models/SessionParticipant.js";
import Agenda from "../models/Agenda.js";
import { uploadToS3, getSignedS3Url } from "../config/uploadToS3.js";
import ConferenceHall from "../models/ConferenceHall.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { sendPushNotification } from "../utils/notification.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Kolkata";

export const createSession = async (req, res) => {
  try {
    const { eventId } = req.params;

    const user = await User.findOne({
      id: req.user.user_id
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // =====================================================
    // EVENT CHECK
    // =====================================================

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }


    // =====================================================
    // DATE PARSE & VALIDATION
    // Compare dates properly: event end_date is typically 00:00:00
    // So we need to add a full day to include the entire end date
    // =====================================================

    const sessionStart = new Date(req.body.start_datetime);
    const sessionEnd = new Date(req.body.end_datetime);
    const eventStart = new Date(event.start_date);
    const eventEnd = new Date(event.end_date);

    // Add 1 day to eventEnd to include the entire last day of the event
    const eventEndWithFullDay = new Date(eventEnd);
    eventEndWithFullDay.setDate(eventEndWithFullDay.getDate() + 1);

    if (sessionStart < eventStart || sessionEnd > eventEndWithFullDay) {
      return res.status(400).json({
        message: "Session must be inside event dates"
      });
    }


    // =====================================================
    // PHOTO UPLOAD
    // =====================================================

    let photoUrl = null;

    if (req.files?.photo?.[0]) {

      photoUrl = await uploadToS3(
        req.files.photo[0],
        user.id,
        "session-photos"
      );

    }
    else if (req.body.photo_base64 || req.body.photo) {

      const photoData = req.body.photo_base64 || req.body.photo;
      photoUrl = await uploadToS3(
        photoData,
        user.id,
        "session-photos"
      );

    }


    // =====================================================
    // LOCATION
    // =====================================================

    let sessionLocation = req.body.location;

    if (
      req.body.use_event_location === true ||
      req.body.use_event_location === "true"
    ) {
      sessionLocation = event.location || event.venue;
    }


    // =====================================================
    // HALL VALIDATION
    // =====================================================

    let hall = null;

    if (req.body.conference_hall_id) {

      hall = await ConferenceHall.findById(
        req.body.conference_hall_id
      );

      if (!hall) {

        return res.status(400).json({
          message: "Hall not found"
        });

      }


      // =====================================================
      // SAME HALL CONFLICT CHECK (WORKS CORRECTLY NOW)
      // =====================================================

      const conflict = await Session.findOne({

        conference_hall_id: hall._id,

        start_datetime: { $lt: sessionEnd },

        end_datetime: { $gt: sessionStart }

      });


      if (conflict) {

        return res.status(400).json({
          message: "Hall already booked in this time slot"
        });

      }

    }


    // =====================================================
    // CREATE SESSION
    // =====================================================

    const session = await Session.create({

      event_id: eventId,

      name: req.body.name,

      type: req.body.type,

      category: req.body.category,

      description: req.body.description,

      start_datetime: sessionStart,

      end_datetime: sessionEnd,

      location: sessionLocation,

      meeting_url: req.body.meeting_url,

      photo: photoUrl,

      capacity: req.body.capacity,

      conference_hall_id: hall?._id,

      created_by: user.id

    });


    // =====================================================
    // ASSIGN HALL
    // =====================================================

    if (hall) {

      await ConferenceHall.updateOne(

        { _id: hall._id },

        {
          session_id: session._id,
          start_date: sessionStart,
          end_date: sessionEnd,
          status: "booked"
        }

      );

    }


    // =====================================================
    // CREATE AGENDAS
    // =====================================================

    if (req.body.agendas) {
      let agendasData = req.body.agendas;

      // Parse if it's a string (e.g. from form-data)
      if (typeof agendasData === "string") {
        try {
          agendasData = JSON.parse(agendasData);
        } catch (err) {
          console.error("Invalid agendas JSON string", err);
          agendasData = [];
        }
      }

      if (Array.isArray(agendasData)) {
        for (const agendaItem of agendasData) {
          const speakerIds = Array.isArray(agendaItem.speakers)
            ? agendaItem.speakers.map(s => s.user_id).filter(Boolean)
            : [];

          await Agenda.create({
            session_id: session._id,
            title: agendaItem.title,
            start_time: agendaItem.start_time,
            end_time: agendaItem.end_time,
            description: agendaItem.description || "",
            speaker_ids: speakerIds,
            created_by: user.id
          });
        }
      }
    }


    // =====================================================
    // SUCCESS RESPONSE
    // =====================================================

    // Generate signed URL for photo if stored in S3
    const sessionObj = session.toObject ? session.toObject() : session;
    if (sessionObj.photo && !sessionObj.photo.startsWith("http")) {
      try {
        sessionObj.photo_signed_url = await getSignedS3Url(sessionObj.photo);
      } catch (err) {
        console.error("Error generating signed URL for session photo:", err);
      }
    }

    return res.status(201).json({
      message: "Session created successfully",
      session: sessionObj
    });


  }
  catch (error) {

    console.error(error);

    return res.status(500).json({

      message: error.message

    });

  }
};

/**
 * =========================================================
 * GET ALL SESSIONS (ACROSS ALL EVENTS)
 * =========================================================
 */
export const getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy = 'start_datetime' } = req.query;
    const skip = (page - 1) * limit;

    // Build query filter
    let query = {};

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
      ];
    }

    // Get all sessions with pagination
    const sessions = await Session.find(query)
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('event_id', 'name start_date end_date venue')
      .lean();

    // Add signed S3 URLs for session photos
    await Promise.all(
      sessions.map(async (s) => {
        if (s.photo && !s.photo.startsWith('http')) {
          try {
            s.photo_signed_url = await getSignedS3Url(s.photo);
          } catch (err) {
            console.error('Error generating signed URL for session photo:', err);
          }
        }
      })
    );

    // Get total count for pagination
    const totalCount = await Session.countDocuments(query);

    return res.status(200).json({
      message: "All sessions retrieved successfully",
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit),
      },
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    return res.status(500).json({
      message: "Failed to fetch sessions",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * GET ALL SESSIONS FOR AN EVENT
 * =========================================================
 */
export const getEventSessions = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get all sessions for this event
    const sessions = await Session.find({ event_id: eventId }).sort({
      start_datetime: 1
    }).lean();

    // For each session, get speakers and attendees
    const sessionsWithParticipants = await Promise.all(
      sessions.map(async (session) => {
        // Get speakers for this session
        const speakers = await SessionParticipant.find({
          session_id: session._id,
          participant_type: "speaker",
        }).lean();

        // Populate speaker details
        const speakerDetails = await Promise.all(
          speakers.map(async (sp) => {
            const user = await User.findOne({ id: sp.user_id }).select(
              "id first_name middle_name last_name name email documents.photo_url organisation designation"
            ).lean();

            if (!user) return null;

            let photo_signed_url = null;
            if (user.documents?.photo_url) {
              try {
                photo_signed_url = await getSignedS3Url(user.documents.photo_url);
              } catch (err) {
                console.error("Error generating signed URL:", err);
              }
            }

            return {
              user_id: user.id,
              user_name: user.name || `${user.first_name} ${user.last_name || ""}`.trim(),
              email: user.email,
              photo_url: user.documents?.photo_url || null,
              organisation: user.organisation || null,
              designation: user.designation || null,
              photo_signed_url,
              participant_type: "speaker",
            };
          })
        );

        // Get attendees for this session
        const attendees = await SessionParticipant.find({
          session_id: session._id,
          participant_type: "attendee",
        }).lean();

        // Populate attendee details
        const attendeeDetails = await Promise.all(
          attendees.map(async (ap) => {
            const user = await User.findOne({ id: ap.user_id }).select(
              "id first_name middle_name last_name name email documents.photo_url organisation designation"
            ).lean();

            if (!user) return null;

            let photo_signed_url = null;
            if (user.documents?.photo_url) {
              try {
                photo_signed_url = await getSignedS3Url(user.documents.photo_url);
              } catch (err) {
                console.error("Error generating signed URL:", err);
              }
            }

            return {
              user_id: user.id,
              user_name: user.name || `${user.first_name} ${user.last_name || ""}`.trim(),
              email: user.email,
              photo_url: user.documents?.photo_url || null,
              organisation: user.organisation || null,
              designation: user.designation || null,
              photo_signed_url,
              participant_type: "attendee",
            };
          })
        );

        // Get agenda items for this session
        const agendas = await Agenda.find({
          session_id: session._id,
        }).sort({ start_time: 1 }).lean();

        // Populate speaker details for each agenda item
        const agendaDetails = await Promise.all(
          agendas.map(async (agenda) => {
            // Get speaker details for agenda if speaker_ids exist
            const agendaSpeakers = await Promise.all(
              (agenda.speaker_ids || []).map(async (speakerId) => {
                const user = await User.findOne({ id: speakerId }).select(
                  "id first_name middle_name last_name name email documents.photo_url organisation designation"
                ).lean();

                if (!user) return null;

                let photo_signed_url = null;
                if (user.documents?.photo_url) {
                  try {
                    photo_signed_url = await getSignedS3Url(user.documents.photo_url);
                  } catch (err) {
                    console.error("Error generating signed URL:", err);
                  }
                }

                return {
                  user_id: user.id,
                  user_name: user.name || `${user.first_name} ${user.last_name || ""}`.trim(),
                  email: user.email,
                  photo_url: user.documents?.photo_url || null,
                  organisation: user.organisation || null,
                  designation: user.designation || null,
                  photo_signed_url,
                };
              })
            );

            return {
              _id: agenda._id,
              title: agenda.title,
              start_time: agenda.start_time,
              end_time: agenda.end_time,
              description: agenda.description || "",
              speakers: agendaSpeakers.filter(s => s !== null),
            };
          })
        );

        // Attach signed URL for session photo
        if (session.photo && !session.photo.startsWith('http')) {
          try {
            session.photo_signed_url = await getSignedS3Url(session.photo);
          } catch (err) {
            console.error('Error generating signed URL for session photo:', err);
          }
        }

        return {
          ...session,
          speakers: speakerDetails.filter(s => s !== null),
          attendees: attendeeDetails.filter(a => a !== null),
          agendas: agendaDetails,
        };
      })
    );

    return res.status(200).json({
      message: "Sessions retrieved successfully",
      count: sessionsWithParticipants.length,
      sessions: sessionsWithParticipants
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res.status(500).json({
      message: "Failed to fetch sessions",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * GET SINGLE SESSION
 * =========================================================
 */
export const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId).populate("event_id");

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get speakers assigned to this session
    const speakers = await SessionParticipant.find({
      session_id: sessionId,
      participant_type: "speaker",
    }).lean();

    // Populate speaker details from User model
    const speakerDetails = await Promise.all(
      speakers.map(async (sp) => {
        const user = await User.findOne({ id: sp.user_id }).select(
          "id first_name middle_name last_name name email documents.photo_url organisation designation"
        ).lean();

        if (!user) return null;

        // Generate signed URL for photo
        let photo_signed_url = null;
        if (user.documents?.photo_url) {
          try {
            photo_signed_url = await getSignedS3Url(user.documents.photo_url);
          } catch (err) {
            console.error("Error generating signed URL:", err);
          }
        }

        return {
          user_id: user.id,
          user_name: user.name || `${user.first_name} ${user.last_name || ""}`.trim(),
          email: user.email,
          photo_url: user.documents?.photo_url || null,
          organisation: user.organisation || null,
          designation: user.designation || null,
          photo_signed_url,
          participant_type: "speaker",
          check_in_time: sp.check_in_time,
          attendance_status: sp.attendance_status,
        };
      })
    );

    // Get attendees assigned to this session
    const attendees = await SessionParticipant.find({
      session_id: sessionId,
      participant_type: "attendee",
    }).lean();

    // Populate attendee details from User model
    const attendeeDetails = await Promise.all(
      attendees.map(async (ap) => {
        const user = await User.findOne({ id: ap.user_id }).select(
          "id first_name middle_name last_name name email documents.photo_url organisation designation"
        ).lean();

        if (!user) return null;

        // Generate signed URL for photo
        let photo_signed_url = null;
        if (user.documents?.photo_url) {
          try {
            photo_signed_url = await getSignedS3Url(user.documents.photo_url);
          } catch (err) {
            console.error("Error generating signed URL:", err);
          }
        }

        return {
          user_id: user.id,
          user_name: user.name || `${user.first_name} ${user.last_name || ""}`.trim(),
          email: user.email,
          photo_url: user.documents?.photo_url || null,
          organisation: user.organisation || null,
          designation: user.designation || null,
          photo_signed_url,
          participant_type: "attendee",
          check_in_time: ap.check_in_time,
          attendance_status: ap.attendance_status,
        };
      })
    );

    // Attach signed URL for session photo
    let sessionObj = session.toObject ? session.toObject() : session;
    if (sessionObj.photo && !sessionObj.photo.startsWith('http')) {
      try {
        sessionObj.photo_signed_url = await getSignedS3Url(sessionObj.photo);
      } catch (err) {
        console.error('Error generating signed URL for session photo:', err);
      }
    }

    return res.status(200).json({
      message: "Session retrieved successfully",
      session: sessionObj,
      speakers: speakerDetails.filter(s => s !== null),
      attendees: attendeeDetails.filter(a => a !== null),
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({
      message: "Failed to fetch session",
      error: error.message
    });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findOne({
      id: req.user.user_id
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        message: "Session not found"
      });
    }

    const newStart = req.body.start_datetime
      ? new Date(req.body.start_datetime)
      : session.start_datetime;

    const newEnd = req.body.end_datetime
      ? new Date(req.body.end_datetime)
      : session.end_datetime;

    const newHallId =
      req.body.conference_hall_id || session.conference_hall_id;

    if (newHallId) {
      const conflict = await Session.findOne({
        _id: { $ne: sessionId },
        conference_hall_id: newHallId,
        start_datetime: { $lt: newEnd },
        end_datetime: { $gt: newStart }
      });

      if (conflict) {
        return res.status(400).json({
          message: "Hall already booked for this time slot"
        });
      }
    }

    if (req.files?.photo?.[0]) {
      const photoKey = await uploadToS3(
        req.files.photo[0],
        user.id,
        "session-photos"
      );
      req.body.photo = photoKey;
    } else if (req.body.photo_base64) {
      const photoKey = await uploadToS3(
        req.body.photo_base64,
        user.id,
        "session-photos"
      );
      req.body.photo = photoKey;
    }

    const event = await Event.findById(session.event_id);
    if (req.body.use_event_location === true || req.body.use_event_location === "true") {
      req.body.location = event?.location || event?.venue;
    }

    const oldHallId = session.conference_hall_id;

    const allowedUpdates = [
      "name",
      "type",
      "category",
      "description",
      "start_datetime",
      "end_datetime",
      "use_event_location",
      "location",
      "meeting_url",
      "photo",
      "capacity",
      "conference_hall_id"
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    await session.save();

    if (
      session.conference_hall_id &&
      session.conference_hall_id.toString() !== newHallId?.toString()
    ) {
      await ConferenceHall.updateOne(
        { _id: session.conference_hall_id },
        {
          session_id: null,
          start_date: null,
          end_date: null,
          status: "available"
        }
      );
    }

    session.name = req.body.name ?? session.name;
    session.type = req.body.type ?? session.type;
    session.category = req.body.category ?? session.category;
    session.description = req.body.description ?? session.description;
    session.start_datetime = newStart;
    session.end_datetime = newEnd;
    session.location = req.body.location ?? session.location;
    session.capacity = req.body.capacity ?? session.capacity;
    session.conference_hall_id = newHallId;

    await session.save();

    if (newHallId) {
      await ConferenceHall.updateOne(
        { _id: newHallId },
        {
          session_id: session._id,
          start_date: newStart,
          end_date: newEnd,
          status: "booked"
        }
      );
    }

    if (req.body.agendas) {
      let agendasData = req.body.agendas;

      if (typeof agendasData === "string") {
        try {
          agendasData = JSON.parse(agendasData);
        } catch (err) {
          console.error("Invalid agendas JSON string", err);
          agendasData = [];
        }
      }

      if (Array.isArray(agendasData)) {
        const agendaIdsToKeep = [];

        for (const agendaItem of agendasData) {
          const speakerIds = Array.isArray(agendaItem.speakers)
            ? agendaItem.speakers.map(s => s.user_id).filter(Boolean)
            : [];

          let agendaId = agendaItem._id;

          if (agendaId && mongoose.Types.ObjectId.isValid(agendaId)) {
            await Agenda.findByIdAndUpdate(agendaId, {
              title: agendaItem.title,
              start_time: agendaItem.start_time,
              end_time: agendaItem.end_time,
              description: agendaItem.description || "",
              speaker_ids: speakerIds,
              updated_by: user.id
            });
            agendaIdsToKeep.push(agendaId);
          } else {
            const newAgenda = await Agenda.create({
              session_id: session._id,
              title: agendaItem.title,
              start_time: agendaItem.start_time,
              end_time: agendaItem.end_time,
              description: agendaItem.description || "",
              speaker_ids: speakerIds,
              created_by: user.id
            });
            agendaIdsToKeep.push(newAgenda._id.toString());
          }
        }

        await Agenda.deleteMany({
          session_id: session._id,
          _id: { $nin: agendaIdsToKeep }
        });
      }
    }

    try {
      const updater = await User.findOne({ id: req.user.user_id });
      const eventDetails = await Event.findById(session.event_id);
      
      if (updater && updater.fcm_token) {
        const eventName = eventDetails?.name || "the event";
        await sendPushNotification(
          updater.fcm_token,
          "Session Updated 📅",
          `Session '${session.name}' has been successfully updated in ${eventName}.`
        );
        console.log(`✅ Push sent to Updater (${updater.email}) regarding Session Update.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Session Update notice:", pushErr.message);
    }
    return res.status(200).json({
      message: "Session updated successfully",
      session
    });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message
    });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        message: "Session not found"
      });
    }

    // =====================================================
    // FREE HALL
    // =====================================================
    if (session.conference_hall_id) {
      await ConferenceHall.updateOne(
        { id: session.conference_hall_id },
        {
          session_id: null,
          session_name: null,
          start_date: null,
          end_date: null,
          status: "available"
        }
      );
    }

    await Session.findByIdAndDelete(sessionId);
    return res.status(200).json({
      message: "Session deleted successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to delete session",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * ADD PARTICIPANTS TO SESSION (BULK OR SINGLE)
 * =========================================================
 * - Adds one or multiple users to a session
 * - Validates users are registered in the event
 * - Prevents duplicate participants
 * =========================================================
 */
export const addParticipantsToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    let { user_ids, participant_type } = req.body;

    // Ensure user_ids is an array
    if (!Array.isArray(user_ids)) {
      user_ids = [user_ids];
    }

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Check if event exists
    const event = await Event.findById(session.event_id);
    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    const added = [];
    const failed = [];

    // Process each user
    for (const userId of user_ids) {
      try {
        // Check if already a participant in this session with same type
        const existingParticipant = await SessionParticipant.findOne({
          session_id: sessionId,
          user_id: userId,
          participant_type: participant_type
        });

        if (existingParticipant) {
          failed.push({
            user_id: userId,
            reason: `User is already a ${participant_type} in this session`
          });
          continue;
        }

        // Create session participant
        const sessionParticipant = new SessionParticipant({
          session_id: sessionId,
          user_id: userId,
          event_id: session.event_id,
          participant_type: participant_type,
          registration_status: "registered"
        });

        await sessionParticipant.save();
        added.push({
          user_id: userId,
          participant_id: sessionParticipant._id,
          participant_type: participant_type
        });
      } catch (error) {
        failed.push({
          user_id: userId,
          reason: error.message
        });
      }
    }

    return res.status(201).json({
      message: `${participant_type === 'speaker' ? 'Speakers' : 'Attendees'} added to session`,
      added_count: added.length,
      failed_count: failed.length,
      added,
      failed: failed.length > 0 ? failed : undefined
    });
  } catch (error) {
    console.error("Error adding participants:", error);
    return res.status(500).json({
      message: "Failed to add participants",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * GET SESSION PARTICIPANTS
 * =========================================================
 * - Get all participants of a session
 * - Includes user details
 * =========================================================
 */
export const getSessionParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const participants = await SessionParticipant.find({
      session_id: sessionId
    }).sort({ registered_at: -1 });

    // Get user details for each participant
    const participantDetails = await Promise.all(
      participants.map(async (p) => {
        const user = await User.findOne({ id: p.user_id });

        // Get signed S3 URL for user photo if it exists
        let userPhotoUrl = null;
        if (user?.documents?.photo_url) {
          userPhotoUrl = await getSignedS3Url(user.documents.photo_url);
        }

        return {
          _id: p._id,
          session_id: p.session_id,
          user_id: p.user_id,
          user_name: user?.name || "Unknown",
          user_email: user?.email || "Unknown",
          user_photo: userPhotoUrl,
          organisation: user?.organisation || null,
          designation: user?.designation || null,
          about: user?.about_yourself || null,
          social_media: user?.social_media || null,
          participant_type: p.participant_type,
          registration_status: p.registration_status,
          attendance_status: p.attendance_status,
          check_in_time: p.check_in_time,
          registered_at: p.registered_at
        };
      })
    );

    // Group participants by type
    const speakers = participantDetails.filter(p => p.participant_type === "speaker");
    const attendees = participantDetails.filter(p => p.participant_type === "attendee");

    return res.status(200).json({
      message: "Session participants retrieved successfully",
      total_count: participantDetails.length,
      speakers_count: speakers.length,
      attendees_count: attendees.length,
      speakers,
      attendees,
      all_participants: participantDetails
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return res.status(500).json({
      message: "Failed to fetch participants",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * REMOVE PARTICIPANT FROM SESSION
 * =========================================================
 */
export const removeParticipantFromSession = async (req, res) => {
  try {
    const { sessionId, userId } = req.params;

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Find and delete participant
    const result = await SessionParticipant.findOneAndDelete({
      session_id: sessionId,
      user_id: userId
    });

    if (!result) {
      return res.status(404).json({
        message: "Participant not found in this session"
      });
    }

    return res.status(200).json({
      message: "Participant removed from session successfully"
    });
  } catch (error) {
    console.error("Error removing participant:", error);
    return res.status(500).json({
      message: "Failed to remove participant",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * CHECK IN PARTICIPANT (MARK ATTENDANCE)
 * =========================================================
 */
export const checkInParticipant = async (req, res) => {
  try {
    const { sessionId, userId } = req.params;

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Find participant
    const participant = await SessionParticipant.findOne({
      session_id: sessionId,
      user_id: userId
    });

    if (!participant) {
      return res.status(404).json({
        message: "Participant not found in this session"
      });
    }

    // Mark attendance
    participant.attendance_status = "attended";
    participant.check_in_time = new Date();

    await participant.save();

    return res.status(200).json({
      message: "Participant checked in successfully",
      participant
    });
  } catch (error) {
    console.error("Error checking in participant:", error);
    return res.status(500).json({
      message: "Failed to check in participant",
      error: error.message
    });
  }
};