import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const db = new sqlite3.Database(process.env.NODE_ENV === 'production' ? './data.db' : ':memory:');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

app.use(session({
  secret: 'lovematch-secret-2024-secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

// Инициализация БД
function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      gender TEXT,
      age INTEGER,
      city TEXT,
      about TEXT,
      interests TEXT,
      looking_for TEXT,
      height INTEGER,
      verified BOOLEAN DEFAULT 0,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY(from_user_id) REFERENCES users(id),
      FOREIGN KEY(to_user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id),
      FOREIGN KEY(user1_id) REFERENCES users(id),
      FOREIGN KEY(user2_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      message TEXT,
      read BOOLEAN DEFAULT 0,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(from_user_id) REFERENCES users(id),
      FOREIGN KEY(to_user_id) REFERENCES users(id)
    )`);

    // Добавляем тестовых пользователей
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users
            (username, email, password, gender, age, city, about, interests, looking_for, is_admin)
            VALUES ('admin14', 'admin@lovematch.com', ?, 'М', 35, 'Москва', 'Администратор', 'путешествия,кино', 'отношения', 1)`,
      [adminHash]
    );

    // Добавляем демо пользователей
    const demoUsers = [
      { username: 'anna_25', email: 'anna@test.com', gender: 'Ж', age: 25, city: 'Москва', about: 'Люблю путешествия и кино' },
      { username: 'maria_23', email: 'maria@test.com', gender: 'Ж', age: 23, city: 'СПб', about: 'Йога и медитация' },
      { username: 'ivan_28', email: 'ivan@test.com', gender: 'М', age: 28, city: 'Москва', about: 'Программист и спортсмен' },
      { username: 'dmitry_30', email: 'dmitry@test.com', gender: 'М', age: 30, city: 'Казань', about: 'Люблю природу' },
      { username: 'elena_26', email: 'elena@test.com', gender: 'Ж', age: 26, city: 'Новосибирск', about: 'Художница' }
    ];

    demoUsers.forEach(user => {
      const hash = bcrypt.hashSync('demo123', 10);
      db.run(
        `INSERT OR IGNORE INTO users (username, email, password, gender, age, city, about, interests, looking_for)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'путешествия,спорт', 'отношения')`,
        [user.username, user.email, hash, user.gender, user.age, user.city, user.about]
      );
    });
  });
}

initDB();

// Алгоритм поиска и мэтчинга
function calculateCompatibility(user1, user2) {
  let score = 0;

  // Возраст (макс 30 баллов)
  const ageDiff = Math.abs(user1.age - user2.age);
  if (ageDiff <= 5) score += 30;
  else if (ageDiff <= 10) score += 20;
  else if (ageDiff <= 15) score += 10;

  // Город (макс 20 баллов)
  if (user1.city === user2.city) score += 20;
  else score += 5;

  // Интересы (макс 30 баллов)
  if (user1.interests && user2.interests) {
    const interests1 = user1.interests.split(',');
    const interests2 = user2.interests.split(',');
    const common = interests1.filter(i => interests2.includes(i.trim())).length;
    score += Math.min(common * 10, 30);
  }

  // Ищут то же самое (макс 20 баллов)
  if (user1.looking_for === user2.looking_for) score += 20;

  return Math.min(score, 100);
}

// Middleware аутентификации
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/discover');
  }
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/discover');
  res.sendFile(join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/discover');
  res.sendFile(join(__dirname, 'public', 'register.html'));
});

app.get('/discover', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'discover.html'));
});

app.get('/matches', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'matches.html'));
});

app.get('/messages', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'messages.html'));
});

app.get('/profile', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'profile.html'));
});

app.get('/admin', requireAuth, (req, res) => {
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user || !user.is_admin) {
      return res.redirect('/discover');
    }
    res.sendFile(join(__dirname, 'public', 'admin.html'));
  });
});

// API - Регистрация
app.post('/api/register', (req, res) => {
  const { username, email, password, gender, age, city, about, interests, looking_for } = req.body;

  if (!username || !email || !password || !gender || !age || !city) {
    return res.json({ success: false, message: 'Заполните обязательные поля' });
  }

  if (age < 18) {
    return res.json({ success: false, message: 'Минимальный возраст 18 лет' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, email, password, gender, age, city, about, interests, looking_for)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [username, email, hashedPassword, gender, age, city, about || '', interests || '', looking_for || 'отношения'],
    function(err) {
      if (err) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
      }
      req.session.userId = this.lastID;
      res.json({ success: true, message: 'Регистрация успешна!' });
    }
  );
});

// API - Вход
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
    if (err || !user) {
      return res.json({ success: false, message: 'Неправильные учетные данные' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.json({ success: false, message: 'Неправильные учетные данные' });
    }

    req.session.userId = user.id;
    res.json({ success: true, message: 'Вход выполнен!', user: { id: user.id, username: user.username } });
  });
});

// API - Выход
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// API - Мой профиль
app.get('/api/profile', requireAuth, (req, res) => {
  db.get('SELECT id, username, gender, age, city, about, interests, looking_for, verified FROM users WHERE id = ?',
    [req.session.userId], (err, user) => {
      if (err || !user) {
        return res.json({ success: false });
      }
      res.json({ success: true, user });
    });
});

