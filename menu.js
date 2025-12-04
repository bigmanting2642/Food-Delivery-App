const express = require("express");
const pool = require("../db/index");

const router = express.Router();

router.get("/", async (req, res) => {
  const items = await pool.query("SELECT * FROM menu_items");
  res.json(items.rows);
});

router.post("/", async (req, res) => {
  const { name, price, description } = req.body;

  const result = await pool.query(
    "INSERT INTO menu_items (name, price, description) VALUES ($1, $2, $3) RETURNING *",
    [name, price, description]
  );

  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM menu_items WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
