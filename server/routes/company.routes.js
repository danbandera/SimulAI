import { Router } from "express";
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/company.controller.js";
import { authRequired } from "../middlewares/validateToken.js";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for logos
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for company logos"), false);
    }
  },
});

const router = Router();

// All company routes require authentication
router.use(authRequired);

// GET /api/companies - Get all companies
router.get("/", getCompanies);

// GET /api/companies/:id - Get a specific company
router.get("/:id", getCompany);

// POST /api/companies - Create a new company
router.post("/", upload.single("logo"), createCompany);

// PUT /api/companies/:id - Update a company
router.put("/:id", upload.single("logo"), updateCompany);

// DELETE /api/companies/:id - Delete a company
router.delete("/:id", deleteCompany);

export default router;
