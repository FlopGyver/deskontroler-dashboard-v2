<template>
  <section class="page">
    <main class="content">
      <!-- T U I L E S  P R I N C I P A L E S -->
      <div class="tiles-grid">
        <!-- TUILE MÉTÉO (clickable) -->
        <RouterLink to="/meteo" class="tile weather-tile">
          <div class="tile-header">
            <h2 class="tile-title">{{ weatherData.city }}</h2>
            <span class="weather-desc">{{ weatherData.description }}</span>
          </div>
          
          <div class="weather-main">
            <div class="weather-icon">
              <span class="weather-emoji">{{ getWeatherEmoji(weatherData.iconCode) }}</span>
            </div>
            <div class="temperature">
              <span class="temp-main">{{ weatherData.temperature }}°</span>
              <span class="temp-range">{{ weatherData.tempMin }}° / {{ weatherData.tempMax }}°</span>
            </div>
          </div>
          
          <div class="weather-footer">
            <span class="connection-status" :class="{ connected: weatherData.connected }">
              {{ weatherData.connected ? '●' : '○' }}
            </span>
            <span class="update-time">{{ formatLastUpdate(weatherData.lastUpdate) }}</span>
          </div>
        </RouterLink>

        <!-- TUILE MÉDIA YOUTUBE MUSIC -->
        <RouterLink to="/media" class="tile media-tile" :class="{ 'media-connected': youtubeMusicData.connected, 'has-art': !!youtubeMusicData.artwork }" :style="ytmBgStyle">
          <div class="backdrop">
            <div class="tile-header">
              <h2 class="tile-title"><img src="../assets/images/Youtube_Music_icon.svg" alt="ytm-logo" style="width: 20px; align-items: center;vertical-align: middle;"> YouTube Music</h2>
              <span class="media-status connection-indicator" :class="{ connected: youtubeMusicData.connected }">
                {{ youtubeMusicData.connected ? '●' : '○' }} {{ getMediaStatus() }}
                </span>
            </div>
                
            <div class="media-main">
              <div class="media-icon">
                <img v-if="youtubeMusicData.artwork" :src="youtubeMusicData.artwork" alt="Album art" class="album-art">
                <div v-else class="album-art placeholder" aria-label="Aucune pochette">
                  <svg viewBox="0 0 24 24" class="placeholder-svg" aria-hidden="true">
                    <path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2"/>
                    <circle cx="7" cy="18" r="3" fill="currentColor"/>
                    <circle cx="18" cy="17" r="3" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              <div class="media-info">
                <div class="media-title">{{ youtubeMusicData.title || 'Aucune lecture' }}</div>
                <div class="media-artist">{{ youtubeMusicData.artist || '' }}</div>
              </div>
            </div>
            
            <div class="media-controls">
              <button class="control-btn" @click.prevent="previousTrack" :disabled="!youtubeMusicData.connected">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z" fill="currentColor"/>
                </svg>
              </button>
              <button class="control-btn play-btn" @click.prevent="togglePlay" :disabled="!youtubeMusicData.connected">
                <svg v-if="!youtubeMusicData.isPlaying" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" fill="currentColor"/>
                </svg>
                <svg v-else viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor"/>
                </svg>
              </button>
              <button class="control-btn" @click.prevent="nextTrack" :disabled="!youtubeMusicData.connected">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6v12h-2V6h2zM6 18l8.5-6L6 6v12z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
          <!-- Bouton d'ouverture si déconnecté 
          <div v-if="!youtubeMusicData.connected" class="media-footer">
            <button class="open-ytm-btn" @click.prevent="openYouTubeMusic">
              Ouvrir YouTube Music
            </button>
          </div>-->
                    
        </RouterLink>
      </div>

      <!-- I N F O S  (ContentService: hydratation/météo/news) -->
      <div class="card info" @click="handleInfoClick" :class="{ clickable: currentContent?.url || currentContent?.type === 'hydration' }">
        <transition name="slide-fade" mode="out-in">
          <div :key="infoKey" class="row">
            <template v-if="currentContent">
              <!-- Icône selon le type -->
              <svg v-if="currentContent.type === 'hydration'" viewBox="0 0 24 24" class="ico hydration" aria-hidden="true">
                <path d="M12 3c3 4 7 8 7 11a7 7 0 1 1-14 0c0-3 4-7 7-11Z"/>
              </svg>
              <svg v-else-if="currentContent.type === 'weather'" viewBox="0 0 24 24" class="ico weather" aria-hidden="true">
                <path d="M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z"/>
              </svg>
              <svg v-else-if="currentContent.type === 'news'" viewBox="0 0 24 24" class="ico news" aria-hidden="true">
                <path d="M4 5h16a1 1 0 0 1 1 1v12H3V6a1 1 0 0 1 1-1Zm1 3h7v8H5V8Zm9 0h5v2h-5V8Zm0 4h5v2h-5v-2Z"/>
              </svg>
              
              <div class="text">
                <div class="title">{{ currentContent.title }}</div>
                <div class="sub">{{ currentContent.subtitle }}</div>
              </div>
              
              <!-- Bouton action selon le type -->
              <button v-if="currentContent.type === 'hydration'" class="cta hydrate">C'est fait</button>
              <div v-else-if="currentContent.url" class="cta-icon">
                <svg viewBox="0 0 24 24" class="link-icon">
                  <path d="M10 6H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4v2a1 1 0 0 0 1.6.8l4-3a1 1 0 0 0 0-1.6l-4-3A1 1 0 0 0 10 8V6Z" fill="currentColor"/>
                </svg>
              </div>
              
            </template>
            
            <!-- Fallback si pas de contenu -->
            <template v-else>
              <svg viewBox="0 0 24 24" class="ico" aria-hidden="true">
                <path d="M12 2a7 7 0 0 1 5 11.9V17a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-3.1A7 7 0 0 1 12 2Z"/>
              </svg>
              <div class="text">
                <div class="title">Dashboard</div>
                <div class="sub">Chargement du contenu...</div>
              </div>
            </template>
          </div>
        </transition>
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { weatherService, weatherData, getWeatherIcon } from '../services/weatherService'
import { youtubeMusicService, youtubeMusicData } from '../services/youtubeMusicService'
import { contentService, contentData, type ContentItem } from '../services/contentService'

