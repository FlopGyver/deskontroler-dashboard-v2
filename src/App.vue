<template>
  <div class="app-shell">
    <div class="app-wrap">
      <nav class="topnav" ref="topnavRef" @pointerup="onTopnavPointerUp" style="user-select: none;">
        <!-- GAUCHE : HEURE + secondes -->
        <div class="clock">
          <span class="time">
            {{ hoursMinutes }}<span class="sec">{{ seconds }}</span>
          </span>
        </div>

        <!-- CENTRE : INFO ROTATIVE / CONTEXTUELLE -->
        <div class="center-info" :title="centerText"> 
          <transition name="slide-fade" mode="out-in">
            <div :key="centerKey" class="info-line" :class="{ 'timer-urgent': isTimerUrgent }">
              {{ centerText }}
            </div>
          </transition>
        </div>

        <div class="info-status">
          <RouterLink to="/timer">
          <div class="info-timer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="#197a4d" d="M160 64C142.3 64 128 78.3 128 96C128 113.7 142.3 128 160 128L160 139C160 181.4 176.9 222.1 206.9 252.1L274.8 320L206.9 387.9C176.9 417.9 160 458.6 160 501L160 512C142.3 512 128 526.3 128 544C128 561.7 142.3 576 160 576L480 576C497.7 576 512 561.7 512 544C512 526.3 497.7 512 480 512L480 501C480 458.6 463.1 417.9 433.1 387.9L365.2 320L433.1 252.1C463.1 222.1 480 181.4 480 139L480 128C497.7 128 512 113.7 512 96C512 78.3 497.7 64 480 64L160 64zM224 139L224 128L416 128L416 139C416 164.5 405.9 188.9 387.9 206.9L320 274.8L252.1 206.9C234.1 188.9 224 164.4 224 139z"/></svg>
            <span v-if="timer.active" class="timer-label" :class="{ 'timer-urgent': isTimerUrgent }" style="color: white;">{{ timer.clock.value }}</span>
          </div>
        </RouterLink>
          
          <!-- Batteries tournantes -->
          <transition name="slide-fade" mode="out-in">
            <div :key="`batt-${batteryIndex}`" class="info-batteries">
              <div class="battery-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                  <path v-if="currentBatteries.first.type === 'phone'" d="M208 64C172.7 64 144 92.7 144 128L144 512C144 547.3 172.7 576 208 576L432 576C467.3 576 496 547.3 496 512L496 128C496 92.7 467.3 64 432 64L208 64zM280 480L360 480C373.3 480 384 490.7 384 504C384 517.3 373.3 528 360 528L280 528C266.7 528 256 517.3 256 504C256 490.7 266.7 480 280 480z"/>
                  <path v-else-if="currentBatteries.first.type === 'headset'" d="M160 288C160 199.6 231.6 128 320 128C408.4 128 480 199.6 480 288L480 325.5C470 322 459.2 320 448 320L432 320C405.5 320 384 341.5 384 368L384 496C384 522.5 405.5 544 432 544L448 544C501 544 544 501 544 448L544 288C544 164.3 443.7 64 320 64C196.3 64 96 164.3 96 288L96 448C96 501 139 544 192 544L208 544C234.5 544 256 522.5 256 496L256 368C256 341.5 234.5 320 208 320L192 320C180.8 320 170 321.9 160 325.5L160 288z"/>
                </svg>
                <span v-if="currentBatteries.first.value >= 0">{{ currentBatteries.first.value }}%</span>
              </div>
              <div class="battery-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                  <path v-if="currentBatteries.second.type === 'mouse'" d="M128 256L296 256L296 64L288 64C199.6 64 128 135.6 128 224L128 256zM128 304L128 416C128 504.4 199.6 576 288 576L352 576C440.4 576 512 504.4 512 416L512 304L128 304zM512 256L512 224C512 135.6 440.4 64 352 64L344 64L344 256L512 256z"/>
                  <path v-else-if="currentBatteries.second.type === 'gamepad'" d="M448 128C554 128 640 214 640 320C640 426 554 512 448 512L192 512C86 512 0 426 0 320C0 214 86 128 192 128L448 128zM192 240C178.7 240 168 250.7 168 264L168 296L136 296C122.7 296 112 306.7 112 320C112 333.3 122.7 344 136 344L168 344L168 376C168 389.3 178.7 400 192 400C205.3 400 216 389.3 216 376L216 344L248 344C261.3 344 272 333.3 272 320C272 306.7 261.3 296 248 296L216 296L216 264C216 250.7 205.3 240 192 240zM432 336C414.3 336 400 350.3 400 368C400 385.7 414.3 400 432 400C449.7 400 464 385.7 464 368C464 350.3 449.7 336 432 336zM496 240C478.3 240 464 254.3 464 272C464 289.7 478.3 304 496 304C513.7 304 528 289.7 528 272C528 254.3 513.7 240 496 240z"/>
                </svg>
                <span v-if="currentBatteries.second.value >= 0">{{ currentBatteries.second.value }}%</span>
              </div>
            </div>
          </transition>
        </div>
        <!-- DROITE : BOUTON MENU -->
        <button class="menu-btn" aria-label="Ouvrir le menu" @click="menuOpen = true">
          <svg viewBox="0 0 24 24" class="ico" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </nav>

      <RouterView />

      <!-- MENU PLEIN ÉCRAN (tuiles) -->
      <transition name="fade">
        <div v-if="menuOpen" class="menu-overlay" @click.self="menuOpen=false">
          <div class="menu-grid" role="menu" aria-label="Navigation rapide">
            <!-- Indicateur de connexion MQTT -->
              <!--div>
                <span class="mqtt-status" :class="{ 'mqtt-connected': mqttData.connected }">MQTT ●</span>
                <div class="debug-info">
                  <small>{{ getDebugInfo() }}</small>
                </div>
              </div-->
            <RouterLink to="/" class="tile" role="menuitem" @click="menuOpen=false">
              <svg viewBox="0 0 24 24" class="tile-ico" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" fill="currentColor"/>
              </svg>
              <span class="tile-label">Accueil</span>
            </RouterLink>

            <RouterLink to="/meteo" class="tile" role="menuitem" @click="menuOpen=false">
              <svg viewBox="0 0 24 24" class="tile-ico" aria-hidden="true">
                <path d="M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z" fill="currentColor"/>
              </svg>
              <span class="tile-label">Météo</span>
            </RouterLink>

            <RouterLink to="/media" class="tile" role="menuitem" @click="menuOpen=false">
              <svg viewBox="0 0 24 24" class="tile-ico" aria-hidden="true">
                <path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="6" cy="18" r="3" fill="currentColor"/>
                <circle cx="20" cy="16" r="3" fill="currentColor"/>
              </svg>
              <span class="tile-label">Média</span>
            </RouterLink>

            <RouterLink to="/phone" class="tile" role="menuitem" @click="menuOpen=false">
              <svg viewBox="0 0 24 24" class="tile-ico" aria-hidden="true">
                <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 15.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="currentColor"/>
              </svg>
              <span class="tile-label">Téléphone</span>
            </RouterLink>

            <!-- Tuile Timer -->
            <RouterLink to="/timer" class="tile" role="menuitem" @click="menuOpen=false">
              <svg viewBox="0 0 24 24" class="tile-ico" aria-hidden="true">
                <path d="M9 2h6M12 8v5l3 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                <circle cx="12" cy="14" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              <span class="tile-label">Timer</span>
            </RouterLink>
            
            <!-- 🖨️ NOUVELLE TUILE IMPRIMANTE -->
            <RouterLink to="/printer" class="tile" role="menuitem" @click="menuOpen=false">
              <svg viewBox="0 0 24 24" class="tile-ico" aria-hidden="true">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8Z" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              <span class="tile-label">Imprimante</span>
            </RouterLink>
          </div>
          <button class="close-btn" @click="menuOpen=false" aria-label="Fermer le menu">✕</button>
        </div>
      </transition>
    </div>
    <TimerModal />
  </div> 
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { mqttService, mqttData, phoneData, type PhoneNotification } from './services/mqttService'
import { youtubeMusicService, youtubeMusicData } from './services/youtubeMusicService'
import TimerModal from './components/TimerModal.vue'
import timer from './services/timerService'

