from paho.mqtt.client import Client, CallbackAPIVersion # type: ignore
from pycaw.pycaw import AudioUtilities, ISimpleAudioVolume, IAudioEndpointVolume # type: ignore
from comtypes import CLSCTX_ALL # type: ignore
from ctypes import cast, POINTER
import threading, subprocess, time, re, json, asyncio, websockets # type: ignore
from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
from datetime import datetime
import os, sys, uuid
from concurrent.futures import TimeoutError as FuturesTimeoutError
import webbrowser
import platform
import traceback

# --- Imports Corsair ---
from cuesdk import (CueSdk, CorsairDeviceFilter, CorsairDeviceType, # type: ignore
                    CorsairError, CorsairSessionState, CorsairDevicePropertyId, 
                    CorsairDataType)

# --- MQTT configuration ---
MQTT_BROKER = "0.0.0.0"
MQTT_PORT   = 1883
MQTT_USER   = "XXXXXX"
MQTT_PASS   = "XXXXXX"

# --- Flask configuration ---
FLASK_HOST = "0.0.0.0"  # Écouter sur toutes les interfaces
FLASK_PORT = 8080
WEBSOCKET_PORT = 8081

# 🖨️ --- Configuration Moonraker WebSocket ---
MOONRAKER_CONFIG = {
    "host": "0.0.0.0",
    "port": 7125,
    "websocket_url": "ws://0.0.0.0:7125/websocket",
    "reconnect_delay": 5,
    "max_reconnect_attempts": 10
}

# --- Windows: chemin du script PowerShell qui renvoie la batterie (ex: "60") ---
PS_BATT_SCRIPT = r"E:\Personnal PROJECTS\DesKontroler\Scripts Python\get_bt_battery.ps1"

# --- Variables globales pour Corsair ---
corsair_sdk = None
corsair_connected = False
corsair_mouse_device_id = None

# --- Variables globales YouTube Music ---
ytm_status = {
    "connected": False,
    "title": "Aucune lecture",
    "artist": "",
    "album": "",
    "artwork": "",
    "isPlaying": False,
    "lastUpdate": datetime.now().isoformat()
}
ytm_commands_queue = []  # Queue des commandes en attente
connected_extensions = set()  # Extensions Chrome connectées

# 🖨️ --- Variables globales Klipper/Imprimante 3D ---
klipper_status = {
    "connected": False,
    "last_update": datetime.now().isoformat(),
    
    # Toolhead - position et mouvement
    "toolhead": {
        "position": [0.0, 0.0, 0.0, 0.0],  # [x, y, z, e]
        "print_time": 0.0,
        "estimated_print_time": 0.0,
        "homed_axes": "",
        "max_velocity": 0.0,
        "max_accel": 0.0,
        "max_accel_to_decel": 0.0
    },
    
    # Extruder - températures et paramètres
    "extruder": {
        "temperature": 0.0,
        "target": 0.0,
        "power": 0.0,
        "pressure_advance": 0.0,
        "smooth_time": 0.0,
        "can_extrude": False
    },
    
    # Bed - températures
    "heater_bed": {
        "temperature": 0.0,
        "target": 0.0,
        "power": 0.0
    },
    
    # Print Stats - informations impression
    "print_stats": {
        "filename": "",
        "total_duration": 0.0,
        "print_duration": 0.0,
        "filament_used": 0.0,
        "state": "standby",  # standby, printing, paused, complete, cancelled, error
        "message": ""
    },
    
    # Printer - état général
    "printer": {
        "state": "ready",  # ready, error, shutdown
        "state_message": ""
    },
    
    # Virtual SD Card
    "virtual_sdcard": {
        "file_position": 0,
        "file_size": 0,
        "progress": 0.0,
        "is_active": False
    }
}

# 🖨️ --- Variables globales WebSocket Moonraker ---
moonraker_client = None
moonraker_connected = False
moonraker_event_loop = None

# --- Pont request/response pour requêtes "query" (playlists/recents/etc.)
ws_event_loop = None                     # loop asyncio du serveur WS
pending_queries = {}                     # { req_id: asyncio.Future }
pending_lock = threading.Lock()

# --- Flask App ---
app = Flask(__name__)
CORS(app, origins=[
    "http://localhost"
], 
allow_headers=["Content-Type", "Authorization", "Origin", "Accept"],
methods=["GET", "POST", "OPTIONS"])

# =====================================================
# 🖨️ MOONRAKER WEBSOCKET CLIENT CLASS
# =====================================================

