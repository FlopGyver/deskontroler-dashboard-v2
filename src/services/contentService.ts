// src/services/contentService.ts
import { reactive, ref } from 'vue'

export interface ContentItem {
  id: string
  type: 'hydration' | 'weather' | 'news'
  title: string
  subtitle: string
  url?: string
  source?: string
  timestamp?: Date
}

export interface NewsItem {
  title: string
  description: string
  link: string
  pubDate: Date
  source: string
}

// État réactif du contenu
export const contentData = reactive({
  items: [] as ContentItem[],
  lastUpdate: new Date(),
  isPresent: false,
  lastPresenceCheck: new Date()
})

class ContentService {
  private presenceCheckInterval: number | undefined
  private contentRefreshInterval: number | undefined
  
  private readonly RSS_SOURCES = {
    franceinfo: {
      internet: 'https://www.franceinfo.fr/internet.rss',
      sciences: 'https://www.franceinfo.fr/sciences.rss', 
      monde: 'https://www.franceinfo.fr/monde.rss',
      politique: 'https://www.franceinfo.fr/politique.rss'
    },
    korben: 'https://korben.info/feed',
    itconnect: 'https://www.it-connect.fr/feed/'
  }

  // 🎭 SUGGESTIONS MÉTÉO CRINGE EXTENDED EDITION
  private getOutfitSuggestion(temp: number, weather: string): string {
    const suggestions = {
      // 🥶 < 0°C – Apocalypse Glaciaire
      freezing: [
        "Frérot, les Marcheurs Blancs ont sorti les doudounes… Full Stuff direct ! 🧟‍♂️",
        "Ton chien veut plus sortir, écoute-le. Doudoune de combat anti-froid ! 🥾", 
        "Même le café se refroidit par solidarité. Thermos sur toi ! ☕",
        "C'est pas une météo, c'est une punition divine. Grosse veste validée ! 🙏",
        "Le froid te glisse dessus comme une taxe imprévue. Pull renforcé (x4)! 💸",
        "Ce froid, c'est un boss final. Mets ton armure en laine ! ⚔️",
        "Mec, tu serres une main, t'y laisse un doigt. Gants obligatoires ! 🧤",
        "Même Goku aurait arrêté son entraînement. Veste polaire ! 🥋",
        "Ton daron sort la doudoune Canada Goose du placard. Imitation acceptée. 🧥",
        "Même le Soleil a ragequit. Écharpe XXL obligatoire. 🌞"
      ],
      
      // 🧊 0 – 5°C – Zone Extrême  
      cold: [
        "Même les pigeons boycottent la place, écoute-les : blouson serré. 🕊️",
        "C'est pas un courant d'air, c'est une embuscade météo. Pull + bonnet. 🧶",
        "Les capybaras se planquent, fais pareil. Bonnet stylé ! 🦫",
        "Un vent comme ça, ça s'appelle une claque gratuite. Coupe-vent ! 👋",
        "Même John Wick met une écharpe ici. Classe + chaleur. 🕴️",
        "Walter White aurait troqué son labo pour un col roulé. Respecte la science. ⚗️",
        "Même Legolas aurait mis des gants. Précision polaire ! 🏹",
        "C'est pas une brise, c'est une gifle cosmique. Veste chaude fixée. 🧥",
        "Le trottoir est en PLS. Hoodie sous veste chaude, pas de débat. 🧥",
        "Gandalf te l'aurait dit : 'sans écharpe, tu ne passeras pas'. Ajoute des gants. 🧙"
      ],
      
      // 🧥 5 – 10°C – Froid Vicieux
      chilly: [
        "Dark Souls niveau facile, mais si tu joues nu t'es mort. T-shirt + pull ! 🗡️",
        "Même Saitama garderait son hoodie. Suis l'exemple. 👊",
        "Les pigeons grelottent en silence, respecte leur combat. Veste chaude. 🕊️",
        "Même Freezer viendrait squatter ton radiateur. Gants + bonnet ! 🧤",
        "C'est le genre de froid qui t'attaque dans le dos. Hoodie serré ! 🧢",
        "Même Aragorn aurait sorti un manteau. Roi mais pas suicidaire. 👑",
        "Tu crois que ça passe, mais tu finis en glaçon. Gilet épais. 📺",
        "Le soir te met une balayette. Chemise + pull, règle d'or. 👔",
        "Soleil en RTT. Veste en jean sur hoodie, safe. 🧥",
        "Frodon aurait pris l'écharpe. Toi, col roulé en plus. 💍"
      ],
      
      // 🧶 10 – 15°C – Traquenard Climatique
      cool: [
        "C'est le fameux 'ça va', mais en vrai ça trap. Pull léger ! 🧵",
        "Ni chaud ni froid… juste chelou. Pantalon long, évite le short ! 👖",
        "C'est pas violent, mais ça chatouille. Survêt' conseillé ! 🏃",
        "La météo dit cool, ta daronne dit mets un gilet. Obéis. 👨‍🦲",
        "T'as cru que la chemise passait ? Bouffon va ! 👔",
        "Un soleil timide mais perfide. Hoodie minimum. 🌥️",
        "Même les pigeons se regroupent. Veste chaude. 🕊️",
        "Legolas aurait mis une cape de survie. T'es pas plus fort que lui. 🏹",
        "Ton daron sort le k-way 'au cas où'. Il a pas tort. 🧥",
        "Ça t'endort comme un cours de philo. Col roulé conseillé. 📚"
      ],
      
      // 👕 15 – 20°C – Confort Solide
      mild: [
        "Jon Snow dirait : 'tranquille'. Toi aussi, chemise ouverte ! ❄️",
        "Achievement unlocked : parfait climat. Short en option ! 🏆",
        "Climat équitable : hoodie pour le style, pas pour la chaleur. 🧢",
        "Idéal pour l'entraînement d'un Saiyan. Petit pull conseillé. 🥋",
        "Pas besoin de forcer : pull & jean, combo parfait. 👟",
        "C'est la zone neutre : ni trop, ni pas assez. Chino + chemise. 👔",
        "Même Legolas aurait accepté de chiller. Veste légère. 🧝",
        "Aragorn appellerait ça la Comté météo. T-shirt ou chemise tranquille. 🧝‍♂️",
        "Le Soleil tape pas, il checke. Jean + sneakers et t'es validé. 🌞",
        "Même Vegeta poserait sans râler. Pull léger pour le style. 🥋"
      ],
      
      // ☀️ 20 – 25°C – Idéal de la Vie
      pleasant: [
        "Dieux du climat en mode buff. Short validé ! ✨",
        "Capybara chilling dans l'eau. T-shirt chill aussi ! 🦫",
        "Un soleil digne du Roi, mais pas écrasant. T-shirt + chino ! 👑",
        "C'est le mood terrasse + bière. Jean ou short, freestyle. 🍺",
        "Même les pigeons font bronzette. Short + lunettes. 🕊️",
        "Ce soleil c'est Gandalf : ni trop tôt, ni trop tard. Chemise relax. 🧙",
        "Ton flow peut respirer sans transpirer. T-shirt conseillé. 👕",
        "C'est le climat où même Goku se repose. Short & chill. 🥋",
        "Prince aurait ouvert la chemise. Toi, jean léger. 🎶",
        "Le Soleil checke sans cogner. Chino + t-shirt, masterclass. 🌞"
      ],
      
      // 🌞 25 – 30°C – Chaud Relou
      warm: [
        "Mec, même les glaçons demandent de l'aide. T-shirt léger ! 🧊",
        "Même ton frigo veut sortir. Tongues en bonus ! 🩴",
        "Tu sue plus vite que tu respires. Habits clairs conseillés ! 🤍",
        "Les pigeons cherchent l'ombre, copie-les. Casquette ! 🕊️",
        "T'as pas mis de déo ? Fréro, erreur fatale. T-shirt clair. 🧴",
        "Le soleil te met un coup de pression. Short + chemise légère. 🌞",
        "Mh… on serait pas dans l'Mordor ? T-shirt fortement conseillé. 💍",
        "Tu vas faire semblant d'arroser mais c'est pour se rafraîchir. T-shirt léger. 🌱",
        "Même Aragorn aurait gardé que la cap histoire de. Short conseillé. 🧝",
        "C'est le climat où la sieste devient une mission. T-shirt. 😴"
      ],
      
      // 🔥 30°C+ – Enfer Climatisé
      hot: [
        "Chuck Norris transpire… Frérot c'est fini. Tenue minimale ! 💪",
        "Même les cactus veulent de l'ombre. Bain Nordique ! 🌵",
        "Si tu meurs, prévois un cercueil climatisé. Short obligatoire ! ⚰️",
        "Fréro, tu vas passer une nuit de merde. T-shirt au maximum ! 🛏️",
        "Mad Max… mais en pire. Challah t'y survis. 🚗",
        "Même Sauron se cache du soleil. Tu vas subir… 🧙‍♂️",
        "Goku a fusionné avec la clim. Envisage un aménagement du congel'. ☀️",
        "Soleil mode boss final. Short et prières, courage fréro. 👑",
        "Bon, là c'est sûr qu'on est bien dans l'Mordor. Fais ce que tu peux pour survivre ! 💍",
        "Même les darons sont torse nu au salon. Short + ventilateur. 🌀"
      ]
    }
    
    // Sélection par température
    let tempSuggestions: string[]
    if (temp < 0) tempSuggestions = suggestions.freezing
    else if (temp < 5) tempSuggestions = suggestions.cold  
    else if (temp < 10) tempSuggestions = suggestions.chilly
    else if (temp < 15) tempSuggestions = suggestions.cool
    else if (temp < 20) tempSuggestions = suggestions.mild
    else if (temp < 25) tempSuggestions = suggestions.pleasant
    else if (temp < 30) tempSuggestions = suggestions.warm
    else tempSuggestions = suggestions.hot
    
    // Sélection aléatoire dans la plage
    return tempSuggestions[Math.floor(Math.random() * tempSuggestions.length)]
  }

