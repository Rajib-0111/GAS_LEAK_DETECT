#include <WiFi.h>
#include <HTTPClient.h>

#define GAS_SENSOR_PIN 34
#define GREEN_LED_PIN 26
#define RED_LED_PIN 27
#define BUZZER_PIN 25

const char* WIFI_SSID = "Rajib";
const char* WIFI_PASSWORD = "Rajib@173117";
const char* SERVER_URL = "http://10.182.22.222:3000/app/readings";
const char* API_KEY = "e9bb8f408f4ec40ec035f073d1dca87eb2e7517415bf5857";
const char* DEVICE_ID = "gas-node-001";

const unsigned long SEND_INTERVAL_MS = 10000;  // Send normal readings every 10 seconds
const unsigned long WARMUP_TIME_MS = 30000;    // 30 seconds initial sensor settle time

const int SAMPLES_PER_AVERAGE = 20;  // 20 samples x 100 ms = 2 seconds
const int CONFIRM_COUNT = 3;         // Requires 3 consecutive averages (6 seconds) to confirm

// --- DYNAMIC THRESHOLD DELTAS ---
// Triggers if reading is 400 points above the baseline (Ignores smoke/sanitizer, catches gas)
const int TRIGGER_DELTA = 400;       
// Clears alarm when it drops back to within 150 points of baseline
const int CLEAR_DELTA = 150;         

bool warning = false;
bool isWarmedUp = false;
unsigned long bootTime = 0;

int highCount = 0;
int lowCount = 0;
long total = 0;
int sampleCount = 0;

float dynamicBaseline = 0.0;         // The smart tracking baseline

volatile int latestAverage = -1;
volatile bool latestWarning = false;

void networkTask(void* parameter) {
  unsigned long lastSendTime = 0;
  bool lastSentWarningState = false;

  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
      unsigned long start = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
        vTaskDelay(500 / portTICK_PERIOD_MS);
      }
    }

    int avg = latestAverage;
    bool warn = latestWarning;
    unsigned long now = millis();

    bool timeToSend = (now - lastSendTime >= SEND_INTERVAL_MS);
    bool stateChanged = (warn != lastSentWarningState);

    if (WiFi.status() == WL_CONNECTED && avg >= 0 && (timeToSend || stateChanged)) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", API_KEY);
      http.setTimeout(5000);

      String payload = "{\"deviceId\":\"" + String(DEVICE_ID) +
                       "\",\"gasRaw\":" + String(avg) +
                       ",\"alertStatus\":\"" + (warn ? "WARNING" : "NORMAL") + "\"}";

      int httpCode = http.POST(payload);
      
      // --- HTTP RESPONSE CHECK ---
      if (httpCode > 0) {
        Serial.print("Network Task -> Data Sent! HTTP Response: ");
        Serial.println(httpCode); // 200 or 201 means your Node.js server saved it successfully
      } else {
        Serial.print("Network Task -> HTTP POST Failed. Error: ");
        Serial.println(http.errorToString(httpCode).c_str()); // Prints exactly why it failed
      }
      // ---------------------------

      http.end();
      http.end();

      lastSendTime = millis();
      lastSentWarningState = warn;
    }
    vTaskDelay(500 / portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(GAS_SENSOR_PIN, ADC_11db);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  bootTime = millis();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  xTaskCreatePinnedToCore(networkTask, "network", 8192, NULL, 1, NULL, 0);
  Serial.println("Booting. Warming up for 30 seconds...");
}

void loop() {
  total += analogRead(GAS_SENSOR_PIN);
  sampleCount++;

  if (sampleCount >= SAMPLES_PER_AVERAGE) {
    int average = total / SAMPLES_PER_AVERAGE;
    total = 0;
    sampleCount = 0;

    // Handle Initial Warmup & Baseline Locking
    if (!isWarmedUp) {
      if (millis() - bootTime >= WARMUP_TIME_MS) {
        isWarmedUp = true;
        dynamicBaseline = average; // Lock in the initial baseline at the end of warmup
        Serial.print("Warmup complete! Starting Baseline locked at: ");
        Serial.println(dynamicBaseline);
      } else {
        digitalWrite(GREEN_LED_PIN, (millis() / 500) % 2); // Blink green during warmup
        digitalWrite(RED_LED_PIN, LOW);
        digitalWrite(BUZZER_PIN, LOW);
        delay(100);
        return;
      }
    }

    // Dynamic Tracking Logic
    if (!warning) {
      // Slowly drift the baseline to match the room (98% old baseline, 2% new reading)
      dynamicBaseline = (dynamicBaseline * 0.98) + (average * 0.02);

      if (average > (dynamicBaseline + TRIGGER_DELTA)) {
        highCount++;
      } else {
        highCount = 0;
      }
      
      if (highCount >= CONFIRM_COUNT) {
        warning = true;
        lowCount = 0;
      }
    } else {
      // During an alarm, DO NOT update the dynamicBaseline. 
      if (average < (dynamicBaseline + CLEAR_DELTA)) {
        lowCount++;
      } else {
        lowCount = 0;
      }
      
      if (lowCount >= CONFIRM_COUNT) {
        warning = false;
        highCount = 0;
      }
    }

    latestAverage = average;
    latestWarning = warning;

    Serial.print("Avg: ");
    Serial.print(average);
    Serial.print(" | Smart Baseline: ");
    Serial.print(dynamicBaseline, 1);
    Serial.print(" | State: ");
    Serial.println(warning ? "WARNING" : "NORMAL");
  }

  // Local Alerts
  digitalWrite(GREEN_LED_PIN, warning ? LOW : HIGH);
  digitalWrite(RED_LED_PIN, warning ? HIGH : LOW);

  if (warning && (millis() % 1000) < 300) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  delay(100);
}