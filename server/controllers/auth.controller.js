import { connectSqlDB } from "../db.cjs";
// const { connectSqlDB } = pkg;
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

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

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const { data: user, error } = await connectSqlDB
      .from("users")
      .select()
      .eq("email", email)
      .single();

    if (error || !user) {
      // Return success even if user not found (security best practice)
      return res.json({
        message: "If an account exists, reset instructions will be sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    console.log("Generated token:", resetToken);

    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in database
    const { data: insertData, error: insertError } = await connectSqlDB
      .from("password_resets")
      .upsert({
        user_id: user.id,
        token: resetToken,
        expires_at: resetTokenExpiry,
      })
      .select()
      .single();

    console.log("Token storage result:", { insertData, insertError });

    // Send email
    const transporter = nodemailer.createTransport({
      // Configure your email service here
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset.</p>
        <p>Click this <a href="${process.env.CLIENT_URL}/reset-password/${resetToken}">link</a> to reset your password.</p>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({
      message: "If an account exists, reset instructions will be sent",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  console.log("Received token:", token);

  try {
    // First check if token exists
    const { data: resetData, error: resetError } = await connectSqlDB
      .from("password_resets")
      .select("*") // Select all fields for debugging
      .eq("token", token)
      .single();

    console.log("Query result:", { resetData, resetError });

    if (!resetData || resetError) {
      return res.status(400).json({
        message: "Invalid or expired token",
        debug: { resetError, resetData },
      });
    }

    // Check if token is expired
    if (new Date(resetData.expires_at) < new Date()) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await connectSqlDB
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", resetData.user_id);

    // Delete used token
    await connectSqlDB.from("password_resets").delete().eq("token", token);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
