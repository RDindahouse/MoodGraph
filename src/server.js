const express = require("express");
const basicAuth = require("basic-auth");
const bodyParser = require("body-parser");
const path = require("path");
const fetch = require("node-fetch");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const storage = require("./storage");

const WEB_DIR = path.join(__dirname, "..", "web");

const app = express();
const PORT = process.env.WEB_PORT || process.env.PORT || 3000;

app.use(bodyParser.json());

// ================== cookies / sessions ==================

function parseCookies(header) {
  const list = {};
  if (!header) return list;
  header.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join("="));
    list[name] = value;
  });
  return list;
}

app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sid = cookies.sid;
  if (!sid) {
    req.user = null;
    return next();
  }

  const user = storage.getUserBySession(sid);
  req.user = user || null;
  next();
});


// ================== web path ================== 
(function initSiteBaseUrlFromEnv() {
  const current = storage.getSiteBaseUrl();
  const envDomain = process.env.DOMAIN;
  if (!current && envDomain && envDomain.trim()) {
    storage.setSiteBaseUrl(envDomain.trim());
    console.log("Site base URL set from DOMAIN env:", envDomain.trim());
  }
})();

// ================== admin auth (basic) ==================

async function adminAuth(req, res, next) {
  const creds = basicAuth(req);
  if (!creds || !creds.name || !creds.pass) {
    res.set("WWW-Authenticate", 'Basic realm="Mood Admin"');
    return res.status(401).send("Authentication required");
  }

  const defaultPassHash = bcrypt.hashSync("admin", 10);
  storage.ensureDefaultAdmin(defaultPassHash);

  const admin = storage.getAdminByUsername(creds.name);
  if (!admin) {
    res.set("WWW-Authenticate", 'Basic realm="Mood Admin"');
    return res.status(401).send("Bad credentials");
  }

  const ok = bcrypt.compareSync(creds.pass, admin.passwordHash);
  if (!ok) {
    res.set("WWW-Authenticate", 'Basic realm="Mood Admin"');
    return res.status(401).send("Bad credentials");
  }

  req.admin = admin;
  req.adminUsername = admin.username;
  next();
}

app.post("/api/admin/password", adminAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Укажи старый и новый пароль." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Новый пароль должен быть не короче 6 символов." });
    }

    const admin = req.admin; // выставили в adminAuth
    if (!admin) {
      return res.status(401).json({ error: "Не авторизован." });
    }

    const ok = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: "Старый пароль неверный." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    storage.updateAdminPasswordHash(admin.id, newHash);

    return res.json({ ok: true });
  } catch (e) {
    console.error("Error in /api/admin/password:", e);
    return res.status(500).json({ error: "Внутренняя ошибка сервера." });
  }
});

// ================== helper: visible boards ==================

function getVisibleBoardIdsForRequest(req) {
  const boards = storage.getAllBoards();

  const publicIds = boards
    .filter((b) => b.is_public === 1 || b.is_public === true)
    .map((b) => String(b.id));

  const allowed = new Set(publicIds);

  if (req.user && Array.isArray(req.user.boards)) {
    req.user.boards.forEach((id) => id && allowed.add(String(id)));
  }

  return Array.from(allowed);
}

// ================== routes for pages ==================

app.get("/admin.html", adminAuth, (req, res) => {
  res.sendFile(path.join(WEB_DIR, "admin.html"));
});

app.get("/admin", adminAuth, (req, res) => {
  res.redirect("/admin.html");
});

app.get("/invite/:token", (req, res) => {
  res.sendFile(path.join(WEB_DIR, "invite.html"));
});

// статика (index.html, styles.css, иконки и т.п.)
app.use(express.static(WEB_DIR));

// ================== moods API ==================

