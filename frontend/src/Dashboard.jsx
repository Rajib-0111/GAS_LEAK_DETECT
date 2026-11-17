import { ago } from "./useLatest";
import HistoryChart from "./HistoryChart";
import { ALARM_ON, ALARM_OFF, SCALE_MAX } from "./Config";

const STATUS_TEXT = {
  normal: "Normal",
  warning: "Warning",
  fault: "Sensor Error",
  warming_up: "Warming up",
  offline: "No signal",
  error: "Unknown",
  loading: "Connecting",
};

const STATUS_NOTE = {
  normal: "Below the alarm level",
  warning: "The device alarm is on",
  fault: "Baseline out of bounds",
  warming_up: "Calibrating sensor",
  offline: "Waiting for the device",
  error: "Backend not reachable",
  loading: "Waiting for data",
};

const DEVICE_PILL = {
  normal: { text: "Online", tone: "ok" },
  warning: { text: "Alarm", tone: "bad" },
  fault: { text: "Fault", tone: "warn" },
  warming_up: { text: "Warming up", tone: "warming_up" },
  offline: { text: "Offline", tone: "idle" },
  error: { text: "Unknown", tone: "idle" },
  loading: { text: "Connecting", tone: "idle" },
};

const pct = (value) => `${Math.min(100, (value / SCALE_MAX) * 100)}%`;

export default function Dashboard({ reading, seconds, status }) {
  const level = reading ? reading.gasRaw : null;

  const safeStatus = status?.toLowerCase() || "offline";
  const online = ["normal", "warning", "fault", "warming_up"].includes(
    safeStatus,
  );

  const pill = DEVICE_PILL[safeStatus] || DEVICE_PILL.error;

  return (
    <main className="content">
      <section className="cards">
        <article className="card">
          <h2>Sensor level</h2>
          <p className={`value tone-${pill.tone}`}>{level ?? "–"}</p>
          <p className="note">Raw reading, not ppm</p>
        </article>

        <article className="card">
          <h2>Status</h2>
          <p className="value">
            <span className={`dot dot-${pill.tone}`} />
            {STATUS_TEXT[safeStatus]}
          </p>
          <p className="note">{STATUS_NOTE[safeStatus]}</p>
        </article>

        <article className="card">
          <h2>Device</h2>
          <p className="value">
            {status === "error" ? "Unknown" : online ? "Online" : "Offline"}
          </p>
          <p className="note">
            {reading ? `Updated ${ago(seconds)}` : "No data yet"}
          </p>
        </article>

        <article className="card">
          <h2>Alarm level</h2>
          <p className="value">{ALARM_ON}</p>
          <p className="note">Turns off below {ALARM_OFF}</p>
        </article>
      </section>

      <div className="split">
        <HistoryChart />

        <section className="panel">
          <h2>Alarm thresholds</h2>
          <div
            className="zones"
            role="img"
            aria-label={`Level ${level ?? "unknown"} on a scale up to ${SCALE_MAX}`}
          >
            <span className="zone zone-ok" style={{ width: pct(ALARM_OFF) }} />
            <span
              className="zone zone-hold"
              style={{ width: pct(ALARM_ON - ALARM_OFF) }}
            />
            <span className="zone zone-bad" style={{ flex: 1 }} />
            {level !== null && (
              <span className="pointer" style={{ left: pct(level) }} />
            )}
          </div>
          <ul className="legend">
            <li>
              <span className="swatch zone-ok" />
              Normal: below {ALARM_OFF}
            </li>
            <li>
              <span className="swatch zone-hold" />
              Hold: {ALARM_OFF} to {ALARM_ON}
            </li>
            <li>
              <span className="swatch zone-bad" />
              Alarm: above {ALARM_ON}
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
