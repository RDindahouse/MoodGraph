const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function checkIsAdmin(telegramId) {
  // deprecated: replaced by fetchBotMe()
  try {
    const me = await fetch(
      `http://localhost:3000/api/bot/v1/me?telegramId=${encodeURIComponent(
        telegramId
      )}`
    ).then((r) => r.json());
    return !!me?.admin;
  } catch (e) {
    console.error("bot v1 /me error:", e);
    return false;
  }
}

async function fetchBotMe(telegramId) {
  try {
    const res = await fetch(
      `http://localhost:3000/api/bot/v1/me?telegramId=${encodeURIComponent(
        telegramId
      )}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (e) {
    console.error("fetchBotMe error:", e);
    return null;
  }
}


const cfg = readConfig();
let TG_TOKEN = cfg.botToken || process.env.TG_TOKEN;

async function fetchBotTokenFromServer() {
  try {
    const res = await fetch("http://localhost:3000/api/bot/config");
    if (!res.ok) return null;
    const json = await res.json();
    const token = (json && json.botToken) || null;
    return token && token.trim() ? token.trim() : null;
  } catch (e) {
    console.error("Failed to fetch bot token from server:", e);
    return null;
  }
}

let bot = null;

// In-memory per-chat state for the /mood flow
const userStates = Object.create(null);

async function tryInitBot() {
  if (bot) return;

  if (!TG_TOKEN) {
    TG_TOKEN = await fetchBotTokenFromServer();
  }

  if (!TG_TOKEN) {
    console.error(
      "Bot token is not set yet. Set it in admin panel or ENV TG_TOKEN. Will retry in 5s..."
    );
    return;
  }

  bot = new TelegramBot(TG_TOKEN, { polling: true });
  console.log(
    "Telegram bot started with token from",
    cfg.botToken ? "config.json" : process.env.TG_TOKEN ? "ENV" : "DB"
  );


  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "Привет! Я бот для трекинга настроения.\n\n" +
        "Команда /mood запускает диалог:\n" +
        "1️⃣ Выбери график (таблицу), куда писать\n" +
        "2️⃣ Напиши число от -100 до 100\n" +
        "3️⃣ Добавь комментарий (текст/фото/гифку) или /skip.\n\n" +
        "Команда /link <токен> привязывает твой Telegram к админке."
    );
  });

  // ==== /link <token> ====
  bot.onText(/\/link\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const token = (match[1] || "").trim();

    if (!token) {
      return bot.sendMessage(
        chatId,
        "Использование: /link <токен>, который ты получил в админке."
      );
    }

    try {
      const res = await fetch("http://localhost:3000/api/bot/v1/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          telegramId: msg.from.id,
          telegramUsername: msg.from.username || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        const msgErr = json.error?.message || "ошибка";
        return bot.sendMessage(chatId, "Не удалось привязать: " + msgErr);
      }

      bot.sendMessage(
        chatId,
        "Привязка выполнена ✅\n" +
          "Админ: " +
          json.admin.username +
          "\nTelegram ID: " +
          json.admin.telegramId
      );
    } catch (e) {
      console.error(e);
      bot.sendMessage(chatId, "Ошибка при привязке ");
    }
  });

  // ==== /mood  ====
  bot.onText(/\/mood\b/, async (msg) => {
    const chatId = msg.chat.id;

    const me = await fetchBotMe(msg.from.id);
    if (!me || !me.admin) {
      return bot.sendMessage(
        chatId,
        "Ты не привязан как админ.\n" +
          "Если это твой бот, зайди в веб-админку, сгенерируй токен " +
          "привязки и отправь команду:\n/link <токен>"
      );
    }

    try {
      const boards = Array.isArray(me.boards) ? me.boards : [];
      if (!boards.length) {
        const site = (me.config && me.config.siteBaseUrl) || null;
        const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;
        const msgText =
          "У тебя пока нет графиков.\n" +
          "Зайди в веб-админку и создай хотя бы один график.\n" +
          (adminUrl
            ? `Админ-панель: ${adminUrl}`
            : "Открой страницу /admin на сайте.");
        return bot.sendMessage(chatId, msgText);
      }

      if (boards.length === 1) {
        userStates[chatId] = {
          step: "waitingValue",
          boardId: boards[0].id,
        };
        return bot.sendMessage(
          chatId,
          `Запишу в график: "${boards[0].title}".\n` +
            "Теперь напиши число настроения от -100 до 100."
        );
      }

      userStates[chatId] = {
        step: "waitingBoard",
        boards,
      };

      const keyboard = {
        inline_keyboard: boards.map((b) => [
          { text: b.title, callback_data: "board:" + b.id },
        ]),
      };

      bot.sendMessage(chatId, "Выбери график, куда записать настроение:", {
        reply_markup: keyboard,
      });
    } catch (e) {
      console.error(e);
      const site = (me && me.config && me.config.siteBaseUrl) || null;
      const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;
      const msgText =
        "Не удалось получить список графиков.\n" +
        "Зайди в веб-админку и проверь настройки или создай график.\n" +
        (adminUrl
          ? `Админ-панель: ${adminUrl}`
          : "Открой страницу /admin на сайте.");
      return bot.sendMessage(chatId, msgText);
    }
  });

  // ==== /skip ====
  bot.onText(/\/skip\b/, async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];

    if (!state || state.step !== "waitingNote") {
      return bot.sendMessage(
        chatId,
        "Сейчас нечего пропускать. Сначала вызови /mood "
      );
    }

    try {
      await sendMoodToApi(
        chatId,
        msg.from,
        state.moodValue,
        "",
        { skippedNote: true },
        state.boardId || "default"
      );

      delete userStates[chatId];
      bot.sendMessage(chatId, "Записал настроение без комментария ");
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "Что-то пошло не так при сохранении ");
    }
  });

  bot.on("callback_query", async (query) => {
    const { message, data } = query;
    if (!message || !data) return;

    const chatId = message.chat.id;
    const state = userStates[chatId];

    if (data.startsWith("board:") && state && state.step === "waitingBoard") {
      const boardId = data.slice("board:".length);

      userStates[chatId] = {
        step: "waitingValue",
        boardId,
      };

      await bot.editMessageText(`График выбран.`, {
        chat_id: chatId,
        message_id: message.message_id,
      });

      bot.answerCallbackQuery(query.id);
      return bot.sendMessage(
        chatId,
        "Теперь напиши число настроения от -100 до 100."
      );
    }

    bot.answerCallbackQuery(query.id);
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];

    if (!state) return;

    if (msg.text && msg.text.startsWith("/")) return;

    if (state.step === "waitingValue") {
      if (!msg.text) {
        return bot.sendMessage(
          chatId,
          "Нужно прислать именно число от -100 до 100 "
        );
      }

      const value = Number(msg.text.trim().replace(",", "."));

      if (isNaN(value) || value < -100 || value > 100) {
        return bot.sendMessage(
          chatId,
          "Это не похоже на число в диапазоне -100..100. Попробуй ещё раз."
        );
      }

      userStates[chatId] = {
        step: "waitingNote",
        moodValue: value,
        boardId: state.boardId || "default",
      };

      return bot.sendMessage(
        chatId,
        `Ок, записываю настроение: ${value}.\n` +
          "Теперь отправь комментарий (текст),\n" +
          "или фото/гифку с подписью.\n" +
          "Если не хочешь добавлять комментарий — напиши /skip."
      );
    }

    if (state.step === "waitingNote") {
      let note = "";
      const extraMeta = {};

      if (msg.text) {
        note = msg.text.trim();
      }

      if (msg.photo && msg.photo.length) {
        const photo = msg.photo[msg.photo.length - 1];
        extraMeta.photo = {
          file_id: photo.file_id,
          width: photo.width,
          height: photo.height,
        };
        if (msg.caption) {
          note = msg.caption.trim();
        }
      }

      if (msg.animation) {
        extraMeta.animation = {
          file_id: msg.animation.file_id,
          mime_type: msg.animation.mime_type,
          file_name: msg.animation.file_name,
        };
        if (msg.caption) {
          note = msg.caption.trim();
        }
      }

      if (msg.video) {
        extraMeta.video = {
          file_id: msg.video.file_id,
          width: msg.video.width,
          height: msg.video.height,
          mime_type: msg.video.mime_type,
        };
        if (msg.caption) {
          note = msg.caption.trim();
        }
      }

      try {
        await sendMoodToApi(
          chatId,
          msg.from,
          state.moodValue,
          note,
          extraMeta,
          state.boardId || "default"
        );

        delete userStates[chatId];
        bot.sendMessage(chatId, "Записал настроение ✅");
      } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "Ошибка при сохранении ");
      }
    }
  });
}

// Стартуем и периодически пробуем инициализироваться, пока не появится токен
tryInitBot();
setInterval(tryInitBot, 5000);

// use v1 API endpoints
const API_URL = "http://localhost:3000/api/bot/v1/moods";
// const BOARDS_URL = "http://localhost:3000/api/bot/boards"; // not needed in v1

async function sendMoodToApi(chatId, user, moodValue, note, extraMeta, boardId) {
  const meta = {
    chatId,
    username: user?.username || null,
    first_name: user?.first_name || null,
    last_name: user?.last_name || null,
    ...extraMeta,
  };

  const body = {
    value: moodValue,
    note: note || "",
    meta,
    boardId,
  };

  await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bot-Token": TG_TOKEN,
    },
    body: JSON.stringify(body),
  });
}
