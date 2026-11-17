#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <esp_task_wdt.h>

#define GAS_SENSOR_PIN 34
#define GREEN_LED_PIN 26
#define RED_LED_PIN 27
#define BUZZER_PIN 25

const char* WIFI_SSID = "YOUR WIFI SSID";
const char* WIFI_PASSWORD = "YOUR WIFI PASSWORD";
// const char* SERVER_URL = "YOUR BACKEND URL"; // local host
const char* SERVER_URL = "YOUR BACKEND URL";
const char* API_KEY = "YOUR SECURE API KEY";
const char* TELEGRAM_TOKEN = "YOUR TELEGRAM BOT TOKEN ID";
// const char* TELEGRAM_CHAT_ID = "YOUR TELEGRAM CHATID"; //personalchat
const char* TELEGRAM_CHAT_ID = "YOUR TELEGRAM CHATID"; //groupchat
String pendingTelegramMessage = "";
bool sendTelegramFlag = false;
unsigned long lastTelegramTime = 0;
const unsigned long TELEGRAM_COOLDOWN = 30000;
const char* DEVICE_ID = "gas-node-001";

// ---- Timings ----
const unsigned long SEND_INTERVAL_MS = 10000;  // send data every 10 s
// const unsigned long WARMUP_MS = 10UL * 60UL * 1000UL;       // original warmup time
const unsigned long WARMUP_MS = 10000; //demo warmup time
const int SAMPLES_PER_AVERAGE = 20;  // 20 samples x 100 ms = 2 seconds
const int CONFIRM_COUNT = 3;         // 3 averages in a row = about 6 seconds


const int TRIGGER_RISE = 400;  // alarm on when this far above the baseline
const int CLEAR_RISE = 150;    // alarm off when back within this of the baseline
const int CEILING = 1600;      // alarm whatever the baseline says (backstop for slow leaks)

// ---- Baseline learning ----
const float BASELINE_ALPHA = 0.0006;  // per 2-second average, time constant about 55 minutes
const int FREEZE_MARGIN = 50;         // stop learning when more than this above the baseline
const int BASELINE_MIN = 700;         // outside this band = sensor fault, not a new normal
const int BASELINE_MAX = 1300;

// ---- State ----
bool warning = false;
bool warmedUp = false;
bool baselineFault = false;
unsigned long bootTime = 0;

int highCount = 0;
int lowCount = 0;
long total = 0;
int sampleCount = 0;
float baseline = 0.0;

int recent[30];  
int recentIndex = 0;
int recentCount = 0;

// Shared between the alarm loop and the network task
volatile int latestAverage = -1;
volatile bool latestWarning = false;
volatile bool latestFault = false;
volatile bool latestWarmedUp = false;

volatile bool latestSnooze = false;
bool isSnoozed = false;

void networkTask(void* parameter) {
  unsigned long lastSendTime = 0;
  bool lastSentWarning = false;

  while(true) {
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
      unsigned long start = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
        vTaskDelay(500 / portTICK_PERIOD_MS);
      }
    }

    if (WiFi.status() == WL_CONNECTED) {
      
      
      if (sendTelegramFlag) {
        String messageToSend = pendingTelegramMessage;
        sendTelegramFlag = false; 

        WiFiClientSecure secureClient;
        secureClient.setInsecure(); 

        HTTPClient httpTele;
        String url = String("https://api.telegram.org/bot") + TELEGRAM_TOKEN + "/sendMessage";
        
        httpTele.begin(secureClient, url);
        httpTele.addHeader("Content-Type", "application/json");
        
        String telePayload = "{\"chat_id\":\"" + String(TELEGRAM_CHAT_ID) + "\",\"text\":\"" + messageToSend + "\"}";
        int httpCodeTele = httpTele.POST(telePayload);
        
        Serial.print("Telegram | HTTP ");
        if (httpCodeTele > 0) {
          Serial.println(httpCodeTele);
        } else {
          Serial.println(httpTele.errorToString(httpCodeTele));
        }
        httpTele.end();
      }

      
      int avg = latestAverage;
      bool warn = latestWarning;
      bool fault = latestFault;
      bool isWarm = latestWarmedUp;
      bool timeToSend = (millis() - lastSendTime >= SEND_INTERVAL_MS);
      bool stateChanged = (warn != lastSentWarning);

      if (avg >= 0 && (timeToSend || stateChanged)) {
        HTTPClient http;
        http.begin(SERVER_URL);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("x-api-key", API_KEY);
        http.setTimeout(5000);

        String currentStatus;
        if (warn) currentStatus = "WARNING";
        else if (!isWarm) currentStatus = "WARMING_UP";
        else if (fault) currentStatus = "FAULT";
        else currentStatus = "NORMAL";

        String payload = "{\"deviceId\":\"" + String(DEVICE_ID) +
                         "\",\"gasRaw\":" + String(avg) +
                         ",\"alertStatus\":\"" + currentStatus + "\"}";

        int httpCode = http.POST(payload);
        Serial.print("Sent avg ");
        Serial.print(avg);
        Serial.print(" | HTTP ");
        
        if (httpCode > 0) {
          Serial.println(httpCode);
          String response = http.getString();
          if (response.indexOf("\"snooze\":true") > 0 || response.indexOf("\"snooze\": true") > 0) {
            latestSnooze = true;
          } else {
            latestSnooze = false;
          }
        } else {
          Serial.println(http.errorToString(httpCode));
        }
        http.end();

        lastSendTime = millis();
        lastSentWarning = warn;
      }
    }
    vTaskDelay(500 / portTICK_PERIOD_MS);
  }
}

