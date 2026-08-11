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

    const hash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users
            VALUES (1, 'admin14', 'admin@test.com', ?, 'М', 35, 'Москва', 'Админ', 'спорт', 1)`,
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
              (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
        `INSERT OR IGNORE INTO users VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [name, email, h, gender, age, city, about, interestsStr]
      );
    }
  });
}

initDB();

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
    `INSERT INTO users VALUES (NULL, ?, ?, ?, ?, ?, ?, '', '', 0)`,
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
    `INSERT INTO users VALUES (NULL, ?, ?, ?, ?, ?, ?, '', '', 0)`,
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
      return res.json({ success: false, message: 'Неправильные данные' });
    }

    res.cookie('userId', user.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax'
    });
    res.json({ success: true });
  });
});

app.post('/api/login-submit', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.redirect('/login?error=1');
    }

    res.cookie('userId', user.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax'
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

app.post('/api/profile/update', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  const { about, interests } = req.body;
  db.run('UPDATE users SET about = ?, interests = ? WHERE id = ?',
    [about || '', interests || '', req.userId],
    () => res.json({ success: true })
  );
});

app.get('/api/discover', (req, res) => {
  if (!req.userId) return res.json({ success: false, message: 'Требуется авторизация' });

  db.all(
    'SELECT id, username, gender, age, city, about, interests FROM users WHERE id != ? LIMIT 50',
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
      db.get(
        'SELECT id FROM likes WHERE from_id = ? AND to_id = ?',
        [to, req.userId],
        (err, match) => {
          res.json({ success: true, match: !!match });
        }
      );
    }
  );
});

app.get('/api/matches', (req, res) => {
  if (!req.userId) return res.json({ success: false });

  db.all(`
    SELECT DISTINCT u.id, u.username, u.gender, u.age, u.city
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

  const { message } = req.body;
  if (!message) return res.json({ success: false });

  db.run('INSERT INTO messages VALUES (NULL, ?, ?, ?, CURRENT_TIMESTAMP)',
    [req.userId, req.params.id, message],
    () => res.json({ success: true })
  );
});

app.get('/api/messages/:id', (req, res) => {
  if (!req.userId) return res.json({ success: false });

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌟 LoveMatch на порту ${PORT}`);
  console.log(`📝 admin14 / admin123\n`);
});
