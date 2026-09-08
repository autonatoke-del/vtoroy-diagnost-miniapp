const PHASES = new Set(['analysis', 'guided_diagnosis', 'guided_repair']);

const CAPTURE_GUIDES = Object.freeze({
  scanner: Object.freeze({
    label: 'СКАНЕР',
    title: 'Сними экран целиком',
    steps: Object.freeze(['Название блока и DTC', 'Статус ошибки и freeze frame', 'Без блика, цифры в фокусе']),
    shareText: 'Сканер: общий экран, блок, DTC, статус и параметры. Продолжай текущую диагностику.',
  }),
  connector: Object.freeze({
    label: 'РАЗЪЁМ',
    title: 'Фиксатор сверху',
    steps: Object.freeze(['Общий вид и место установки', 'Номер корпуса крупно', 'Контакты строго спереди']),
    shareText: '/connector Фото разъёма: общий вид, маркировка или контакты спереди; фиксатор сверху.',
  }),
  board: Object.freeze({
    label: 'ПЛАТА',
    title: 'Маркировки должны читаться',
    steps: Object.freeze(['Лицевая и обратная сторона', 'Силовая зона и разъёмы', 'Макро номеров микросхем']),
    shareText: '/board Фото платы: сторона и маркировки видны, питание снято.',
  }),
});

export function captureGuide(mode = 'scanner') {
  return CAPTURE_GUIDES[String(mode || '').toLowerCase()] || CAPTURE_GUIDES.scanner;
}

export function buildCaptureShareText(mode = 'scanner', vehicle = '') {
  const prefix = String(vehicle || '').trim().slice(0, 120);
  const text = captureGuide(mode).shareText;
  return prefix ? `${prefix}. ${text}` : text;
}

export function assessCaptureQuality(metrics = {}) {
  const width = Number(metrics.width) || 0;
  const height = Number(metrics.height) || 0;
  const edgeScore = Number(metrics.edgeScore) || 0;
  const darkRatio = Number(metrics.darkRatio) || 0;
  const brightRatio = Number(metrics.brightRatio) || 0;
  const checks = [
    { id: 'resolution', label: 'Детали', ok: Math.min(width, height) >= 720 },
    { id: 'exposure', label: 'Свет', ok: darkRatio < 0.75 && brightRatio < 0.55 },
    { id: 'focus', label: 'Резкость', ok: edgeScore >= 7 },
  ];
  const failed = checks.filter((check) => !check.ok);
  return {
    ready: failed.length === 0,
    checks,
    summary: failed.length
      ? `Проверь или пересними: ${failed.map((check) => check.label.toLowerCase()).join(', ')}.`
      : 'Кадр выглядит читаемым. Проверь цифры и маркировку.',
  };
}

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
