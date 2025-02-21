import { connectSqlDB } from "../db.cjs";
// const { connectSqlDB } = pkg;
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";
import jwt from "jsonwebtoken";

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Supabase returns { data, error } format
    const { data: users, error } = await connectSqlDB
      .from("users")
      .select()
      .eq("email", email)
      .single();

    if (error || !users) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, users.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const accessToken = await createAccessToken({ id: users.id });

    // Set cookie with specific options
    res.cookie("accessToken", accessToken, {
      // httpOnly: true,
      // secure: process.env.NODE_ENV === "production", // Use secure in production
      // sameSite: "none", // Changed from strict to lax for better compatibility
      // maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logoutUser = async (req, res) => {
  res.clearCookie("accessToken");
  res.status(200).json({ message: "Logged out successfully" });
};

export const getProfile = async (req, res) => {
  const { id } = req.user;
  try {
    const { data: users, error } = await connectSqlDB
      .from("users")
      .select()
      .eq("id", id)
      .single();
    if (error || !users) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users.data;
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  const { accessToken } = req.cookies;
  if (!accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(accessToken, process.env.JWT_SECRET, async (error, decoded) => {
    if (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: user, error: userError } = await connectSqlDB
      .from("users")
      .select()
      .eq("id", decoded.id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Return just the user data without nesting
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });
};
