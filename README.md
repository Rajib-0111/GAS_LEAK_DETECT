# 🛡️ AirGuard - IoT Gas Leak Detection System

AirGuard is a full-stack IoT solution designed to monitor indoor air quality and detect gas leaks in real-time. It connects an ESP32-powered MQ-2 gas sensor to a MERN stack dashboard, providing real-time analytics, hardware control, automated Telegram alerts, and historical data visualization.

## ✨ Key Features

- **Real-Time Dashboard:** Live sensor readings, system status (Normal, Warning, Fault, Warming Up), and dynamic status indicators.
- **Hardware Control (Snooze):** Remotely mute the physical hardware buzzer from the web dashboard for 1, 5, or 15 minutes.
- **Telegram Emergency Escalation:** Automatically sends push notifications to a configured Telegram chat if a gas leak triggers the alarm.
- **Historical Analytics:** View 1-hour, 6-hour, and 24-hour historical data charts with peak value tracking.
- **Automated Database Maintenance:** Built-in cron job safely purges old data nightly to optimize cloud storage limits.
- **Modern UI/UX:** Fully responsive design with an animated Light/Dark mode toggle and a glassmorphism aesthetic.

## 🛠️ Tech Stack

**Frontend:**
- React.js (Vite)
- Recharts (Data Visualization)
- Pure CSS (Custom theming with CSS variables)

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose (Cloud Database)
- `node-cron` (Automated tasks)
- node-fetch (Telegram API integration)

**Hardware:**
- ESP32 Microcontroller
- MQ-2 (SnO2) Gas Sensor
- Active Buzzer

## 🚀 Getting Started

### 1. Backend Setup
Navigate to the backend directory, install dependencies, and set up your environment variables.

```bash
cd backend
npm install
```

Create a `.env` file in the root of the backend directory:
```env
PORT=3000
DB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/airguard
DEVICE_API_KEY=your_secure_hardware_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

Start the backend server:
```bash
npm start
```

### 2. Frontend Setup
Navigate to the frontend directory and install dependencies.

```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

### 3. Hardware (ESP32) Configuration
Ensure your ESP32 is flashing data to the `/app/readings` endpoint using a `POST` request every 10 seconds. Include the `x-api-key` header matching your `DEVICE_API_KEY`.

## 🗄️ Database Retention Policy (Cron Job)

To prevent database bloat from the constant 10-second hardware heartbeats, the backend includes an automated maintenance script.

The script runs automatically at **2:00 AM IST** every day and enforces the following retention rules:
- **Standard Readings (`NORMAL`):** Deleted after **24 hours**. (Ensures the 24-hour history chart is always full while saving space).
- **Alerts/Faults (`WARNING`, `FAULT`):** Retained for **30 days** for safety compliance and historical review in the Alerts tab.

## 📡 Core API Endpoints

- `GET /app/readings/latest` - Fetches the most recent sensor reading.
- `GET /app/readings/range` - Fetches aggregated data buckets for charting (1h, 6h, 24h).
- `GET /app/alerts` - Retrieves history of warnings/faults over the last 1, 7, or 30 days.
- `POST /app/readings` - Hardware endpoint to post new sensor data.
- `POST /app/device/snooze` - Dashboard endpoint to set the hardware buzzer snooze timer.