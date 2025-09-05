// content.js — tourne dans le contexte "content script" de l’onglet YTM

// Évite les doubles injections si la page se re-render
if (!window.__YTM_BRIDGE_CONTENT__) {
  window.__YTM_BRIDGE_CONTENT__ = true;

  // 1) Injecter le script page (injected.js) dans le vrai contexte page
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('injected.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}

  // 2) Relai PAGE -> SW (background)
  window.addEventListener('message', (e) => {
    // On n'accepte que les messages émis par la page elle-même
    if (e.source !== window) return;
    const msg = e.data;
    if (!msg || msg.__from !== 'YTM_PAGE') return;
    // Relay vers le SW (service worker)
    chrome.runtime.sendMessage(msg);
  });

  // 3) Relai SW -> PAGE (et ping)
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    // ping pour s'assurer que le bridge est prêt
    if (msg && msg.__to === 'YTM_CONTENT' && msg.ping) {
      sendResponse({ ok: true });
      return; // pas besoin de return true
    }

    if (msg && msg.__to === 'YTM_CONTENT') {
      // Relai vers la page (injected.js écoute __to:'YTM_PAGE')
      window.postMessage(
        { __to: 'YTM_PAGE', id: msg.id, method: msg.method, params: msg.params || [] },
        '*'
      );
      // Très important: répondre pour éviter "message port closed…"
      sendResponse({ ok: true });
      return; // pas besoin de return true ici non plus
    }
    // pas pour nous
  });
}
