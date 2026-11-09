const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, cur) => (cur === 'USD' ? '$' + Number(n).toLocaleString('en-US') : Number(n).toLocaleString('uz-UZ') + ' so‘m');
const CATS = ['Payvandlash va generatorlar', 'Nasoslar', 'Shlanglar va quvurlar', 'Boshqa'];
const STATUS = { pending: 'Tekshiruvda', active: 'Faol', rejected: 'Rad etilgan' };

const app = $('#app');
let me = null;
let timer = null;

async function api(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

function nav() {
  $('#nav').innerHTML = me
    ? `<a href="#/">Bosh</a><a href="#/add">+ E‘lon</a><a href="#/mine">E‘lonlarim</a><a href="#/chats">Xabarlar</a>` +
      (me.role === 'admin' ? `<a href="#/admin">Admin</a>` : '') +
      `<a href="#" id="logout">Chiqish (${esc(me.name)})</a>`
    : `<a href="#/">Bosh</a><a href="#/login">Kirish</a><a href="#/register">Ro‘yxatdan o‘tish</a>`;
}

// ---------- Views ----------
function card(p) {
  return `<a class="card" href="#/product/${p.id}">
    <h3>${esc(p.title)}</h3>
    <b class="price">${money(p.price, p.currency)}</b><br>
    <small>${esc(p.city)} · ${esc(p.category)}</small></a>`;
}

async function home() {
  app.innerHTML = `
    <form id="f" class="bar">
      <input name="q" placeholder="Qidirish...">
      <select name="category"><option value="">Barcha kategoriyalar</option>${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
      <input name="city" placeholder="Shahar">
      <button>Qidirish</button>
    </form>
    <div id="grid" class="grid"></div>`;
  const load = async () => {
    const items = await api('GET', '/api/products?' + new URLSearchParams(new FormData($('#f'))));
    $('#grid').innerHTML = items.map(card).join('') || '<p>E‘lonlar yo‘q</p>';
  };
  $('#f').onsubmit = (e) => { e.preventDefault(); load(); };
  await load();
}

async function product(id) {
  const p = await api('GET', '/api/products/' + id);
  const isOwner = me && me.id === p.owner_id;
  const canChat = me && !isOwner && p.status === 'active';
  app.innerHTML = `
    <div class="detail">
      <h2>${esc(p.title)}</h2>
      <p class="price">${money(p.price, p.currency)}${p.retail_price ? ` <small>(chakana: ${money(p.retail_price, p.currency)})</small>` : ''}</p>
      <p>${esc(p.category)} · ${esc(p.city)} · Sotuvchi: ${esc(p.seller_name)}</p>
      <p class="desc">${esc(p.description)}</p>
      <h4>Bog‘lanish</h4>
      ${p.phones.map((x) => `<a class="phone" href="tel:${esc(x)}">${esc(x)}</a>`).join('')}
      ${p.status !== 'active' ? `<p class="warn">Holati: ${STATUS[p.status]}</p>` : ''}
      <div class="actions">
        ${canChat ? '<button id="chat">Sotuvchiga yozish</button>' : ''}
        ${!me ? '<a href="#/login">Yozish uchun kiring</a>' : ''}
        ${me && (isOwner || me.role === 'admin') ? '<button id="del" class="danger">O‘chirish</button>' : ''}
      </div>
    </div>`;
  if ($('#chat')) $('#chat').onclick = async () => {
    const c = await api('POST', `/api/products/${id}/chat`);
    location.hash = '#/chat/' + c.id;
  };
  if ($('#del')) $('#del').onclick = async () => {
    if (!confirm('E‘lon o‘chirilsinmi?')) return;
    await api('DELETE', '/api/products/' + id);
    location.hash = '#/';
  };
}

function add() {
  if (!me) return (location.hash = '#/login');
  app.innerHTML = `
    <form id="f" class="form">
      <h2>Yangi e‘lon</h2>
      <input name="title" placeholder="Sarlavha" required maxlength="100">
      <select name="category">${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
      <input name="city" placeholder="Shahar">
      <input name="price" type="number" min="1" placeholder="Narx (so‘m)" required>
      <textarea name="description" placeholder="Mahsulot haqida batafsil ma‘lumot"></textarea>
      <input name="phone1" placeholder="Telefon 1: +998 90 123 45 67" required>
      <input name="phone2" placeholder="Telefon 2 (ixtiyoriy)">
      <input name="phone3" placeholder="Telefon 3 (ixtiyoriy)">
      <button>Joylash (admin tasdiqlaydi)</button>
      <p id="err" class="err"></p>
    </form>`;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api('POST', '/api/products', { ...d, phones: [d.phone1, d.phone2, d.phone3] });
      location.hash = '#/product/' + r.id;
    } catch (x) { $('#err').textContent = x.message; }
  };
}

