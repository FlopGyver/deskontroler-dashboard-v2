// src/services/youtubeMusicService.ts - Version avec playPlaylist() et launch fonctionnels
import { reactive } from 'vue'

interface YouTubeMusicData {
  isPlaying: boolean
  title: string
  artist: string
  album: string
  artwork: string
  connected: boolean
  lastUpdate: Date
}

export const youtubeMusicData = reactive<YouTubeMusicData>({
  isPlaying: false,
  title: 'Aucune lecture',
  artist: '',
  album: '',
  artwork: '',
  connected: false,
  lastUpdate: new Date()
})

class YouTubeMusicService {
  // Configuration Bridge Python (toujours HTTP API)
  private bridgeConfig = {
    baseUrl: 'http://192.168.1.27:8080',
    statusPollingInterval: 3000
  }
  private statusPollingTimer: number | null = null

  constructor() {
    console.log('🎵 YouTube Music Service - Mode HTTP API vers Bridge Python')
    console.log(`🌉 Bridge URL: ${this.bridgeConfig.baseUrl}`)
  }

  /**
   * Démarre la surveillance via HTTP API
   */
  async startMonitoring(): Promise<boolean> {
    console.log('🚀 Démarrage surveillance via Bridge Python...')
    
    try {
      // Test de connexion au bridge Python
      console.log('🔄 Test connexion Bridge Python...')
      
      const response = await fetch(`${this.bridgeConfig.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Bridge inaccessible: ${response.status}`)
      }
      
      const health = await response.json()
      console.log('✅ Bridge Python connecté:', health)
      
      // Démarrer le polling du statut
      this.startStatusPolling()
      
      // Récupérer le statut initial
      await this.fetchStatus()
      
      return true
      
    } catch (error) {
      console.error('❌ Erreur connexion Bridge Python:', error)
      youtubeMusicData.connected = false
      return false
    }
  }
  
  private startStatusPolling() {
    if (this.statusPollingTimer) {
      clearInterval(this.statusPollingTimer)
    }
    
    this.statusPollingTimer = window.setInterval(async () => {
      await this.fetchStatus()
    }, this.bridgeConfig.statusPollingInterval)
    
    console.log(`🔄 Polling démarré (${this.bridgeConfig.statusPollingInterval}ms)`)
  }
  
  private async fetchStatus(): Promise<void> {
    try {
      const response = await fetch(`${this.bridgeConfig.baseUrl}/ytm/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Status error: ${response.status}`)
      }
      
      const status = await response.json()
      this.updateData(status)
      
    } catch (error) {
      console.error('❌ Erreur récupération statut:', error)
      youtubeMusicData.connected = false
    }
  }
  
  private updateData(status: any): void {
    youtubeMusicData.connected = status.connected || false
    youtubeMusicData.title = status.title || 'Aucune lecture'
    youtubeMusicData.artist = status.artist || ''
    youtubeMusicData.album = status.album || ''
    youtubeMusicData.artwork = status.artwork || ''
    youtubeMusicData.isPlaying = status.isPlaying || false
    youtubeMusicData.lastUpdate = new Date()
  }
  
  private async sendCommand(action: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.bridgeConfig.baseUrl}/ytm/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Command error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`🎵 Commande ${action}:`, result.success ? '✅' : '❌')
      
      // Récupérer le nouveau statut
      setTimeout(() => {
        this.fetchStatus()
      }, 500)
      
      return result.success || true
      
    } catch (error) {
      console.error(`❌ Erreur commande ${action}:`, error)
      return false
    }
  }

  // =====================================================
  // INTERFACE PUBLIQUE - CONTRÔLES DE BASE
  // =====================================================

  /**
   * Toggle play/pause
   */
  async togglePlay(): Promise<boolean> {
    return await this.sendCommand('play_pause')
  }

  /**
   * Piste suivante
   */
  async nextTrack(): Promise<boolean> {
    return await this.sendCommand('next')
  }

  /**
   * Piste précédente
   */
  async previousTrack(): Promise<boolean> {
    return await this.sendCommand('previous')
  }

  /**
   * Ouvrir YouTube Music - VIA BRIDGE PYTHON
   */
  async openYouTubeMusic(): Promise<boolean> {
    console.log('🎵 Demande lancement YouTube Music via Bridge Python...')
    
    try {
      const response = await fetch(`${this.bridgeConfig.baseUrl}/ytm/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Launch error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('🎵 Réponse lancement:', result.success ? '✅' : '❌')
      
      if (result.success) {
        console.log('✅ YouTube Music lancé via Bridge Python')
        
        // Attendre un délai plus long pour que l'app se lance
        setTimeout(() => {
          this.fetchStatus()
        }, 5000) // 5 secondes pour que l'app démarre
        
        return true
      } else {
        console.error('❌ Échec lancement YouTube Music:', result.error)
        return false
      }
      
    } catch (error) {
      console.error('❌ Erreur communication Bridge pour lancement:', error)
      
      // Fallback: si le bridge ne répond pas, essayer localement
      try {
        console.log('🔄 Fallback: tentative ouverture locale...')
        const ytmWindow = window.open(
          'https://music.youtube.com/',
          'youtube-music',
          'width=1200,height=800,resizable=yes,scrollbars=yes'
        )
        
        if (ytmWindow) {
          console.log('✅ YouTube Music ouvert localement')
          setTimeout(() => {
            this.fetchStatus()
          }, 3000)
          return true
        }
      } catch (fallbackError) {
        console.error('❌ Fallback échoué:', fallbackError)
      }
      
      return false
    }
  }

  // =====================================================
  // 🎯 MÉTHODE : LANCER PLAYLIST
  // =====================================================

  /**
   * Lancer une playlist spécifique
   * @param playlistId ID de la playlist (peut être temporaire ou réel PL...)
   */
  async playPlaylist(playlistId: string): Promise<boolean> {
    console.log(`🎵 playPlaylist(${playlistId})`)
    
    try {
      const response = await fetch(`${this.bridgeConfig.baseUrl}/ytm/play_playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist_id: playlistId })
      })
      
      if (!response.ok) {
        throw new Error(`Playlist launch error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`🎵 Lancement playlist "${playlistId}":`, result.success ? '✅' : '❌')
      
      if (result.success) {
        // Attendre un peu puis récupérer le nouveau statut
        setTimeout(() => {
          this.fetchStatus()
        }, 1500) // Plus long car changement de playlist
        
        return true
      } else {
        console.error('❌ Échec lancement playlist:', result.error)
        return false
      }
      
    } catch (error) {
      console.error(`❌ Erreur playPlaylist ${playlistId}:`, error)
      return false
    }
  }

  /**
   * Arrêter la surveillance
   */
  stopMonitoring(): void {
    if (this.statusPollingTimer) {
      clearInterval(this.statusPollingTimer)
      this.statusPollingTimer = null
    }
    
    youtubeMusicData.connected = false
    console.log('🛑 Surveillance YouTube Music arrêtée')
  }

  /**
   * Statut pour l'affichage
   */
  getStatus(): string {
    if (!youtubeMusicData.connected) {
      return 'Déconnecté'
    }
    
    return youtubeMusicData.isPlaying ? 'En lecture' : 'En pause'
  }

  /**
   * Diagnostics
   */
  getDiagnostics() {
    return {
      mode: 'bridge',
      connected: youtubeMusicData.connected,
      title: youtubeMusicData.title,
      artist: youtubeMusicData.artist,
      isPlaying: youtubeMusicData.isPlaying,
      lastUpdate: youtubeMusicData.lastUpdate,
      bridgeUrl: this.bridgeConfig.baseUrl,
      hostname: window.location.hostname
    }
  }

  // =====================================================
  // ENDPOINTS "QUERY" (LISTES) - DÉJÀ FONCTIONNELS
  // =====================================================

  async getPlaylists(): Promise<any[]> {
    try {
      const r = await fetch(`${this.bridgeConfig.baseUrl}/ytm/query/playlists`, { method: 'GET' })
      const j = await r.json()
      return j && j.ok && Array.isArray(j.items) ? j.items : []
    } catch (e) {
      console.warn('[ytm] getPlaylists failed:', e)
      return []
    }
  }

  async getRecents(): Promise<any[]> {
    try {
      const r = await fetch(`${this.bridgeConfig.baseUrl}/ytm/query/recents`, { method: 'GET' })
      const j = await r.json()
      return j && j.ok && Array.isArray(j.items) ? j.items : []
    } catch (e) {
      console.warn('[ytm] getRecents failed:', e)
      return []
    }
  }

  async getPodcasts(): Promise<any[]> {
    try {
      const r = await fetch(`${this.bridgeConfig.baseUrl}/ytm/query/podcasts`, { method: 'GET' })
      const j = await r.json()
      return j && j.ok && Array.isArray(j.items) ? j.items : []
    } catch (e) {
      console.warn('[ytm] getPodcasts failed:', e)
      return []
    }
  }
}

export const youtubeMusicService = new YouTubeMusicService()

// Auto-démarrage
setTimeout(() => {
  youtubeMusicService.startMonitoring()
}, 50)