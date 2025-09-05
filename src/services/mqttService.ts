// src/services/mqttService.ts - Service MQTT avec nouveaux topics imprimante
import mqtt from 'mqtt'
import { reactive } from 'vue'
import { printerService, printerData, PRINTER_TOPICS } from './printerService'

// État existant PC + téléphone (inchangé)
export const mqttData = reactive({
  connected: false,
  headsetBattery: -1,
  mouseBattery: -1,
  lastUpdate: new Date()
})

// Téléphone (inchangé)
export interface PhoneNotification {
  id: string
  app: string
  title?: string
  text?: string
  clearable: boolean
}

export const phoneData = reactive({
  battery: -1 as number,
  summary: { total: 0, apps: [] as string[] },
  details: [] as PhoneNotification[],
  lastUpdate: new Date()
})

// Configuration MQTT (inchangée)
const MQTT_CONFIG = {
  host: import.meta.env.VITE_MQTT_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_MQTT_PORT) || 1883,
  protocol: (import.meta.env.VITE_MQTT_PROTOCOL || 'mqtt') as 'mqtt' | 'ws' | 'wss',
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD
}

// 🎯 TOPICS MQTT ÉTENDUS
const MQTT_TOPICS = {
  // PC batteries (existant)
  headset: import.meta.env.VITE_MQTT_TOPIC_HEADSET || 'homeassistant/deskontroler/pc/battery/headset',
  mouse: import.meta.env.VITE_MQTT_TOPIC_MOUSE || 'homeassistant/deskontroler/pc/battery/corsair_mouse',

  // Téléphone (existant)
  phoneBattery: import.meta.env.VITE_MQTT_TOPIC_PHONE_BATT || 'homeassistant/deskontroler/phone/battery',
  phoneSummary: import.meta.env.VITE_MQTT_TOPIC_PHONE_SUMMARY || 'homeassistant/deskontroler/phone/notifications/summary',
  phoneDetails: import.meta.env.VITE_MQTT_TOPIC_PHONE_DETAILS || 'homeassistant/deskontroler/phone/notifications/details',
  
  // 🆕 IMPRIMANTE 3D - Topics étendus
  ...PRINTER_TOPICS.status,  // Inclut les nouveaux topics klipperGlobal et moonrakerStatus
  
  // API imprimante (existant)
  printerApiRequest: PRINTER_TOPICS.api.request,
  printerApiResponse: PRINTER_TOPICS.api.response
}

class MQTTService {
  private client: mqtt.MqttClient | null = null

