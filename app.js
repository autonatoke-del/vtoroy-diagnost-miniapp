const BOT = 'nebenzin_field_diagnost_bot';
const webApp = window.Telegram?.WebApp;
const insideTelegram = Boolean(webApp?.initData);
const params = new URLSearchParams(location.search);
const vehicle = [params.get('make'), params.get('model'), params.get('year')].filter(Boolean).join(' ');
const phase = ['analysis', 'guided_diagnosis', 'guided_repair'].includes(params.get('phase')) ? params.get('phase') : 'analysis';

document.querySelector('#vehicle-name').textContent = vehicle || 'Новая диагностика';
document.querySelector('#dtc-count').textContent = /^\d+$/.test(params.get('dtc') || '') ? params.get('dtc') : '0';
document.querySelector('#ready-state').textContent = params.get('ready') === '1' ? 'READY ДА' : params.get('ready') === '0' ? 'READY НЕТ' : 'READY —';
document.querySelector(`[data-phase="${phase}"]`)?.classList.add('active');

if (insideTelegram) {
  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor?.('#070b0f');
  webApp.setBackgroundColor?.('#070b0f');
  document.querySelector('#mode').textContent = 'ВНУТРИ TELEGRAM';
} else {
  document.querySelector('#mode').textContent = 'БРАУЗЕРНЫЙ ВХОД';
}

async function fallback(action, text = '') {
  if (text && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text).catch(() => {});
  location.href = `https://t.me/${BOT}?start=web_${encodeURIComponent(action)}`;
}

async function send(action, text = '') {
  const payload = JSON.stringify({ v: 1, action, ...(text ? { text } : {}) });
  if (insideTelegram && webApp?.sendData) {
    webApp.HapticFeedback?.impactOccurred('light');
    webApp.sendData(payload);
    return;
  }
  await fallback(action, text);
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => send(button.dataset.action));
});

document.querySelector('[data-note]').addEventListener('click', () => {
  const note = document.querySelector('#note').value.trim();
  if (!note) { document.querySelector('#note').focus(); return; }
  send('note', note.slice(0, 2000));
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
