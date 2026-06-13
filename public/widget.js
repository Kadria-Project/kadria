;(function () {
  'use strict'

  // Récupère le script actuel pour lire data-artisan-id
  const scripts = document.getElementsByTagName('script')
  const currentScript = scripts[scripts.length - 1]
  const artisanId = currentScript.getAttribute('data-artisan-id') || 'Artisan_demo'
  const baseUrl = currentScript.src.replace('/widget.js', '')

  // Évite la double initialisation
  if (window.__kadria_initialized) return
  window.__kadria_initialized = true

  // Config par défaut
  let primaryColor = '#22c55e'
  let isOpen = false

  // Charge la config artisan
  fetch(`${baseUrl}/api/artisan/public-config?artisan_id=${artisanId}`)
    .then(r => r.json())
    .then(data => {
      if (data.success && data.config) {
        primaryColor = data.config.primaryColor || '#22c55e'
        updateBubbleColor()
      }
    })
    .catch(() => {})

  // ── Styles globaux ──────────────────────────────────────────────────────
  const style = document.createElement('style')
  style.textContent = `
    #kadria-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      z-index: 999998;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      outline: none;
    }
    #kadria-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(0,0,0,0.3);
    }
    #kadria-bubble svg {
      width: 26px;
      height: 26px;
    }
    #kadria-overlay {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 420px;
      height: 640px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      border-radius: 20px;
      overflow: hidden;
      z-index: 999999;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      display: none;
      border: 1px solid rgba(255,255,255,0.08);
    }
    #kadria-overlay.kadria-open {
      display: block;
      animation: kadria-slide-up 0.25s ease;
    }
    #kadria-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    #kadria-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0,0,0,0.4);
      border: none;
      color: white;
      cursor: pointer;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
    }
    @keyframes kadria-slide-up {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)   scale(1);     }
    }
    @media (max-width: 480px) {
      #kadria-overlay {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 85vh;
        max-width: 100vw;
        border-radius: 20px 20px 0 0;
      }
    }
  `
  document.head.appendChild(style)

  // ── Bulle ────────────────────────────────────────────────────────────────
  const bubble = document.createElement('button')
  bubble.id = 'kadria-bubble'
  bubble.setAttribute('aria-label', 'Ouvrir le chat')
  bubble.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="white"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `

  // ── Overlay ──────────────────────────────────────────────────────────────
  const overlay = document.createElement('div')
  overlay.id = 'kadria-overlay'

  const closeBtn = document.createElement('button')
  closeBtn.id = 'kadria-close'
  closeBtn.innerHTML = '✕'
  closeBtn.setAttribute('aria-label', 'Fermer')

  const iframe = document.createElement('iframe')
  iframe.id = 'kadria-iframe'
  iframe.title = 'Kadria — Assistant de qualification'
  iframe.setAttribute('allow', 'microphone')
  // L'iframe ne se charge qu'à l'ouverture (lazy)
  iframe.setAttribute('data-src',
    `${baseUrl}/widget-embed?artisan_id=${artisanId}`)

  overlay.appendChild(closeBtn)
  overlay.appendChild(iframe)

  // ── Toggle ───────────────────────────────────────────────────────────────
  function open() {
    // Charge l'iframe au premier clic seulement
    if (!iframe.src && iframe.dataset.src) {
      iframe.src = iframe.dataset.src
    }
    isOpen = true
    overlay.classList.add('kadria-open')
    bubble.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="white"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    `
  }

  function close() {
    isOpen = false
    overlay.classList.remove('kadria-open')
    bubble.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="white"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `
  }

  bubble.addEventListener('click', () => isOpen ? close() : open())
  closeBtn.addEventListener('click', close)

  // Ferme si clic en dehors
  document.addEventListener('click', e => {
    if (isOpen &&
        !overlay.contains(e.target) &&
        !bubble.contains(e.target)) {
      close()
    }
  })

  function updateBubbleColor() {
    bubble.style.background = primaryColor
  }

  // ── Inject ───────────────────────────────────────────────────────────────
  document.body.appendChild(bubble)
  document.body.appendChild(overlay)

  // Message depuis l'iframe (ex: fermer après soumission)
  window.addEventListener('message', e => {
    if (e.data === 'kadria:close') close()
    if (e.data === 'kadria:submitted') {
      // Optionnel : confetti ou message de succès sur le site hôte
      setTimeout(close, 3000)
    }
  })

})()
