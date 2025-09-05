<template>
  <section class="page">
    <main class="content">
      <div class="card timer-card">
        <!-- TITRE AVEC ICÔNE SVG -->
        <div class="timer-header">
          <svg viewBox="0 0 24 24" class="timer-icon">
            <circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M12 9v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M9 2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <h1 class="timer-title">Timer</h1>
        </div>

        <!-- INPUT DURÉE -->
        <div class="duration-input">
          <label>Durée (minutes) :</label>
          <input 
            v-model.number="minutes" 
            type="number" 
            min="1" 
            max="180"
            class="input"
            @keyup.enter="startTimer"
          >
        </div>

        <!-- BOUTONS DE CONTRÔLE -->
        <div class="controls">
          <button @click="adjustTime(-10)" class="btn minus">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
            </svg>
            10
          </button>

          <button @click="adjustTime(-1)" class="btn minus">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
            </svg>
            1
          </button>

          <button @click="handleGo" class="btn go" :disabled="!minutes || minutes <= 0">
            <svg v-if="!timer.active.value" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="btn-icon">
              <path fill="#ffffff" d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="btn-icon">
              <path fill="#ffffff" d="M160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96z"/>
            </svg>
          </button>

          <button @click="adjustTime(1)" class="btn plus">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
            </svg>
            1
          </button>

          <button @click="adjustTime(10)" class="btn plus">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
            </svg>
            10
          </button>
        </div>

        <!-- AFFICHAGE TIMER ACTUEL (si actif) -->
        <div v-if="timer.active.value" class="current-display">
            <div class="timer-status" :class="{ 'running': timer.running.value, 'paused': !timer.running.value }">
              {{ timer.running.value ? 'En cours' : 'En pause' }}
            </div>
          <div class="timer-clock" :class="{ 'urgent': timer.last10s.value }">
            {{ timer.clock.value }}
          </div>
          <button v-if="timer.running.value" @click="timer.pause" class="btn-small pause">
            <svg viewBox="0 0 24 24" class="btn-icon-small">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
            </svg>
            Pause
          </button>
          <button v-else @click="timer.resume" class="btn-small resume">
            <svg viewBox="0 0 24 24" class="btn-icon-small">
              <path d="M8 5v14l11-7z" fill="currentColor"/>
            </svg>
            Reprendre
          </button>
        </div>
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import timer from '../services/timerService'

const minutes = ref(30)

// Synchroniser l'input avec le timer actuel si il y en a un
watch(() => timer.remainingMs.value, () => {
  if (!timer.active.value) {
    minutes.value = 30 // Reset à 25 quand timer terminé
  }
}, { immediate: true })

function adjustTime(delta: number) {
  const newValue = (minutes.value || 0) + delta
  if (newValue >= 1 && newValue <= 180) {
    minutes.value = newValue
  }
}

function handleGo() {
  if (timer.active.value) {
    // Si timer actif → STOP
    timer.clear()
  } else {
    // Si pas de timer → GO
    if (minutes.value && minutes.value > 0) {
      timer.start(minutes.value, 'Timer')
    }
  }
}

function startTimer() {
  if (!timer.active.value && minutes.value && minutes.value > 0) {
    timer.start(minutes.value, 'Timer')
  }
}
</script>

<style scoped>
.page { 
  min-height: 100vh; 
  background: var(--bg); 
  color: var(--ink); 
  
}

.content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: .25rem;
}

.timer-card {
  background: var(--card);
  border-radius: 10px;
  padding: .5rem;
  box-shadow: 0 6px 20px rgba(0,0,0,.4);
  width: 100%;
  max-height: 75vh;
}

/* HEADER */
.timer-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.timer-icon {
  width: 32px;
  height: 32px;
  color: var(--emerald);
}

.timer-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--muted);
  margin: 0;
}

/* INPUT */
.duration-input {
  margin-bottom: .5rem;
  text-align: center;
}

.duration-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--muted);
  font-size: .9rem;
}

.input {
  width: 100%;
  padding: .5rem;
  border-radius: 12px;
  background: #ffffff11;
  border: 0;
  box-shadow: #1a1a1a 0px 2px 8px 2px;
  color: var(--muted);
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.input:focus {
  outline: none;
  border-color: var(--emerald);
  box-shadow: 0 0 0 3px rgba(25, 122, 77, 0.2);
}

/* CONTRÔLES */
.controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: .25rem;
}

.btn {
  padding: .25rem 0.25rem;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 20px;
  height: 20px;
  margin: auto;
}

.btn.minus {
  background: #ffffff11;
  color: white;
  box-shadow: #1a1a1a 2px 2px 8px 2px;
}

.btn.plus {
  background: #ffffff11;
  color: white;
  box-shadow: #1a1a1a -2px -2px 8px 2px;
}

.btn.go {
  background: #ffffff11;
  color: white;
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: #1a1a1a 0px 2px 8px 2px;
}

/* AFFICHAGE TIMER ACTUEL */
.current-display {
  padding-top: .75rem;
  text-align: center;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
}

.timer-clock {
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.timer-clock.urgent {
  color: #ef4444;
  animation: pulse 1s infinite;
}

.timer-status {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.timer-status.running {
  background: #22c55e;
  color: white;
  box-shadow: #1a1a1a 2px 2px 8px 2px;
}

.timer-status.paused {
  background: #f59e0b;
  color: white;
  box-shadow: #1a1a1a -2px -2px 8px 2px;
}

.btn-small {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.btn-icon-small {
  width: 16px;
  height: 16px;
}

.btn-small.pause {
  background: #f59e0b;
  color: white;
}

.btn-small.resume {
  background: #22c55e;
  color: white;
}

.btn-small:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,.2);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* RESPONSIVE */
@media (max-width: 400px) {
  .timer-card {
    padding: 1.5rem;
  }
  
  .controls {
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.8rem 0.3rem;
    font-size: 0.8rem;
  }
  
  .timer-clock {
    font-size: 2rem;
  }
}
</style>