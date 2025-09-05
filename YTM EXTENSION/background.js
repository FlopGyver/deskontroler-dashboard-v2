// background.js - Extension Chrome pour YouTube Music Controller
console.log('🎵 YouTube Music Extension - Version Bridge Python')

// =====================================================
// CONFIGURATION
// =====================================================

const BRIDGE_CONFIG = {
  websocketUrl: 'ws://192.168.1.27:8081',
  reconnectDelay: 5000,
  maxReconnectAttempts: 5
}
const RPC_TIMEOUT_MS = 25000;

// =====================================================
// ÉTAT DE L'EXTENSION
// =====================================================

const state = {
  // Connexions dashboard (pour compatibilité extension directe)
  dashboardConnections: new Set(),
  
  // Onglets YouTube Music
  ytmTabs: new Map(),
  lastStatus: null,
  
  // Bridge Python WebSocket
  bridgeWebSocket: null,
  bridgeConnected: false,
  bridgeReconnectAttempts: 0,
  bridgeReconnectTimer: null
}

// =====================================================
// CONNEXION WEBSOCKET VERS BRIDGE PYTHON
// =====================================================

function connectToBridge() {
  if (state.bridgeConnected || state.bridgeReconnectAttempts >= BRIDGE_CONFIG.maxReconnectAttempts) {
    return
  }

  console.log(`🔌 Connexion Bridge Python (${state.bridgeReconnectAttempts + 1}/${BRIDGE_CONFIG.maxReconnectAttempts})`)
  
  try {
    state.bridgeWebSocket = new WebSocket(BRIDGE_CONFIG.websocketUrl)
    
    state.bridgeWebSocket.onopen = () => {
      console.log('✅ Bridge Python connecté')
      state.bridgeConnected = true
      state.bridgeReconnectAttempts = 0
      
      // Envoyer le statut initial si disponible
      if (state.lastStatus) {
        sendStatusToBridge(state.lastStatus)
      }
      
      // Démarrer le monitoring YouTube Music
      startYTMMonitoring()
    }

    // --- handler messages reçus du bridge Python via WebSocket ---
    state.bridgeWebSocket.onmessage = async (evt) => {
      let msg
      try { msg = JSON.parse(evt.data) } catch { return }

      // Nouveau protocole: requêtes "query": {type:'query', id, method:'getPlaylists', params:[]}
      if (msg.type === 'query' && msg.id && msg.method) {
        try {
          const result = await callPage(msg.method, msg.params || [])
          state.bridgeWebSocket?.send(JSON.stringify({ type: 'query_result', id: msg.id, ok: true, result }))
        } catch (e) {
          state.bridgeWebSocket?.send(JSON.stringify({ type: 'query_result', id: msg.id, ok: false, error: String(e) }))
        }
        return
      }

      // Ancien/compat: on garde le handler historique
      try {
        handleBridgeMessage(msg)
      } catch (error) {
        console.error('❌ Erreur parsing message Bridge:', error)
      }
    }
    
    state.bridgeWebSocket.onclose = () => {
      console.warn('📤 Bridge Python déconnecté')
      state.bridgeConnected = false
      state.bridgeWebSocket = null
      
      // Reconnexion automatique
      if (state.bridgeReconnectAttempts < BRIDGE_CONFIG.maxReconnectAttempts) {
        state.bridgeReconnectAttempts++
        state.bridgeReconnectTimer = setTimeout(() => {
          connectToBridge()
        }, BRIDGE_CONFIG.reconnectDelay)
      } else {
        console.error('❌ Limite reconnexions Bridge atteinte')
      }
    }
    
    state.bridgeWebSocket.onerror = (error) => {
      console.error('❌ Erreur WebSocket Bridge:', error)
    }
    
  } catch (error) {
    console.error('❌ Erreur création WebSocket:', error)
    state.bridgeReconnectAttempts++
  }
}

