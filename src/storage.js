const db = require("./db");
const crypto = require("crypto");

// ======= helpers =======

function nowIso() {
  return new Date().toISOString();
}

// ======= USERS =======

// user: { id, username, passwordHash, role, boards: [boardId...] }

function getUserByUsername(username) {
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!row) return null;

  const boards = db
    .prepare("SELECT board_id FROM user_boards WHERE user_id = ?")
    .all(row.id)
    .map((r) => r.board_id);

  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    boards,
  };
}

function getUserById(id) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!row) return null;
  const boards = db
    .prepare("SELECT board_id FROM user_boards WHERE user_id = ?")
    .all(id)
    .map((r) => r.board_id);
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    boards,
  };
}

function createUser({ username, passwordHash, role, boards = [] }) {
  const id = "u_" + crypto.randomBytes(8).toString("hex");
  const createdAt = nowIso();

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertBoard = db.prepare(`
    INSERT OR IGNORE INTO user_boards (user_id, board_id)
    VALUES (?, ?)
  `);

  const tx = db.transaction(() => {
    insertUser.run(id, username, passwordHash, role, createdAt);
    boards.forEach((b) => insertBoard.run(id, String(b)));
  });

  tx();

  return getUserById(id);
}

function setUserBoards(userId, boards) {
  const del = db.prepare("DELETE FROM user_boards WHERE user_id = ?");
  const ins = db.prepare(
    "INSERT OR IGNORE INTO user_boards (user_id, board_id) VALUES (?, ?)"
  );

  const tx = db.transaction(() => {
    del.run(userId);
    (boards || []).forEach((b) => {
      ins.run(userId, String(b));
    });
  });

  tx();
}

function getAllUsersWithBoards() {
  const users = db.prepare("SELECT * FROM users").all();
  const rels = db
    .prepare("SELECT user_id, board_id FROM user_boards")
    .all();

  const mapBoards = {};
  rels.forEach((r) => {
    if (!mapBoards[r.user_id]) mapBoards[r.user_id] = [];
    mapBoards[r.user_id].push(r.board_id);
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    boards: mapBoards[u.id] || [],
  }));
}

// ======= ADMINS =======

function getAllAdmins() {
  return db.prepare("SELECT * FROM admins").all();
}

function getAdminByUsername(username) {
  const row = db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .get(username);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    linkToken: row.link_token,
  };
}

function getAdminByLinkToken(token) {
  const row = db
    .prepare("SELECT * FROM admins WHERE link_token = ?")
    .get(token);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    linkToken: row.link_token,
  };
}

function getAdminByTelegramId(telegramId) {
  const row = db
    .prepare("SELECT * FROM admins WHERE telegram_id = ?")
    .get(String(telegramId));

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    linkToken: row.link_token,
  };
}

function getAdminByUsername(username) {
  const row = db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .get(username);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    linkToken: row.link_token,
  };
}

function createAdmin({ username, passwordHash }) {
  const id = "a_" + crypto.randomBytes(8).toString("hex");
  db.prepare(
    "INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)"
  ).run(id, username, passwordHash);
  return getAdminByUsername(username);
}

function updateAdminPasswordHash(adminId, newPasswordHash) {
  db.prepare(
    "UPDATE admins SET password_hash = ? WHERE id = ?"
  ).run(newPasswordHash, adminId);
}

function updateAdminTelegram(id, { telegramId, telegramUsername }) {
  db.prepare(
    "UPDATE admins SET telegram_id = ?, telegram_username = ?, link_token = NULL WHERE id = ?"
  ).run(
    telegramId ? String(telegramId) : null,
    telegramUsername || null,
    id
  );
}

function setAdminLinkToken(id, token) {
  db.prepare("UPDATE admins SET link_token = ? WHERE id = ?").run(
    token,
    id
  );
}

function ensureDefaultAdmin(passwordHash) {
  const count = db
    .prepare("SELECT COUNT(*) as c FROM admins")
    .get().c;
  if (count > 0) return;

  const id = "a_" + crypto.randomBytes(8).toString("hex");

  db.prepare(
    "INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)"
  ).run(id, "admin", passwordHash);
}

// ======= CONFIG (botToken, siteBaseUrl) =======