async function mine() {
  if (!me) return (location.hash = '#/login');
  const items = await api('GET', '/api/my/products');
  app.innerHTML = `<h2>Mening e‘lonlarim</h2>` +
    (items.map((p) => `<a class="row" href="#/product/${p.id}">
      <span>${esc(p.title)}</span><span>${money(p.price, p.currency)}</span>
      <em class="st ${p.status}">${STATUS[p.status]}</em></a>`).join('') || '<p>Hozircha e‘lon yo‘q</p>');
}

async function chats() {
  if (!me) return (location.hash = '#/login');
  const list = await api('GET', '/api/conversations');
  app.innerHTML = `<h2>Xabarlar</h2>` +
    (list.map((c) => `<a class="row" href="#/chat/${c.id}">
      <span><b>${esc(c.other_name)}</b><br><small>${esc(c.product_title)}</small></span>
      <small>${esc(c.last_text || '')}</small></a>`).join('') || '<p>Suhbatlar yo‘q</p>');
}

async function chat(id) {
  if (!me) return (location.hash = '#/login');
  app.innerHTML = `
    <div class="chat">
      <div id="msgs"></div>
      <form id="f"><input name="text" placeholder="Xabar yozing..." required autocomplete="off"><button>Yuborish</button></form>
    </div>`;
  let lastSig = '';
  const draw = async () => {
    const msgs = await api('GET', `/api/conversations/${id}/messages`);
    const sig = msgs.length + ':' + (msgs.at(-1)?.id || '');
    if (sig === lastSig) return;
    lastSig = sig;
    $('#msgs').innerHTML = msgs.map((m) =>
      `<div class="msg ${m.sender_id === me.id ? 'me' : ''}">${esc(m.text)}</div>`).join('');
    $('#msgs').scrollTop = 1e9;
  };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    e.target.text.value = '';
    await api('POST', `/api/conversations/${id}/messages`, { text });
    lastSig = '';
    draw();
  };
  await draw();
  timer = setInterval(() => draw().catch(() => {}), 3000);
}

function authView(isReg) {
  app.innerHTML = `
    <form id="f" class="form">
      <h2>${isReg ? 'Ro‘yxatdan o‘tish' : 'Kirish'}</h2>
      ${isReg ? '<input name="name" placeholder="Ismingiz" required>' : ''}
      <input name="phone" placeholder="+998 90 123 45 67" required>
      <input name="password" type="password" placeholder="Parol (kamida 6 belgi)" required>
      <button>${isReg ? 'Ro‘yxatdan o‘tish' : 'Kirish'}</button>
      <p id="err" class="err"></p>
    </form>`;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', isReg ? '/api/register' : '/api/login', Object.fromEntries(new FormData(e.target)));
      await loadMe();
      location.hash = '#/';
    } catch (x) { $('#err').textContent = x.message; }
  };
}

// ---------- Router ----------
const routes = {
  '': home,
  login: () => authView(false),
  register: () => authView(true),
  add,
  mine,
  chats,
  product: (id) => product(id),
  chat: (id) => chat(id),
  admin: () => adminPanel(),
};

async function render() {
  clearInterval(timer);
  const [view, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const fn = routes[view || ''] || home;
  nav();
  try { await fn(arg); }
  catch (e) { app.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

async function loadMe() {
  me = (await api('GET', '/api/me')).user;
  nav();
}

document.addEventListener('click', async (e) => {
  if (e.target.id !== 'logout') return;
  e.preventDefault();
  await api('POST', '/api/logout');
  me = null;
  location.hash = '#/';
  render();
});

window.addEventListener('hashchange', render);
loadMe().then(render);
