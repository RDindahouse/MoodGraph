const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "mood.db");

const db = new Database(DB_FILE);

db.pragma("journal_mode = WAL");

db.exec(`
  -- Пользователи (для логина на index.html)
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,      -- u_xxx
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL,         -- 'user' или 'admin'
    created_at    TEXT NOT NULL
  );

  -- Администраторы (для basic-auth /admin и привязки к Telegram)
  CREATE TABLE IF NOT EXISTS admins (
    id                TEXT PRIMARY KEY,  -- a_xxx
    username          TEXT NOT NULL UNIQUE,
    password_hash     TEXT NOT NULL,
    telegram_id       TEXT,
    telegram_username TEXT,
    link_token        TEXT
  );

  -- Графики / доски (boards из config.json)
  CREATE TABLE IF NOT EXISTS boards (
    id                   TEXT PRIMARY KEY,  -- "default", "public-1" и т.п.
    title                TEXT NOT NULL,
    owner_admin_username TEXT,
    owner_telegram_id    TEXT,
    is_public            INTEGER NOT NULL   -- 0/1
  );

  -- Связь пользователь - график (раньше users.boards[])
  CREATE TABLE IF NOT EXISTS user_boards (
    user_id  TEXT NOT NULL,
    board_id TEXT NOT NULL,
    PRIMARY KEY (user_id, board_id)
  );

  -- Записи настроения
  CREATE TABLE IF NOT EXISTS moods (
    id         TEXT PRIMARY KEY,     -- m_xxx
    timestamp  TEXT NOT NULL,        -- ISO-строка
    value      INTEGER NOT NULL,     -- -100..100
    note       TEXT,
    source     TEXT,                 -- 'telegram', 'admin' и т.д.
    board_id   TEXT,
    meta_json  TEXT                  -- JSON-строка с meta
  );

  CREATE INDEX IF NOT EXISTS idx_moods_board_time
    ON moods (board_id, timestamp);

  -- Инвайты
  CREATE TABLE IF NOT EXISTS invites (
    token      TEXT PRIMARY KEY,
    board_id   TEXT NOT NULL,
    role       TEXT NOT NULL,        -- 'user' или 'admin'
    used       INTEGER NOT NULL,     -- 0/1
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_invites_board
    ON invites (board_id);

  -- Сессии (sid -> user_id)
  CREATE TABLE IF NOT EXISTS sessions (
    sid        TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Общая конфигурация (key-value: botToken, siteBaseUrl, и т.д.)
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

module.exports = db;
