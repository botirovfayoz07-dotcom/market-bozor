const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'bozor';

if (!MONGODB_URI) {
  console.error('MONGODB_URI muhit o‘zgaruvchisi kerak (Atlas connection string)');
  process.exit(1);
}

const CATEGORIES = ['Payvandlash va generatorlar', 'Nasoslar', 'Shlanglar va quvurlar', 'Boshqa'];
const CONDITIONS = ['new', 'used'];
const STATUSES = ['pending', 'active', 'rejected'];

// SMTP sozlanmagan bo‘lsa, kodlar serverning konsoliga chiqadi (test uchun)
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

let db;
const col = (name) => db.collection(name);

// ---------- Helpers ----------
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

const toOid = (s) => (ObjectId.isValid(String(s)) ? new ObjectId(String(s)) : null);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function normPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  const full = d.length === 9 ? '998' + d : d;
  return /^998\d{9}$/.test(full) ? '+' + full : null;
}

// Mongo hujjatini API javobiga aylantiradi (_id -> id, parol yashiriladi)
function out(d) {
  if (!d) return d;
  const { _id, password_hash, ...rest } = d;
  const r = { id: String(_id) };
  for (const [k, v] of Object.entries(rest)) r[k] = v instanceof ObjectId ? String(v) : v;
  return r;
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

// ---------- Email kodlari ----------
const codeHash = (code) => crypto.createHash('sha256').update(code + SECRET).digest('hex');

async function sendCode(email, code, purpose) {
  if (!mailer) {
    console.log(`[DEV] ${email} (${purpose}) uchun kod: ${code}`);
    return;
  }
  const what = purpose === 'reset' ? 'parolni tiklash' : 'ro‘yxatdan o‘tish';
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Bozor — tasdiqlash kodi',
    text: `Bozor: ${what} uchun kod: ${code}\nKod 10 daqiqa amal qiladi. Siz so‘ramagan bo‘lsangiz, xabarni e‘tiborsiz qoldiring.`,
  });
}

async function issueCode(email, purpose) {
  const prev = await col('email_codes').findOne({ email, purpose });
  if (prev && Date.now() - prev.last_sent_at.getTime() < 60000)
    fail(429, 'Kod allaqachon yuborilgan. 1 daqiqadan keyin qayta urinib ko‘ring');
  const code = String(crypto.randomInt(100000, 1000000));
  await col('email_codes').updateOne(
    { email, purpose },
    { $set: { code_hash: codeHash(code), expires_at: new Date(Date.now() + 10 * 60000), attempts: 0, last_sent_at: new Date() } },
    { upsert: true },
  );
  await sendCode(email, code, purpose);
}

async function verifyCode(email, purpose, code) {
  const c = await col('email_codes').findOne({ email, purpose });
  if (!c || c.expires_at < new Date()) fail(400, 'Kod muddati tugagan. Yangi kod so‘rang');
  if (c.attempts >= 5) fail(429, 'Juda ko‘p urinish. Yangi kod so‘rang');
  if (c.code_hash !== codeHash(String(code || '').trim())) {
    await col('email_codes').updateOne({ _id: c._id }, { $inc: { attempts: 1 } });
    fail(400, 'Kod noto‘g‘ri');
  }
  await col('email_codes').deleteOne({ _id: c._id });
}

