<template>
  <section class="media-page">
    <!-- SIDEBAR MODERNE -->
    <nav class="modern-sidebar">
      <div class="nav-buttons">
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'now' }" 
          @click="setTab('now')"
          title="Lecture en cours"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
          </svg>
        </button>
        
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'playlists' }" 
          @click="loadPlaylists()"
          title="Playlists"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
        
        <!-- Bouton Lancer YouTube Music (visible seulement si déconnecté) -->
        <button 
          v-if="!youtubeMusicData.connected"
          class="nav-btn launch-btn" 
          @click="launchYouTubeMusic"
          title="Lancer YouTube Music"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
            <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
        
      </div>
    </nav>

    <!-- PANNEAU PRINCIPAL -->
    <main class="main-panel">
      <!-- LECTEUR MÉDIA COMPACT (style HomeView) -->
      <div v-if="tab === 'now'" class="compact-player" :class="{ 'media-connected': youtubeMusicData.connected, 'has-art': !!youtubeMusicData.artwork }" :style="ytmBgStyle">
        <div class="backdrop">
          <div class="player-card">
            <!-- Header avec statut -->
            <div class="player-header">
              <h2 class="player-title">
                <img src="../assets/images/Youtube_Music_icon.svg" alt="ytm" class="ytm-icon"> 
                YouTube Music
              </h2>
            </div>

            <!-- Zone principale avec artwork + info -->
            <div class="player-main">
              <button 
                class="control-btn" 
                @click="previousTrack" 
                :disabled="!youtubeMusicData.connected"
                title="Précédent"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z" fill="currentColor"/>
                </svg>
              </button>

              <div class="artwork-container" @click="togglePlay" 
                :disabled="!youtubeMusicData.connected"
                title="Lecture/Pause">
                <img 
                  v-if="youtubeMusicData.artwork" 
                  :src="youtubeMusicData.artwork" 
                  alt="Album art" 
                  class="artwork"
                >
                
                <div v-else class="artwork placeholder">
                  <svg viewBox="0 0 24 24" class="placeholder-icon">
                    <path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2"/>
                    <circle cx="7" cy="18" r="3" fill="currentColor"/>
                    <circle cx="18" cy="17" r="3" fill="currentColor"/>
                  </svg>
                </div>

                <div v-if="!youtubeMusicData.isPlaying" class="control-btn play-btn" >
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" fill="currentColor"/>
                    </svg>
                  </div>

              </div>
              
              <button 
                class="control-btn" 
                @click="nextTrack" 
                :disabled="!youtubeMusicData.connected"
                title="Suivant"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 6v12h-2V6h2zM6 18l8.5-6L6 6v12z" fill="currentColor"/>
                </svg>
              </button>
              
            </div>

            <!-- Contrôles -->
            <div class="player-controls">

              <div class="track-info">
                <div class="track-title">{{ youtubeMusicData.title || 'Aucune lecture' }}</div>
                <div class="track-artist">{{ youtubeMusicData.artist || '' }}</div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      <!-- LISTES TEXTUELLES (sans thumbnails) -->
      <div v-else class="list-container">
        <!-- Header de liste avec navigation -->
        <div class="list-header">
          <h3 class="list-title">
            <span v-if="tab === 'playlists'">🎵 Playlists</span>
            <span v-else-if="tab === 'recents'">🔄 Récents</span>
            <span v-else-if="tab === 'podcasts'">🎙️ Podcasts</span>
          </h3>
          
          <span v-if="tab === 'playlists'" style="margin-left: -2rem;">{{ Math.min(scrollPosition + visibleItemsCount, uniqueItems.length) }} / {{ uniqueItems.length }}</span>

          <!-- Boutons de scroll -->
          <div class="scroll-controls">
            <button 
              class="scroll-btn" 
              @click="scrollUp" 
              :disabled="scrollPosition <= 0"
              title="Haut"
            >
              <svg viewBox="0 0 24 24">
                <path d="M7 14l5-5 5 5z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              class="scroll-btn" 
              @click="scrollDown" 
              :disabled="scrollPosition >= maxScroll"
              title="Bas"
            >
              <svg viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Zone de liste scrollable -->
        <div class="list-scroll-area" ref="listArea">
          <!-- Loading -->
          <div v-if="loading" class="list-state">
            <svg viewBox="0 0 24 24" class="loading-icon rotating">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none"/>
            </svg>
            <span>Chargement...</span>
          </div>

          <!-- Liste des éléments (AVEC SCROLL VIRTUEL + DÉDUPLICATION) -->
          <div v-else-if="visibleItems.length" class="items-list">
            <div
              v-for="(item, index) in visibleItems"
              :key="item.id"
              class="list-item"
              :class="{ 
                launching: launchingId === item.id,
                even: (scrollPosition + index) % 2 === 0 
              }"
              @click="openItem(item)"
            >
              <div class="item-content">
                <div class="item-main">
                  <div class="item-title">{{ item.title }}</div>
                </div>
                
                <div class="item-actions">
                  <div v-if="launchingId === item.id" class="launching-spinner">
                    <svg viewBox="0 0 24 24" class="rotating">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none"/>
                    </svg>
                  </div>
                  <button v-else class="play-item-btn" title="Lire">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Indicateur de position -->
              <div class="item-number">{{ scrollPosition + index + 1 }}</div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="list-state">
            <svg viewBox="0 0 24 24" class="empty-icon">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M12 6v6M12 18h0" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Aucun élément trouvé</span>
            <button class="retry-btn" @click="retryLoad">Réessayer</button>
          </div>
        </div>

        <!-- Indicateur de pagination -->
        <div v-if="uniqueItems.length > 0" class="pagination-info">
        </div>
      </div>
      <div v-if="tab === 'recents'">
        
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { youtubeMusicService, youtubeMusicData } from '../services/youtubeMusicService'

