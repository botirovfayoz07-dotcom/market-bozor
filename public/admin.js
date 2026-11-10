// Admin panel (app.js dagi umumiy funksiyalar: api, t, money, productForm, thumb ...)
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
  const filters = [
    ['pending', t('status.pending')],
    ['active', t('status.active')],
    ['rejected', t('status.rejected')],
    ['all', t('admin.filterAll')],
  ];

  app.innerHTML = `
    <h2>${t('admin.title')}</h2>
    <p class="muted">${t('admin.stats', { users: stats.users, active: stats.active, pending: stats.pending })}</p>
    <div class="bar">
      <select id="flt">${filters.map(([v, label]) => `<option value="${v}" ${v === adminFilter ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <button id="newP">${t('admin.new')}</button>
    </div>
    ${prods.map((p) => `
      <div class="row glass">
        <span class="info">${thumb(p, 'mini')}
          <span><b>${esc(p.title)}</b> — ${money(p.price, p.currency)}
          <br><small>${esc(catLabel(p.category))} · ${p.phones.map(esc).join(', ')} · <em class="st ${p.status}">${t('status.' + p.status)}</em></small></span>
        </span>
        <span class="acts">
          ${p.status !== 'active' ? `<button data-act="active" data-id="${p.id}">${t('admin.approve')}</button>` : ''}
          ${p.status !== 'rejected' ? `<button class="danger" data-act="rejected" data-id="${p.id}">${t('admin.reject')}</button>` : ''}
          <button class="ghost" data-edit="${p.id}">${t('admin.edit')}</button>
          <button class="danger" data-del="${p.id}">${t('admin.delete')}</button>
        </span>
      </div>`).join('') || `<div class="empty glass">${t('admin.empty')}</div>`}
    <h3>${t('admin.users')}</h3>
    ${users.map((u) => `
      <div class="row glass">
        <span>${esc(u.name)} · ${esc(u.email || '')} ${esc(u.phone || '')} · <small>${u.role}</small></span>
        ${u.role !== 'admin' ? `<button class="${u.blocked ? '' : 'danger'}" data-block="${u.id}" data-val="${u.blocked ? 0 : 1}">
          ${u.blocked ? t('admin.unblock') : t('admin.block')}</button>` : ''}
      </div>`).join('')}`;

  $('#flt').onchange = (e) => { adminFilter = e.target.value; drawAdmin(); };
  $('#newP').onclick = () => productForm({}, { admin: true, onDone: () => drawAdmin(), onCancel: () => drawAdmin() });

  app.querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => {
    await api('PUT', `/api/products/${b.dataset.id}`, { status: b.dataset.act });
    drawAdmin();
  });
  app.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
    const p = await api('GET', `/api/products/${b.dataset.edit}`);
    productForm(p, { admin: true, onDone: () => drawAdmin(), onCancel: () => drawAdmin() });
  });
  app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!confirm(t('admin.deleteConfirm'))) return;
    await api('DELETE', `/api/products/${b.dataset.del}`);
    drawAdmin();
  });
  app.querySelectorAll('[data-block]').forEach((b) => b.onclick = async () => {
    await api('POST', `/api/admin/users/${b.dataset.block}/block`, { blocked: b.dataset.val === '1' });
    drawAdmin();
  });
}
