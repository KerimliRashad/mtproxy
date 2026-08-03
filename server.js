import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const db = new sqlite3.Database(':memory:');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'dating-site-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
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
      photo TEXT,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(from_user_id, to_user_id)
    )`);

    // Добавляем админа
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, gender, age, city, about, is_admin)
            VALUES ('admin14', 'admin@dating.site', ?, 'М', 35, 'Москва', 'Администратор сайта', 1)`,
      [hashedPassword]
    );
  });
}

initDB();

// Middleware для проверки аутентификации
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/profiles');
  }
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/profiles');
  }
  res.sendFile(join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/profiles');
  }
  res.sendFile(join(__dirname, 'public', 'register.html'));
});

app.post('/api/register', (req, res) => {
  const { username, email, password, gender, age, city } = req.body;

  if (!username || !email || !password || !gender || !age || !city) {
    return res.json({ success: false, message: 'Заполните все поля' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, email, password, gender, age, city, about)
     VALUES (?, ?, ?, ?, ?, ?, '')`,
    [username, email, hashedPassword, gender, age, city],
    function(err) {
      if (err) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
      }
      req.session.userId = this.lastID;
      res.json({ success: true, message: 'Регистрация успешна!' });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.json({ success: false, message: 'Неправильное имя пользователя или пароль' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.json({ success: false, message: 'Неправильное имя пользователя или пароль' });
    }

    req.session.userId = user.id;
    res.json({ success: true, message: 'Вход выполнен!' });
  });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/api/profile', requireAuth, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.json({ success: false });
    }
    res.json({ success: true, user });
  });
});

app.get('/api/profiles', requireAuth, (req, res) => {
  const { limit = 10, offset = 0 } = req.query;

  db.all(
    `SELECT id, username, gender, age, city, about, photo FROM users
     WHERE id != ? LIMIT ? OFFSET ?`,
    [req.session.userId, limit, offset],
    (err, profiles) => {
      if (err) {
        return res.json({ success: false });
      }
      res.json({ success: true, profiles });
    }
  );
});

app.post('/api/like/:userId', requireAuth, (req, res) => {
  const toUserId = req.params.userId;

  db.run(
    `INSERT OR IGNORE INTO likes (from_user_id, to_user_id) VALUES (?, ?)`,
    [req.session.userId, toUserId],
    (err) => {
      if (err) {
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

app.get('/api/likes', requireAuth, (req, res) => {
  db.all(
    `SELECT DISTINCT u.* FROM users u
     INNER JOIN likes l ON u.id = l.from_user_id
     WHERE l.to_user_id = ?`,
    [req.session.userId],
    (err, likes) => {
      if (err) {
        return res.json({ success: false });
      }
      res.json({ success: true, likes });
    }
  );
});

app.get('/profiles', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'profiles.html'));
});

app.get('/admin', requireAuth, (req, res) => {
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user || !user.is_admin) {
      return res.redirect('/profiles');
    }
    res.sendFile(join(__dirname, 'public', 'admin.html'));
  });
});

app.get('/api/admin/stats', requireAuth, (req, res) => {
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user || !user.is_admin) {
      return res.json({ success: false });
    }

    db.get('SELECT COUNT(*) as total FROM users', (err, totalUsers) => {
      db.get('SELECT COUNT(*) as total FROM likes', (err, totalLikes) => {
        res.json({
          success: true,
          users: totalUsers.total,
          likes: totalLikes.total
        });
      });
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌟 Сайт знакомств запущен на http://localhost:${PORT}`);
  console.log(`📝 Вход: admin14 / admin123`);
});