  // 🎬 YOUTUBE API - Test et récupération
  async fetchYouTubeSubscriptions(): Promise<NewsItem[]> {
    try {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
      if (!apiKey) {
        console.warn('⚠️ YouTube API: Clé API manquante dans .env.local')
        return []
      }

      console.log('🎬 Test YouTube API...')
      
      // Test simple: récupérer les vidéos populaires (pas besoin d'auth)
      const testUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=FR&maxResults=3&key=${apiKey}`
      
      const response = await fetch(testUrl)
      console.log(`🎬 YouTube API Status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ YouTube API Error:', response.status, errorText)
        return []
      }
      
      const data = await response.json()
      console.log('✅ YouTube API fonctionne! Vidéos populaires récupérées:', data.items?.length || 0)
      
      // Convertir en format NewsItem
      const videos: NewsItem[] = (data.items || []).map((item: any) => ({
        title: item.snippet.title,
        description: item.snippet.description?.substring(0, 200) || '',
        link: `https://www.youtube.com/watch?v=${item.id}`,
        pubDate: new Date(item.snippet.publishedAt),
        source: 'youtube'
      }))
      
      console.log('🎬 Vidéos YouTube converties:', videos.length)
      videos.forEach((video, index) => {
        console.log(`  ${index + 1}. "${video.title}"`)
      })
      
      return videos
      
    } catch (error) {
      console.error('❌ Erreur YouTube API:', error)
      return []
    }
  }
  async checkPresence(): Promise<boolean> {
    try {
      const targetIP = import.meta.env.VITE_PRESENCE_TARGET_IP || '192.168.1.27'
      
      // Appel API bridge Python pour ping
      const response = await fetch('http://192.168.1.27:8080/content/ping_presence', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        contentData.isPresent = result.present || false
        contentData.lastPresenceCheck = new Date()
        console.log(`👤 Présence: ${contentData.isPresent ? 'Détectée' : 'Absente'}`)
        return contentData.isPresent
      }
      
      return false
    } catch (error) {
      console.warn('⚠️ Erreur vérification présence:', error)
      return false
    }
  }

  // 💧 LOGIQUE HYDRATATION
  shouldTriggerHydration(): boolean {
    if (!contentData.isPresent) return false
    
    const LAST_ACK_KEY = 'hydration_last_ack_hour'
    const currentHourKey = this.getHourKey()
    const lastAck = localStorage.getItem(LAST_ACK_KEY)
    
    return lastAck !== currentHourKey
  }

  ackHydration(): void {
    const currentHourKey = this.getHourKey()
    localStorage.setItem('hydration_last_ack_hour', currentHourKey)
    console.log('💧 Hydratation confirmée pour cette heure:', currentHourKey)
    
    // Refresh immédiat du contenu pour retirer l'hydratation de la rotation
    this.refreshContent()
  }

  private getHourKey(date = new Date()): string {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}`
  }

  // 📰 RÉCUPÉRATION RSS
  async fetchRSSFeed(url: string): Promise<NewsItem[]> {
    try {
      // Utilisation d'un proxy CORS pour éviter les erreurs
      const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=10`
      
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error(`RSS Error: ${response.status}`)
      
      const data = await response.json()
      
      if (data.status !== 'ok') {
        throw new Error(`RSS API Error: ${data.message}`)
      }
      
      return data.items.map((item: any) => ({
        title: this.cleanText(item.title),
        description: this.cleanText(item.description),
        link: item.link,
        pubDate: new Date(item.pubDate),
        source: this.getSourceFromUrl(url)
      }))
      
    } catch (error) {
      console.error(`❌ Erreur RSS ${url}:`, error)
      return []
    }
  }

  private cleanText(text: string): string {
    // Nettoyage HTML et formatage
    return text
      .replace(/<[^>]*>/g, '') // Supprimer HTML
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private getSourceFromUrl(url: string): string {
    if (url.includes('franceinfo')) return 'franceinfo'
    if (url.includes('korben')) return 'korben'
    if (url.includes('it-connect')) return 'itconnect'
    return 'unknown'
  }

  // 💧 Phrases d'hydratation aléatoires pour éviter la monotonie
  private getRandomHydrationPhrase(): string {
    const phrases = [
      'Pense à boire un verre d\'eau ! 💧',
      'Hydratation check ! Un petit verre ? 🚰', 
      'Ton cerveau a soif ! 🧠💦',
      'Une pause hydratation ? 💦',
      'Time to drink ! Reste hydraté 🥤',
      'Allez, un verre d\'eau pour être au top ! 💪💧',
      'Petit reminder hydratation ! 🔔💧',
      'Ton corps te dit merci pour l\'eau ! 🙏💧'
    ]
    
    return phrases[Math.floor(Math.random() * phrases.length)]
  }
  // 📊 RÉCUPÉRATION CONTENU COMPLET
  async fetchAllContent(): Promise<ContentItem[]> {
    console.log('🔄 Récupération du contenu complet...')
    
    const items: ContentItem[] = []
    
    try {
      // 1. HYDRATATION (priorité absolue)
      if (this.shouldTriggerHydration()) {
        const hydrationItem = {
          id: 'hydration-' + Date.now(),
          type: 'hydration' as const,
          title: 'Hydratation',
          subtitle: this.getRandomHydrationPhrase()
        }
        items.push(hydrationItem)
        console.log('💧 Item hydratation créé - Présence:', contentData.isPresent)
      }

      // 2. MÉTÉO + OUTFIT (1 fois par cycle)
      const weatherData = await this.getWeatherOutfit()
      if (weatherData) {
        items.push(weatherData)
      }

      // 3. NEWS RSS
      const newsItems = await this.fetchAllNews()
      items.push(...newsItems)

      console.log(`✅ ${items.length} éléments de contenu récupérés`)
      return items
      
    } catch (error) {
      console.error('❌ Erreur récupération contenu:', error)
      return items
    }
  }

  private async getWeatherOutfit(): Promise<ContentItem | null> {
    try {
      // Récupération depuis le service météo existant
      const { weatherData } = await import('./weatherService')
      
      if (!weatherData.connected) return null
      
      const outfitSuggestion = this.getOutfitSuggestion(
        weatherData.temperature, 
        weatherData.description
      )
      
      return {
        id: 'weather-' + Date.now(),
        type: 'weather',
        title: `Météo ${weatherData.city}`,
        subtitle: outfitSuggestion
      }
      
    } catch (error) {
      console.warn('⚠️ Erreur météo outfit:', error)
      return null
    }
  }

  private async fetchAllNews(): Promise<ContentItem[]> {
    const newsItems: ContentItem[] = []
    
    try {
      // FRANCE INFO - Anti-doublons intelligent
      console.log('📰 Récupération France Info avec anti-doublons...')
      const franceInfoArticles: { [category: string]: NewsItem[] } = {}
      
      // 1. Récupérer tous les articles de toutes les catégories FI
      for (const [category, url] of Object.entries(this.RSS_SOURCES.franceinfo)) {
        console.log(`📰 FranceInfo ${category}: ${url}`)
        const articles = await this.fetchRSSFeed(url)
        franceInfoArticles[category] = articles
        console.log(`📰 FranceInfo ${category}: ${articles.length} articles récupérés`)
      }
      
      // 2. Sélection intelligente avec anti-doublons
      const usedTitles = new Set<string>()
      const normalizeTitle = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)
      
      for (const [category, articles] of Object.entries(franceInfoArticles)) {
        if (articles.length === 0) {
          console.warn(`⚠️ FranceInfo ${category}: Aucun article`)
          continue
        }
        
        let selectedArticle: NewsItem | null = null
        let articleIndex = 0
        
        // Chercher le premier article non-doublon
        while (articleIndex < articles.length && articleIndex < 5) { // Max 5 tentatives
          const article = articles[articleIndex]
          const normalizedTitle = normalizeTitle(article.title)
          
          if (!usedTitles.has(normalizedTitle)) {
            selectedArticle = article
            usedTitles.add(normalizedTitle)
            console.log(`📰 FranceInfo ${category}: Article #${articleIndex + 1} sélectionné: "${article.title}"`)
            break
          } else {
            console.log(`🔄 FranceInfo ${category}: Article #${articleIndex + 1} doublon détecté, passage au suivant`)
            articleIndex++
          }
        }
        
        if (selectedArticle) {
          newsItems.push({
            id: `franceinfo-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'news',
            title: `📺 France Info ${category}`,
            subtitle: selectedArticle.title,
            url: selectedArticle.link,
            source: 'franceinfo'
          })
        } else {
          console.warn(`⚠️ FranceInfo ${category}: Tous les articles sont des doublons!`)
        }
      }

      // KORBEN - Articles récents (pas forcément du jour exact)
      console.log('📰 Récupération Korben...')
      const korbenArticles = await this.fetchRSSFeed(this.RSS_SOURCES.korben)
      console.log(`📰 Korben: ${korbenArticles.length} articles récupérés`)
      
      if (korbenArticles.length > 0) {
        // Prendre les 3 articles les plus récents (pas forcément d'aujourd'hui)
        const recentKorben = korbenArticles.slice(0, 3)
        
        recentKorben.forEach((article, index) => {
          console.log(`📰 Korben ${index + 1}: "${article.title}" (${article.pubDate})`)
          newsItems.push({
            id: `korben-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'news',
            title: '🚀 Korben.info',
            subtitle: article.title,
            url: article.link,
            source: 'korben'
          })
        })
      } else {
        console.warn('⚠️ Korben: Aucun article récupéré')
      }

      // IT-CONNECT - 2 derniers articles
      console.log('📰 Récupération IT-Connect...')
      const itConnectArticles = await this.fetchRSSFeed(this.RSS_SOURCES.itconnect)
      console.log(`📰 IT-Connect: ${itConnectArticles.length} articles récupérés`)
      
      itConnectArticles.slice(0, 2).forEach((article, index) => {
        console.log(`📰 IT-Connect ${index + 1}: "${article.title}"`)
        newsItems.push({
          id: `itconnect-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'news',
          title: '💻 IT-Connect',
          subtitle: article.title,
          url: article.link,
          source: 'itconnect'
        })
      })

      console.log(`✅ ${newsItems.length} articles finaux récupérés (anti-doublons appliqué):`)
      newsItems.forEach(item => {
        console.log(`  - ${item.title}: "${item.subtitle}"`)
      })
      
      return newsItems
      
    } catch (error) {
      console.error('❌ Erreur récupération news:', error)
      return newsItems
    }
  }

  // 🖱️ OUVERTURE CONTENU SUR PC
  async openContentOnPC(url: string): Promise<boolean> {
    try {
      console.log(`🔗 Ouverture sur PC: ${url}`)
      
      const response = await fetch('http://192.168.1.27:8080/content/open_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ URL ouverte sur PC:', result)
        return result.success || true
      }
      
      return false
    } catch (error) {
      console.error('❌ Erreur ouverture URL PC:', error)
      return false
    }
  }

  // 🔄 ROTATION INTELLIGENTE - MODIFIÉE pour persistance hydratation
  getContentRotation(): ContentItem[] {
    // Séparer hydratation vs autres contenus
    const hydrationItems = contentData.items.filter(item => item.type === 'hydration')
    const otherItems = contentData.items.filter(item => item.type !== 'hydration')
    
    // 🚨 PRIORITÉ ABSOLUE : Si hydratation due ET présent → BLOQUER LA ROTATION
    if (hydrationItems.length > 0 && contentData.isPresent) {
      console.log('💧 Hydratation due + présence détectée → Blocage rotation sur hydratation')
      return hydrationItems // SEULEMENT l'hydratation, pas de rotation
    }
    
    // Sinon rotation normale : météo puis news
    const weatherItems = otherItems.filter(item => item.type === 'weather')
    const newsItems = otherItems.filter(item => item.type === 'news')
    
    return [...weatherItems, ...newsItems]
  }

  // 💧 LOGIQUE HYDRATATION - Ajout d'une méthode helper pour vérifier l'état
  hasUnacknowledgedHydration(): boolean {
    return contentData.isPresent && this.shouldTriggerHydration()
  }

  // 🚀 DÉMARRAGE SERVICE
  async startService(): Promise<void> {
    console.log('🚀 Démarrage ContentService...')
    
    // Vérification présence toutes les 5 minutes (plus fréquent pour détection)
    this.presenceCheckInterval = window.setInterval(async () => {
      const wasPresent = contentData.isPresent
      await this.checkPresence()
      
      // Si changement d'état de présence → refresh contenu
      if (wasPresent !== contentData.isPresent) {
        console.log(`🚶 Changement présence: ${wasPresent} → ${contentData.isPresent}`)
        await this.refreshContent()
      }
    }, 5 * 60 * 1000) // 5 minutes au lieu de 15
    
    // Refresh contenu toutes les heures
    this.contentRefreshInterval = window.setInterval(async () => {
      await this.refreshContent()
    }, 60 * 60 * 1000)
    
    // Première vérification immédiate
    await this.checkPresence()
    await this.refreshContent()
    
    console.log('✅ ContentService démarré')
  }

  async refreshContent(): Promise<void> {
    try {
      const newItems = await this.fetchAllContent()
      contentData.items = newItems
      contentData.lastUpdate = new Date()
      console.log(`🔄 Contenu actualisé: ${newItems.length} éléments`)
    } catch (error) {
      console.error('❌ Erreur actualisation contenu:', error)
    }
  }

  stopService(): void {
    if (this.presenceCheckInterval) {
      clearInterval(this.presenceCheckInterval)
      this.presenceCheckInterval = undefined
    }
    
    if (this.contentRefreshInterval) {
      clearInterval(this.contentRefreshInterval)
      this.contentRefreshInterval = undefined
    }
    
    console.log('🛑 ContentService arrêté')
  }
}

export const contentService = new ContentService()