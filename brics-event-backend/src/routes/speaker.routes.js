import express from "express";
import {
  createSpeaker,
  getAllSpeakers,
  getSpeakerById,
  updateSpeaker,
  deleteSpeaker,
} from "../controllers/speaker.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { uploadDocumentsSafe } from "../middlewares/uploadSafe.js";
import {
  createSpeakerSchema,
  updateSpeakerSchema,
  speakerIdParamSchema,
} from "../validators/speaker.schema.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Speaker
 *     description: Speaker management APIs
 */

/**
 * @swagger
 * /api/speakers:
 *   post:
 *     summary: Create a new speaker
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - email
 *               - organizationName
 *               - designation
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               middlename:
 *                 type: string
 *               email:
 *                 type: string
 *               organizationName:
 *                 type: string
 *               designation:
 *                 type: string
 *               professional_title:
 *                 type: string
 *               country:
 *                 type: string
 *               photoIdType:
 *                 type: string
 *                 enum: [passport, national_id, driving_license, other]
 *               photoIdNumber:
 *                 type: string
 *               passportType:
 *                 type: string
 *                 enum: [ordinary, diplomatic, official, service, emergency]
 *               passportNumber:
 *                 type: string
 *               placeOfIssue:
 *                 type: string
 *               passportExpiry:
 *                 type: string
 *                 format: date
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo file or base64 string
 *               passport_document:
 *                 type: string
 *                 format: binary
 *                 description: Passport document file or base64 string
 *     responses:
 *       201:
 *         description: Speaker created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to create speaker
 */
router.post(
  "/",
  authMiddleware,
  uploadDocumentsSafe,
  validate(createSpeakerSchema),
  createSpeaker
);

/**
 * @swagger
 * /api/speakers:
 *   get:
 *     summary: Get all speakers
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Speakers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch speakers
 */
router.get("/", authMiddleware, getAllSpeakers);

/**
 * @swagger
 * /api/speakers/{speakerId}:
 *   get:
 *     summary: Get a speaker by ID
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speakerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Speaker retrieved successfully
 *       400:
 *         description: Invalid speaker ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Speaker not found
 *       500:
 *         description: Failed to fetch speaker
 */
router.get("/:speakerId", authMiddleware, validate(speakerIdParamSchema, "params"), getSpeakerById);

/**
 * @swagger
 * /api/speakers/{speakerId}:
 *   put:
 *     summary: Update a speaker
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speakerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               middlename:
 *                 type: string
 *               email:
 *                 type: string
 *               organizationName:
 *                 type: string
 *               designation:
 *                 type: string
 *               professional_title:
 *                 type: string
 *               country:
 *                 type: string
 *               photoIdType:
 *                 type: string
 *                 enum: [passport, national_id, driving_license, other]
 *               photoIdNumber:
 *                 type: string
 *               passportType:
 *                 type: string
 *                 enum: [ordinary, diplomatic, official, service, emergency]
 *               passportNumber:
 *                 type: string
 *               placeOfIssue:
 *                 type: string
 *               passportExpiry:
 *                 type: string
 *                 format: date
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo file or base64 string
 *               passport_document:
 *                 type: string
 *                 format: binary
 *                 description: Passport document file or base64 string
 *     responses:
 *       200:
 *         description: Speaker updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or speaker not found
 *       500:
 *         description: Failed to update speaker
 */
router.put(
  "/:speakerId",
  authMiddleware,
  uploadDocumentsSafe,
  validate(speakerIdParamSchema, "params"),
  validate(updateSpeakerSchema),
  updateSpeaker
);

/**
 * @swagger
 * /api/speakers/{speakerId}:
 *   delete:
 *     summary: Delete a speaker
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speakerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Speaker deleted successfully
 *       400:
 *         description: Invalid speaker ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Speaker not found
 *       500:
 *         description: Failed to delete speaker
 */
router.delete("/:speakerId", authMiddleware, validate(speakerIdParamSchema, "params"), deleteSpeaker);

export default router;
