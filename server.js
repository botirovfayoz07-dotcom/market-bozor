const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'bozor';

if (!MONGODB_URI) {
  console.error('MONGODB_URI muhit o‘zgaruvchisi kerak (Atlas connection string)');
  process.exit(1);
}

let db;
const col = (name) => db.collection(name);

// ---------- Helpers ----------
const toOid = (s) => (ObjectId.isValid(String(s)) ? new ObjectId(String(s)) : null);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Mongo document -> API object (_id -> id, ObjectIds -> strings, password never leaves server)
function out(d) {
  if (!d) return d;
  const { _id, password_hash, ...rest } = d;
  const r = { id: String(_id) };
  for (const [k, v] of Object.entries(rest)) r[k] = v instanceof ObjectId ? String(v) : v;
  return r;
}

function normPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  const full = d.length === 9 ? '998' + d : d;
  return /^998\d{9}$/.test(full) ? '+' + full : null;
}

async function attachSeller(list) {
  const ids = [...new Set(list.map((p) => String(p.owner_id)))].map(toOid);
  const users = await col('users').find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray();
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  return list.map((p) => ({ ...out(p), seller_name: names.get(String(p.owner_id)) || '' }));
}

function setSession(res, id) {
  const token = jwt.sign({ id: String(id) }, SECRET, { expiresIn: '30d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 864e5 });
}

async function currentUser(req) {
  try {
    const { id } = jwt.verify(req.cookies.token || '', SECRET);
    const u = await col('users').findOne({ _id: toOid(id) });
    return u && !u.blocked ? out(u) : null;
  } catch {
    return null;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const auth = wrap(async (req, res, next) => {
  req.user = await currentUser(req);
  if (!req.user) return res.status(401).json({ error: 'Avval tizimga kiring' });
  next();
});

const adminOnly = wrap(async (req, res, next) => {
  req.user = await currentUser(req);
  if (!req.user) return res.status(401).json({ error: 'Avval tizimga kiring' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Ruxsat yo‘q' });
  next();
});

async function deleteProduct(productId) {
  const convs = await col('conversations').find({ product_id: productId }, { projection: { _id: 1 } }).toArray();
  const convIds = convs.map((c) => c._id);
  await col('messages').deleteMany({ conversation_id: { $in: convIds } });
  await col('conversations').deleteMany({ _id: { $in: convIds } });
  await col('products').deleteOne({ _id: productId });
}

async function conversationFor(convId, uid) {
  const oid = toOid(convId);
  if (!oid) return null;
  return col('conversations').findOne({ _id: oid, $or: [{ buyer_id: uid }, { seller_id: uid }] });
}

// ---------- App ----------
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth
app.get('/api/me', wrap(async (req, res) => res.json({ user: await currentUser(req) })));

app.post('/api/register', wrap(async (req, res) => {
  const phone = normPhone(req.body.phone);
  const name = String(req.body.name || '').trim();
  const password = String(req.body.password || '');
  if (!phone) return res.status(400).json({ error: 'Telefon noto‘g‘ri (+998 XX XXX XX XX)' });
  if (!name || password.length < 6) return res.status(400).json({ error: 'Ism va kamida 6 belgili parol kerak' });
  if (await col('users').findOne({ phone })) return res.status(409).json({ error: 'Bu raqam ro‘yxatdan o‘tgan' });
  const r = await col('users').insertOne({
    phone, name, password_hash: bcrypt.hashSync(password, 10),
    role: 'user', blocked: false, created_at: new Date(),
  });
  setSession(res, r.insertedId);
  res.json({ ok: true });
}));

app.post('/api/login', wrap(async (req, res) => {
  const phone = normPhone(req.body.phone);
  const u = phone && (await col('users').findOne({ phone }));
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.password_hash))
    return res.status(401).json({ error: 'Raqam yoki parol noto‘g‘ri' });
  if (u.blocked) return res.status(403).json({ error: 'Hisobingiz bloklangan' });
  setSession(res, u._id);
  res.json({ ok: true });
}));

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// Products (public listing = admin-approved only)
app.get('/api/products', wrap(async (req, res) => {
  const filter = { status: 'active' };
  if (req.query.q) filter.title = { $regex: escapeRegex(String(req.query.q)), $options: 'i' };
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.city) filter.city = String(req.query.city);
  const rows = await col('products').find(filter).sort({ _id: -1 }).limit(200).toArray();
  res.json(await attachSeller(rows));
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  const p = oid && (await col('products').findOne({ _id: oid }));
  if (!p) return res.status(404).json({ error: 'Topilmadi' });
  const u = await currentUser(req);
  const canSee = p.status === 'active' || (u && (u.id === String(p.owner_id) || u.role === 'admin'));
  if (!canSee) return res.status(404).json({ error: 'Topilmadi' });
  res.json((await attachSeller([p]))[0]);
}));

app.post('/api/products', auth, wrap(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const price = parseInt(req.body.price, 10);
  const phones = (Array.isArray(req.body.phones) ? req.body.phones : []).map(normPhone).filter(Boolean).slice(0, 3);
  if (!title || !(price > 0)) return res.status(400).json({ error: 'Sarlavha va narx kerak' });
  if (!phones.length) return res.status(400).json({ error: 'Kamida bitta to‘g‘ri telefon kiriting' });
  const r = await col('products').insertOne({
    owner_id: toOid(req.user.id), title,
    description: String(req.body.description || '').slice(0, 3000),
    price, category: String(req.body.category || ''),
    city: String(req.body.city || '').slice(0, 60),
    phones, status: 'pending', created_at: new Date(),
  });
  res.json({ id: String(r.insertedId) });
}));

app.get('/api/my/products', auth, wrap(async (req, res) => {
  const rows = await col('products').find({ owner_id: toOid(req.user.id) }).sort({ _id: -1 }).toArray();
  res.json(await attachSeller(rows));
}));

app.delete('/api/products/:id', auth, wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  const p = oid && (await col('products').findOne({ _id: oid }));
  if (!p) return res.status(404).json({ error: 'Topilmadi' });
  if (String(p.owner_id) !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Ruxsat yo‘q' });
  await deleteProduct(oid);
  res.json({ ok: true });
}));

// Chat between buyer and seller
app.post('/api/products/:id/chat', auth, wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  const p = oid && (await col('products').findOne({ _id: oid, status: 'active' }));
  if (!p) return res.status(404).json({ error: 'E‘lon topilmadi' });
  if (String(p.owner_id) === req.user.id) return res.status(400).json({ error: 'O‘z e‘loningizga yozib bo‘lmaydi' });
  const buyer = toOid(req.user.id);
  await col('conversations').updateOne(
    { product_id: p._id, buyer_id: buyer },
    { $setOnInsert: { product_id: p._id, buyer_id: buyer, seller_id: p.owner_id, created_at: new Date() } },
    { upsert: true },
  );
  const c = await col('conversations').findOne({ product_id: p._id, buyer_id: buyer });
  res.json({ id: String(c._id) });
}));

