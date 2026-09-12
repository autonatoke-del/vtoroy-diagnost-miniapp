const webApp = window.Telegram?.WebApp;

if (webApp) {
  let hasBeenExpanded = Boolean(webApp.isExpanded);
  let touchStart = null;
  let closing = false;

  const closeMiniApp = () => {
    if (closing) return;
    closing = true;
    try { webApp.HapticFeedback?.impactOccurred?.('light'); } catch {}
    try { webApp.BackButton?.hide?.(); } catch {}
    try {
      webApp.close();
      return;
    } catch {}
    closing = false;
  };

  const handleBack = () => closeMiniApp();
  const handleViewport = (event = {}) => {
    const expanded = event.isExpanded ?? webApp.isExpanded;
    if (expanded === true) {
      hasBeenExpanded = true;
      return;
    }
    if (hasBeenExpanded && expanded === false && event.isStateStable !== false) closeMiniApp();
  };

  try {
    webApp.BackButton?.show?.();
    webApp.BackButton?.onClick?.(handleBack);
  } catch {}
  try { webApp.onEvent?.('backButtonClicked', handleBack); } catch {}
  try { webApp.onEvent?.('viewportChanged', handleViewport); } catch {}

  // Telegram's native downward swipe is useful here: once it starts collapsing
  // the Mini App, viewportChanged closes it completely instead of leaving a mini bar.
  try { webApp.enableVerticalSwipes?.(); } catch {}
  try { webApp.disableClosingConfirmation?.(); } catch {}

  // Fallback for Android WebViews that pass the edge gesture through as browser history.
  try {
    const current = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({ ...current, vtoroyRoot: true }, document.title, location.href);
    history.pushState({ vtoroyBackGuard: true }, document.title, location.href);
    window.addEventListener('popstate', closeMiniApp);
  } catch {}

  // Extra in-page swipe-right fallback. It does not replace the Android system gesture,
  // but works when Telegram/WebView lets the touch reach the page.
  window.addEventListener('touchstart', (event) => {
    const point = event.touches?.[0];
    if (!point || point.clientX > 64) {
      touchStart = null;
      return;
    }
    touchStart = { x: point.clientX, y: point.clientY, at: Date.now() };
  }, { passive: true });

  window.addEventListener('touchend', (event) => {
    if (!touchStart) return;
    const point = event.changedTouches?.[0];
    const start = touchStart;
    touchStart = null;
    if (!point) return;
    const dx = point.clientX - start.x;
    const dy = Math.abs(point.clientY - start.y);
    const dt = Date.now() - start.at;
    if (dx >= 80 && dy <= 70 && dt <= 900) closeMiniApp();
  }, { passive: true });

  // Always provide a deterministic escape hatch on clients where OS back gestures
  // are consumed by Telegram before they reach the Mini App.
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
    try { webApp.BackButton?.offClick?.(handleBack); } catch {}
    try { webApp.offEvent?.('backButtonClicked', handleBack); } catch {}
    try { webApp.offEvent?.('viewportChanged', handleViewport); } catch {}
  }, { once: true });
}
