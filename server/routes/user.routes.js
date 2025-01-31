import { Router } from "express";
import {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/api/users", getUsers);
router.post("/api/users", createUser);
router.get("/api/users/:id", getUser);
router.put("/api/users/:id", updateUser);
router.delete("/api/users/:id", deleteUser);

export default router;