function handlePostMood(req, res, defaultSource) {
  let { value, note, timestamp, source, meta, boardId } = req.body || {};

  value = Number(value);
  if (isNaN(value) || value < -100 || value > 100) {
    return res.status(400).json({ error: "value must be -100..100" });
  }

  if (!boardId || typeof boardId !== "string") {
    return res.status(400).json({ error: "boardId is required" });
  }

  const time = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(time.getTime())) {
    return res.status(400).json({ error: "invalid timestamp" });
  }

  const entry = {
    timestamp: time.toISOString(),
    value,
    note: note || "",
    source: source || defaultSource,
    boardId,
    meta: meta || null,
  };

  storage.addMood(entry);

  res.json({ status: "ok", entry });
}

app.get("/api/moods", (req, res) => {
  const all = storage.getAllMoods();

  const visibleIds = getVisibleBoardIdsForRequest(req);
  let allowedIds = visibleIds;
  if (!allowedIds.length) {
    allowedIds = [...new Set(all.map((e) => e.boardId).filter(Boolean))];
  }

  const boardsParam = req.query.boards;
  let selectedIds;
  if (boardsParam) {
    const requested = boardsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const filtered = requested.filter((id) => allowedIds.includes(id));
    selectedIds = filtered.length ? filtered : allowedIds;
  } else {
    selectedIds = allowedIds;
  }

  const data = all
    .filter((e) => {
      if (!e.boardId) return true;
      return selectedIds.includes(String(e.boardId));
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  res.json(data);
});

app.get("/api/moods/day/:date", (req, res) => {
  const date = req.params.date;
  const all = storage.getAllMoods();

  const visibleIds = getVisibleBoardIdsForRequest(req);
  let allowedIds = visibleIds;
  if (!allowedIds.length) {
    allowedIds = [...new Set(all.map((e) => e.boardId).filter(Boolean))];
  }

  const boardsParam = req.query.boards;
  let selectedIds;
  if (boardsParam) {
    const requested = boardsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const filtered = requested.filter((id) => allowedIds.includes(id));
    selectedIds = filtered.length ? filtered : allowedIds;
  } else {
    selectedIds = allowedIds;
  }

  const data = all.filter((e) => {
    if (!e.timestamp || !e.timestamp.startsWith(date)) return false;
    if (!e.boardId) return true;
    return selectedIds.includes(String(e.boardId));
  });

  res.json(data);
});

app.post("/api/moods", adminAuth, (req, res) => {
  handlePostMood(req, res, "admin");
});

app.post("/api/bot/moods", (req, res) => {
  const ip = req.ip || "";
  if (
    !ip.includes("127.0.0.1") &&
    ip !== "::1" &&
    !ip.endsWith("::ffff:127.0.0.1")
  ) {
    return res.status(403).json({ error: "forbidden" });
  }
  handlePostMood(req, res, "telegram");
});

// ================== media proxy (Telegram) ==================

function getBotTokenEffective() {
  return storage.getBotToken() || process.env.TG_TOKEN || null;
}

app.get("/api/media/photo/:fileId", async (req, res) => {
  const token = getBotTokenEffective();
  if (!token) return res.status(500).send("Bot token not configured");

  const fileId = req.params.fileId;

  try {
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(
        fileId
      )}`
    );
    const fileJson = await fileRes.json();
    if (!fileJson.ok) {
      return res.status(500).send("Failed to get file info");
    }

    const filePath = fileJson.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    const tgRes = await fetch(fileUrl);
    if (!tgRes.ok) {
      return res.status(500).send("Failed to fetch file");
    }

    const contentType =
      tgRes.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    tgRes.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching media");
  }
});

app.get("/api/media/animation/:fileId", async (req, res) => {
  const token = getBotTokenEffective();
  if (!token) return res.status(500).send("Bot token not configured");

  const fileId = req.params.fileId;

  try {
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(
        fileId
      )}`
    );
    const fileJson = await fileRes.json();
    if (!fileJson.ok) {
      return res.status(500).send("Failed to get file info");
    }

    const filePath = fileJson.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    const tgRes = await fetch(fileUrl);
    if (!tgRes.ok) {
      return res.status(500).send("Failed to fetch file");
    }

    const contentType =
      tgRes.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    tgRes.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching media");
  }
});

