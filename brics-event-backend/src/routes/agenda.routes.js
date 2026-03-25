import express from "express";
import {
  getSessionAgendas,
  getAgendaById,
  createAgendas,
  updateAgenda,
  deleteAgenda,
  validateTimeSlot,
  addSpeakersToAgenda,
  removeSpeakerFromAgenda,
  bulkDeleteAgendas,
  getAgendaSummary,
  getSpeakerSchedule
} from "../controllers/agenda.controller.js";

import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";

import {
  createAgendaSchema,
  updateAgendaSchema,
  validateTimeSchema,
  addSpeakersSchema,
  sessionIdParamSchema,
  agendaIdParamSchema,
  speakerIdParamSchema,
  bulkDeleteSchema,
  getAgendasQuerySchema
} from "../validators/agenda.schema.js";

const router = express.Router();

/**
 * =========================================================
 * SWAGGER TAG
 * =========================================================
 */
/**
 * @swagger
 * tags:
 *   - name: Agenda
 *     description: Session agenda management APIs
 */

/**
 * =========================================================
 * GET ALL AGENDAS FOR A SESSION
 * =========================================================
 * @route   GET /api/sessions/:sessionId/agendas
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/agendas:
 *   get:
 *     summary: Get all agendas for a session
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *       - in: query
 *         name: include_deleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include deleted agendas
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: start_time
 *         description: Sort field
 *     responses:
 *       200:
 *         description: Agendas retrieved successfully
 *       404:
 *         description: Session not found
 */
router.get(
  "/sessions/:sessionId/agendas",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  validate(getAgendasQuerySchema, "query"),
  getSessionAgendas
);

/**
 * =========================================================
 * GET SINGLE AGENDA BY ID
 * =========================================================
 * @route   GET /api/agendas/:agendaId
 */
/**
 * @swagger
 * /api/agendas/{agendaId}:
 *   get:
 *     summary: Get agenda by ID
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agendaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agenda ID
 *     responses:
 *       200:
 *         description: Agenda retrieved successfully
 *       404:
 *         description: Agenda not found
 */
router.get(
  "/agendas/:agendaId",
  authMiddleware,
  validate(agendaIdParamSchema, "params"),
  getAgendaById
);

/**
 * =========================================================
 * CREATE AGENDA(S) FOR A SESSION
 * =========================================================
 * @route   POST /api/sessions/:sessionId/agendas
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/agendas:
 *   post:
 *     summary: Create one or multiple agendas for a session
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agendas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       maxLength: 150
 *                     start_time:
 *                       type: string
 *                       pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                       example: "10:00"
 *                     end_time:
 *                       type: string
 *                       pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                       example: "10:45"
 *                     speaker_ids:
 *                       type: array
 *                       items:
 *                         type: string
 *                     description:
 *                       type: string
 *                       maxLength: 1000
 *     responses:
 *       201:
 *         description: Agendas created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Time overlap conflict
 */
router.post(
  "/sessions/:sessionId/agendas",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  validate(createAgendaSchema, "body"),
  createAgendas
);

/**
 * =========================================================
 * UPDATE AGENDA
 * =========================================================
 * @route   PUT /api/agendas/:agendaId
 */
/**
 * @swagger
 * /api/agendas/{agendaId}:
 *   put:
 *     summary: Update an existing agenda
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agendaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agenda ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 150
 *               start_time:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               end_time:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               speaker_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Agenda updated successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Time overlap conflict
 */
router.put(
  "/agendas/:agendaId",
  authMiddleware,
  validate(agendaIdParamSchema, "params"),
  validate(updateAgendaSchema, "body"),
  updateAgenda
);

/**
 * =========================================================
 * DELETE AGENDA (SOFT DELETE)
 * =========================================================
 * @route   DELETE /api/agendas/:agendaId
 */
/**
 * @swagger
 * /api/agendas/{agendaId}:
 *   delete:
 *     summary: Soft delete an agenda
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agendaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agenda ID
 *     responses:
 *       200:
 *         description: Agenda deleted successfully
 *       404:
 *         description: Agenda not found
 */
