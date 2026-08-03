# 🚀 Развертывание сайта в интернет

## Способ 1: Render (Самый простой) ⭐ РЕКОМЕНДУЕТСЯ

### Шаги:
1. Перейди на https://render.com
2. Нажми "Sign up" → выбери GitHub
3. Авторизуйся через GitHub
4. Нажми "New +" → "Web Service"
5. Выбери репозиторий `KerimliRashad/mtproxy`
6. Настройки:
   - **Name:** lovematch (или любое другое имя)
   - **Region:** Frankfurt (или ближайший)
   - **Branch:** claude/improved-site-registration-wecrh8
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
7. Нажми "Create Web Service"

✅ Через 2-3 минуты сайт будет доступен! Ты получишь ссылку вроде:
```
https://lovematch.onrender.com
```

---

## Способ 2: Railway

### Шаги:
1. Перейди на https://railway.app
2. Нажми "Start Project" → "Deploy from GitHub"
3. Выбери репозиторий `KerimliRashad/mtproxy`
4. Автоматически определит Node.js проект
5. Дождись развертывания

✅ Сайт будет доступен по ссылке

---

## Способ 3: Replit (Для быстрого тестирования)

1. Перейди на https://replit.com
2. Нажми "Create" → "Import from GitHub"
3. Введи: `KerimliRashad/mtproxy`
4. Нажми "Import"
5. Выбери файл `server.js` как главный
6. Нажми "Run"

✅ Сайт будет доступен по ссылке

---

## Способ 4: Ngrok (Для локального доступа)

Если хочешь использовать свой компьютер:

```bash
# Установи ngrok с https://ngrok.com/download

# Запусти сервер
npm start

# В другом окне терминала
ngrok http 3000

# Получишь публичную ссылку вроде:
# https://abc123.ngrok.io
```

---

## После развертывания

### 📝 Войди как администратор:
- **Логин:** admin14
- **Пароль:** admin123

### 🎯 Функции:
✅ Просмотр профилей везде  
✅ Лайки  
✅ Регистрация  
✅ Админ панель  

---

## ⚠️ Важно для продакшена

Если используешь платный хостинг и хочешь сохранять данные:

Отредактируй `server.js`:

Найди строку:
```javascript
const db = new sqlite3.Database(':memory:');
```

Измени на:
```javascript
const db = new sqlite3.Database('./data.db');
```

Это сохранит данные в файл базы данных.

---

## 📞 Поддержка

Если что-то не работает:
1. Проверь логи развертывания
2. Убедись что `npm start` работает локально
3. Проверь что все файлы загрузились на сервер

**Рекомендую Render - самый простой способ!** 🎉
