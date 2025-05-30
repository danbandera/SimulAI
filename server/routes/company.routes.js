import { Router } from "express";
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/company.controller.js";
import { authRequired } from "../middlewares/validateToken.js";

const router = Router();

// All company routes require authentication
router.use(authRequired);

// GET /api/companies - Get all companies
router.get("/", getCompanies);

// GET /api/companies/:id - Get a specific company
router.get("/:id", getCompany);

// POST /api/companies - Create a new company
router.post("/", createCompany);

// PUT /api/companies/:id - Update a company
router.put("/:id", updateCompany);

// DELETE /api/companies/:id - Delete a company
router.delete("/:id", deleteCompany);

export default router;
