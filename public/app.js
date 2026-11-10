const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CATS = ['Payvandlash va generatorlar', 'Nasoslar', 'Shlanglar va quvurlar', 'Boshqa'];

const app = $('#app');
let me = null;
let timer = null;
let resendTick = null;
let authCtx = { email: '', purpose: 'register' };
let authNotice = '';

async function api(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error || t('common.error'));
    err.data = data;
    throw err;
  }
  return data;
}

function nav() {
  const links = me
    ? `<a href="#/">${t('nav.home')}</a><a href="#/add">${t('nav.add')}</a><a href="#/mine">${t('nav.mine')}</a><a href="#/chats">${t('nav.chats')}</a>` +
      (me.role === 'admin' ? `<a href="#/admin">${t('nav.admin')}</a>` : '') +
      `<a href="#" id="logout">${t('nav.logout')}</a>`
    : `<a href="#/">${t('nav.home')}</a><a href="#/login">${t('nav.login')}</a><a href="#/register">${t('nav.register')}</a>`;
  const langs = ['uz', 'ru', 'en']
    .map((l) => `<a href="#" data-lang="${l}" class="${l === LANG ? 'on' : ''}">${l.toUpperCase()}</a>`).join('');
  $('#nav').innerHTML = links + `<span class="langs">${langs}</span>`;
}

// ---------- Umumiy kartalar va rasmlar ----------
function thumb(p, cls = 'thumb') {
  return p.images && p.images[0]
    ? `<img class="${cls}" src="${esc(p.images[0])}" alt="">`
    : `<div class="${cls} noimg">📦</div>`;
}

function card(p) {
  return `<a class="card glass" href="#/product/${p.id}">
    ${thumb(p)}
    <h3>${esc(p.title)}</h3>
    <div><b class="price">${money(p.price, p.currency)}</b></div>
    <div class="meta">${esc(p.city)}${p.city ? ' · ' : ''}${esc(catLabel(p.category))}</div>
  </a>`;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 900;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('common.error'))); };
    img.src = url;
  });
}

// ---------- Bosh sahifa ----------
async function home() {
  app.innerHTML = `
    <section class="hero">
      <h1>${t('home.heroTitle')}</h1>
      <p>${t('home.heroSub')}</p>
    </section>
    <form id="f" class="bar">
      <input name="q" placeholder="${t('home.search')}">
      <select name="category"><option value="">${t('home.allCats')}</option>${CATS.map((c) => `<option value="${esc(c)}">${catLabel(c)}</option>`).join('')}</select>
      <input name="city" placeholder="${t('home.city')}" style="flex:0.6">
      <button>${t('home.go')}</button>
    </form>
    <p id="count" class="muted"></p>
    <div id="grid" class="grid"></div>`;
  const load = async () => {
    const items = await api('GET', '/api/products?' + new URLSearchParams(new FormData($('#f'))));
    $('#count').textContent = t('home.results', { n: items.length });
    $('#grid').innerHTML = items.map(card).join('') || `<div class="empty glass">${t('home.empty')}</div>`;
  };
  $('#f').onsubmit = (e) => { e.preventDefault(); load(); };
  await load();
}

