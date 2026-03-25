import express from "express";
import { getAllMinistries, getSingleMinistry } from "../controllers/ministry.controller.js";

const router = express.Router();

/**
 * GET /api/ministries - list ministries
 * Optional query: page, limit, active (true/false)
 */
router.get("/", getAllMinistries);

/**
 * GET /api/ministries/:id - single ministry
 */
router.get("/:id", getSingleMinistry);

export default router;