app.get('/api/conversations', auth, wrap(async (req, res) => {
  const uid = toOid(req.user.id);
  const convs = await col('conversations')
    .find({ $or: [{ buyer_id: uid }, { seller_id: uid }] }).sort({ _id: -1 }).toArray();
  const prodIds = convs.map((c) => c.product_id);
  const userIds = convs.flatMap((c) => [c.buyer_id, c.seller_id]);
  const [prods, users] = await Promise.all([
    col('products').find({ _id: { $in: prodIds } }, { projection: { title: 1 } }).toArray(),
    col('users').find({ _id: { $in: userIds } }, { projection: { name: 1 } }).toArray(),
  ]);
  const titles = new Map(prods.map((p) => [String(p._id), p.title]));
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  const result = await Promise.all(convs.map(async (c) => {
    const last = await col('messages').find({ conversation_id: c._id }).sort({ _id: -1 }).limit(1).toArray();
    const otherId = String(c.buyer_id) === req.user.id ? c.seller_id : c.buyer_id;
    return {
      id: String(c._id),
      product_title: titles.get(String(c.product_id)) || '',
      other_name: names.get(String(otherId)) || '',
      last_text: last[0]?.text || '',
    };
  }));
  res.json(result);
}));

app.get('/api/conversations/:id/messages', auth, wrap(async (req, res) => {
  const conv = await conversationFor(req.params.id, toOid(req.user.id));
  if (!conv) return res.status(404).json({ error: 'Topilmadi' });
  const msgs = await col('messages').find({ conversation_id: conv._id }).sort({ _id: 1 }).toArray();
  res.json(msgs.map(out));
}));

