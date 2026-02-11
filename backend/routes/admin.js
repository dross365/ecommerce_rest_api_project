import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

// ##############################
// USERS
// ##############################

// Delete user
router.delete("/users/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, is_admin, created_at, first_name, last_name FROM users ORDER BY created_at DESC",
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Promote / Demote user
router.put("/users/:userId/role", async (req, res) => {
  const { userId } = req.params;
  const { is_admin } = req.body;

  try {
    const result = await pool.query(
      "UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, email, is_admin",
      [is_admin, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ########################################
// ORDERS
// ########################################

// Get all orders
router.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, user_id, status, total_cents, created_at FROM orders ORDER BY created_at DESC",
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update order status
router.put("/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status",
      [orderId, status],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ##########################
// PRODUCTS
// ##########################

// Get all products (admin view)
router.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY created_at DESC",
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Create product
router.post("/products", async (req, res) => {
  const { name, price_cents, description } = req.body;

  try {
    const result = await pool.query(
      `
      INSERT INTO products (name, price_cents, description)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [name, price_cents, description],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update product
router.put("/products/:productId", async (req, res) => {
  const { productId } = req.params;
  const { name, price_cents, description } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET
        name = COALESCE($1, name),
        price_cents = COALESCE($2, price_cents),
        description = COALESCE($3, description)
      WHERE id = $4
      RETURNING *
      `,
      [name, price_cents, description, productId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete product
router.delete("/products/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURING id",
      [productId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
