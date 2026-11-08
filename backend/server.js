const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");
const app = express();

const SensorReading = require("./models/SensorReading");
const { type } = require("node:os");

function requireDeviceKey(req, res, next) {
  const key = req.get("x-api-key");
  if (!key || key !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/app/", (req, res) => {
  res.json({
    message: "Api Running",
  });
});

app.get("/app/readings/latest", async (req, res) => {
  try {
    let deviceId = "gas-node-001";
    if (typeof req.query.deviceId === "string" && req.query.deviceId.trim()) {
      deviceId = req.query.deviceId.trim();
    }

    const latest = await SensorReading.findOne({ deviceId }).sort({
      timestamp: -1,
    });

    if (!latest) {
      return res
        .status(404)
        .json({ success: false, message: "No readings found" });
    }

    res.json({ success: true, data: latest });
  } catch (err) {
    console.error("Error fetching latest reading:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch reading" });
  }
});

app.get("/app/readings", async (req, res) => {
  try {
    let deviceId = "gas-node-001";
    if (typeof req.query.deviceId === "string" && req.query.deviceId.trim()) {
      deviceId = req.query.deviceId.trim();
    }

    let limit = 100;
    const requested = parseInt(req.query.limit, 10);
    if (Number.isInteger(requested) && requested >= 1) {
      limit = Math.min(requested, 500);
    }

    const readings = await SensorReading.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, count: readings.length, data: readings });
  } catch (err) {
    console.error("Error fetching readings:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch readings" });
  }
});

app.post("/app/readings", requireDeviceKey, async (req, res) => {
  try {
    const { deviceId, gasRaw, alertStatus } = req.body;
    if (
      typeof deviceId !== "string" ||
      !deviceId.trim() ||
      gasRaw === undefined ||
      typeof gasRaw !== "number" ||
      !Number.isInteger(gasRaw) ||
      gasRaw < 0 ||
      typeof alertStatus !== "string" ||
      !["NORMAL", "WARNING"].includes(alertStatus.toUpperCase())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Data",
      });
    }
    const reading = await SensorReading.create({
      deviceId: deviceId.trim(),
      gasRaw,
      alertStatus: alertStatus.toUpperCase(),
    });
    res.status(201).json({
      success: true,
      message: "Reading Saved",
      data: reading,
    });
  } catch (err) {
    console.error("Error saving sensor reading:", err.message);
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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server Started At ${PORT}`);
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

startServer();
