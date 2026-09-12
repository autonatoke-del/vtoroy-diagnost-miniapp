const webApp = window.Telegram?.WebApp;

if (webApp) {
  let closing = false;
  let gesture = null;

  const closeMiniApp = () => {
    if (closing) return;
    closing = true;
    try { webApp.HapticFeedback?.impactOccurred?.('light'); } catch {}
    try { webApp.BackButton?.hide?.(); } catch {}
    try { webApp.disableClosingConfirmation?.(); } catch {}
    try {
      webApp.close();
      return;
    } catch {}
    closing = false;
  };

  const onBack = () => closeMiniApp();

  // Do not wait for a "stable" viewport. On some Android Telegram builds the
  // stable collapsed event never arrives. The first isExpanded=false is enough.
  const onViewportChanged = (event = {}) => {
    const expanded = event.isExpanded ?? webApp.isExpanded;
    if (expanded === false) closeMiniApp();
  };

  try {
    webApp.BackButton?.show?.();
    webApp.BackButton?.onClick?.(onBack);
  } catch {}
  try { webApp.onEvent?.('backButtonClicked', onBack); } catch {}
  try { webApp.onEvent?.('viewportChanged', onViewportChanged); } catch {}
  try { webApp.enableVerticalSwipes?.(); } catch {}
  try { webApp.disableClosingConfirmation?.(); } catch {}

  // Browser-history fallback for Android back implementations that reach WebView.
  try {
    const current = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({ ...current, vtoroyRoot: true }, document.title, location.href);
    history.pushState({ vtoroyBackGuard: true }, document.title, location.href);
    window.addEventListener('popstate', closeMiniApp);
  } catch {}

  // In-page gesture fallback. It deliberately starts slightly inside the screen,
  // because Android may reserve the outermost system edge for its own back gesture.
  window.addEventListener('touchstart', (event) => {
    const p = event.touches?.[0];
    if (!p) { gesture = null; return; }
    const horizontalCandidate = p.clientX <= 120;
    const verticalCandidate = p.clientY <= 150 && window.scrollY <= 8;
    if (!horizontalCandidate && !verticalCandidate) { gesture = null; return; }
    gesture = {
      x: p.clientX,
      y: p.clientY,
      at: Date.now(),
      horizontalCandidate,
      verticalCandidate,
    };
  }, { passive: true, capture: true });

  window.addEventListener('touchmove', (event) => {
    if (!gesture) return;
    const p = event.touches?.[0];
    if (!p) return;
    const dx = p.clientX - gesture.x;
    const dy = p.clientY - gesture.y;
    const dt = Date.now() - gesture.at;

    if (gesture.horizontalCandidate && dx >= 95 && Math.abs(dy) <= 80 && dt <= 1200) {
      gesture = null;
      closeMiniApp();
      return;
    }
    if (gesture.verticalCandidate && dy >= 105 && Math.abs(dx) <= 90 && dt <= 1200) {
      gesture = null;
      closeMiniApp();
    }
  }, { passive: true, capture: true });

  window.addEventListener('touchend', () => { gesture = null; }, { passive: true, capture: true });
  window.addEventListener('touchcancel', () => { gesture = null; }, { passive: true, capture: true });

  // Deterministic fallback if Telegram/Android consumes every gesture before WebView.
  const topActions = document.querySelector('.top-actions');
  if (topActions && !document.querySelector('#back-to-chat')) {
    const button = document.createElement('button');
    button.id = 'back-to-chat';
    button.type = 'button';
    button.className = 'install-mini';
    button.textContent = '← В чат';
    button.hidden = false;
    button.addEventListener('click', closeMiniApp);
    topActions.prepend(button);
  }

  try { webApp.expand?.(); } catch {}

  window.addEventListener('pagehide', () => {
    try { webApp.BackButton?.offClick?.(onBack); } catch {}
    try { webApp.offEvent?.('backButtonClicked', onBack); } catch {}
    try { webApp.offEvent?.('viewportChanged', onViewportChanged); } catch {}
  }, { once: true });
}
