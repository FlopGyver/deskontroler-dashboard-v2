// src/services/printerService.ts - Topics MQTT corrigés
import { reactive } from 'vue'

// ===== TYPES AMÉLIORÉS =====
export interface PrinterData {
  connected: boolean
  lastUpdate: Date
  
  // 🆕 État Moonraker/Klipper AMÉLIORÉ
  moonrakerOnline: boolean          // 🎯 NOUVEAU: Statut serveur Moonraker
  moonrakerConnected: boolean       // Connexion WebSocket/MQTT
  klipperState: 'ready' | 'error' | 'shutdown' | 'startup' | 'unknown'
  klipperMessage: string
  
  // Températures temps réel
  temperatures: {
    extruder: {
      current: number
      target: number
      power: number
    }
    bed: {
      current: number
      target: number
      power: number
    }
  }
  
  // Position tête d'impression
  position: {
    x: number
    y: number
    z: number
    e: number
  }
  
  // Axes calibrés
  homedAxes: string
  
  // Statistiques impression
  printJob: {
    filename: string
    state: 'standby' | 'printing' | 'paused' | 'complete' | 'cancelled' | 'error'
    progress: number
    timeElapsed: number
    timeRemaining: number
    estimatedTotalTime: number
    totalDuration: number
    filamentUsed: number
    layerCurrent: number | null
    layerTotal: number | null
  }
  
  // Carte SD virtuelle
  virtualSd: {
    filePosition: number
    fileSize: number
    isActive: boolean
    progress: number
  }
}

// État réactif avec valeurs par défaut améliorées
export const printerData = reactive<PrinterData>({
  connected: false,
  lastUpdate: new Date(),
  
  moonrakerOnline: false,      // 🆕 NOUVEAU: Statut serveur
  moonrakerConnected: false,
  klipperState: 'unknown',
  klipperMessage: 'En attente de connexion...',
  
  temperatures: {
    extruder: { current: 0, target: 0, power: 0 },
    bed: { current: 0, target: 0, power: 0 }
  },
  
  position: { x: 0, y: 0, z: 0, e: 0 },
  homedAxes: '',
  
  printJob: {
    filename: '',
    state: 'standby',
    progress: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    estimatedTotalTime: 0,   // 🆕 AJOUTÉ
    totalDuration: 0,
    filamentUsed: 0,
    layerCurrent: null,
    layerTotal: null
  },
  
  virtualSd: {
    filePosition: 0,
    fileSize: 0,
    isActive: false,
    progress: 0
  }
})

// 🎯 TOPICS MQTT CORRIGÉS
export const PRINTER_TOPICS = {
  status: {
    // Topics existants (spécifiques)
    toolhead: 'Ender3V3/klipper/status/toolhead',
    extruder: 'Ender3V3/klipper/status/extruder',
    heaterBed: 'Ender3V3/klipper/status/heater_bed',
    printStats: 'Ender3V3/klipper/status/print_stats',
    webhooks: 'Ender3V3/klipper/status/webhooks',
    virtualSdcard: 'Ender3V3/klipper/status/virtual_sdcard',
    
    // 🆕 NOUVEAUX TOPICS GLOBAUX
    klipperGlobal: 'Ender3V3/klipper/status',        // 🎯 Topic global avec températures
    moonrakerStatus: 'Ender3V3/moonraker/status'     // 🎯 Statut serveur online/offline
  },
  
  api: {
    request: 'Ender3V3/moonraker/api/request',
    response: 'Ender3V3/moonraker/api/response'
  }
}