type Item = { 
  id: string
  title: string
  thumbnail: string
  artist?: string
  publisher?: string
  owner?: string
  type?: string
  isArtist?: boolean
  href?: string
}


// État principal
const tab = ref<'now'|'playlists'|'recents'|'podcasts'>('now')
const items = ref<Item[]>([])
const loading = ref(false)
const launchingId = ref<string | null>(null)

// 🆕 NOUVELLE GESTION DES VUES (main/tracks)
const currentView = ref<'main' | 'tracks'>('main')
const currentItem = ref<Item | null>(null)

// Scroll virtuel
const listArea = ref<HTMLElement>()
const scrollPosition = ref(0)
const visibleItemsCount = 2
const maxScroll = ref(0)

// ✅ COMPUTED - Déduplication par nom de titre
const uniqueItems = computed(() => {
  const seen = new Set<string>()
  return items.value.filter(item => {
    const key = item.title.toLowerCase().trim()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
})

// ✅ COMPUTED - Éléments visibles avec scroll virtuel
const visibleItems = computed(() => {
  const start = scrollPosition.value
  const end = start + visibleItemsCount
  return uniqueItems.value.slice(start, end)
})

// 🆕 COMPUTED - Titre de vue actuelle
const currentViewTitle = computed(() => {
  if (currentView.value === 'tracks' && currentItem.value) {
    return `🎵 ${currentItem.value.title}`
  }
  
  if (tab.value === 'playlists') return '🎵 Playlists'
  return '🎵 Média'
})

// =====================================================
// NAVIGATION
// =====================================================

function setTab(newTab: typeof tab.value) {
  tab.value = newTab
  scrollPosition.value = 0
  // 🆕 Reset des vues quand on change d'onglet
  currentView.value = 'main'
  currentItem.value = null
}

// =====================================================
// CHARGEMENT DES LISTES
// =====================================================

async function loadPlaylists() {
  setTab('playlists')
  loading.value = true
  
  try {
    console.log('🎵 Chargement playlists...')
    const rawItems = await youtubeMusicService.getPlaylists()
    items.value = rawItems
    
    updateScrollLimits()
    console.log(`✅ ${rawItems.length} playlists brutes → ${uniqueItems.value.length} uniques`)
  } catch (error) {
    console.error('❌ Erreur chargement playlists:', error)
    items.value = []
  } finally {
    loading.value = false
  }
}

function retryLoad() {
  if (tab.value === 'playlists') loadPlaylists()
}

// =====================================================
// SCROLL VIRTUEL - RÉPARÉ
// =====================================================

function updateScrollLimits() {
  nextTick(() => {
    maxScroll.value = Math.max(0, uniqueItems.value.length - visibleItemsCount)
    console.log(`📊 Scroll limites: ${uniqueItems.value.length} items, max scroll: ${maxScroll.value}`)
  })
}

function scrollUp() {
  if (scrollPosition.value > 0) {
    scrollPosition.value = Math.max(0, scrollPosition.value - 1)
    console.log(`⬆️ Scroll up: ${scrollPosition.value}`)
  }
}

function scrollDown() {
  if (scrollPosition.value < maxScroll.value) {
    scrollPosition.value = Math.min(maxScroll.value, scrollPosition.value + 1)
    console.log(`⬇️ Scroll down: ${scrollPosition.value}`)
  }
}

// =====================================================
// ACTIONS ITEMS
// =====================================================

async function openItem(item: Item) {
  console.log(`🎵 Lancement: "${item.title}" (${item.id})`)
  
  if (launchingId.value) {
    console.log('⚠️ Lancement déjà en cours...')
    return
  }
  
  launchingId.value = item.id
  
  try {
    if (tab.value === 'playlists') {
      const success = await youtubeMusicService.playPlaylist(item.id)
      
      if (success) {
        console.log(`✅ Playlist "${item.title}" lancée`)
        
        // Passer en mode "Now Playing" après un délai
        setTimeout(() => {
          setTab('now')
        }, 50)
      } else {
        console.error(`❌ Échec playlist "${item.title}"`)
      }
    } else {
      console.log(`🎵 Lancement ${tab.value}: "${item.title}" (à implémenter)`)
    }
    
  } catch (error) {
    console.error(`❌ Erreur lancement "${item.title}":`, error)
  } finally {
    setTimeout(() => {
      launchingId.value = null
    }, 50)
  }
}

// =====================================================
// CONTRÔLES MÉDIA
// =====================================================

async function togglePlay() { 
  await youtubeMusicService.togglePlay() 
}

async function previousTrack() { 
  await youtubeMusicService.previousTrack() 
}

async function nextTrack() { 
  await youtubeMusicService.nextTrack() 
}

async function launchYouTubeMusic() {
  console.log('🎵 Lancement YouTube Music depuis MediaView...')
  const success = await youtubeMusicService.openYouTubeMusic()
  if (success) {
    console.log('✅ YouTube Music lancé avec succès')
    // Attendre un peu puis vérifier la connexion
    setTimeout(() => {
      if (youtubeMusicData.connected) {
        setTab('now') // Passer automatiquement à l'onglet "Now Playing"
      }
    }, 3000)
  } else {
    console.error('❌ Erreur lors du lancement de YouTube Music')
  }
}

function getMediaStatus(): string {
  return youtubeMusicService.getStatus()
}

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(() => {
  youtubeMusicService.startMonitoring().catch(() => {
    console.warn('⚠️ Impossible de démarrer le monitoring YouTube Music')
  })
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
/* LAYOUT PRINCIPAL */
.media-page {
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 255px;
  gap: 0.25rem;
  overflow: hidden;
  padding: .25rem 0;
}

/* SIDEBAR MODERNE */
.modern-sidebar {
  width: 64px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border-radius: 10px;
  display: flex;
  gap: 0.5rem;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  flex-shrink: 1;
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
  position: relative;
  overflow: hidden;
}

.nav-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-btn:hover::before {
  opacity: 1;
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

.nav-btn.active::before {
  opacity: 0;
}

.nav-btn.launch-btn {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
  animation: pulse-launch 2s infinite;
}

.nav-btn.launch-btn:hover {
  background: linear-gradient(135deg, #b91c1c, #dc2626);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
}

@keyframes pulse-launch {
  0%, 100% { 
    box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
  }
  50% { 
    box-shadow: 0 4px 20px rgba(220, 38, 38, 0.5);
  }
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
}

/* LECTEUR COMPACT (style HomeView) */
.compact-player {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.backdrop {
  backdrop-filter: blur(4px);
  border-radius: 10px;
  padding: .25rem;
  background-color: #20202059;
  text-shadow: 0 1px 2px rgba(0,0,0,.35);
  width: 100%;
  height:100%;
}

.player-card {
  /* background: linear-gradient(-45deg, #852727 0%, #b85c11 50%, #d8a34c 100%);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite; */
  background-color: #25252542;
  border-radius: 10px;
  padding: .25rem;
  color: white;
  width: 100%;
  height: 100%;
  box-shadow: 0 12px 32px rgba(0,0,0,.4);
  display: grid;
  grid-template-rows: 18% 62% 20%;
}

.player-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.player-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
}

.ytm-icon {
  width: 20px;
  height: 20px;
}

.status-indicator {
  font-size: 0.8rem;
  opacity: 0.9;
  color: #ffcccc;
}

.status-indicator.connected {
  color: #ccffcc;
}

.player-main {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.artwork-container {
  margin-bottom: 1rem;
  align-self: center;
  margin: auto;
}

.artwork {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
}

.artwork.placeholder {
  background: rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  opacity: 0.6;
}

.track-info {
  text-align: center;
  width: 100%;
}

.track-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.track-artist {
  font-size: 0.85rem;
  opacity: 0.8;
  max-height: 1.5rem;
  text-overflow: ellipsis;
  overflow: hidden;
}

.player-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.control-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: auto;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
  transform: scale(1.05);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control-btn svg {
  width: 18px;
  height: 18px;
}

.play-btn {
  background: rgba(32, 32, 32, 0.795);
  width: 6rem;
  height: 6rem;
  position: absolute;
  margin: auto;
  top: 29.5%;
  left: 37%;
}

.play-btn svg {
  width: 50px;
  height: 50px;
}

/* CONTENEUR DE LISTES */
.list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 8px 24px rgba(0,0,0,.3);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.list-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: var(--muted);
}

.scroll-controls {
  display: flex;
  gap: 0.25rem;
}

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

.scroll-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.2);
}

.scroll-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.scroll-btn svg {
  width: 16px;
  height: 16px;
}

/* ZONE DE LISTE */
.list-scroll-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  align-content: center;
}

.list-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: var(--muted);
  opacity: 0.7;
}

.loading-icon, .empty-icon {
  width: 48px;
  height: 48px;
}

.rotating {
  animation: rotate 1.5s linear infinite;
}

.retry-btn {
  background: var(--emerald);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.retry-btn:hover {
  background: #16a34a;
}

/* ITEMS DE LISTE */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.list-item {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.list-item.even {
  background: rgba(255,255,255,0.02);
}

.list-item:hover {
  background: rgba(255,255,255,0.1);
  transform: translateX(4px);
}

.list-item.launching {
  background: rgba(5, 150, 105, 0.2);
  border: 1px solid rgba(5, 150, 105, 0.3);
}

.item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--muted);
}

.item-subtitle {
  font-size: 0.75rem;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: flex;
  align-items: center;
  margin-left: 1rem;
}

.play-item-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.play-item-btn:hover {
  background: var(--emerald);
  color: white;
}

.play-item-btn svg {
  width: 14px;
  height: 14px;
}

.launching-spinner {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.launching-spinner svg {
  width: 20px;
  height: 20px;
  color: var(--emerald);
}

.item-number {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 0.7rem;
  opacity: 0.4;
  font-weight: 600;
}

/* PAGINATION */
.pagination-info {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.7;
  color: var(--muted);
}

/* ANIMATIONS */
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* RESPONSIVE */
@media (max-width: 400px) {
  .media-page {
    gap: 0.5rem;
  }
  
  .modern-sidebar {
    width: 56px;
    padding: 0.75rem 0.25rem;
  }
  
  .nav-btn {
    width: 44px;
    height: 44px;
  }
  
  .player-card {
    padding: 1rem;
    max-width: 240px;
  }
  
  .artwork {
    width: 100px;
    height: 100px;
  }
}
</style>