// API - Обновить профиль
app.post('/api/profile/update', requireAuth, (req, res) => {
  const { about, interests, looking_for } = req.body;
  db.run(
    `UPDATE users SET about = ?, interests = ?, looking_for = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [about, interests, looking_for, req.session.userId],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, message: 'Профиль обновлен' });
    }
  );
});

// API - Поиск профилей (с алгоритмом мэтчинга)
app.get('/api/discover', requireAuth, (req, res) => {
  const { limit = 10 } = req.query;

  db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, currentUser) => {
    if (err || !currentUser) return res.json({ success: false });

    db.all(
      `SELECT id, username, gender, age, city, about, interests, looking_for FROM users
       WHERE id != ? AND gender != ? LIMIT ? * 2`,
      [req.session.userId, currentUser.gender, limit],
      (err, allProfiles) => {
        if (err) return res.json({ success: false });

        // Считаем совместимость для каждого профиля
        const scored = allProfiles.map(profile => ({
          ...profile,
          compatibility: calculateCompatibility(currentUser, profile)
        }));

        // Сортируем по совместимости
        const sorted = scored.sort((a, b) => b.compatibility - a.compatibility);
        const topProfiles = sorted.slice(0, limit);

        res.json({ success: true, profiles: topProfiles });
      }
    );
  });
});

// API - Лайк
app.post('/api/like/:userId', requireAuth, (req, res) => {
  const toUserId = req.params.userId;

  db.run(
    `INSERT OR IGNORE INTO likes (from_user_id, to_user_id) VALUES (?, ?)`,
    [req.session.userId, toUserId],
    (err) => {
      if (err) return res.json({ success: false });

      // Проверяем мэтч (взаимный лайк)
      db.get(
        `SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ?`,
        [toUserId, req.session.userId],
        (err, match) => {
          if (match) {
            db.run(
              `INSERT OR IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)`,
              [Math.min(req.session.userId, toUserId), Math.max(req.session.userId, toUserId)]
            );
          }
          res.json({ success: true, isMatch: !!match });
        }
      );
    }
  );
});

// API - Мои лайки
app.get('/api/my-likes', requireAuth, (req, res) => {
  db.all(
    `SELECT u.* FROM users u
     INNER JOIN likes l ON u.id = l.to_user_id
     WHERE l.from_user_id = ? ORDER BY l.liked_at DESC`,
    [req.session.userId],
    (err, likes) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, likes });
    }
  );
});

// API - Мои мэтчи
app.get('/api/matches', requireAuth, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.gender, u.age, u.city, u.about
     FROM users u
     INNER JOIN matches m ON (u.id = m.user1_id OR u.id = m.user2_id)
     WHERE (m.user1_id = ? OR m.user2_id = ?) AND u.id != ?
     ORDER BY m.matched_at DESC`,
    [req.session.userId, req.session.userId, req.session.userId],
    (err, matches) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, matches });
    }
  );
});

// API - Сообщения
app.get('/api/messages/:userId', requireAuth, (req, res) => {
  const otherId = req.params.userId;
  db.all(
    `SELECT * FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY sent_at ASC LIMIT 50`,
    [req.session.userId, otherId, otherId, req.session.userId],
    (err, messages) => {
      if (err) return res.json({ success: false });

      // Отмечаем как прочитанные
      db.run(
        `UPDATE messages SET read = 1
         WHERE from_user_id = ? AND to_user_id = ? AND read = 0`,
        [otherId, req.session.userId]
      );

      res.json({ success: true, messages });
    }
  );
});

// API - Отправить сообщение
app.post('/api/messages/:userId', requireAuth, (req, res) => {
  const { message } = req.body;
  const toUserId = req.params.userId;

  if (!message || message.trim().length === 0) {
    return res.json({ success: false, message: 'Сообщение не может быть пусто' });
  }

  db.run(
    `INSERT INTO messages (from_user_id, to_user_id, message) VALUES (?, ?, ?)`,
    [req.session.userId, toUserId, message],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

// API - Админ статистика
app.get('/api/admin/stats', requireAuth, (req, res) => {
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user || !user.is_admin) {
      return res.json({ success: false });
    }

    db.get('SELECT COUNT(*) as total FROM users', (err, users) => {
      db.get('SELECT COUNT(*) as total FROM likes', (err, likes) => {
        db.get('SELECT COUNT(*) as total FROM matches', (err, matches) => {
          db.get('SELECT COUNT(*) as total FROM messages', (err, messages) => {
            res.json({
              success: true,
              users: users?.total || 0,
              likes: likes?.total || 0,
              matches: matches?.total || 0,
              messages: messages?.total || 0
            });
          });
        });
      });
    });
  });
});

// Error handler для 404
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌟 LoveMatch запущен на http://localhost:${PORT}`);
  console.log(`📝 Демо: admin14 / admin123`);
  console.log(`🌍 URL для общего доступа: https://yourdomain.com`);
  console.log(`📁 Public folder: ${join(__dirname, 'public')}\n`);
});
