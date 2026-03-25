import express from "express";
import {
  createSession,
  getAllSessions,
  getEventSessions,
  getSessionById,
  updateSession,
  deleteSession,
  addParticipantsToSession,
  getSessionParticipants,
  removeParticipantFromSession,
  checkInParticipant
} from "../controllers/session.controller.js";

import { authMiddleware } from "../middlewares/auth.js";
import { uploadDocumentsSafe } from "../middlewares/uploadSafe.js";
import validate from "../middlewares/validate.js";

import {
  createSessionSchema,
  updateSessionSchema,
  eventIdParamSchema,
  sessionIdParamSchema
} from "../validators/session.schema.js";

import {
  addParticipantsSchema,
  removeParticipantSchema,
  checkInParticipantSchema
} from "../validators/sessionParticipant.schema.js";

const router = express.Router();

/**
 * =========================================================
 * SWAGGER TAG
 * =========================================================
 */
/**
 * @swagger
 * tags:
 *   - name: Session
 *     description: Event session management APIs
 */

/**
 * =========================================================
 * CREATE SESSION FOR EVENT
 * =========================================================
 * @route   POST /api/events/:eventId/sessions
 * @desc    Create a new session under an event
 * @access  Protected (requires authentication)
 */
/**
 * @swagger
 * /api/events/{eventId}/sessions:
 *   post:
 *     summary: Create a new session for an event
 *     description: Creates a new session linked to a specific event. Session dates must be within event dates.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The event ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - start_datetime
 *               - end_datetime
 *             properties:
 *               name:
 *                 type: string
 *                 description: Session name
 *               type:
 *                 type: string
 *                 enum: [in-person, virtual, hybrid]
 *                 description: Session type
 *               category:
 *                 type: string
 *                 description: Session category
 *               description:
 *                 type: string
 *                 description: Session description
 *               start_datetime:
 *                 type: string
 *                 format: date-time
 *                 description: Session start date and time
 *               end_datetime:
 *                 type: string
 *                 format: date-time
 *                 description: Session end date and time
 *               use_event_location:
 *                 type: boolean
 *                 description: Use event location for this session
 *               location:
 *                 type: string
 *                 description: Session location (if not using event location)
 *               capacity:
 *                 type: number
 *                 description: Session capacity
 *               conference_hall_id:
 *                 type: string
 *                 description: Conference hall ID
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Session photo
 *               photo_base64:
 *                 type: string
 *                 description: Base64-encoded session photo
 *     responses:
 *       201:
 *         description: Session created successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error or dates out of range
 *       404:
 *         description: Event or user not found
 *       500:
 *         description: Server error
 */
router.post(
  "/events/:eventId/sessions",
  authMiddleware,
  uploadDocumentsSafe,
  validate(createSessionSchema, "body"),
  validate(eventIdParamSchema, "params"),
  createSession
);

/**
 * =========================================================
 * GET ALL SESSIONS (ACROSS ALL EVENTS)
 * =========================================================
 * @route   GET /api/sessions
 * @desc    Get all sessions across all events with pagination
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get all sessions across all events
 *     description: Retrieves all sessions across all events with pagination, search, and sorting capabilities
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, description, or location
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: start_datetime
 *         description: Field to sort by (start_datetime, title, etc.)
 *     responses:
 *       200:
 *         description: All sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 count:
 *                   type: integer
 *                 sessions:
 *                   type: array
 *       500:
 *         description: Server error
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/sessions",
  authMiddleware,
  getAllSessions
);

/**
 * =========================================================
 * GET ALL SESSIONS FOR EVENT
 * =========================================================
 * @route   GET /api/events/:eventId/sessions
 * @desc    Get all sessions for a specific event
 * @access  Protected
 */
