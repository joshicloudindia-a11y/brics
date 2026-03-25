import express from "express";
import {
  createRole,
  getRoles,
  deleteRole
} from "../controllers/role.controller.js";

import { authMiddleware } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";

import {
  createRoleSchema,
  roleIdParamSchema,
  getRolesQuerySchema
} from "../validators/role.schema.js";

const router = express.Router();

/**
 * =========================================================
 * SWAGGER TAG
 * =========================================================
 */
/**
 * @swagger
 * tags:
 *   - name: Role
 *     description: Role management APIs
 */

/**
 * =========================================================
 * CREATE ROLE (SUPER ADMIN)
 * =========================================================
 */
/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role (Super Admin only)
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, name, type]
 *             properties:
 *               id:
 *                 type: string
 *                 example: ADMIN
 *               name:
 *                 type: string
 *                 example: Admin
 *               type:
 *                 type: string
 *                 enum: [SYSTEM, EVENT]
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authMiddleware,
  validate(createRoleSchema),
  createRole
);

/**
 * =========================================================
 * GET ROLES
 * =========================================================
 */
/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SYSTEM, EVENT]
 *         description: Filter roles by type
 *     responses:
 *       200:
 *         description: List of roles
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  authMiddleware,
  validate(getRolesQuerySchema, "query"),
  getRoles
);

/**
 * =========================================================
 * DELETE ROLE (SUPER ADMIN)
 * =========================================================
 */
/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a role by ID (Super Admin only)
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: ADMIN
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authMiddleware,
  validate(roleIdParamSchema, "params"),
  deleteRole
);

export default router;
