
// src/types/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MQTT_HOST: string
  readonly VITE_MQTT_PORT: string
  readonly VITE_MQTT_PROTOCOL: string
  readonly VITE_MQTT_USERNAME: string
  readonly VITE_MQTT_PASSWORD: string
  readonly VITE_MQTT_TOPIC_HEADSET: string
  readonly VITE_MQTT_TOPIC_MOUSE: string
  readonly VITE_HA_BASE_URL: string
  readonly VITE_HA_TOKEN: string
  readonly VITE_WEATHER_API_KEY: string
  readonly VITE_WEATHER_CITY: string
  readonly VITE_WEATHER_COUNTRY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}