const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'social_media.db');

let _db = null;
let _ready = false;
let _readyResolve = null;
const _readyPromise = new Promise((resolve) => {
  _readyResolve = resolve;
});

function wrapDb(sqlDb) {
  return {
    run(sql, params = []) {
      sqlDb.run(sql, params);
      const lastIdResult = sqlDb.exec("SELECT last_insert_rowid() as id");
      const changesResult = sqlDb.exec("SELECT changes() as count");
      return {
        lastInsertRowid: lastIdResult[0]?.values[0]?.[0] || 0,
        changes: changesResult[0]?.values[0]?.[0] || 0
      };
    },

    get(sql, params = []) {
      const stmt = sqlDb.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },

    all(sql, params = []) {
      const stmt = sqlDb.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        rows.push(row);
      }
      stmt.free();
      return rows;
    },

    exec(sql) {
      sqlDb.exec(sql);
    },

    save() {
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    }
  };
}

async function initDatabase() {
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  _db = wrapDb(sqlDb);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE(user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(follower_id, following_id)
    );
  `);

  _db.save();
  _ready = true;
  _readyResolve();
  console.log('Database initialized successfully.');
}

initDatabase().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

function getDb() {
  return _db;
}

module.exports = { getDb, ready: _readyPromise };
