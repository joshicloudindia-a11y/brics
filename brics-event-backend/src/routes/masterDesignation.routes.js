import express from "express";
import { createDesignationIfNotExists, getAllDesignations } from "../controllers/masterDesignation.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

/**
 * POST /api/designations
 * - Creates a designation if it does not already exist
 */
router.post("/", authMiddleware, createDesignationIfNotExists);

/**
 * GET /api/designations
 * - Returns list of designations (optional query `active=true`)
 */
router.get("/", getAllDesignations);

export default router;