function getConfigValue(key) {
  const row = db.prepare("SELECT value FROM config WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setConfigValue(key, value) {
  db.prepare(
    "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

function getBotToken() {
  return getConfigValue("botToken");
}

function setBotToken(token) {
  if (!token) {
    db.prepare("DELETE FROM config WHERE key = 'botToken'").run();
  } else {
    setConfigValue("botToken", token);
  }
}

function getSiteBaseUrl() {
  return getConfigValue("siteBaseUrl");
}

function setSiteBaseUrl(url) {
  if (!url) {
    db.prepare("DELETE FROM config WHERE key = 'siteBaseUrl'").run();
  } else {
    setConfigValue("siteBaseUrl", url);
  }
}

// ======= BOARDS =======

function getAllBoards() {
  return db.prepare("SELECT * FROM boards").all();
}

function createBoard({ id, title, ownerAdminUsername, ownerTelegramId, isPublic }) {
  db.prepare(
    `
    INSERT INTO boards (id, title, owner_admin_username, owner_telegram_id, is_public)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(
    String(id),
    title,
    ownerAdminUsername || null,
    ownerTelegramId ? String(ownerTelegramId) : null,
    isPublic ? 1 : 0
  );
}

function deleteBoard(id) {
  const bid = String(id);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM boards WHERE id = ?").run(bid);
    db.prepare("DELETE FROM user_boards WHERE board_id = ?").run(bid);
  });
  tx();
}

function getBoardsForTelegram(telegramId) {
  return db
    .prepare(
      "SELECT * FROM boards WHERE owner_telegram_id = ? ORDER BY title"
    )
    .all(String(telegramId));
}

// ======= INVITES =======

function createInvite({ token, boardId, role }) {
  db.prepare(
    `
    INSERT INTO invites (token, board_id, role, used, created_at)
    VALUES (?, ?, ?, 0, ?)
  `
  ).run(token, String(boardId), role, nowIso());
}

function getInviteByToken(token) {
  const row = db
    .prepare("SELECT * FROM invites WHERE token = ?")
    .get(token);
  if (!row) return null;
  return {
    token: row.token,
    boardId: row.board_id,
    role: row.role,
    used: !!row.used,
    createdAt: row.created_at,
  };
}

function markInviteUsed(token) {
  db.prepare("UPDATE invites SET used = 1 WHERE token = ?").run(token);
}

// ======= SESSIONS =======

function createSession(userId) {
  const sid = crypto.randomBytes(16).toString("hex");
  db.prepare(
    "INSERT INTO sessions (sid, user_id, created_at) VALUES (?, ?, ?)"
  ).run(sid, userId, nowIso());
  return sid;
}

function getUserBySession(sid) {
  const row = db
    .prepare("SELECT user_id FROM sessions WHERE sid = ?")
    .get(sid);
  if (!row) return null;
  return getUserById(row.user_id);
}

function deleteSession(sid) {
  db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
}

// ======= MOODS =======

function addMood({ timestamp, value, note, source, boardId, meta }) {
  const id = "m_" + crypto.randomBytes(8).toString("hex");
  db.prepare(
    `
    INSERT INTO moods (id, timestamp, value, note, source, board_id, meta_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    timestamp,
    value,
    note || "",
    source || null,
    boardId ? String(boardId) : null,
    meta ? JSON.stringify(meta) : null
  );
  return id;
}

function getAllMoods() {
  const rows = db
    .prepare(
      "SELECT id, timestamp, value, note, source, board_id, meta_json FROM moods"
    )
    .all();
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    value: r.value,
    note: r.note,
    source: r.source,
    boardId: r.board_id,
    meta: r.meta_json ? JSON.parse(r.meta_json) : null,
  }));
}

// ======= EXPORT =======

module.exports = {
  // users
  getUserByUsername,
  getUserById,
  createUser,
  setUserBoards,
  getAllUsersWithBoards,

  // admins
  getAllAdmins,
  getAdminByUsername,
  getAdminByLinkToken,
  getAdminByTelegramId,
  getAdminByUsername,
  createAdmin,
  updateAdminPasswordHash,
  updateAdminTelegram,
  setAdminLinkToken,
  ensureDefaultAdmin,

  // config
  getBotToken,
  setBotToken,
  getSiteBaseUrl,
  setSiteBaseUrl,

  // boards
  getAllBoards,
  createBoard,
  deleteBoard,
  getBoardsForTelegram,

  // invites
  createInvite,
  getInviteByToken,
  markInviteUsed,

  // sessions
  createSession,
  getUserBySession,
  deleteSession,

  // moods
  addMood,
  getAllMoods,
};