// ✅ FONCTION EMOJI MÉTÉO (même que MeteoView)
function getWeatherEmoji(iconCode: string): string {
  const emojiMap: { [key: string]: string } = {
    // Soleil
    '01d': '☀️',
    '01n': '🌙',
    
    // Nuages
    '02d': '⛅',
    '02n': '☁️',
    '03d': '☁️',
    '03n': '☁️',
    '04d': '☁️',
    '04n': '☁️',
    
    // Pluie
    '09d': '🌧️',
    '09n': '🌧️',
    '10d': '🌦️',
    '10n': '🌧️',
    
    // Orage
    '11d': '⛈️',
    '11n': '⛈️',
    
    // Neige
    '13d': '🌨️',
    '13n': '🌨️',
    
    // Brouillard
    '50d': '🌫️',
    '50n': '🌫️',
  }
  
  return emojiMap[iconCode] || '☀️' // Fallback soleil
}

/* Content Service Integration */
const currentContentIndex = ref(0)
const currentContent = computed(() => {
  const rotation = contentService.getContentRotation()
  if (rotation.length === 0) return null
  return rotation[currentContentIndex.value % rotation.length]
})

const hasHydration = computed(() => {
  return contentService.hasUnacknowledgedHydration()
})

const infoKey = computed(() => {
  if (!currentContent.value) return 'empty'
  return `${currentContent.value.type}-${currentContent.value.id}`
})