//NAVIGATION DOUBLE TAP
import { useRouter, useRoute } from 'vue-router'
/* Double-tap navigation on top bar */
const topnavRef = ref<HTMLElement | null>(null)
const router = useRouter()
const route  = useRoute()
// 🖨️ ORDRE MODIFIÉ avec /printer
const ORDER = ['/timer', '/meteo', '/', '/media', '/phone', '/printer'] as const
type RoutePath = typeof ORDER[number]

function goRelative(dir: 'left'|'right') {
  const cur = route.path as RoutePath
  let idx = ORDER.indexOf(cur as RoutePath); if (idx === -1) idx = 0
  idx = dir === 'right' ? idx + 1 : idx - 1
  if (idx < 0) idx = ORDER.length - 1
  if (idx >= ORDER.length) idx = 0
  router.push(ORDER[idx])
}

let lastTapTime = 0
let lastSide: 'left'|'right' | null = null
const DOUBLE_TAP_MS = 320
const EDGE_RATIO = 0.25  // 25% gauche/droite

function onTopnavPointerUp(e: PointerEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.menu-btn') || target.closest('a,button,[role="button"]')) return
  const el = topnavRef.value; if (!el) return
  const r = el.getBoundingClientRect()
  const x = e.clientX - r.left
  const side = x < r.width * EDGE_RATIO ? 'left' : (x > r.width * (1-EDGE_RATIO) ? 'right' : null)
  if (!side) return
  const now = performance.now()
  if (side === lastSide && (now - lastTapTime) <= DOUBLE_TAP_MS) {
    goRelative(side)
    lastTapTime = 0; lastSide = null
  } else {
    lastTapTime = now; lastSide = side
    setTimeout(() => { if (performance.now() - lastTapTime > DOUBLE_TAP_MS) lastSide = null }, DOUBLE_TAP_MS + 20)
  }
}

