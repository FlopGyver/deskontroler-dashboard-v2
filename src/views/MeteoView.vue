<template>
  <section class="meteo-page">
    <!-- SIDEBAR MODERNE (style MediaView) -->
    <nav class="modern-sidebar">
      <div class="nav-buttons">
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'now' }" 
          @click="setTab('now')"
          title="Maintenant"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'today' }" 
          @click="setTab('today')"
          title="Aujourd'hui"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'week' }" 
          @click="setTab('week')"
          title="Semaine"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        
        <button 
          class="nav-btn" 
          :class="{ active: tab === 'details' }" 
          @click="setTab('details')"
          title="Détails"
        >
          <svg viewBox="0 0 24 24" class="btn-icon">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M12 1v6M12 17v6M5.64 5.64l4.24 4.24M14.12 14.12l4.24 4.24M1 12h6M17 12h6M5.64 18.36l4.24-4.24M14.12 9.88l4.24-4.24" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </nav>

    <!-- PANNEAU PRINCIPAL -->
    <main class="main-panel">
      
      <!-- ☀️ ONGLET MAINTENANT -->
      <div v-if="tab === 'now'" class="now-container">
        
        <!-- Loading State -->
        <div v-if="!weatherData.connected && loading" class="loading-state">
          <svg viewBox="0 0 24 24" class="loading-icon rotating">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none"/>
          </svg>
          <span>Chargement météo...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="!weatherData.connected && !loading" class="error-state">
          <svg viewBox="0 0 24 24" class="error-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Données météo indisponibles</span>
          <button class="retry-btn" @click="retryWeather">Réessayer</button>
        </div>

        <!-- Grille station météo compacte -->
        <div v-else class="weather-station-grid">
          <!-- Zone principale température -->
          <div class="main-temp-zone">
            <div class="location-title">
              <h1>{{ weatherData.city }}</h1>
              <span class="description">{{ weatherData.description }}</span>
            </div>
            <div class="main-temp-display">
              <div class="weather-icon">
                <span class="weather-emoji">{{ getWeatherEmoji(weatherData.iconCode) }}</span>
              </div>
              <div class="temp-display">
                <span class="temp-current">{{ weatherData.temperature }}°</span>
                <span class="temp-range">{{ weatherData.tempMin }}° / {{ weatherData.tempMax }}°</span>
              </div>
            </div>
          </div>

          <!-- Ressenti -->
          <div class="detail-compact">
            <div class="detail-icon">🌡️</div>
            <div class="detail-content">
              <div class="detail-label">Ressenti</div>
              <div class="detail-value">{{ feelsLike }}°C</div>
            </div>
          </div>
          
          <!-- Vent -->
          <div class="detail-compact">
            <div class="detail-icon">💨</div>
            <div class="detail-content">
              <div class="detail-label">Vent</div>
              <div class="detail-value">{{ weatherData.windSpeed }} km/h</div>
              <div class="detail-sub">{{ windDirection }}</div>
            </div>
          </div>
          
          <!-- Humidité -->
          <div class="detail-compact">
            <div class="detail-icon">💧</div>
            <div class="detail-content">
              <div class="detail-label">Humidité</div>
              <div class="detail-value">{{ weatherData.humidity }}%</div>
            </div>
          </div>
          
          <!-- Pression -->
          <div class="detail-compact">
            <div class="detail-icon">📊</div>
            <div class="detail-content">
              <div class="detail-label">Pression</div>
              <div class="detail-value">{{ pressure }} hPa</div>
            </div>
          </div>
          
          <!-- Lever/Coucher soleil combinés -->
          <div class="detail-compact sun-times">
            <div class="detail-icon">🌅</div>
            <div class="detail-content">
              <div class="detail-label">Soleil</div>
              <div class="detail-value">{{ sunrise }} → {{ sunset }}</div>
            </div>
          </div>
          
          <!-- Indice UV -->
          <div class="detail-compact">
            <div class="detail-icon">☀️</div>
            <div class="detail-content">
              <div class="detail-label">Indice UV</div>
              <div class="detail-value">{{ uvIndex }}</div>
              <div class="detail-sub">{{ uvDescription }}</div>
            </div>
          </div>
          
          <!-- Nuages -->
          <div class="detail-compact">
            <div class="detail-icon">☁️</div>
            <div class="detail-content">
              <div class="detail-label">Nuages</div>
              <div class="detail-value">{{ cloudiness }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🕐 ONGLET AUJOURD'HUI -->
      <div v-if="tab === 'today'" class="today-container">
        <div class="section-header">
          <h2 class="section-title">Prévisions par tranche de 3h</h2>
          <div class="timeline-controls">
            <button class="timeline-btn" @click="scrollTimeline(-1)" :disabled="timelinePosition <= 0">
              <svg viewBox="0 0 24 24" class="timeline-icon">
                <path d="M15 18l-6-6 6-6v12z" fill="currentColor"/>
              </svg>
            </button>
            <span class="timeline-position">{{ timelinePosition + 1 }}-{{ Math.min(timelinePosition + 4, todayForecasts.length) }} / {{ todayForecasts.length }}</span>
            <button class="timeline-btn" @click="scrollTimeline(1)" :disabled="timelinePosition >= todayForecasts.length - 4">
              <svg viewBox="0 0 24 24" class="timeline-icon">
                <path d="M9 18l6-6-6-6v12z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="timeline-container">
          <div v-if="todayForecasts.length === 0" class="empty-state">
            <span>Prévisions indisponibles</span>
          </div>
          <div v-else class="timeline-wrapper" :style="{ transform: `translateX(-${timelinePosition * 25}%)` }">
            <div v-for="forecast in todayForecasts" :key="forecast.time" class="forecast-card">
              <div class="forecast-time">{{ forecast.time }}</div>
              <div class="forecast-icon">
                <span class="forecast-emoji">{{ getWeatherEmoji(forecast.icon) }}</span>
              </div>
              <div class="forecast-temp">{{ forecast.temp }}°</div>
              <div class="forecast-rain">💧 {{ forecast.rain }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 📅 ONGLET SEMAINE -->
      <div v-if="tab === 'week'" class="week-container">
        <div class="section-header">
          <h2 class="section-title">Prévisions 5 jours</h2>
          <div class="week-controls">
            <button class="week-btn" @click="scrollWeek(-1)" :disabled="weekPosition <= 0">
              <svg viewBox="0 0 24 24" class="week-icon">
                <path d="M18 15l-6-6-6 6h12z" fill="currentColor"/>
              </svg>
            </button>
            <span class="week-position">{{ weekPosition + 1 }}-{{ Math.min(weekPosition + 3, weekForecasts.length) }} / {{ weekForecasts.length }}</span>
            <button class="week-btn" @click="scrollWeek(1)" :disabled="weekPosition >= weekForecasts.length - 3">
              <svg viewBox="0 0 24 24" class="week-icon">
                <path d="M6 9l6 6 6-6H6z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="week-viewport">
          <div v-if="weekForecasts.length === 0" class="empty-state">
            <span>Prévisions semaine indisponibles</span>
          </div>
          <div v-else class="week-grid" :style="{ transform: `translateY(-${weekPosition * 33.33}%)` }">
            <div v-for="day in weekForecasts" :key="day.date" class="day-card">
              <div class="day-header">
                <div class="day-name">{{ day.name }}</div>
                <div class="day-date">{{ day.date }}</div>
              </div>
              <div class="day-icon">
                <span class="day-emoji">{{ getWeatherEmoji(day.icon) }}</span>
              </div>
              <div class="day-temps">
                <span class="day-max">{{ day.max }}°</span>
                <span class="day-min">{{ day.min }}°</span>
              </div>
              <div class="day-rain">💧 {{ day.rain }}%</div>
              <div class="day-desc">{{ day.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 📊 ONGLET DÉTAILS -->
      <div v-if="tab === 'details'" class="details-container">
        <div class="section-header">
          <h2 class="section-title">Données techniques</h2>
        </div>

        <div class="tech-grid">
          <div class="tech-card">
            <div class="detail-icon">📍</div>
            <div class="tech-label">Coordonnées</div>
            <div class="tech-value">45.43°N, 4.39°E</div>
          </div>
          
          <div class="tech-card">
            <div class="detail-icon">🧭</div>
            <div class="tech-label">Direction vent</div>
            <div class="tech-value">{{ windDegrees }}° ({{ windDirection }})</div>
          </div>
          
          <div class="tech-card">
            <div class="detail-icon">💨</div>
            <div class="tech-label">Vitesse vent</div>
            <div class="tech-value">{{ weatherData.windSpeed }} km/h</div>
          </div>
          
          <div class="tech-card">
            <div class="detail-icon">👁️</div>
            <div class="tech-label">Visibilité</div>
            <div class="tech-value">{{ visibility }} km</div>
          </div>
          
          <div class="tech-card">
            <div class="detail-icon">💦</div>
            <div class="tech-label">Point de rosée</div>
            <div class="tech-value">{{ dewPoint }}°C</div>
          </div>
          
          <div class="tech-card">
            <div class="detail-icon">🔄</div>
            <div class="tech-label">Dernière MAJ</div>
            <div class="tech-value">{{ formatLastUpdate(weatherData.lastUpdate) }}</div>
          </div>
        </div>
      </div>

    </main>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { weatherService, weatherData, getWeatherIcon } from '../services/weatherService'

// ✅ FONCTION EMOJI MÉTÉO
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

// État principal
const tab = ref<'now'|'today'|'week'|'details'>('now')
const timelinePosition = ref(0)
const weekPosition = ref(0)
const loading = ref(true)

// Navigation
function setTab(newTab: typeof tab.value) {
  tab.value = newTab
  timelinePosition.value = 0
  weekPosition.value = 0
}

function scrollTimeline(direction: number) {
  const newPos = timelinePosition.value + direction
  if (newPos >= 0 && newPos <= todayForecasts.value.length - 4) {
    timelinePosition.value = newPos
  }
}

function scrollWeek(direction: number) {
  const newPos = weekPosition.value + direction
  if (newPos >= 0 && newPos <= weekForecasts.value.length - 3) {
    weekPosition.value = newPos
  }
}

async function retryWeather() {
  loading.value = true
  await weatherService.updateWeatherData()
  loading.value = false
}

// ✅ UTILISATION DU SERVICE ÉTENDU
// Prévisions aujourd'hui (depuis le service)
const todayForecasts = computed(() => {
  return weatherData.extended.hourlyForecasts
})

// Prévisions semaine (depuis le service)
const weekForecasts = computed(() => {
  return weatherData.extended.weekForecasts
})

// Données calculées (depuis le service)
const feelsLike = computed(() => weatherData.extended.feelsLike)
const windDirection = computed(() => weatherService.getWindDirection())
const windDegrees = computed(() => weatherData.extended.windDegrees)
const pressure = computed(() => weatherData.extended.pressure)
const sunrise = computed(() => weatherData.extended.sunrise)
const sunset = computed(() => weatherData.extended.sunset)
const cloudiness = computed(() => weatherData.extended.cloudiness)
const visibility = computed(() => weatherData.extended.visibility)
const dewPoint = computed(() => weatherData.extended.dewPoint)
const uvIndex = computed(() => weatherData.extended.uvIndex)

const uvDescription = computed(() => {
  const uv = uvIndex.value
  if (uv <= 2) return 'Faible'
  if (uv <= 5) return 'Modéré'
  if (uv <= 7) return 'Élevé'
  if (uv <= 10) return 'Très élevé'
  return 'Extrême'
})

// Helper pour formater l'heure de mise à jour (depuis le service)
function formatLastUpdate(date: Date): string {
  return weatherService.formatLastUpdate()
}

onMounted(async () => {
  console.log('🌤️ MeteoView -> Démarrage service météo étendu...')
  
  // Démarrer le service météo avec auto-update (étendu)
  weatherService.startAutoUpdate(10) // Mise à jour toutes les 10 minutes
  
  loading.value = false
  
  console.log('✅ Service météo étendu démarré')
})

onUnmounted(() => {
  console.log('🛑 MeteoView -> Arrêt service météo')
  weatherService.stopAutoUpdate()
})
</script>

<style scoped>
/* LAYOUT PRINCIPAL */
.meteo-page {
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 255px;
  gap: 0.25rem;
  overflow: hidden;
  padding: .25rem 0;
}

/* SIDEBAR MODERNE (identique MediaView) */
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
  position: relative;
  overflow: hidden;
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
}

/* ÉTATS LOADING/ERROR */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: var(--muted);
  opacity: 0.7;
}

.loading-icon, .error-icon {
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

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted);
  opacity: 0.7;
}

/* SECTION MAINTENANT - Grille Station Météo */
.now-container {
  padding: 0.5rem;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #202020 0%, #252525 100%);
}

.weather-station-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 0.25rem;
  height: 100%;
}

