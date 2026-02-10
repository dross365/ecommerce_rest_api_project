import express from "express";
import bcrypt from "bcryptjs";

import pool from "../db/pool.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  try {
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ message: "All fields required" });
    }

    const emailNormalized = email.trim().toLowerCase();

    const lookup = await pool.query("SELECT 1 FROM users WHERE email = $1", [
      emailNormalized,
    ]);

    if (lookup.rows.length !== 0) {
      return res
        .status(400)
        .json({ message: "User with email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING email, first_name, last_name",
      [emailNormalized, hashedPassword, first_name, last_name],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const emailNormalized = email.trim().toLowerCase();

    const result = await pool.query(
      "SELECT id, email, password, first_name, last_name FROM users WHERE email = $1",
      [emailNormalized],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    // check if the user has a password. if not, then their account was created with Google or Facebook
    if (!user.password) {
      return res
        .status(400)
        .json({ message: "Please log in using Google or Facebook" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    delete user.password; // make sure not to send the hashed password back in the response
    return res.status(200).json(user);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
