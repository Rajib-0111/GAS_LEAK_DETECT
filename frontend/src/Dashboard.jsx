import { ago, DEVICE_ID } from "./useLatest";
import HistoryChart from "./HistoryChart";
import { ALARM_ON, ALARM_OFF, CONFIRM_SECONDS, SCALE_MAX } from "./Config";

const STATUS_TEXT = {
  normal: "Normal",
  warning: "Warning",
  offline: "No signal",
  error: "Unknown",
  loading: "Connecting",
};

const STATUS_NOTE = {
  normal: "Below the alarm level",
  warning: "The device alarm is on",
  offline: "Waiting for the device",
  error: "Backend not reachable",
  loading: "Waiting for data",
};

const DEVICE_PILL = {
  normal: { text: "Online", tone: "ok" },
  warning: { text: "Alarm", tone: "bad" },
  offline: { text: "Offline", tone: "idle" },
  error: { text: "Unknown", tone: "idle" },
  loading: { text: "Connecting", tone: "idle" },
};

const pct = (value) => `${Math.min(100, (value / SCALE_MAX) * 100)}%`;

export default function Dashboard({ reading, seconds, status }) {
  const level = reading ? reading.gasRaw : null;
  const online = status === "normal" || status === "warning";
  const pill = DEVICE_PILL[status];

  return (
    <main className="content">
      <section className="cards">
        <article className="card">
          <h2>Sensor level</h2>
          <p className={`value tone-${status}`}>{level ?? "–"}</p>
          <p className="note">Raw reading, not ppm</p>
        </article>

        <article className="card">
          <h2>Status</h2>
          <p className="value">
            <span className={`dot dot-${status}`} />
            {STATUS_TEXT[status]}
          </p>
          <p className="note">{STATUS_NOTE[status]}</p>
        </article>

        <article className="card">
          <h2>Device</h2>
          <p className="value">{status === "error" ? "Unknown" : online ? "Online" : "Offline"}</p>
          <p className="note">{reading ? `Updated ${ago(seconds)}` : "No data yet"}</p>
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
            <span className="zone zone-hold" style={{ width: pct(ALARM_ON - ALARM_OFF) }} />
            <span className="zone zone-bad" style={{ flex: 1 }} />
            {level !== null && <span className="pointer" style={{ left: pct(level) }} />}
          </div>
          <ul className="legend">
            <li><span className="swatch zone-ok" />Normal: below {ALARM_OFF}</li>
            <li><span className="swatch zone-hold" />Hold: {ALARM_OFF} to {ALARM_ON}, keeps its current state</li>
            <li><span className="swatch zone-bad" />Alarm: above {ALARM_ON}</li>
          </ul>
          <p className="note">
            The alarm switches after the level stays past a line for about {CONFIRM_SECONDS} seconds.
            These are preliminary values, not calibrated gas levels.
          </p>
        </section>
      </div>

      <section className="panel">
        <h2>Devices</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Status</th>
                <th>Last level</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Device">{DEVICE_ID}</td>
                <td data-label="Status"><span className={`badge badge-${pill.tone}`}>{pill.text}</span></td>
                <td data-label="Last level">{level ?? "–"}</td>
                <td data-label="Last seen">
                  {reading
                    ? `${new Date(reading.timestamp).toLocaleTimeString()}, ${ago(seconds)}`
                    : "No data yet"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}