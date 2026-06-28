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
  let secondaryColor = ''
  let isOpen = false

  // Charge la config artisan
  fetch(`${baseUrl}/api/artisan/public-config?artisan_id=${artisanId}`)
    .then(r => r.json())
    .then(data => {
      if (data.success && data.config) {
        primaryColor = data.config.primaryColor || '#22c55e'
        secondaryColor = data.config.secondaryColor || ''
        updateBubbleColor()
        // Met à jour l'iframe src avec la couleur
        const iframeSrc = `${baseUrl}/widget-embed?artisan_id=${artisanId}&primary_color=${encodeURIComponent(primaryColor)}${secondaryColor ? `&secondary_color=${encodeURIComponent(secondaryColor)}` : ''}`
        iframe.setAttribute('data-src', iframeSrc)
        // Si l'iframe est déjà chargée, recharge avec la bonne couleur
        if (iframe.src && iframe.src !== '') {
          iframe.src = iframeSrc
        }
      }
    })
    .catch(() => {})

  // ── Styles globaux ──────────────────────────────────────────────────────
  const style = document.createElement('style')
  style.textContent = `
    #kadria-bubble-wrap {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999998;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-direction: row-reverse;
    }
    #kadria-bubble-label {
      background: rgba(9,9,11,0.92);
      border: 1px solid rgba(34,197,94,0.22);
      color: #ecfdf5;
      font: 600 12.5px system-ui, -apple-system, sans-serif;
      padding: 8px 14px;
      border-radius: 999px;
      white-space: nowrap;
      box-shadow: 0 8px 24px rgba(0,0,0,0.28);
      opacity: 0;
      transform: translateX(6px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: none;
    }
    #kadria-bubble-wrap:hover #kadria-bubble-label {
      opacity: 1;
      transform: translateX(0);
    }
    #kadria-bubble {
      position: relative;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(145deg, ${primaryColor} 0%, #0f3d24 130%);
      border: 1px solid rgba(255,255,255,0.14);
      cursor: pointer;
      box-shadow: 0 8px 28px rgba(0,0,0,0.32), 0 0 0 0 rgba(34,197,94,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.3s ease;
      outline: none;
      animation: kadria-pulse 3.2s ease-in-out infinite;
    }
    #kadria-bubble:hover {
      transform: scale(1.07);
      box-shadow: 0 10px 32px rgba(0,0,0,0.4), 0 0 0 8px rgba(34,197,94,0.12);
      animation-play-state: paused;
    }
    #kadria-bubble:focus-visible {
      box-shadow: 0 0 0 3px rgba(34,197,94,0.5);
    }
    #kadria-bubble svg {
      width: 24px;
      height: 24px;
    }
    @keyframes kadria-pulse {
      0%, 100% { box-shadow: 0 8px 28px rgba(0,0,0,0.32), 0 0 0 0 rgba(34,197,94,0.35); }
      50% { box-shadow: 0 8px 28px rgba(0,0,0,0.32), 0 0 0 9px rgba(34,197,94,0.08); }
    }
    #kadria-overlay {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 420px;
      height: 640px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      border-radius: 22px;
      overflow: hidden;
      z-index: 999999;
      box-shadow: 0 24px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.08);
      display: none;
      border: 1px solid rgba(255,255,255,0.1);
      background: #09090b;
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
      background: rgba(9,9,11,0.55);
      border: 1px solid rgba(255,255,255,0.12);
      color: white;
      cursor: pointer;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      transition: background 0.15s ease;
    }
    #kadria-close:hover {
      background: rgba(0,0,0,0.75);
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
  const bubbleWrap = document.createElement('div')
  bubbleWrap.id = 'kadria-bubble-wrap'

  const bubbleLabel = document.createElement('span')
  bubbleLabel.id = 'kadria-bubble-label'
  bubbleLabel.textContent = 'Réponse en 3 min'

  const bubble = document.createElement('button')
  bubble.id = 'kadria-bubble'
  bubble.setAttribute('aria-label', 'Ouvrir le chat Kadria')
  bubble.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="white"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `
  bubbleWrap.appendChild(bubbleLabel)
  bubbleWrap.appendChild(bubble)

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
        !bubbleWrap.contains(e.target)) {
      close()
    }
  })

  function updateBubbleColor() {
    bubble.style.background = `linear-gradient(145deg, ${primaryColor} 0%, #0f3d24 130%)`
  }

  // ── Inject ───────────────────────────────────────────────────────────────
  document.body.appendChild(bubbleWrap)
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
