<template>
  <section class="printer-page">
    <!-- SIDEBAR MODERNE -->
    <nav class="modern-sidebar">
      <div class="nav-buttons">
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'overview' }" 
          @click="setTab('overview')"
          title="Vue d'ensemble"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M9 9h6v6H9z" fill="currentColor"/>
          </svg>
        </button>
        
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'temperatures' }" 
          @click="setTab('temperatures')"
          title="Températures"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
        
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'controls' }" 
          @click="setTab('controls')"
          title="Contrôles"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        
        <button 
          class="nav-btn emergency-btn" 
          @click="confirmEmergencyStop"
          title="Arrêt d'urgence"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <octagon cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M9 9h6v6H9z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </nav>

    <!-- PANNEAU PRINCIPAL -->
    <main class="main-panel">
      
      <!-- 🖨️ VUE D'ENSEMBLE -->
      <div v-if="tab === 'overview'" class="overview-container">
        <!-- État connexion -->
        <div v-if="!printerData.connected" class="status-card disconnected">
          <svg viewBox="0 0 24 24" class="status-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
          </svg>
          <div class="status-text">
            <div class="status-title">Imprimante déconnectée</div>
            <div class="status-subtitle">Vérifiez Moonraker et Klipper</div>
          </div>
        </div>

        <!-- 🆕 ÉTAT IMPRESSION DÉTAILLÉ -->
        <div v-else class="print-overview">
          
          <!-- Carte principale impression -->
          <div class="print-main-card" :class="`status-${printerData.printJob.state}`">
            <div class="print-header">
              <div class="print-status-indicator">
                <div class="status-dot" :class="printerData.printJob.state"></div>
                <div class="status-info">
                  <h2 class="print-status-title">{{ getStatusText() }}</h2>
                  <p class="print-filename" v-if="printerData.printJob.filename">
                    📄 {{ printerData.printJob.filename }}
                  </p>
                </div>
              </div>
              
              <!-- Contrôles impression -->
              <div class="print-controls" v-if="printerData.printJob.state === 'printing' || printerData.printJob.state === 'paused'">
                <button 
                  v-if="printerData.printJob.state === 'printing'" 
                  @click="pausePrint"
                  class="control-btn pause-btn"
                >
                  <svg viewBox="0 0 24 24" class="btn-icon">
                    <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                  </svg>
                  Pause
                </button>
                
                <button 
                  v-if="printerData.printJob.state === 'paused'" 
                  @click="resumePrint"
                  class="control-btn resume-btn"
                >
                  <svg viewBox="0 0 24 24" class="btn-icon">
                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                  </svg>
                  Reprendre
                </button>
                
                <button 
                  @click="confirmCancelPrint"
                  class="control-btn cancel-btn"
                >
                  <svg viewBox="0 0 24 24" class="btn-icon">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Annuler
                </button>
              </div>
            </div>

            <!-- 🆕 PROGRESSION DÉTAILLÉE -->
            <div v-if="printerData.printJob.state === 'printing' || printerData.printJob.state === 'paused'" class="progress-detailed">
              <div class="progress-bar-container">
                <div class="progress-bar-large">
                  <div class="progress-fill" :style="{ width: `${printerData.printJob.progress}%` }"></div>
                </div>
                <div class="progress-percentage">{{ printerData.printJob.progress.toFixed(1) }}%</div>
              </div>
              
              <!-- 🆕 INFORMATIONS TEMPORELLES -->
              <div class="time-info-grid">
                <div class="time-card">
                  <div class="time-icon">🚀</div>
                  <div class="time-data">
                    <div class="time-label">Démarrée</div>
                    <div class="time-value">{{ formatStartTime() }}</div>
                  </div>
                </div>
                
                <div class="time-card">
                  <div class="time-icon">⏱️</div>
                  <div class="time-data">
                    <div class="time-label">Écoulé</div>
                    <div class="time-value">{{ formatDuration(printerData.printJob.timeElapsed) }}</div>
                  </div>
                </div>
                
                <div class="time-card">
                  <div class="time-icon">⏳</div>
                  <div class="time-data">
                    <div class="time-label">Restant</div>
                    <div class="time-value">{{ formatDuration(printerData.printJob.timeRemaining) }}</div>
                  </div>
                </div>
                
                <div class="time-card">
                  <div class="time-icon">🎯</div>
                  <div class="time-data">
                    <div class="time-label">Fin estimée</div>
                    <div class="time-value">{{ formatEstimatedEndTime() }}</div>
                  </div>
                </div>
              </div>

              <!-- 🆕 DÉTAILS IMPRESSION -->
              <div class="print-details">
                <div class="detail-item">
                  <span class="detail-label">Filament utilisé</span>
                  <span class="detail-value">{{ printerData.printJob.filamentUsed.toFixed(2) }}m</span>
                </div>
                <div class="detail-item" v-if="printerData.printJob.layerCurrent && printerData.printJob.layerTotal">
                  <span class="detail-label">Couche actuelle</span>
                  <span class="detail-value">{{ printerData.printJob.layerCurrent }}/{{ printerData.printJob.layerTotal }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 🆕 GRILLE D'INFORMATIONS RAPIDES -->
          <div class="quick-info-grid">
            <!-- Températures -->
            <div class="info-card temp-card">
              <h3>🌡️ Températures</h3>
              <div class="temp-rows">
                <div class="temp-row">
                  <div class="temp-label">Extrudeur</div>
                  <div class="temp-display">
                    <span class="temp-current">{{ printerData.temperatures.extruder.current.toFixed(0) }}°C</span>
                    <span v-if="printerData.temperatures.extruder.target > 0" class="temp-target">
                      → {{ printerData.temperatures.extruder.target }}°C
                    </span>
                  </div>
                </div>
                <div class="temp-row">
                  <div class="temp-label">Lit</div>
                  <div class="temp-display">
                    <span class="temp-current">{{ printerData.temperatures.bed.current.toFixed(0) }}°C</span>
                    <span v-if="printerData.temperatures.bed.target > 0" class="temp-target">
                      → {{ printerData.temperatures.bed.target }}°C
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Position -->
            <div class="info-card position-card">
              <h3>📐 Position</h3>
              <div class="position-display">
                <div class="axis-group">
                  <div class="axis-item">
                    <span class="axis-label">X</span>
                    <span class="axis-value">{{ printerData.position.x.toFixed(1) }}</span>
                  </div>
                  <div class="axis-item">
                    <span class="axis-label">Y</span>
                    <span class="axis-value">{{ printerData.position.y.toFixed(1) }}</span>
                  </div>
                  <div class="axis-item">
                    <span class="axis-label">Z</span>
                    <span class="axis-value">{{ printerData.position.z.toFixed(1) }}</span>
                  </div>
                </div>
                <div class="homed-info">
                  Calibrés: {{ printerData.homedAxes || 'aucun' }}
                </div>
              </div>
            </div>

            <!-- État système -->
            <div class="info-card system-card">
              <h3>⚙️ Système</h3>
              <div class="system-info">
                <div class="system-row">
                  <span class="system-label">Klipper</span>
                  <span class="system-status" :class="printerData.klipperState">{{ printerData.klipperState }}</span>
                </div>
                <div class="system-row">
                  <span class="system-label">Connexion</span>
                  <span class="system-status" :class="{ 'ready': printerData.connected }">
                    {{ printerData.connected ? 'Connectée' : 'Déconnectée' }}
                  </span>
                </div>
                <div class="system-message" v-if="printerData.klipperMessage">
                  {{ printerData.klipperMessage }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🌡️ TEMPÉRATURES (inchangé) -->
      <div v-if="tab === 'temperatures'" class="temperatures-container">
        <div class="temp-controls-grid">
          <!-- Extrudeur -->
          <div class="temp-control-card">
            <div class="temp-header">
              <h3>🔥 Extrudeur</h3>
              <div class="temp-current">{{ printerData.temperatures.extruder.current.toFixed(1) }}°C</div>
            </div>
            
            <div class="temp-bar">
              <div class="temp-fill" :style="{ width: `${Math.min(printerData.temperatures.extruder.current / 250 * 100, 100)}%` }"></div>
              <div v-if="printerData.temperatures.extruder.target > 0" class="temp-target-line" 
                   :style="{ left: `${Math.min(printerData.temperatures.extruder.target / 250 * 100, 100)}%` }"></div>
            </div>
            
            <div class="temp-info">
              <span>Cible: {{ printerData.temperatures.extruder.target }}°C</span>
              <span>Puissance: {{ printerData.temperatures.extruder.power.toFixed(1) }}%</span>
            </div>
            
            <div class="temp-presets">
              <button @click="setExtruderTemp(0)" class="preset-btn">OFF</button>
              <button @click="setExtruderTemp(160)" class="preset-btn">160°C</button>
              <button @click="setExtruderTemp(220)" class="preset-btn">220°C</button>
              <button @click="setExtruderTemp(240)" class="preset-btn">240°C</button>
            </div>
          </div>

          <!-- Lit chauffant -->
          <div class="temp-control-card">
            <div class="temp-header">
              <h3>🛏️ Bed</h3>
              <div class="temp-current">{{ printerData.temperatures.bed.current.toFixed(1) }}°C</div>
            </div>
            
            <div class="temp-bar">
              <div class="temp-fill" :style="{ width: `${Math.min(printerData.temperatures.bed.current / 100 * 100, 100)}%` }"></div>
              <div v-if="printerData.temperatures.bed.target > 0" class="temp-target-line" 
                   :style="{ left: `${Math.min(printerData.temperatures.bed.target / 100 * 100, 100)}%` }"></div>
            </div>
            
            <div class="temp-info">
              <span>Cible: {{ printerData.temperatures.bed.target }}°C</span>
              <span>Puissance: {{ printerData.temperatures.bed.power.toFixed(1) }}%</span>
            </div>
            
            <div class="temp-presets">
              <button @click="setBedTemp(0)" class="preset-btn">OFF</button>
              <button @click="setBedTemp(60)" class="preset-btn">60°C</button>
              <button @click="setBedTemp(70)" class="preset-btn">70°C</button>
              <button @click="setBedTemp(80)" class="preset-btn">80°C</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 🎮 CONTRÔLES REDESSINÉS -->
      <div v-if="tab === 'controls'" class="controls-container">
        <div class="controls-redesign">
          
          <!-- 🟢 ZONE VERTE : "Tout calibrer" pleine largeur -->
          <div class="home-all-section">
            <button @click="homeAll" class="control-btn home-all">
              <svg viewBox="0 0 24 24" class="btn-icon">
                <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" fill="currentColor"/>
              </svg>
              Tout calibrer
            </button>
          </div>

          <!-- 🏗️ ZONE PRINCIPALE : Distance + Mouvements -->
          <div class="main-controls-grid">
            
            <!-- 🔵 ZONE BLEUE : Distance (ex-rouge) -->
            <div class="distance-column">
              <label class="distance-label">Distance</label>
              <div class="distance-buttons-column">
                <button 
                  v-for="dist in [0.1, 1, 10, 50]" 
                  :key="dist"
                  @click="movementDistance = dist"
                  class="distance-btn-vertical"
                  :class="{ active: movementDistance === dist }"
                >
                  {{ dist }}mm
                </button>
              </div>
            </div>
            
            <!-- 🟠 ZONE ORANGE XY : Contrôles XY avec Home intégré -->
            <div class="xy-movement-section">
              <div class="xy-grid-extended">
                <!-- Ligne 1 : Home XY + Mouvement Y+ -->
                <button @click="homeAxis('x')" class="move-btn home-btn small">⌂X</button>
                <button @click="moveAxis('y', movementDistance)" class="move-btn">↑</button>
                <button @click="homeAxis('y')" class="move-btn home-btn small">⌂Y</button>
                
                <!-- Ligne 2 : X- + XY + X+ -->
                <button @click="moveAxis('x', -movementDistance)" class="move-btn">←</button>
                <div class="xy-center">XY</div>
                <button @click="moveAxis('x', movementDistance)" class="move-btn">→</button>
                
                <!-- Ligne 3 : Vide + Y- + Vide -->
                <div></div>
                <button @click="moveAxis('y', -movementDistance)" class="move-btn">↓</button>
                <div></div>
              </div>
            </div>
            
            <!-- 🟠🌸 ZONE ORANGE Z : Contrôles Z avec Home intégré (ex-rose) -->
            <div class="z-movement-section">
              <button @click="homeAxis('z')" class="move-btn home-btn z-home">⌂Z</button>
              <button @click="moveAxis('z', movementDistance)" class="move-btn z-up">Z ↑</button>
              <button @click="moveAxis('z', -movementDistance)" class="move-btn z-down">Z ↓</button>
            </div>
            
          </div>
        </div>
      </div>
    </main>

    <!-- Modals de confirmation (inchangées) -->
    <div v-if="showEmergencyConfirm" class="modal-overlay" @click="showEmergencyConfirm = false">
      <div class="modal emergency-modal" @click.stop>
        <div class="modal-icon">⚠️</div>
        <h3>Arrêt d'urgence</h3>
        <p>Êtes-vous sûr de vouloir arrêter l'imprimante en urgence ?</p>
        <div class="modal-actions">
          <button @click="showEmergencyConfirm = false" class="modal-btn cancel">Annuler</button>
          <button @click="emergencyStop" class="modal-btn danger">Arrêt d'urgence</button>
        </div>
      </div>
    </div>

    <div v-if="showCancelConfirm" class="modal-overlay" @click="showCancelConfirm = false">
      <div class="modal cancel-modal" @click.stop>
        <div class="modal-icon">🛑</div>
        <h3>Annuler l'impression</h3>
        <p>Êtes-vous sûr de vouloir annuler l'impression de "{{ printerData.printJob.filename }}" ?</p>
        <div class="modal-actions">
          <button @click="showCancelConfirm = false" class="modal-btn cancel">Non</button>
          <button @click="cancelPrint" class="modal-btn danger">Oui, annuler</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watchEffect } from 'vue'
import { printerService, printerData } from '../services/printerService'
import { mqttData } from '../services/mqttService'

// 🔍 DEBUG: Surveillance des données (temporaire)
watchEffect(() => {
  console.log('🔍 DEBUG Printer Data:', {
    connected: printerData.connected,
    klipperState: printerData.klipperState,
    printJobState: printerData.printJob.state,
    filename: printerData.printJob.filename,
    progress: printerData.printJob.progress,
    timeElapsed: printerData.printJob.timeElapsed
  })
})

// Navigation onglets
const tab = ref<'overview'|'temperatures'|'controls'>('overview')

// Inputs températures
const extruderTempInput = ref(220)
const bedTempInput = ref(60)

// Contrôles mouvements
const movementDistance = ref(10)

// Modals
const showEmergencyConfirm = ref(false)
const showCancelConfirm = ref(false)

function setTab(newTab: typeof tab.value) {
  tab.value = newTab
}

// 🆕 FONCTIONS TEMPORELLES AMÉLIORÉES
function getStatusText(): string {
  const state = printerData.printJob.state
  const filename = printerData.printJob.filename
  
  switch (state) {
    case 'printing':
      return filename ? `Impression en cours` : 'Impression en cours'
    case 'paused':
      return filename ? `Impression en pause` : 'Impression en pause'
    case 'complete':
      return 'Impression terminée'
    case 'cancelled':
      return 'Impression annulée'
    case 'error':
      return 'Erreur impression'
    default:
      return printerData.klipperState === 'ready' ? 'Prête' : 'En attente'
  }
}

function formatStartTime(): string {
  if (!printerData.printJob.timeElapsed || printerData.printJob.timeElapsed === 0) {
    return 'N/A'
  }
  
  const startTime = new Date()
  startTime.setSeconds(startTime.getSeconds() - printerData.printJob.timeElapsed)
  
  return startTime.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function formatEstimatedEndTime(): string {
  if (!printerData.printJob.timeRemaining || printerData.printJob.timeRemaining === 0) {
    return 'N/A'
  }
  
  const endTime = new Date()
  endTime.setSeconds(endTime.getSeconds() + printerData.printJob.timeRemaining)
  
  return endTime.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0min'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}`
  }
  return `${minutes}min`
}

function getEstimatedTotal(): number {
  const { progress, timeElapsed } = printerData.printJob
  if (progress <= 0) return 0
  return (timeElapsed / progress) * 100
}

// Actions impression
async function pausePrint() {
  try {
    await printerService.pausePrint()
    console.log('✅ Impression mise en pause')
  } catch (error) {
    console.error('❌ Erreur pause impression:', error)
  }
}

async function resumePrint() {
  try {
    await printerService.resumePrint()
    console.log('✅ Impression reprise')
  } catch (error) {
    console.error('❌ Erreur reprise impression:', error)
  }
}

function confirmCancelPrint() {
  showCancelConfirm.value = true
}

async function cancelPrint() {
  try {
    await printerService.cancelPrint()
    showCancelConfirm.value = false
    console.log('✅ Impression annulée')
  } catch (error) {
    console.error('❌ Erreur annulation impression:', error)
  }
}

// Actions températures
async function setExtruderTemp(temp: number) {
  try {
    await printerService.setExtruderTemp(temp)
    console.log(`✅ Température extrudeur réglée: ${temp}°C`)
  } catch (error) {
    console.error('❌ Erreur réglage température extrudeur:', error)
  }
}

async function setBedTemp(temp: number) {
  try {
    await printerService.setBedTemp(temp)
    console.log(`✅ Température lit réglée: ${temp}°C`)
  } catch (error) {
    console.error('❌ Erreur réglage température lit:', error)
  }
}

// Actions axes
async function homeAll() {
  try {
    await printerService.homeAll()
    console.log('✅ Tous les axes calibrés')
  } catch (error) {
    console.error('❌ Erreur calibration axes:', error)
  }
}

async function homeAxis(axis: 'x'|'y'|'z') {
  try {
    await printerService.homeAxis(axis)
    console.log(`✅ Axe ${axis.toUpperCase()} calibré`)
  } catch (error) {
    console.error(`❌ Erreur calibration axe ${axis}:`, error)
  }
}

async function moveAxis(axis: 'x'|'y'|'z', distance: number) {
  try {
    await printerService.moveAxis(axis, distance)
    console.log(`✅ Mouvement ${axis.toUpperCase()}: ${distance}mm`)
  } catch (error) {
    console.error(`❌ Erreur mouvement ${axis}:`, error)
  }
}

// Urgence
function confirmEmergencyStop() {
  showEmergencyConfirm.value = true
}

async function emergencyStop() {
  try {
    await printerService.emergencyStop()
    showEmergencyConfirm.value = false
    console.log('🚨 Arrêt d\'urgence activé')
  } catch (error) {
    console.error('❌ Erreur arrêt d\'urgence:', error)
  }
}

onMounted(() => {
  console.log('🖨️ PrinterView -> Interface imprimante améliorée initialisée')
})
</script>

<style scoped>
/* 🎨 STYLES AMÉLIORÉS */

/* LAYOUT PRINCIPAL */
.printer-page {
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 255px;
  gap: 0.25rem;
  overflow: hidden;
  padding: .25rem 0;
}

/* SIDEBAR MODERNE (inchangée) */
.modern-sidebar {
  width: 64px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border-radius: 10px;
  display: flex;
  gap: 0.5rem;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  flex-shrink: 0;
  align-items: center;
}

.nav-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: auto;
}

