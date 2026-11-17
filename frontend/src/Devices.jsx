import { useState } from "react";
import { DEVICE_ID } from "./useLatest";


export default function Devices({ status, reading, isOffline }) {
  const [snoozeMsg, setSnoozeMsg] = useState("");

  const handleSnooze = async (minutes) => {
    try {
      // "http://localhost:3000/app/device/snooze" local host
      const response = await fetch(
        "https://gas-leak-detect.onrender.com/app/device/snooze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes }),
        },
      );
      const data = await response.json();

      if (data.success) {
        if (minutes === 0) {
          setSnoozeMsg("Buzzer unsnoozed");
        } else {
          const time = new Date(data.snoozeUntil).toLocaleTimeString();
          setSnoozeMsg(`Buzzer snoozed until ${time}`);
        }
      } else {
        setSnoozeMsg("Failed to snooze.");
      }
    } catch (error) {
      console.error("Error snoozing device:", error);
      setSnoozeMsg("Network error. Backend unreachable.");
    }
  };

  const displayMsg = isOffline 
    ? "⚠️Hardware is disconnected. Commands cannot be sent." 
    : snoozeMsg;

  return (
    <main className="content">
      <section className="panel" style={{ marginBottom: "20px" }}>
        <h2>Device Management</h2>
        <div className="cards" style={{ marginTop: "15px" }}>
          <article className="card">
            <h2>Device ID</h2>
            <p className="value tone-ok">{DEVICE_ID}</p>
          </article>
          <article className="card">
            <h2>Sensor</h2>
            <p className="value tone-idle">MQ-2 (SnO2)</p>
          </article>
          <article className="card">
            <h2>Firmware</h2>
            <p className="value tone-idle">BETA</p>
          </article>
        </div>
      </section>
      <section className="panel">
        <h2>Alarm Controls</h2>
        <p className="note" style={{ marginBottom: "15px" }}>
          Temporarily mute the physical hardware buzzer. The dashboard will
          still display the WARNING state. If the gas is not cleared before the
          timer expires, the buzzer will automatically resume.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <button onClick={() => handleSnooze(0)} className="theme-snooze-btn" disabled={isOffline}>
            Unsnooze
          </button>

          <button onClick={() => handleSnooze(1)} className="theme-snooze-btn" disabled={isOffline}>
            Snooze 1 Min
          </button>

          <button onClick={() => handleSnooze(5)} className="theme-snooze-btn" disabled={isOffline}>
            Snooze 5 Min
          </button>

          <button onClick={() => handleSnooze(15)} className="theme-snooze-btn" disabled={isOffline}>
            Snooze 15 Min
          </button>
            {displayMsg && (<span
              style={{
                flex: "1 1 100%",
                marginTop: "5px",
                color: "var(--text-muted)",
              }}
            >
              {displayMsg}
            </span>)}
        </div>
      </section>
    </main>
  );
}