/**
 * @swagger
 * /api/events/{eventId}/sessions:
 *   get:
 *     summary: Get all sessions for an event
 *     description: Retrieves all sessions associated with a specific event, sorted by start time.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The event ID
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get(
  "/events/:eventId/sessions",
  authMiddleware,
  validate(eventIdParamSchema, "params"),
  getEventSessions
);

/**
 * =========================================================
 * GET SINGLE SESSION
 * =========================================================
 * @route   GET /api/sessions/:sessionId
 * @desc    Get a single session by ID
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   get:
 *     summary: Get a single session
 *     description: Retrieves detailed information about a specific session, including associated event.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get(
  "/sessions/:sessionId",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  getSessionById
);

/**
 * =========================================================
 * UPDATE SESSION
 * =========================================================
 * @route   PUT /api/sessions/:sessionId
 * @desc    Update a session
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   put:
 *     summary: Update a session
 *     description: Updates an existing session. Validates that dates remain within event dates.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [in-person, virtual, hybrid]
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               start_datetime:
 *                 type: string
 *                 format: date-time
 *               end_datetime:
 *                 type: string
 *                 format: date-time
 *               use_event_location:
 *                 type: boolean
 *               location:
 *                 type: string
 *               capacity:
 *                 type: number
 *               conference_hall_id:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *               photo_base64:
 *                 type: string
 *                 description: Base64-encoded session photo
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.put(
  "/sessions/:sessionId",
  authMiddleware,
  uploadDocumentsSafe,
  validate(updateSessionSchema, "body"),
  validate(sessionIdParamSchema, "params"),
  updateSession
);

/**
 * =========================================================
 * DELETE SESSION
 * =========================================================
 * @route   DELETE /api/sessions/:sessionId
 * @desc    Delete a session
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a session
 *     description: Permanently deletes a session from the database.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/sessions/:sessionId",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  deleteSession
);

/**
 * =========================================================
 * ADD PARTICIPANTS TO SESSION (BULK OR SINGLE)
 * =========================================================
 * @route   POST /api/sessions/:sessionId/participants
 * @desc    Add one or multiple participants to a session
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/participants:
 *   post:
 *     summary: Add participants to a session
 *     description: Adds one or multiple users to a session. Users must be already registered in the event.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_ids
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to add as participants
 *     responses:
 *       201:
 *         description: Participants added successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error or invalid data
 *       404:
 *         description: Session or event not found
 *       500:
 *         description: Server error
 */
router.post(
  "/sessions/:sessionId/participants",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  validate(addParticipantsSchema, "body"),
  addParticipantsToSession
);

/**
 * =========================================================
 * GET SESSION PARTICIPANTS
 * =========================================================
 * @route   GET /api/sessions/:sessionId/participants
 * @desc    Get all participants of a session
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/participants:
 *   get:
 *     summary: Get all participants of a session
 *     description: Retrieves all participants registered for a specific session with their details.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *     responses:
 *       200:
 *         description: Participants retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get(
  "/sessions/:sessionId/participants",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  getSessionParticipants
);

/**
 * =========================================================
 * REMOVE PARTICIPANT FROM SESSION
 * =========================================================
 * @route   DELETE /api/sessions/:sessionId/participants/:userId
 * @desc    Remove a participant from a session
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/participants/{userId}:
 *   delete:
 *     summary: Remove a participant from a session
 *     description: Removes a user from a session's participant list.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to remove
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session or participant not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/sessions/:sessionId/participants/:userId",
  authMiddleware,
  removeParticipantFromSession
);

/**
 * =========================================================
 * CHECK IN PARTICIPANT (MARK ATTENDANCE)
 * =========================================================
 * @route   POST /api/sessions/:sessionId/participants/:userId/check-in
 * @desc    Mark a participant as checked in (attended)
 * @access  Protected
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/participants/{userId}/check-in:
 *   post:
 *     summary: Check in a participant
 *     description: Marks a participant as attended and records the check-in time.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to check in
 *     responses:
 *       200:
 *         description: Participant checked in successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session or participant not found
 *       500:
 *         description: Server error
 */
router.post(
  "/sessions/:sessionId/participants/:userId/check-in",
  authMiddleware,
  checkInParticipant
);

export default router;
