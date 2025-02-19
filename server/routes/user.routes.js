import { Router } from "express";
import {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { validateSchema } from "../middlewares/validator.mddleware.js";
import { registerSchema } from "../schemas/auth.schema.js";

const router = Router();

router.get("/users", getUsers);
router.post("/users", validateSchema(registerSchema), createUser);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;
