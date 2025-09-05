// src/services/weatherService.ts
import { reactive } from 'vue'

// Configuration OpenWeatherMap
const WEATHER_CONFIG = {
  apiKey: import.meta.env.VITE_WEATHER_API_KEY || '',
  city: import.meta.env.VITE_WEATHER_CITY || 'Saint-Étienne',
  countryCode: import.meta.env.VITE_WEATHER_COUNTRY || 'FR',
  units: 'metric' // metric = Celsius, imperial = Fahrenheit
}

// Types pour les nouvelles données
interface HourlyForecast {
  time: string
  icon: string
  temp: number
  rain: number
  humidity: number
  windSpeed: number
}

interface DailyForecast {
  name: string
  date: string
  icon: string
  max: number
  min: number
  rain: number
  description: string
}

interface ExtendedWeatherData {
  // Données de base (existantes)
  pressure: number
  visibility: number
  cloudiness: number
  uvIndex: number
  dewPoint: number
  windDegrees: number
  windGust: number
  feelsLike: number
  sunrise: string
  sunset: string
  
  // Prévisions détaillées
  hourlyForecasts: HourlyForecast[]
  weekForecasts: DailyForecast[]
}

// État réactif des données météo (étendu)
export const weatherData = reactive({
  connected: false,
  city: 'Saint-Étienne',
  description: 'Chargement...',
  temperature: 0,
  tempMin: 0,
  tempMax: 0,
  humidity: 0,
  windSpeed: 0,
  iconCode: '01d', // Code pour le SVG
  forecast: [] as Array<{
    day: string,
    min: number,
    max: number,
    iconCode: string,
    description: string
  }>,
  lastUpdate: new Date(),
  
  // ✅ NOUVELLES DONNÉES ÉTENDUES
  extended: {
    pressure: 1013,
    visibility: 10,
    cloudiness: 0,
    uvIndex: 0,
    dewPoint: 0,
    windDegrees: 0,
    windGust: 0,
    feelsLike: 0,
    sunrise: '06:00',
    sunset: '20:00',
    hourlyForecasts: [],
    weekForecasts: []
  } as ExtendedWeatherData
})

// Mapping des codes météo OpenWeather vers des SVG
export function getWeatherIcon(iconCode: string): string {
  const iconMap: { [key: string]: string } = {
    // Soleil
    '01d': 'M12 2v2m0 16v2m10-10h-2M4 12H2m15.36-6.36-1.42 1.42M6.64 6.64 5.22 5.22m12.72 12.72-1.42-1.42M6.64 17.36 5.22 18.78M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
    '01n': 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
    
    // Nuages
    '02d': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z',
    '02n': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z',
    '03d': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z',
    '03n': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z',
    '04d': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z',
    '04n': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Z',
    
    // Pluie
    '09d': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Zm-6 11v2m3-4v4m3-2v2',
    '09n': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Zm-6 11v2m3-4v4m3-2v2',
    '10d': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Zm-6 11v2m3-4v4m3-2v2',
    '10n': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Zm-6 11v2m3-4v4m3-2v2',
    
    // Orage
    '11d': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7ZM8 19l2-6h4l-2 6',
    '11n': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7ZM8 19l2-6h4l-2 6',
    
    // Neige
    '13d': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Zm-5 11h1m3 0h1m-4 2h1m3 0h1',
    '13n': 'M13 7a5 5 0 1 0 0 10h6a4 4 0 0 0 0-8h-1.1A6 6 0 0 0 13 7Zm-5 11h1m3 0h1m-4 2h1m3 0h1',
    
    // Brouillard
    '50d': 'M3 14h18M3 18h18M3 10h18',
    '50n': 'M3 14h18M3 18h18M3 10h18',
  }
  
  return iconMap[iconCode] || iconMap['01d'] // Fallback soleil
}

