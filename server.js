import express from 'express';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = new sqlite3.Database(':memory:');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Простая аутентификация через cookie
const authMiddleware = (req, res, next) => {
  const userId = req.cookies.userId;
  if (userId) {
    req.userId = parseInt(userId);
  }
  next();
};

app.use(authMiddleware);

// Инициализация БД
function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      gender TEXT,
      age INTEGER,
      city TEXT,
      about TEXT,
      interests TEXT,
      avatar TEXT DEFAULT '',
      is_admin BOOLEAN DEFAULT 0,
      is_blocked BOOLEAN DEFAULT 0,
      last_seen DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY,
      from_id INTEGER,
      to_id INTEGER,
      UNIQUE(from_id, to_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      from_id INTEGER,
      to_id INTEGER,
      text TEXT,
      photo_data TEXT,
      is_read BOOLEAN DEFAULT 0,
      time DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      from_id INTEGER,
      type TEXT,
      read BOOLEAN DEFAULT 0,
      time DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      username TEXT,
      login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS photo_gallery (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      photo_data TEXT,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY,
      reported_by INTEGER,
      reported_user_id INTEGER,
      reason TEXT,
      status TEXT DEFAULT 'новая',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const hash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users
            VALUES (1, 'admin14', 'admin@test.com', ?, 'М', 35, 'Москва', 'Админ', 'спорт', '', 1, 0, CURRENT_TIMESTAMP)`,
      [hash]
    );

    const demo = [
      ['anna_25', 'anna@t.com', 'Ж', 25, 'Москва', 'Люблю путешествия'],
      ['maria_23', 'maria@t.com', 'Ж', 23, 'СПб', 'Йога и кино'],
      ['ivan_28', 'ivan@t.com', 'М', 28, 'Москва', 'Программист'],
      ['dmitry_30', 'dmitry@t.com', 'М', 30, 'Казань', 'Спорт'],
      ['elena_26', 'elena@t.com', 'Ж', 26, 'Новосиб', 'Художница']
    ];

    demo.forEach(([u, e, g, a, c, ab]) => {
      const h = bcrypt.hashSync('demo123', 10);
      db.run(`INSERT OR IGNORE INTO users VALUES
              (NULL, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, 0, CURRENT_TIMESTAMP)`,
        [u, e, h, g, a, c, ab, '']
      );
    });

    // Добавить 500 ботов
    const femaleNames = ['anastasia', 'victoria', 'yulia', 'natasha', 'sophia', 'marina', 'elena', 'irina', 'alexandra', 'ekaterina', 'diana', 'lisa', 'anna', 'maria', 'eva', 'olga', 'daria', 'vera', 'nadia', 'yana'];
    const maleNames = ['alexander', 'michael', 'dmitry', 'sergei', 'ivan', 'andrey', 'viktor', 'pavel', 'nikolai', 'alexei', 'konstantin', 'ilya', 'maxim', 'roman', 'anton', 'artem', 'boris', 'vladimir', 'igor', 'oleg'];
    const cities = ['Москва', 'СПб', 'Казань', 'Новосиб', 'Екатеринбург', 'Сочи', 'Киев', 'Крым', 'Питер', 'Тверь', 'Воронеж', 'Самара', 'Уфа', 'Пермь', 'Омск'];
    const interests = ['путешествия', 'кино', 'спорт', 'музыка', 'искусство', 'готовка', 'читать', 'танцы', 'йога', 'приключения', 'фото', 'природа', 'книги', 'театр', 'вечеринки', 'путешествие'];
    const abouts = ['Обожаю активный образ жизни', 'Люблю новые впечатления', 'Ищу позитивного человека', 'Открыта новым встречам', 'Интересуюсь искусством', 'Спортивная и энергичная', 'Люблю смеяться', 'Давайте поговорим', 'Ищу приключений', 'Романтичная натура'];

    const h = bcrypt.hashSync('bot123', 10);
    for (let i = 0; i < 500; i++) {
      const gender = i % 2 === 0 ? 'Ж' : 'М';
      const nameList = gender === 'Ж' ? femaleNames : maleNames;
      const name = nameList[Math.floor(Math.random() * nameList.length)] + '_' + (20 + Math.floor(Math.random() * 30));
      const email = name + '@bot.com';
      const age = 20 + Math.floor(Math.random() * 35);
      const city = cities[Math.floor(Math.random() * cities.length)];
      const about = abouts[Math.floor(Math.random() * abouts.length)];
      const interestsStr = interests.slice(0, 3).join(', ');

      db.run(
        `INSERT OR IGNORE INTO users VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, 0, CURRENT_TIMESTAMP)`,
        [name, email, h, gender, age, city, about, interestsStr]
      );
    }
  });
}

initDB();

// Bot behavior functions
function makeBotsLikeAdmin() {
  db.all('SELECT id FROM users WHERE id > 6', (err, bots) => {
    if (!bots || bots.length === 0) return;
    bots.forEach(bot => {
      db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [bot.id]);
      db.run('INSERT OR IGNORE INTO likes VALUES (NULL, ?, ?)',
        [bot.id, 1],
        () => {
          db.run('INSERT OR IGNORE INTO notifications VALUES (NULL, 1, ?, ?, 0, CURRENT_TIMESTAMP)',
            [bot.id, 'like']
          );
        }
      );
    });
  });
}

function makeBotsInteract() {
  db.all('SELECT id FROM users WHERE id > 6 LIMIT 50', (err, bots) => {
    if (!bots || bots.length === 0) return;

    const messages = [
      'Привет! 😊',
      'Как дела?',
      'Рад познакомиться! 💕',
      'Как ты?',
      'Интересный профиль! 👍',
      'Привет, как себя чувствуешь?',
      'Давай общаться 😄',
      'Очень нравишься! 😍',
      'Как прошел день?',
      'Вы мне очень нравитесь!',
      'Люблю твой стиль! 🎨',
      'Давай встретимся? ☕',
      'Ты прекрасна! 💕',
      'Слышу от тебя первый раз 👋',
      'Как прошла неделя?'
    ];

    const adminId = 1;

    // Make 10 random bots message the admin
    const randomBots = bots.sort(() => Math.random() - 0.5).slice(0, 10);
    randomBots.forEach(bot => {
      db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [bot.id]);
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      db.run(
        'INSERT INTO messages VALUES (NULL, ?, ?, ?, CURRENT_TIMESTAMP)',
        [bot.id, adminId, randomMsg]
      );
    });

    // Also make some bots message each other
    for (let i = 0; i < Math.min(5, bots.length - 1); i++) {
      const from = bots[i];
      const to = bots[i + 1];
      db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [from.id]);
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      db.run(
        'INSERT INTO messages VALUES (NULL, ?, ?, ?, CURRENT_TIMESTAMP)',
        [from.id, to.id, randomMsg]
      );
    }
  });
}

// Run bot behavior frequently
setInterval(makeBotsLikeAdmin, 20000);
setInterval(makeBotsInteract, 15000);

// ========== ROUTES ==========

app.get('/', (req, res) => {
  if (req.userId) return res.redirect('/discover');
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/login', (req, res) => {
  if (req.userId) return res.redirect('/discover');
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/register', (req, res) => {
  if (req.userId) return res.redirect('/discover');
  res.sendFile(path.join(__dirname, 'public/register.html'));
});

app.get('/discover', (req, res) => {
  if (!req.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/discover.html'));
});

app.get('/matches', (req, res) => {
  if (!req.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/matches.html'));
});

app.get('/messages', (req, res) => {
  if (!req.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/messages.html'));
});

app.get('/profile', (req, res) => {
  if (!req.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/profile.html'));
});

app.get('/notifications', (req, res) => {
  if (!req.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/notifications.html'));
});

app.get('/admin', (req, res) => {
  if (!req.userId) return res.redirect('/login');
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, u) => {
    if (!u || !u.is_admin) return res.redirect('/discover');
    res.sendFile(path.join(__dirname, 'public/admin.html'));
  });
});

// ========== API ==========

app.post('/api/register', (req, res) => {
  const { username, email, password, gender, age, city } = req.body;

  if (!username || !email || !password || !gender || !age || !city) {
    return res.json({ success: false, message: 'Заполните все поля' });
  }

  const hash = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users VALUES (NULL, ?, ?, ?, ?, ?, ?, '', '', '', 0, 0, CURRENT_TIMESTAMP)`,
    [username, email, hash, gender, age, city],
    function(err) {
      if (err) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
      }
      res.cookie('userId', this.lastID, {
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.json({ success: true });
    }
  );
});

