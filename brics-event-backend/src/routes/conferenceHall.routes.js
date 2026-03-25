import express from "express";
import {
  createConferenceHall,
  createMultipleConferenceHalls,
  getAllConferenceHalls,
  getSingleConferenceHall,
  updateConferenceHall,
  deleteConferenceHall,
  assignHallToEvent,
  unassignHall,
  getAvailableHalls,
  getEventHalls,
} from "../controllers/conferenceHall.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  createHallSchema,
  updateHallSchema,
  assignHallSchema,
  unassignHallSchema,
  hallIdParamSchema,
  availableHallsQuerySchema,
} from "../validators/conferenceHall.schema.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Conference Halls
 *     description: Conference hall management APIs
 */

/**
 * @swagger
 * /api/conference/halls:
 *   post:
 *     summary: Create a new conference hall
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hall_name
 *               - venue_name
 *               - floor_name
 *               - state
 *               - city
 *               - capacity
 *             properties:
 *               hall_name:
 *                 type: string
 *               venue_name:
 *                 type: string
 *               floor_name:
 *                 type: string
 *               state:
 *                 type: string
 *               city:
 *                 type: string
 *               capacity:
 *                 type: number
 *               video_conference_enabled:
 *                 type: boolean
 *               event_id:
 *                 type: string
 *               session_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conference hall created successfully
 */
router.post(
  "/",
  authMiddleware,
  validate(createHallSchema),
  createConferenceHall
);

/**
 * @swagger
 * /api/conference/halls/bulk:
 *   post:
 *     summary: Create multiple conference halls at once
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - halls
 *             properties:
 *               halls:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     hall_name:
 *                       type: string
 *                     venue_name:
 *                       type: string
 *                     floor_name:
 *                       type: string
 *                     state:
 *                       type: string
 *                     city:
 *                       type: string
 *                     capacity:
 *                       type: number
 *                     video_conference_enabled:
 *                       type: boolean
 *                     event_id:
 *                       type: string
 *                     session_id:
 *                       type: string
 *     responses:
 *       201:
 *         description: Conference halls created successfully
 */
router.post(
  "/bulk",
  authMiddleware,
  createMultipleConferenceHalls
);

/**
 * @swagger
 * /api/conference/halls:
 *   get:
 *     summary: Get all conference halls with filters
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: event_id
 *         description: Filter halls by specific event
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, booked, maintenance]
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of conference halls
 */
router.get("/", authMiddleware, getAllConferenceHalls);

/**
 * @swagger
 * /api/conference/halls/available:
 *   get:
 *     summary: Get available halls for date range
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: capacity_min
 *         schema:
 *           type: number
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of available halls
 */
router.get(
  "/available",
  authMiddleware,
  validate(availableHallsQuerySchema, "query"),
  getAvailableHalls
);

/**
 * @swagger
 * /api/conference/halls/{hallId}:
 *   get:
 *     summary: Get single conference hall details
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conference hall details
 */
router.get(
  "/:hallId",
  authMiddleware,
  validate(hallIdParamSchema, 'params'),
  getSingleConferenceHall
);

/**
 * @swagger
 * /api/conference/halls/{hallId}:
 *   put:
 *     summary: Update conference hall
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Conference hall updated successfully
 */
router.put(
  "/:hallId",
  authMiddleware,
  validate(hallIdParamSchema, 'params'),
  validate(updateHallSchema, 'body'),
  updateConferenceHall
);

/**
 * @swagger
 * /api/conference/halls/{hallId}:
 *   delete:
 *     summary: Delete conference hall
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conference hall deleted successfully
 */
router.delete(
  "/:hallId",
  authMiddleware,
  validate(hallIdParamSchema, 'params'),
  deleteConferenceHall
);

/**
 * @swagger
 * /api/conference/halls/{hallId}/assign:
 *   post:
 *     summary: Assign hall to event or session
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_id
 *             properties:
 *               event_id:
 *                 type: string
 *               session_id:
 *                 type: string
 *               session_name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Hall assigned successfully
 */
router.post(
  "/:hallId/assign",
  authMiddleware,
  validate(hallIdParamSchema, 'params'),
  validate(assignHallSchema, 'body'),
  assignHallToEvent
);

/**
 * @swagger
 * /api/conference/halls/{hallId}/unassign:
 *   post:
 *     summary: Unassign hall from event or session
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_id
 *             properties:
 *               event_id:
 *                 type: string
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hall unassigned successfully
 */
router.post(
  "/:hallId/unassign",
  authMiddleware,
  validate(hallIdParamSchema, 'params'),
  validate(unassignHallSchema, 'body'),
  unassignHall
);

/**
 * @swagger
 * /api/conference/halls/event/{eventId}:
 *   get:
 *     summary: Get all halls booked for a specific event
 *     description: Returns all conference halls assigned to an event, including different booking periods
 *     tags: [Conference Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         description: MongoDB ObjectId of the event
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all halls booked for this event
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 event:
 *                   type: object
 *                   properties:
 *                     event_id:
 *                       type: string
 *                     event_name:
 *                       type: string
 *                     event_start:
 *                       type: string
 *                       format: date
 *                     event_end:
 *                       type: string
 *                       format: date
 *                 total_halls_booked:
 *                   type: number
 *                 halls:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Event not found
 */
router.get("/event/:eventId", authMiddleware, getEventHalls);

export default router;
