import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";

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
      "INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name",
      [emailNormalized, hashedPassword, first_name, last_name],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", (req, res) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Server error" });
    }

    if (!user)
      return res
        .status(401)
        .json({ message: info?.message || "Invalid email or password" });

    req.logIn(user, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Login failed" });
      }

      const { password, ...safeUser } = user;
      return res.json({ message: "Logged In", safeUser });
    });
  })(req, res);
});

router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged Out" });
  });
});

router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ user: null });
  }

  res.json(req.user);
});

export default router;
