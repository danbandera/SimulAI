import express from "express";
import {
  loginUser,
  logoutUser,
  getProfile,
  verifyToken,
} from "../controllers/auth.controller.js";
import { authRequired } from "../middlewares/validateToken.js";
import { validateSchema } from "../middlewares/validator.mddleware.js";
import { loginSchema } from "../schemas/auth.schema.js";
const router = express.Router();

router.post("/login", validateSchema(loginSchema), loginUser);

router.post("/logout", logoutUser);

router.get("/verify-token", authRequired, async (req, res) => {
  try {
    // req.user should be set by your authRequired middleware
    res.json({
      data: req.user
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

router.get("/profile", authRequired, getProfile);

export default router;
