// Tarjimalar: o‘zbekcha (uz), ruscha (ru), inglizcha (en)
const I18N = {
  uz: {
    'nav.home': 'Bosh', 'nav.add': '+ E‘lon', 'nav.mine': 'E‘lonlarim', 'nav.chats': 'Xabarlar',
    'nav.admin': 'Admin', 'nav.logout': 'Chiqish', 'nav.login': 'Kirish', 'nav.register': 'Ro‘yxatdan o‘tish',
    'home.search': 'Qidirish...', 'home.allCats': 'Barcha kategoriyalar', 'home.city': 'Shahar',
    'home.go': 'Qidirish', 'home.empty': 'E‘lonlar yo‘q',
    'product.seller': 'Sotuvchi', 'product.contact': 'Bog‘lanish', 'product.chat': 'Sotuvchiga yozish',
    'product.loginToChat': 'Yozish uchun kiring', 'product.delete': 'O‘chirish',
    'product.confirmDelete': 'E‘lon o‘chirilsinmi?', 'product.status': 'Holati', 'product.retail': 'chakana',
    'status.pending': 'Tekshiruvda', 'status.active': 'Faol', 'status.rejected': 'Rad etilgan',
    'form.name': 'Nomi', 'form.title': 'Sarlavha', 'form.category': 'Kategoriya', 'form.price': 'Narx (optom)',
    'form.retail': 'Chakana narx (ixtiyoriy)', 'form.currency': 'Valyuta', 'form.description': 'Tavsif',
    'form.city': 'Shahar', 'form.phone1': 'Telefon 1', 'form.phone2': 'Telefon 2 (ixtiyoriy)',
    'form.phone3': 'Telefon 3 (ixtiyoriy)', 'form.save': 'Saqlash', 'form.back': 'Ortga',
    'auth.name': 'Ismingiz', 'auth.phone': 'Telefon', 'auth.password': 'Parol (kamida 6 belgi)',
    'auth.loginBtn': 'Kirish', 'auth.registerBtn': 'Ro‘yxatdan o‘tish', 'auth.loginTitle': 'Kirish',
    'auth.registerTitle': 'Ro‘yxatdan o‘tish',
    'add.title': 'Yangi e‘lon', 'add.submit': 'Joylash (admin tasdiqlaydi)',
    'mine.title': 'Mening e‘lonlarim', 'mine.empty': 'Hozircha e‘lon yo‘q',
    'chats.title': 'Xabarlar', 'chats.empty': 'Suhbatlar yo‘q',
    'chat.placeholder': 'Xabar yozing...', 'chat.send': 'Yuborish',
    'admin.title': 'Admin panel', 'admin.stats': 'Foydalanuvchilar: {users} · Faol: {active} · Tekshiruvda: {pending}',
    'admin.new': '+ Yangi mahsulot', 'admin.filterAll': 'Barchasi', 'admin.empty': 'Bu bo‘limda e‘lon yo‘q',
    'admin.approve': 'Tasdiqlash', 'admin.reject': 'Rad etish', 'admin.edit': 'Tahrirlash', 'admin.delete': 'O‘chirish',
    'admin.deleteConfirm': 'Mahsulot butunlay o‘chirilsinmi?', 'admin.users': 'Foydalanuvchilar',
    'admin.block': 'Bloklash', 'admin.unblock': 'Blokdan chiqarish', 'admin.editTitle': 'Tahrirlash',
    'admin.newTitle': 'Yangi mahsulot',
    'common.error': 'Xatolik yuz berdi', 'common.currency': 'so‘m',
    'cat:Payvandlash va generatorlar': 'Payvandlash va generatorlar', 'cat:Nasoslar': 'Nasoslar',
    'cat:Shlanglar va quvurlar': 'Shlanglar va quvurlar', 'cat:Boshqa': 'Boshqa',
  },
  ru: {
    'nav.home': 'Главная', 'nav.add': '+ Объявление', 'nav.mine': 'Мои объявления', 'nav.chats': 'Сообщения',
    'nav.admin': 'Админ', 'nav.logout': 'Выход', 'nav.login': 'Вход', 'nav.register': 'Регистрация',
    'home.search': 'Поиск...', 'home.allCats': 'Все категории', 'home.city': 'Город', 'home.go': 'Искать',
    'home.empty': 'Объявлений нет',
    'product.seller': 'Продавец', 'product.contact': 'Связаться', 'product.chat': 'Написать продавцу',
    'product.loginToChat': 'Войдите, чтобы написать', 'product.delete': 'Удалить',
    'product.confirmDelete': 'Удалить объявление?', 'product.status': 'Статус', 'product.retail': 'розница',
    'status.pending': 'На проверке', 'status.active': 'Активно', 'status.rejected': 'Отклонено',
    'form.name': 'Название', 'form.title': 'Заголовок', 'form.category': 'Категория', 'form.price': 'Цена (опт)',
    'form.retail': 'Розничная цена (необязательно)', 'form.currency': 'Валюта', 'form.description': 'Описание',
    'form.city': 'Город', 'form.phone1': 'Телефон 1', 'form.phone2': 'Телефон 2 (необязательно)',
    'form.phone3': 'Телефон 3 (необязательно)', 'form.save': 'Сохранить', 'form.back': 'Назад',
    'auth.name': 'Ваше имя', 'auth.phone': 'Телефон', 'auth.password': 'Пароль (не менее 6 символов)',
    'auth.loginBtn': 'Войти', 'auth.registerBtn': 'Зарегистрироваться', 'auth.loginTitle': 'Вход',
    'auth.registerTitle': 'Регистрация',
    'add.title': 'Новое объявление', 'add.submit': 'Опубликовать (подтверждает админ)',
    'mine.title': 'Мои объявления', 'mine.empty': 'Объявлений пока нет',
    'chats.title': 'Сообщения', 'chats.empty': 'Диалогов нет',
    'chat.placeholder': 'Напишите сообщение...', 'chat.send': 'Отправить',
    'admin.title': 'Админ-панель', 'admin.stats': 'Пользователей: {users} · Активных: {active} · На проверке: {pending}',
    'admin.new': '+ Новый товар', 'admin.filterAll': 'Все', 'admin.empty': 'В этом разделе объявлений нет',
    'admin.approve': 'Одобрить', 'admin.reject': 'Отклонить', 'admin.edit': 'Изменить', 'admin.delete': 'Удалить',
    'admin.deleteConfirm': 'Удалить товар окончательно?', 'admin.users': 'Пользователи',
    'admin.block': 'Заблокировать', 'admin.unblock': 'Разблокировать', 'admin.editTitle': 'Редактирование',
    'admin.newTitle': 'Новый товар',
    'common.error': 'Произошла ошибка', 'common.currency': 'сум',
    'cat:Payvandlash va generatorlar': 'Сварка и генераторы', 'cat:Nasoslar': 'Насосы',
    'cat:Shlanglar va quvurlar': 'Шланги и трубы', 'cat:Boshqa': 'Другое',
  },
  en: {
    'nav.home': 'Home', 'nav.add': '+ Listing', 'nav.mine': 'My listings', 'nav.chats': 'Messages',
    'nav.admin': 'Admin', 'nav.logout': 'Log out', 'nav.login': 'Log in', 'nav.register': 'Sign up',
    'home.search': 'Search...', 'home.allCats': 'All categories', 'home.city': 'City', 'home.go': 'Search',
    'home.empty': 'No listings',
    'product.seller': 'Seller', 'product.contact': 'Contact', 'product.chat': 'Message seller',
    'product.loginToChat': 'Log in to message', 'product.delete': 'Delete',
    'product.confirmDelete': 'Delete this listing?', 'product.status': 'Status', 'product.retail': 'retail',
    'status.pending': 'Pending review', 'status.active': 'Active', 'status.rejected': 'Rejected',
    'form.name': 'Name', 'form.title': 'Title', 'form.category': 'Category', 'form.price': 'Price (wholesale)',
    'form.retail': 'Retail price (optional)', 'form.currency': 'Currency', 'form.description': 'Description',
    'form.city': 'City', 'form.phone1': 'Phone 1', 'form.phone2': 'Phone 2 (optional)',
    'form.phone3': 'Phone 3 (optional)', 'form.save': 'Save', 'form.back': 'Back',
    'auth.name': 'Your name', 'auth.phone': 'Phone', 'auth.password': 'Password (min 6 characters)',
    'auth.loginBtn': 'Log in', 'auth.registerBtn': 'Sign up', 'auth.loginTitle': 'Log in',
    'auth.registerTitle': 'Sign up',
    'add.title': 'New listing', 'add.submit': 'Publish (admin will approve)',
    'mine.title': 'My listings', 'mine.empty': 'No listings yet',
    'chats.title': 'Messages', 'chats.empty': 'No conversations',
    'chat.placeholder': 'Type a message...', 'chat.send': 'Send',
    'admin.title': 'Admin panel', 'admin.stats': 'Users: {users} · Active: {active} · Pending: {pending}',
    'admin.new': '+ New product', 'admin.filterAll': 'All', 'admin.empty': 'No listings in this section',
    'admin.approve': 'Approve', 'admin.reject': 'Reject', 'admin.edit': 'Edit', 'admin.delete': 'Delete',
    'admin.deleteConfirm': 'Delete this product permanently?', 'admin.users': 'Users',
    'admin.block': 'Block', 'admin.unblock': 'Unblock', 'admin.editTitle': 'Edit', 'admin.newTitle': 'New product',
    'common.error': 'Something went wrong', 'common.currency': 'UZS',
    'cat:Payvandlash va generatorlar': 'Welding & generators', 'cat:Nasoslar': 'Pumps',
    'cat:Shlanglar va quvurlar': 'Hoses & pipes', 'cat:Boshqa': 'Other',
  },
};

