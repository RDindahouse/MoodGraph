const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "mood.db");

const db = new Database(DB_FILE);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,      -- u_xxx
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  -- Администраторы (для basic-auth /admin и привязки к Telegram)
  CREATE TABLE IF NOT EXISTS admins (
    id                TEXT PRIMARY KEY,  -- a_xxx
    username          TEXT NOT NULL UNIQUE,
    password_hash     TEXT NOT NULL,
    telegram_id       TEXT,
    telegram_username TEXT,
    link_token        TEXT,
    last_board_id     TEXT,
    admin_language    TEXT DEFAULT 'en'
  );

  CREATE TABLE IF NOT EXISTS boards (
    id                   TEXT PRIMARY KEY,
    title                TEXT NOT NULL,
    owner_admin_username TEXT,
    owner_telegram_id    TEXT,
    is_public            INTEGER NOT NULL   -- 0/1
  );

  CREATE TABLE IF NOT EXISTS user_boards (
    user_id  TEXT NOT NULL,
    board_id TEXT NOT NULL,
    PRIMARY KEY (user_id, board_id)
  );

  CREATE TABLE IF NOT EXISTS moods (
    id         TEXT PRIMARY KEY,     -- m_xxx
    timestamp  TEXT NOT NULL,
    value      INTEGER NOT NULL,     -- -100..100
    note       TEXT,
    source     TEXT,
    board_id   TEXT,
    meta_json  TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_moods_board_time
    ON moods (board_id, timestamp);

  CREATE TABLE IF NOT EXISTS invites (
    token      TEXT PRIMARY KEY,
    board_id   TEXT NOT NULL,
    role       TEXT NOT NULL,
    used       INTEGER NOT NULL,     -- 0/1
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_invites_board
    ON invites (board_id);

  CREATE TABLE IF NOT EXISTS sessions (
    sid        TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

module.exports = db;