.main-temp-zone {
  grid-column: 2;
  grid-row: 1 / 3;
  border-radius: 10px;
  padding: 1.5rem .75rem;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(-45deg, #14291b75 0%, #05835d 50%, #09da9b 100%);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
  backdrop-filter: blur(8px);
  text-shadow: #1a1a1a 0 1px 5px;
}

.location-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
}

.location-title h1 {
  font-size: .9rem;
  font-weight: 700;
  margin: 0;
  text-align: center;
  width: 100%;
}

.description {
  font-size: 0.7rem;
  opacity: 0.95;
  text-align: center;
  margin: auto;
  text-transform: capitalize;
}

.main-temp-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.weather-emoji {
  font-size: 2rem;
  line-height: 1;
}

.temp-display {
  display: flex;
  flex-direction: column;
}

.temp-current {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.temp-range {
  font-size: 0.65rem;
  opacity: 0.8;
}

.detail-compact {
  background: linear-gradient(-45deg, #14291b 0%, #05835d 50%, #09da9b 100%);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-shadow: #1a1a1a 0 1px 5px;
}

.detail-compact .detail-icon {
  font-size: 1.5rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.detail-compact .detail-content {
  flex: 1;
  min-width: 0;
}

.detail-compact .detail-label {
  font-size: 0.8rem;
  opacity: 0.8;
  color: var(--muted);
  line-height: 1;
}

.detail-compact .detail-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.2;
}

.detail-compact .detail-sub {
  font-size: 0.55rem;
  opacity: 0.6;
  color: var(--muted);
  line-height: 1;
}

.sun-times .detail-value {
  font-size: 0.7rem;
  font-weight: 600;
}

/* SECTION AUJOURD'HUI */
.today-container {
  padding: 0.5rem;
  height: 100%;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--muted);
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timeline-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.2);
}

