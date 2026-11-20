import { useEffect, useLayoutEffect, useState } from "react";
import useLatest, { DEVICE_ID } from "./useLatest";
import Dashboard from "./Dashboard";
import Alerts from "./Alerts";
import Devices from "./Devices";

const APP_NAME = "AirGuard";

const NAV = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Devices", page: "devices" },
  { label: "Alerts", page: "alerts" },
];

const BADGE = {
  normal: { text: "System safe", tone: "ok" },
  warning: { text: "Warning", tone: "bad" },
  fault: { text: "Sensor fault", tone: "warn" },
  warming_up: { text: "Warming up", tone: "warming_up" },
  offline: { text: "No signal", tone: "idle" },
  error: { text: "Server unreachable", tone: "idle" },
  loading: { text: "Connecting", tone: "idle" },
};

const pageFromHash = () => {
  const hash = window.location.hash;
  if (hash === "#alerts") return "alerts";
  if (hash === "#devices") return "devices";
  return "dashboard";
};

export default function App() {
  const latest = useLatest();
  const badge = BADGE[latest.status] || BADGE.offline;

  const safeStatus = latest.status?.toLowerCase() || "offline";
  const isOffline = !["normal", "warning", "fault", "warming_up"].includes(
    safeStatus,
  );

  const [page, setPage] = useState(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setPage(pageFromHash());
      setMenuOpen(false);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // Storage unavailable
    }
    return "dark";
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
      // Storage unavailable
    }
  }

  const pageTitle = page.charAt(0).toUpperCase() + page.slice(1);

  return (
    <>
      <a href="#main-content" className="skip-link button-sm">
        Skip to content
      </a>

      <div className="nav-shell">
        <header className="floating-nav">
          <a href="#dashboard" className="brand title-3">
            <img src="favicon.svg" alt="AirGuard logo" />
            <span>{APP_NAME}</span>
          </a>

          <nav className="nav-links" aria-label="Primary">
            {NAV.map((item) => (
              <a
                key={item.page}
                href={`#${item.page}`}
                className={`nav-item title-4${item.page === page ? " is-active" : ""}`}
                aria-current={item.page === page ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="nav-actions">
            <span className="device-id caption-4 mono">{DEVICE_ID}</span>

            <button
              type="button"
              className="theme-toggle button-sm"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
            >
              <span className="celestial-viewport" aria-hidden="true">
                <svg
                  className="theme-icon sun"
                  viewBox="0 0 256 256"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="128" cy="128" r="56" />
                  <line x1="128" y1="36" x2="128" y2="16" />
                  <line x1="62.9" y1="62.9" x2="48.8" y2="48.8" />
                  <line x1="36" y1="128" x2="16" y2="128" />
                  <line x1="62.9" y1="193.1" x2="48.8" y2="207.2" />
                  <line x1="128" y1="220" x2="128" y2="240" />
                  <line x1="193.1" y1="193.1" x2="207.2" y2="207.2" />
                  <line x1="220" y1="128" x2="240" y2="128" />
                  <line x1="193.1" y1="62.9" x2="207.2" y2="48.8" />
                </svg>
                <svg
                  className="theme-icon moon"
                  viewBox="0 0 256 256"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M216.7,152.6A91.9,91.9,0,0,1,103.4,39.3h0A92,92,0,1,0,216.7,152.6Z" />
                </svg>
              </span>
              <span className="theme-label">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </span>
            </button>

            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="menu-lines" aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
          </div>
        </header>
      </div>

      <nav
        className={`mobile-menu${menuOpen ? " is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        {NAV.map((item, index) => (
          <a
            key={item.page}
            href={`#${item.page}`}
            className={`mobile-menu-link heading-3${item.page === page ? " is-active" : ""}`}
            style={{ transitionDelay: menuOpen ? `${index * 60}ms` : "0ms" }}
            aria-current={item.page === page ? "page" : undefined}
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="stage">
        <div className="page-header">
          <h1 className="heading-4">{pageTitle}</h1>
          <div className="page-header-meta">
            <span className={`badge badge-${badge.tone} caption-3`}>
              <span className={`dot dot-${badge.tone}`} aria-hidden="true" />
              {badge.text}
            </span>
          </div>
        </div>

        {page === "alerts" && <Alerts />}
        {page === "devices" && (
          <Devices
            status={latest.status}
            reading={latest.reading}
            isOffline={isOffline}
          />
        )}
        {page === "dashboard" && <Dashboard {...latest} />}
      </div>
    </>
  );
}