class MoonrakerWebSocketClient:
    def __init__(self, mqtt_client):
        self.mqtt_client = mqtt_client
        self.websocket = None
        self.connected = False
        self.reconnect_attempts = 0
        self.request_id = 1
        
    async def connect(self):
        """Connexion WebSocket à Moonraker avec polling actif"""
        global moonraker_connected
        
        while self.reconnect_attempts < MOONRAKER_CONFIG["max_reconnect_attempts"]:
            try:
                print(f"🔌 Connexion Moonraker WebSocket (tentative {self.reconnect_attempts + 1})")
                
                self.websocket = await websockets.connect(
                    MOONRAKER_CONFIG["websocket_url"],
                    ping_interval=10,
                    ping_timeout=10,
                    close_timeout=10
                )
                
                self.connected = True
                moonraker_connected = True
                self.reconnect_attempts = 0
                print("✅ Moonraker WebSocket connecté")
                
                # 🆕 AJOUTER CETTE LIGNE
                self.publish_moonraker_status("online")
                
                # 🆕 Démarrer le polling actif immédiatement
                await self.active_polling_loop()
                
            except Exception as e:
                self.connected = False
                moonraker_connected = False
                self.reconnect_attempts += 1
                print(f"❌ Erreur connexion Moonraker: {e}")
                self.publish_moonraker_status("offline")
                if self.reconnect_attempts < MOONRAKER_CONFIG["max_reconnect_attempts"]:
                    print(f"⏳ Reconnexion dans {MOONRAKER_CONFIG['reconnect_delay']}s...")
                    await asyncio.sleep(MOONRAKER_CONFIG["reconnect_delay"])
                else:
                    print("💥 Nombre maximum de tentatives atteint")
                    break
    def publish_moonraker_status(self, status):
        """📡 Publier le statut Moonraker sur MQTT"""
        try:
            status_data = {
                "server": status,
                "timestamp": datetime.now().isoformat(),
                "websocket_connected": self.connected
            }
            
            if self.mqtt_client and self.mqtt_client.is_connected():
                self.mqtt_client.publish(
                    "Ender3V3/moonraker/status",
                    json.dumps(status_data)
                )
                print(f"📡 Moonraker status publié: {status}")
            else:
                print("⚠️ MQTT non connecté pour publier statut Moonraker")
                
        except Exception as e:
            print(f"❌ Erreur publication statut Moonraker: {e}")

    async def active_polling_loop(self):
        """🔧 Fix : Polling actif avec requête exacte Moonraker"""
        print("🔄 Démarrage du polling actif optimisé")
        
        while self.connected:
            try:
                # 🎯 REQUÊTE EXACTE comme Fluidd
                query_request = {
                    "jsonrpc": "2.0",
                    "method": "printer.objects.query",
                    "params": {
                        "objects": {
                            # 🖨️ DONNÉES D'IMPRESSION (priorité absolue)
                            "print_stats": [
                                "filename", "state", "message",
                                "print_duration", "total_duration", "filament_used"
                            ],
                            "virtual_sdcard": [
                                "progress", "file_position", "file_size", "is_active"
                            ],
                            "display_status": [
                                "progress", "message"
                            ],
                            
                            # 🌡️ TEMPÉRATURES
                            "extruder": [
                                "temperature", "target", "power"
                            ],
                            "heater_bed": [
                                "temperature", "target", "power"
                            ],
                            
                            # 📐 POSITION
                            "toolhead": [
                                "position", "homed_axes", "print_time"
                            ],
                            
                            # ⚙️ SYSTÈME
                            "webhooks": [
                                "state", "state_message"
                            ]
                        }
                    },
                    "id": self.request_id
                }
                
                self.request_id += 1
                
                # Envoyer la requête
                await self.websocket.send(json.dumps(query_request))
                
                # Attendre la réponse avec timeout plus court
                response = await asyncio.wait_for(
                    self.websocket.recv(), 
                    timeout=3.0
                )
                
                await self.process_live_data(response)
                
                # 🚀 POLLING PLUS RAPIDE pour impression active
                await asyncio.sleep(1.5)  # 1.5s au lieu de 2s
                
            except asyncio.TimeoutError:
                print("⚠️ Timeout Moonraker - retry")
                await asyncio.sleep(3.0)
                
            except websockets.exceptions.ConnectionClosed:
                print("🔌 WebSocket fermé")
                self.connected = False
                break
                
            except Exception as e:
                print(f"❌ Erreur polling: {e}")
                await asyncio.sleep(3.0)
    
    async def process_live_data(self, response_text):
        """🔧 Traitement avec calcul CORRECT du temps restant (logique Fluidd)"""
        try:
            response = json.loads(response_text)
            
            if "result" in response and "status" in response["result"]:
                status_data = response["result"]["status"]
                
                # 🎯 RÉCUPÉRER LES DONNÉES BRUTES
                print_stats = status_data.get("print_stats", {})
                virtual_sdcard = status_data.get("virtual_sdcard", {})
                
                # Variables pour le calcul
                print_duration = print_stats.get("print_duration", 0)  # Temps écoulé SANS pauses
                progress = virtual_sdcard.get("progress", 0)           # Progression 0-1
                
                # 🔧 CALCUL CORRECT du temps restant (comme Fluidd)
                if progress > 0 and print_duration > 0:
                    # Estimation temps total = temps_écoulé / progression  
                    estimated_total_time = print_duration / progress
                    time_remaining = max(0, estimated_total_time - print_duration)
                    
                    print("🕐 CALCUL TEMPS (méthode Fluidd):")
                    print(f"   📊 Progression: {progress:.3f} ({progress*100:.1f}%)")
                    print(f"   ⏱️  Temps écoulé: {print_duration:.0f}s ({print_duration/60:.1f}min)")  
                    print(f"   📈 Total estimé: {estimated_total_time:.0f}s ({estimated_total_time/60:.1f}min)")
                    print(f"   ⏳ Temps restant: {time_remaining:.0f}s ({time_remaining/60:.1f}min)")
                    
                    # 🎯 ENRICHIR virtual_sdcard avec le calcul correct
                    if "virtual_sdcard" in status_data:
                        enhanced_vsd = status_data["virtual_sdcard"].copy()
                        enhanced_vsd["time_remaining_calculated"] = time_remaining
                        enhanced_vsd["estimated_total_time"] = estimated_total_time
                        status_data["virtual_sdcard"] = enhanced_vsd
                
                # 🎯 DEBUG DÉTAILLÉ pour vérification
                print("=" * 60)
                print(f"📥 DONNÉES REÇUES DE MOONRAKER:")
                
                if print_stats:
                    print(f"🖨️  PRINT_STATS:")
                    print(f"   - filename: {print_stats.get('filename', 'N/A')}")
                    print(f"   - state: {print_stats.get('state', 'N/A')}")
                    print(f"   - print_duration: {print_stats.get('print_duration', 0):.1f}s")
                    print(f"   - total_duration: {print_stats.get('total_duration', 0):.1f}s")
                    print(f"   - filament_used: {print_stats.get('filament_used', 0):.2f}m")
                
                if virtual_sdcard:
                    print(f"💾 VIRTUAL_SDCARD:")  
                    print(f"   - progress: {virtual_sdcard.get('progress', 0):.3f}")
                    print(f"   - is_active: {virtual_sdcard.get('is_active', False)}")
                    print(f"   - file_position: {virtual_sdcard.get('file_position', 0)}")
                    print(f"   - file_size: {virtual_sdcard.get('file_size', 0)}")
                    
                    # Afficher nos calculs enrichis
                    if "time_remaining_calculated" in virtual_sdcard:
                        remaining_min = virtual_sdcard["time_remaining_calculated"] / 60
                        total_min = virtual_sdcard["estimated_total_time"] / 60
                        print(f"   🧮 CALCULÉ - Restant: {remaining_min:.1f}min")
                        print(f"   🧮 CALCULÉ - Total: {total_min:.1f}min")
                
                print("=" * 60)
                
                # 🚀 PUBLIER SUR MQTT
                for object_name, object_data in status_data.items():
                    if object_data:
                        topic = f"Ender3V3/klipper/status/{object_name}"
                        payload = json.dumps(object_data)
                        
                        self.mqtt_client.publish(topic, payload, retain=False)
                        print(f"✅ MQTT → {topic}")
                
            else:
                print(f"⚠️  Réponse Moonraker invalide: {response.keys()}")
                
        except Exception as e:
            print(f"❌ Erreur process_live_data: {e}")
            import traceback
            traceback.print_exc()
                    
    async def process_query_response(self, response_text):
        """🆕 Traiter la réponse de requête et publier sur MQTT"""
        try:
            response = json.loads(response_text)
            
            # Vérifier si c'est une réponse à notre requête
            if "result" in response and "status" in response["result"]:
                status_data = response["result"]["status"]
                print(f"📥 Données reçues: {list(status_data.keys())}")
                
                # Publier chaque objet sur son topic MQTT
                for object_name, object_data in status_data.items():
                    if object_data:  # Seulement si on a des données
                        topic = f"Ender3V3/klipper/status/{object_name}"
                        payload = json.dumps(object_data)
                        
                        self.mqtt_client.publish(topic, payload, retain=False)
                        print(f"✅ Publié {topic}: {len(payload)} bytes")
                
                # 🎯 LOG SPÉCIAL POUR DEBUG IMPRESSION
                if "print_stats" in status_data:
                    ps = status_data["print_stats"]
                    print(f"🖨️ PRINT_STATS: state={ps.get('state', 'N/A')}, filename={ps.get('filename', 'N/A')}")
                
                if "virtual_sdcard" in status_data:
                    vsd = status_data["virtual_sdcard"]
                    progress = vsd.get("progress", 0) * 100
                    print(f"💾 VIRTUAL_SDCARD: progress={progress:.1f}%, active={vsd.get('is_active', False)}")
                    
            else:
                print(f"⚠️ Réponse inattendue: {response}")
                
        except json.JSONDecodeError as e:
            print(f"❌ Erreur parsing JSON: {e}")
        except Exception as e:
            print(f"❌ Erreur traitement réponse: {e}")
    
    async def send_command(self, method, params=None, command_id=None):
        """Envoyer une commande via WebSocket (pour les contrôles)"""
        if not self.connected or not self.websocket:
            raise Exception("WebSocket Moonraker non connecté")
        
        command = {
            "jsonrpc": "2.0",
            "method": method,
            "id": command_id or int(datetime.now().timestamp() * 1000)
        }
        
        if params:
            command["params"] = params
        
        try:
            await self.websocket.send(json.dumps(command))
            print(f"📤 Commande WebSocket envoyée: {method}")
            return True
        except Exception as e:
            print(f"❌ Erreur envoi commande WebSocket: {e}")
            return False
