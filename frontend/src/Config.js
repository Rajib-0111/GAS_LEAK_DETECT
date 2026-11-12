// One place for the alarm numbers shown on the dashboard.
// Keep these in step with the ESP32 sketch until we set the final thresholds.
export const ALARM_ON = 1360;       // 960 baseline + 400 TRIGGER_DELTA
export const ALARM_OFF = 1110;      // 960 baseline + 150 CLEAR_DELTA
export const CONFIRM_SECONDS = 6;
export const SCALE_MAX = 2500;