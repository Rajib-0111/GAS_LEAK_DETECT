const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");
const app = express();

const SensorReading = require("./models/SensorReading");
const { type } = require("node:os");

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/app/", (req, res) => {
  res.json({
    message: "Api Running",
  });
});

app.post("/app/readings", async (req, res) => {
  try {
    const { deviceId, gasRaw, alertStatus } = req.body;
    if (
      typeof deviceId !== "string" ||
      !deviceId.trim() ||
      gasRaw === undefined ||
      typeof gasRaw !== "number" ||
      !Number.isInteger(gasRaw) ||
      gasRaw < 0 ||
      gasRaw > 4095 ||
      !["Normal", "Warning"].includes(alertStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Data",
      });
    }
    const reading = await SensorReading.create({
      deviceId: deviceId.trim(),
      gasRaw,
      alertStatus,
    });
    res.status(201).json({
      success: true,
      message: "Reading Saved",
      data: reading,
    });
  } catch (err) {
    console.error("Error saving sensor reading:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save sensor reading",
    });
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("Db Connected Successfully....");
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server Started At ${PORT}`);
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

startServer();