class PrinterService {
  private commandId = 1
  private pendingCommands = new Map<number, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }>()
  
  // ===== 🆕 NOUVEAUX PARSERS =====
  
  /**
   * 🎯 Parser statut Moonraker (online/offline)
   */
  private handleMoonrakerStatus(data: any): void {
    try {
      if (data.server) {
        const serverStatus = String(data.server).toLowerCase()
        printerData.moonrakerOnline = serverStatus === 'online'
        
        console.log(`🖨️ Moonraker serveur: ${serverStatus}`)
        
        // 🎯 LOGIQUE DE CONNEXION AMÉLIORÉE
        // L'imprimante est "connectée" si Moonraker est online ET qu'on reçoit des données
        this.updateConnectionStatus()
      }
    } catch (error) {
      console.error('❌ Erreur parsing Moonraker status:', error)
    }
  }
  
  /**
   * 🎯 Parser topic global Klipper (températures optimisées)
   */
  private handleKlipperGlobalStatus(data: any): void {
    try {
      const { eventtime, status } = data
      
      if (!status) return
      
      // 🌡️ Températures depuis topic global
      if (status.extruder?.temperature !== undefined) {
        printerData.temperatures.extruder.current = Number(status.extruder.temperature) || 0
        console.log(`🌡️ Extrudeur global: ${printerData.temperatures.extruder.current}°C`)
      }
      
      if (status.heater_bed?.temperature !== undefined) {
        printerData.temperatures.bed.current = Number(status.heater_bed.temperature) || 0
        console.log(`🛏️ Lit global: ${printerData.temperatures.bed.current}°C`)
      }
      
      // Position depuis topic global (si disponible)
      if (status.toolhead?.position && Array.isArray(status.toolhead.position)) {
        const [x, y, z, e] = status.toolhead.position
        printerData.position = {
          x: Number(x) || 0,
          y: Number(y) || 0,
          z: Number(z) || 0,
          e: Number(e) || 0
        }
      }
      
      // Axes calibrés
      if (status.toolhead?.homed_axes) {
        printerData.homedAxes = String(status.toolhead.homed_axes)
      }
      
      // ✅ Marquer comme connecté si on reçoit des données
      this.updateConnectionStatus()
      
    } catch (error) {
      console.error('❌ Erreur parsing Klipper global:', error)
    }
  }
  
  /**
   * 🎯 Logique de connexion centralisée
   */
  private updateConnectionStatus(): void {
    const now = new Date()
    printerData.lastUpdate = now
    
    // 🎯 NOUVELLE LOGIQUE: 
    // Connecté = Moonraker online + données récentes
    const hasRecentData = now.getTime() - printerData.lastUpdate.getTime() < 30000
    printerData.connected = printerData.moonrakerOnline && hasRecentData
    
    console.log(`🔌 Connexion: Moonraker=${printerData.moonrakerOnline}, Recent=${hasRecentData}, Connected=${printerData.connected}`)
  }
  
  // ===== PARSERS EXISTANTS (inchangés mais améliorés) =====
  
  /**
   * Parser toolhead (amélioré avec logs)
   */
  private handleToolheadStatus(data: any): void {
    try {
      console.log('📍 PARSING TOOLHEAD:', data)
      
      if (data.position && Array.isArray(data.position)) {
        const [x, y, z, e] = data.position
        printerData.position = {
          x: Number(x) || 0,
          y: Number(y) || 0,
          z: Number(z) || 0,
          e: Number(e) || 0
        }
        console.log(`📍 Position: X:${x} Y:${y} Z:${z}`)
      }
      
      if (typeof data.homed_axes === 'string') {
        printerData.homedAxes = data.homed_axes
        console.log(`🎯 Axes calibrés: ${data.homed_axes}`)
      }
      
      this.updateConnectionStatus()
    } catch (error) {
      console.error('❌ Erreur parsing toolhead:', error)
    }
  }
  
  /**
   * Parser extruder (amélioré avec targets)
   */
  private handleExtruderStatus(data: any): void {
    try {
      if (data.temperature !== undefined) {
        printerData.temperatures.extruder.current = Number(data.temperature) || 0
      }
      if (data.target !== undefined) {
        printerData.temperatures.extruder.target = Number(data.target) || 0
      }
      if (data.power !== undefined) {
        printerData.temperatures.extruder.power = Number(data.power) || 0
      }
      
      this.updateConnectionStatus()
      console.log('🌡️ Extrudeur spécifique:', printerData.temperatures.extruder)
    } catch (error) {
      console.error('❌ Erreur parsing extruder:', error)
    }
  }
  
  /**
   * Parser lit chauffant (amélioré avec targets)
   */
  private handleHeaterBedStatus(data: any): void {
    try {
      if (data.temperature !== undefined) {
        printerData.temperatures.bed.current = Number(data.temperature) || 0
      }
      if (data.target !== undefined) {
        printerData.temperatures.bed.target = Number(data.target) || 0
      }
      if (data.power !== undefined) {
        printerData.temperatures.bed.power = Number(data.power) || 0
      }
      
      this.updateConnectionStatus()
      console.log('🛏️ Lit spécifique:', printerData.temperatures.bed)
    } catch (error) {
      console.error('❌ Erreur parsing heater_bed:', error)
    }
  }
  
  /**
   * Parser print_stats (inchangé mais avec logs détaillés)
   */
  private handlePrintStatsStatus(data: any): void {
    try {
      console.log('📊 PARSING PRINT_STATS:', data)
      
      if (data.filename) {
        printerData.printJob.filename = String(data.filename)
        console.log(`📄 Filename: ${printerData.printJob.filename}`)
      }
      
      if (data.state) {
        const state = String(data.state).toLowerCase()
        if (['standby', 'printing', 'paused', 'complete', 'cancelled', 'error'].includes(state)) {
          printerData.printJob.state = state as any
          console.log(`🎯 État: ${printerData.printJob.state}`)
        }
      }
      
      // 🎯 TEMPS ÉCOULÉ : print_duration est la source fiable 
      if (typeof data.print_duration === 'number') {
        printerData.printJob.timeElapsed = data.print_duration
        console.log(`⏱️ Temps écoulé: ${Math.round(data.print_duration / 60)}min (${data.print_duration}s)`)
      }
      
      if (typeof data.total_duration === 'number') {
        printerData.printJob.totalDuration = data.total_duration
        console.log(`📊 Durée totale: ${Math.round(data.total_duration / 60)}min`)
      }
      
      if (typeof data.filament_used === 'number') {
        printerData.printJob.filamentUsed = data.filament_used
        console.log(`🧵 Filament: ${data.filament_used.toFixed(2)}m`)
      }
      
      this.updateConnectionStatus()
      
    } catch (error) {
      console.error('❌ Erreur parsing print_stats:', error)
    }
  }
  
  /**
   * Parser webhooks (amélioré avec logs)
   */
  private handleWebhooksStatus(data: any): void {
    try {
      console.log('🔗 PARSING WEBHOOKS:', data)
      
      if (data.state) {
        const state = String(data.state).toLowerCase()
        if (['ready', 'error', 'shutdown', 'startup'].includes(state)) {
          printerData.klipperState = state as any
          console.log(`⚙️ Klipper état: ${state}`)
        }
      }
      
      if (data.state_message) {
        printerData.klipperMessage = String(data.state_message)
        console.log(`💬 Message: ${data.state_message}`)
      }
      
      this.updateConnectionStatus()
    } catch (error) {
      console.error('❌ Erreur parsing webhooks:', error)
    }
  }
  
  /**
   * Parser virtual SD (amélioré avec logs)
   */
  private handleVirtualSdStatus(data: any): void {
    try {
      console.log('💾 PARSING VIRTUAL_SDCARD:', data)
      
      if (typeof data.file_position === 'number') {
        printerData.virtualSd.filePosition = data.file_position
      }
      if (typeof data.file_size === 'number') {
        printerData.virtualSd.fileSize = data.file_size
      }
      if (typeof data.is_active === 'boolean') {
        printerData.virtualSd.isActive = data.is_active
        console.log(`💾 SD Active: ${data.is_active}`)
      }
      
      // 🎯 PROGRESSION : Utiliser virtual_sdcard comme source principale
      if (typeof data.progress === 'number') {
        printerData.virtualSd.progress = data.progress
        printerData.printJob.progress = data.progress * 100  // Convertir en pourcentage
        console.log(`📈 Progression: ${(data.progress * 100).toFixed(1)}%`)
      }
      
      // 🆕 TEMPS RESTANT CALCULÉ par le bridge Python
      if (typeof data.time_remaining_calculated === 'number') {
        printerData.printJob.timeRemaining = data.time_remaining_calculated
        console.log(`⏳ Temps restant: ${Math.round(data.time_remaining_calculated / 60)}min`)
      }
      
      // 🆕 TEMPS TOTAL ESTIMÉ 
      if (typeof data.estimated_total_time === 'number') {
        printerData.printJob.estimatedTotalTime = data.estimated_total_time
        console.log(`📊 Temps total estimé: ${Math.round(data.estimated_total_time / 60)}min`)
      }
      
      this.updateConnectionStatus()
    } catch (error) {
      console.error('❌ Erreur parsing virtual_sdcard:', error)
    }
  }
  
  /**
   * 🎯 HANDLER PRINCIPAL pour tous les topics (CORRIGÉ)
   */
  handleStatusMessage(topic: string, payload: string): void {
    try {
      const data = JSON.parse(payload)
      
      // 🎯 Router par NOM RÉEL du topic MQTT (pas constantes)
      switch (topic) {
        // 🆕 NOUVEAUX TOPICS (par nom réel)
        case 'Ender3V3/moonraker/status':
          this.handleMoonrakerStatus(data)
          break
          
        case 'Ender3V3/klipper/status':
          this.handleKlipperGlobalStatus(data)
          break
          
        // 📊 Topics spécifiques existants (par nom réel)
        case 'Ender3V3/klipper/status/toolhead':
          this.handleToolheadStatus(data)
          break
          
        case 'Ender3V3/klipper/status/extruder':
          this.handleExtruderStatus(data)
          break
          
        case 'Ender3V3/klipper/status/heater_bed':
          this.handleHeaterBedStatus(data)
          break
          
        case 'Ender3V3/klipper/status/print_stats':
          this.handlePrintStatsStatus(data)
          break
          
        case 'Ender3V3/klipper/status/webhooks':
          this.handleWebhooksStatus(data)
          break
          
        case 'Ender3V3/klipper/status/virtual_sdcard':
          this.handleVirtualSdStatus(data)
          break
          
        default:
          console.warn(`⚠️ Topic imprimante non géré: ${topic}`)
      }
      
    } catch (error) {
      console.error('🖨️ Erreur parsing status Klipper:', error)
    }
  }
  
  /**
   * 🆕 Timeout automatique pour détecter déconnexions
   */
  private checkConnectionTimeout(): void {
    const now = new Date().getTime()
    const lastUpdate = printerData.lastUpdate.getTime()
    
    // Si pas de données depuis 30 secondes, marquer comme déconnecté
    if (now - lastUpdate > 30000) {
      printerData.connected = false
      printerData.moonrakerConnected = false
      printerData.klipperState = 'unknown'
      printerData.klipperMessage = 'Connexion perdue - Vérifiez Moonraker'
      console.warn('⚠️ Timeout connexion imprimante')
    }
  }
  
  // ===== API PUBLIQUE (inchangée) =====
  
  private mqttPublisher: ((topic: string, message: string) => void) | null = null
  
  setMqttPublisher(publisher: (topic: string, message: string) => void): void {
    this.mqttPublisher = publisher
  }
  
  /**
   * Envoie une commande JSON-RPC à Moonraker
   */
  private async sendCommand(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.commandId++
      
      const command = {
        jsonrpc: "2.0",
        method,
        params,
        id
      }
      
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id)
        reject(new Error('Timeout commande Moonraker'))
      }, 10000)
      
      this.pendingCommands.set(id, { resolve, reject, timeout })
      
      if (this.mqttPublisher) {
        this.mqttPublisher(PRINTER_TOPICS.api.request, JSON.stringify(command))
      } else {
        reject(new Error('MQTT non disponible'))
      }
    })
  }
  
  /**
   * Parse les réponses API Moonraker
   */
  handleApiResponse(payload: string): void {
    try {
      const response = JSON.parse(payload)
      
      if (response.id && this.pendingCommands.has(response.id)) {
        const command = this.pendingCommands.get(response.id)!
        clearTimeout(command.timeout)
        this.pendingCommands.delete(response.id)
        
        if (response.error) {
          command.reject(new Error(response.error.message || 'Erreur Moonraker'))
        } else {
          command.resolve(response.result)
        }
      }
      
    } catch (error) {
      console.error('🖨️ Erreur parsing API response:', error)
    }
  }
  
  // Commandes API (inchangées)
  async pausePrint(): Promise<void> {
    await this.sendCommand('printer.print.pause')
  }
  
  async resumePrint(): Promise<void> {
    await this.sendCommand('printer.print.resume')
  }
  
  async cancelPrint(): Promise<void> {
    await this.sendCommand('printer.print.cancel')
  }
  
  async homeAll(): Promise<void> {
    await this.sendCommand('printer.gcode.script', { script: 'G28' })
  }
  
  async homeAxis(axis: 'x' | 'y' | 'z'): Promise<void> {
    await this.sendCommand('printer.gcode.script', { script: `G28 ${axis.toUpperCase()}` })
  }
  
  async moveAxis(axis: 'x' | 'y' | 'z', distance: number): Promise<void> {
    const script = `G91\nG1 ${axis.toUpperCase()}${distance >= 0 ? '+' : ''}${distance} F3000\nG90`
    await this.sendCommand('printer.gcode.script', { script })
  }
  
  async setExtruderTemp(temp: number): Promise<void> {
    await this.sendCommand('printer.gcode.script', { script: `M104 S${temp}` })
  }
  
  async setBedTemp(temp: number): Promise<void> {
    await this.sendCommand('printer.gcode.script', { script: `M140 S${temp}` })
  }
  
  async emergencyStop(): Promise<void> {
    await this.sendCommand('printer.emergency_stop')
  }
  
  // ===== FONCTIONS UTILITAIRES =====
  
  /**
   * Affichage pour navbar (amélioré)
   */
  getNavbarDisplay(): string | null {
    if (!printerData.connected) return null
    
    const { printJob } = printerData
    
    if (printJob.state === 'printing' && printJob.filename) {
      const progress = printerData.virtualSd.progress || printJob.progress || 0
      const timeRemaining = printJob.timeRemaining
      
      if (timeRemaining > 0) {
        const hours = Math.floor(timeRemaining / 3600)
        const minutes = Math.floor((timeRemaining % 3600) / 60)
        const timeStr = hours > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${minutes}min`
        return `🖨️ ${progress.toFixed(0)}% (${timeStr})`
      } else {
        return `🖨️ ${progress.toFixed(0)}%`
      }
    }
    
    if (printJob.state === 'paused' && printJob.filename) {
      return `🖨️En pause⏸️ `
    }
    
    if (printJob.state === 'complete') {
      return `🖨️terminée✅ `
    }
    
    // Affichage températures si pas d'impression
    const extTemp = printerData.temperatures.extruder.current
    const bedTemp = printerData.temperatures.bed.current
    
    if (extTemp > 25 || bedTemp > 25) {
      return `🖨️E:${extTemp.toFixed(0)}°C B:${bedTemp.toFixed(0)}°C`
    }
    
    return null
  }
  
  /**
   * Diagnostics étendus
   */
  getDiagnostics() {
    return {
      connected: printerData.connected,
      moonrakerOnline: printerData.moonrakerOnline,
      klipperState: printerData.klipperState,
      lastUpdate: printerData.lastUpdate,
      temperatures: {
        extruder: printerData.temperatures.extruder.current,
        bed: printerData.temperatures.bed.current
      },
      printJob: {
        state: printerData.printJob.state,
        filename: printerData.printJob.filename,
        progress: printerData.printJob.progress
      }
    }
  }
}

export const printerService = new PrinterService()

// Démarrer le timeout checker
setInterval(() => {
  (printerService as any).checkConnectionTimeout()
}, 10000) // Vérification toutes les 10 secondes