// ================== bot & site config ==================

app.get("/api/admin/config", adminAuth, (req, res) => {
  const botToken = storage.getBotToken() || "";
  const siteBaseUrl = storage.getSiteBaseUrl() || "";
  res.json({ botToken, siteBaseUrl });
});

app.post("/api/admin/config", adminAuth, (req, res) => {
  const { botToken, siteBaseUrl } = req.body || {};

  if (typeof botToken === "string" && botToken.trim()) {
    storage.setBotToken(botToken.trim());
  }

  if (typeof siteBaseUrl === "string") {
    storage.setSiteBaseUrl(siteBaseUrl.trim());
  }

  res.json({ status: "ok" });
});

// ================== admin profile / telegram link ==================

app.get("/api/admin/me", adminAuth, (req, res) => {
  const admin = req.admin;
  res.json({
    admin: {
      id: admin.id,
      username: admin.username,
      telegramId: admin.telegramId,
      telegramUsername: admin.telegramUsername,
    },
  });
});

app.post("/api/admin/link-token", adminAuth, (req, res) => {
  const admin = req.admin;
  const token = crypto.randomBytes(8).toString("hex");
  storage.setAdminLinkToken(admin.id, token);
  res.json({ token });
});

app.post("/api/bot/link-admin", (req, res) => {
  const { token, telegramId, telegramUsername } = req.body || {};
  if (!token || !telegramId) {
    return res.status(400).json({ error: "token and telegramId required" });
  }

  const admin = storage.getAdminByLinkToken(token);
  if (!admin) {
    return res.status(400).json({ error: "invalid token" });
  }

  storage.updateAdminTelegram(admin.id, {
    telegramId: String(telegramId),
    telegramUsername: telegramUsername || null,
  });

  res.json({
    status: "ok",
    admin: { username: admin.username, telegramId: String(telegramId) },
  });
});

app.get("/api/bot/is-admin", (req, res) => {
  const telegramId = req.query.telegramId;
  if (!telegramId) {
    return res.status(400).json({ error: "telegramId required" });
  }

  try {
    const admin = storage.getAdminByTelegramId(telegramId);
    res.json({ isAdmin: !!admin });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal error" });
  }
});

// ================== BOARDS (graphs) ==================

app.get("/api/boards", (req, res) => {
  const rawBoards = storage.getAllBoards();
  const visibleIds = getVisibleBoardIdsForRequest(req).map(String);

  const byId = new Map(rawBoards.map((b) => [String(b.id), b]));
  const result = [];

  visibleIds.forEach((id) => {
    const b = byId.get(id);
    if (b) {
      result.push({
        id: String(b.id),
        title: b.title,
        ownerAdminUsername: b.owner_admin_username || null,
        ownerTelegramId: b.owner_telegram_id || null,
        isPublic: !!b.is_public,
      });
    }
  });

  visibleIds.forEach((id) => {
    if (!byId.has(id)) {
      result.push({
        id,
        title: id,
        ownerAdminUsername: null,
        ownerTelegramId: null,
        isPublic: false,
      });
    }
  });

  res.json({ boards: result });
});


app.get("/api/bot/boards", (req, res) => {
  const telegramId = req.query.telegramId;
  if (!telegramId) {
    return res.status(400).json({ error: "telegramId required" });
  }
  const boards = storage.getBoardsForTelegram(telegramId);
  res.json({ boards });
});

app.get("/api/admin/boards", adminAuth, (req, res) => {
  const raw = storage.getAllBoards();
  const boards = raw.map((b) => ({
    id: String(b.id),
    title: b.title,
    ownerAdminUsername: b.owner_admin_username || null,
    ownerTelegramId: b.owner_telegram_id || null,
    isPublic: !!b.is_public,
  }));
  res.json({ boards });
});


