import express from "express";
import {
  addEventManager,
  addUserEvent,
  getAllUserEvents,
  getDelegatesWithInviters,
  getEventManagersWithEvents,
  getEvents,
  getEventUsers,
  getUserEvents,
  getSingleEvent,
  getDashboardCounts,
  upsertEvent,
  generateInviteLink,
  validateInviteToken,
  getEventManagerEvents,
  getOpenInviteRegistrations,
  updateOpenInviteStatus,
  getEventTravelDetails,
  getEventHotelDetails,
  updateEventManager,
  downloadEventReport
} from "../controllers/event.controller.js";

import { authMiddleware } from "../middlewares/auth.js";
import { uploadDocumentsSafe } from "../middlewares/uploadSafe.js";
import validate from "../middlewares/validate.js";

import {
  addUserEventSchema,
  addEventManagerSchema,
  eventIdParamSchema,
  upsertEventSchema,
  updateEventManagerSchema,
} from "../validators/event.schema.js";

const router = express.Router();

/**
 * =========================================================
 * SWAGGER TAG
 * =========================================================
 */
/**
 * @swagger
 * tags:
 *   - name: Event
 *     description: Event management & participation APIs
 */

/**
 * =========================================================
 * UPSERT EVENT (CREATE / UPDATE)
 * =========================================================
 */
/**
 * @swagger
 * /api/events/save:
 *   post:
 *     summary: Create or update an event (including draft/publish)
 *     description: Create new events as draft or published. Update existing events including changing status from draft to published.
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               id:
 *                 type: string
 *                 description: Pass id to update, omit for create
 *               name:
 *                 type: string
 *                 required: true
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Required for published events
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Required for published events
 *               eventMode:
 *                 type: string
 *                 description: Required for published events
 *               category:
 *                 type: string
 *                 description: Required for published events
 *               source_language:
 *                 type: string
 *               capacity:
 *                 type: number
 *               delegateCount:
 *                 type: number
 *                 description: Required for published events
 *               venue:
 *                 type: string
 *               location:
 *                 type: string
 *                 description: Required for published events
 *               manager:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *                 description: Set to 'draft' to save as draft (only name required), 'published' to publish (all required fields must be provided)
 *     responses:
 *       200:
 *         description: Event created or updated successfully
 *       201:
 *         description: Event created successfully
 */
router.post(
  "/save",
  authMiddleware,
  uploadDocumentsSafe,
  validate(upsertEventSchema),
  upsertEvent,
);

/**
 * =========================================================
 * EVENT LIST
 * =========================================================
 */
/**
 * @swagger
 * /api/events/list:
 *   get:
 *     summary: Get all events (draft and published)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published]
 *         description: Filter events by status. If omitted, returns all events.
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filter events by organization ID
 *     responses:
 *       200:
 *         description: List of events
 */
router.get("/list", authMiddleware, getEvents);

/**
 * =========================================================
 * USER – EVENT REGISTRATION
 * =========================================================
 */
/**
 * @swagger
 * /api/events/user-event:
 *   post:
 *     summary: Register logged-in user for an event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [event_id]
 *             properties:
 *               event_id:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [DELEGATE, DAO, EVENT MANAGER]
 *     responses:
 *       201:
 *         description: User registered for event
 *       409:
 *         description: User already registered
 */
router.post(
  "/user-event",
  authMiddleware,
  validate(addUserEventSchema),
  addUserEvent,
);

/**
 * =========================================================
 * USER EVENTS (ROLE FILTERED)
 * =========================================================
 */
/**
 * @swagger
 * /api/events/user/list:
 *   get:
 *     summary: Get events associated with logged-in user
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User events fetched successfully
 */
router.get("/user/list", authMiddleware, getUserEvents);

/**
 * =========================================================
 * GET SINGLE EVENT DETAILS
 * =========================================================
 */
/**
 * @swagger
 * /api/events/{eventId}:
 *   get:
 *     summary: Get single event details with manager info and DAO count
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details fetched successfully
 *       404:
 *         description: Event not found
 */
router.get(
  "/:eventId",
  authMiddleware,
  validate(eventIdParamSchema, "params"),
  getSingleEvent,
);

/**
 * =========================================================
 * EVENT USERS
 * =========================================================
 */
/**
 * @swagger
 * /api/events/{eventId}/users:
 *   get:
 *     summary: Get users registered/invited for an event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event users fetched successfully
 */
router.get(
  "/:eventId/users",
  authMiddleware,
  validate(eventIdParamSchema, "params"),
  getEventUsers,
);

/**
 * =========================================================
 * GET DELEGATES WITH DAO INVITER DETAILS
 * =========================================================
 */
/**
 * @swagger
 * /api/events/{eventId}/delegates-with-inviters:
 *   get:
 *     summary: Get all delegates for an event with DAO inviter details
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delegates with inviter details fetched successfully
 */
router.get(
  "/:eventId/delegates-with-inviters",
  authMiddleware,
  validate(eventIdParamSchema, "params"),
  getDelegatesWithInviters,
);

/**
 * =========================================================
 * GET TRAVEL DETAILS FOR EVENT
 * =========================================================
 */
/**
 * @swagger
 * /api/events/{eventId}/travel-details:
 *   get:
 *     summary: Get travel details for all users in an event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Travel details fetched successfully
 */
router.get(
  "/:eventId/travel-details",
  authMiddleware,
  validate(eventIdParamSchema, "params"),
  getEventTravelDetails,
);

