// Admin panel (uses globals from app.js: app, api, esc, money, CATS, STATUS, me)
let adminFilter = 'pending';

async function adminPanel() {
  if (!me || me.role !== 'admin') return (location.hash = '#/');
  await drawAdmin();
}

async function drawAdmin() {
  const [stats, prods, users] = await Promise.all([
    api('GET', '/api/admin/stats'),
    api('GET', '/api/admin/products?status=' + adminFilter),
    api('GET', '/api/admin/users'),
  ]);
  const filters = [['pending', 'Tekshiruvda'], ['active', 'Faol'], ['rejected', 'Rad etilgan'], ['all', 'Barchasi']];
  app.innerHTML = `
    <h2>Admin panel</h2>
    <p>Foydalanuvchilar: ${stats.users} · Faol: ${stats.active} · Tekshiruvda: ${stats.pending}</p>
    <div class="bar">
      <select id="flt">${filters.map(([v, t]) => `<option value="${v}" ${v === adminFilter ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <button id="newP">+ Yangi mahsulot</button>
    </div>
    ${prods.map((p) => `
      <div class="row">
        <div>
          <b>${esc(p.title)}</b> — ${money(p.price, p.currency)}
          <br><small>${esc(p.category)} · ${p.phones.map(esc).join(', ')} · <em class="st ${p.status}">${STATUS[p.status]}</em></small>
        </div>
        <span class="acts">
          ${p.status !== 'active' ? `<button data-act="active" data-id="${p.id}">Tasdiqlash</button>` : ''}
          ${p.status !== 'rejected' ? `<button class="danger" data-act="rejected" data-id="${p.id}">Rad etish</button>` : ''}
          <button data-edit="${p.id}">Tahrirlash</button>
          <button class="danger" data-del="${p.id}">O‘chirish</button>
        </span>
      </div>`).join('') || '<p>Bu bo‘limda e‘lon yo‘q</p>'}
    <h3>Foydalanuvchilar</h3>
    ${users.map((u) => `
      <div class="row">
        <span>${esc(u.name)} · ${esc(u.phone)} · ${u.role}</span>
        ${u.role !== 'admin' ? `<button class="${u.blocked ? '' : 'danger'}" data-block="${u.id}" data-val="${u.blocked ? 0 : 1}">
          ${u.blocked ? 'Blokdan chiqarish' : 'Bloklash'}</button>` : ''}
      </div>`).join('')}`;

  $('#flt').onchange = (e) => { adminFilter = e.target.value; drawAdmin(); };
  $('#newP').onclick = () => productForm({});

  app.querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => {
    await api('PUT', `/api/admin/products/${b.dataset.id}`, { status: b.dataset.act });
    drawAdmin();
  });
  app.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
    productForm(await api('GET', `/api/products/${b.dataset.edit}`));
  });
  app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!confirm('Mahsulot butunlay o‘chirilsinmi?')) return;
    await api('DELETE', `/api/admin/products/${b.dataset.del}`);
    drawAdmin();
  });
  app.querySelectorAll('[data-block]').forEach((b) => b.onclick = async () => {
    await api('POST', `/api/admin/users/${b.dataset.block}/block`, { blocked: b.dataset.val === '1' });
    drawAdmin();
  });
}

function productForm(p) {
  const ph = [0, 1, 2].map((i) => (p.phones && p.phones[i]) || '');
  app.innerHTML = `
    <form id="f" class="form">
      <h2>${p.id ? 'Tahrirlash' : 'Yangi mahsulot'}</h2>
      <input name="title" placeholder="Nomi" required value="${esc(p.title || '')}">
      <select name="category">${CATS.map((c) => `<option ${c === p.category ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <input name="price" type="number" step="any" min="0" placeholder="Narx (optom)" required value="${p.price ?? ''}">
      <input name="retail_price" type="number" step="any" min="0" placeholder="Chakana narx (ixtiyoriy)" value="${p.retail_price ?? ''}">
      <select name="currency">
        <option value="USD" ${p.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
        <option value="so'm" ${p.currency !== 'USD' ? 'selected' : ''}>so‘m</option>
      </select>
      <textarea name="description" placeholder="Tavsif">${esc(p.description || '')}</textarea>
      <input name="city" placeholder="Shahar" value="${esc(p.city || '')}">
      <input name="phone1" placeholder="Telefon 1" required value="${esc(ph[0])}">
      <input name="phone2" placeholder="Telefon 2 (ixtiyoriy)" value="${esc(ph[1])}">
      <input name="phone3" placeholder="Telefon 3 (ixtiyoriy)" value="${esc(ph[2])}">
      <div class="actions"><button>Saqlash</button><button type="button" id="back">Ortga</button></div>
      <p id="err" class="err"></p>
    </form>`;

  $('#back').onclick = () => drawAdmin();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const body = {
      title: d.title, category: d.category, price: d.price,
      retail_price: d.retail_price || null, currency: d.currency,
      description: d.description, city: d.city,
      phones: [d.phone1, d.phone2, d.phone3],
    };
    try {
      if (p.id) {
        await api('PUT', `/api/admin/products/${p.id}`, body);
      } else {
        const r = await api('POST', '/api/products', body);
        await api('PUT', `/api/admin/products/${r.id}`, { ...body, status: 'active' });
      }
      adminFilter = p.id ? adminFilter : 'active';
      drawAdmin();
    } catch (x) {
      $('#err').textContent = x.message;
    }
  };
}