// ---------- Mahsulot sahifasi ----------
async function product(id) {
  const p = await api('GET', '/api/products/' + id);
  const isOwner = me && me.id === p.owner_id;
  const canChat = me && !isOwner && p.status === 'active';
  const imgs = p.images || [];
  const gallery = imgs.length
    ? `<div class="gallery"><img class="main" id="main" src="${esc(imgs[0])}" alt="">
        ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((s, i) => `<img src="${esc(s)}" data-i="${i}" class="${i ? '' : 'on'}" alt="">`).join('')}</div>` : ''}</div>`
    : `<div class="thumb noimg">📦</div>`;
  const specs = [
    p.brand && [t('product.brand'), p.brand],
    [t('product.condition'), t('cond.' + (p.condition === 'used' ? 'used' : 'new'))],
    p.stock != null && [t('product.stock'), p.stock],
    p.city && [t('form.city'), p.city],
    [t('product.status'), t('status.' + p.status)],
  ].filter(Boolean);

  app.innerHTML = `
    <div class="detail glass">
      <div>${gallery}</div>
      <div>
        <h2>${esc(p.title)}</h2>
        <p><b class="price">${money(p.price, p.currency)}</b>
          ${p.retail_price ? ` <span class="muted">${t('product.retail')}: ${money(p.retail_price, p.currency)}</span>` : ''}</p>
        <dl class="specs">${specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        <h3>${t('form.description')}</h3>
        <p class="desc">${esc(p.description)}</p>
        <h3>${t('product.contact')}</h3>
        ${p.phones.map((x) => `<a class="phone" href="tel:${esc(x)}">${esc(x)}</a>`).join('')}
        ${p.status !== 'active' ? `<p class="warn">${t('product.pendingNote')}</p>` : ''}
        <div class="actions">
          ${canChat ? `<button id="chat">${t('product.chat')}</button>` : ''}
          ${!me ? `<a href="#/login">${t('product.loginToChat')}</a>` : ''}
          ${me && (isOwner || me.role === 'admin') ? `<a href="#/edit/${p.id}"><button class="ghost">${t('mine.edit')}</button></a>` : ''}
          ${me && (isOwner || me.role === 'admin') ? `<button id="del" class="danger">${t('product.delete')}</button>` : ''}
        </div>
      </div>
    </div>`;

  app.querySelectorAll('.thumbs img').forEach((el) => el.onclick = () => {
    $('#main').src = el.src;
    app.querySelectorAll('.thumbs img').forEach((x) => x.classList.toggle('on', x === el));
  });
  if ($('#chat')) $('#chat').onclick = async () => {
    const c = await api('POST', `/api/products/${id}/chat`);
    location.hash = '#/chat/' + c.id;
  };
  if ($('#del')) $('#del').onclick = async () => {
    if (!confirm(t('product.confirmDelete'))) return;
    await api('DELETE', '/api/products/' + id);
    location.hash = '#/';
  };
}

// ---------- Mahsulot formasi (foydalanuvchi va admin uchun umumiy) ----------
// opts: { admin, onDone(id), onCancel }
function productForm(p = {}, opts = {}) {
  let imgs = [...(p.images || [])];
  const ph = [0, 1, 2].map((i) => (p.phones && p.phones[i]) || '');
  const isNew = !p.id;

  app.innerHTML = `
    <form id="pf" class="form wide glass">
      <h2>${isNew ? t('admin.newTitle') : t('admin.editTitle')}</h2>
      ${isNew && !opts.admin ? `<p class="muted">${t('add.hint')}</p>` : ''}
      <span class="lbl">${t('form.images')}</span>
      <div class="imgs" id="imgs"></div>
      <div><button type="button" id="pick" class="ghost">${t('form.addImage')}</button>
        <input type="file" id="file" accept="image/*" multiple hidden></div>
      <div class="fields">
        <input class="full" name="title" placeholder="${t('form.title')}" required value="${esc(p.title || '')}">
        <input name="brand" placeholder="${t('form.brand')}" value="${esc(p.brand || '')}">
        <select name="category">${CATS.map((c) => `<option value="${esc(c)}" ${c === p.category ? 'selected' : ''}>${catLabel(c)}</option>`).join('')}</select>
        <input name="price" type="number" step="any" min="0" placeholder="${t('form.price')}" required value="${p.price ?? ''}">
        <select name="currency">
          <option value="USD" ${p.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
          <option value="so'm" ${p.currency !== 'USD' ? 'selected' : ''}>${t('common.currency')}</option>
        </select>
        <input name="retail_price" type="number" step="any" min="0" placeholder="${t('form.retail')}" value="${p.retail_price ?? ''}">
        <select name="condition">
          <option value="new" ${p.condition !== 'used' ? 'selected' : ''}>${t('cond.new')}</option>
          <option value="used" ${p.condition === 'used' ? 'selected' : ''}>${t('cond.used')}</option>
        </select>
        <input name="stock" type="number" min="0" placeholder="${t('form.stock')}" value="${p.stock ?? ''}">
        <input name="city" placeholder="${t('form.city')}" value="${esc(p.city || '')}">
        <input name="phone1" placeholder="${t('form.phone1')}: +998 90 123 45 67" required value="${esc(ph[0])}">
        <input name="phone2" placeholder="${t('form.phone2')}" value="${esc(ph[1])}">
        <input name="phone3" placeholder="${t('form.phone3')}" value="${esc(ph[2])}">
        ${opts.admin ? `<select class="full" name="status">
          ${['pending', 'active', 'rejected'].map((s) => `<option value="${s}" ${(p.status || (isNew ? 'active' : 'pending')) === s ? 'selected' : ''}>${t('status.' + s)}</option>`).join('')}
        </select>` : ''}
        <textarea class="full" name="description" placeholder="${t('form.description')}">${esc(p.description || '')}</textarea>
      </div>
      <div class="actions">
        <button>${isNew ? t('form.publish') : t('form.save')}</button>
        <button type="button" id="cancel" class="ghost">${t('form.cancel')}</button>
      </div>
      <p id="err" class="err"></p>
    </form>`;

  const drawImgs = () => {
    $('#imgs').innerHTML = imgs.map((s, i) => `
      <div class="pic"><img src="${esc(s)}" alt=""><button type="button" data-rm="${i}">${t('form.removeImage')}</button></div>`).join('');
    $('#imgs').querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => {
      imgs.splice(Number(b.dataset.rm), 1);
      drawImgs();
    });
    $('#pick').disabled = imgs.length >= 5;
  };
  drawImgs();

  $('#pick').onclick = () => $('#file').click();
  $('#file').onchange = async (e) => {
    const files = [...e.target.files].slice(0, 5 - imgs.length);
    if (imgs.length + e.target.files.length > 5) $('#err').textContent = t('form.imgTooMany');
    for (const f of files) {
      try { imgs.push(await compressImage(f)); } catch (x) { $('#err').textContent = x.message; }
    }
    e.target.value = '';
    drawImgs();
  };

  $('#cancel').onclick = () => (opts.onCancel ? opts.onCancel() : (location.hash = '#/'));

  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const body = { ...d, phones: [d.phone1, d.phone2, d.phone3], images: imgs };
    if (!opts.admin) delete body.status;
    try {
      let id = p.id;
      if (isNew) id = (await api('POST', '/api/products', body)).id;
      else await api('PUT', `/api/products/${p.id}`, body);
      if (opts.onDone) opts.onDone(id);
      else location.hash = '#/product/' + id;
    } catch (x) {
      $('#err').textContent = x.message;
    }
  };
}

// ---------- Auth ----------
function authShell(inner) {
  return `<div class="auth"><div class="auth-card">${inner}</div></div>`;
}

function startCooldown(btn, sec = 60) {
  clearInterval(resendTick);
  let left = sec;
  const upd = () => {
    btn.disabled = left > 0;
    btn.textContent = left > 0 ? t('auth.resendIn', { s: left }) : t('auth.resend');
  };
  upd();
  resendTick = setInterval(() => {
    left--;
    upd();
    if (left <= 0) clearInterval(resendTick);
  }, 1000);
}

function loginView() {
  app.innerHTML = authShell(`
    <h2>${t('auth.loginTitle')}</h2>
    <p class="muted">${t('auth.loginSub')}</p>
    ${authNotice ? `<p class="notice">${esc(authNotice)}</p>` : ''}
    <form id="f" class="form">
      <input name="identifier" placeholder="${t('auth.identifier')}" required autocomplete="username">
      <input name="password" type="password" placeholder="${t('auth.password')}" required autocomplete="current-password">
      <button>${t('auth.loginBtn')}</button>
      <p id="err" class="err"></p>
    </form>
    <div class="auth-links"><a href="#/forgot">${t('auth.forgot')}</a><a href="#/register">${t('auth.noAccountLink')}</a></div>`);
  authNotice = '';
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/api/auth/login', Object.fromEntries(new FormData(e.target)));
      await loadMe();
      location.hash = '#/';
    } catch (x) {
      if (x.data && x.data.needVerify) {
        authCtx = { email: x.data.email, purpose: 'register' };
        location.hash = '#/verify';
      } else {
        $('#err').textContent = x.message;
      }
    }
  };
}

function registerView() {
  app.innerHTML = authShell(`
    <h2>${t('auth.registerTitle')}</h2>
    <p class="muted">${t('auth.registerSub')}</p>
    <form id="f" class="form">
      <input name="name" placeholder="${t('auth.name')}" required>
      <input name="email" type="email" placeholder="${t('auth.email')}" required autocomplete="email">
      <input name="phone" placeholder="${t('auth.phoneOptional')}" autocomplete="tel">
      <input name="password" type="password" placeholder="${t('auth.password')}" required minlength="6" autocomplete="new-password">
      <button>${t('auth.registerBtn')}</button>
      <p id="err" class="err"></p>
    </form>
    <div class="auth-links"><span></span><a href="#/login">${t('auth.haveAccountLink')}</a></div>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      await api('POST', '/api/auth/register', d);
      authCtx = { email: d.email.trim().toLowerCase(), purpose: 'register' };
      location.hash = '#/verify';
    } catch (x) { $('#err').textContent = x.message; }
  };
}