app.post('/api/register-submit', (req, res) => {
  const { username, email, password, gender, age, city } = req.body;

  if (!username || !email || !password || !gender || !age || !city) {
    return res.redirect('/register?error=1');
  }

  const hash = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users VALUES (NULL, ?, ?, ?, ?, ?, ?, '', '', '', 0, 0, CURRENT_TIMESTAMP)`,
    [username, email, hash, gender, age, city],
    function(err) {
      if (err) {
        return res.redirect('/register?error=2');
      }
      res.cookie('userId', this.lastID, {
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.redirect('/discover');
    }
  );
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      db.run('INSERT INTO login_history VALUES (NULL, NULL, ?, CURRENT_TIMESTAMP, ?)',
        [username, req.ip || req.connection.remoteAddress || 'unknown']
      );
      return res.json({ success: false, message: 'Неправильные данные' });
    }
    if (user.is_blocked) {
      return res.json({ success: false, message: 'Аккаунт заблокирован' });
    }

    db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    db.run('INSERT INTO login_history VALUES (NULL, ?, ?, CURRENT_TIMESTAMP, ?)',
      [user.id, username, req.ip || req.connection.remoteAddress || 'unknown']
    );
    res.cookie('userId', user.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.json({ success: true });
  });
});

app.post('/api/login-submit', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.redirect('/login?error=1');
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      db.run('INSERT INTO login_history VALUES (NULL, NULL, ?, CURRENT_TIMESTAMP, ?)',
        [username, req.ip || req.connection.remoteAddress || 'unknown']
      );
      return res.redirect('/login?error=1');
    }
    if (user.is_blocked) {
      return res.redirect('/login?error=2');
    }

    db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    db.run('INSERT INTO login_history VALUES (NULL, ?, ?, CURRENT_TIMESTAMP, ?)',
      [user.id, username, req.ip || req.connection.remoteAddress || 'unknown']
    );
    res.cookie('userId', user.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.redirect('/discover');
  });
});

app.get('/api/logout', (req, res) => {
  res.clearCookie('userId');
  res.redirect('/');
});

app.get('/api/test', (req, res) => {
  res.json({
    cookies: req.cookies,
    userId: req.userId,
    headers: req.headers.cookie
  });
});

app.get('/api/profile', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.get('SELECT * FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (!user) return res.json({ success: false });
    res.json({ success: true, user });
  });
});

app.get('/api/notifications', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.all(`
    SELECT n.*, u.username, u.avatar
    FROM notifications n
    JOIN users u ON n.from_id = u.id
    WHERE n.user_id = ?
    ORDER BY n.time DESC
    LIMIT 50
  `, [req.userId], (err, notifs) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, notifications: notifs || [] });
  });
});

app.post('/api/notifications/read', (req, res) => {
  if (!req.userId) return res.json({ success: false });
  db.run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0',
    [req.userId],
    () => res.json({ success: true })
  );
});

app.post('/api/profile/update', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  const { about, interests } = req.body;
  db.run('UPDATE users SET about = ?, interests = ? WHERE id = ?',
    [about || '', interests || '', req.userId],
    () => res.json({ success: true })
  );
});

app.post('/api/avatar/upload', (req, res) => {
  if (!req.userId) return res.json({ success: false, message: 'Не авторизован' });
  const { avatar } = req.body;
  if (!avatar) return res.json({ success: false, message: 'Фото не загружено' });

  // Проверка размера (base64 примерно на 33% больше, чем оригинал)
  if (avatar.length > 6 * 1024 * 1024) {
    return res.json({ success: false, message: 'Фото слишком большое' });
  }

  db.run('UPDATE users SET avatar = ? WHERE id = ?',
    [avatar, req.userId],
    (err) => {
      if (err) {
        return res.json({ success: false, message: 'Ошибка сохранения' });
      }
      res.json({ success: true, message: 'Фото загружено' });
    }
  );
});

app.post('/api/gallery/upload', (req, res) => {
  if (!req.userId) return res.json({ success: false, message: 'Не авторизован' });
  const { photo } = req.body;
  if (!photo) return res.json({ success: false, message: 'Фото не загружено' });

  if (photo.length > 6 * 1024 * 1024) {
    return res.json({ success: false, message: 'Фото слишком большое' });
  }

  db.run('INSERT INTO photo_gallery VALUES (NULL, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM photo_gallery WHERE user_id = ?), CURRENT_TIMESTAMP)',
    [req.userId, photo, req.userId],
    (err) => {
      if (err) {
        return res.json({ success: false, message: 'Ошибка сохранения' });
      }
      res.json({ success: true, message: 'Фото добавлено в галерею' });
    }
  );
});

app.get('/api/gallery/:userId', (req, res) => {
  db.all('SELECT id, photo_data FROM photo_gallery WHERE user_id = ? ORDER BY position',
    [req.params.userId],
    (err, photos) => {
      res.json({ success: true, photos: photos || [] });
    }
  );
});

app.delete('/api/gallery/:photoId', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.get('SELECT user_id FROM photo_gallery WHERE id = ?', [req.params.photoId], (err, photo) => {
    if (!photo || photo.user_id !== req.userId) {
      return res.json({ success: false, message: 'Нет прав' });
    }

    db.run('DELETE FROM photo_gallery WHERE id = ?', [req.params.photoId], () => {
      res.json({ success: true });
    });
  });
});

app.post('/api/report', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  const { reported_user_id, reason } = req.body;
  if (!reported_user_id || !reason) return res.json({ success: false });

  db.run('INSERT INTO reports VALUES (NULL, ?, ?, ?, \'новая\', CURRENT_TIMESTAMP)',
    [req.userId, reported_user_id, reason],
    () => res.json({ success: true, message: 'Жалоба отправлена' })
  );
});

app.get('/api/discover', (req, res) => {
  if (!req.userId) return res.json({ success: false, message: 'Требуется авторизация' });

  db.all(
    'SELECT id, username, gender, age, city, about, interests, avatar, last_seen FROM users WHERE id != ? LIMIT 50',
    [req.userId],
    (err, profiles) => {
      if (err || !profiles) return res.json({ success: false });

      const profilesWithCompat = profiles.map(p => {
        const compat = Math.floor(Math.random() * 40) + 60;
        return { ...p, compatibility: compat };
      });

      res.json({ success: true, profiles: profilesWithCompat });
    }
  );
});

app.post('/api/like/:id', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  const to = req.params.id;

  db.run('INSERT OR IGNORE INTO likes VALUES (NULL, ?, ?)',
    [req.userId, to],
    () => {
      db.run('INSERT OR IGNORE INTO notifications VALUES (NULL, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
        [to, req.userId, 'like']
      );

      db.get(
        'SELECT id FROM likes WHERE from_id = ? AND to_id = ?',
        [to, req.userId],
        (err, match) => {
          if (match) {
            db.run('INSERT OR IGNORE INTO notifications VALUES (NULL, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
              [req.userId, to, 'match']
            );
            db.run('INSERT OR IGNORE INTO notifications VALUES (NULL, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
              [to, req.userId, 'match']
            );
          }
          res.json({ success: true, match: !!match });
        }
      );
    }
  );
});

app.get('/api/matches', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.all(`
    SELECT DISTINCT u.id, u.username, u.gender, u.age, u.city, u.avatar, u.last_seen
    FROM users u
    INNER JOIN likes l1 ON u.id = l1.to_id
    INNER JOIN likes l2 ON u.id = l2.from_id
    WHERE l1.from_id = ? AND l2.to_id = ?
  `, [req.userId, req.userId], (err, matches) => {
    res.json({ success: true, matches: matches || [] });
  });
});

app.post('/api/messages/:id', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  const { message, photo } = req.body;
  if (!message && !photo) return res.json({ success: false });

  db.run('INSERT INTO messages VALUES (NULL, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
    [req.userId, req.params.id, message || null, photo || null],
    () => res.json({ success: true })
  );
});

app.get('/api/messages/:id', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.run('UPDATE messages SET is_read = 1 WHERE to_id = ? AND from_id = ?',
    [req.userId, req.params.id]
  );

  db.all(`
    SELECT * FROM messages
    WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
    ORDER BY time DESC LIMIT 50
  `, [req.userId, req.params.id, req.params.id, req.userId],
    (err, msgs) => {
      res.json({ success: true, messages: msgs || [] });
    }
  );
});

app.get('/api/admin/stats', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, u) => {
    if (!u || !u.is_admin) return res.json({ success: false });

    db.get('SELECT COUNT(*) as total FROM users', (err, users) => {
      db.get('SELECT COUNT(*) as total FROM likes', (err, likes) => {
        res.json({
          success: true,
          users: users?.total || 0,
          likes: likes?.total || 0,
          matches: 0,
          messages: 0
        });
      });
    });
  });
});

app.get('/api/admin/users', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, u) => {
    if (!u || !u.is_admin) return res.json({ success: false });

    db.all('SELECT id, username, email, is_blocked, last_seen FROM users ORDER BY id DESC', (err, users) => {
      res.json({ success: true, users: users || [] });
    });
  });
});

app.post('/api/admin/block/:id', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, u) => {
    if (!u || !u.is_admin) return res.json({ success: false });

    db.run('UPDATE users SET is_blocked = 1 WHERE id = ?', [req.params.id], () => {
      res.json({ success: true });
    });
  });
});

app.post('/api/admin/unblock/:id', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, u) => {
    if (!u || !u.is_admin) return res.json({ success: false });

    db.run('UPDATE users SET is_blocked = 0 WHERE id = ?', [req.params.id], () => {
      res.json({ success: true });
    });
  });
});

app.get('/api/admin/login-history', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, u) => {
    if (!u || !u.is_admin) return res.json({ success: false });

    db.all(`
      SELECT * FROM login_history
      ORDER BY login_time DESC
      LIMIT 100
    `, (err, history) => {
      res.json({ success: true, history: history || [] });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌟 LoveMatch на порту ${PORT}`);
  console.log(`📝 admin14 / admin123\n`);
});
