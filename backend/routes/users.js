import express from "express";
import pool from "../db/pool.js";
import requireAuth from "../middleware/requireAuth.js";
import bcrypt from "bcryptjs";

const router = express.Router();

router.put("/me", requireAuth, async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  try {
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const emailNormalized = email?.trim().toLowerCase();

    const result = await pool.query(
      `
      UPDATE users
      SET
        email = COALESCE($1, email),
        password = COALESCE($2, password),
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name)
        WHERE id = $5
        RETURNING id, email, first_name, last_name
      `,
      [emailNormalized, hashedPassword, first_name, last_name, req.user.id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Failed to update user" });
  }
});

router.delete("/me", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);

    req.logout(() => {});
    res.json({ message: "Account deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete account" });
  }
});

export default router;
