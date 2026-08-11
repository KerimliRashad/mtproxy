import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const db = new sqlite3.Database(':memory:');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'lovematch-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

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
      is_admin BOOLEAN DEFAULT 0
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
      time DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Добавляем админа
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users
            VALUES (1, 'admin14', 'admin@test.com', ?, 'М', 35, 'Москва', 'Админ', 'спорт', 1)`,
      [hash]
    );

    // Демо пользователи
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
              (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [u, e, h, g, a, c, ab, '']
      );
    });
  });
}

initDB();

// ========== ROUTES ==========

// Главная
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/discover');
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Вход
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/discover');
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// Регистрация
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/discover');
  res.sendFile(path.join(__dirname, 'public/register.html'));
});

// Поиск профилей
app.get('/discover', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/discover.html'));
});

// Мэтчи
app.get('/matches', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/matches.html'));
});

// Сообщения
app.get('/messages', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/messages.html'));
});

// Профиль
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/profile.html'));
});

// Админ
app.get('/admin', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.user.id], (err, u) => {
    if (!u || !u.is_admin) return res.redirect('/discover');
    res.sendFile(path.join(__dirname, 'public/admin.html'));
  });
});

// ========== API ==========

// Регистрация
app.post('/api/register', (req, res) => {
  const { username, email, password, gender, age, city } = req.body;

  if (!username || !email || !password || !gender || !age || !city) {
    return res.json({ success: false, message: 'Заполните все поля' });
  }

  const hash = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users VALUES (NULL, ?, ?, ?, ?, ?, ?, '', '', 0)`,
    [username, email, hash, gender, age, city],
    function(err) {
      if (err) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
      }
      req.session.user = { id: this.lastID, username };
      res.json({ success: true });
    }
  );
});

// Вход
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.json({ success: false, message: 'Неправильные данные' });
    }

    req.session.user = { id: user.id, username: user.username };
    res.json({ success: true });
  });
});

// Выход
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Мой профиль
app.get('/api/profile', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
    if (!user) return res.json({ success: false });
    res.json({ success: true, user });
  });
});

// Обновить профиль
app.post('/api/profile/update', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { about, interests } = req.body;
  db.run('UPDATE users SET about = ?, interests = ? WHERE id = ?',
    [about || '', interests || '', req.session.user.id],
    () => res.json({ success: true })
  );
});

// Получить профили
app.get('/api/discover', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  db.all(
    'SELECT id, username, gender, age, city, about FROM users WHERE id != ?',
    [req.session.user.id],
    (err, profiles) => {
      if (err || !profiles) return res.json({ success: false });
      res.json({ success: true, profiles });
    }
  );
});

// Лайк
app.post('/api/like/:id', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const to = req.params.id;

  db.run('INSERT OR IGNORE INTO likes VALUES (NULL, ?, ?)',
    [req.session.user.id, to],
    () => {
      db.get(
        'SELECT id FROM likes WHERE from_id = ? AND to_id = ?',
        [to, req.session.user.id],
        (err, match) => {
          res.json({ success: true, match: !!match });
        }
      );
    }
  );
});

// Мэтчи
app.get('/api/matches', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  db.all(`
    SELECT u.id, u.username, u.gender, u.age, u.city
    FROM users u
    INNER JOIN likes l1 ON u.id = l1.to_id
    INNER JOIN likes l2 ON u.id = l2.from_id
    WHERE l1.from_id = ? AND l2.to_id = ?
  `, [req.session.user.id, req.session.user.id], (err, matches) => {
    res.json({ success: true, matches: matches || [] });
  });
});

// Отправить сообщение
app.post('/api/messages/:id', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { message } = req.body;
  if (!message) return res.json({ success: false });

  db.run('INSERT INTO messages VALUES (NULL, ?, ?, ?, CURRENT_TIMESTAMP)',
    [req.session.user.id, req.params.id, message],
    () => res.json({ success: true })
  );
});

// Получить сообщения
app.get('/api/messages/:id', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  db.all(`
    SELECT * FROM messages
    WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
    ORDER BY time DESC LIMIT 50
  `, [req.session.user.id, req.params.id, req.params.id, req.session.user.id],
    (err, msgs) => {
      res.json({ success: true, messages: msgs || [] });
    }
  );
});

// Админ статистика
app.get('/api/admin/stats', (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.user.id], (err, u) => {
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

// Стартуем
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌟 LoveMatch работает на порту ${PORT}`);
  console.log(`📝 Логин: admin14 / admin123\n`);
});
