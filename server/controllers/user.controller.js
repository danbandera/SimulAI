import { db } from "../db.js";

export const getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users ORDER BY created_at ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, role, email, password } = req.body;
    const [result] = await db.query(
      "INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)",
      [name, role, email, password]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const [result] = await db.query("UPDATE users SET ? WHERE id = ?", [
      req.body,
      req.params.id,
    ]);
    res.json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
