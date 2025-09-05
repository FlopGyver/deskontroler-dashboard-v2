<template>
  <teleport to="body">
    <div 
      v-if="showModal" 
      class="timer-overlay" 
      role="dialog" 
      aria-modal="true"
      @click.self="handleClear"
    >
      <div class="modal" @click.stop>
        <div class="title">⏱️ Timer terminé</div>
        <div class="subtitle">{{ timer.label || 'Timer' }}</div>
        <div class="actions">
          <button class="btn extend" @click="handleExtend">+ 10 min</button>
          <button class="btn done"   @click="handleClear">Terminer</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, computed } from 'vue'
import timer from '../services/timerService'

export default defineComponent({
  name: 'TimerModal',
  setup() {
    // Computed pour forcer la réactivité
    const showModal = computed(() => timer.showModal.value)

    // Gestionnaire Escape global
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal.value) {
        handleClear()
      }
    }

    // Fonctions d'action du modal
    const handleExtend = () => {
      timer.extend(10)
    }

    const handleClear = () => {
      timer.clear()
    }

    onMounted(() => {
      document.addEventListener('keydown', handleEscape)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleEscape)
    })

    return {
      timer,
      showModal,
      handleExtend,
      handleClear
    }
  }
})
</script>

<style scoped>
.timer-overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(0,0,0,.75); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 9999; 
  backdrop-filter: blur(4px);
}

.modal{ 
  width: min(92vw, 520px); 
  background: #161616; 
  border: 1px solid #2a2a2a; 
  border-radius: 16px; 
  box-shadow: 0 12px 40px rgba(0,0,0,.6); 
  padding: 1.5rem; 
  text-align: center; 
  animation: modalAppear 0.3s ease-out;
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.title{ 
  font-size: 1.5rem; 
  font-weight: 800; 
  margin-bottom: 0.5rem; 
  color: var(--muted);
}

.subtitle{ 
  color: var(--muted); 
  margin-bottom: 1.5rem; 
  opacity: 0.8;
  font-size: 1.1rem;
}

.actions{ 
  display: flex; 
  gap: 1rem; 
  justify-content: center; 
}

.btn{ 
  border: none; 
  border-radius: 12px; 
  padding: 1rem 1.5rem; 
  font-weight: 700; 
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  min-width: 120px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,.4);
}

.btn:active {
  transform: translateY(0);
}

.extend{ 
  background: #3b82f6; 
  color: white; 
}

.extend:hover {
  background: #2563eb;
}

.done{ 
  background: #ef4444;  
  color: white; 
}

.done:hover {
  background: #dc2626;
}
</style>