.nav-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  background: rgba(255,255,255,0.15);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
}

.nav-btn.active {
  background: var(--emerald);
  color: white;
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.4);
}

.nav-btn.emergency-btn {
  background: #dc2626;
  color: white;
}

.nav-btn.emergency-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

/* PANNEAU PRINCIPAL */
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--card);
  border-radius: 10px;
  overflow: hidden;
  padding: 0.25rem;
}

/* 🆕 VUE D'ENSEMBLE AMÉLIORÉE */
.overview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0.5rem;
}

.print-overview {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0rem;
}

/* 🆕 CARTE PRINCIPALE IMPRESSION */
.print-main-card {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: .5rem;
  border-left: 4px solid transparent;
}

.print-main-card.status-printing {
  background: rgba(34, 197, 94, 0.1);
  border-left-color: #22c55e;
}

.print-main-card.status-paused {
  background: rgba(245, 158, 11, 0.1);
  border-left-color: #f59e0b;
}

.print-main-card.status-complete {
  background: rgba(59, 130, 246, 0.1);
  border-left-color: #3b82f6;
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.print-status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #6b7280;
}

.status-dot.printing {
  background: #22c55e;
  animation: pulse 2s ease-in-out infinite;
}

.status-dot.paused {
  background: #f59e0b;
}