/**
 * =========================================================
 * ALL USER EVENTS (NO ROLE FILTER)
 * =========================================================
 */
/**
 * @swagger
 * /api/events/user/all:
 *   get:
 *     summary: Get ALL events of logged-in user
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All user events fetched successfully
 */
router.get("/user/all", authMiddleware, getAllUserEvents);

/**
 * =========================================================
 * ADMIN – EVENT MANAGERS LIST
 * =========================================================
 */
/**
 * @swagger
 * /api/events/admin/event-managers:
 *   get:
 *     summary: Get all event managers who have events (Super Admin only)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event managers fetched successfully
 */
router.get("/admin/event-managers", authMiddleware, getEventManagersWithEvents);

/**
 * =========================================================
 * ADMIN – ADD EVENT MANAGER
 * =========================================================
 */
/**
 * @swagger
 * /api/events/admin/event-managers:
 *   post:
 *     summary: Assign an Event Manager to an event (Super Admin only)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [first_name, email, ministry_name, event_id]
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               ministry_name:
 *                 type: string
 *               event_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event manager added successfully
 */
router.post(
  "/admin/event-managers",
  authMiddleware,
  validate(addEventManagerSchema),
  addEventManager,
);

/**
 * =========================================================
 * ADMIN – UPDATE EVENT MANAGER
 * =========================================================
 */
/**
 * @swagger
 * /api/events/admin/event-managers/{id}:
 *   put:
 *     summary: Update an Event Manager (Super Admin only)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event manager user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               ministry_name:
 *                 type: string
 *               organization_name:
 *                 type: string
 *               event_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event manager updated successfully
 *       404:
 *         description: Event manager not found
 */
router.put(
  "/admin/event-managers/:id",
  authMiddleware,
  validate(updateEventManagerSchema),
  updateEventManager,
);

/**
 * @swagger
 * /api/events/admin/dashboard-counts:
 *   get:
 *     summary: Get dashboard counts based on user role (Super Admin / Event Manager / DAO / Delegate)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard counts fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEvents:
 *                   type: number
 *                   example: 12
 *                 totalDraftEvents:
 *                   type: number
 *                   example: 3
 *                   description: Number of draft events
 *                 totalPublishedEvents:
 *                   type: number
 *                   example: 9
 *                   description: Number of published events
 *                 totalDaoInvited:
 *                   type: number
 *                   example: 48
 *                 totalDelegatesInvited:
 *                   type: number
 *                   example: 240
 *                 totalEventManagers:
 *                   type: number
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get("/admin/dashboard-counts", authMiddleware, getDashboardCounts);

/**
 * =========================================================
 * EVENT MANAGER – MY EVENTS (Created + Invited)
 * =========================================================
 */
/**
 * @swagger
 * /api/events/manager/my-events:
 *   get:
 *     summary: Get events assigned to the logged-in event manager
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event manager events fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/manager/my-events", authMiddleware, getEventManagerEvents);


/**
 * @swagger
 * /api/events/{eventId}/generate-invite-link:
 *   post:
 *     summary: Generate open invite link for an event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite link generated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
router.post(
  "/:eventId/generate-invite-link",
  authMiddleware,
  generateInviteLink
);


/**
 * @swagger
 * /api/events/{eventId}/validate-invite:
 *   get:
 *     summary: Validate open invite token for an event
 *     tags: [Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite token validation result
 *       400:
 *         description: Invalid or missing token
 *       404:
 *         description: Event not found
 */
router.get(
  "/:eventId/validate-invite",
  validateInviteToken
);


/**
 * @swagger
 * /api/events/admin/open-invite-registrations:
 *   get:
 *     summary: Get all open invite registrations
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Open invite registrations fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/admin/open-invite-registrations', 
  authMiddleware,
  getOpenInviteRegistrations
);

/**
 * @swagger
 * /api/events/admin/open-invite-registrations/{userId}/status:
 *   post:
 *     summary: Update open invite registration status
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: approved
 *     responses:
 *       200:
 *         description: Open invite registration status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Registration not found
 */
router.post('/admin/open-invite-registrations/:userId/status', 
  authMiddleware,
  updateOpenInviteStatus
);

/**
 * @swagger
 * /api/events/{eventId}/hotel-details:
 *   get:
 *     summary: Get hotel accommodation details for an event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel details fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
router.get(
  "/:eventId/hotel-details",
  authMiddleware,
  getEventHotelDetails
);

/**
 * @swagger
 * /api/events/{eventId}/report:
 *   get:
 *     summary: Download event report (Excel file)
 *     description: |
 *       Download event report in Excel format.
 *       Supports multiple report types:
 *       - default → Full report (User + Travel + Hotel)
 *       - travel → User + Travel details only
 *       - hotel → User + Hotel details only
 *       - emc → Basic user reference sheet
 *
 *       Accessible only by SUPER ADMIN and EVENT MANAGER.
 *
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the event
 *
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [default, travel, hotel, emc]
 *           example: default
 *         description: Type of report to download
 *
 *     responses:
 *       200:
 *         description: Excel file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *
 *       400:
 *         description: Invalid report type
 *
 *       401:
 *         description: Unauthorized
 *
 *       403:
 *         description: Access denied (Only SUPER ADMIN or EVENT MANAGER)
 *
 *       404:
 *         description: Event not found
 */

router.get('/:eventId/report',authMiddleware, downloadEventReport);

export default router;
