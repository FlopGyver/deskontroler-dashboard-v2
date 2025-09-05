// injected.js — Version fonctionnelle avec extraction sidebar + bouton play (FIX DOMException)
(function () {
  const ORIGIN = 'YTM_PAGE';
  const log = (...a) => { try { console.log('[YTM injected]', ...a); } catch {} };

  // Sniffer pour debug (optionnel)
  (function installBrowseSniffer(){
    const origFetch = window.fetch;
    window.fetch = async function(input, init){
      const url = (typeof input === 'string') ? input : input?.url || '';
      const isBrowse = url.includes('/youtubei/v1/browse');
      if (isBrowse && init?.body) {
        try {
          const payload = JSON.parse(init.body);
          log('→ browse payload', payload);
        } catch {}
      }
      const res = await origFetch.apply(this, arguments);
      if (isBrowse) {
        try {
          const clone = res.clone();
          const json = await clone.json();
          log('← browse response', json);
        } catch (e) {
          console.warn('[YTM sniffer] parse fail', e);
        }
      }
      return res;
    };
  })();

  // ---------- INNERTUBE HELPERS (gardés pour compatibilité) ----------
  function ytcfgObj() {
    return (window.ytcfg && typeof window.ytcfg.get === 'function') ? window.ytcfg : null;
  }
  
  async function waitForKeyCtx(timeout = 5000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
      const y = ytcfgObj();
      if (y) {
        const key = y.get('INNERTUBE_API_KEY') || y.data_?.INNERTUBE_API_KEY;
        let ctx  = y.get('INNERTUBE_CONTEXT')   || y.data_?.INNERTUBE_CONTEXT;
        const name    = y.get('INNERTUBE_CLIENT_NAME')    || y.data_?.INNERTUBE_CLIENT_NAME || 'WEB_REMIX';
        const version = y.get('INNERTUBE_CLIENT_VERSION') || y.data_?.INNERTUBE_CLIENT_VERSION || '';
        const visitor = y.get('VISITOR_DATA')             || y.data_?.VISITOR_DATA || '';
        if (key && ctx) {
          if (typeof ctx === 'string') { try { ctx = JSON.parse(ctx); } catch {} }
          return { key, ctx, name, version, visitor };
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('INNERTUBE key/context indisponibles');
  }
  
  async function ytmFetch(path, payload) {
    const { key, ctx, name, version, visitor } = await waitForKeyCtx();
    const headers = {
      'content-type': 'application/json',
      'x-youtube-client-name': String(name),
      'x-youtube-client-version': String(version),
      'x-goog-visitor-id': String(visitor),
      'x-origin': 'https://music.youtube.com'
    };
    const url  = `https://music.youtube.com/youtubei/v1/${path}?prettyPrint=false&key=${encodeURIComponent(key)}`;
    const body = JSON.stringify(Object.assign({ context: ctx }, payload || {}));
    const res = await fetch(url, { method: 'POST', credentials: 'same-origin', headers, body });
    if (!res.ok) { 
      const t = await res.text().catch(()=> ''); 
      throw new Error(`HTTP ${res.status} — ${t.slice(0,120)}`); 
    }
    return res.json();
  }

  // ---------- HELPERS UTILITAIRES ----------
  const T = runs => (runs && runs[0] ? runs[0].text : '');
  const thumbUrl = thumbs => {
    const arr = Array.isArray(thumbs) ? thumbs : thumbs?.thumbnails;
    if (!Array.isArray(arr)) return '';
    return arr.reduce((p,c)=> (c.width > (p?.width||0) ? c : p), {}).url || '';
  };
  
  function walk(o, visit){
    if (!o) return;
    if (Array.isArray(o)) { 
      for (const v of o) walk(v,visit); 
      return; 
    }
    if (typeof o === 'object') { 
      visit(o); 
      for (const v of Object.values(o)) walk(v,visit); 
    }
  }

  // ---------- EXTRACTION PLAYLISTS SIDEBAR (MÉTHODE QUI MARCHE) ----------
  async function getPlaylists() {
    log('🎵 getPlaylists() - Extraction sidebar...');
    
    try {
      // 1. Extraire toutes les entrées de la sidebar
      const guideEntries = document.querySelectorAll('ytmusic-guide-entry-renderer');
      log(`📊 ${guideEntries.length} entrées guide trouvées`);
      
      if (guideEntries.length === 0) {
        log('❌ Aucune entrée guide trouvée');
        return [];
      }
      
      const playlists = [];
      
      // 2. Parcourir et filtrer les playlists personnelles
      guideEntries.forEach((entry, index) => {
        try {
          const titleEl = entry.querySelector('yt-formatted-string.title');
          const subtitleEl = entry.querySelector('yt-formatted-string.subtitle');
          
          const title = titleEl ? titleEl.textContent.trim() : '';
          const subtitle = subtitleEl ? subtitleEl.textContent.trim() : '';
          
          // Filtrer seulement les playlists de Florian VALLET
          if (title && subtitle === 'Florian VALLET') {
            // Essayer de récupérer l'ID réel via clic simulé ou navigation
            const playlistId = extractPlaylistIdFromEntry(entry, title, index);
            
            // ✅ FIX: Objet nettoyé SANS références DOM
            playlists.push({
              id: playlistId,
              title: title,
              owner: subtitle,
              thumbnail: '' // Pas de thumbnail dans sidebar
            });
            
            log(`✅ Playlist: "${title}" (${playlistId})`);
          }
        } catch (e) {
          console.warn(`[YTM] Erreur entrée ${index}:`, e);
        }
      });
      
      log(`🎯 ${playlists.length} playlists personnelles extraites`);
      return playlists;
      
    } catch (error) {
      console.error('[YTM] Erreur getPlaylists:', error);
      return [];
    }
  }

  // Extraire l'ID de playlist depuis une entrée
  function extractPlaylistIdFromEntry(entry, title, index) {
    // Méthode 1: Chercher des liens avec list= 
    const links = entry.querySelectorAll('a[href*="list="], [href*="list="]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/list=([^&]+)/);
      if (match && match[1].startsWith('PL')) {
        return match[1];
      }
    }
    
    // Méthode 2: Chercher dans les attributs data
    const dataElements = entry.querySelectorAll('[data-list-id], [data-playlist-id]');
    for (const el of dataElements) {
      const dataId = el.getAttribute('data-list-id') || el.getAttribute('data-playlist-id');
      if (dataId && dataId.startsWith('PL')) {
        return dataId;
      }
    }
    
    // Méthode 3: ID temporaire unique (sera résolu au clic)
    return `PLAYLIST_${index}_${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}`;
  }

  // ---------- LANCEMENT PLAYLIST (MÉTHODE QUI MARCHE) ----------
  async function playPlaylist(playlistId) {
    log(`🎵 playPlaylist(${playlistId})`);
    
    try {
      // Si c'est un ID temporaire, trouver l'entrée correspondante
      if (playlistId.startsWith('PLAYLIST_')) {
        return await playPlaylistByTempId(playlistId);
      }
      
      // Si c'est un vrai ID, navigation directe
      if (playlistId.startsWith('PL')) {
        const playlistUrl = `https://music.youtube.com/playlist?list=${playlistId}`;
        log(`🎯 Navigation directe: ${playlistUrl}`);
        window.location.assign(playlistUrl);
        return { success: true, method: 'direct-navigation', id: playlistId };
      }
      
      throw new Error(`ID playlist non reconnu: ${playlistId}`);
      
    } catch (error) {
      console.error('[YTM] Erreur playPlaylist:', error);
      throw error;
    }
  }

  // Lancer playlist via ID temporaire (utilise le bouton play)
  async function playPlaylistByTempId(tempId) {
    log(`🎵 playPlaylistByTempId(${tempId})`);
    
    // Extraire l'index depuis l'ID temporaire
    const match = tempId.match(/^PLAYLIST_(\d+)_/);
    if (!match) {
      throw new Error(`Format ID temporaire invalide: ${tempId}`);
    }
    
    const index = parseInt(match[1]);
    
    // ✅ FIX: RE-QUERY en temps réel (pas de cache DOM)
    const guideEntries = document.querySelectorAll('ytmusic-guide-entry-renderer');
    if (index >= guideEntries.length) {
      throw new Error(`Index ${index} hors limites (${guideEntries.length} entrées)`);
    }
    
    const entry = guideEntries[index];
    const titleEl = entry.querySelector('yt-formatted-string.title');
    const title = titleEl ? titleEl.textContent.trim() : `Playlist ${index}`;
    
    log(`🎯 Entrée trouvée: "${title}"`);
    
    // Méthode 1: Essayer le bouton play direct
    const playButton = entry.querySelector('ytmusic-play-button-renderer#play-button');
    if (playButton) {
      log('🖱️ Clic bouton play...');
      playButton.click();
      
      // Attendre et vérifier le résultat
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier si la lecture a commencé
      const isPlaying = checkIfPlaying();
      if (isPlaying) {
        log(`✅ Playlist "${title}" lancée via bouton play`);
        return { 
          success: true, 
          method: 'play-button', 
          title, 
          id: tempId,
          realId: getCurrentPlaylistId()
        };
      }
    }
    
    // Méthode 2: Clic sur l'entrée puis attendre l'ID réel
    log('🖱️ Clic sur entrée pour navigation...');
    const clickableElement = entry.querySelector('tp-yt-paper-item') || entry;
    clickableElement.click();
    
    // Attendre le changement d'URL
    await waitForUrlChange(2000);
    
    const currentUrl = window.location.href;
    if (currentUrl.includes('playlist?list=')) {
      const urlParams = new URLSearchParams(new URL(currentUrl).search);
      const realId = urlParams.get('list');
      
      log(`✅ Playlist "${title}" ouverte, ID réel: ${realId}`);
      return { 
        success: true, 
        method: 'navigation-click', 
        title, 
        id: tempId,
        realId: realId,
        url: currentUrl
      };
    }
    
    throw new Error(`Échec lancement playlist "${title}"`);
  }

  // ---------- HELPERS PLAYLIST ----------
  
  function checkIfPlaying() {
    const playButton = document.querySelector('[data-tooltip-target-id="play-pause-button"]');
    if (playButton) {
      const ariaLabel = playButton.getAttribute('aria-label') || '';
      return ariaLabel.toLowerCase().includes('pause');
    }
    return false;
  }
  
  function getCurrentPlaylistId() {
    if (window.location.href.includes('playlist?list=')) {
      const urlParams = new URLSearchParams(new URL(window.location.href).search);
      return urlParams.get('list');
    }
    return null;
  }
  
  function waitForUrlChange(timeout = 2000) {
    return new Promise((resolve) => {
      const originalUrl = window.location.href;
      const startTime = Date.now();
      
      const checkUrl = () => {
        if (window.location.href !== originalUrl) {
          resolve(true);
        } else if (Date.now() - startTime < timeout) {
          setTimeout(checkUrl, 100);
        } else {
          resolve(false);
        }
      };
      
      checkUrl();
    });
  }

  // Debug
  async function debugHome() { 
    const r = await ytmFetch('browse', { browseId: 'FEmusic_home' }); 
    log('home debug ►', r); 
    return { ok: true }; 
  }

  // ---------- API EXPOSÉE ----------
  const api = { 
    getPlaylists,      // ✅ Version sidebar fonctionnelle (FIX postMessage)
    playPlaylist,      // ✅ Via bouton play + navigation (FIX re-query)
    debugHome          // 🔧 Debug
  };
  
  // ---------- RPC LISTENER ----------
  window.addEventListener('message', async (e) => {
    const msg = e.data;
    if (!msg || msg.__to !== ORIGIN) return;
    const { id, method, params } = msg;
    
    log(`🎯 RPC: ${method}`, params);
    
    try {
      if (!api[method]) throw new Error('unknown method ' + method);
      const result = await api[method].apply(null, params || []);
      log(`✅ RPC ${method} OK:`, result?.length || result);
      
      // ✅ Le résultat est maintenant "propre" - plus d'erreur postMessage
      window.postMessage({ __from: ORIGIN, id, ok: true, result }, '*');
    } catch (err) {
      console.error(`[YTM] RPC ${method} erreur:`, err);
      window.postMessage({ __from: ORIGIN, id, ok: false, error: String(err) }, '*');
    }
  });

  log('injected.js ready - Version sidebar + play button (FIX DOMException)');
})();