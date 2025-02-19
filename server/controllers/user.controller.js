import { db } from "../db.cjs";
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";

export const getUsers = async (req, res) => {
  try {
    const result = await db.from("users").select();
    res.json(result.data);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.from("users").select().eq("id", id).single();

    if (result.data.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, role, email, password } = req.body;

    const existingUser = await db
      .from("users")
      .select()
      .eq("email", email)
      .single();
    if (existingUser) {
      return res.status(400).json( ["User already exists" ]);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.from("users").insert({
      name,
      role,
      email,
      password: hashedPassword,
    });
    const userId = result.insertId;
    const accessToken = await createAccessToken({ id: userId });
    res.cookie("accessToken", accessToken);
    res.status(201).json({
      id: userId,
      name,
      email,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, email, password } = req.body;
    const result = await db
      .from("users")
      .update({
        name,
        role,
        email,
        password,
      })
      .eq("id", id);
    if (result.status === 204) {
      // res.status(204).json({ message: "User updated successfully" });
      res.json(result.data);
    } else {
      res.status(400).json({ message: result.error.message });
    }
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.from("users").delete().eq("id", id);
    res.json(result.data);
    // if (result.status === 204) {
    //   // res.status(200).json({ message: "User deleted successfully" });
    // } else {
    //   res.status(400).json({ message: result.error.message });
    // }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
