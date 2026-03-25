import express from "express";
import {
  createOrganization,
  getAllOrganizations,
  getSingleOrganization,
  updateOrganization,
  getOrganizationsByMinistry
} from "../controllers/organization.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { createOrganizationSchema, updateOrganizationSchema } from "../validators/organization.schema.js";

const router = express.Router();

/**
 * =========================================================
 * SWAGGER TAG
 * =========================================================
 */
/**
 * @swagger
 * tags:
 *   - name: Organization
 *     description: Organization management APIs
 */

/**
 * =========================================================
 * CREATE ORGANIZATION (ADMIN)
 * =========================================================
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_name
 *             properties:
 *               organization_name:
 *                 type: string
 *                 description: Name of the organization
 *               ministry_id:
 *                 type: string
 *                 description: Optional ministry ID to link organization
 *               description:
 *                 type: string
 *                 description: Optional description
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Missing or invalid fields
 *       403:
 *         description: Access denied - Super Admin only
 *       409:
 *         description: Organization already exists
 */
router.post(
  "/",
  authMiddleware,
  validate(createOrganizationSchema),
  createOrganization
);

/**
 * =========================================================
 * GET ALL ORGANIZATIONS
 * =========================================================
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all active organizations
 *     tags: [Organization]
 *     parameters:
 *       - in: query
 *         name: ministry_id
 *         schema:
 *           type: string
 *         description: Optional filter by ministry ID
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
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get("/", getAllOrganizations);

/**
 * =========================================================
 * GET ORGANIZATIONS BY MINISTRY
 * =========================================================
 * @swagger
 * /api/organizations/by-ministry/{ministry_id}:
 *   get:
 *     summary: Get organizations linked to a specific ministry
 *     tags: [Organization]
 *     parameters:
 *       - in: path
 *         name: ministry_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ministry ID
 *     responses:
 *       200:
 *         description: List of organizations for the ministry
 *       400:
 *         description: Invalid ministry ID
 */
router.get("/by-ministry/:ministry_id", getOrganizationsByMinistry);

/**
 * =========================================================
 * GET SINGLE ORGANIZATION
 * =========================================================
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get details of a single organization
 *     tags: [Organization]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Organization not found
 */
router.get("/:id", getSingleOrganization);

/**
 * =========================================================
 * UPDATE ORGANIZATION (ADMIN)
 * =========================================================
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Update organization details
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organization_name:
 *                 type: string
 *               ministry_id:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       403:
 *         description: Access denied - Super Admin only
 *       404:
 *         description: Organization not found
 */
router.put(
  "/:id",
  authMiddleware,
  validate(updateOrganizationSchema),
  updateOrganization
);

export default router;