// ---------- Mahsulot maydonlarini tekshirish ----------
// partial = true bo‘lsa faqat yuborilgan maydonlar yangilanadi
function productInput(b, partial) {
  const s = {};
  const want = (k) => !partial || b[k] !== undefined;
  if (want('title')) {
    s.title = String(b.title || '').trim().slice(0, 120);
    if (!s.title) fail(400, 'Nomi kiritilishi shart');
  }
  if (want('brand')) s.brand = String(b.brand || '').trim().slice(0, 60);
  if (want('category')) s.category = CATEGORIES.includes(b.category) ? b.category : 'Boshqa';
  if (want('condition')) s.condition = CONDITIONS.includes(b.condition) ? b.condition : 'new';
  if (want('description')) s.description = String(b.description || '').slice(0, 3000);
  if (want('city')) s.city = String(b.city || '').trim().slice(0, 60);
  if (want('price')) {
    s.price = Number(b.price);
    if (!(s.price > 0)) fail(400, 'Narx noto‘g‘ri');
  }
  if (want('retail_price')) {
    const r = Number(b.retail_price);
    s.retail_price = r > 0 ? r : null;
  }
  if (want('currency')) s.currency = b.currency === 'USD' ? 'USD' : "so'm";
  if (want('stock')) {
    const n = parseInt(b.stock, 10);
    s.stock = n >= 0 ? n : null;
  }
  if (want('phones')) {
    s.phones = (Array.isArray(b.phones) ? b.phones : []).map(normPhone).filter(Boolean).slice(0, 3);
    if (!partial && !s.phones.length) fail(400, 'Kamida bitta to‘g‘ri telefon kiriting');
  }
  if (want('images')) {
    const im = Array.isArray(b.images) ? b.images : [];
    if (im.length > 5) fail(400, 'Ko‘pi bilan 5 ta rasm');
    for (const x of im) {
      if (typeof x !== 'string' || !x.startsWith('data:image/') || x.length > 700000)
        fail(400, 'Rasm noto‘g‘ri yoki juda katta');
    }
    s.images = im;
  }
  return s;
}

// ---------- App ----------
const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ----- Auth -----
app.get('/api/me', wrap(async (req, res) => res.json({ user: await currentUser(req) })));

app.post('/api/auth/register', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60);
  const email = normEmail(req.body.email);
  const password = String(req.body.password || '');
  const phone = req.body.phone ? normPhone(req.body.phone) : null;
  if (!name) fail(400, 'Ism kiritilishi shart');
  if (!validEmail(email)) fail(400, 'Email noto‘g‘ri');
  if (password.length < 6) fail(400, 'Parol kamida 6 belgi bo‘lsin');
  if (req.body.phone && !phone) fail(400, 'Telefon noto‘g‘ri (+998 XX XXX XX XX)');

  const existing = await col('users').findOne({ email });
  if (existing && existing.verified !== false) fail(409, 'Bu email ro‘yxatdan o‘tgan');
  if (phone) {
    const other = await col('users').findOne({ phone });
    if (other && (!existing || !other._id.equals(existing._id))) fail(409, 'Bu telefon raqam band');
  }

  const doc = { name, email, password_hash: bcrypt.hashSync(password, 10), role: 'user', blocked: false, verified: false, created_at: new Date() };
  if (existing) {
    const update = { $set: doc };
    if (phone) doc.phone = phone; else update.$unset = { phone: '' };
    await col('users').updateOne({ _id: existing._id }, update);
  } else {
    if (phone) doc.phone = phone;
    await col('users').insertOne(doc);
  }
  await issueCode(email, 'register');
  res.json({ ok: true });
}));

app.post('/api/auth/verify', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  await verifyCode(email, 'register', req.body.code);
  const u = await col('users').findOne({ email });
  if (!u) fail(404, 'Foydalanuvchi topilmadi');
  await col('users').updateOne({ _id: u._id }, { $set: { verified: true } });
  setSession(res, u._id);
  res.json({ ok: true });
}));

app.post('/api/auth/resend', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const purpose = req.body.purpose === 'reset' ? 'reset' : 'register';
  const u = await col('users').findOne({ email });
  if (u && (purpose === 'reset' || u.verified === false)) await issueCode(email, purpose);
  res.json({ ok: true });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const id = String(req.body.identifier || '').trim();
  let u = null;
  if (id.includes('@')) u = await col('users').findOne({ email: normEmail(id) });
  else if (normPhone(id)) u = await col('users').findOne({ phone: normPhone(id) });
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.password_hash))
    fail(401, 'Login yoki parol noto‘g‘ri');
  if (u.blocked) fail(403, 'Hisobingiz bloklangan');
  if (u.verified === false)
    return res.status(403).json({ error: 'Email hali tasdiqlanmagan', needVerify: true, email: u.email });
  setSession(res, u._id);
  res.json({ ok: true });
}));

