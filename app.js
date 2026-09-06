import { buildMiniAppPayload, miniAppTransport, readSessionState } from './runtime.js?v=1';

const BOT = 'nebenzin_field_diagnost_bot';
const webApp = window.Telegram?.WebApp;
const transport = miniAppTransport(webApp);
const session = readSessionState(location.search);

const status = document.querySelector('#send-status');
const noteInput = document.querySelector('#note');
const sendButton = document.querySelector('[data-note]');
const sessionPanel = document.querySelector('#session-panel');
const caseActions = document.querySelector('#case-actions');

function setStatus(message = '', kind = '') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function setBusy(busy) {
  sendButton.disabled = busy;
  sendButton.setAttribute('aria-busy', busy ? 'true' : 'false');
}

if (transport.insideTelegram) {
  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor?.('#070b0f');
  webApp.setBackgroundColor?.('#070b0f');
}

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
  setStatus('Передаю в чат…', 'progress');
  setBusy(true);
  try {
    if (transport.canSendData) {
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

sendButton.addEventListener('click', () => {
  const note = noteInput.value.trim();
  if (!note) {
    setStatus('Сначала напишите машину и что произошло.', 'error');
    noteInput.focus();
    return;
  }
  send('note', note);
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=6').catch(() => {});
