<template>
  <div class="phone">
    <section v-if="!mqttData.connected" class="placeholder">MQTT déconnecté…</section>
    <section v-else class="panel">
      <!-- Topbar compacte: Batterie à gauche, Notifs à droite, boutons scroll -->
      <div class="topbar">
        <div class="left">
          <span class="batt icon" aria-hidden="true">
            <!-- icône batterie dynamique -->
            <svg v-if="batState==='full'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 192C536.8 192 544 199.2 544 208L544 432C544 440.8 536.8 448 528 448L112 448C103.2 448 96 440.8 96 432L96 208C96 199.2 103.2 192 112 192L528 192zM112 128C67.8 128 32 163.8 32 208L32 432C32 476.2 67.8 512 112 512L528 512C572.2 512 608 476.2 608 432L608 384C625.7 384 640 369.7 640 352L640 288C640 270.3 625.7 256 608 256L608 208C608 163.8 572.2 128 528 128L112 128zM168 240C154.7 240 144 250.7 144 264L144 376C144 389.3 154.7 400 168 400L472 400C485.3 400 496 389.3 496 376L496 264C496 250.7 485.3 240 472 240L168 240z"/></svg>
            <svg v-else-if="batState==='three'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 192C536.8 192 544 199.2 544 208L544 432C544 440.8 536.8 448 528 448L112 448C103.2 448 96 440.8 96 432L96 208C96 199.2 103.2 192 112 192L528 192zM112 128C67.8 128 32 163.8 32 208L32 432C32 476.2 67.8 512 112 512L528 512C572.2 512 608 476.2 608 432L608 384C625.7 384 640 369.7 640 352L640 288C640 270.3 625.7 256 608 256L608 208C608 163.8 572.2 128 528 128L112 128zM168 240C154.7 240 144 250.7 144 264L144 376C144 389.3 154.7 400 168 400L392 400C405.3 400 416 389.3 416 376L416 264C416 250.7 405.3 240 392 240L168 240z"/></svg>
            <svg v-else-if="batState==='half'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 192C536.8 192 544 199.2 544 208L544 432C544 440.8 536.8 448 528 448L112 448C103.2 448 96 440.8 96 432L96 208C96 199.2 103.2 192 112 192L528 192zM112 128C67.8 128 32 163.8 32 208L32 432C32 476.2 67.8 512 112 512L528 512C572.2 512 608 476.2 608 432L608 384C625.7 384 640 369.7 640 352L640 288C640 270.3 625.7 256 608 256L608 208C608 163.8 572.2 128 528 128L112 128zM168 240C154.7 240 144 250.7 144 264L144 376C144 389.3 154.7 400 168 400L312 400C325.3 400 336 389.3 336 376L336 264C336 250.7 325.3 240 312 240L168 240z"/></svg>
            <svg v-else-if="batState==='quarter'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 192C536.8 192 544 199.2 544 208L544 432C544 440.8 536.8 448 528 448L112 448C103.2 448 96 440.8 96 432L96 208C96 199.2 103.2 192 112 192L528 192zM112 128C67.8 128 32 163.8 32 208L32 432C32 476.2 67.8 512 112 512L528 512C572.2 512 608 476.2 608 432L608 384C625.7 384 640 369.7 640 352L640 288C640 270.3 625.7 256 608 256L608 208C608 163.8 572.2 128 528 128L112 128zM168 240C154.7 240 144 250.7 144 264L144 376C144 389.3 154.7 400 168 400L232 400C245.3 400 256 389.3 256 376L256 264C256 250.7 245.3 240 232 240L168 240z"/></svg>
            <svg v-else-if="batState==='low'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M112 224C103.2 224 96 231.2 96 240L96 464C96 472.8 103.2 480 112 480L528 480C536.8 480 544 472.8 544 464L544 240C544 231.2 536.8 224 528 224L112 224zM32 240C32 195.8 67.8 160 112 160L528 160C572.2 160 608 195.8 608 240L608 288C625.7 288 640 302.3 640 320L640 384C640 401.7 625.7 416 608 416L608 464C608 508.2 572.2 544 528 544L112 544C67.8 544 32 508.2 32 464L32 240z"/></svg>
          </span>
          <span class="batt-val">{{ battery >= 0 ? `${battery}%` : '—' }}</span>
        </div>

        <div class="right">
          <span class="bell icon" aria-hidden="true">
            <!-- cloche -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M320 64C302.3 64 288 78.3 288 96L288 99.2C215 114 160 178.6 160 256L160 277.7C160 325.8 143.6 372.5 113.6 410.1L103.8 422.3C98.7 428.6 96 436.4 96 444.5C96 464.1 111.9 480 131.5 480L508.4 480C528 480 543.9 464.1 543.9 444.5C543.9 436.4 541.2 428.6 536.1 422.3L526.3 410.1C496.4 372.5 480 325.8 480 277.7L480 256C480 178.6 425 114 352 99.2L352 96C352 78.3 337.7 64 320 64zM258 528C265.1 555.6 290.2 576 320 576C349.8 576 374.9 555.6 382 528L258 528z"/></svg>
          </span>
          <span class="notif-val">{{ total }}</span>

          <div class="spacer"></div>

          <!-- boutons scroll -->
          <button class="scroll-btn" @click="scrollByStep('up')" title="haut" aria-label="haut">
            <svg viewBox="0 0 24 24">
                <path d="M7 14l5-5 5 5z" fill="currentColor"/>
              </svg>
          </button>
          <button class="scroll-btn" @click="scrollByStep('down')" title="bas" aria-label="bas">
           <svg viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z" fill="currentColor"/>
              </svg>
          </button>
        </div>
      </div>

      <!-- Liste à hauteur fixe -->
      <ul ref="listRef" class="list">
        <li v-for="n in notifications" :key="n.id + '_' + n.app" class="item">
          <div class="app">{{ stripZWS(n.app) }}</div>
          <div class="title">{{ stripZWS(n.title) || '(sans titre)' }}</div>
          <div v-if="removeTitleFromText(n.title, n.text)" class="text">
            {{ removeTitleFromText(n.title, n.text) }}
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { phoneData, mqttData, type PhoneNotification } from '../services/mqttService'