.status-dot.complete {
  background: #3b82f6;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.print-status-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--muted);
  margin: 0;
}

.print-filename {
  font-size: 0.9rem;
  color: var(--muted);
  opacity: 0.8;
  margin: 0.25rem 0 0 0;
}

/* 🆕 CONTRÔLES IMPRESSION */
.print-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  margin: auto;
}

.pause-btn {
  background: #f59e0b;
  color: white;
}

.resume-btn {
  background: #22c55e;
  color: white;
}

.cancel-btn {
  background: #ef4444;
  color: white;
}

.control-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,.2);
}

/* 🆕 PROGRESSION DÉTAILLÉE */
.progress-detailed {
  display: flex;
  flex-direction: column;
  gap: .25rem;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: .25rem;
}

.progress-bar-large {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #3b82f6);
  transition: width 0.3s ease;
}

.progress-percentage {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--emerald);
  min-width: 50px;
}

/* 🆕 INFORMATIONS TEMPORELLES */
.time-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0rem;
}

.time-card {
  display: flex;
  align-items: center;
  gap: 0rem;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0.5rem;
}

.time-icon {
  font-size: 1.25rem;
}

.time-data {
  display: flex;
  flex-direction: column;
}

.time-label {
  font-size: 0.75rem;
  color: var(--muted);
  opacity: 0.7;
}

