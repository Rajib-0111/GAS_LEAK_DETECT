import { ALARM_ON, ALARM_OFF, CONFIRM_SECONDS } from "./Config";

export default function Settings() {
  return (
    <main className="content">
      <div className="split">
        <section className="panel">
          <h2>Telegram Emergency Escalation</h2>
          <p className="note" style={{ marginBottom: "15px" }}>
            Automatically ping your phone if a gas leak triggers the alarm and is not cleared within 2 minutes.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Bot Token</label>
              <input 
                type="text" 
                placeholder="e.g. 123456789:ABCdefGHIjkl..." 
                style={{ width: "100%", padding: "10px", background: "var(--bg-panel)", color: "var(--text-main)", border: "1px solid var(--border)", borderRadius: "5px" }} 
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Chat ID</label>
              <input 
                type="text" 
                placeholder="e.g. 987654321" 
                style={{ width: "100%", padding: "10px", background: "var(--bg-panel)", color: "var(--text-main)", border: "1px solid var(--border)", borderRadius: "5px" }} 
              />
            </div>
            <button style={{ padding: "10px", background: "var(--tone-ok, #10b981)", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", width: "fit-content" }}>
              Save API Configuration
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Hardware Calibration</h2>
          <p className="note" style={{ marginBottom: "15px" }}>
            These logic is used in ESP32 firmware and track dynamically against the room's clean-air baseline.
          </p>
          <ul style={{ lineHeight: "2", color: "var(--text-main)", listStylePosition: "inside" }}>
            <li><strong>Warm-up Cycle:</strong> 10 Minutes</li>
            <li><strong>Trigger Threshold:</strong> Baseline + 400 (Cap: {ALARM_ON})</li>
            <li><strong>Clear Threshold:</strong> Baseline + 150 (Cap: {ALARM_OFF})</li>
            <li><strong>Confirmation Time:</strong> {CONFIRM_SECONDS} seconds</li>
            <li><strong>Hardware Watchdog:</strong> 5-second panic reboot</li>
          </ul>
        </section>
      </div>
    </main>
  );
}