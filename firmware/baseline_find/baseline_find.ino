#define GAS_SENSOR_PIN 34

const int SAMPLES_PER_MINUTE = 120;   // 120 samples x 500 ms = 60 seconds
int minuteNumber = 0;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(GAS_SENSOR_PIN, ADC_11db);
  Serial.println("Minute Average Minimum Maximum");
}

void loop() {
  long total = 0;
  int minimum = 4095;
  int maximum = 0;

  for (int i = 0; i < SAMPLES_PER_MINUTE; i++) {
    int value = analogRead(GAS_SENSOR_PIN);
    total += value;
    if (value < minimum) minimum = value;
    if (value > maximum) maximum = value;
    delay(500);
  }

  minuteNumber++;
  Serial.print(minuteNumber);
  Serial.print(",");
  Serial.print((float)total / SAMPLES_PER_MINUTE, 1);
  Serial.print(",");
  Serial.print(minimum);
  Serial.print(",");
  Serial.println(maximum);
}