.time-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--muted);
}

/* 🆕 DÉTAILS IMPRESSION */
.print-details {
  display: flex;
  gap: 0rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--muted);
  opacity: 0.7;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--muted);
}

/* 🆕 GRILLE D'INFORMATIONS RAPIDES */
.quick-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0rem;
  flex: 1;
}

.info-card {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0rem;
}

.info-card h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--muted);
}

/* Carte températures */
.temp-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.temp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.temp-label {
  font-size: 0.75rem;
  color: var(--muted);
  opacity: 0.8;
}

.temp-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.temp-current {
  font-weight: 600;
  color: var(--emerald);
}

.temp-target {
  font-size: 0.75rem;
  opacity: 0.7;
  color: var(--muted);
}

/* Carte position */
.axis-group {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.axis-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.axis-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--emerald);
}

.axis-value {
  font-size: 0.875rem;
  color: var(--muted);
}

.homed-info {
  font-size: 0.75rem;
  text-align: center;
  color: var(--muted);
  opacity: 0.7;
}

/* Carte système */
.system-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.system-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.system-label {
  font-size: 0.75rem;
  color: var(--muted);
  opacity: 0.8;
}

.system-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.system-status.ready {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.system-message {
  font-size: 0.75rem;
  color: var(--muted);
  opacity: 0.7;
  margin-top: 0.5rem;
  font-style: italic;
}

/* STATUS CARD DÉCONNECTÉ */
.status-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
}