async function handleBridgeMessage(message) {
  console.log('📨 Message Bridge:', message.type)
  
  switch (message.type) {
    case 'connected':
      console.log('🎯 Bridge prêt:', message.message)
      break
      
    case 'command':
      // ✅ FIX: Passer les data de la commande
      const command = message.data
      console.log('🎵 Commande Bridge reçue:', command.action, command)
      await executeBridgeCommand(command.action, command)  // ← Passer command en entier
      break
      
    case 'pong':
      break

    case 'query': {
      const { kind, nonce } = message
      try {
        let result = []
        if (kind === 'playlists') result = await callPage('getPlaylists')
        else if (kind === 'recents') result = await callPage('getRecents')
        else if (kind === 'podcasts') result = await callPage('getPodcasts')
        else throw new Error('unknown kind')

        state.bridgeWebSocket?.send(JSON.stringify({
          type: 'queryResult', kind, nonce, items: result
        }))
      } catch (e) {
        state.bridgeWebSocket?.send(JSON.stringify({
          type: 'queryResult', kind, nonce, error: String(e)
        }))
      }
      break
    }
      
    default:
      console.warn('❓ Message Bridge inconnu:', message.type)
  }
}

async function executeBridgeCommand(action, commandData = null) {
  console.log(`🎵 Exécution commande Bridge: ${action}`)
  
  try {
    let result = null
    
    switch (action) {
      case 'play_pause':
        result = await executeYTMCommand('togglePlay')
        break
      case 'next_track':
        result = await executeYTMCommand('nextTrack')
        break
      case 'previous_track':
        result = await executeYTMCommand('previousTrack')
        break
        
      // ✅ FIX: Un seul cas play_playlist avec bon paramètre
      case 'play_playlist':
        const playlistId = commandData?.playlist_id;
        if (playlistId) {
          console.log(`🎵 Lancement playlist: ${playlistId}`)
          result = await callPage('playPlaylist', [playlistId]);
        } else {
          console.warn('❌ playlist_id manquant pour play_playlist');
          result = { success: false, error: 'playlist_id manquant' };
        }
        break
        
      case 'play_track':
        result = await callPage('playTrack', [commandData?.id, commandData?.playlistId || null])
        break
        
      default:
        console.warn('❌ Action Bridge inconnue:', action)
        return
    }
    
    // Envoyer le résultat au Bridge
    if (state.bridgeConnected && state.bridgeWebSocket) {
      state.bridgeWebSocket.send(JSON.stringify({
        type: 'command_result',
        result: result,
        timestamp: new Date().toISOString()
      }))
    }
    
    // Mettre à jour le statut après commande
    setTimeout(async () => {
      const newStatus = await getYouTubeMusicStatus()
      sendStatusToBridge(newStatus)
      broadcastToAll({ type: 'status_update', data: newStatus })
    }, 500)
    
  } catch (error) {
    console.error('❌ Erreur exécution commande Bridge:', error)
  }
}

function sendStatusToBridge(status) {
  if (state.bridgeConnected && state.bridgeWebSocket) {
    try {
      state.bridgeWebSocket.send(JSON.stringify({
        type: 'status_update',
        data: status,
        timestamp: new Date().toISOString()
      }))
      
      console.log('📊 Statut envoyé au Bridge:', status.title, status.isPlaying ? '▶️' : '⏸️')
    } catch (error) {
      console.error('❌ Erreur envoi statut Bridge:', error)
    }
  }
}

function startYTMMonitoring() {
  // Envoyer le statut toutes les 3 secondes si connecté au bridge
  setInterval(async () => {
    if (state.bridgeConnected) {
      const status = await getYouTubeMusicStatus()
      sendStatusToBridge(status)
    }
  }, 3000)
}

// =====================================================
// CONNEXIONS DASHBOARD DIRECTES (pour PC local)
// =====================================================

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'ytm-dashboard') {
    console.log('📱 Dashboard local connecté')
    state.dashboardConnections.add(port)
    
    if (state.lastStatus) {
      port.postMessage({ 
        type: 'status_update', 
        data: state.lastStatus 
      })
    }
    
    port.onDisconnect.addListener(() => {
      state.dashboardConnections.delete(port)
    })
    
    port.onMessage.addListener(async (message) => {
      await handleDashboardCommand(message, port)
    })
  }
})

