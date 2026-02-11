import express from "express";
import pool from "../db/pool.js";

const router = express();

// get order history for logged in user
router.get("/", async (req, res) => {
  const { userId } = req.user.id;

  try {
    const result = await pool.query(
      "SELECT id, status, created_at, modified_at, total_cents FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// get single order for logged in user
router.get("/:orderId", async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  try {
    const orderResult = await pool.query(
      "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
      [orderId, userId],
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const itemsResult = await pool.query(
      "SELECT product_name, product_description, price_cents, quantity FROM order_items WHERE order_id = $1",
      [orderId],
    );

    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