.status-card.disconnected {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-icon {
  width: 24px;
  height: 24px;
  color: #ef4444;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--muted);
}

.status-subtitle {
  font-size: 0.875rem;
  opacity: 0.7;
  color: var(--muted);
}

/* TEMPÉRATURES (styles existants simplifiés) */
.temperatures-container {
  height: 100%;
}

.temp-controls-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  height: 100%;
}

.temp-control-card {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: auto 0;
  height: 50%;
}

.temp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.temp-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--muted);
}

.temp-current {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--emerald);
}

.temp-bar {
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.temp-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
  transition: width 0.3s ease;
}

.temp-target-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: white;
  box-shadow: 0 0 4px rgba(255,255,255,0.5);
}

.temp-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--muted);
}

.temp-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
}

.preset-btn {
  padding: 0.25rem;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  color: var(--muted);
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.2s ease;
}

.preset-btn:hover {
  background: rgba(255,255,255,0.2);
}

.temp-manual {
  display: flex;
  gap: 0.25rem;
}

.temp-input {
  flex: 1;
  padding: 0.25rem;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  color: var(--muted);
  font-size: 0.8rem;
}

.set-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: var(--emerald);
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
}

/* 🎮 CONTRÔLES REDESSINÉS */
.controls-container {
  padding: 0.25rem;
  height: 100%;
  overflow-y: hidden;
}