chrome.runtime.onConnectExternal.addListener((port) => {
  console.log('🌐 Dashboard externe connecté')
  
  if (port.name === 'ytm-dashboard') {
    state.dashboardConnections.add(port)
    
    if (state.lastStatus) {
      port.postMessage({ 
        type: 'status_update', 
        data: state.lastStatus 
      })
    }
    
    port.onDisconnect.addListener(() => {
      state.dashboardConnections.delete(port)
    })
    
    port.onMessage.addListener(async (message) => {
      await handleDashboardCommand(message, port)
    })
  }
})

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    let result = null
    
    switch (message.action) {
      case 'get_status':
        result = await getYouTubeMusicStatus()
        sendResponse(result)
        return true
        
      case 'play_pause':
        result = await executeYTMCommand('togglePlay')
        sendResponse(result)
        setTimeout(async () => {
          const newStatus = await getYouTubeMusicStatus()
          broadcastToAll({ type: 'status_update', data: newStatus })
          sendStatusToBridge(newStatus)
        }, 500)
        return true
        
      case 'next_track':
        result = await executeYTMCommand('nextTrack')
        sendResponse(result)
        setTimeout(async () => {
          const newStatus = await getYouTubeMusicStatus()
          broadcastToAll({ type: 'status_update', data: newStatus })
          sendStatusToBridge(newStatus)
        }, 500)
        return true
        
      case 'previous_track':
        result = await executeYTMCommand('previousTrack')
        sendResponse(result)
        setTimeout(async () => {
          const newStatus = await getYouTubeMusicStatus()
          broadcastToAll({ type: 'status_update', data: newStatus })
          sendStatusToBridge(newStatus)
        }, 500)
        return true
        
      default:
        sendResponse({ success: false, error: 'Action inconnue' })
        return true
    }
  } catch (error) {
    console.error('❌ Erreur traitement message:', error)
    sendResponse({ success: false, error: error.message })
    return true
  }
})

async function handleDashboardCommand(message, port) {
  try {
    let result = null
    
    switch (message.action) {
      case 'play_pause':
        result = await executeYTMCommand('togglePlay')
        break
      case 'next_track':
        result = await executeYTMCommand('nextTrack')
        break
      case 'previous_track':
        result = await executeYTMCommand('previousTrack')
        break
      case 'get_status':
        result = await getYouTubeMusicStatus()
        port.postMessage({ type: 'status_update', data: result })
        return
      default:
        console.warn('❌ Action inconnue:', message.action)
        port.postMessage({ type: 'error', message: 'Action inconnue' })
        return
    }
    
    if (result && result.success) {
      console.log('✅ Commande Dashboard exécutée:', message.action)
      
      setTimeout(async () => {
        const newStatus = await getYouTubeMusicStatus()
        broadcastToAll({ type: 'status_update', data: newStatus })
        sendStatusToBridge(newStatus)
      }, 500)
      
    } else {
      console.error('❌ Échec commande:', message.action)
      port.postMessage({ 
        type: 'error', 
        message: result?.error || 'Commande échouée' 
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur commande:', error)
    port.postMessage({ type: 'error', message: error.message })
  }
}

function broadcastToAll(message) {
  state.dashboardConnections.forEach(port => {
    try {
      port.postMessage(message)
    } catch (error) {
      state.dashboardConnections.delete(port)
    }
  })
}

// =====================================================
// CONTRÔLE YOUTUBE MUSIC
// =====================================================

async function executeYTMCommand(action) {
  try {
    const tabs = await chrome.tabs.query({
      url: 'https://music.youtube.com/*'
    })
    
    if (tabs.length === 0) {
      return { success: false, error: 'YouTube Music non ouvert' }
    }
    
    const ytmTab = tabs[0]
    console.log(`🎵 Exécution "${action}" sur onglet:`, ytmTab.id)
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: ytmTab.id },
      func: executeCommand,
      args: [action]
    })
    
    const result = results[0]?.result
    return result || { success: false, error: 'Pas de résultat' }
    
  } catch (error) {
    console.error('❌ Erreur exécution commande:', error)
    return { success: false, error: error.message }
  }
}