# =====================================================
# 🖨️ MOONRAKER WEBSOCKET FUNCTIONS
# =====================================================

def start_moonraker_websocket(mqtt_client):
    """Démarre le client WebSocket Moonraker dans son propre thread"""
    global moonraker_client, moonraker_event_loop
    
    def run_websocket():
        global moonraker_event_loop
        
        # Créer une nouvelle boucle d'événements pour ce thread
        moonraker_event_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(moonraker_event_loop)
        
        # Créer et connecter le client
        moonraker_client = MoonrakerWebSocketClient(mqtt_client)
        
        # Lancer la connexion
        try:
            moonraker_event_loop.run_until_complete(moonraker_client.connect())
        except Exception as e:
            print(f"💥 Erreur critique WebSocket Moonraker: {e}")
            traceback.print_exc()
    
    # Lancer dans un thread dédié
    websocket_thread = threading.Thread(target=run_websocket, daemon=True)
    websocket_thread.start()
    print("🚀 Thread WebSocket Moonraker démarré")

async def send_moonraker_command_async(method, params=None):
    """Envoie une commande Moonraker en priorité via WebSocket"""
    global moonraker_client
    
    if moonraker_client and moonraker_client.connected:
        try:
            return await moonraker_client.send_command(method, params)
        except Exception as e:
            print(f"❌ WebSocket command failed, fallback MQTT: {e}")
    
    # Fallback MQTT si WebSocket indisponible
    print("📡 Fallback: envoi commande via MQTT")
    return False

def send_moonraker_command_sync(method, params=None):
    """Version synchrone pour les endpoints Flask"""
    if moonraker_event_loop and moonraker_client:
        try:
            # Exécuter la commande async dans la boucle WebSocket
            future = asyncio.run_coroutine_threadsafe(
                send_moonraker_command_async(method, params), 
                moonraker_event_loop
            )
            return future.result(timeout=5)  # Timeout 5 secondes
        except Exception as e:
            print(f"❌ Erreur commande sync: {e}")
    
    return False

# =====================================================
# 🖨️ KLIPPER/IMPRIMANTE 3D - MQTT HANDLERS (EXISTANT)
# =====================================================

def handle_klipper_message(topic: str, payload: str):
    """Traite les messages MQTT Klipper"""
    global klipper_status
    
    try:
        # Parse JSON payload
        data = json.loads(payload)
        
        # Extraire le suffixe du topic (toolhead, extruder, etc.)
        topic_suffix = topic.replace("Ender3V3/klipper/status/", "")
        
        # Mettre à jour les données selon le topic
        if topic_suffix == "toolhead":
            if "position" in data:
                klipper_status["toolhead"]["position"] = data["position"]
            if "print_time" in data:
                klipper_status["toolhead"]["print_time"] = data["print_time"]
            if "estimated_print_time" in data:
                klipper_status["toolhead"]["estimated_print_time"] = data["estimated_print_time"]
            if "homed_axes" in data:
                klipper_status["toolhead"]["homed_axes"] = data["homed_axes"]
            if "max_velocity" in data:
                klipper_status["toolhead"]["max_velocity"] = data["max_velocity"]
            if "max_accel" in data:
                klipper_status["toolhead"]["max_accel"] = data["max_accel"]
            if "max_accel_to_decel" in data:
                klipper_status["toolhead"]["max_accel_to_decel"] = data["max_accel_to_decel"]
                
        elif topic_suffix == "extruder":
            if "temperature" in data:
                klipper_status["extruder"]["temperature"] = data["temperature"]
            if "target" in data:
                klipper_status["extruder"]["target"] = data["target"]
            if "power" in data:
                klipper_status["extruder"]["power"] = data["power"]
            if "pressure_advance" in data:
                klipper_status["extruder"]["pressure_advance"] = data["pressure_advance"]
            if "smooth_time" in data:
                klipper_status["extruder"]["smooth_time"] = data["smooth_time"]
            if "can_extrude" in data:
                klipper_status["extruder"]["can_extrude"] = data["can_extrude"]
                
        elif topic_suffix == "heater_bed":
            if "temperature" in data:
                klipper_status["heater_bed"]["temperature"] = data["temperature"]
            if "target" in data:
                klipper_status["heater_bed"]["target"] = data["target"]
            if "power" in data:
                klipper_status["heater_bed"]["power"] = data["power"]
                
        elif topic_suffix == "print_stats":
            if "filename" in data:
                klipper_status["print_stats"]["filename"] = data["filename"]
            if "total_duration" in data:
                klipper_status["print_stats"]["total_duration"] = data["total_duration"]
            if "print_duration" in data:
                klipper_status["print_stats"]["print_duration"] = data["print_duration"]
            if "filament_used" in data:
                klipper_status["print_stats"]["filament_used"] = data["filament_used"]
            if "state" in data:
                klipper_status["print_stats"]["state"] = data["state"]
            if "message" in data:
                klipper_status["print_stats"]["message"] = data["message"]
                
        elif topic_suffix == "webhooks":
            if "state" in data:
                klipper_status["printer"]["state"] = data["state"]
            if "state_message" in data:
                klipper_status["printer"]["state_message"] = data["state_message"]
                
        elif topic_suffix == "virtual_sdcard":
            if "file_position" in data:
                klipper_status["virtual_sdcard"]["file_position"] = data["file_position"]
            if "file_size" in data:
                klipper_status["virtual_sdcard"]["file_size"] = data["file_size"]
            if "progress" in data:
                klipper_status["virtual_sdcard"]["progress"] = data["progress"]
            if "is_active" in data:
                klipper_status["virtual_sdcard"]["is_active"] = data["is_active"]
        
        # Marquer comme connecté et mettre à jour timestamp
        klipper_status["connected"] = True
        klipper_status["last_update"] = datetime.now().isoformat()
        
        print(f"[KLIPPER] 🖨️ {topic_suffix} mis à jour: {len(str(data))} bytes")
        
    except json.JSONDecodeError as e:
        print(f"[KLIPPER] ❌ Erreur JSON pour {topic}: {e}")
    except Exception as e:
        print(f"[KLIPPER] ❌ Erreur traitement {topic}: {e}")

