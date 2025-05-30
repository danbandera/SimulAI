import { Router } from "express";
import {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateUserProfileImage,
  importUsersFromCSV,
} from "../controllers/user.controller.js";
import { validateSchema } from "../middlewares/validator.mddleware.js";
import { registerSchema } from "../schemas/auth.schema.js";
import { upload } from "../middlewares/upload.middleware.js";
import { authRequired } from "../middlewares/validateToken.js";

const router = Router();

router.get("/users", authRequired, getUsers);
router.post("/users", authRequired, validateSchema(registerSchema), createUser);
router.get("/users/:id", authRequired, getUser);
router.put(
  "/users/:id",
  authRequired,
  upload.single("profile_image"),
  updateUser
);
router.delete("/users/:id", authRequired, deleteUser);
router.put(
  "/users/:id/profile-image",
  authRequired,
  upload.single("profile_image"),
  updateUserProfileImage
);
router.post(
  "/users/import",
  authRequired,
  upload.single("file"),
  importUsersFromCSV
);

export default router;
