
# README.mk — Makefile d'assistance pour phone_kdeconnect_mqtt.sh
# Utilisation :
#   make help
#
# Ce Makefile propose des cibles pour :
#  - installer les dépendances
#  - installer/désinstaller le script
#  - configurer et gérer le service systemd (version user recommandée)
#  - générer un .env d'exemple
#  - tester en local et vérifier MQTT
#
# Variables (modifiable en ligne de commande, ex: make install USER=flop):
USER ?= flop
DEST_BIN ?= /usr/local/bin
SCRIPT ?= phone_kdeconnect_mqtt.sh
SCRIPT_SRC ?= ./phone_kdeconnect_mqtt.sh
ENV_PATH_USER ?= $(HOME)/.config/phone-kdeconnect-mqtt.env
SERVICE_USER_NAME ?= phone-kdeconnect-mqtt.service
SERVICE_USER_PATH ?= $(HOME)/.config/systemd/user/$(SERVICE_USER_NAME)
BROKER_HOST ?= 127.0.0.1
BROKER_PORT ?= 1883
BROKER_USER ?= YOUR_MQTT_USERNAME
BROKER_PASS ?= YOUR_MQTT_PASSWORD
BASE_TOPIC ?= homeassistant/deskontroler/phone

.PHONY: help deps install uninstall-old install-user-service uninstall-user-service start stop restart status logs env-init env-show test-run mqtt-sub enable-linger

help:
\t@echo ""
\t@echo "=== README.mk — cibles disponibles ==="
\t@echo "make deps                 # Installe les paquets requis (kdeconnect, gdbus, mosquitto-clients)"
\t@echo "make install              # Copie $(SCRIPT_SRC) -> $(DEST_BIN)/$(SCRIPT) + chmod + (re)start user service si présent"
\t@echo "make uninstall-old        # Supprime l'ancien service system-wide 'kde-phone-mqtt.service'"
\t@echo "make install-user-service # Installe le service user systemd et l'active"
\t@echo "make uninstall-user-service # Désactive et supprime le service user"
\t@echo "make start|stop|restart|status|logs # Gère le service user"
\t@echo "make env-init             # Crée un fichier .env d'exemple"
\t@echo "make env-show             # Affiche le .env (si présent)"
\t@echo "make test-run             # Lance le script en foreground (nécessite DBus session)"
\t@echo "make mqtt-sub             # Souscrit aux topics MQTT pour vérification"
\t@echo "make enable-linger        # Autorise le service user à tourner sans session ouverte"
\t@echo ""

deps:
\tsudo apt-get update
\tsudo apt-get install -y kdeconnect glib2.0-bin mosquitto-clients coreutils

install:
\t@echo ">> Installation du script vers $(DEST_BIN)/$(SCRIPT)"
\tsudo install -m 0755 $(SCRIPT_SRC) $(DEST_BIN)/$(SCRIPT)
\t@if systemctl --user status $(SERVICE_USER_NAME) >/dev/null 2>&1; then \\\
\t\techo ">> Redémarrage du service user"; \\\
\t\tsystemctl --user restart $(SERVICE_USER_NAME); \\\
\telse \\\
\t\techo ">> Service user non encore installé (ok)"; \\\
\tfi

uninstall-old:
\t@echo ">> Suppression ancien service system-wide kde-phone-mqtt.service (si présent)"
\t- sudo systemctl stop kde-phone-mqtt.service
\t- sudo systemctl disable kde-phone-mqtt.service
\t- sudo rm /etc/systemd/system/kde-phone-mqtt.service
\t- sudo systemctl daemon-reload

install-user-service:
\t@echo ">> Installation du service user systemd: $(SERVICE_USER_PATH)"
\tmkdir -p $(HOME)/.config/systemd/user
\t@cat > $(SERVICE_USER_PATH) <<'EOF'\n[Unit]\nDescription=KDE Connect → MQTT (phone telemetry)\nAfter=default.target\n\n[Service]\nType=simple\nEnvironmentFile=-%h/.config/phone-kdeconnect-mqtt.env\nExecStart=$(DEST_BIN)/$(SCRIPT)\nRestart=always\nRestartSec=2\n\n[Install]\nWantedBy=default.target\nEOF
\t@echo ">> Enable linger pour $(USER)"
\tsudo loginctl enable-linger $(USER)
\t@echo ">> Reload + enable + start (user)"
\tsystemctl --user daemon-reload
\tsystemctl --user enable --now $(SERVICE_USER_NAME)
\t@echo ">> OK"

uninstall-user-service:
\t- systemctl --user stop $(SERVICE_USER_NAME)
\t- systemctl --user disable $(SERVICE_USER_NAME)
\t- rm -f $(SERVICE_USER_PATH)
\t- systemctl --user daemon-reload

start:
\tsystemctl --user start $(SERVICE_USER_NAME)

stop:
\tsystemctl --user stop $(SERVICE_USER_NAME)

restart:
\tsystemctl --user restart $(SERVICE_USER_NAME)

status:
\tsystemctl --user status $(SERVICE_USER_NAME)

logs:
\tjournalctl --user -u $(SERVICE_USER_NAME) -f

env-init:
\t@echo ">> Création d'un .env d'exemple: $(ENV_PATH_USER)"
\t@mkdir -p $(HOME)/.config
\t@cat > $(ENV_PATH_USER) <<'EOF'\n# DEVICE_ID via `kdeconnect-cli --list-available`\nDEVICE_ID=YOUR_DEVICE_ID\n\n# MQTT broker\nMQTT_BROKER=YOUR_MQTT_BROKER_IP\nMQTT_PORT=1883\nMQTT_USER=YOUR_MQTT_USERNAME\nMQTT_PASS=YOUR_MQTT_PASSWORD\n\n# Topics / cadence\nBASE_TOPIC=$(BASE_TOPIC)\nREFRESH_SEC=2\nMAX_NOTIF=10\nEOF
\t@echo ">> Éditer maintenant avec: nano $(ENV_PATH_USER)"

env-show:
\t@echo ">> Contenu de $(ENV_PATH_USER) :"
\t@- test -f $(ENV_PATH_USER) && cat $(ENV_PATH_USER) || echo "(absent)"

test-run:
\t@echo ">> Lancement foreground (assure DBus de session actif)"
\tXDG_RUNTIME_DIR=$$(cat /proc/$$/loginuid 2>/dev/null >/dev/null || true; echo /run/user/$$(id -u)) DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$$(id -u)/bus $(DEST_BIN)/$(SCRIPT)

mqtt-sub:
\tmosquitto_sub -h $(BROKER_HOST) -p $(BROKER_PORT) -u $(BROKER_USER) -P $(BROKER_PASS) -t '$(BASE_TOPIC)/#' -v || true

enable-linger:
\tsudo loginctl enable-linger $(USER)
