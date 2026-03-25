import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  saveHotel,
  getHotel,
  getEventHotels,
  getHotelMaster
} from "../controllers/hotel.controller.js";

import { saveHotelSchema } from "../validators/hotel.schema.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Hotel
 *     description: Hotel accommodation management APIs
 */

/**
 * @swagger
 * /api/hotel:
 *   post:
 *     summary: Save hotel accommodation details
 *     tags: [Hotel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event_id, user_id, stay_start_date, stay_end_date, city, state]
 *             properties:
 *               event_id:
 *                 type: string
 *               user_id:
 *                 type: string
 *               for_whom:
 *                 type: string
 *                 enum: [MYSELF, DELEGATE]
 *                 default: MYSELF
 *               stay_start_date:
 *                 type: string
 *                 format: date-time
 *               stay_end_date:
 *                 type: string
 *                 format: date-time
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               hotel_id:
 *                 type: string
 *                 description: Required when selecting from master list
 *               hotel_type:
 *                 type: string
 *                 enum: [master_list, manual_entry]
 *               hotel_name:
 *                 type: string
 *                 description: Required when hotel_type is manual_entry
 *     responses:
 *       200:
 *         description: Hotel accommodation details saved successfully
 *       400:
 *         description: Invalid input or date/hotel validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Target user/event/hotel not found
 *       500:
 *         description: Failed to save hotel accommodation
 */
router.post(
  "/",
  authMiddleware,
  validate(saveHotelSchema),
  saveHotel
);

/**
 * @swagger
 * /api/hotel/list:
 *   get:
 *     summary: Get hotel details for logged-in user
 *     tags: [Hotel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hotel records fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch hotel accommodations
 */
router.get(
  "/list",
  authMiddleware,
  getHotel
);

/**
 * @swagger
 * /api/hotel/event/{eventId}:
 *   get:
 *     summary: Get all hotel records for an event
 *     tags: [Hotel]
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
 *         description: Event hotel records fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Failed to fetch event hotels
 */
router.get(
  "/event/:eventId",
  authMiddleware,
  getEventHotels
);

/**
 * @swagger
 * /api/hotel/master:
 *   get:
 *     summary: Get hotel master list
 *     tags: [Hotel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hotel master list fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch hotel master list
 */
router.get(
  "/master",
  authMiddleware,
  getHotelMaster
);

export default router;