def get_klipper_summary():
    """Retourne un résumé de l'état Klipper pour logs"""
    if not klipper_status["connected"]:
        return "Déconnecté"
    
    state = klipper_status["print_stats"]["state"]
    filename = klipper_status["print_stats"]["filename"]
    
    if state == "printing" and filename:
        progress = klipper_status["virtual_sdcard"]["progress"]
        return f"Impression {filename} - {progress:.1f}%"
    elif state == "paused":
        return f"En pause - {filename}"
    elif state == "complete":
        return "Impression terminée"
    else:
        return f"État: {state}"

# =====================================================
# 🖨️ KLIPPER/IMPRIMANTE 3D - API ENDPOINTS (MODIFIÉS)
# =====================================================

@app.route('/klipper/status', methods=['GET'])
def get_klipper_status():
    """Récupère l'état complet Klipper pour le dashboard"""
    return jsonify(klipper_status)

@app.route('/klipper/summary', methods=['GET'])
def get_klipper_summary_api():
    """Récupère un résumé de l'état Klipper"""
    summary = get_klipper_summary()
    
    # Calculer progression si impression en cours
    progress = klipper_status["virtual_sdcard"]["progress"]
    
    return jsonify({
        "connected": klipper_status["connected"],
        "summary": summary,
        "state": klipper_status["print_stats"]["state"],
        "printer_state": klipper_status["printer"]["state"],
        "filename": klipper_status["print_stats"]["filename"],
        "progress": round(progress, 1),
        "extruder_temp": round(klipper_status["extruder"]["temperature"], 1),
        "extruder_target": round(klipper_status["extruder"]["target"], 1),
        "bed_temp": round(klipper_status["heater_bed"]["temperature"], 1),
        "bed_target": round(klipper_status["heater_bed"]["target"], 1),
        "position": {
            "x": round(klipper_status["toolhead"]["position"][0], 2),
            "y": round(klipper_status["toolhead"]["position"][1], 2),
            "z": round(klipper_status["toolhead"]["position"][2], 2)
        },
        "homed_axes": klipper_status["toolhead"]["homed_axes"],
        "last_update": klipper_status["last_update"]
    })

