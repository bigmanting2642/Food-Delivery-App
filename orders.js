const express = require("express");
const pool = require("../db/index");

const router = express.Router();

// Create new order
router.post("/", async (req, res) => {
  const { customer_id, total, items } = req.body;

  const order = await pool.query(
    "INSERT INTO orders (customer_id, total) VALUES ($1, $2) RETURNING id",
    [customer_id, total]
  );

  const orderId = order.rows[0].id;

  for (let item of items) {
    await pool.query(
      "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES ($1, $2, $3)",
      [orderId, item.menu_item_id, item.quantity]
    );
  }

  res.json({ order_id: orderId });
});

// List orders
router.get("/", async (req, res) => {
  const orders = await pool.query("SELECT * FROM orders WHERE status='pending'");
  res.json(orders.rows);
});

// Mark ready
router.patch("/:id", async (req, res) => {
  await pool.query("UPDATE orders SET status='ready' WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});
// GET items for a specific order
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.username 
       FROM orders o
       LEFT JOIN users u 
       ON o.customer_id = u.id
       WHERE o.status = 'pending'
       ORDER BY o.created_at DESC`
    );

    // Format response to include customer username
    const formatted = result.rows.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      customer: order.username || "Unknown",
      total: order.total,
      status: order.status,
      created_at: order.created_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});



module.exports = router;
