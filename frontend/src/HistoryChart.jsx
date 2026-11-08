import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_URL, DEVICE_ID } from "./useLatest";
import { ALARM_ON } from "./Config";

const RANGES = [1, 6, 24]; // hours; must match the server
const POLL_MS = 10000;

const clock = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function HistoryChart() {
  const [hours, setHours] = useState(1);
  const [chart, setChart] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setChart(null);

    async function load() {
      try {
        const res = await fetch(
          `${API_URL}/app/readings/range?deviceId=${DEVICE_ID}&hours=${hours}`
        );
        if (!res.ok) throw new Error(`Server answered ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const to = Date.now();
        setChart({
          points: json.data,
          bucketSeconds: json.bucketSeconds,
          from: to - hours * 60 * 60 * 1000,
          to,
        });
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
  }, [hours]);

  const label = hours === 1 ? "hour" : `${hours} hours`;

  let body;
  if (error) {
    body = <p className="empty">Can't load the history. {error}</p>;
  } else if (!chart) {
    body = <p className="empty">Loading readings.</p>;
  } else if (chart.points.length === 0) {
    body = <p className="empty">No readings in the last {label}. Power the device to see data here.</p>;
  } else {
    body = (
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[chart.from, chart.to]}
              tickFormatter={clock}
              stroke="var(--line)"
              tick={{ fontSize: 12, fill: "var(--soft)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, (max) => Math.max(200, Math.ceil(max / 50) * 50 + 50)]}
              stroke="var(--line)"
              tick={{ fontSize: 12, fill: "var(--soft)" }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              labelFormatter={(t) => new Date(t).toLocaleString()}
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 8,
              }}
              labelStyle={{ color: "var(--soft)" }}
              itemStyle={{ color: "var(--text)" }}
            />
            <ReferenceLine
              y={ALARM_ON}
              stroke="var(--red)"
              strokeDasharray="4 4"
              label={{ value: "alarm", fill: "var(--soft)", fontSize: 12, position: "insideTopRight" }}
            />
            {chart.bucketSeconds > 0 && (
              <Line
                type="linear"
                dataKey="max"
                name="Peak"
                stroke="var(--soft)"
                strokeWidth={1}
                strokeDasharray="2 3"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="linear"
              dataKey="level"
              name="Level"
              stroke="var(--blue)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Sensor level, last {label}</h2>
        <div className="range" role="group" aria-label="Time range">
          {RANGES.map((h) => (
            <button
              key={h}
              type="button"
              className={h === hours ? "is-on" : ""}
              aria-pressed={h === hours}
              onClick={() => setHours(h)}
            >
              {h} h
            </button>
          ))}
        </div>
      </div>
      {body}
    </section>
  );
}