app.post('/api/auth/forgot', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const u = await col('users').findOne({ email });
  if (u) await issueCode(email, 'reset');
  res.json({ ok: true });
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const password = String(req.body.password || '');
  if (password.length < 6) fail(400, 'Parol kamida 6 belgi bo‘lsin');
  await verifyCode(email, 'reset', req.body.code);
  await col('users').updateOne({ email }, { $set: { password_hash: bcrypt.hashSync(password, 10) } });
  res.json({ ok: true });
}));

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// ----- Mahsulotlar -----
// Ro‘yxatda faqat birinchi rasm yuboriladi (tezroq yuklanishi uchun)
const LIST_PROJECTION = { images: { $slice: 1 } };

app.get('/api/products', wrap(async (req, res) => {
  const filter = { status: 'active' };
  if (req.query.q) filter.title = { $regex: escapeRegex(String(req.query.q)), $options: 'i' };
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.city) filter.city = String(req.query.city);
  const rows = await col('products').find(filter, { projection: LIST_PROJECTION }).sort({ _id: -1 }).limit(200).toArray();
  res.json(await attachSeller(rows));
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  const p = oid && (await col('products').findOne({ _id: oid }));
  if (!p) fail(404, 'Topilmadi');
  const u = await currentUser(req);
  const canSee = p.status === 'active' || (u && (u.id === String(p.owner_id) || u.role === 'admin'));
  if (!canSee) fail(404, 'Topilmadi');
  res.json((await attachSeller([p]))[0]);
}));

app.post('/api/products', auth, wrap(async (req, res) => {
  const s = productInput(req.body, false);
  const isAdmin = req.user.role === 'admin';
  let status = 'pending';
  if (isAdmin) status = STATUSES.includes(req.body.status) ? req.body.status : 'active';
  const r = await col('products').insertOne({
    ...s, owner_id: toOid(req.user.id), status, created_at: new Date(), updated_at: new Date(),
  });
  res.json({ id: String(r.insertedId) });
}));

app.put('/api/products/:id', auth, wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  const p = oid && (await col('products').findOne({ _id: oid }));
  if (!p) fail(404, 'Topilmadi');
  const isAdmin = req.user.role === 'admin';
  if (String(p.owner_id) !== req.user.id && !isAdmin) fail(403, 'Ruxsat yo‘q');

  const set = { ...productInput(req.body, true), updated_at: new Date() };
  if (isAdmin) {
    if (req.body.status !== undefined) {
      if (!STATUSES.includes(req.body.status)) fail(400, 'Noto‘g‘ri holat');
      set.status = req.body.status;
    }
  } else {
    set.status = 'pending'; // egasi tahrirlasa, qayta tekshiruvga tushadi
  }
  await col('products').updateOne({ _id: oid }, { $set: set });
  res.json({ ok: true });
}));

app.delete('/api/products/:id', auth, wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  const p = oid && (await col('products').findOne({ _id: oid }));
  if (!p) fail(404, 'Topilmadi');
  if (String(p.owner_id) !== req.user.id && req.user.role !== 'admin') fail(403, 'Ruxsat yo‘q');
  await deleteProduct(oid);
  res.json({ ok: true });
}));

app.get('/api/my/products', auth, wrap(async (req, res) => {
  const rows = await col('products').find({ owner_id: toOid(req.user.id) }, { projection: LIST_PROJECTION })
    .sort({ _id: -1 }).toArray();
  res.json(await attachSeller(rows));
}));

// ----- Chat -----
app.post('/api/products/:id/chat', auth, wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  const p = oid && (await col('products').findOne({ _id: oid, status: 'active' }));
  if (!p) fail(404, 'E‘lon topilmadi');
  if (String(p.owner_id) === req.user.id) fail(400, 'O‘z e‘loningizga yozib bo‘lmaydi');
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
  const convs = await col('conversations').find({ $or: [{ buyer_id: uid }, { seller_id: uid }] }).sort({ _id: -1 }).toArray();
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
  if (!conv) fail(404, 'Topilmadi');
  const msgs = await col('messages').find({ conversation_id: conv._id }).sort({ _id: 1 }).toArray();
  res.json(msgs.map(out));
}));

