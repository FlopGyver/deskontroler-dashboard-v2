// src/services/timerService.ts
import { ref, computed } from 'vue'

type Snapshot = {
  label: string
  endAt: number | null
  remainingStatic: number   // ms restant quand en pause
  running: boolean
}

const LS_KEY = 'desk_timer_state_v1'

const label = ref('Timer')
const endAt = ref<number | null>(null)
const running = ref(false)
const remainingStatic = ref(0)  // ms restant si pause
const showModal = ref(false)

const now = ref(Date.now())
setInterval(() => {
  now.value = Date.now()
  // Fin du timer ?
  if (running.value && endAt.value !== null && now.value >= endAt.value) {
    running.value = false
    remainingStatic.value = 0
    endAt.value = null
    showModal.value = true
    persist()
  }
}, 200)

function persist() {
  const snap: Snapshot = {
    label: label.value,
    endAt: endAt.value,
    remainingStatic: remainingStatic.value,
    running: running.value,
  }
  localStorage.setItem(LS_KEY, JSON.stringify(snap))
}

function restore() {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw) as Snapshot
    label.value = s.label ?? 'Timer'
    running.value = !!s.running
    remainingStatic.value = Math.max(0, s.remainingStatic ?? 0)
    endAt.value = s.endAt
    
    // IMPORTANT: Ne jamais afficher le modal au démarrage
    // Si le timer était en cours et que le temps est écoulé → le clear
    if (running.value && endAt.value && Date.now() >= endAt.value) {
      running.value = false
      endAt.value = null
      remainingStatic.value = 0
      showModal.value = false  // PAS de modal au démarrage
      persist() // Sauvegarder l'état nettoyé
    }
  } catch (e) {
    // Si erreur de parsing → reset complet
    resetTimer()
  }
}
restore()

export function start(minutes: number, lbl = 'Timer') {
  const ms = Math.max(0, Math.round(minutes * 60_000))
  label.value = lbl
  endAt.value = Date.now() + ms
  remainingStatic.value = 0
  running.value = true
  showModal.value = false
  persist()
}

export function pause() {
  if (!running.value) return
  remainingStatic.value = Math.max(0, (endAt.value ?? Date.now()) - Date.now())
  endAt.value = null
  running.value = false
  persist()
}

export function resume() {
  if (running.value) return
  endAt.value = Date.now() + remainingStatic.value
  running.value = true
  persist()
}

export function extend(minutes = 10) {
  const add = Math.max(0, Math.round(minutes * 60_000))
  if (running.value && endAt.value) {
    // Timer en cours → prolonger
    endAt.value += add
    showModal.value = false  // FERMER LE MODAL
  } else {
    // Timer en pause ou modal affiché → relancer
    endAt.value = Date.now() + (remainingStatic.value || add)
    running.value = true
    showModal.value = false  // FERMER LE MODAL
    remainingStatic.value = 0
  }
  persist()
}

export function clear() {
  running.value = false
  endAt.value = null
  remainingStatic.value = 0
  showModal.value = false
  persist()
}

// Fonction de reset complet (pour debug)
export function resetTimer() {
  localStorage.removeItem(LS_KEY)
  running.value = false
  endAt.value = null
  remainingStatic.value = 0
  showModal.value = false
  label.value = 'Timer'
}

export const remainingMs = computed(() => {
  if (running.value && endAt.value) return Math.max(0, endAt.value - now.value)
  return Math.max(0, remainingStatic.value)
})

export const secondsLeft = computed(() => Math.ceil(remainingMs.value / 1000))
export const last10s = computed(() => running.value && secondsLeft.value <= 10)
export const active = computed(() => running.value || remainingStatic.value > 0)

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
               : `${m}:${String(sec).padStart(2, '0')}`
}
export const clock = computed(() => fmt(remainingMs.value))

export const timer = {
  // state
  label, running, showModal, active, last10s,
  remainingMs, secondsLeft, clock,
  // api
  start, pause, resume, extend, clear, resetTimer,
}
export default timer