function executeCommand(action) {
  try {
    switch (action) {
      case 'togglePlay':
        const playSelectors = [
          '[data-tooltip-target-id="play-pause-button"]',
          '.play-pause-button',
          '[aria-label*="Play"], [aria-label*="Pause"]',
          'button[aria-label*="Play"], button[aria-label*="Pause"]',
          '.ytmusic-player-bar .middle-controls button:nth-child(2)'
        ]
        
        for (const selector of playSelectors) {
          const btn = document.querySelector(selector)
          if (btn) {
            btn.click()
            return { 
              success: true, 
              action: 'togglePlay', 
              selector: selector
            }
          }
        }
        
        // Fallback: touche espace
        document.dispatchEvent(new KeyboardEvent('keydown', {
          code: 'Space',
          key: ' ',
          keyCode: 32,
          bubbles: true
        }))
        
        return { success: true, action: 'togglePlay', method: 'keyboard' }
        
      case 'nextTrack':
        const nextSelectors = [
          '[data-tooltip-target-id="next-button"]',
          '.next-button',
          '[aria-label*="Next"]',
          'button[aria-label*="Next"]',
          '.ytmusic-player-bar .middle-controls button:nth-child(3)'
        ]
        
        for (const selector of nextSelectors) {
          const btn = document.querySelector(selector)
          if (btn) {
            btn.click()
            return { success: true, action: 'nextTrack', selector: selector }
          }
        }
        
        return { success: false, error: 'Bouton Next non trouvé' }
        
      case 'previousTrack':
        const prevSelectors = [
          '[data-tooltip-target-id="previous-button"]',
          '.previous-button',
          '[aria-label*="Previous"]',
          'button[aria-label*="Previous"]',
          '.ytmusic-player-bar .middle-controls button:nth-child(1)'
        ]
        
        for (const selector of prevSelectors) {
          const btn = document.querySelector(selector)
          if (btn) {
            btn.click()
            return { success: true, action: 'previousTrack', selector: selector }
          }
        }
        
        return { success: false, error: 'Bouton Previous non trouvé' }
        
      default:
        return { success: false, error: 'Action inconnue: ' + action }
    }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function getYouTubeMusicStatus() {
  try {
    const tabs = await chrome.tabs.query({
      url: 'https://music.youtube.com/*'
    })
    
    if (tabs.length === 0) {
      const status = { 
        connected: false, 
        error: 'YouTube Music non ouvert',
        timestamp: Date.now()
      }
      state.lastStatus = status
      return status
    }
    
    const ytmTab = tabs[0]
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: ytmTab.id },
      func: getMetadata
    })
    
    const status = results[0]?.result || { 
      connected: false, 
      error: 'Échec récupération métadonnées' 
    }
    
    state.lastStatus = status
    return status
    
  } catch (error) {
    const status = { 
      connected: false, 
      error: error.message,
      timestamp: Date.now()
    }
    state.lastStatus = status
    return status
  }
}

function getMetadata() {
  try {
    const titleSelectors = [
      '.title.style-scope.ytmusic-player-bar',
      '.content-info-wrapper .title',
      'yt-formatted-string.title',
      '.song-title'
    ]
    
    const artistSelectors = [
      '.subtitle.style-scope.ytmusic-player-bar',
      '.content-info-wrapper .subtitle',
      '.byline',
      '.song-subtitle'
    ]
    
    const artworkSelectors = [
      '#song-image img',
      '.thumbnail img',
      '.image img'
    ]
    
    let titleEl = null
    for (const selector of titleSelectors) {
      titleEl = document.querySelector(selector)
      if (titleEl && titleEl.textContent?.trim()) break
    }
    
    let artistEl = null
    for (const selector of artistSelectors) {
      artistEl = document.querySelector(selector)
      if (artistEl && artistEl.textContent?.trim()) break
    }
    
    let artworkEl = null
    for (const selector of artworkSelectors) {
      artworkEl = document.querySelector(selector)
      if (artworkEl && artworkEl.src) break
    }
    
    const playBtn = document.querySelector('[data-tooltip-target-id="play-pause-button"]') ||
                   document.querySelector('.play-pause-button')
    
    let isPlaying = false
    if (playBtn) {
      const ariaLabel = playBtn.getAttribute('aria-label') || ''
      const title = playBtn.getAttribute('title') || ''
      isPlaying = ariaLabel.toLowerCase().includes('pause') || 
                  title.toLowerCase().includes('pause')
    }
    
    return {
      connected: true,
      title: titleEl?.textContent?.trim() || 'Titre inconnu',
      artist: artistEl?.textContent?.trim() || '',
      artwork: artworkEl?.src || '',
      isPlaying: isPlaying,
      timestamp: Date.now(),
      url: window.location.href
    }
    
  } catch (error) {
    return { 
      connected: false, 
      error: error.message,
      timestamp: Date.now()
    }
  }
}