.timeline-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.timeline-icon {
  width: 14px;
  height: 14px;
}

.timeline-position {
  font-size: 0.7rem;
  color: var(--muted);
  opacity: 0.7;
}

.timeline-container {
  overflow: hidden;
  height: calc(100% - 3rem);
}

.timeline-wrapper {
  display: flex;
  gap: 0.5rem;
  transition: transform 0.3s ease;
  height: 100%;
}

.forecast-card {
  min-width: calc(25% - 0.375rem);
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
}

.forecast-time {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted);
}

.forecast-emoji {
  font-size: 1.5rem;
  line-height: 1;
}

.forecast-temp {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted);
}

.forecast-rain {
  font-size: 0.65rem;
  opacity: 0.7;
  color: var(--muted);
}

/* SECTION SEMAINE */
.week-container {
  padding: 0.5rem;
  height: 100%;
  overflow: hidden;
}

.week-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.week-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.week-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.2);
}

.week-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.week-icon {
  width: 14px;
  height: 14px;
}

.week-position {
  font-size: 0.7rem;
  color: var(--muted);
  opacity: 0.7;
}

.week-viewport {
  height: calc(100% - 3rem);
  overflow: hidden;
}

.week-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: transform 0.3s ease;
}

.day-card {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0.5rem;
  display: grid;
  grid-template-columns: 1fr auto auto auto 1.5fr;
  align-items: center;
  gap: 0.75rem;
  min-height: calc(33.33% - 0.33rem);
  flex-shrink: 0;
}