app.post("/api/admin/boards", adminAuth, (req, res) => {
  const { title, isPublic } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  const admin = req.admin;
  if (!admin.telegramId) {
    return res.status(400).json({
      error:
        "Админ не привязан к Telegram. Сначала сгенерируй токен и привяжи через бота.",
    });
  }

  let boardId =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    crypto.randomBytes(4).toString("hex");

  const existing = storage.getAllBoards();
  if (existing.find((b) => String(b.id) === boardId)) {
    boardId = boardId + "-" + crypto.randomBytes(2).toString("hex");
  }

  storage.createBoard({
    id: boardId,
    title: title.trim(),
    ownerAdminUsername: admin.username,
    ownerTelegramId: admin.telegramId,
    isPublic: !!isPublic,
  });

  const board = storage.getAllBoards().find((b) => String(b.id) === boardId);
  res.json({ status: "ok", board });
});

app.delete("/api/admin/boards/:id", adminAuth, (req, res) => {
  const id = req.params.id;
  storage.deleteBoard(id);
  res.json({ status: "ok" });
});

// ================== INVITES ==================

app.post("/api/admin/invites", adminAuth, (req, res) => {
  const { boardId, role } = req.body || {};
  if (!boardId) return res.status(400).json({ error: "boardId required" });

  const inviteRole = role === "admin" ? "admin" : "user";

  const boards = storage.getAllBoards();
  const exists = boards.some((b) => String(b.id) === String(boardId));
  if (!exists) return res.status(400).json({ error: "unknown boardId" });

  const token = crypto.randomBytes(16).toString("hex");
  storage.createInvite({ token, boardId, role: inviteRole });

  res.json({
    status: "ok",
    token,
    inviteUrl: `/invite/${token}`,
  });
});

app.post("/api/invite/accept", (req, res) => {
  const { token, username, password } = req.body || {};
  if (!token || !username || !password) {
    return res
      .status(400)
      .json({ error: "token, username, password required" });
  }

  const invite = storage.getInviteByToken(token);
  if (!invite || invite.used) {
    return res.status(400).json({ error: "invalid invite" });
  }

  const existingUser = storage.getUserByUsername(username);
  const admins = storage.getAllAdmins();
  if (
    existingUser ||
    admins.find((a) => a.username === username)
  ) {
    return res.status(400).json({ error: "username taken" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const role = invite.role === "admin" ? "admin" : "user";

  const user = storage.createUser({
    username,
    passwordHash,
    role,
    boards: [invite.boardId],
  });

  if (role === "admin") {
    storage.createAdmin({ username, passwordHash });
  }

  storage.markInviteUsed(token);

  res.json({ status: "ok", user: { id: user.id, username: user.username } });
});

// ================== ADMIN: users & access ==================

app.get("/api/admin/users", adminAuth, (req, res) => {
  const users = storage.getAllUsersWithBoards();
  const boards = storage.getAllBoards();
  res.json({ users, boards });
});

app.post("/api/admin/users/:id/boards", adminAuth, (req, res) => {
  const userId = req.params.id;
  const { boards } = req.body || {};
  const allUsers = storage.getAllUsersWithBoards();
  const exists = allUsers.find((u) => u.id === userId);
  if (!exists) return res.status(404).json({ error: "user not found" });

  const list = Array.isArray(boards)
    ? boards.map((b) => String(b))
    : [];
  storage.setUserBoards(userId, list);

  res.json({ status: "ok" });
});

// ================== LOGIN / LOGOUT / ME ==================

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }

  const user = storage.getUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const sid = storage.createSession(user.id);
  res.setHeader(
    "Set-Cookie",
    `sid=${sid}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  );

  res.json({
    status: "ok",
    user: {
      id: user.id,
      username: user.username,
      boards: user.boards,
      role: user.role || "user",
    },
  });
});

app.post("/api/logout", (req, res) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sid = cookies.sid;
  if (sid) {
    storage.deleteSession(sid);
    res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0");
  }
  res.json({ status: "ok" });
});

app.get("/api/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  const { id, username, boards, role } = req.user;
  res.json({ user: { id, username, boards, role: role || "user" } });
});

// ================== start ==================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