let LANG = localStorage.getItem('lang') || 'uz';
if (!I18N[LANG]) LANG = 'uz';

function t(key, vars = {}) {
  const s = I18N[LANG][key] ?? I18N.uz[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

function catLabel(name) {
  return I18N[LANG]['cat:' + name] || name;
}

function money(n, cur) {
  if (cur === 'USD') return '$' + Number(n).toLocaleString('en-US');
  const loc = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }[LANG];
  return Number(n).toLocaleString(loc) + ' ' + t('common.currency');
}

function setLang(l) {
  if (!I18N[l]) return;
  LANG = l;
  localStorage.setItem('lang', l);
  document.documentElement.lang = l;
  render();
}

// ---- Qo‘shimcha tarjimalar: auth, forma, dizayn ----
Object.assign(I18N.uz, {
  'auth.email': 'Email', 'auth.identifier': 'Email yoki telefon', 'auth.loginSub': 'Hisobingizga kiring',
  'auth.forgot': 'Parolni unutdingizmi?', 'auth.noAccountLink': 'Ro‘yxatdan o‘tish', 'auth.haveAccountLink': 'Kirish',
  'auth.verifyTitle': 'Kodni kiriting', 'auth.verifyText': '{email} manziliga 6 xonali kod yubordik',
  'auth.verifyBtn': 'Tasdiqlash', 'auth.resend': 'Kodni qayta yuborish', 'auth.resendIn': '{s} soniyadan keyin',
  'auth.forgotTitle': 'Parolni tiklash', 'auth.forgotText': 'Emailingizga tiklash kodi yuboriladi',
  'auth.sendCode': 'Kod yuborish', 'auth.resetTitle': 'Yangi parol', 'auth.newPassword': 'Yangi parol',
  'auth.resetBtn': 'Parolni yangilash', 'auth.resetDone': 'Parol yangilandi. Endi kiring.',
  'auth.phoneOptional': 'Telefon (ixtiyoriy)', 'auth.registerSub': 'Email orqali ro‘yxatdan o‘ting',
  'form.brand': 'Brend', 'form.condition': 'Holati', 'form.stock': 'Mavjud soni (ixtiyoriy)',
  'form.images': 'Rasmlar (5 tagacha)', 'form.addImage': 'Rasm qo‘shish', 'form.removeImage': 'O‘chirish',
  'form.status': 'Holat', 'form.publish': 'E‘lonni joylash', 'form.cancel': 'Bekor qilish',
  'form.imgTooMany': 'Ko‘pi bilan 5 ta rasm', 'form.optional': 'ixtiyoriy',
  'cond.new': 'Yangi', 'cond.used': 'Ishlatilgan', 'mine.edit': 'Tahrirlash',
  'product.stock': 'Mavjud', 'product.brand': 'Brend', 'product.condition': 'Holati',
  'add.hint': 'E‘lon admin tekshiruvidan o‘tgach ko‘rinadi',
  'home.heroTitle': 'Optom narxlar, to‘g‘ridan-to‘g‘ri', 'home.heroSub': 'Payvandlash apparatlari, nasoslar va shlanglar',
  'home.results': '{n} ta e‘lon', 'product.pendingNote': 'Admin tasdig‘ini kutmoqda',
});
Object.assign(I18N.ru, {
  'auth.email': 'Email', 'auth.identifier': 'Email или телефон', 'auth.loginSub': 'Войдите в аккаунт',
  'auth.forgot': 'Забыли пароль?', 'auth.noAccountLink': 'Регистрация', 'auth.haveAccountLink': 'Вход',
  'auth.verifyTitle': 'Введите код', 'auth.verifyText': 'Мы отправили 6-значный код на {email}',
  'auth.verifyBtn': 'Подтвердить', 'auth.resend': 'Отправить код повторно', 'auth.resendIn': 'Повтор через {s} с',
  'auth.forgotTitle': 'Восстановление пароля', 'auth.forgotText': 'На ваш email придёт код для восстановления',
  'auth.sendCode': 'Отправить код', 'auth.resetTitle': 'Новый пароль', 'auth.newPassword': 'Новый пароль',
  'auth.resetBtn': 'Обновить пароль', 'auth.resetDone': 'Пароль обновлён. Войдите.',
  'auth.phoneOptional': 'Телефон (необязательно)', 'auth.registerSub': 'Регистрация по email',
  'form.brand': 'Бренд', 'form.condition': 'Состояние', 'form.stock': 'Количество (необязательно)',
  'form.images': 'Фото (до 5)', 'form.addImage': 'Добавить фото', 'form.removeImage': 'Удалить',
  'form.status': 'Статус', 'form.publish': 'Опубликовать', 'form.cancel': 'Отмена',
  'form.imgTooMany': 'Не больше 5 фото', 'form.optional': 'необязательно',
  'cond.new': 'Новый', 'cond.used': 'Б/у', 'mine.edit': 'Изменить',
  'product.stock': 'В наличии', 'product.brand': 'Бренд', 'product.condition': 'Состояние',
  'add.hint': 'Объявление появится после проверки админом',
  'home.heroTitle': 'Оптовые цены, напрямую', 'home.heroSub': 'Сварочное оборудование, насосы и шланги',
  'home.results': 'Объявлений: {n}', 'product.pendingNote': 'Ожидает подтверждения админа',
});
Object.assign(I18N.en, {
  'auth.email': 'Email', 'auth.identifier': 'Email or phone', 'auth.loginSub': 'Sign in to your account',
  'auth.forgot': 'Forgot password?', 'auth.noAccountLink': 'Sign up', 'auth.haveAccountLink': 'Log in',
  'auth.verifyTitle': 'Enter the code', 'auth.verifyText': 'We sent a 6-digit code to {email}',
  'auth.verifyBtn': 'Verify', 'auth.resend': 'Resend code', 'auth.resendIn': 'Resend in {s}s',
  'auth.forgotTitle': 'Reset password', 'auth.forgotText': 'We will email you a reset code',
  'auth.sendCode': 'Send code', 'auth.resetTitle': 'New password', 'auth.newPassword': 'New password',
  'auth.resetBtn': 'Update password', 'auth.resetDone': 'Password updated. Please log in.',
  'auth.phoneOptional': 'Phone (optional)', 'auth.registerSub': 'Sign up with your email',
  'form.brand': 'Brand', 'form.condition': 'Condition', 'form.stock': 'Stock (optional)',
  'form.images': 'Photos (up to 5)', 'form.addImage': 'Add photo', 'form.removeImage': 'Remove',
  'form.status': 'Status', 'form.publish': 'Publish', 'form.cancel': 'Cancel',
  'form.imgTooMany': 'Up to 5 photos', 'form.optional': 'optional',
  'cond.new': 'New', 'cond.used': 'Used', 'mine.edit': 'Edit',
  'product.stock': 'In stock', 'product.brand': 'Brand', 'product.condition': 'Condition',
  'add.hint': 'Your listing appears after admin review',
  'home.heroTitle': 'Wholesale prices, direct', 'home.heroSub': 'Welding machines, pumps and hoses',
  'home.results': '{n} listings', 'product.pendingNote': 'Waiting for admin approval',
});