@app.route('/klipper/command', methods=['POST'])
def send_klipper_command():
    """Envoie une commande JSON-RPC à Moonraker via WebSocket (priorité) ou MQTT (fallback)"""
    try:
        data = request.get_json()
        method = data.get('method')
        params = data.get('params', {})
        
        if not method:
            return jsonify({"success": False, "error": "method manquant"}), 400
        
        # Essayer WebSocket en priorité
        success = send_moonraker_command_sync(method, params)
        
        if success:
            return jsonify({
                "success": True, 
                "method": "websocket",
                "message": f"Commande {method} envoyée via WebSocket"
            })
        else:
            # Fallback MQTT (code existant)
            command = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
                "id": int(time.time() * 1000)
            }
            
            # Utiliser le client MQTT global
            if mqtt_client and mqtt_client.is_connected():
                mqtt_client.publish("Ender3V3/moonraker/api/request", json.dumps(command))
                print(f"[KLIPPER] 📤 Commande envoyée via MQTT fallback: {method}")
                return jsonify({
                    "success": True,
                    "method": "mqtt_fallback", 
                    "message": f"Commande {method} envoyée via MQTT (fallback)"
                })
            else:
                return jsonify({"success": False, "error": "WebSocket et MQTT non connectés"}), 503
            
    except Exception as e:
        print(f"[KLIPPER] ❌ Erreur commande: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/klipper/emergency_stop', methods=['POST'])
def emergency_stop():
    """Arrêt d'urgence imprimante"""
    try:
        # Essayer WebSocket en priorité pour l'urgence
        success = send_moonraker_command_sync("printer.emergency_stop", {})
        
        if success:
            print("[KLIPPER] 🚨 ARRÊT D'URGENCE ACTIVÉ via WebSocket")
            return jsonify({"success": True, "message": "Arrêt d'urgence activé (WebSocket)"})
        else:
            # Fallback MQTT
            command = {
                "jsonrpc": "2.0",
                "method": "printer.emergency_stop",
                "params": {},
                "id": int(time.time() * 1000)
            }
            
            if mqtt_client and mqtt_client.is_connected():
                mqtt_client.publish("Ender3V3/moonraker/api/request", json.dumps(command))
                print("[KLIPPER] 🚨 ARRÊT D'URGENCE ACTIVÉ via MQTT fallback")
                return jsonify({"success": True, "message": "Arrêt d'urgence activé (MQTT)"})
            else:
                return jsonify({"success": False, "error": "WebSocket et MQTT non connectés"}), 503
            
    except Exception as e:
        print(f"[KLIPPER] ❌ Erreur arrêt urgence: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# =====================================================
# YOUTUBE MUSIC BRIDGE - HTTP API pour Dashboard Pi (EXISTANT)
# =====================================================

@app.route('/ytm/status', methods=['GET'])
def get_ytm_status():
    """Récupère l'état actuel de YouTube Music pour le dashboard Pi"""
    return jsonify(ytm_status)

@app.route('/ytm/play_pause', methods=['POST'])
def ytm_play_pause():
    """Toggle play/pause depuis le dashboard Pi"""
    command = {
        "action": "play_pause",
        "timestamp": datetime.now().isoformat()
    }
    ytm_commands_queue.append(command)
    print(f"[YTM API] 🎵 Commande play_pause reçue du Pi")
    return jsonify({"success": True, "command": "play_pause"})

@app.route('/ytm/next', methods=['POST'])
def ytm_next():
    """Piste suivante depuis le dashboard Pi"""
    command = {
        "action": "next_track", 
        "timestamp": datetime.now().isoformat()
    }
    ytm_commands_queue.append(command)
    print(f"[YTM API] ⭐ Commande next reçue du Pi")
    return jsonify({"success": True, "command": "next_track"})

@app.route('/ytm/previous', methods=['POST'])
def ytm_previous():
    """Piste précédente depuis le dashboard Pi"""
    command = {
        "action": "previous_track",
        "timestamp": datetime.now().isoformat()
    }
    ytm_commands_queue.append(command)
    print(f"[YTM API] ⮪ Commande previous reçue du Pi")
    return jsonify({"success": True, "command": "previous_track"})

@app.route('/ytm/play_playlist', methods=['POST'])
def ytm_play_playlist():
    """Lancer une playlist spécifique depuis le dashboard Pi"""
    try:
        data = request.get_json()
        playlist_id = data.get('playlist_id')
        
        if not playlist_id:
            return jsonify({"success": False, "error": "playlist_id manquant"}), 400
        
        command = {
            "action": "play_playlist",
            "playlist_id": playlist_id,
            "timestamp": datetime.now().isoformat()
        }
        ytm_commands_queue.append(command)
        
        print(f"[YTM API] 🎵 Commande play_playlist reçue du Pi: {playlist_id}")
        return jsonify({"success": True, "command": "play_playlist", "playlist_id": playlist_id})
        
    except Exception as e:
        print(f"[YTM API] ❌ Erreur play_playlist: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ytm/launch', methods=['POST'])
def ytm_launch():
    """Lancer YouTube Music sur le PC depuis le dashboard Pi"""
    try:
        print(f"[YTM API] 🚀 Commande launch reçue du Pi")
        
        # Tenter de lancer YouTube Music
        success = launch_youtube_music_local()
        
        if success:
            print(f"[YTM API] ✅ YouTube Music lancé avec succès")
            return jsonify({"success": True, "message": "YouTube Music lancé"})
        else:
            print(f"[YTM API] ❌ Échec lancement YouTube Music")
            return jsonify({"success": False, "error": "Échec lancement application"}), 500
        
    except Exception as e:
        print(f"[YTM API] ❌ Erreur launch: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# =====================================================
# WEBSOCKET SERVER POUR EXTENSION CHROME (EXISTANT)
# =====================================================

async def handle_extension_websocket(websocket):
    """Gère la connexion WebSocket de l'extension Chrome sur PC"""
    extension_id = f"ext_{id(websocket)}"
    connected_extensions.add(websocket)
    print(f"[YTM WS] 🎙️ Extension Chrome connectée ({extension_id})")
    
    try:
        # Message de bienvenue à l'extension
        await websocket.send(json.dumps({
            "type": "connected",
            "message": "Bridge Python prêt",
            "timestamp": datetime.now().isoformat()
        }))
        
        async for message in websocket:
            try:
                data = json.loads(message)
                await handle_extension_message(websocket, data)
            except json.JSONDecodeError:
                print(f"[YTM WS] ❌ Message JSON invalide: {message}")
            except Exception as e:
                print(f"[YTM WS] ❌ Erreur traitement message: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print(f"[YTM WS] 🎙️ Extension déconnectée ({extension_id})")
    except Exception as e:
        print(f"[YTM WS] ❌ Erreur WebSocket: {e}")
    finally:
        connected_extensions.discard(websocket)
        if not connected_extensions:
            global ytm_status
            ytm_status["connected"] = False
            print(f"[YTM WS] ❌ Plus d'extension connectée - YTM déconnecté")

async def handle_extension_message(websocket, data):
    """Traite les messages reçus de l'extension Chrome"""
    global ytm_status
    
    message_type = data.get("type")
    
    if message_type == "status_update":
        status_data = data.get("data", {})
        ytm_status.update({
            "connected": status_data.get("connected", False),
            "title": status_data.get("title", "Aucune lecture"),
            "artist": status_data.get("artist", ""),
            "album": status_data.get("album", ""),
            "artwork": status_data.get("artwork", ""),
            "isPlaying": status_data.get("isPlaying", False),
            "lastUpdate": datetime.now().isoformat()
        })
        print(f"[YTM WS] 📊 Status reçu: {ytm_status['title']} - {'▶️' if ytm_status['isPlaying'] else '⏸️'}")
        
    elif message_type == "command_result":
        result = data.get("result", {})
        success = result.get("success", False)
        action = result.get("action", "unknown")
        print(f"[YTM WS] ✅ Commande {action} {'réussie' if success else 'échouée'}")
        
    elif message_type == "ping":
        await websocket.send(json.dumps({
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }))

    elif message_type == "query_result":
        # Nouveau protocole: réponse d'une requête 'query'
        req_id = data.get("id")
        ok = data.get("ok", False)
        result = data.get("result")
        error = data.get("error")
        with pending_lock:
            fut = pending_queries.get(req_id)
        if fut and not fut.done():
            if ok:
                fut.set_result({"ok": True, "result": result})
            else:
                fut.set_result({"ok": False, "error": error or "unknown"})

async def send_commands_to_extensions():
    """Envoie les commandes du Pi vers l'extension Chrome"""
    while True:
        if ytm_commands_queue and connected_extensions:
            command = ytm_commands_queue.pop(0)
            for websocket in connected_extensions.copy():
                try:
                    await websocket.send(json.dumps({
                        "type": "command",
                        "data": command
                    }))
                    print(f"[YTM WS] 📤 Commande {command['action']} envoyée à l'extension")
                except Exception as e:
                    print(f"[YTM WS] ❌ Erreur envoi commande: {e}")
                    connected_extensions.discard(websocket)
        await asyncio.sleep(0.1)

# --- Sender async + helper sync pour les requêtes 'query' ---
async def ws_send_query(method: str, params=None, timeout: float = 12.0):
    """Envoie une requête 'query' à l'extension et attend le premier résultat."""
    if params is None:
        params = []
    req_id = str(uuid.uuid4())
    loop = asyncio.get_event_loop()
    fut = loop.create_future()
    with pending_lock:
        pending_queries[req_id] = fut

    payload = {
        "type": "query",
        "id": req_id,
        "method": method,
        "params": params,
    }

    # Envoi à toutes les extensions connectées; la première qui répond gagne
    for websocket in connected_extensions.copy():
        try:
            await websocket.send(json.dumps(payload))
        except Exception:
            connected_extensions.discard(websocket)

    try:
        return await asyncio.wait_for(fut, timeout=timeout)
    finally:
        with pending_lock:
            pending_queries.pop(req_id, None)

def query_extensions_sync(method: str, params=None, timeout: float = 12.0):
    """Wrapper sync pour Flask (appelle la coroutine sur le loop WS)."""
    if not connected_extensions:
        return {"ok": False, "error": "no_extension"}
    if ws_event_loop is None:
        return {"ok": False, "error": "ws_loop_missing"}

    coro = ws_send_query(method, params or [], timeout=timeout)
    fut = asyncio.run_coroutine_threadsafe(coro, ws_event_loop)
    try:
        return fut.result(timeout=timeout + 1)
    except FuturesTimeoutError:
        return {"ok": False, "error": "timeout"}

def start_websocket_server():
    """Démarre le serveur WebSocket dans un thread séparé"""
    def run_server():
        async def main():
            async def ws_handler(websocket):
                connected_extensions.add(websocket)
                ytm_status["connected"] = True
                await handle_extension_websocket(websocket)
            server = await websockets.serve(ws_handler, "0.0.0.0", WEBSOCKET_PORT)
            print(f"[YTM WS] 🚀 Serveur WebSocket démarré sur ws://0.0.0.0:{WEBSOCKET_PORT}")
            commands_task = asyncio.create_task(send_commands_to_extensions())
            await server.wait_closed()

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            # --- Expose la loop pour les appels Flask sync -> WS ---
            global ws_event_loop
            ws_event_loop = loop
            loop.run_until_complete(main())
        except Exception as e:
            print(f"[YTM WS] ❌ Erreur serveur WebSocket: {e}")
        finally:
            loop.close()
    
    ws_thread = threading.Thread(target=run_server, daemon=True)
    ws_thread.start()

# =====================================================
# ENDPOINTS FLASK (GET) pour les "query" (playlists/recents/podcasts)
# =====================================================

@app.route('/ytm/query/playlists', methods=['GET'])
def http_get_playlists():
    res = query_extensions_sync('getPlaylists', timeout=20)
    if not res.get("ok"):
        return jsonify(res), 504
    return jsonify({"ok": True, "items": res["result"]})

# =====================================================
# FONCTIONS EXISTANTES (VOLUMES + BATTERIES)
# =====================================================

def set_volume_by_name(app_name, vol_percent):
    sessions = AudioUtilities.GetAllSessions()
    for session in sessions:
        if session.Process and app_name.lower() in session.Process.name().lower():
            volume = session._ctl.QueryInterface(ISimpleAudioVolume)
            volume.SetMasterVolume(vol_percent / 100.0, None)
            break

def set_master_volume(vol_percent):
    device = AudioUtilities.GetSpeakers()
    interface = device.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    volume = cast(interface, POINTER(IAudioEndpointVolume))
    volume.SetMasterVolumeLevelScalar(vol_percent / 100.0, None)

def set_volume_all_others(vol_percent):
    handled = {"discord", "chrome"}
    sessions = AudioUtilities.GetAllSessions()
    for session in sessions:
      if session.Process:
        name = session.Process.name().lower()
        if not any(h in name for h in handled):
          try:
            volume = session._ctl.QueryInterface(ISimpleAudioVolume)
            volume.SetMasterVolume(vol_percent / 100.0, None)
            print(f"[AUTRE] {name} ⚡ {vol_percent}%")
          except Exception as e:
            print(f"Erreur sur {name}: {e}")

# Variable globale pour client MQTT
mqtt_client = None

def on_message(client, userdata, msg):
    """Handler MQTT - ÉTENDU pour Klipper"""
    try:
        topic = msg.topic
        payload = msg.payload.decode()
        # 🖨️ Klipper: agrégé ou granulaire
        if topic == "Ender3V3/klipper/status":
            data = json.loads(payload)
            status = data.get("status", {})
            # Réutilise la même logique qu'aujourd'hui, mais en itérant:
            for obj, values in status.items():
                handle_klipper_message(f"Ender3V3/klipper/status/{obj}", json.dumps(values))
            return

        if topic.startswith("Ender3V3/klipper/status/"):
            handle_klipper_message(topic, payload)
            return
        # EXISTANTS: Messages volumes PC
        vol_raw = int(payload)
        vol_raw = max(0, min(vol_raw, 4095))
        vol_percent = int((vol_raw / 4095) * 100)

        if topic == "homeassistant/deskontroler/pc/volume/general":
            print(f"[GENERAL] ⚡ {vol_percent}%")
            set_master_volume(vol_percent)
        elif topic == "homeassistant/deskontroler/pc/volume/discord":
            print(f"[DISCORD] ⚡ {vol_percent}%")
            set_volume_by_name("discord", vol_percent)
        elif topic == "homeassistant/deskontroler/pc/volume/chrome":
            print(f"[CHROME] ⚡ {vol_percent}%")
            set_volume_by_name("chrome", vol_percent)
        elif topic == "homeassistant/deskontroler/pc/volume/micro":
            print(f"[AUTRES] ⚡ {vol_percent}%")
            set_volume_all_others(vol_percent)
            
    except ValueError:
        # Si ce n'est pas un int (pour les messages Klipper JSON)
        pass
    except Exception as e:
        print(f"Erreur MQTT: {e}")

def read_headset_battery():
    """Lecture batterie casque via PowerShell (silencieux, sans fenêtre)."""
    try:
        cmd = [
            "powershell.exe",
            "-NoProfile", "-NonInteractive",
            "-ExecutionPolicy", "Bypass",
            "-WindowStyle", "Hidden",
            "-File", PS_BATT_SCRIPT,
        ]
        kwargs = dict(capture_output=True, text=True, timeout=8, shell=False)

        if sys.platform == "win32":
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = 0
            kwargs["startupinfo"] = si
            kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)

        res = subprocess.run(cmd, **kwargs)
        if res.returncode != 0:
            err = (res.stderr or "").strip()
            print(f"[BATT] script PS exit {res.returncode}: {err}")
            return -1

        out = (res.stdout or "").strip()
        m = re.search(r"(\d+)\s*$", out)
        if not m:
            print(f"[BATT] sortie non reconnue: {out!r}")
            return -1

        pct = int(m.group(1))
        return max(0, min(pct, 100))

    except Exception as e:
        print(f"[BATT] erreur PS: {e}")
        return -1

def init_corsair_sdk():
    """Initialise le SDK Corsair"""
    global corsair_sdk, corsair_connected, corsair_mouse_device_id
    
    corsair_sdk = CueSdk()
    
    def on_corsair_state_changed(evt):
        global corsair_connected, corsair_mouse_device_id
        print(f"[CORSAIR] État : {evt.state}")
        
        if evt.state == CorsairSessionState.CSS_Connected:
            corsair_connected = True
            print("[CORSAIR] ✅ Connecté à iCUE")
            
            devices, err = corsair_sdk.get_devices(
                CorsairDeviceFilter(device_type_mask=CorsairDeviceType.CDT_Mouse))
            
            if err == CorsairError.CE_Success and devices:
                for d in devices:
                    device_info, err = corsair_sdk.get_device_info(d.device_id)
                    if device_info and device_info.type == CorsairDeviceType.CDT_Mouse:
                        corsair_mouse_device_id = d.device_id
                        print(f"[CORSAIR] 🖱️ Souris trouvée : {device_info.model}")
                        break
        else:
            corsair_connected = False
            corsair_mouse_device_id = None

    err = corsair_sdk.connect(on_corsair_state_changed)
    if err != CorsairError.CE_Success:
        print(f"[CORSAIR] ❌ Erreur de connexion : {err}")
        return False
    
    print("[CORSAIR] 🎙️ Initialisation en cours...")
    return True

def read_corsair_mouse_battery():
    """Récupère le niveau de batterie de la souris Corsair"""
    global corsair_sdk, corsair_connected, corsair_mouse_device_id
    
    if not corsair_connected or not corsair_mouse_device_id or not corsair_sdk:
        return -1
    
    try:
        battery_property, err = corsair_sdk.read_device_property(
            corsair_mouse_device_id, 
            CorsairDevicePropertyId.CDPI_BatteryLevel
        )
        
        if err == CorsairError.CE_Success and battery_property is not None:
            if battery_property.type == CorsairDataType.CT_Int32:
                battery_value = int(battery_property.value)
                return max(0, min(battery_value, 100))
            else:
                return -1
        else:
            return -1
            
    except Exception as e:
        print(f"[CORSAIR] ❌ Exception batterie : {e}")
        return -1

def battery_publisher(client: Client, interval=30):
    """Publie périodiquement la batterie du casque sur MQTT"""
    topic = "homeassistant/deskontroler/pc/battery/headset"
    while True:
        pct = read_headset_battery()
        if pct >= 0:
            client.publish(topic, pct, qos=0, retain=True)
            print(f"[BATT] casque ⚡ {pct}% (publié {topic})")
        else:
            print("[BATT] valeur indisponible (…)")
        time.sleep(interval)

def corsair_battery_publisher(client: Client, interval=30):
    """Publie périodiquement la batterie de la souris Corsair sur MQTT"""
    topic = "homeassistant/deskontroler/pc/battery/corsair_mouse"
    
    while True:
        pct = read_corsair_mouse_battery()
        if pct >= 0:
            client.publish(topic, pct, qos=0, retain=True)
            print(f"[CORSAIR] 🖱️ souris ⚡ {pct}% (publié {topic})")
        else:
            print("[CORSAIR] 🔋 batterie indisponible")
        time.sleep(interval)

def launch_youtube_music_local():
    """Lance YouTube Music PWA localement sur le PC Windows"""
    try:
        import webbrowser
        
        # Méthode 1: Tenter de lancer la PWA YouTube Music installée via PowerShell
        try:
            # Chercher YouTube Music dans les applications installées
            powershell_cmd = """
            Get-StartApps | Where-Object { $_.Name -like "*YouTube Music*" } | Select-Object -First 1 -ExpandProperty AppID
            """
            
            result = subprocess.run([
                "powershell.exe", 
                "-Command", 
                powershell_cmd
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and result.stdout.strip():
                app_id = result.stdout.strip()
                print(f"[YTM LAUNCH] 📱 PWA trouvée: {app_id}")
                
                # Lancer la PWA via son AppID
                subprocess.run([
                    "powershell.exe", 
                    "-Command", 
                    f"Start-Process shell:AppsFolder\\{app_id}"
                ], check=True, capture_output=True, timeout=5)
                
                print("[YTM LAUNCH] ✅ PWA YouTube Music lancée")
                return True
                
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
            print(f"[YTM LAUNCH] ⚠️ PWA via PowerShell échouée: {e}")
            
        # Méthode 2: Lancer via Chrome en mode PWA (--app)
        try:
            chrome_paths = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
            ]
            
            chrome_path = None
            for path in chrome_paths:
                if os.path.exists(path):
                    chrome_path = path
                    break
                    
            if chrome_path:
                # Lancer en mode PWA avec --app
                subprocess.Popen([
                    chrome_path, 
                    "--app=https://music.youtube.com/",
                    "--user-data-dir=" + os.path.expanduser("~\\AppData\\Local\\Google\\Chrome\\User Data")
                ])
                print("[YTM LAUNCH] ✅ YouTube Music PWA lancée via Chrome --app")
                return True
            else:
                print("[YTM LAUNCH] ⚠️ Chrome non trouvé")
                
        except Exception as e:
            print(f"[YTM LAUNCH] ❌ Échec Chrome PWA: {e}")
            
        # Méthode 3: Tenter via Edge en mode PWA (si Chrome indisponible)
        try:
            edge_paths = [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
            ]
            
            edge_path = None
            for path in edge_paths:
                if os.path.exists(path):
                    edge_path = path
                    break
                    
            if edge_path:
                subprocess.Popen([
                    edge_path, 
                    "--app=https://music.youtube.com/"
                ])
                print("[YTM LAUNCH] ✅ YouTube Music PWA lancée via Edge --app")
                return True
            else:
                print("[YTM LAUNCH] ⚠️ Edge non trouvé")
                
        except Exception as e:
            print(f"[YTM LAUNCH] ❌ Échec Edge PWA: {e}")
            
        # Méthode 4: Fallback - Navigateur par défaut (onglet normal)
        try:
            webbrowser.open("https://music.youtube.com/", new=2)  # new=2 = nouvel onglet
            print("[YTM LAUNCH] ⚠️ Fallback: YouTube Music ouvert en onglet navigateur")
            return True
        except Exception as e:
            print(f"[YTM LAUNCH] ❌ Échec navigateur par défaut: {e}")
            
        return False
        
    except Exception as e:
        print(f"[YTM LAUNCH] ❌ Erreur générale: {e}")
        return False

def start_flask_server():
    """Démarre le serveur Flask dans un thread séparé"""
    def run_flask():
        app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False, threaded=True)
    
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    print(f"[FLASK] 🚀 Serveur API démarré sur http://{FLASK_HOST}:{FLASK_PORT}")

# =====================================================
# CONTENT SERVICE ENDPOINTS (EXISTANT)
# =====================================================

@app.route('/content/ping_presence', methods=['GET'])
def check_presence():
    """Vérifie la présence via ping de l'IP cible"""
    try:
        target_ip = "192.168.1.27"  # IP PC à pinger
        
        # Commande ping selon l'OS
        if platform.system().lower() == "windows":
            cmd = ["ping", "-n", "1", "-w", "1000", target_ip]
        else:
            cmd = ["ping", "-c", "1", "-W", "1", target_ip]
        
        # Exécution silencieuse
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=5,
            creationflags=subprocess.CREATE_NO_WINDOW if platform.system().lower() == "windows" else 0
        )
        
        # Success si retour 0
        present = result.returncode == 0
        
        print(f"[PRESENCE] Ping {target_ip}: {'✅ Présent' if present else '❌ Absent'}")
        
        return jsonify({
            "success": True,
            "present": present,
            "target_ip": target_ip,
            "timestamp": datetime.now().isoformat()
        })
        
    except subprocess.TimeoutExpired:
        print(f"[PRESENCE] Timeout ping {target_ip}")
        return jsonify({"success": True, "present": False, "error": "timeout"})
    except Exception as e:
        print(f"[PRESENCE] Erreur ping: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/content/open_url', methods=['POST'])
def open_url_pc():
    """Ouvre une URL dans Chrome sur le PC"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({"success": False, "error": "URL manquante"}), 400
        
        print(f"[CONTENT] 🌐 Ouverture URL: {url}")
        
        # Méthodes d'ouverture par priorité
        success = False
        method_used = ""
        
        # Méthode 1: Chrome spécifique (Windows)
        if platform.system().lower() == "windows":
            chrome_paths = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
            ]
            
            for chrome_path in chrome_paths:
                if os.path.exists(chrome_path):
                    try:
                        subprocess.Popen([
                            chrome_path, 
                            url,
                            "--new-tab"
                        ], 
                        creationflags=subprocess.CREATE_NO_WINDOW
                        )
                        success = True
                        method_used = "chrome_direct"
                        break
                    except Exception as e:
                        print(f"[CONTENT] Chrome direct échoué: {e}")
                        continue
        
        # Méthode 2: Navigateur par défaut (fallback)
        if not success:
            try:
                webbrowser.open(url, new=2)  # new=2 = nouvel onglet
                success = True
                method_used = "webbrowser_default"
            except Exception as e:
                print(f"[CONTENT] Navigateur par défaut échoué: {e}")
        
        # Méthode 3: Command line (dernière chance)
        if not success and platform.system().lower() == "windows":
            try:
                subprocess.run([
                    "cmd", "/c", "start", url
                ], 
                check=True, 
                creationflags=subprocess.CREATE_NO_WINDOW
                )
                success = True
                method_used = "cmd_start"
            except Exception as e:
                print(f"[CONTENT] CMD start échoué: {e}")
        
        if success:
            print(f"[CONTENT] ✅ URL ouverte via {method_used}")
            return jsonify({
                "success": True,
                "url": url,
                "method": method_used,
                "timestamp": datetime.now().isoformat()
            })
        else:
            print(f"[CONTENT] ❌ Échec ouverture URL")
            return jsonify({
                "success": False,
                "error": "Toutes les méthodes d'ouverture ont échoué"
            }), 500
            
    except Exception as e:
        print(f"[CONTENT] ❌ Erreur ouverture URL: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# =====================================================
# HEALTH CHECK ÉTENDU
# =====================================================

@app.route('/health', methods=['GET'])
def health_check_extended():
    """Health check étendu avec services content + Klipper"""
    try:
        # Test ping présence
        ping_ok = False
        try:
            result = subprocess.run(
                ["ping", "-n" if platform.system().lower() == "windows" else "-c", "1", "192.168.1.27"], 
                capture_output=True, 
                timeout=2,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system().lower() == "windows" else 0
            )
            ping_ok = result.returncode == 0
        except:
            ping_ok = False
        
        return jsonify({
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "mqtt": True,
                "corsair": corsair_connected,
                "ytm_extensions": len(connected_extensions),
                "ytm_connected": ytm_status["connected"],
                "klipper_connected": klipper_status["connected"],
                "moonraker_websocket": moonraker_connected,  # 🖨️ NOUVEAU
                "content_ping": ping_ok,
                "content_browser": True
            },
            "klipper_summary": get_klipper_summary(),
            "content_features": {
                "presence_detection": True,
                "url_opening": True,
                "rss_proxy": False,
                "klipper_monitoring": True,
                "moonraker_websocket": True  # 🖨️ NOUVEAU
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error", 
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

# =====================================================
# INITIALISATION ET DÉMARRAGE
# =====================================================

if __name__ == "__main__":
    print("🖨️ DeskKontroler Bridge v3.1 - Démarrage avec WebSocket Moonraker...")
    print("=" * 60)
    
    # 1. Initialiser Corsair SDK
    corsair_init_success = init_corsair_sdk()
    
    # 2. MQTT client setup avec CallbackAPIVersion pour éviter la dépréciation
    mqtt_client = Client(callback_api_version=CallbackAPIVersion.VERSION2)
    mqtt_client.username_pw_set(MQTT_USER, MQTT_PASS)
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    
    # 🖨️ NOUVEAUX ABONNEMENTS: Topics Klipper + existants
    mqtt_topics = [
        # Existants - Volumes PC
        "homeassistant/deskontroler/pc/volume/#",
        
        # 🖨️ NOUVEAUX - Klipper Imprimante 3D
        "Ender3V3/klipper/status/toolhead",
        "Ender3V3/klipper/status/extruder",
        "Ender3V3/klipper/status/webhooks",
        "Ender3V3/klipper/status/heater_bed",
        "Ender3V3/klipper/status/print_stats",
        "Ender3V3/klipper/status/virtual_sdcard",
        "Ender3V3/klipper/status",           # ✅ AGRÉGÉ
        "Ender3V3/klipper/status/#",         # (compat: si un jour tu as des sous-topics)
        "Ender3V3/moonraker/status", 
        "Ender3V3/moonraker/api/response",
        "Ender3V3/moonraker/api/request",
    ]
    
    for topic in mqtt_topics:
        mqtt_client.subscribe(topic)
        print(f"   📡 MQTT Subscribe: {topic}")
    
    mqtt_client.on_message = on_message
    
    # 3. Démarrer le serveur Flask (API HTTP)
    start_flask_server()
    
    # 4. Démarrer le serveur WebSocket (Extension Chrome)
    start_websocket_server()
    
    # 5. Thread batterie casque (existant)
    headset_thr = threading.Thread(target=battery_publisher, args=(mqtt_client,), daemon=True)
    headset_thr.start()
    
    # 6. Thread batterie souris Corsair
    if corsair_init_success:
        corsair_thr = threading.Thread(target=corsair_battery_publisher, args=(mqtt_client,), daemon=True)
        corsair_thr.start()
        print("🖱️ Publication batterie souris Corsair activée")
    else:
        print("⚠️ Souris Corsair non disponible")
    
    # 7. 🖨️ NOUVEAU: Démarrer WebSocket Moonraker
    print("🚀 Démarrage WebSocket Moonraker...")
    start_moonraker_websocket(mqtt_client)
    
    print("\n🎯 Services actifs :")
    print(f"   📡 MQTT Client: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"   🌐 Flask API: http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"   🔌 WebSocket: ws://{FLASK_HOST}:{WEBSOCKET_PORT}")
    print(f"   🎵 YouTube Music: Bridge activé + Launcher")
    print(f"   🔋 Batteries: Casque + Souris Corsair")
    print(f"   🎛️ Volumes: Discord, Chrome, Général, Autres")
    print(f"   🖨️ Klipper: WebSocket monitoring temps réel + MQTT compat")  # 🖨️ MODIFIÉ
    
    print("\n🖨️ ENDPOINTS KLIPPER (WebSocket + MQTT Fallback):")
    print(f"   GET  /klipper/status      - État complet")
    print(f"   GET  /klipper/summary     - Résumé + progression")
    print(f"   POST /klipper/command     - Commandes hybrides WebSocket/MQTT")
    print(f"   POST /klipper/emergency_stop - Arrêt d'urgence priorité WebSocket")
    
    print("\n🎵 En attente des connexions extensions Chrome...")
    print("🎛️🖱️ En attente de messages MQTT...")
    print("🖨️ En attente connexion WebSocket Moonraker...")
    print("=" * 60)
    
    try:
        mqtt_client.loop_forever()
    except KeyboardInterrupt:
        print("\n🛑 Arrêt du bridge...")
        
        # Fermer WebSocket Moonraker proprement
        if moonraker_client and moonraker_client.websocket:
            try:
                asyncio.run_coroutine_threadsafe(
                    moonraker_client.websocket.close(),
                    moonraker_event_loop
                )
            except:
                pass
        
        mqtt_client.disconnect()
        print("✅ Bridge arrêté proprement")