void handleAverage(int average) {
  recent[recentIndex] = average;
  recentIndex = (recentIndex + 1) % 30;
  if (recentCount < 30) recentCount++;

  if (!warmedUp && millis() - bootTime >= WARMUP_MS && recentCount == 30) {
    long sum = 0;
    for (int i = 0; i < 30; i++) sum += recent[i];
    baseline = sum / 30.0;
    warmedUp = true;
    Serial.print("Warm-up complete. Baseline = ");
    Serial.println(baseline, 1);
  }

  float rise = warmedUp ? (average - baseline) : 0;
  bool overCeiling = average > CEILING;
  bool overTrigger = warmedUp && rise > TRIGGER_RISE;

  if (!warning) {
    if (overTrigger || overCeiling) highCount++;
    else highCount = 0;
    
    if (highCount >= CONFIRM_COUNT) {
      warning = true;
      lowCount = 0;
      if (millis() - lastTelegramTime > TELEGRAM_COOLDOWN) {
        pendingTelegramMessage = "🚨 AIRGUARD WARNING: Gas Level crossed threshold. Current reading: " + String(average);
        sendTelegramFlag = true;
        lastTelegramTime = millis();
      }
    }
  } else {
    bool canClear = (average < CEILING) && (!warmedUp || rise < CLEAR_RISE);
    if (canClear) lowCount++;
    else lowCount = 0;
    
    if (lowCount >= CONFIRM_COUNT) {
      warning = false;
      highCount = 0;
      pendingTelegramMessage = "✅ AIRGUARD SAFE: Gas levels have returned to normal. Alarm cleared.";
      sendTelegramFlag = true;
    }
  }

  if (warmedUp && !warning && rise < FREEZE_MARGIN) {
    baseline += BASELINE_ALPHA * (average - baseline);
  }
  
  baselineFault = warmedUp && (baseline < BASELINE_MIN || baseline > BASELINE_MAX);

  static bool faultNotified = false; 
  if (baselineFault && !faultNotified) {
    pendingTelegramMessage = "⚠️ AIRGUARD FAULT: Sensor baseline drifted out of bounds (" + String(baseline, 1) + "). Hardware inspection needed.";
    sendTelegramFlag = true;
    faultNotified = true; 
  } else if (!baselineFault && faultNotified) {
    faultNotified = false; 
  }

  latestAverage = average;
  latestWarning = warning;
  latestFault = baselineFault;
  latestWarmedUp = warmedUp;

  Serial.print("Avg: ");
  Serial.print(average);
  Serial.print(" | Baseline: ");
  Serial.print(baseline, 1);
  Serial.print(" | Rise: ");
  Serial.print(rise, 1);
  Serial.print(" | State: ");
  Serial.println(warning ? "WARNING" : (warmedUp ? "NORMAL" : "WARMING UP"));
}

void updateOutputs() {
  unsigned long now = millis();
  bool green = false;
  bool red = false;
  bool beep = false;

  isSnoozed = latestSnooze;
  if (warning) {
    red = true;
    beep = (!isSnoozed) && ((now % 1000) < 300);
  } else if (!warmedUp) {
    green = ((now / 500) % 2) == 0;  // slow green blink = warming up
  } else if (baselineFault) {
    red = ((now / 250) % 2) == 0;  // fast red blink = sensor fault
  } else {
    green = true;
  }

  digitalWrite(GREEN_LED_PIN, green ? HIGH : LOW);
  digitalWrite(RED_LED_PIN, red ? HIGH : LOW);
  digitalWrite(BUZZER_PIN, beep ? HIGH : LOW);
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(GAS_SENSOR_PIN, ADC_11db);

  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 5000,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  bootTime = millis();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);  

  xTaskCreatePinnedToCore(networkTask, "network", 8192, NULL, 1, NULL, 0);
  pendingTelegramMessage = "✅ AirGuard Hardware Booted and Online!";
  sendTelegramFlag = true;
  Serial.println("Booting. Warming up...");
}

void loop() {
  total += analogRead(GAS_SENSOR_PIN);
  sampleCount++;

  if (sampleCount >= SAMPLES_PER_AVERAGE) {
    int average = total / SAMPLES_PER_AVERAGE;
    total = 0;
    sampleCount = 0;
    handleAverage(average);
  }

  updateOutputs();
  esp_task_wdt_reset();
  delay(100);
}
