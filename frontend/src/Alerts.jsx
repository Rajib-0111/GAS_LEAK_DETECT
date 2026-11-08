import { useEffect, useState } from "react";
import { API_URL, DEVICE_ID } from "./useLatest";

const RANGES = [1, 7, 30]; // days; must match the server
const POLL_MS = 15000;

function duration(ms) {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total} seconds`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes < 60) return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const when = (ms) =>
  new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "medium" });

export default function Alerts() {
  const [days, setDays] = useState(7);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setResult(null);

    async function load() {
      try {
        const res = await fetch(
          `${API_URL}/app/alerts?deviceId=${DEVICE_ID}&days=${days}`
        );
        if (!res.ok) throw new Error(`Server answered ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setResult(json);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [days]);

  const label = days === 1 ? "24 hours" : `${days} days`;

  let body;
  if (error) {
    body = <p className="empty">Can't load alerts. {error}</p>;
  } else if (!result) {
    body = <p className="empty">Loading alerts.</p>;
  } else if (result.count === 0) {
    body = <p className="empty">No alerts in the last {label}. Warnings from the device will be listed here.</p>;
  } else {
    body = (
      <>
        <p className="summary">
          {result.count} alert{result.count === 1 ? "" : "s"} in the last {label}.
          Only alarms that reached the server are listed.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Lasted</th>
                <th>Peak level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((e) => (
                <tr key={e.start}>
                  <td data-label="Started">{when(e.start)}</td>
                  <td data-label="Lasted">{e.readings === 1 ? "One reading" : duration(e.end - e.start)}</td>
                  <td data-label="Peak level">{e.peak}</td>
                  <td data-label="Status">
                    <span className={`badge badge-${e.ongoing ? "bad" : "idle"}`}>
                      {e.ongoing ? "Ongoing" : "Ended"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <main className="content">
      <section className="panel">
        <div className="panel-head">
          <h2>Alert history</h2>
          <div className="range" role="group" aria-label="Time range">
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                className={d === days ? "is-on" : ""}
                aria-pressed={d === days}
                onClick={() => setDays(d)}
              >
                {d === 1 ? "24 h" : `${d} d`}
              </button>
            ))}
          </div>
        </div>
        {body}
      </section>
    </main>
  );
}