#define GAS_SENSOR_PIN 34
#define GREEN_LED_PIN 26
#define RED_LED_PIN 27
#define BUZZER_PIN 25

const int SAMPLES_PER_AVERAGE = 20;  // 20 samples x 100 ms = 2 seconds
const int ALARM_ON = 150;            // temporary placeholder
const int ALARM_OFF = 100;           // temporary placeholder
const int CONFIRM_COUNT = 3;         // 3 averages in a row = about 6 seconds

bool warning = false;
int highCount = 0;
int lowCount = 0;
long total = 0;
int sampleCount = 0;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(GAS_SENSOR_PIN, ADC_11db);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
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