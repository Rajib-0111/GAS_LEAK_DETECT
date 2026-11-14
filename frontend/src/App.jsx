import { useEffect, useLayoutEffect, useState } from "react";
import useLatest, { DEVICE_ID } from "./useLatest";
import Dashboard from "./Dashboard";
import Alerts from "./Alerts";
import Devices from "./Devices";
import Settings from "./Settings";

const APP_NAME = "AirGuard";

const NAV = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Devices", page: "devices" },
  { label: "Alerts", page: "alerts" },
  { label: "Settings", page: "settings" },
];

const BADGE = {
  normal: { text: "SYSTEM SAFE", tone: "ok" },
  warning: { text: "WARNING", tone: "bad" },
  fault: { text: "SENSOR FAULT", tone: "warn" },
  warming_up: { text: "WARMING UP", tone: "warming_up" },
  offline: { text: "NO SIGNAL", tone: "idle" },
  error: { text: "SERVER UNREACHABLE", tone: "idle" },
  loading: { text: "CONNECTING", tone: "idle" },
};

const pageFromHash = () => {
  const hash = window.location.hash;
  if (hash === "#alerts") return "alerts";
  if (hash === "#devices") return "devices";
  if (hash === "#settings") return "settings";
  return "dashboard";
};

export default function App() {
  const latest = useLatest();
  const badge = BADGE[latest.status] || BADGE.offline;

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
      // storage unavailable: fall back to the default
    }
    return "light";
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  // Capitalize the first letter of the page for the topbar title
  const pageTitle = page.charAt(0).toUpperCase() + page.slice(1);

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
              <span
                key={item.label}
                className="nav-item is-soon"
                title="Coming soon"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>
      </aside>

      <div className="stage">
        <header className="topbar">
          <h1>{pageTitle}</h1>
          <div className="topbar-right">
            <span className="device-id">{DEVICE_ID}</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <div className="celestial-viewport">
                <svg
                  className="theme-icon sun"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>

                <svg
                  className="theme-icon moon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
              </div>
              <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </button>
            <span className={`badge badge-${badge.tone}`}>{badge.text}</span>
          </div>
        </header>
        {page === "alerts" && <Alerts />}
        {page === "devices" && (
          <Devices status={latest.status} reading={latest.reading} />
        )}
        {page === "settings" && <Settings />}
        {page === "dashboard" && <Dashboard {...latest} />}
      </div>
    </div>
  );
}
