// popup.js - Script séparé pour éviter les erreurs CSP
console.log('🎵 Popup YouTube Music Controller chargé')

// Éléments DOM
const statusEl = document.getElementById('status')
const testBtn = document.getElementById('testBtn')
const playBtn = document.getElementById('playBtn')
const nextBtn = document.getElementById('nextBtn')

// État de l'extension
let currentStatus = null

// Vérifier le statut au chargement
async function checkStatus() {
  try {
    // Envoyer message au background script pour récupérer le statut
    const response = await chrome.runtime.sendMessage({ action: 'get_status' })
    updateStatusDisplay(response)
  } catch (error) {
    console.error('❌ Erreur récupération statut:', error)
    updateStatusDisplay({ connected: false, error: 'Erreur communication' })
  }
}

// Mettre à jour l'affichage du statut
function updateStatusDisplay(status) {
  currentStatus = status
  
  if (status && status.connected) {
    statusEl.className = 'status connected'
    statusEl.innerHTML = `
      <div><strong>✅ Connecté</strong></div>
      <div style="margin-top: 4px; font-size: 12px;">
        ${status.title || 'YouTube Music'}<br>
        ${status.artist ? `par ${status.artist}` : ''}
        ${status.isPlaying ? ' ▶️' : ' ⏸️'}
      </div>
    `
  } else {
    statusEl.className = 'status disconnected' 
    statusEl.innerHTML = `
      <div><strong>❌ Déconnecté</strong></div>
      <div style="margin-top: 4px; font-size: 12px;">
        ${status?.error || 'YouTube Music non détecté'}
      </div>
    `
  }
}

// Boutons de test
testBtn.addEventListener('click', async () => {
  console.log('🧪 Test connexion...')
  testBtn.textContent = '...'
  
  try {
    await checkStatus()
    testBtn.textContent = 'Test'
  } catch (error) {
    console.error('❌ Test échoué:', error)
    testBtn.textContent = '❌'
    setTimeout(() => {
      testBtn.textContent = 'Test'
    }, 2000)
  }
})

playBtn.addEventListener('click', async () => {
  console.log('🎵 Test Play/Pause')
  playBtn.textContent = '...'
  
  try {
    await chrome.runtime.sendMessage({ action: 'play_pause' })
    setTimeout(() => {
      playBtn.textContent = '▶️'
    }, 1000)
  } catch (error) {
    console.error('❌ Erreur play/pause:', error)
    playBtn.textContent = '❌'
    setTimeout(() => {
      playBtn.textContent = '▶️'
    }, 2000)
  }
})

nextBtn.addEventListener('click', async () => {
  console.log('⏭️ Test Next Track')
  nextBtn.textContent = '...'
  
  try {
    await chrome.runtime.sendMessage({ action: 'next_track' })
    setTimeout(() => {
      nextBtn.textContent = '⏭️'
    }, 1000)
  } catch (error) {
    console.error('❌ Erreur next track:', error)
    nextBtn.textContent = '❌'
    setTimeout(() => {
      nextBtn.textContent = '⏭️'
    }, 2000)
  }
})

// Écouter les mises à jour du background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'status_update') {
    updateStatusDisplay(message.data)
  }
})

// Vérifier le statut au chargement
document.addEventListener('DOMContentLoaded', () => {
  checkStatus()
  
  // Mise à jour périodique
  setInterval(checkStatus, 5000)
})

console.log('✅ Popup script initialisé')