function verifyView() {
  if (!authCtx.email) return (location.hash = '#/login');
  app.innerHTML = authShell(`
    <h2>${t('auth.verifyTitle')}</h2>
    <p class="muted">${t('auth.verifyText', { email: esc(authCtx.email) })}</p>
    <form id="f" class="form">
      <input name="code" class="otp" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="······" required autocomplete="one-time-code">
      <button>${t('auth.verifyBtn')}</button>
      <button type="button" id="resend" class="ghost">${t('auth.resend')}</button>
      <p id="err" class="err"></p>
    </form>`);
  startCooldown($('#resend'));
  $('#resend').onclick = async () => {
    try {
      await api('POST', '/api/auth/resend', { email: authCtx.email, purpose: authCtx.purpose });
      startCooldown($('#resend'));
    } catch (x) { $('#err').textContent = x.message; }
  };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/api/auth/verify', { email: authCtx.email, code: e.target.code.value });
      await loadMe();
      location.hash = '#/';
    } catch (x) { $('#err').textContent = x.message; }
  };
}

function forgotView() {
  app.innerHTML = authShell(`
    <h2>${t('auth.forgotTitle')}</h2>
    <p class="muted">${t('auth.forgotText')}</p>
    <form id="f" class="form">
      <input name="email" type="email" placeholder="${t('auth.email')}" required autocomplete="email">
      <button>${t('auth.sendCode')}</button>
      <p id="err" class="err"></p>
    </form>
    <div class="auth-links"><span></span><a href="#/login">${t('auth.haveAccountLink')}</a></div>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase();
    try {
      await api('POST', '/api/auth/forgot', { email });
      authCtx = { email, purpose: 'reset' };
      location.hash = '#/reset';
    } catch (x) { $('#err').textContent = x.message; }
  };
}

function resetView() {
  if (!authCtx.email || authCtx.purpose !== 'reset') return (location.hash = '#/forgot');
  app.innerHTML = authShell(`
    <h2>${t('auth.resetTitle')}</h2>
    <p class="muted">${t('auth.verifyText', { email: esc(authCtx.email) })}</p>
    <form id="f" class="form">
      <input name="code" class="otp" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="······" required autocomplete="one-time-code">
      <input name="password" type="password" placeholder="${t('auth.newPassword')}" required minlength="6" autocomplete="new-password">
      <button>${t('auth.resetBtn')}</button>
      <button type="button" id="resend" class="ghost">${t('auth.resend')}</button>
      <p id="err" class="err"></p>
    </form>`);
  startCooldown($('#resend'));
  $('#resend').onclick = async () => {
    try {
      await api('POST', '/api/auth/resend', { email: authCtx.email, purpose: 'reset' });
      startCooldown($('#resend'));
    } catch (x) { $('#err').textContent = x.message; }
  };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/api/auth/reset', { email: authCtx.email, code: e.target.code.value, password: e.target.password.value });
      authNotice = t('auth.resetDone');
      location.hash = '#/login';
    } catch (x) { $('#err').textContent = x.message; }
  };
}

// ---------- Foydalanuvchi sahifalari ----------
function add() {
  if (!me) return (location.hash = '#/login');
  productForm({}, { onDone: (id) => (location.hash = '#/product/' + id), onCancel: () => (location.hash = '#/mine') });
}

async function edit(id) {
  if (!me) return (location.hash = '#/login');
  const p = await api('GET', '/api/products/' + id);
  const isAdmin = me.role === 'admin';
  productForm(p, {
    admin: isAdmin,
    onDone: () => (location.hash = '#/product/' + id),
    onCancel: () => (location.hash = '#/product/' + id),
  });
}

async function mine() {
  if (!me) return (location.hash = '#/login');
  const items = await api('GET', '/api/my/products');
  app.innerHTML = `<h2>${t('mine.title')}</h2>` +
    (items.map((p) => `<a class="row glass" href="#/product/${p.id}">
      <span class="info">${thumb(p, 'mini')}<span><b>${esc(p.title)}</b><br><small>${money(p.price, p.currency)}</small></span></span>
      <em class="st ${p.status}">${t('status.' + p.status)}</em></a>`).join('') || `<div class="empty glass">${t('mine.empty')}</div>`);
}

async function chats() {
  if (!me) return (location.hash = '#/login');
  const list = await api('GET', '/api/conversations');
  app.innerHTML = `<h2>${t('chats.title')}</h2>` +
    (list.map((c) => `<a class="row glass" href="#/chat/${c.id}">
      <span><b>${esc(c.other_name)}</b><br><small>${esc(c.product_title)}</small></span>
      <small>${esc(c.last_text || '')}</small></a>`).join('') || `<div class="empty glass">${t('chats.empty')}</div>`);
}

async function chat(id) {
  if (!me) return (location.hash = '#/login');
  app.innerHTML = `
    <div class="chat glass">
      <div id="msgs"></div>
      <form id="f"><input name="text" placeholder="${t('chat.placeholder')}" required autocomplete="off"><button>${t('chat.send')}</button></form>
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

// ---------- Router ----------
const routes = {
  '': home,
  login: loginView,
  register: registerView,
  verify: verifyView,
  forgot: forgotView,
  reset: resetView,
  add,
  edit: (id) => edit(id),
  mine,
  chats,
  product: (id) => product(id),
  chat: (id) => chat(id),
  admin: () => adminPanel(),
};

async function render() {
  clearInterval(timer);
  clearInterval(resendTick);
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
  if (e.target.dataset && e.target.dataset.lang) {
    e.preventDefault();
    setLang(e.target.dataset.lang);
    return;
  }
  if (e.target.id !== 'logout') return;
  e.preventDefault();
  await api('POST', '/api/logout');
  me = null;
  location.hash = '#/';
  render();
});

window.addEventListener('hashchange', render);
document.documentElement.lang = LANG;
loadMe().then(render);
