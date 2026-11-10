// Narx ro‘yxatini (data/products.json) MongoDB Atlas'ga yuklaydi.
// Ishlatish: node --env-file=.env seed.js
// Admin topilmasa, .env dagi ADMIN_EMAIL va ADMIN_PASSWORD bilan o‘zi yaratadi.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const CONTACT_PHONE = '+998505005064';

function normPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  const full = d.length === 9 ? '998' + d : d;
  return /^998\d{9}$/.test(full) ? '+' + full : null;
}

(async () => {
  const { MONGODB_URI, DB_NAME = 'bozor', ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI) throw new Error('MONGODB_URI .env faylida yo‘q');

  const email = ADMIN_EMAIL ? ADMIN_EMAIL.trim().toLowerCase() : null;
  const phone = normPhone(ADMIN_PHONE);
  if (!email && !phone) throw new Error('ADMIN_EMAIL yoki ADMIN_PHONE .env faylida bo‘lishi kerak');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const users = db.collection('users');
  console.log(`Baza: ${DB_NAME}, foydalanuvchilar soni: ${await users.countDocuments()}`);

  const filter = email ? { email } : { phone };
  let admin = await users.findOne(filter);
  if (!admin) {
    if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD .env faylida yo‘q');
    const doc = {
      name: 'Admin', role: 'admin', blocked: false, verified: true, created_at: new Date(),
      password_hash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    };
    if (email) doc.email = email;
    if (phone) doc.phone = phone;
    const r = await users.insertOne(doc);
    admin = { _id: r.insertedId };
    console.log('Admin yaratildi.');
  }

  const items = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
  const now = new Date();
  const ops = items.map((p) => ({
    updateOne: {
      filter: { owner_id: admin._id, source: 'price-list', title: p.title, category: p.category },
      update: {
        $set: { ...p, owner_id: admin._id, source: 'price-list', phones: [CONTACT_PHONE], status: 'active', city: '', updated_at: now },
        $setOnInsert: { created_at: now },
      },
      upsert: true,
    },
  }));
  const r = await db.collection('products').bulkWrite(ops);
  console.log(`Tayyor: ${items.length} ta mahsulot. Yangi: ${r.upsertedCount}, yangilangan: ${r.modifiedCount}`);
  await client.close();
})().catch((e) => {
  console.error('Xatolik:', e.message);
  process.exit(1);
});
