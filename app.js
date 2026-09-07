import { buildMiniAppPayload, miniAppTransport, readSessionState } from './runtime.js?v=1';

const BOT = 'nebenzin_field_diagnost_bot';
const DRAFT_KEY = 'vtoroy-diagnost:draft:v1';
const webApp = window.Telegram?.WebApp;
const transport = miniAppTransport(webApp);
const session = readSessionState(location.search);

const status = document.querySelector('#send-status');
const noteInput = document.querySelector('#note');
const sendButton = document.querySelector('[data-note]');
const diagnosticForm = document.querySelector('#diagnostic-form');
const sessionPanel = document.querySelector('#session-panel');
const caseActions = document.querySelector('#case-actions');
const connectionBadge = document.querySelector('#connection-badge');
const offlineNote = document.querySelector('#offline-note');
const installCard = document.querySelector('#install-card');
const installButton = document.querySelector('#install-button');
const installMini = document.querySelector('#install-mini');
let installPrompt = null;

function setStatus(message = '', kind = '') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function setBusy(busy) {
  sendButton.disabled = busy;
  sendButton.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function saveDraft(value = '') {
  try {
    const text = String(value).slice(0, 2000);
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

function readDraft() {
  try { return String(localStorage.getItem(DRAFT_KEY) || '').slice(0, 2000); } catch { return ''; }
}

function updateConnection() {
  const online = navigator.onLine !== false;
  connectionBadge.textContent = online ? 'В СЕТИ' : 'БЕЗ СЕТИ';
  connectionBadge.dataset.online = online ? 'true' : 'false';
  offlineNote.hidden = online;
  if (online && status.dataset.kind === 'offline') setStatus('Связь вернулась. Можно отправлять.', 'notice');
}

function showInstall(visible) {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  const show = Boolean(visible && !transport.insideTelegram && !standalone);
  installCard.hidden = !show;
  installMini.hidden = !show;
}

async function installApp() {
  if (!installPrompt) return;
  await installPrompt.prompt();
  const choice = await installPrompt.userChoice.catch(() => null);
  if (choice?.outcome === 'accepted') showInstall(false);
  installPrompt = null;
}

if (transport.insideTelegram) {
  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor?.('#070b0f');
  webApp.setBackgroundColor?.('#070b0f');
}

const draft = readDraft();
if (draft) {
  noteInput.value = draft;
  setStatus('Черновик восстановлен.', 'notice');
}
updateConnection();

if (session.active) {
  sessionPanel.hidden = false;
  caseActions.hidden = false;
  document.querySelector('#vehicle-name').textContent = session.vehicle || 'Текущая диагностика';
  const facts = [];
  if (session.dtc !== null) facts.push(session.dtc ? `Кодов: ${session.dtc}` : 'Коды пока не добавлены');
  if (session.ready !== null) facts.push(session.ready ? 'READY: да' : 'READY: нет');
  document.querySelector('#vehicle-facts').textContent = facts.join(' · ') || 'Продолжайте добавлять факты и замеры';
  document.querySelector(`[data-phase="${session.phase}"]`)?.classList.add('active');
  document.querySelector('#hero-title').textContent = 'Что изменилось по машине?';
  document.querySelector('#hero-copy').textContent = 'Добавьте новый код, замер или наблюдение. Бот помнит предыдущие сообщения.';
  noteInput.placeholder = 'Например: после стирания остался U0100';
} else {
  document.querySelector('#hero-title').textContent = 'Какая машина и что произошло?';
  document.querySelector('#hero-copy').textContent = 'Напишите одной фразой. Код ошибки необязателен.';
}

async function openBot(action, text = '') {
  let copied = false;
  if (text && navigator.clipboard?.writeText) {
    copied = await navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  const link = `https://t.me/${BOT}?start=web_${encodeURIComponent(action)}`;
  const message = copied
    ? 'Текст скопирован. В чате с ботом вставьте его и отправьте.'
    : 'Откройте чат с ботом и отправьте описание машины.';
  setStatus(message, 'notice');
  if (transport.insideTelegram && webApp?.openTelegramLink) {
    webApp.showAlert?.(message);
    webApp.openTelegramLink(link);
    return;
  }
  location.href = link;
}

async function send(action, text = '') {
  if (navigator.onLine === false) {
    if (text) saveDraft(text);
    setStatus('Связи нет. Черновик сохранён на телефоне.', 'offline');
    return;
  }
  setStatus('Передаю в чат…', 'progress');
  setBusy(true);
  try {
    if (transport.canSendData) {
      saveDraft('');
      webApp.HapticFeedback?.impactOccurred('light');
      webApp.sendData(buildMiniAppPayload(action, text));
      return;
    }
    await openBot(action, text);
  } catch {
    setStatus('Не отправилось. Вернитесь в чат и пришлите сообщение туда.', 'error');
    setBusy(false);
  }
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => send(button.dataset.action));
});

diagnosticForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const note = noteInput.value.trim();
  if (!note) {
    setStatus('Сначала напишите машину и что произошло.', 'error');
    noteInput.focus();
    return;
  }
  send('note', note);
});

noteInput.addEventListener('input', () => saveDraft(noteInput.value));
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  showInstall(true);
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  showInstall(false);
  setStatus('Приложение установлено.', 'notice');
});
installButton.addEventListener('click', installApp);
installMini.addEventListener('click', installApp);
window.visualViewport?.addEventListener('resize', () => {
  if (document.activeElement === noteInput) requestAnimationFrame(() => noteInput.scrollIntoView({ block: 'center' }));
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=7').catch(() => {});
