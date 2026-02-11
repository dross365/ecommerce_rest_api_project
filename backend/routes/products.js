import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "No products found!" });
    }

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [
      productId,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Product with that ID doesn't exist" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const { name, price_cents, description } = req.body;

  try {
    if (!name || !price_cents || !description) {
      return res.status(400).json({ message: "All fields required" });
    }

    const result = await pool.query(
      "INSERT INTO products (name, price_cents, description) VALUES ($1, $2, $3) RETURNING *",
      [name, price_cents, description],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/:productId", async (req, res) => {
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

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Product with that ID does not exist" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:productId", async (req, res) => {
  const { productId } = req.params;
  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1", [
      productId,
    ]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Product with that ID does not exist" });
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
