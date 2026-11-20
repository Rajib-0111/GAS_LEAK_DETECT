import { useEffect, useState } from "react";
import { API_URL, DEVICE_ID } from "./useLatest";

const RANGES = [1, 7, 30];
const POLL_MS = 15000;

function duration(ms) {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total} seconds`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes < 60)
    return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
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
          `${API_URL}/app/alerts?deviceId=${DEVICE_ID}&days=${days}`,
        );
        if (!res.ok) throw new Error(`Server answered ${res.status}.`);
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
    body = (
      <div className="state-box is-error" role="alert">
        <span className="state-title body-4">Unable to load alerts</span>
        <p className="body-6">
          {error} Verify that the backend service is running and try again.
        </p>
      </div>
    );
  } else if (!result) {
    body = (
      <div className="skeleton-rows" aria-label="Loading alerts">
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    );
  } else if (result.count === 0) {
    body = (
      <div className="state-box">
        <span className="state-title body-4">
          No alerts in the last {label}
        </span>
        <p className="body-6">
          Air quality remained within safe thresholds. Any warnings sent by the
          device will appear here.
        </p>
      </div>
    );
  } else {
    body = (
      <>
        <p className="summary body-6">
          {result.count} alert{result.count === 1 ? "" : "s"} in the last{" "}
          {label}. Only alarms that reached the server are listed.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="caption-3">Started</th>
                <th className="caption-3">Lasted</th>
                <th className="caption-3">Peak level</th>
                <th className="caption-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((e) => (
                <tr key={e.start}>
                  <td data-label="Started" className="body-6 mono">
                    {when(e.start)}
                  </td>
                  <td data-label="Lasted" className="body-6 mono">
                    {e.readings === 1
                      ? "One reading"
                      : duration(e.end - e.start)}
                  </td>
                  <td data-label="Peak level" className="body-5 mono">
                    {e.peak}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`badge caption-3 badge-${e.ongoing ? "bad" : "idle"}`}
                    >
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
    <main id="main-content" className="content">
      <section className="panel">
        <div className="panel-head">
          <h2 className="title-2">Alert history</h2>
          <div className="range" role="group" aria-label="Time range">
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                className={`button-xsm${d === days ? " is-on" : ""}`}
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
