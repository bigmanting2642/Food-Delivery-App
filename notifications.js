const express = require("express");
const pool = require("../db/index");

const router = express.Router();

router.get("/", async (_, res) => {
  const result = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC");
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { user_id, message } = req.body;

  const result = await pool.query(
    "INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *",
    [user_id, message]
  );

  res.json(result.rows[0]);
});

module.exports = router;
