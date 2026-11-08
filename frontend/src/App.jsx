import { useEffect, useLayoutEffect, useState } from "react";
import useLatest, { DEVICE_ID } from "./useLatest";
import Dashboard from "./Dashboard";
import Alerts from "./Alerts";

const APP_NAME = "AirGuard"; // placeholder name, change it freely

const NAV = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Devices" },
  { label: "Alerts", page: "alerts" },
  { label: "Settings" },
];

const BADGE = {
  normal: { text: "System safe", tone: "ok" },
  warning: { text: "Warning", tone: "bad" },
  offline: { text: "No signal", tone: "idle" },
  error: { text: "Server unreachable", tone: "idle" },
  loading: { text: "Connecting", tone: "idle" },
};

const pageFromHash = () => (window.location.hash === "#alerts" ? "alerts" : "dashboard");

export default function App() {
  const latest = useLatest();
  const badge = BADGE[latest.status];

  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // storage unavailable: fall back to the system setting
    }
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore: the choice just won't be remembered
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">{APP_NAME}</div>
        <nav>
          {NAV.map((item) =>
            item.page ? (
              <a
                key={item.label}
                href={`#${item.page}`}
                className={`nav-item${item.page === page ? " is-active" : ""}`}
                aria-current={item.page === page ? "page" : undefined}
              >
                {item.label}
              </a>
            ) : (
              <span key={item.label} className="nav-item is-soon" title="Coming soon">
                {item.label}
              </span>
            )
          )}
        </nav>
      </aside>

      <div className="stage">
        <header className="topbar">
          <h1>{page === "alerts" ? "Alerts" : "Dashboard"}</h1>
          <div className="topbar-right">
            <span className="device-id">{DEVICE_ID}</span>
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <span className={`badge badge-${badge.tone}`}>{badge.text}</span>
          </div>
        </header>
        {page === "alerts" ? <Alerts /> : <Dashboard {...latest} />}
      </div>
    </div>
  );
}