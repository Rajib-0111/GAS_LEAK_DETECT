
const mongoose = require("mongoose");

const sensorReadingSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true
  },

  gasRaw: {
    type: Number,
    required: true,
    min: 0,
    max: 4095
  },

  alertStatus: {
    type: String,
    enum: ["NORMAL", "WARNING"],
    required: true
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model(
  "SensorReading",
  sensorReadingSchema
);