app.post('/api/conversations/:id/messages', auth, wrap(async (req, res) => {
  const conv = await conversationFor(req.params.id, toOid(req.user.id));
  if (!conv) return res.status(404).json({ error: 'Topilmadi' });
  const text = String(req.body.text || '').trim().slice(0, 2000);
  if (!text) return res.status(400).json({ error: 'Bo‘sh xabar' });
  await col('messages').insertOne({
    conversation_id: conv._id, sender_id: toOid(req.user.id), text, created_at: new Date(),
  });
  res.json({ ok: true });
}));

// Admin
app.get('/api/admin/stats', adminOnly, wrap(async (req, res) => {
  res.json({
    users: await col('users').countDocuments(),
    active: await col('products').countDocuments({ status: 'active' }),
    pending: await col('products').countDocuments({ status: 'pending' }),
  });
}));

app.get('/api/admin/products', adminOnly, wrap(async (req, res) => {
  const status = ['pending', 'active', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const rows = await col('products').find({ status }).sort({ _id: -1 }).toArray();
  res.json(await attachSeller(rows));
}));

app.post('/api/admin/products/:id/status', adminOnly, wrap(async (req, res) => {
  if (!['pending', 'active', 'rejected'].includes(req.body.status))
    return res.status(400).json({ error: 'Noto‘g‘ri holat' });
  const oid = toOid(req.params.id);
  if (!oid) return res.status(404).json({ error: 'Topilmadi' });
  await col('products').updateOne({ _id: oid }, { $set: { status: req.body.status } });
  res.json({ ok: true });
}));

app.get('/api/admin/users', adminOnly, wrap(async (req, res) => {
  const rows = await col('users').find({}, { projection: { password_hash: 0 } }).sort({ _id: -1 }).toArray();
  res.json(rows.map(out));
}));

app.post('/api/admin/users/:id/block', adminOnly, wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  if (!oid) return res.status(404).json({ error: 'Topilmadi' });
  await col('users').updateOne({ _id: oid, role: { $ne: 'admin' } }, { $set: { blocked: !!req.body.blocked } });
  res.json({ ok: true });
}));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server xatosi' });
});

// ---------- Startup ----------
async function bootstrapAdmin() {
  if (!process.env.ADMIN_PHONE || !process.env.ADMIN_PASSWORD) return;
  const phone = normPhone(process.env.ADMIN_PHONE);
  if (!phone) throw new Error('ADMIN_PHONE noto‘g‘ri');
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  await col('users').updateOne(
    { phone },
    { $set: { role: 'admin', password_hash: hash, blocked: false },
      $setOnInsert: { phone, name: 'Admin', created_at: new Date() } },
    { upsert: true },
  );
}

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('MongoDB Atlas ulandi:', DB_NAME);
  await col('users').createIndex({ phone: 1 }, { unique: true });
  await col('conversations').createIndex({ product_id: 1, buyer_id: 1 }, { unique: true });
  await col('products').createIndex({ status: 1, _id: -1 });
  await col('messages').createIndex({ conversation_id: 1, _id: 1 });
  await bootstrapAdmin();
  app.listen(PORT, () => console.log(`Bozor ishga tushdi: http://localhost:${PORT}`));
})().catch((e) => {
  console.error('Ishga tushmadi:', e.message);
  process.exit(1);
});