app.post('/api/conversations/:id/messages', auth, wrap(async (req, res) => {
  const conv = await conversationFor(req.params.id, toOid(req.user.id));
  if (!conv) fail(404, 'Topilmadi');
  const text = String(req.body.text || '').trim().slice(0, 2000);
  if (!text) fail(400, 'Bo‘sh xabar');
  await col('messages').insertOne({ conversation_id: conv._id, sender_id: toOid(req.user.id), text, created_at: new Date() });
  res.json({ ok: true });
}));

// ----- Admin -----
app.get('/api/admin/stats', adminOnly, wrap(async (req, res) => {
  res.json({
    users: await col('users').countDocuments(),
    active: await col('products').countDocuments({ status: 'active' }),
    pending: await col('products').countDocuments({ status: 'pending' }),
  });
}));

app.get('/api/admin/products', adminOnly, wrap(async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const rows = await col('products').find(status ? { status } : {}, { projection: LIST_PROJECTION })
    .sort({ _id: -1 }).toArray();
  res.json(await attachSeller(rows));
}));

app.get('/api/admin/users', adminOnly, wrap(async (req, res) => {
  const rows = await col('users').find({}, { projection: { password_hash: 0 } }).sort({ _id: -1 }).toArray();
  res.json(rows.map(out));
}));

app.post('/api/admin/users/:id/block', adminOnly, wrap(async (req, res) => {
  const oid = toOid(req.params.id);
  if (!oid) fail(404, 'Topilmadi');
  await col('users').updateOne({ _id: oid, role: { $ne: 'admin' } }, { $set: { blocked: !!req.body.blocked } });
  res.json({ ok: true });
}));

// ----- Xatolar -----
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Noto‘g‘ri so‘rov' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Ma‘lumot juda katta' });
  console.error(err);
  res.status(500).json({ error: 'Server xatosi' });
});

// ---------- Ishga tushirish ----------
async function bootstrapAdmin() {
  if (!process.env.ADMIN_PASSWORD || !(process.env.ADMIN_EMAIL || process.env.ADMIN_PHONE)) return;
  const email = process.env.ADMIN_EMAIL ? normEmail(process.env.ADMIN_EMAIL) : null;
  const phone = normPhone(process.env.ADMIN_PHONE);
  const filter = email ? { email } : { phone };
  const set = { role: 'admin', password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10), verified: true, blocked: false };
  if (email) set.email = email;
  if (phone) set.phone = phone;
  await col('users').updateOne(filter, { $set: set, $setOnInsert: { name: 'Admin', created_at: new Date() } }, { upsert: true });
}

// Eski (sparse bo‘lmagan) indeksni o‘chirib, sparse-unique qilib qayta yaratadi
async function ensureSparseUnique(collection, field) {
  const name = `${field}_1`;
  const indexes = await col(collection).indexes();
  const existing = indexes.find((i) => i.name === name);
  if (existing && !existing.sparse) {
    await col(collection).dropIndex(name);
  }
  if (!existing || !existing.sparse) {
    await col(collection).createIndex({ [field]: 1 }, { unique: true, sparse: true, name });
  }
}

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('MongoDB Atlas ulandi:', DB_NAME);
  await ensureSparseUnique('users', 'email');
  await ensureSparseUnique('users', 'phone');
  await col('email_codes').createIndex({ email: 1, purpose: 1 }, { unique: true });
  await col('email_codes').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  await col('conversations').createIndex({ product_id: 1, buyer_id: 1 }, { unique: true });
  await col('products').createIndex({ status: 1, _id: -1 });
  await col('messages').createIndex({ conversation_id: 1, _id: 1 });
  await bootstrapAdmin();
  app.listen(PORT, () => console.log(`Bozor ishga tushdi: http://localhost:${PORT}`));
})().catch((e) => {
  console.error('Ishga tushmadi:', e.message);
  process.exit(1);
});
