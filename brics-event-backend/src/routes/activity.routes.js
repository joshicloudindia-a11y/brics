import express from 'express';
import * as activityController from '../controllers/activity.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Activity
 *     description: Activity audit and statistics APIs
 */

/**
 * @swagger
 * /api/activities/my-activities:
 *   get:
 *     summary: Get current user's activities
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activities fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-activities', authMiddleware, activityController.getMyActivities);

/**
 * @swagger
 * /api/activities/stats:
 *   get:
 *     summary: Get activity statistics
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity statistics fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authMiddleware, activityController.getActivityStats);

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     summary: Get activity by ID
 *     tags: [Activity]
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
 *         description: Activity fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
router.get('/:id', authMiddleware, activityController.getActivityById);

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: Get all activities
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activities fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, activityController.getAllActivities);

/**
 * @swagger
 * /api/activities/cleanup:
 *   delete:
 *     summary: Delete old activities
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Old activities deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/cleanup', authMiddleware, activityController.deleteOldActivities);

export default router;