// ✅ HELPERS POUR CALCULS MÉTÉO
function calculateFeelsLike(temp: number, humidity: number, windSpeed: number): number {
  let feels = temp
  if (temp >= 27) {
    // Index de chaleur (quand il fait chaud)
    feels = temp + (humidity - 40) / 4
  } else if (temp <= 10) {
    // Refroidissement éolien (quand il fait froid)
    feels = 13.12 + 0.6215 * temp - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temp * Math.pow(windSpeed, 0.16)
  }
  return Math.round(feels)
}

function calculateDewPoint(temp: number, humidity: number): number {
  // Formule simplifiée du point de rosée
  const dewPoint = temp - ((100 - humidity) / 5)
  return Math.round(dewPoint)
}

function getWindDirection(degrees: number): string {
  const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

function formatSunTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

class WeatherService {
  private updateInterval: number | undefined
  
  async fetchCurrentWeather() {
    if (!WEATHER_CONFIG.apiKey) {
      console.error('❌ Clé API OpenWeatherMap manquante dans .env.local')
      return false
    }
    
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=45.42986297607422&lon=4.394256591796875&appid=${WEATHER_CONFIG.apiKey}&units=${WEATHER_CONFIG.units}&lang=fr`
      
      console.log('🌤️ Récupération météo actuelle...')
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`API Weather Error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Mise à jour des données réactives DE BASE
      weatherData.city = data.name
      weatherData.description = data.weather[0].description
      weatherData.temperature = Math.round(data.main.temp)
      weatherData.tempMin = Math.round(data.main.temp_min)
      weatherData.tempMax = Math.round(data.main.temp_max)
      weatherData.humidity = data.main.humidity
      weatherData.windSpeed = Math.round(data.wind?.speed || 0)
      weatherData.iconCode = data.weather[0].icon
      weatherData.connected = true
      weatherData.lastUpdate = new Date()
      
      // ✅ NOUVELLES DONNÉES ÉTENDUES
      weatherData.extended.pressure = data.main.pressure || 1013
      weatherData.extended.visibility = Math.round((data.visibility || 10000) / 1000) // m -> km
      weatherData.extended.cloudiness = data.clouds?.all || 0
      weatherData.extended.windDegrees = data.wind?.deg || 0
      weatherData.extended.windGust = Math.round(data.wind?.gust || 0)
      weatherData.extended.feelsLike = calculateFeelsLike(
        weatherData.temperature, 
        weatherData.humidity, 
        weatherData.windSpeed
      )
      weatherData.extended.dewPoint = calculateDewPoint(
        weatherData.temperature, 
        weatherData.humidity
      )
      weatherData.extended.sunrise = formatSunTime(data.sys.sunrise)
      weatherData.extended.sunset = formatSunTime(data.sys.sunset)
      
      console.log(`✅ Météo: ${weatherData.city} - ${weatherData.temperature}°C - ${weatherData.description}`)
      return true
      
    } catch (error) {
      console.error('❌ Erreur récupération météo:', error)
      weatherData.connected = false
      return false
    }
  }
  
  async fetchForecast() {
    if (!WEATHER_CONFIG.apiKey) return false
    
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=45.42986297607422&lon=4.394256591796875&appid=${WEATHER_CONFIG.apiKey}&units=${WEATHER_CONFIG.units}&lang=fr`
      
      console.log('📅 Récupération prévisions...')
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`API Forecast Error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // ✅ TRAITEMENT PRÉVISIONS DÉTAILLÉES
      await this.processForecastData(data)
      
      console.log(`📅 Prévisions traitées: ${weatherData.extended.hourlyForecasts.length} heures, ${weatherData.extended.weekForecasts.length} jours`)
      return true
      
    } catch (error) {
      console.error('❌ Erreur récupération prévisions:', error)
      return false
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Traitement des prévisions détaillées
  private async processForecastData(data: any) {
    const today = new Date().toDateString()
    const dailyData = new Map()
    
    // Prévisions horaires (aujourd'hui uniquement)
    const hourlyForecasts: HourlyForecast[] = []
    
    // Prévisions journalières (5 jours)
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000)
      const itemDate = date.toDateString()
      const dayKey = itemDate
      
      // Prévisions horaires pour aujourd'hui
      if (itemDate === today) {
        const hours = date.getHours().toString().padStart(2, '0')
        hourlyForecasts.push({
          time: `${hours}h`,
          icon: item.weather[0].icon,
          temp: Math.round(item.main.temp),
          rain: Math.round((item.pop || 0) * 100),
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind?.speed || 0)
        })
      }
      
      // Agrégation par jour pour prévisions semaine
      if (!dailyData.has(dayKey)) {
        dailyData.set(dayKey, {
          date: date,
          temps: [],
          icons: [],
          descriptions: [],
          rains: []
        })
      }
      
      const dayData = dailyData.get(dayKey)
      dayData.temps.push(item.main.temp)
      dayData.icons.push(item.weather[0].icon)
      dayData.descriptions.push(item.weather[0].description)
      dayData.rains.push((item.pop || 0) * 100)
    })
    
    // Prévisions semaine (5 jours max)
    const weekForecasts: DailyForecast[] = Array.from(dailyData.values())
      .slice(0, 5)
      .map((day: any) => {
        const isToday = day.date.toDateString() === today
        
        return {
          name: isToday ? 'Aujourd\'hui' : day.date.toLocaleDateString('fr-FR', { weekday: 'long' }),
          date: day.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          icon: day.icons[Math.floor(day.icons.length / 2)], // Icône du milieu de journée
          max: Math.round(Math.max(...day.temps)),
          min: Math.round(Math.min(...day.temps)),
          rain: Math.round(Math.max(...day.rains)),
          description: day.descriptions[0]
        }
      })
    
    // ✅ MISE À JOUR DONNÉES RÉACTIVES
    weatherData.extended.hourlyForecasts = hourlyForecasts
    weatherData.extended.weekForecasts = weekForecasts
    
    // Prévisions de base (existant - compatibilité)
    const dailyForecasts: any[] = weekForecasts.slice(0, 3).map(day => ({
      day: day.name.substring(0, 3),
      min: day.min,
      max: day.max,
      iconCode: day.icon,
      description: day.description
    }))
    
    weatherData.forecast = dailyForecasts
  }
  
  // ✅ NOUVELLE MÉTHODE: Récupération données UV (optionnel)
  async fetchUVIndex() {
    if (!WEATHER_CONFIG.apiKey) return
    
    try {
      const url = `https://api.openweathermap.org/data/2.5/uvi?lat=45.42986297607422&lon=4.394256591796875&appid=${WEATHER_CONFIG.apiKey}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        weatherData.extended.uvIndex = Math.round(data.value || 0)
        console.log(`🌞 UV Index: ${weatherData.extended.uvIndex}`)
      }
    } catch (error) {
      console.warn('⚠️ UV Index indisponible:', error)
    }
  }
  
  async updateWeatherData() {
    console.log('🔄 Mise à jour données météo complètes...')
    
    const currentSuccess = await this.fetchCurrentWeather()
    const forecastSuccess = await this.fetchForecast()
    
    // UV Index (optionnel, ne bloque pas)
    this.fetchUVIndex().catch(() => {})
    
    return currentSuccess && forecastSuccess
  }
  
  startAutoUpdate(intervalMinutes = 10) {
    console.log(`🔄 Démarrage auto-update météo toutes les ${intervalMinutes} minutes`)
    
    // Première mise à jour immédiate
    this.updateWeatherData()
    
    // Puis intervalles réguliers
    this.updateInterval = window.setInterval(() => {
      this.updateWeatherData()
    }, intervalMinutes * 60 * 1000)
  }
  
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = undefined
      console.log('🛑 Auto-update météo arrêté')
    }
  }
  
  // ✅ NOUVELLES MÉTHODES UTILITAIRES
  getWindDirection(): string {
    return getWindDirection(weatherData.extended.windDegrees)
  }
  
  formatLastUpdate(): string {
    const now = new Date()
    const diffMs = now.getTime() - weatherData.lastUpdate.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return 'À l\'instant'
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`
    
    const diffHours = Math.floor(diffMinutes / 60)
    return `Il y a ${diffHours}h`
  }
}

export const weatherService = new WeatherService()