// Action clic sur la carte info
async function handleInfoClick() {
  const content = currentContent.value
  if (!content) return
  
  // Si hydratation → confirmer ET relancer rotation
  if (content.type === 'hydration') {
    console.log('💧 Validation hydratation par utilisateur')
    contentService.ackHydration()
    
    // Attendre le refresh du contenu puis relancer la rotation
    setTimeout(() => {
      console.log('🔄 Relance rotation après validation hydratation')
      startRotation()
    }, 500)
    
    return
  }
  
  // Si news avec URL → ouvrir sur PC
  if (content.type === 'news' && content.url) {
    try {
      console.log(`🔗 Ouverture article: ${content.title}`)
      const success = await contentService.openContentOnPC(content.url)
      if (success) {
        console.log('✅ Article ouvert sur PC')
      } else {
        console.error('❌ Erreur ouverture article')
      }
    } catch (error) {
      console.error('❌ Erreur clic article:', error)
    }
  }
}

let rotateTimer: number | undefined

// Rotation intelligente - MODIFIÉE pour gérer hydratation persistante
function startRotation() { 
  stopRotation()
  
  // Si hydratation en cours → PAS DE ROTATION
  if (hasHydration.value) {
    console.log('💧 Hydratation en cours → Rotation suspendue')
    return
  }
  
  rotateTimer = window.setInterval(() => {
    // Re-vérifier si hydratation en cours à chaque tick
    if (hasHydration.value) {
      console.log('💧 Hydratation détectée → Arrêt rotation')
      stopRotation()
      currentContentIndex.value = 0 // Remettre à 0 pour afficher l'hydratation
      return
    }
    
    const rotation = contentService.getContentRotation()
    if (rotation.length > 0) {
      currentContentIndex.value = (currentContentIndex.value + 1) % rotation.length
    }
  }, 7000) 
  
  console.log('🔄 Rotation normale démarrée (7s/item)')
}

function stopRotation() { 
  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = undefined
    console.log('⏹️ Rotation arrêtée')
  }
}

// Watcher sur l'état d'hydratation pour gérer la rotation
watch(hasHydration, (newHasHydration, oldHasHydration) => {
  console.log(`💧 Changement état hydratation: ${oldHasHydration} → ${newHasHydration}`)
  
  if (newHasHydration) {
    // Hydratation détectée → arrêter rotation et afficher hydratation
    console.log('💧 Hydratation détectée → Suspension rotation')
    stopRotation()
    currentContentIndex.value = 0 // S'assurer d'afficher le premier item (hydratation)
  } else {
    // Plus d'hydratation → relancer rotation
    console.log('✅ Hydratation validée → Reprise rotation')
    startRotation()
  }
}, { immediate: true })

// Watch sur les changements de contenu pour debug
watch(() => contentData.items, (newItems) => {
  const hydrationCount = newItems.filter(i => i.type === 'hydration').length
  const totalCount = newItems.length
  console.log(`📊 Contenu mis à jour: ${totalCount} items (${hydrationCount} hydratation)`)
  
  // Si changement de contenu et pas d'hydratation → s'assurer que rotation tourne
  if (hydrationCount === 0 && !rotateTimer) {
    console.log('🔄 Aucune hydratation → Démarrage rotation')
    startRotation()
  }
}, { deep: true })

/* Contrôles média YouTube Music */
async function togglePlay() {
  console.log('🎵 Dashboard -> Toggle Play/Pause')
  const success = await youtubeMusicService.togglePlay()
  if (success) {
    console.log('✅ Toggle play/pause envoyé')
  } else {
    console.error('❌ Erreur toggle play/pause')
  }
}

async function previousTrack() {
  console.log('🎵 Dashboard -> Previous Track')
  const success = await youtubeMusicService.previousTrack()
  if (success) {
    console.log('✅ Previous track envoyé')
  } else {
    console.error('❌ Erreur previous track')
  }
}

async function nextTrack() {
  console.log('🎵 Dashboard -> Next Track')
  const success = await youtubeMusicService.nextTrack()
  if (success) {
    console.log('✅ Next track envoyé')
  } else {
    console.error('❌ Erreur next track')
  }
}

async function openYouTubeMusic() {
  console.log('🎵 Dashboard -> Ouvrir YouTube Music')
  const success = await youtubeMusicService.openYouTubeMusic()
  if (success) {
    console.log('✅ YouTube Music ouvert')
  }
}

function getMediaStatus(): string {
  return youtubeMusicService.getStatus()
}

