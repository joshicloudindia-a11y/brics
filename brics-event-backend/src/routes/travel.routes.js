import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  saveTravel,
  getTravel,
  getEventTravels
} from "../controllers/travel.controller.js";

import { uploadDocumentsSafe } from "../middlewares/uploadSafe.js";
import { saveTravelSchema } from "../validators/travel.schema.js";

const router = express.Router();

/**
 * =========================================================
 * SWAGGER TAG
 * =========================================================
 */
/**
 * @swagger
 * tags:
 *   - name: Travel
 *     description: Travel management APIs
 */

/**
 * =========================================================
 * SAVE FULL TRAVEL (ARRIVAL + DEPARTURE)
 * =========================================================
 */
/**
 * @swagger
 * /api/travel:
 *   post:
 *     summary: Save full travel details (arrival + departure)
 *     tags: [Travel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [event_id, user_id, country_from, arrival_flight_number, port_of_entry, arrival_date]
 *             properties:
 *               event_id:
 *                 type: string
 *                 example: EVT1001
 *               user_id:
 *                 type: string
 *                 example: USR2001
 *               for_whom:
 *                 type: string
 *                 enum: [MYSELF, DELEGATE]
 *               country_from:
 *                 type: string
 *               arrival_flight_number:
 *                 type: string
 *               port_of_entry:
 *                 type: string
 *               arrival_date:
 *                 type: string
 *                 format: date-time
 *               arrival_has_connecting_flight:
 *                 type: boolean
 *               arrival_connecting_flight_number:
 *                 type: string
 *               arrival_connecting_port:
 *                 type: string
 *               arrival_connecting_date:
 *                 type: string
 *                 format: date-time
 *               arrival_connecting_country:
 *                 type: string
 *               country_to:
 *                 type: string
 *               departure_flight_number:
 *                 type: string
 *               port_of_exit:
 *                 type: string
 *               departure_date:
 *                 type: string
 *                 format: date-time
 *               departure_has_connecting_flight:
 *                 type: boolean
 *               departure_connecting_flight_number:
 *                 type: string
 *               departure_connecting_port:
 *                 type: string
 *               departure_connecting_date:
 *                 type: string
 *                 format: date-time
 *               departure_connecting_country:
 *                 type: string
 *               arrival_ticket:
 *                 type: string
 *                 format: binary
 *               arrival_ticket_base64:
 *                 type: string
 *               departure_ticket:
 *                 type: string
 *                 format: binary
 *               departure_ticket_base64:
 *                 type: string
 *     responses:
 *       200:
 *         description: Travel saved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Target user not in event
 *       500:
 *         description: Failed to save travel
 */
router.post(
  "/",
  authMiddleware,
  uploadDocumentsSafe,
  validate(saveTravelSchema),
  saveTravel
);

/**
 * =========================================================
 * GET TRAVEL DETAILS (USER + EVENT)
 * =========================================================
 */
/**
 * @swagger
 * /api/travel/list:
 *   get:
 *     summary: Get travel details visible to the logged-in user
 *     tags: [Travel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Travel records fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch travel
 */
router.get(
  "/list",
  authMiddleware,
  getTravel
);

/**
 * =========================================================
 * GET ALL TRAVELS FOR EVENT (ADMIN)
 * =========================================================
 */
/**
 * @swagger
 * /api/travel/event/{eventId}:
 *   get:
 *     summary: Get all travel records for an event
 *     tags: [Travel]
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
 *         description: Event travel records fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Failed to fetch event travels
 */
router.get(
  "/event/:eventId",
  authMiddleware,
  getEventTravels
);

export default router;
