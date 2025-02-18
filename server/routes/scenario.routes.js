import { Router } from "express";
import {
  getScenarios,
  createScenario,
  getScenarioById,
  updateScenario,
  deleteScenario,
  getScenarioByUserId,
} from "../controllers/scenario.controller.js";

const router = Router();

router.get("/scenarios", getScenarios);
router.post("/scenarios", createScenario);
router.get("/scenarios/:id", getScenarioById);
router.put("/scenarios/:id", updateScenario);
router.delete("/scenarios/:id", deleteScenario);
router.get("/scenarios/user/:id", getScenarioByUserId);
export default router;
