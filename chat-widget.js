/**
 * GanamosNet — Chat Widget
 * Embebé con: <script src="chat-widget.js"></script>
 * Requiere que Firebase esté inicializado ANTES de este script,
 * o bien usa el modo standalone (incluye su propio Firebase).
 *
 * MODO DE USO (standalone, recomendado):
 *   Agregá este <script> al final del <body> de tu landing:
 *   <script src="chat-widget.js"></script>
 *
 * El widget crea la conversación en Firestore con el mismo formato
 * que ya usa tu panel-mensajes.html — colección "conversations".
 */

(function () {
  // ── Firebase config (la misma que usás en el panel) ──
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAw6aV8a0aJyrOA_5miXajbojv1JKEJ4jg",
    authDomain: "ganamosnet-12cca.firebaseapp.com",
    projectId: "ganamosnet-12cca",
    storageBucket: "ganamosnet-12cca.firebasestorage.app",
    messagingSenderId: "337775620491",
    appId: "1:337775620491:web:8978522a1ace8e2e8c7f8e"
  };

  // Mensaje de bienvenida automático que ve el usuario
  const WELCOME_MSG = "¡Hola! Bienvenido/a a GanamosNet 👋\n¿En qué te puedo ayudar hoy?";

  // ── Estilos ──
  const CSS = `
  #gn-widget-btn {
    position: fixed; bottom: 24px; right: 24px; z-index: 9998;
    width: 60px; height: 60px; border-radius: 50%;
    background: #25D366; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.22);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  #gn-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.28); }
  #gn-widget-btn svg { width: 32px; height: 32px; fill: #fff; }
  #gn-widget-btn .gn-badge {
    position: absolute; top: 0; right: 0;
    width: 18px; height: 18px; border-radius: 50%;
    background: #FF3B30; border: 2px solid #fff;
    font-size: 10px; font-weight: 700; color: #fff;
    display: flex; align-items: center; justify-content: center;
  }

  #gn-chat-box {
    position: fixed; bottom: 96px; right: 24px; z-index: 9999;
    width: 340px; border-radius: 16px; overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    display: none; flex-direction: column;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    transform: translateY(12px); opacity: 0;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  #gn-chat-box.open { display: flex; transform: translateY(0); opacity: 1; }

  .gn-header {
    background: #075E54; padding: 12px 14px;
    display: flex; align-items: center; gap: 10px;
  }
  .gn-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: #128C7E; display: flex; align-items: center;
    justify-content: center; font-size: 18px; flex-shrink: 0;
  }
  .gn-header-info { flex: 1; }
  .gn-header-name { color: #fff; font-size: 15px; font-weight: 600; line-height: 1.2; }
  .gn-header-status { color: #9FEFC8; font-size: 12px; }
  .gn-close-btn {
    background: none; border: none; color: rgba(255,255,255,0.7);
    font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px;
    transition: color 0.15s;
  }
  .gn-close-btn:hover { color: #fff; }

  /* Pantalla de captura de datos */
  #gn-screen-capture {
    background: #ECE5DD; padding: 20px 16px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .gn-bubble-bot {
    background: #fff; border-radius: 10px 10px 10px 2px;
    padding: 10px 13px; font-size: 13px; line-height: 1.5;
    color: #111; max-width: 90%; box-shadow: 0 1px 2px rgba(0,0,0,0.08);
  }
  .gn-capture-form { display: flex; flex-direction: column; gap: 8px; }
  .gn-capture-form input {
    border: 1.5px solid #ddd; border-radius: 10px;
    padding: 10px 13px; font-size: 13px; font-family: inherit;
    outline: none; transition: border-color 0.15s; background: #fff;
  }
  .gn-capture-form input:focus { border-color: #075E54; }
  .gn-start-btn {
    background: #25D366; color: #fff; border: none;
    border-radius: 10px; padding: 11px; font-size: 14px;
    font-weight: 600; cursor: pointer; font-family: inherit;
    transition: background 0.15s;
  }
  .gn-start-btn:hover { background: #1da851; }
  .gn-start-btn:disabled { background: #aaa; cursor: default; }

  /* Pantalla de chat */
  #gn-screen-chat { display: none; flex-direction: column; }
  #gn-messages {
    background: #ECE5DD;
    min-height: 260px; max-height: 340px;
    overflow-y: auto; padding: 14px 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  #gn-messages::-webkit-scrollbar { width: 3px; }
  #gn-messages::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

  .gn-msg { display: flex; flex-direction: column; gap: 2px; }
  .gn-msg.user { align-items: flex-end; }
  .gn-msg.agent { align-items: flex-start; }
  .gn-msg.bot { align-items: flex-start; }
  .gn-msg-bubble {
    max-width: 80%; padding: 8px 11px; font-size: 13px;
    line-height: 1.5; border-radius: 10px; word-break: break-word;
  }
  .gn-msg.user .gn-msg-bubble {
    background: #DCF8C6; color: #111;
    border-bottom-right-radius: 2px;
  }
  .gn-msg.agent .gn-msg-bubble, .gn-msg.bot .gn-msg-bubble {
    background: #fff; color: #111;
    border-bottom-left-radius: 2px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.07);
  }
  .gn-msg-time { font-size: 10px; color: #aaa; padding: 0 3px; }

  .gn-typing {
    display: flex; align-items: center; gap: 4px;
    background: #fff; border-radius: 10px 10px 10px 2px;
    padding: 10px 14px; width: fit-content;
    box-shadow: 0 1px 2px rgba(0,0,0,0.07);
  }
  .gn-typing span {
    width: 7px; height: 7px; border-radius: 50%; background: #999;
    display: inline-block; animation: gnDot 1.2s infinite;
  }
  .gn-typing span:nth-child(2) { animation-delay: 0.2s; }
  .gn-typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes gnDot { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)} }

  .gn-input-area {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; background: #f0f0f0;
    border-top: 1px solid rgba(0,0,0,0.08);
  }
  #gn-input {
    flex: 1; border: none; border-radius: 20px;
    padding: 9px 14px; font-size: 13px; font-family: inherit;
    outline: none; background: #fff;
  }
  #gn-send-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: #075E54; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s;
  }
  #gn-send-btn:hover { background: #064d43; }
  #gn-send-btn svg { width: 16px; height: 16px; fill: #fff; margin-left: 2px; }

  /* Cerrado confirmado */
  #gn-screen-closed {
    display: none; background: #ECE5DD;
    padding: 24px 16px; text-align: center;
    font-size: 14px; color: #555; min-height: 120px;
    align-items: center; justify-content: center; flex-direction: column; gap: 8px;
  }

  @media (max-width: 400px) {
    #gn-chat-box { width: calc(100vw - 24px); right: 12px; bottom: 80px; }
    #gn-widget-btn { right: 12px; bottom: 12px; }
  }
  `;

  // ── HTML ──
  const HTML = `
  <button id="gn-widget-btn" aria-label="Abrir chat">
    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    <div class="gn-badge" id="gn-badge" style="display:none">1</div>
  </button>

  <div id="gn-chat-box" role="dialog" aria-label="Chat de soporte">
    <div class="gn-header">
      <div class="gn-avatar">🎰</div>
      <div class="gn-header-info">
        <div class="gn-header-name">GanamosNet</div>
        <div class="gn-header-status" id="gn-status-txt">Respondemos en minutos</div>
      </div>
      <button class="gn-close-btn" id="gn-close-btn" aria-label="Cerrar chat">×</button>
    </div>

    <!-- Paso 1: capturar datos -->
    <div id="gn-screen-capture">
      <div class="gn-bubble-bot">${WELCOME_MSG.replace(/\n/g,'<br>')}</div>
      <div class="gn-bubble-bot">Dejanos un dato para responderte:</div>
      <div class="gn-capture-form">
        <input type="text" id="gn-name-input" placeholder="Tu nombre" maxlength="60" />
        <input type="text" id="gn-contact-input" placeholder="WhatsApp o email" maxlength="80" />
        <button class="gn-start-btn" id="gn-start-btn">Iniciar chat →</button>
      </div>
    </div>

    <!-- Paso 2: chat -->
    <div id="gn-screen-chat">
      <div id="gn-messages"></div>
      <div class="gn-input-area">
        <input id="gn-input" type="text" placeholder="Escribí un mensaje..." maxlength="500" />
        <button id="gn-send-btn" aria-label="Enviar">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>

    <!-- Cerrado -->
    <div id="gn-screen-closed">
      <div style="font-size:28px">✅</div>
      <p>¡Gracias! Te respondemos pronto.</p>
    </div>
  </div>
  `;

  // ── Inyectar CSS y HTML ──
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.innerHTML = HTML;
  document.body.appendChild(wrap);

  // ── Firebase (carga dinámica) ──
  let db, addDoc, updateDoc, onSnapshot, doc, arrayUnion, serverTimestamp, collection;

  async function loadFirebase() {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const fs = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    db = fs.getFirestore(getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG));
    addDoc = fs.addDoc; updateDoc = fs.updateDoc;
    onSnapshot = fs.onSnapshot; doc = fs.doc;
    arrayUnion = fs.arrayUnion; serverTimestamp = fs.serverTimestamp;
    collection = fs.collection;
  }

  // ── Estado ──
  let convId = null;
  let unsub = null;
  let isOpen = false;

  // Persistir sesión en localStorage
  function loadSession() {
    try { return JSON.parse(localStorage.getItem('gn_conv') || 'null'); } catch { return null; }
  }
  function saveSession(data) {
    try { localStorage.setItem('gn_conv', JSON.stringify(data)); } catch {}
  }
  function clearSession() {
    try { localStorage.removeItem('gn_conv'); } catch {}
  }

  // ── DOM refs ──
  const btn       = document.getElementById('gn-widget-btn');
  const box       = document.getElementById('gn-chat-box');
  const closeBtn  = document.getElementById('gn-close-btn');
  const badge     = document.getElementById('gn-badge');
  const screenCap = document.getElementById('gn-screen-capture');
  const screenChat= document.getElementById('gn-screen-chat');
  const screenEnd = document.getElementById('gn-screen-closed');
  const nameInput = document.getElementById('gn-name-input');
  const contInput = document.getElementById('gn-contact-input');
  const startBtn  = document.getElementById('gn-start-btn');
  const msgArea   = document.getElementById('gn-messages');
  const chatInput = document.getElementById('gn-input');
  const sendBtn   = document.getElementById('gn-send-btn');
  const statusTxt = document.getElementById('gn-status-txt');

  // ── Abrir / cerrar ──
  btn.addEventListener('click', openWidget);
  closeBtn.addEventListener('click', () => toggleBox(false));

  function openWidget() {
    toggleBox(true);
    badge.style.display = 'none';
    // si ya hay sesión activa, ir directo al chat
    const session = loadSession();
    if (session && session.convId) {
      convId = session.convId;
      showScreen('chat');
      subscribeToConv();
    }
  }

  function toggleBox(open) {
    isOpen = open;
    if (open) {
      box.style.display = 'flex';
      requestAnimationFrame(() => box.classList.add('open'));
    } else {
      box.classList.remove('open');
      setTimeout(() => { box.style.display = 'none'; }, 260);
    }
  }

  function showScreen(which) {
    screenCap.style.display  = which === 'capture' ? 'flex' : 'none';
    screenChat.style.display = which === 'chat'    ? 'flex' : 'none';
    screenEnd.style.display  = which === 'closed'  ? 'flex' : 'none';
  }

  // ── Iniciar conversación ──
  startBtn.addEventListener('click', startConv);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') contInput.focus(); });
  contInput.addEventListener('keydown', e => { if (e.key === 'Enter') startConv(); });

  async function startConv() {
    const name    = nameInput.value.trim();
    const contact = contInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    startBtn.disabled = true;
    startBtn.textContent = 'Conectando...';

    try {
      await loadFirebase();
      const ref = await addDoc(collection(db, 'conversations'), {
        name,
        contact: contact || '(no informado)',
        status: 'open',
        unread: true,
        started: serverTimestamp(),
        lastMessage: serverTimestamp(),
        messages: [
          { role: 'bot', text: WELCOME_MSG, time: new Date().toISOString() }
        ]
      });
      convId = ref.id;
      saveSession({ convId, name, contact });
      showScreen('chat');
      subscribeToConv();
    } catch (err) {
      console.error('GanamosNet widget error:', err);
      startBtn.disabled = false;
      startBtn.textContent = 'Reintentar';
    }
  }

  // ── Escuchar respuestas en tiempo real ──
  function subscribeToConv() {
    if (unsub) unsub();
    if (!db) loadFirebase().then(doSub);
    else doSub();
  }

  function doSub() {
    unsub = onSnapshot(doc(db, 'conversations', convId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Si la cerraron desde el panel
      if (data.status === 'closed') {
        statusTxt.textContent = 'Conversación cerrada';
        showScreen('closed');
        clearSession();
        return;
      }

      // Renderizar mensajes
      renderMessages(data.messages || []);

      // Notificar si hay respuesta nueva y el widget está cerrado
      if (!isOpen) {
        const last = (data.messages || []).slice(-1)[0];
        if (last && last.role === 'agent') {
          badge.style.display = 'flex';
        }
      }
    });
  }

  function renderMessages(msgs) {
    msgArea.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'gn-msg ' + (m.role === 'user' ? 'user' : m.role === 'agent' ? 'agent' : 'bot');
      const t = m.time ? formatTime(new Date(m.time)) : '';
      div.innerHTML = `<div class="gn-msg-bubble">${esc(m.text)}</div><span class="gn-msg-time">${t}</span>`;
      msgArea.appendChild(div);
    });
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  // ── Enviar mensaje ──
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !convId) return;
    chatInput.value = '';

    // mostrar typing visual
    const typingEl = document.createElement('div');
    typingEl.className = 'gn-msg user';
    typingEl.innerHTML = `<div class="gn-msg-bubble">${esc(text)}</div>`;
    msgArea.appendChild(typingEl);
    msgArea.scrollTop = msgArea.scrollHeight;

    try {
      if (!db) await loadFirebase();
      await updateDoc(doc(db, 'conversations', convId), {
        messages: arrayUnion({ role: 'user', text, time: new Date().toISOString() }),
        lastMessage: serverTimestamp(),
        unread: true
      });
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    }
  }

  // ── Utils ──
  function esc(t) {
    return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }
  function formatTime(d) {
    try { return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  }

  // ── Mostrar badge si hay mensaje previo sin leer ──
  (async () => {
    const session = loadSession();
    if (!session) return;
    convId = session.convId;
    await loadFirebase();
    const snap = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
      .then(fs => fs.getDoc(doc(db, 'conversations', convId)));
    if (snap.exists()) {
      const msgs = snap.data().messages || [];
      const last = msgs.slice(-1)[0];
      if (last && last.role === 'agent') badge.style.display = 'flex';
    }
  })().catch(() => {});

})();