.controls-redesign {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
}

/* 🟢 ZONE VERTE : "Tout calibrer" pleine largeur */
.home-all-section {
  display: flex;
  width: 100%;
}

.control-btn.home-all {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: var(--emerald);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.control-btn.home-all:hover {
  background: #16a085;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.control-btn.home-all .btn-icon {
  width: 20px;
  height: 20px;
}

/* 🏗️ ZONE PRINCIPALE : Grille Distance + Mouvements */
.main-controls-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  flex: 1;
  align-items: start;
}

/* 🔵 ZONE BLEUE : Distance en colonne (ex-rouge) */
.distance-column {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  padding: 0.5rem 0.25rem;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  height: fit-content;
}

.distance-label {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
  text-align: center;
  font-weight: 600;
}

.distance-buttons-column {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.distance-btn-vertical {
  padding: 0.4rem 0.6rem;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  color: var(--muted);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.2s ease;
  min-width: 50px;
}

.distance-btn-vertical.active {
  background: var(--emerald);
  color: white;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.distance-btn-vertical:hover {
  background: rgba(255,255,255,0.2);
}

.distance-btn-vertical.active:hover {
  background: #16a085;
}

/* 🟠 ZONE ORANGE XY : Contrôles XY étendus avec Home */
.xy-movement-section {
  display: flex;
  justify-content: center;
  align-items: center;
}

.xy-grid-extended {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  width: fit-content;
}

.move-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: var(--muted);
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.move-btn:hover {
  background: var(--emerald);
  color: white;
  transform: scale(1.05);
}

.move-btn.small {
  width: 38px;
  height: 38px;
  font-size: 0.8rem;
}

.move-btn.home-btn {
  background: rgba(34, 197, 94, 0.2);
  color: var(--emerald);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.move-btn.home-btn:hover {
  background: var(--emerald);
  color: white;
}

.xy-center {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--muted);
  font-size: 0.9rem;
}

/* 🟠🌸 ZONE ORANGE Z : Contrôles Z avec Home intégré (ex-rose) */
.z-movement-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.move-btn.z-home {
  width: 60px;
  height: 32px;
  font-size: 0.8rem;
  background: rgba(34, 197, 94, 0.2);
  color: var(--emerald);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.move-btn.z-up,
.move-btn.z-down {
  width: 60px;
  height: 36px;
  font-size: 0.85rem;
}

.move-btn.z-up {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.move-btn.z-down {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.move-btn.z-up:hover {
  background: #3b82f6;
  color: white;
}

.move-btn.z-down:hover {
  background: #ef4444;
  color: white;
}

/* 📱 Responsivité pour petits écrans */
@media (max-width: 768px) {
  .main-controls-grid {
    grid-template-columns: 60px 1fr 70px;
    gap: 0.25rem;
  }
  
  .move-btn {
    width: 38px;
    height: 38px;
    font-size: 1rem;
  }
  
  .move-btn.small {
    width: 32px;
    height: 32px;
    font-size: 0.7rem;
  }
  
  .move-btn.z-up,
  .move-btn.z-down {
    width: 50px;
    height: 32px;
  }
}
</style>