import { Router } from "express";
import {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateUserProfileImage,
} from "../controllers/user.controller.js";
import { validateSchema } from "../middlewares/validator.mddleware.js";
import { registerSchema } from "../schemas/auth.schema.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/users", getUsers);
router.post("/users", validateSchema(registerSchema), createUser);
router.get("/users/:id", getUser);
router.put("/users/:id", upload.single("profile_image"), updateUser);
router.delete("/users/:id", deleteUser);
router.put(
  "/users/:id/profile-image",
  upload.single("profile_image"),
  updateUserProfileImage
);
export default router;
