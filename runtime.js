const PHASES = new Set(['analysis', 'guided_diagnosis', 'guided_repair']);

export function miniAppTransport(webApp) {
  const platform = String(webApp?.platform || '').toLowerCase();
  const insideTelegram = Boolean(webApp && platform && platform !== 'unknown');
  const keyboardLaunch = insideTelegram && !String(webApp?.initData || '');
  return {
    insideTelegram,
    keyboardLaunch,
    canSendData: keyboardLaunch && typeof webApp?.sendData === 'function',
  };
}

export function buildMiniAppPayload(action, text = '') {
  const note = String(text || '').trim().slice(0, 2000);
  return JSON.stringify({ v: 1, action: String(action || ''), ...(note ? { text: note } : {}) });
}

export function readSessionState(search = '') {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const active = params.get('active') === '1';
  const vehicle = [params.get('make'), params.get('model'), params.get('year')].filter(Boolean).join(' ');
  const dtcRaw = params.get('dtc');
  const readyRaw = params.get('ready');
  return {
    active,
    vehicle,
    dtc: active && /^\d+$/.test(dtcRaw || '') ? Number(dtcRaw) : null,
    ready: active && readyRaw === '1' ? true : active && readyRaw === '0' ? false : null,
    phase: active && PHASES.has(params.get('phase')) ? params.get('phase') : 'analysis',
  };
}