// =====================================================
// SURVEILLANCE ONGLETS YOUTUBE MUSIC
// =====================================================

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url?.includes('music.youtube.com')) {
    if (changeInfo.status === 'complete') {
      console.log('🎵 Onglet YouTube Music prêt:', tabId)
      state.ytmTabs.set(tabId, tab)
      
      setTimeout(async () => {
        const status = await getYouTubeMusicStatus()
        broadcastToAll({ type: 'ytm_tab_ready', data: status })
        sendStatusToBridge(status)
      }, 2000)
    }
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  if (state.ytmTabs.has(tabId)) {
    console.log('🎵 Onglet YouTube Music fermé:', tabId)
    state.ytmTabs.delete(tabId)
    
    const status = { 
      connected: false, 
      error: 'YouTube Music fermé',
      timestamp: Date.now()
    }
    state.lastStatus = status
    
    broadcastToAll({ type: 'ytm_tab_closed', data: status })
    sendStatusToBridge(status)
  }
})

// ===========================================
// Appelle une méthode exposée par injected.js
// ===========================================
async function findYtmTabs() {
  const tabs = await chrome.tabs.query({
    url: ['https://music.youtube.com/*', 'https://*.music.youtube.com/*']
  });
  tabs.sort((a, b) => Number(b.active) - Number(a.active));
  return tabs;
}

// (optionnel) essaie d’amorcer le content-script si pas encore injecté
async function ensureBridge(tabId) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { __to: 'YTM_CONTENT', ping: true }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId }, files: ['content.js'] },
          () => {
            chrome.tabs.sendMessage(tabId, { __to: 'YTM_CONTENT', ping: true }, () => resolve(true));
          }
        );
      } else {
        resolve(true);
      }
    });
  });
}

async function callPage(method, params = []) {
  const tabs = await findYtmTabs();
  if (!tabs.length) throw new Error('YouTube Music non ouvert');

  const id = Math.random().toString(36).slice(2);
  const payload = { __to: 'YTM_CONTENT', id, method, params };

  return await new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, RPC_TIMEOUT_MS);

    const tabIds = tabs.map(t => t.id).filter(Boolean);
    let resolved = false;

    function cleanup() {
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(onMsg);
    }

    function onMsg(msg, sender) {
      if (resolved) return;
      if (msg?.__from === 'YTM_PAGE' && msg.id === id && sender?.tab?.id && tabIds.includes(sender.tab.id)) {
        cleanup();
        resolved = true;
        if (msg.ok) resolve(msg.result);
        else reject(new Error(msg.error || 'rpc error'));
      }
    }

    chrome.runtime.onMessage.addListener(onMsg);

    for (const tabId of tabIds) {
      await ensureBridge(tabId);
      chrome.tabs.sendMessage(tabId, payload, () => {
        // ignore errors; another tab may respond
      });
    }
  });
}

// =====================================================
// DÉMARRAGE
// =====================================================

console.log('✅ Extension YouTube Music Controller prête')

// Connecter au Bridge Python après un délai
setTimeout(() => {
  connectToBridge()
}, 1000)

// Polling périodique pour les dashboards directs (si pas de bridge)
setInterval(async () => {
  if (state.dashboardConnections.size > 0) {
    try {
      const status = await getYouTubeMusicStatus()
      
      if (!state.lastStatus || 
          status.title !== state.lastStatus.title ||
          status.isPlaying !== state.lastStatus.isPlaying ||
          status.connected !== state.lastStatus.connected) {
        
        broadcastToAll({ type: 'status_update', data: status })
      }
      
    } catch (error) {
      // Ignorer les erreurs de polling
    }
  }
}, 3000)
