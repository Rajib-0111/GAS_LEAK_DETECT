import { useEffect, useState } from "react";

// Uses whatever address the page was opened from, so it also works on a phone.
export const API_URL = `http://${window.location.hostname}:3000`;
export const DEVICE_ID = "gas-node-001";
const POLL_MS = 5000;
const OFFLINE_AFTER_SECONDS = 30;

export function ago(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function useLatest() {
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

  let status = "loading";
  if (error) status = "error";
  else if (reading) {
    if (seconds > OFFLINE_AFTER_SECONDS) status = "offline";
    else status = reading.alertStatus === "WARNING" ? "warning" : "normal";
  }

  return { reading, seconds, status };
}