const menuOpen = ref(false)
const hoursMinutes = ref('')
const seconds = ref('00')
const dateStr = ref('')
let tick: number | undefined

const infoIndex = ref(0)
const batteryIndex = ref(0)

// Données réelles téléphone + factice manette
const gamepadBattery = ref(42)    // Valeur factice

// Notifications téléphone (même logique que PhoneView)
const notifications = computed<PhoneNotification[]>(() => {
  const arr = Array.isArray(phoneData.details) ? phoneData.details : []
  return arr.slice().sort((a, b) => {
    const ai = Number.parseInt(a.id, 10), bi = Number.parseInt(b.id, 10)
    if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai
    return (a.app || '').localeCompare(b.app || '') || (a.title || '').localeCompare(b.title || '')
  })
})
const notificationTotal = computed(() => notifications.value.length)

// Rotation des batteries (téléphone + souris) puis (casque + manette)
const currentBatteries = computed(() => {
  if (batteryIndex.value % 2 === 0) {
    return {
      first: { type: 'phone', value: phoneData.battery },
      second: { type: 'mouse', value: mqttData.mouseBattery }
    }
  } else {
    return {
      first: { type: 'headset', value: mqttData.headsetBattery },
      second: { type: 'gamepad', value: gamepadBattery.value }
    }
  }
})

// 🖨️ MODIFIÉ: Info rotative avec imprimante
const infoRotate: Array<() => string | null> = [
  () => dateStr.value,
  () => {
    const total = notificationTotal.value
    if (!mqttData.connected || total <= 0) return null
    return `📱 ${total} notif${total > 1 ? 's' : ''}`
  },
  // 🖨️ NOUVEAU: Affichage imprimante dans rotation
  () => mqttService.getPrinterDisplay()
]

// Filtrer les éléments null et obtenir les infos valides
const getValidInfos = () => {
  return infoRotate.map(fn => fn()).filter(info => info !== null) as string[]
}

let rotTimer: number | undefined
let batteryTimer: number | undefined

const centerText = computed(() => {
  const validInfos = getValidInfos()
  if (validInfos.length === 0) return dateStr.value // Fallback sur la date
  
  return validInfos[infoIndex.value % validInfos.length]
})

const centerKey = computed(() => `rot-${infoIndex.value}`)

// Vérifier si l'info actuelle est le timer et s'il est urgent
const isTimerUrgent = computed(() => {
  const validInfos = getValidInfos()
  if (validInfos.length === 0) return false
  
  const currentInfo = validInfos[infoIndex.value % validInfos.length]
  return timer.active.value && timer.last10s.value && currentInfo?.includes('Timer')
})

