import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

// Get users cart
router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query("SELECT * FROM carts WHERE user_id = $1", [
      userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No cart found" });
    }

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// Add item to users cart, if no cart exists, create cart and then add item
router.post("/", async (req, res) => {
  const userId = req.user.id;
  const { product_id, quantity } = req.body;

  try {
    const cartResult = await pool.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId],
    );

    let cartId;

    if (cartResult.rows.length === 0) {
      // create new cart
      const newCart = await pool.query(
        "INSERT INTO carts (user_id) VALUES ($1) RETURNING *",
        [userId],
      );

      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Add item
    await pool.query(
      "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)",
      [cartId, product_id, quantity],
    );

    res.status(201).json({ message: "Item added to cart" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update one item in users cart
router.put("/items/:cartItemId", async (req, res) => {
  const { cartItemId } = req.params;
  const userId = req.user.id;
  const { quantity } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE cart_items
      SET
        quantity = $1
      WHERE id = $2
      AND cart_id = (
        SELECT id FROM carts WHERE user_id = $3
      )
      `,
      [quantity, cartItemId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete an item from users cart
router.delete("/items/:cartItemId", async (req, res) => {
  const { cartItemId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      "DELETE FROM cart_items WHERE id = $1 AND cart_id = (SELECT id FROM carts WHERE user_id = $2)",
      [cartItemId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    return res.status(200).json({ message: "Cart item deleted successfully" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// when checking out, validate cart exists, ensure cart has items,
// create an order ('pending' status), copy cart_items to order_items to get price_cents for everything,
// commit transaction, return order info,
// delete cart after payment confirmed ('paid' status)
router.post("/checkout", async (req, res) => {
  const userId = req.user.id;

  // borrow a DB connection from the pool so the connection is reserved for this request, important when handling payment processing
  const client = await pool.connect();

  try {
    await client.query("BEGIN"); // Transactions needed (all queries either succeed or fail together)

    // Get user's cart
    const cartResult = await client.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId],
    );

    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "No cart found" });
    }

    const cartId = cartResult.rows[0].id;

    // ensure cart has items
    const cartItems = await client.query(
      "SELECT * FROM cart_items WHERE cart_id = $1",
      [cartId],
    );

    if (cartItems.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cart is empty" });
    }

    // create order in 'pending' status
    const orderResult = await client.query(
      "INSERT INTO orders (user_id) VALUES ($1) RETURNING id",
      [userId],
    );

    const orderId = orderResult.rows[0].id;

    // Insert order_items with price snapshot
    await client.query(
      `
      INSERT INTO order_items (
        order_id,
        quantity,
        price_cents,
        product_id,
        product_name,
        product_description
      )
      SELECT
        $1,
        ci.quantity,
        p.price_cents,
        p.id,
        p.name,
        p.description
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $2
      `,
      [orderId, cartId],
    );

    // Calculate total price
    const totalResult = await client.query(
      `
      SELECT SUM(price_cents * quantity) AS total
      FROM order_items
      WHERE order_id = $1
      `,
      [orderId],
    );

    const totalCents = totalResult.rows[0].total;

    await client.query("UPDATE orders SET total_cents = $1 WHERE id = $2", [
      totalCents,
      orderId,
    ]);

    await client.query("COMMIT");

    return res.status(201).json({
      message: "order created successfully",
      orderId,
      totalCents,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

export default router;