  connect() {
    if (!MQTT_CONFIG.username || !MQTT_CONFIG.password) {
      console.warn('⚠️ MQTT: Credentials manquants dans .env.local')
      return
    }

    try {
      const url = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}`
      console.log(`📡 MQTT: Connexion à ${url}`)
      
      this.client = mqtt.connect(url, {
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        clientId: `dashboard-${Math.random().toString(16).slice(2)}`,
        keepalive: 60,
        reconnectPeriod: 1000,
        clean: true
      })

      this.client.on('connect', () => {
        console.log('✅ MQTT: Connecté au broker')
        mqttData.connected = true

        // 🎯 ABONNEMENTS ÉTENDUS avec nouveaux topics
        const allTopics = [
          // Topics existants - PC + téléphone
          MQTT_TOPICS.headset,
          MQTT_TOPICS.mouse,
          MQTT_TOPICS.phoneBattery,
          MQTT_TOPICS.phoneSummary,
          MQTT_TOPICS.phoneDetails,
          
          // 🆕 Topics imprimante étendus
          MQTT_TOPICS.toolhead,
          MQTT_TOPICS.extruder,
          MQTT_TOPICS.heaterBed,
          MQTT_TOPICS.printStats,
          MQTT_TOPICS.webhooks,
          MQTT_TOPICS.virtualSdcard,
          
          // 🎯 NOUVEAUX TOPICS CRITIQUES
          MQTT_TOPICS.klipperGlobal,          // Topic global avec températures
          MQTT_TOPICS.moonrakerStatus,        // Statut online/offline
          
          // API imprimante
          MQTT_TOPICS.printerApiResponse,
          MQTT_TOPICS.printerApiRequest
        ]
        
        console.log(`📋 MQTT: Abonnement à ${allTopics.length} topics`)
        allTopics.forEach(topic => {
          console.log(`   🔌 ${topic}`)
        })
        
        this.client?.subscribe(allTopics, (err) => {
          if (err) {
            console.error('❌ MQTT: Erreur abonnements:', err)
          } else {
            console.log('✅ MQTT: Tous les abonnements actifs')
          }
        })
        
        // 🔗 Injecter fonction publish dans printerService
        printerService.setMqttPublisher((topic: string, message: string) => {
          this.publish(topic, message)
        })
      })

      this.client.on('message', (topic, payload) => {
        const message = payload?.toString?.() ?? ''
        
        try {
          // 🎯 NOUVEAU: Router messages imprimante avec topics étendus
          if (this.isPrinterTopic(topic)) {
            this.handlePrinterMessage(topic, message)
            return
          }
          
          // Messages PC batteries (existant)
          if (topic === MQTT_TOPICS.headset) {
            const value = parseInt(message)
            if (!isNaN(value)) {
              mqttData.headsetBattery = value
              console.log(`🎧 Casque: ${value}%`)
            }
          } else if (topic === MQTT_TOPICS.mouse) {
            const value = parseInt(message)
            if (!isNaN(value)) {
              mqttData.mouseBattery = value
              console.log(`🖱️ Souris: ${value}%`)
            }
          }

          // Messages téléphone (existant)
          else if (topic === MQTT_TOPICS.phoneBattery) {
            const value = parseInt(message)
            if (!isNaN(value)) {
              phoneData.battery = value
              phoneData.lastUpdate = new Date()
              console.log(`📱 Batterie téléphone: ${value}%`)
            }
          } else if (topic === MQTT_TOPICS.phoneSummary) {
            try {
              const obj = JSON.parse(message)
              phoneData.summary.total = Number(obj?.total) || 0
              phoneData.summary.apps = Array.isArray(obj?.apps) ? 
                obj.apps.map(String) : []
              phoneData.lastUpdate = new Date()
              console.log(`📱 Résumé notifications: ${phoneData.summary.total} total`)
            } catch (e) {
              console.warn('⚠️ MQTT: Erreur parsing phone summary:', e)
            }
          } else if (topic === MQTT_TOPICS.phoneDetails) {
            try {
              const obj = JSON.parse(message)
              if (Array.isArray(obj)) {
                phoneData.details = obj.map(n => ({
                  id: String(n?.id ?? ''),
                  app: String(n?.app ?? 'Inconnu'),
                  title: n?.title ? String(n.title) : '',
                  text: n?.text ? String(n.text) : '',
                  clearable: Boolean(n?.clearable)
                }))
                phoneData.lastUpdate = new Date()
                console.log(`📱 Détails notifications: ${phoneData.details.length} items`)
              }
            } catch (e) {
              console.warn('⚠️ MQTT: Erreur parsing phone details:', e)
            }
          }

          mqttData.lastUpdate = new Date()
          
        } catch (error) {
          console.error('❌ MQTT: Erreur traitement message:', error)
        }
      })

      this.client.on('error', (error) => { 
        console.error('❌ MQTT Error:', error)
        mqttData.connected = false 
      })
      
      this.client.on('close', () => { 
        console.warn('📡 MQTT Disconnected')
        mqttData.connected = false 
      })
      
      this.client.on('offline', () => { 
        console.warn('📡 MQTT Offline')
        mqttData.connected = false 
      })
      
      this.client.on('reconnect', () => {
        console.log('🔄 MQTT: Tentative de reconnexion...')
      })
      
    } catch (error) {
      console.error('❌ MQTT: Échec connexion:', error)
      mqttData.connected = false
    }
  }

  /**
   * 🎯 AMÉLIORÉ: Vérifier si un topic concerne l'imprimante
   */
  private isPrinterTopic(topic: string): boolean {
    return topic.startsWith('Ender3V3/klipper/') || 
           topic.startsWith('Ender3V3/moonraker/') ||
           topic === 'Ender3V3/klipper/status'  // 🎯 Topic global exact
  }

  /**
   * 🎯 NOUVEAU: Router messages imprimante avec gestion des nouveaux topics
   */
  private handlePrinterMessage(topic: string, message: string): void {
    try {
      // 🔍 DEBUG: Log tous les topics imprimante reçus
      console.log(`🖨️ MQTT Reçu: ${topic} (${message.length} chars)`)
      
      // 🆕 NOUVEAU: Topic global Klipper avec températures  
      if (topic === 'Ender3V3/klipper/status') {
        console.log(`🌡️ Topic global Klipper traité`)
        printerService.handleStatusMessage(topic, message)
        return
      }
      
      // 🆕 NOUVEAU: Statut Moonraker online/offline
      if (topic === 'Ender3V3/moonraker/status') {
        console.log(`🔌 Moonraker status traité`)
        printerService.handleStatusMessage(topic, message)
        return
      }
      
      // Messages status Klipper spécifiques (existant)
      if (topic.startsWith('Ender3V3/klipper/status/')) {
        const component = topic.split('/').pop()
        console.log(`📊 Klipper spécifique traité: ${component}`)
        printerService.handleStatusMessage(topic, message)
        return
      }
      
      // Réponses API Moonraker (existant)
      if (topic === MQTT_TOPICS.printerApiResponse) {
        console.log(`📥 API Response traité`)
        printerService.handleApiResponse(message)
        return
      }
      
      // Requêtes API (pour debug/monitoring)
      if (topic === MQTT_TOPICS.printerApiRequest) {
        console.log('📤 Commande Moonraker envoyée:', message.substring(0, 100))
        return
      }
      
      console.warn(`⚠️ Topic imprimante non traité: ${topic}`)
      
    } catch (error) {
      console.error('❌ Erreur traitement message imprimante:', error)
    }
  }

  disconnect() {
    if (this.client) { 
      console.log('📡 MQTT: Déconnexion...')
      this.client.end()
      this.client = null 
    }
    mqttData.connected = false
  }

  /**
   * Publier message MQTT (inchangé)
   */
  publish(topic: string, message: string, options?: { qos?: 0 | 1 | 2, retain?: boolean }) {
    if (this.client && mqttData.connected) {
      this.client.publish(topic, message, {
        qos: options?.qos || 0,
        retain: options?.retain || false
      }, (error) => {
        if (error) {
          console.error(`❌ MQTT: Erreur publication ${topic}:`, error)
        } else {
          console.log(`📤 MQTT: Publié ${topic}`)
        }
      })
    } else {
      console.warn('⚠️ MQTT: Client non connecté pour publication')
    }
  }

  /**
   * 🎯 NOUVEAU: Fonction d'affichage navbar imprimante améliorée
   */
  getPrinterDisplay(): string | null {
    return printerService.getNavbarDisplay()
  }
  
  /**
   * Helper pour notifications téléphone (existant)
   */
  getNotificationsPhone(): string | null {
    const total = phoneData.summary.total
    if (!mqttData.connected || total <= 0) return null
    
    const apps = phoneData.summary.apps?.slice(0, 2).join(', ')
    return apps ? `📱 ${apps} (${total})` : `📱 ${total} notif${total > 1 ? 's' : ''}`
  }

  /**
   * Diagnostics étendus avec nouveaux champs
   */
  getDiagnostics() {
    return {
      mqtt: {
        connected: mqttData.connected,
        lastUpdate: mqttData.lastUpdate
      },
      batteries: {
        headset: mqttData.headsetBattery,
        mouse: mqttData.mouseBattery
      },
      phone: {
        battery: phoneData.battery,
        notifications: phoneData.summary.total,
        lastUpdate: phoneData.lastUpdate
      },
      // 🎯 Diagnostics imprimante étendus
      printer: {
        connected: printerData.connected,
        moonrakerOnline: printerData.moonrakerOnline,
        klipperState: printerData.klipperState,
        temperatures: {
          extruder: printerData.temperatures.extruder.current,
          bed: printerData.temperatures.bed.current
        },
        printJob: {
          state: printerData.printJob.state,
          filename: printerData.printJob.filename,
          progress: printerData.printJob.progress
        },
        lastUpdate: printerData.lastUpdate
      }
    }
  }
  
  /**
   * État de santé général amélioré
   */
  getHealthStatus() {
    const health = {
      mqtt: mqttData.connected,
      phone: phoneData.battery > 0,
      printer: printerData.connected,
      moonraker: printerData.moonrakerOnline,  // 🆕 NOUVEAU
      lastActivity: Math.max(
        mqttData.lastUpdate.getTime(),
        phoneData.lastUpdate.getTime(),
        printerData.lastUpdate.getTime()
      )
    }
    
    const issues = []
    if (!health.mqtt) issues.push('MQTT déconnecté')
    if (!health.phone) issues.push('Téléphone offline')
    if (!health.printer) issues.push('Imprimante offline')
    if (!health.moonraker && health.printer) issues.push('Moonraker offline')  // 🆕 NOUVEAU
    
    return {
      ...health,
      healthy: issues.length === 0,
      issues,
      summary: issues.length === 0 ? 'Tous services opérationnels' : `${issues.length} problème(s)`,
      
      // 🆕 Détails par service
      services: {
        mqtt: health.mqtt ? '✅ Connecté' : '❌ Déconnecté',
        phone: health.phone ? '✅ En ligne' : '❌ Offline', 
        printer: health.printer ? '✅ Connecté' : '❌ Offline',
        moonraker: health.moonraker ? '✅ Online' : '❌ Offline'
      }
    }
  }
}

export const mqttService = new MQTTService()

// Export des données pour compatibilité
export { printerData } from './printerService'