// ——— utils nettoyage ———
function stripZWS(s = '') {
  return s
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\s+\n\s+/g, '\n')
    .replace(/\uFFFD/g, '')
    .trim()
}
function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function removeTitleFromText(title = '', text = '') {
  const t = stripZWS(title); let x = stripZWS(text)
  if (!t || !x) return x
  const re = new RegExp(`^\\s*${escapeRegExp(t)}\\s*[:\\-–—•]?\\s*`, 'i')
  return x.replace(re, '').trim()
}

// ——— entête ———
const battery = computed(() => {
  const v = typeof phoneData.battery === 'number' ? phoneData.battery : -1
  return Math.max(-1, Math.min(100, v))
})
const batState = computed<'unknown'|'low'|'quarter'|'half'|'three'|'full'>(() => {
  const b = battery.value
  if (b < 0) return 'unknown'
  if (b < 10) return 'low'
  if (b < 35) return 'quarter'
  if (b < 60) return 'half'
  if (b < 85) return 'three'
  return 'full'
})

// ——— liste notifications ———
const notifications = computed<PhoneNotification[]>(() => {
  const arr = Array.isArray(phoneData.details) ? phoneData.details : []
  return arr.slice().sort((a, b) => {
    const ai = Number.parseInt(a.id, 10), bi = Number.parseInt(b.id, 10)
    if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai
    return (a.app || '').localeCompare(b.app || '') || (a.title || '').localeCompare(b.title || '')
  })
})
const total = computed(() => notifications.value.length)

// ——— scroll contrôlé ———
const listRef = ref<HTMLUListElement | null>(null)
function scrollByStep(dir: 'up'|'down') {
  const el = listRef.value; if (!el) return
  const step = Math.max(160, Math.floor(el.clientHeight * 0.9))
  el.scrollBy({ top: dir === 'up' ? -step : step, behavior: 'smooth' })
}
</script>

<style scoped>
.phone {
  display: grid;
  gap: .25rem;
  padding: .25rem 0;
}

/* panneau principal */
.panel {
  border-radius: 12px;
  background: #202020 100%; 
  overflow: hidden;
}

/* topbar compacte */
.topbar {
  display: grid;
  grid-template-columns: 1fr auto;
  padding: 8px 10px;
  gap: 8px;
  background: rgba(0,0,0,.22);
  border-bottom: 1px solid rgba(255,255,255,.08);
  align-items: center;
}
.left, .right { display: inline-flex; gap: 8px; align-items: center;}
.icon svg { width: 18px; height: 18px; fill: currentColor; opacity: .95; vertical-align: middle; }
.batt-val, .notif-val { font-weight: 600;vertical-align: middle;}
.spacer { width: 8px; }

.scroll-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* liste à hauteur fixe (ajuste la variable si besoin) */
.list {
  --list-h: 420px;
  list-style: none;
  margin: 0; padding: 10px;
  height: var(--list-h);
  overflow: auto;
  display: grid;
  gap: 12px;
  overflow: hidden;
}
.item {
  border-radius: 10px;
  padding: 12px;
  background: rgba(70, 70, 70, 0.18);
}
.app { font-size: 12px; opacity: .8; margin-bottom: 2px; }
.title { font-weight: 600; }
.text { opacity: .9; margin-top: 4px; white-space: pre-wrap; }

/* états placeholders */
.placeholder {
  padding: 24px;
  text-align: center;
  opacity: .8;
  border-radius: 12px;
  border: 1px dashed rgba(255,255,255,.18);
}

/* responsive simple */
@media (max-width: 980px) {
  .list { --list-h: 60vh; }
}
</style>