// Debug temporaire
function getDebugInfo(): string {
  const diagMqtt = mqttService.getDiagnostics()
  const printerStatus = diagMqtt.printer.connected ? '🖨️✅' : '🖨️❌'
  const phoneStatus = diagMqtt.phone.battery > 0 ? '📱✅' : '📱❌'
  return `${printerStatus} ${phoneStatus} | Timer: ${timer.showModal.value ? 'MODAL' : timer.active.value ? 'ACTIF' : 'OFF'}`
}

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}` }
function formatDate(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(d)
}

onMounted(() => {
  // 🖨️ MODIFIÉ: Connexion MQTT avec service imprimante intégré
  mqttService.connect()
  
  const offsetMs = 7000
  const renderTime = () => {
    const now = new Date(Date.now() + offsetMs)
    hoursMinutes.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
    seconds.value = pad2(now.getSeconds())
    dateStr.value = formatDate(now)
  }
  renderTime()
  tick = window.setInterval(renderTime, 250)

  let offsetInfos = 0
  rotTimer = window.setInterval(() => {
    // ROTATION CONTINUE info centrale
    infoIndex.value++      
  }, 6000)

  // Rotation des batteries toutes les 10 secondes
  batteryTimer = window.setInterval(() => {
    batteryIndex.value++
  }, 10000)

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') menuOpen.value = false }
  window.addEventListener('keydown', onKey)
  onUnmounted(() => window.removeEventListener('keydown', onKey))
})

onUnmounted(() => {
  if (tick) clearInterval(tick)
  if (rotTimer) clearInterval(rotTimer)
  if (batteryTimer) clearInterval(batteryTimer)
  mqttService.disconnect()
})
</script>

<style scoped>
.app-shell{ 
  min-height:100vh; 
  background:var(--bg); 
  display:flex; 
  justify-content:center; 
  padding-right:2rem;
}

.app-wrap{ width:100vw; 
  margin-inline:auto; 
  max-width: 100%;
}

.topnav{
  display:grid; grid-template-columns: 22.5% 22.5% auto 8%; align-items:center;
  column-gap:12px; 
  background: linear-gradient(135deg, #202020 0%, #252525 100%); 
  padding:12px 14px; border-radius:12px;
  box-shadow:0 6px 14px rgba(0,0,0,.35);
  touch-action: manipulation; 
}

.clock .time{
  font-size: 1.9rem; font-weight:700; font-variant-numeric: tabular-nums; line-height:1;
}
.clock .time .sec{ font-size:.9rem; opacity:.9; vertical-align:super; margin-left:2px; }

.center-info{ display:flex; justify-content:center; min-height:1.9rem; margin:auto;}
.info-line{
  max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  color: var(--muted); opacity:.95;
  font-size:1.05rem;
  display: flex; align-items: center; gap: 8px;
  transition: color 0.3s ease;
}

.timer-urgent {
  color: #ef4444 !important;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.95; }
  50% { opacity: 0.7; }
}

.info-status {
  display: grid;
  grid-template-columns: 40% 60%;
  align-items: center;
  justify-items: center;
  color: white;
  font-size: .75rem;
}

.info-timer svg {
  width: 15px !important;
  height: 15px !important;
}

.info-timer {
  display: flex;
  align-items: center;
  gap: .1rem;
}

/* Styles pour les batteries tournantes */
.info-batteries {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  align-items: center;
  justify-items: center;
}

.battery-item {
  display: flex;
  align-items: center;
  gap: .1rem;
}

.battery-item svg {
  width: 15px !important;
  height: 15px !important;
  fill: #197a4d;
}

.mqtt-status {
  font-size: 0.7rem;
  margin-left: 4px;
  color: #ef4444;
}

.mqtt-connected {
  color: #22c55e !important;
}

.menu-btn{ display:grid; place-items:end; background:transparent; border:none; color:var(--ink); padding:6px; border-radius:8px; cursor:pointer; }
.menu-btn .ico{ width:26px; height:26px; }
.menu-btn:active{ transform:scale(.98); }

.menu-overlay{
  position: fixed; inset:0; z-index:40;
  background: rgba(12,13,15,.96);
  display:flex; flex-direction:column; justify-content:center; align-items:center; padding:12px;padding-right: 2.25rem;
}
.menu-grid{
  display:grid; grid-template-columns: repeat(3, minmax(110px,1fr));
  gap:12px; width:100%; 
}
.tile{
  text-decoration:none; color:var(--ink);
  background:var(--card); border-radius:14px;
  box-shadow:0 10px 22px rgba(0,0,0,.35);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:14px 10px;
}
.tile-ico{ width:34px; height:34px; fill:currentColor; margin-bottom:8px; }
.tile-label{ font-weight:700; font-size:1rem; }
.close-btn{
  margin-top:14px; background:transparent; border:1px solid rgba(255,255,255,.15);
  color:var(--ink); border-radius:10px; padding:8px 12px; cursor:pointer;
}

.fade-enter-active,.fade-leave-active{ transition:opacity .22s ease; }
.fade-enter-from,.fade-leave-to{ opacity:0; }

.slide-fade-enter-active,.slide-fade-leave-active{ transition: opacity .22s ease, transform .22s ease; }
.slide-fade-enter-from{ opacity:0; transform:translateY(6px); }
.slide-fade-leave-to{ opacity:0; transform:translateY(-6px); }

@media (max-height:520px){
  .topnav{ padding:10px 12px; }
  .clock .time{ font-size:1.7rem; }
  .center-info .info-line{ font-size:1rem; }
  .menu-btn .ico{ width:24px; height:24px; }
}
</style>