import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000";
const DEVICE_ID = "gas-node-001";
const POLL_MS = 5000;
const OFFLINE_AFTER_SECONDS = 30;
const ALARM_LEVEL = 150; // placeholder: same as the ESP32 sketch for now
const SCALE_MAX = 300;

function ago(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function LatestReading() {
  const [reading, setReading] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${API_URL}/app/readings/latest?deviceId=${DEVICE_ID}`
        );
        if (!res.ok) throw new Error(`Server answered ${res.status}`);
        const json = await res.json();
        setReading(json.data);
        setError("");
      } catch (err) {
        setError(err.message);
      }
    }

    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const seconds = reading
    ? Math.max(0, Math.round((now - new Date(reading.timestamp).getTime()) / 1000))
    : 0;

  let mood = "offline";
  let headline = "Connecting to the sensor.";
  let detail = "Waiting for the first reading.";

  if (error) {
    headline = "Can't reach the server.";
    detail = "Check that the backend is running on port 3000.";
  } else if (reading) {
    if (seconds > OFFLINE_AFTER_SECONDS) {
      headline = "No signal from the sensor.";
      detail = `Last reading ${ago(seconds)}. If the device has power, its own alarm still works.`;
    } else if (reading.alertStatus === "WARNING") {
      mood = "warning";
      headline = "Gas or smoke detected.";
      detail = "The device alarm is on. Check the area and open a window.";
    } else {
      mood = "normal";
      headline = "Air looks normal.";
      detail = "No gas or smoke above the alarm level.";
    }
  }

  const showMeter = reading && !error;
  const level = reading ? reading.gasRaw : 0;
  const fill = Math.min(100, (level / SCALE_MAX) * 100);
  const markAt = (ALARM_LEVEL / SCALE_MAX) * 100;

  return (
    <div className="screen" data-mood={mood}>
      <header className="device">{DEVICE_ID}</header>

      <main>
        <div aria-live="polite">
          <h1>{headline}</h1>
          <p className="detail">{detail}</p>
        </div>

        {showMeter && (
          <section className="meter" aria-label="Sensor level">
            <p className="level-value">{level}</p>
            <p className="level-note">Sensor level, raw reading (not ppm)</p>
            <div className="track">
              <span className="fill" style={{ width: `${fill}%` }} />
              <span className="mark" style={{ left: `${markAt}%` }} />
              <span className="mark-label" style={{ left: `${markAt}%` }}>
                alarm at {ALARM_LEVEL}
              </span>
            </div>
            <p className="updated">Updated {ago(seconds)}</p>
          </section>
        )}
      </main>

      <footer>Prototype for learning. Not a certified safety alarm.</footer>
    </div>
  );
}