router.delete(
  "/agendas/:agendaId",
  authMiddleware,
  validate(agendaIdParamSchema, "params"),
  deleteAgenda
);

/**
 * =========================================================
 * VALIDATE TIME SLOT
 * =========================================================
 * @route   POST /api/sessions/:sessionId/agendas/validate-time
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/agendas/validate-time:
 *   post:
 *     summary: Validate if agenda time slot is available
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_time:
 *                 type: string
 *                 example: "10:00"
 *               end_time:
 *                 type: string
 *                 example: "10:45"
 *               exclude_agenda_id:
 *                 type: string
 *                 description: Optional agenda ID to exclude from conflict check
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post(
  "/sessions/:sessionId/agendas/validate-time",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  validate(validateTimeSchema, "body"),
  validateTimeSlot
);

/**
 * =========================================================
 * ADD SPEAKERS TO AGENDA
 * =========================================================
 * @route   POST /api/agendas/:agendaId/speakers
 */
/**
 * @swagger
 * /api/agendas/{agendaId}/speakers:
 *   post:
 *     summary: Add speakers to an agenda
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agendaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agenda ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               speaker_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Speakers added successfully
 *       404:
 *         description: Agenda or speaker not found
 */
router.post(
  "/agendas/:agendaId/speakers",
  authMiddleware,
  validate(agendaIdParamSchema, "params"),
  validate(addSpeakersSchema, "body"),
  addSpeakersToAgenda
);

/**
 * =========================================================
 * REMOVE SPEAKER FROM AGENDA
 * =========================================================
 * @route   DELETE /api/agendas/:agendaId/speakers/:speakerId
 */
/**
 * @swagger
 * /api/agendas/{agendaId}/speakers/{speakerId}:
 *   delete:
 *     summary: Remove a speaker from an agenda
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agendaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agenda ID
 *       - in: path
 *         name: speakerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Speaker ID
 *     responses:
 *       200:
 *         description: Speaker removed successfully
 *       404:
 *         description: Agenda or speaker not found
 */
router.delete(
  "/agendas/:agendaId/speakers/:speakerId",
  authMiddleware,
  validate(speakerIdParamSchema, "params"),
  removeSpeakerFromAgenda
);

/**
 * =========================================================
 * BULK DELETE AGENDAS
 * =========================================================
 * @route   DELETE /api/sessions/:sessionId/agendas/bulk
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/agendas/bulk:
 *   delete:
 *     summary: Bulk delete multiple agendas
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agenda_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Agendas deleted successfully
 */
router.delete(
  "/sessions/:sessionId/agendas/bulk",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  validate(bulkDeleteSchema, "body"),
  bulkDeleteAgendas
);

/**
 * =========================================================
 * GET AGENDA SUMMARY FOR SESSION
 * =========================================================
 * @route   GET /api/sessions/:sessionId/agendas/summary
 */
/**
 * @swagger
 * /api/sessions/{sessionId}/agendas/summary:
 *   get:
 *     summary: Get agenda summary and statistics for a session
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *       404:
 *         description: Session not found
 */
router.get(
  "/sessions/:sessionId/agendas/summary",
  authMiddleware,
  validate(sessionIdParamSchema, "params"),
  getAgendaSummary
);

/**
 * =========================================================
 * GET SPEAKER SCHEDULE
 * =========================================================
 * @route   GET /api/speakers/:speakerId/schedule
 */
/**
 * @swagger
 * /api/speakers/{speakerId}/schedule:
 *   get:
 *     summary: Get all agendas for a specific speaker
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speakerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Speaker ID
 *     responses:
 *       200:
 *         description: Speaker schedule retrieved successfully
 *       404:
 *         description: Speaker not found
 */
router.get(
  "/speakers/:speakerId/schedule",
  authMiddleware,
  getSpeakerSchedule
);

export default router;
