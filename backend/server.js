const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");
const cron = require('node-cron');

const app = express();

const SensorReading = require("./models/SensorReading");
const { type } = require("node:os");

let snoozeUntil = 0;

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

app.post("/app/device/snooze", (req, res) => {
  const { minutes } = req.body;
  if (minutes === 0){
    snoozeUntil = 0;
    sendTelegram("🔔 AIRGUARD UPDATE: Alarm unsnoozed manually. Audio alerts are active.");
  }
  else{
    snoozeUntil = Date.now() + minutes * 60 * 1000;
    sendTelegram(`🔕 AIRGUARD UPDATE: Alarm snoozed for ${minutes} minutes.`);
  }

  res.json({
    success: true,
    message: `Snoozed for ${minutes} minutes`,
    snoozeUntil,
  });
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
      !["NORMAL", "WARNING", "FAULT", "WARMING_UP"].includes(
        alertStatus.toUpperCase(),
      )
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
    const isSnoozed = Date.now() < snoozeUntil;
    res.status(201).json({
      success: true,
      message: "Reading Saved",
      data: reading,
      snooze: isSnoozed,
    });
  } catch (err) {
    console.error("Error saving sensor reading:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to save sensor reading",
    });
  }
});

const RANGES = {
  1: 0, // raw readings
  6: 60 * 1000, // 1-minute buckets
  24: 5 * 60 * 1000, // 5-minute buckets
};

app.get("/app/readings/range", async (req, res) => {
  try {
    let deviceId = "gas-node-001";
    if (typeof req.query.deviceId === "string" && req.query.deviceId.trim()) {
      deviceId = req.query.deviceId.trim();
    }

    const requested = Number(req.query.hours);
    const hours = RANGES[requested] !== undefined ? requested : 1;
    const bucketMs = RANGES[hours];
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    let data;
    if (bucketMs === 0) {
      const rows = await SensorReading.find({
        deviceId,
        timestamp: { $gte: since },
      })
        .sort({ timestamp: 1 })
        .select("gasRaw alertStatus timestamp");
      data = rows.map((r) => ({
        t: r.timestamp.getTime(),
        level: r.gasRaw,
        max: r.gasRaw,
        warning: r.alertStatus === "WARNING",
      }));
    } else {
      const buckets = await SensorReading.aggregate([
        { $match: { deviceId, timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              $subtract: [
                { $toLong: "$timestamp" },
                { $mod: [{ $toLong: "$timestamp" }, bucketMs] },
              ],
            },
            level: { $avg: "$gasRaw" },
            max: { $max: "$gasRaw" },
            warning: {
              $max: { $cond: [{ $eq: ["$alertStatus", "WARNING"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      data = buckets.map((b) => ({
        t: Number(b._id),
        level: Math.round(b.level),
        max: b.max,
        warning: b.warning === 1,
      }));
    }

    res.json({
      success: true,
      hours,
      bucketSeconds: bucketMs / 1000,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Error fetching range:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch readings" });
  }
});

app.get("/app/alerts", async (req, res) => {
  try {
    let deviceId = "gas-node-001";
    if (typeof req.query.deviceId === "string" && req.query.deviceId.trim()) {
      deviceId = req.query.deviceId.trim();
    }

    const requested = Number(req.query.days);
    const days = [1, 7, 30].includes(requested) ? requested : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await SensorReading.find({
      deviceId,
      alertStatus: "WARNING",
      timestamp: { $gte: since },
    })
      .sort({ timestamp: 1 })
      .select("gasRaw timestamp")
      .limit(20000);

    const GAP_MS = 30 * 1000; // readings arrive every 10 s, so a bigger gap starts a new event
    const events = [];
    for (const r of rows) {
      const t = r.timestamp.getTime();
      const last = events[events.length - 1];
      if (last && t - last.end <= GAP_MS) {
        last.end = t;
        last.peak = Math.max(last.peak, r.gasRaw);
        last.readings += 1;
      } else {
        events.push({ start: t, end: t, peak: r.gasRaw, readings: 1 });
      }
    }

    const now = Date.now();
    const data = events
      .map((e) => ({ ...e, ongoing: now - e.end <= GAP_MS }))
      .reverse(); // newest first

    res.json({ success: true, days, count: data.length, data });
  } catch (err) {
    console.error("Error fetching alerts:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("Db Connected Successfully....");
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server Started At ${PORT}`);
      sendTelegram("✅ AirGuard server started");
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram Not Configured...");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    if (!res.ok) console.error("Telegram answered", res.status);
    return res.ok;
  } catch (err) {
    console.error("Telegram error:", err.message);
    return false;
  }
}

cron.schedule('0 2 * * *', async () => {
  try {
    const oneDaysAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const normalResult = await SensorReading.deleteMany({ 
      timestamp: { $lt: oneDaysAgo },
      alertStatus: 'NORMAL' 
    });

    const alertResult = await SensorReading.deleteMany({ 
      timestamp: { $lt: thirtyDaysAgo } 
    });
    
    console.log(`DB CLEANED: Deleted ${normalResult.deletedCount} standard readings and ${alertResult.deletedCount} expired alerts.`);
    
  } catch (error) {
    console.error("Cron Error:", error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});


startServer();
