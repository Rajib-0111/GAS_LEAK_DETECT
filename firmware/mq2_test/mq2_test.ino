#define GAS_SENSOR_PIN 34
void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(GAS_SENSOR_PIN, ADC_11db);
}

void loop() {
  // put your main code here, to run repeatedly:
  int val = analogRead(GAS_SENSOR_PIN);
  Serial.println(val);
  delay(1000);
}