/* Helper pour formater l'heure de mise à jour */
function formatLastUpdate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  
  if (diffMinutes < 1) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes}min`
  
  const diffHours = Math.floor(diffMinutes / 60)
  return `Il y a ${diffHours}h`
}

onMounted(async () => {
  console.log('🏠 HomeView -> Démarrage services...')
  
  // Démarrer le service météo
  weatherService.startAutoUpdate(10)
  
  // Démarrer YouTube Music
  const ytmStarted = await youtubeMusicService.startMonitoring()
  console.log('🎵 YouTube Music Service démarré:', ytmStarted)
  
  // 🆕 DÉMARRER CONTENT SERVICE
  await contentService.startService()
  
  // Rotation du contenu
  startRotation()
  
  // Debug diagnostics
  setTimeout(() => {
    console.log('🔍 Diagnostics YouTube Music:', youtubeMusicService.getDiagnostics())
    console.log('📰 Contenu disponible:', contentData.items.length, 'éléments')
  }, 2000)
})

onUnmounted(() => { 
  console.log('🛑 HomeView -> Arrêt services...')
  
  stopRotation()
  weatherService.stopAutoUpdate()
  youtubeMusicService.stopMonitoring()
  
  // 🆕 ARRÊTER CONTENT SERVICE
  contentService.stopService()
})

//Background image ART tuile YTM
const ytmBgStyle = computed(() => {
  const art = youtubeMusicData.artwork
  if (!art) return {}
  // gradient semi-transparent AU-DESSUS de l'image
  return {
    backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.45), rgba(0,0,0,0.25)), url('${art}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
    // tu peux ajouter: backgroundBlendMode: 'overlay'
  }
})

</script>

<style scoped>
.page{ min-height:100vh; background:var(--bg); color:var(--ink); display:flex; flex-direction:column; }
.page > .content{ width:100%; }
.content{ padding:.25rem 0; display:flex; flex-direction:column; }

/* Grid des tuiles principales */
.tiles-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); 
  gap: .25rem;
  margin-bottom: .25rem;
}

/* Tuiles de base */
.tile {
  background: var(--card);
  border-radius: 10px;
  padding: .5rem;
  box-shadow: 0 4px 10px rgba(0,0,0,.3);
  text-decoration: none;
  color: inherit;
  transition: transform .2s ease, box-shadow .2s ease;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  position: relative;
  height: 100% !important;
}

.tile:active {
  transform: translateY(0);
}

.tile-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.25rem;
}

.tile-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  color: var(--muted);
  margin: auto;
}

/* TUILE MÉTÉO */
.weather-tile {
  background: linear-gradient(-45deg, #14291b 0%, #05835d 50%, #09da9b 100%);
  color: var(--muted) ;
  width: 100%;
  height: 100%;
  background-size: 400% 400%;
	animation: gradient 15s ease infinite;
}

@keyframes gradient {
	0% {
		background-position: 0% 50%;
	}
	50% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0% 50%;
	}
}
.weather-desc {
  font-size: 0.8rem;
  opacity: 0.8;
  text-transform: capitalize;
  margin: auto;
}

.weather-main {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex: 1;
  margin:auto;
}

.weather-icon {
  flex-shrink: 0;
}

.weather-emoji {
  font-size: 3rem;
  line-height: 1;
}

.temperature {
  display: flex;
  flex-direction: column;
}

.temp-main {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.temp-range {
  font-size: .75rem;
  opacity: 0.8;
}

.weather-footer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.7rem;
  opacity: 0.8;
  margin: .25rem auto 0;
}

.connection-status {
  color: #ff6b6b;
}

.connection-status.connected {
  color: #51cf66;
}

/* TUILE MÉDIA YOUTUBE MUSIC */
.media-tile, .media-connected {
  background: linear-gradient(-45deg, #852727 0%, #b85c11 50%, #d8a34c 100%);
  color: white;
  width: 100%;
  height: 100%;
  background-size: 400% 400%;
	animation: gradient 15s ease infinite;
}

/* quand on a une pochette en bg: on s'appuie sur le style inline, on coupe l'anim */
.media-tile.has-art {
  animation: none;          /* évite conflit avec background-image */
  background-size: cover;   /* au cas où */
}

.backdrop {
  backdrop-filter: blur(4px);
  border-radius: 10px;
  padding: .25rem;
  box-shadow: #252525 0px 0px 10px;
  background-color: #20202059;
  text-shadow: 0 1px 2px rgba(0,0,0,.35);
}

.media-status {
  font-size: 0.8rem;
  opacity: 0.9;
  margin: auto;
}

.media-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-height: 64px;
}

.media-icon {
  flex-shrink: 0;
}

.album-art {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
}

.media-svg {
  width: 32px;
  height: 32px;
  color: rgba(255,255,255,0.9);
}

.media-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.media-title {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: normal;
  display: -webkit-box;   /* max 2 lignes */
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: 1.25rem;
}

.media-artist {
  font-size: 0.75rem;
  opacity: 0.8;
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;  
  max-height: 1.25rem;
}

.media-controls {
  display: flex;
  gap: 1rem;
  margin-top: 0.15rem;
  justify-content: center;
}

.control-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background .2s ease;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn svg {
  width: 16px;
  height: 16px;
}

.play-btn {
  background: rgba(255,255,255,0.3);
}

.media-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
}

.open-ytm-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 12px;
  padding: 4px 8px;
  color: white;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background .2s ease;
}

.open-ytm-btn:hover {
  background: rgba(255,255,255,0.3);
}

.debug-info {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 8px;
  opacity: 0.6;
}

.connection-indicator {
  
  font-size: 0.7rem;
  color: #a50000;
}

.connection-indicator.connected {
  color: #51cf66;
}

/* CARTE INFO (existante) */
.card{ 
  background: linear-gradient(135deg, #202020 0%, #252525 100%);
  border-radius:10px; 
  padding:.5rem 1rem; 
  box-shadow:0 4px 10px rgba(0,0,0,.3); 
  width:100%; 
}

.info{ height:4.25rem; display:flex; align-items:center; }
.info .row{ width:100%; display:flex; align-items:center; gap:8px; }
.ico{ width:18px; height:18px; color:var(--emerald); fill:currentColor; }
.info .title{ font-weight:700; }
.info .sub{
  color:var(--muted);
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
  line-clamp:2;
  overflow:hidden;
  font-size:.85rem;
}
.info .cta{ margin-left:auto; background:var(--emerald); color:#06281f; border:none; border-radius:6px; padding:6px 8px; font-weight:700; font-size:.8rem; }

/* Transitions */
.slide-fade-enter-active, .slide-fade-leave-active{ transition: opacity .24s ease, transform .24s ease; }
.slide-fade-enter-from{ opacity:0; transform: translateY(6px); }
.slide-fade-leave-to  { opacity:0; transform: translateY(-6px); }

/* Responsive */
@media (max-width: 400px) {
  .tiles-grid {
    grid-template-columns: 1fr;
  }
  
  .tile {
    min-height: 100px;
  }
  
  .weather-main, .media-main {
    gap: 0.5rem;
  }
  
  .temp-main {
    font-size: 1.5rem;
  }
}

/* Ajouter à la fin de <style scoped> : */

/* CARTE INFO (nouveau système ContentService) */
.card.clickable {
  cursor: pointer;
}

.card.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,0,0,.4);
}

.card.clickable:active {
  transform: translateY(0);
}

/* Icônes colorées par type */
.ico.hydration { color: #06b6d4; }  /* Cyan pour l'eau */
.ico.weather { color: #10b981; }    /* Vert pour météo */
.ico.news { color: #f59e0b; }       /* Orange pour news */

/* Boutons d'action */
.info .cta:hover {
  transform: scale(1.05);
  background: #16a34a;
}

.info .cta.hydrate {
  background: --emrald;
  color: white;
}

.info .cta.hydrate:hover {
  background: #0891b2;
}

/* Icône de lien pour les news */
.cta-icon {
  margin-left: auto;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.clickable:hover .cta-icon {
  opacity: 1;
}

.link-icon {
  width: 16px;
  height: 16px;
  color: var(--emerald);
}
</style>