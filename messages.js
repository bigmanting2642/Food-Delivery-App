const express = require("express");
const router = express.Router();
const pool = require("../db");

console.log(">>> messages.js loaded <<<");

// GET all messages
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, from_user, to_user, text, created_at
       FROM messages
       ORDER BY created_at ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET messages failed:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// POST a new message
router.post("/", async (req, res) => {
  const { from_user, to_user, text } = req.body;

  console.log("USING PATCHED MESSAGE ROUTE");
  console.log("POST /messages BODY:", req.body);

  if (!text || !from_user) {
    return res.status(400).json({ error: "text and from_user required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (from_user, to_user, text)
       VALUES ($1, $2, $3)
       RETURNING id, from_user, to_user, text, created_at`,
      [from_user, to_user || null, text]
    );

    const saved = result.rows[0];
    console.log("INSERT RESULT:", saved);

    // send a clean object back
    res.json(saved);
  } catch (err) {
    console.error("POST message failed:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

module.exports = router;
