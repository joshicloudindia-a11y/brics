import mongoose from "mongoose";
import Agenda from "../models/Agenda.js";
import Session from "../models/Session.js";
import User from "../models/User.js";
import Activity from "../models/Activity.js";
import { sanitizeHtmlString } from "../data/sanitize.js";
import { sendPushNotification } from "../utils/notification.js";

const formatTimeFromDate = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const validateSpeakerIds = async (speakerIds) => {
  if (!speakerIds || speakerIds.length === 0) {
    return { valid: true, speakers: [] };
  }

  const validObjectIds = speakerIds.filter(id => mongoose.Types.ObjectId.isValid(id));
  
  const query = {
    $or: [
      { id: { $in: speakerIds } }, 
    ]
  };

  if (validObjectIds.length > 0) {
    query.$or.push({
      _id: { $in: validObjectIds.map(id => new mongoose.Types.ObjectId(id)) }
    });
  }

  // Query Users table, not Speaker table
  const users = await User.find(query);
  
  // if (users.length > 0) {
  //   console.log('✅ User IDs found:', users.map(u => ({ _id: u._id, id: u.id, name: u.first_name })));
  // }

  return {
    valid: users.length === speakerIds.length,
    speakers: users, // Return users, but keep property name for compatibility
    foundCount: users.length,
    expectedCount: speakerIds.length
  };
};

/**
 * Convert HH:mm time string to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if two time ranges overlap
 */
const checkTimeOverlap = (start1, end1, start2, end2) => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
};

/**
 * Validate times are within session times
 */
const validateTimesWithinSession = (session, startTime, endTime) => {
  const sessionStart = new Date(session.start_datetime);
  const sessionEnd = new Date(session.end_datetime);
  
  // Extract HH:mm from session datetime
  const sessionStartTime = formatTimeFromDate(sessionStart);
  const sessionEndTime = formatTimeFromDate(sessionEnd);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const sessionStartMinutes = timeToMinutes(sessionStartTime);
  const sessionEndMinutes = timeToMinutes(sessionEndTime);

  if (startMinutes < sessionStartMinutes || endMinutes > sessionEndMinutes) {
    return {
      valid: false,
      message: `Agenda times must be within session times (${sessionStartTime} - ${sessionEndTime})`
    };
  }

  return { valid: true };
};

/**
 * Check for time conflicts in agendas
 */
const findTimeConflicts = async (sessionId, startTime, endTime, excludeAgendaId = null) => {
  const query = {
    session_id: sessionId,
    is_deleted: false
  };

  if (excludeAgendaId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeAgendaId) };
  }

  const existingAgendas = await Agenda.find(query).select("_id title start_time end_time");

  const conflicts = existingAgendas.filter(agenda => 
    checkTimeOverlap(startTime, endTime, agenda.start_time, agenda.end_time)
  );

  return conflicts;
};

/**
 * =========================================================
 * GET ALL AGENDAS FOR A SESSION
 * =========================================================
 * @route   GET /api/sessions/:sessionId/agendas
 * @access  Private
 */
