import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  createHotelMaster,
  getHotelMasterList,
  updateHotelMaster,
  deleteHotelMaster
} from "../controllers/hotelMaster.controller.js";
import { hotelMasterSchema, updateHotelMasterSchema } from "../validators/hotelMaster.schema.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Hotel Master
 *     description: Hotel master management APIs
 */

/**
 * @swagger
 * /api/hotel-master:
 *   post:
 *     summary: Create hotel master entry
 *     tags: [Hotel Master]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, city, state]
 *             properties:
 *               name:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               address:
 *                 type: string
 *               contact:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: Hotel master created
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create hotel master
 */
router.post(
  "/",
  authMiddleware,
  validate(hotelMasterSchema),
  createHotelMaster
);

/**
 * @swagger
 * /api/hotel-master:
 *   get:
 *     summary: Get hotel master list
 *     tags: [Hotel Master]
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
  "/",
  authMiddleware,
  getHotelMasterList
);

/**
 * @swagger
 * /api/hotel-master/{id}:
 *   put:
 *     summary: Update hotel master entry
 *     tags: [Hotel Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               address:
 *                 type: string
 *               contact:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Hotel master updated
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Hotel master not found
 *       500:
 *         description: Failed to update hotel master
 */
router.put(
  "/:id",
  authMiddleware,
  validate(updateHotelMasterSchema),
  updateHotelMaster
);

/**
 * @swagger
 * /api/hotel-master/{id}:
 *   delete:
 *     summary: Delete hotel master entry
 *     tags: [Hotel Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel master deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Hotel master not found
 *       500:
 *         description: Failed to delete hotel master
 */
router.delete(
  "/:id",
  authMiddleware,
  deleteHotelMaster
);

export default router;
