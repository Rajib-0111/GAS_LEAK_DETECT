import { useState } from "react";
import { API_URL, DEVICE_ID } from "./useLatest";

export default function Devices({ isOffline }) {
  const [snoozeMsg, setSnoozeMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSnooze = async (minutes) => {
    setBusy(true);
    setIsError(false);
    try {
      const response = await fetch(`${API_URL}/app/device/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      const data = await response.json();

      if (data.success) {
        if (minutes === 0) {
          setSnoozeMsg("Buzzer unsnoozed.");
        } else {
          const time = new Date(data.snoozeUntil).toLocaleTimeString();
          setSnoozeMsg(`Buzzer snoozed until ${time}.`);
        }
      } else {
        setIsError(true);
        setSnoozeMsg("Snooze failed. The server rejected the command.");
      }
    } catch {
      setIsError(true);
      setSnoozeMsg("Network error. Backend unreachable.");
    } finally {
      setBusy(false);
    }
  };

  const displayMsg = isOffline
    ? "Hardware is disconnected. Commands cannot be sent until the device reconnects."
    : snoozeMsg;

  return (
    <main id="main-content" className="content">
      <section className="panel">
        <h2 className="title-2">Device management</h2>
        <div className="cards">
          <article className="card">
            <h2 className="title-4">Device ID</h2>
            <p className="value heading-5 mono tone-ok">{DEVICE_ID}</p>
          </article>
          <article className="card">
            <h2 className="title-4">Sensor</h2>
            <p className="value heading-5 tone-idle">MQ2 (SnO2)</p>
          </article>
          <article className="card">
            <h2 className="title-4">Firmware</h2>
            <p className="value heading-5 tone-idle">Beta</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2 className="title-2">Alarm controls</h2>
        <p className="body-6 note">
          Temporarily mute the physical hardware buzzer. The dashboard will
          still display the warning state. If gas levels do not clear before the
          timer expires, the buzzer will resume automatically.
        </p>

        <div className="control-row">
          <button
            type="button"
            onClick={() => handleSnooze(0)}
            className="btn-primary button-md"
            disabled={isOffline || busy}
          >
            Unsnooze
          </button>

          <button
            type="button"
            onClick={() => handleSnooze(1)}
            className="btn-secondary button-md"
            disabled={isOffline || busy}
          >
            Snooze 1 min
          </button>

          <button
            type="button"
            onClick={() => handleSnooze(5)}
            className="btn-secondary button-md"
            disabled={isOffline || busy}
          >
            Snooze 5 min
          </button>

          <button
            type="button"
            onClick={() => handleSnooze(15)}
            className="btn-secondary button-md"
            disabled={isOffline || busy}
          >
            Snooze 15 min
          </button>
        </div>

        {displayMsg && (
          <p
            className={`status-feedback caption-2${isOffline || isError ? " is-error" : ""}`}
            role="status"
          >
            {displayMsg}
          </p>
        )}
      </section>
    </main>
  );
}
