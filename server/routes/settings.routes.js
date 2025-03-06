import express from "express";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings.controller.js";
import { authRequired } from "../middlewares/validateToken.js";

const router = express.Router();

// Protect all settings routes with authentication
router.use(authRequired);

router.get("/", getSettings);
router.put("/", updateSettings);

export default router;
