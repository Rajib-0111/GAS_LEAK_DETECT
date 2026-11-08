#include <WiFi.h>
#include <HTTPClient.h>

#define GAS_SENSOR_PIN 34
#define GREEN_LED_PIN 26
#define RED_LED_PIN 27
#define BUZZER_PIN 2

const char* WIFI_SSID = "Rajib";
const char* WIFI_PASSWORD = "Rajib@173117";
const char* SERVER_URL = "http://10.182.22.222:3000/app/readings";
const char* API_KEY = "e9bb8f408f4ec40ec035f073d1dca87eb2e7517415bf5857";
const char* DEVICE_ID = "gas-node-001";
const unsigned long SEND_INTERVAL_MS = 10000;  // send every 10 seconds

const int SAMPLES_PER_AVERAGE = 20;  // 20 samples x 100 ms = 2 seconds
const int ALARM_ON = 150;            // temporary placeholder
const int ALARM_OFF = 100;           // temporary placeholder
const int CONFIRM_COUNT = 3;         // 3 averages in a row = about 6 seconds

bool warning = false;
int highCount = 0;
int lowCount = 0;
long total = 0;
int sampleCount = 0;

// Shared between the alarm loop and the network task
volatile int latestAverage = -1;     // -1 means no average calculated yet
volatile bool latestWarning = false;

void networkTask(void* parameter) {
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

    if (WiFi.status() == WL_CONNECTED && avg >= 0) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", API_KEY);
      http.setTimeout(5000);

      String payload = "{\"deviceId\":\"" + String(DEVICE_ID) +
                       "\",\"gasRaw\":" + String(avg) +
                       ",\"alertStatus\":\"" + (warn ? "WARNING" : "NORMAL") + "\"}";

      int httpCode = http.POST(payload);
      Serial.print("Sent avg ");
      Serial.print(avg);
      Serial.print(" | HTTP ");
      Serial.println(httpCode);
      http.end();
    }

    vTaskDelay(SEND_INTERVAL_MS / portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(GAS_SENSOR_PIN, ADC_11db);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);   // does not wait; alerts start right away

  xTaskCreatePinnedToCore(networkTask, "network", 8192, NULL, 1, NULL, 0);
}

void loop() {
  total += analogRead(GAS_SENSOR_PIN);
  sampleCount++;

  if (sampleCount >= SAMPLES_PER_AVERAGE) {
    int average = total / SAMPLES_PER_AVERAGE;
    total = 0;
    sampleCount = 0;

    if (!warning) {
      if (average > ALARM_ON) highCount++;
      else highCount = 0;
      if (highCount >= CONFIRM_COUNT) {
        warning = true;
        lowCount = 0;
      }
    } else {
      if (average < ALARM_OFF) lowCount++;
      else lowCount = 0;
      if (lowCount >= CONFIRM_COUNT) {
        warning = false;
        highCount = 0;
      }
    }

    latestAverage = average;
    latestWarning = warning;

    Serial.print("Average: ");
    Serial.print(average);
    Serial.print(" | State: ");
    Serial.println(warning ? "WARNING" : "NORMAL");
  }

  digitalWrite(GREEN_LED_PIN, warning ? LOW : HIGH);
  digitalWrite(RED_LED_PIN, warning ? HIGH : LOW);

  if (warning && (millis() % 1000) < 300) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  delay(100);
}