// Narx ro'yxatini (data/products.json) MongoDB Atlas'ga yuklaydi.
// Ishlatish: node seed.js   (MONGODB_URI va ADMIN_PHONE muhit o‘zgaruvchilari kerak)
// Takroran ishga tushirish xavfsiz: mavjud mahsulotlar yangilanadi, dublikat bo‘lmaydi.
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const CONTACT_PHONE = '+998505005064';

(async () => {
  const { MONGODB_URI, DB_NAME = 'bozor', ADMIN_PHONE } = process.env;
  if (!MONGODB_URI || !ADMIN_PHONE) throw new Error('MONGODB_URI va ADMIN_PHONE kerak');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const admin = await db.collection('users').findOne({ phone: ADMIN_PHONE });
  if (!admin) throw new Error('Admin topilmadi. Avval serverni bir marta ishga tushiring.');

  const items = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
  const now = new Date();
  const ops = items.map((p) => ({
    updateOne: {
      filter: { owner_id: admin._id, source: 'price-list', title: p.title, category: p.category },
      update: {
        $set: {
          ...p,
          owner_id: admin._id,
          source: 'price-list',
          phones: [CONTACT_PHONE],
          status: 'active',
          city: '',
          updated_at: now,
        },
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
