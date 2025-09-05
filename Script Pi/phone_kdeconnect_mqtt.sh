#!/usr/bin/env bash
# phone_kdeconnect_mqtt.sh — QUIET
# Publie: batterie + notifications (résumé + détails) vers MQTT (retain), sans ping ni logs console.
#
# Dépendances: kdeconnect, glib2.0-bin (gdbus), mosquitto-clients, coreutils, bash >=4
# Config via env (/etc/default/phone-kdeconnect-mqtt ou ~/.config/phone-kdeconnect-mqtt.env):
#   DEVICE_ID, MQTT_BROKER, MQTT_PORT, MQTT_USER, MQTT_PASS, BASE_TOPIC, REFRESH_SEC, MAX_NOTIF
#
# Topics:
#   {BASE_TOPIC}/battery
#   {BASE_TOPIC}/notifications/summary
#   {BASE_TOPIC}/notifications/details

set -Eeuo pipefail

: "${DEVICE_ID:=79ba26b83c8e4a79bc818e4f6b1e5891}"
: "${MQTT_BROKER:=192.168.1.181}"
: "${MQTT_PORT:=1883}"
: "${MQTT_USER:=FlopGyver}"
: "${MQTT_PASS:=fvvENT123***}"
: "${BASE_TOPIC:=homeassistant/deskontroler/phone}"
: "${REFRESH_SEC:=2}"
: "${MAX_NOTIF:=10}"

# Single instance
mkdir -p /run/lock
exec 9> /run/lock/phone_kdeconnect_mqtt.lock
if ! flock -n 9; then
  exit 0
fi

# ----- Utils -----
json_escape() {
  sed -e 's/\\/\\\\/g'           -e 's/"/\\"/g'           -e 's/\r/ /g'           -e 's/\n/ /g'           -e 's/\t/ /g'
}

mqtt_pub() {
  local topic="$1"; shift
  local payload="$1"; shift || true
  mosquitto_pub -h "$MQTT_BROKER" -p "$MQTT_PORT" -u "$MQTT_USER" -P "$MQTT_PASS"         -t "$topic" -m "$payload" -r >/dev/null 2>&1 || true
}

# ----- Batterie -----
get_battery() {
  gdbus call --session --dest org.kde.kdeconnect         --object-path "/modules/kdeconnect/devices/${DEVICE_ID}/battery"         --method org.freedesktop.DBus.Properties.Get         org.kde.kdeconnect.device.battery charge 2>/dev/null         | grep -o '[0-9]\+' | head -1 || true
}

# ----- Notifications -----
get_active_notification_ids() {
  local raw
  raw=$(gdbus call --session --dest org.kde.kdeconnect               --object-path "/modules/kdeconnect/devices/${DEVICE_ID}/notifications"               --method org.kde.kdeconnect.device.notifications.activeNotifications 2>/dev/null || true)
  if [[ -z "$raw" || "$raw" =~ \[\] ]]; then
    return 0
  fi
  echo "$raw" | grep -o "'[0-9][0-9]*'" | sed "s/'//g" || true
}

get_notification_detail() {
  local id="$1"
  local props
  props=$(gdbus call --session --dest org.kde.kdeconnect                 --object-path "/modules/kdeconnect/devices/${DEVICE_ID}/notifications/${id}"                 --method org.freedesktop.DBus.Properties.GetAll                 org.kde.kdeconnect.device.notification 2>/dev/null || true) || return 1
  [[ -z "$props" ]] && return 1

  local app title text clearable
  app=$(   echo "$props" | grep -o "'appName': <'[^']*'>"   | sed "s/.*<'//; s/'>.*//" )
  title=$( echo "$props" | grep -o "'title': <'[^']*'>"     | sed "s/.*<'//; s/'>.*//" )
  text=$(  echo "$props" | grep -o "'text': <'[^']*'>"      | sed "s/.*<'//; s/'>.*//" )
  if [[ -z "$text" ]]; then
    text=$(echo "$props" | grep -o "'ticker': <'[^']*'>" | sed "s/.*<'//; s/'>.*//")
  fi
  clearable=$(echo "$props" | grep -o "'isClearable': <[^>]*>" | sed "s/.*<//; s/>.*//")
  [[ -z "$clearable" ]] && clearable="false"

  if [[ ${#text} -gt 200 ]]; then
    text="${text:0:197}..."
  fi

  printf '{"id":"%s","app":"%s","title":"%s","text":"%s","clearable":%s}'         "$(echo -n "$id"        | json_escape)"         "$(echo -n "${app:-}"   | json_escape)"         "$(echo -n "${title:-}" | json_escape)"         "$(echo -n "${text:-}"  | json_escape)"         "$( [[ "$clearable" =~ [Tt]rue ]] && echo true || echo false )"
}

build_notifications_payloads() {
  local ids apps total details arr count=0
  mapfile -t ids < <(get_active_notification_ids)

  if (( ${#ids[@]} == 0 )); then
    echo "summary={\"total\":0,\"apps\":[]};details=[]"
    return 0
  fi

  details="["
  for id in "${ids[@]}"; do
    (( count++ ))
    if (( count > MAX_NOTIF )); then break; fi
    item=$(get_notification_detail "$id" | tr -d '\n' | tr -d '\r')
    [[ -n "$item" ]] && details="${details}${item},"
    app=$(echo "$item" | sed 's/.*"app":"\([^"]*\)".*/\1/') || true
    [[ -n "$app" ]] && apps+="${app}\n"
  done
  details="${details%,}]"

  total=${#ids[@]}
  local apps_unique
  if [[ -n "$apps" ]]; then
    apps_unique=$(printf "%b" "$apps" | sort -u | head -5 | sed 's/"/\"/g' | paste -sd "," -)
  fi
  echo "summary={\"total\":${total},\"apps\":[${apps_unique:+"${apps_unique//,/","}"}]};details=${details}"
}

# ----- Main loop -----
trap 'exit 0' INT TERM

while true; do
  battery="$(get_battery || true)"
  [[ -n "${battery:-}" ]] && mqtt_pub "${BASE_TOPIC}/battery" "${battery}"

  notif_out="$(build_notifications_payloads)"
  summary_json="$(echo "$notif_out" | sed 's/^summary=\(.*\);details=.*/\1/')"
  details_json="$(echo "$notif_out" | sed 's/.*;details=\(.*\)$/\1/')"
  mqtt_pub "${BASE_TOPIC}/notifications/summary"  "${summary_json}"
  mqtt_pub "${BASE_TOPIC}/notifications/details"  "${details_json}"

  sleep "${REFRESH_SEC}"
done
