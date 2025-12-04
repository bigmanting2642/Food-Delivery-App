require("dotenv").config();
const express = require("express");
const cors = require("cors");


const authRoutes = require("./routes/auth");
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notifications");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => res.send("Backend Running"));

app.listen(process.env.PORT, () =>
  console.log("Server running on port " + process.env.PORT)
);