.day-header {
  display: flex;
  flex-direction: column;
}

.day-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: capitalize;
}

.day-date {
  font-size: 0.65rem;
  opacity: 0.7;
  color: var(--muted);
}

.day-emoji {
  font-size: 1.2rem;
  line-height: 1;
}

.day-temps {
  display: flex;
  flex-direction: column;
  text-align: center;
}

.day-max {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
}

.day-min {
  font-size: 0.7rem;
  opacity: 0.7;
  color: var(--muted);
}

.day-rain {
  font-size: 0.65rem;
  text-align: center;
  color: var(--muted);
}

.day-desc {
  font-size: 0.7rem;
  opacity: 0.8;
  color: var(--muted);
  text-transform: capitalize;
}

/* SECTION DÉTAILS */
.details-container {
  padding: 0.5rem;
  height: 100%;
  overflow-y: auto;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  height: calc(100% - 3rem);
}

.tech-card {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0.5rem;
  display: grid;
  grid-template-columns: 30% 70%;
  justify-content: center;
  text-align: center;
}

.tech-card .detail-icon {
  grid-row: 1 / 3;
  align-self: center;
  font-size: 1.5rem;
}

.tech-label {
  font-size: 0.7rem;
  opacity: 0.7;
  color: var(--muted);
  margin-bottom: 0.25rem;
}

.tech-value {
  font-size: 0.8rem;
  font-weight: 600;
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
  .meteo-page {
    gap: 0.5rem;
  }
  
  .modern-sidebar {
    width: 56px;
  }
  
  .nav-btn {
    width: 44px;
    height: 44px;
  }
  
  .weather-station-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto auto auto auto;
  }
  
  .main-temp-zone {
    grid-column: 1 / 3;
    grid-row: 1;
  }
  
  .tech-grid {
    grid-template-columns: 1fr;
  }
}
</style>s