export const getSessionAgendas = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { include_deleted = false, sort = "start_time" } = req.query;

    // =====================================================
    // SESSION CHECK
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // =====================================================
    // FETCH AGENDAS
    // =====================================================
    const query = { session_id: sessionId };
    
    if (!include_deleted || include_deleted === "false") {
      query.is_deleted = false;
    }

    const agendas = await Agenda.find(query)
      .populate("speakers", "id first_name last_name middle_name position organisation image")
      .sort(sort)
      .lean();

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      agendas,
      count: agendas.length
    });

  } catch (error) {
    console.error("Error fetching session agendas:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agendas",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * GET SINGLE AGENDA BY ID
 * =========================================================
 * @route   GET /api/agendas/:agendaId
 * @access  Private
 */
export const getAgendaById = async (req, res) => {
  try {
    const { agendaId } = req.params;

    // =====================================================
    // VALIDATION
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agenda ID"
      });
    }

    // =====================================================
    // FETCH AGENDA
    // =====================================================
    const agenda = await Agenda.findById(agendaId)
      .populate("speakers", "id first_name last_name middle_name position organisation image")
      .lean();

    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: "Agenda not found"
      });
    }

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      agenda
    });

  } catch (error) {
    console.error("Error fetching agenda:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agenda",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * CREATE AGENDA(S) FOR A SESSION
 * =========================================================
 * @route   POST /api/sessions/:sessionId/agendas
 * @access  Private (SUPER ADMIN, EVENT ADMIN, SESSION MANAGER)
 */
export const createAgendas = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agendas } = req.body;

    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const createdAgendas = [];
    const errors = [];

    for (let i = 0; i < agendas.length; i++) {
      const agendaData = agendas[i];

      agendaData.title = sanitizeHtmlString(agendaData.title);
      if (agendaData.description) {
        agendaData.description = sanitizeHtmlString(agendaData.description);
      }

      if (timeToMinutes(agendaData.end_time) <= timeToMinutes(agendaData.start_time)) {
        errors.push({
          index: i,
          title: agendaData.title,
          message: "End time must be after start time"
        });
        continue;
      }

      const conflicts = await findTimeConflicts(
        sessionId,
        agendaData.start_time,
        agendaData.end_time
      );

      if (conflicts.length > 0) {
        errors.push({
          index: i,
          title: agendaData.title,
          message: `Time slot conflicts with existing agenda: "${conflicts[0].title}"`,
          conflicts: conflicts.map(c => ({
            id: c._id,
            title: c.title,
            start_time: c.start_time,
            end_time: c.end_time
          }))
        });
        continue;
      }

      if (agendaData.speaker_ids && agendaData.speaker_ids.length > 0) {
        const validation = await validateSpeakerIds(agendaData.speaker_ids);
        
        if (!validation.valid) {
          errors.push({
            index: i,
            title: agendaData.title,
            message: `One or more speaker IDs are invalid (found ${validation.foundCount} of ${validation.expectedCount})`
          });
          continue;
        }

        if (validation.speakers.length > 0) {
          agendaData.speaker_ids = validation.speakers.map(s => s.id);
        }
      }

      const agenda = new Agenda({
        session_id: sessionId,
        title: agendaData.title,
        start_time: agendaData.start_time,
        end_time: agendaData.end_time,
        speaker_ids: agendaData.speaker_ids || [],
        description: agendaData.description || "",
        created_by: user.id,
        updated_by: user.id
      });

      await agenda.save();
      createdAgendas.push(agenda);
    }

    if (errors.length > 0 && createdAgendas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to create any agenda",
        errors
      });
    }

    try {
      if (createdAgendas.length > 0 && user && user.fcm_token) {
        await sendPushNotification(
          user.fcm_token,
          "Agenda Created 📝",
          `Agenda created for Session '${session.name}'.`
        );
        console.log(`✅ Push sent to Admin (${user.email}) regarding Agenda Creation.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Agenda Creation notice:", pushErr.message);
    }
    const populatedAgendas = await Agenda.find({
      _id: { $in: createdAgendas.map(a => a._id) }
    }).populate("speakers", "id first_name last_name middle_name position organisation image");

    if (createdAgendas.length > 0) {
      await Activity.logActivity({
        user: user._id,
        activityType: 'AGENDA_CREATE',
        description: `Created ${createdAgendas.length} agenda(s) for session`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'SUCCESS',
        resourceType: 'AGENDA',
        resourceId: createdAgendas[0]._id,
        metadata: {
          sessionId,
          agendaCount: createdAgendas.length,
          agendaTitles: createdAgendas.map(a => a.title)
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: `${createdAgendas.length} agenda(s) created successfully`,
      agendas: populatedAgendas,
      count: createdAgendas.length,
      ...(errors.length > 0 && { errors }) 
    });

  } catch (error) {
    console.error("Error creating agendas:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create agendas",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * UPDATE AGENDA
 * =========================================================
 * @route   PUT /api/agendas/:agendaId
 * @access  Private (SUPER ADMIN, EVENT ADMIN, SESSION MANAGER)
 */
export const updateAgenda = async (req, res) => {
  try {
    const { agendaId } = req.params;
    const updates = req.body;

    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agenda ID"
      });
    }

    const agenda = await Agenda.findById(agendaId);
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: "Agenda not found"
      });
    }

    if (agenda.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot update deleted agenda"
      });
    }

    const session = await Session.findById(agenda.session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Associated session not found"
      });
    }

    if (updates.title) {
      updates.title = sanitizeHtmlString(updates.title);
    }
    if (updates.description) {
      updates.description = sanitizeHtmlString(updates.description);
    }

    const newStartTime = updates.start_time || agenda.start_time;
    const newEndTime = updates.end_time || agenda.end_time;

    if (timeToMinutes(newEndTime) <= timeToMinutes(newStartTime)) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time"
      });
    }

    if (updates.start_time || updates.end_time) {
      const conflicts = await findTimeConflicts(
        agenda.session_id,
        newStartTime,
        newEndTime,
        agendaId
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Time slot conflicts with existing agenda: "${conflicts[0].title}"`,
          conflicts: conflicts.map(c => ({
            id: c._id,
            title: c.title,
            start_time: c.start_time,
            end_time: c.end_time
          }))
        });
      }
    }

    if (updates.speaker_ids) {
      if (updates.speaker_ids.length > 0) {
        const validation = await validateSpeakerIds(updates.speaker_ids);
        
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: `One or more speaker IDs are invalid (found ${validation.foundCount} of ${validation.expectedCount})`
          });
        }
        
        if (validation.speakers.length > 0) {
          updates.speaker_ids = validation.speakers.map(s => s.id);
        }
      }
    }

    updates.updated_by = user.id;

    const updatedAgenda = await Agenda.findByIdAndUpdate(
      agendaId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("speakers", "id first_name last_name middle_name position organisation image");

    try {
      if (user && user.fcm_token) {
        await sendPushNotification(
          user.fcm_token,
          "Agenda Updated 📝",
          `Agenda updated for Session '${session.name}'.`
        );
        console.log(`✅ Push sent to Admin (${user.email}) regarding Agenda Update.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Agenda Update notice:", pushErr.message);
    }
    await Activity.logActivity({
      user: user._id,
      activityType: 'AGENDA_UPDATE',
      description: `Updated agenda: ${updatedAgenda.title}`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'AGENDA',
      resourceId: updatedAgenda._id,
      metadata: {
        sessionId: updatedAgenda.session_id,
        agendaTitle: updatedAgenda.title,
        updatedFields: Object.keys(updates)
      }
    });

    return res.status(200).json({
      success: true,
      message: "Agenda updated successfully",
      agenda: updatedAgenda
    });

  } catch (error) {
    console.error("Error updating agenda:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update agenda",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * DELETE AGENDA (SOFT DELETE)
 * =========================================================
 * @route   DELETE /api/agendas/:agendaId
 * @access  Private (SUPER ADMIN, EVENT ADMIN)
 */
export const deleteAgenda = async (req, res) => {
  try {
    const { agendaId } = req.params;

    // =====================================================
    // USER CHECK
    // =====================================================
    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // =====================================================
    // AGENDA CHECK
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agenda ID"
      });
    }

    const agenda = await Agenda.findById(agendaId);
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: "Agenda not found"
      });
    }

    if (agenda.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Agenda is already deleted"
      });
    }

    // =====================================================
    // SOFT DELETE
    // =====================================================
    const agendaTitle = agenda.title;
    const agendaSessionId = agenda.session_id;
    
    agenda.is_deleted = true;
    agenda.updated_by = user.id;
    await agenda.save();

    // =====================================================
    // ACTIVITY LOGGING
    // =====================================================
    await Activity.logActivity({
      user: user._id,
      activityType: 'AGENDA_DELETE',
      description: `Deleted agenda: ${agendaTitle}`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'AGENDA',
      resourceId: agenda._id,
      metadata: {
        sessionId: agendaSessionId,
        agendaTitle
      }
    });

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      message: "Agenda deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting agenda:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete agenda",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * VALIDATE TIME SLOT
 * =========================================================
 * @route   POST /api/sessions/:sessionId/agendas/validate-time
 * @access  Private
 */
export const validateTimeSlot = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { start_time, end_time, exclude_agenda_id } = req.body;

    // =====================================================
    // SESSION CHECK
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // =====================================================
    // VALIDATE BASIC TIME LOGIC
    // =====================================================
    if (timeToMinutes(end_time) <= timeToMinutes(start_time)) {
      return res.status(200).json({
        success: true,
        is_valid: false,
        message: "End time must be after start time",
        conflicts: []
      });
    }

    // Note: We don't validate times within session datetime bounds because:
    // - Agendas store only time (HH:mm), not full datetime
    // - Sessions can span multiple days
    // - Main validation is preventing time overlaps between agendas

    // =====================================================
    // CHECK FOR CONFLICTS
    // =====================================================
    const conflicts = await findTimeConflicts(
      sessionId,
      start_time,
      end_time,
      exclude_agenda_id
    );

    // =====================================================
    // RESPONSE
    // =====================================================
    if (conflicts.length > 0) {
      return res.status(200).json({
        success: true,
        is_valid: false,
        message: "Time slot conflicts with existing agenda",
        conflicts: conflicts.map(c => ({
          _id: c._id,
          title: c.title,
          start_time: c.start_time,
          end_time: c.end_time
        }))
      });
    }

    return res.status(200).json({
      success: true,
      is_valid: true,
      message: "Time slot is available",
      conflicts: []
    });

  } catch (error) {
    console.error("Error validating time slot:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate time slot",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * ADD SPEAKERS TO AGENDA
 * =========================================================
 * @route   POST /api/agendas/:agendaId/speakers
 * @access  Private
 */
export const addSpeakersToAgenda = async (req, res) => {
  try {
    const { agendaId } = req.params;
    const { speaker_ids } = req.body;

    // =====================================================
    // USER CHECK
    // =====================================================
    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // =====================================================
    // AGENDA CHECK
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agenda ID"
      });
    }

    const agenda = await Agenda.findById(agendaId);
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: "Agenda not found"
      });
    }

    if (agenda.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify deleted agenda"
      });
    }

    // =====================================================
    // VALIDATE SPEAKER IDS
    // =====================================================
    const validation = await validateSpeakerIds(speaker_ids);
    
    if (!validation.valid) {
      return res.status(404).json({
        success: false,
        message: `One or more speaker IDs are invalid (found ${validation.foundCount} of ${validation.expectedCount})`
      });
    }

    // Get the validated speaker IDs (converted from ObjectId to custom id if needed)
    const validatedSpeakerIds = validation.speakers.map(s => s.id);

    // =====================================================
    // ADD SPEAKERS (AVOID DUPLICATES)
    // =====================================================
    const existingSpeakerIds = agenda.speaker_ids || [];
    const newSpeakerIds = validatedSpeakerIds.filter(id => !existingSpeakerIds.includes(id));
    
    if (newSpeakerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All speakers are already added to this agenda"
      });
    }

    const updatedSpeakerIds = [...existingSpeakerIds, ...newSpeakerIds];

    agenda.speaker_ids = updatedSpeakerIds;
    agenda.updated_by = user.id;
    await agenda.save();

    // =====================================================
    // FETCH WITH POPULATED SPEAKERS
    // =====================================================
    const updatedAgenda = await Agenda.findById(agendaId)
      .populate("speakers", "id first_name last_name middle_name position organisation image");

    // =====================================================
    // ACTIVITY LOGGING
    // =====================================================
    if (newSpeakerIds.length > 0) {
      await Activity.logActivity({
        user: user._id,
        activityType: 'AGENDA_SPEAKER_ADD',
        description: `Added ${newSpeakerIds.length} speaker(s) to agenda: ${agenda.title}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'SUCCESS',
        resourceType: 'AGENDA',
        resourceId: agenda._id,
        metadata: {
          sessionId: agenda.session_id,
          agendaTitle: agenda.title,
          speakerIds: newSpeakerIds,
          speakerCount: newSpeakerIds.length
        }
      });
    }

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      message: "Speakers added successfully",
      agenda: updatedAgenda
    });

  } catch (error) {
    console.error("Error adding speakers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add speakers",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * REMOVE SPEAKER FROM AGENDA
 * =========================================================
 * @route   DELETE /api/agendas/:agendaId/speakers/:speakerId
 * @access  Private
 */
export const removeSpeakerFromAgenda = async (req, res) => {
  try {
    const { agendaId, speakerId } = req.params;

    // =====================================================
    // USER CHECK
    // =====================================================
    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // =====================================================
    // AGENDA CHECK
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agenda ID"
      });
    }

    const agenda = await Agenda.findById(agendaId);
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: "Agenda not found"
      });
    }

    if (agenda.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify deleted agenda"
      });
    }

    // =====================================================
    // REMOVE SPEAKER
    // =====================================================
    const speakerIndex = agenda.speaker_ids.indexOf(speakerId);
    
    if (speakerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Speaker not found in this agenda"
      });
    }

    const agendaTitle = agenda.title;
    const agendaSessionId = agenda.session_id;
    
    agenda.speaker_ids.splice(speakerIndex, 1);
    agenda.updated_by = user.id;
    await agenda.save();

    // =====================================================
    // ACTIVITY LOGGING
    // =====================================================
    await Activity.logActivity({
      user: user._id,
      activityType: 'AGENDA_SPEAKER_REMOVE',
      description: `Removed speaker from agenda: ${agendaTitle}`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'AGENDA',
      resourceId: agenda._id,
      metadata: {
        sessionId: agendaSessionId,
        agendaTitle,
        speakerId
      }
    });

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      message: "Speaker removed successfully"
    });

  } catch (error) {
    console.error("Error removing speaker:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove speaker",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * BULK DELETE AGENDAS
 * =========================================================
 * @route   DELETE /api/sessions/:sessionId/agendas/bulk
 * @access  Private (SUPER ADMIN, EVENT ADMIN)
 */
export const bulkDeleteAgendas = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agenda_ids } = req.body;

    // =====================================================
    // USER CHECK
    // =====================================================
    const user = await User.findOne({ id: req.user.user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // =====================================================
    // SESSION CHECK
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // =====================================================
    // BULK SOFT DELETE
    // =====================================================
    const result = await Agenda.updateMany(
      {
        _id: { $in: agenda_ids.map(id => new mongoose.Types.ObjectId(id)) },
        session_id: sessionId,
        is_deleted: false
      },
      {
        $set: {
          is_deleted: true,
          updated_by: user.id,
          updated_at: new Date()
        }
      }
    );

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} agenda(s) deleted successfully`,
      deleted_count: result.modifiedCount
    });

  } catch (error) {
    console.error("Error bulk deleting agendas:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk delete agendas",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * GET AGENDA SUMMARY FOR SESSION
 * =========================================================
 * @route   GET /api/sessions/:sessionId/agendas/summary
 * @access  Private
 */
export const getAgendaSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // =====================================================
    // SESSION CHECK
    // =====================================================
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // =====================================================
    // FETCH AGENDAS
    // =====================================================
    const agendas = await Agenda.find({
      session_id: sessionId,
      is_deleted: false
    });

    // =====================================================
    // CALCULATE STATISTICS
    // =====================================================
    let totalDurationMinutes = 0;
    const uniqueSpeakers = new Set();

    agendas.forEach(agenda => {
      // Calculate duration
      const startMinutes = timeToMinutes(agenda.start_time);
      const endMinutes = timeToMinutes(agenda.end_time);
      totalDurationMinutes += (endMinutes - startMinutes);

      // Collect unique speakers
      agenda.speaker_ids.forEach(speakerId => uniqueSpeakers.add(speakerId));
    });

    const hours = Math.floor(totalDurationMinutes / 60);
    const minutes = totalDurationMinutes % 60;

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      summary: {
        total_agendas: agendas.length,
        total_speakers: uniqueSpeakers.size,
        total_duration_minutes: totalDurationMinutes,
        total_duration_formatted: `${hours}h ${minutes}m`,
        session_name: session.name,
        session_date: session.start_datetime
      }
    });

  } catch (error) {
    console.error("Error fetching agenda summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agenda summary",
      error: error.message
    });
  }
};

/**
 * =========================================================
 * GET SPEAKER SCHEDULE (ALL AGENDAS FOR A SPEAKER)
 * =========================================================
 * @route   GET /api/speakers/:speakerId/schedule
 * @access  Private
 */
export const getSpeakerSchedule = async (req, res) => {
  try {
    const { speakerId } = req.params;

    // =====================================================
    // SPEAKER CHECK (speakers are users)
    // =====================================================
    const speaker = await User.findOne({ id: speakerId });
    if (!speaker) {
      return res.status(404).json({
        success: false,
        message: "User/Speaker not found"
      });
    }

    // =====================================================
    // FETCH AGENDAS
    // =====================================================
    const agendas = await Agenda.find({
      speaker_ids: speakerId,
      is_deleted: false
    })
      .populate("session_id", "name start_datetime end_datetime location event_id")
      .sort("start_time")
      .lean();

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      success: true,
      speaker: {
        id: speaker.id,
        name: `${speaker.first_name || ""} ${speaker.last_name || ""}`.trim(),
        position: speaker.position,
        organisation: speaker.organisation
      },
      schedule: agendas,
      count: agendas.length
    });

  } catch (error) {
    console.error("Error fetching speaker schedule:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch speaker schedule",
      error: error.message
    });
  }
};
