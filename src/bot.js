const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { json } = require("body-parser");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

const botMessages = {
  en: {
    start: "Welcome to Mood Graph!\n\n/m — Quick mood\n/mood — Mood with media\n/board — Select board\n/link <token> — Link Telegram",
    moodStart: "Enter mood value (-100 to 100) and optional comment.\nFormat: <value> [comment]",
    selectBoard: "Select a board:",
    noBoards: "You don't have any boards yet.",
    error: "Error: {message}",
  },
  ru: {
    start: "Добро пожаловать в Mood Graph!\n\n/m — Быстрое настроение\n/mood — Настроение с медиа\n/board — Выбрать график\n/link <токен> — Привязать Telegram",
    moodStart: "Введи значение настроения (-100 до 100) и опционально комментарий.\nФормат: <число> [комментарий]",
    selectBoard: "Выбери график:",
    noBoards: "У тебя ещё нет графиков.",
    error: "Ошибка: {message}",
  }
};

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function fetchBotLanguage() {
  try {
    const res = await fetch("http://localhost:3000/api/bot/config");
    if (!res.ok) return "en";
    const json = await res.json();
    return json.botLanguage || "en";
  } catch (e) {
    console.error("Failed to fetch bot language:", e);
    return "en";
  }
}

let currentBotLanguage = "en";

async function getBotMessage(key, language = "en", params = {}) {
  const msg = botMessages[language]?.[key] || botMessages.en[key] || key;
  return msg.replace(/{(\w+)}/g, (_, k) => params[k] || "");
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

let TG_TOKEN = process.env.TG_TOKEN;

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

  currentBotLanguage = await fetchBotLanguage();

  bot = new TelegramBot(TG_TOKEN, { polling: true });
  console.log(
    "Telegram bot started with token from",
    json.botToken ? "config.json" : process.env.TG_TOKEN ? "ENV" : "DB"
  );

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const me = await fetchBotMe(msg.from.id);
    const language = me?.admin?.language || "en";
    
    const text = language === "ru"
      ? "Добро пожаловать в Mood Graph!\n\n" +
        "🎯 /m — Быстрое настроение\n" +
        "🎯 /mood — Настроение с медиа\n" +
        "📊 /board — Выбрать график\n" +
        "🔗 /link <токен> — Привязать Telegram\n\n" +
        "Формат: <число> [комментарий]"
      : "Welcome to Mood Graph!\n\n" +
        "🎯 /m — Quick mood\n" +
        "🎯 /mood — Mood with media\n" +
        "📊 /board — Select board\n" +
        "🔗 /link <token> — Link Telegram\n\n" +
        "Format: <value> [comment]";
    
    bot.sendMessage(chatId, text);
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

  // ==== /m  (quick save) ====
  bot.onText(/\/m\b/, async (msg) => {
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
      const language = me.admin?.language || "en";

      if (!boards.length) {
        const site = (me.config && me.config.siteBaseUrl) || null;
        const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;
        const msgText = language === "ru"
          ? "У тебя ещё нет графиков.\n" +
            "Зайди в веб-админку и создай хотя бы один график.\n" +
            (adminUrl ? `Админ-панель: ${adminUrl}` : "Открой страницу /admin на сайте.")
          : "You don't have any boards yet.\n" +
            "Go to the web admin panel and create a board.\n" +
            (adminUrl ? `Admin panel: ${adminUrl}` : "Open /admin page on the site.");
        return bot.sendMessage(chatId, msgText);
      }

      // Получаем последнюю доску
      let lastBoardId = me.admin ? me.admin.lastBoardId : null;
      let activeBoardId = null;

      if (lastBoardId && boards.some(b => b.id === lastBoardId)) {
        activeBoardId = lastBoardId;
      } else {
        // Используем первую доску если последняя не установлена или удалена
        activeBoardId = boards[0].id;
      }

      const activeBoard = boards.find(b => b.id === activeBoardId);

      // If the user provided arguments inline with the command, try to parse and save immediately.
      const rawText = (msg.text || "").replace(/^\/m(@\S+)?\s*/i, "").trim();
      if (rawText) {
        const m = rawText.match(/^([+-]?\d+(?:[.,]\d+)?)(?:\s+(.*))?$/s);
        if (m) {
          const moodValue = Number(m[1].replace(',', '.'));
          const title = (m[2] || "").trim();
          if (isNaN(moodValue) || moodValue < -100 || moodValue > 100) {
            const badMsg = language === "ru"
              ? "Число должно быть от -100 до 100."
              : "Value must be between -100 and 100.";
            return bot.sendMessage(chatId, badMsg);
          }

          const extraMeta = {};
          extraMeta.titleProvided = !!title;

          try {
            await sendMoodToApi(
              chatId,
              msg.from,
              moodValue,
              title || "",
              extraMeta,
              activeBoardId || "default"
            );
            const okMsg = language === "ru" ? "Записал настроение ✅" : "Mood recorded ✅";
            return bot.sendMessage(chatId, okMsg);
          } catch (err) {
            console.error(err);
            const errMsg = language === "ru" ? "Ошибка при сохранении" : "Error saving mood";
            return bot.sendMessage(chatId, errMsg);
          }
        }
      }

      // No inline args — fall back to interactive flow prompting for number+topic
      userStates[chatId] = {
        step: "waitingValue",
        boardId: activeBoardId,
        language,
      };

      const msgText = language === "ru"
        ? `Запишу в график: "${activeBoard.title}".\n` +
          "Отправь число от -100 до 100 и тему (опционально).\n" +
          "Формат: <число> [тема]"
        : `Writing to board: "${activeBoard.title}".\n` +
          "Send a number from -100 to 100 and optional topic.\n" +
          "Format: <value> [topic]";

      bot.sendMessage(chatId, msgText);
    } catch (e) {
      console.error(e);
      const site = (me && me.config && me.config.siteBaseUrl) || null;
      const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;
      const language = me?.admin?.language || "en";
      const msgText = language === "ru"
        ? "Не удалось получить список графиков.\n" +
          "Зайди в веб-админку и проверь настройки или создай график.\n" +
          (adminUrl ? `Админ-панель: ${adminUrl}` : "Открой страницу /admin на сайте.")
        : "Failed to get boards list.\n" +
          "Go to the web admin panel and check settings or create a board.\n" +
          (adminUrl ? `Admin panel: ${adminUrl}` : "Open /admin page on the site.");
      return bot.sendMessage(chatId, msgText);
    }
  });

  // ==== /board - выбор активной доски ====
  bot.onText(/\/board\b/, async (msg) => {
    const chatId = msg.chat.id;

    const me = await fetchBotMe(msg.from.id);
    if (!me || !me.admin) {
      return bot.sendMessage(chatId, "Ты не привязан как админ.");
    }

    try {
      const boards = Array.isArray(me.boards) ? me.boards : [];
      const language = me.admin?.language || "en";

      if (!boards.length) {
        const msgText = language === "ru" ? "У тебя нет графиков." : "You don't have any boards.";
        return bot.sendMessage(chatId, msgText);
      }

      userStates[chatId] = {
        step: "selectingBoard",
        boards,
        language,
      };

      const keyboard = {
        inline_keyboard: boards.map((b) => [
          { text: b.title, callback_data: "selectboard:" + b.id },
        ]),
      };

      const msgText = language === "ru"
        ? "Выбери график, который хочешь использовать по умолчанию:"
        : "Select a board to use by default:";

      bot.sendMessage(chatId, msgText, {
        reply_markup: keyboard,
      });
    } catch (e) {
      console.error(e);
      const language = me?.admin?.language || "en";
      const msgText = language === "ru" ? "Ошибка при получении списка графиков" : "Error getting boards list";
      bot.sendMessage(chatId, msgText);
    }
  });

  // ==== /mood (interactive) ====
  bot.onText(/\/mood\b/, async (msg) => {
    const chatId = msg.chat.id;

    const me = await fetchBotMe(msg.from.id);
    if (!me || !me.admin) {
      return bot.sendMessage(chatId, "Ты не привязан как админ.");
    }

    try {
      const boards = Array.isArray(me.boards) ? me.boards : [];
      const language = me.admin?.language || "en";

      if (!boards.length) {
        const site = (me.config && me.config.siteBaseUrl) || null;
        const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;
        const msgText = language === "ru"
          ? "У тебя ещё нет графиков. Создай хотя бы один в админ-панели."
          : "You don't have any boards yet. Create one in the admin panel.";
        return bot.sendMessage(chatId, msgText);
      }

      let lastBoardId = me.admin ? me.admin.lastBoardId : null;
      let activeBoardId = null;

      if (lastBoardId && boards.some(b => b.id === lastBoardId)) {
        activeBoardId = lastBoardId;
      } else {
        activeBoardId = boards[0].id;
      }

      const rawText = (msg.text || "").replace(/^\/mood(@\S+)?\s*/i, "").trim();
      if (rawText) {
        const m = rawText.match(/^([+-]?\d+(?:[.,]\d+)?)(?:\s+(.*))?$/s);
        if (m) {
          const moodValue = Number(m[1].replace(',', '.'));
          const title = (m[2] || "").trim();
          if (isNaN(moodValue) || moodValue < -100 || moodValue > 100) {
            const badMsg = language === "ru"
              ? "Число должно быть от -100 до 100."
              : "Value must be between -100 and 100.";
            return bot.sendMessage(chatId, badMsg);
          }

          // Start interactive second step where user can add media/comment
          userStates[chatId] = {
            step: "waitingNote",
            boardId: activeBoardId,
            language,
            moodValue,
            title,
            extraMeta: {},
          };

          const prompt = language === "ru"
            ? `Сохранил: ${moodValue} ${title ? `"${title}"` : ""}.\nТеперь отправь комментарий или медиа (или /skip для пропуска).`
            : `Saved: ${moodValue} ${title ? `"${title}"` : ""}.\nNow send a comment or media (or /skip to skip).`;

          return bot.sendMessage(chatId, prompt);
        }
      }

      // No inline args — prompt for value+topic first
      userStates[chatId] = {
        step: "waitingValue",
        boardId: activeBoardId,
        language,
        allowFollowup: true, // indicates interactive flow continues to waitingNote
      };

      const msgText = language === "ru"
        ? `Запишу в график: "${boards.find(b=>b.id===activeBoardId).title}".\nОтправь число и тему (формат: <число> [тема])` 
        : `Writing to board: \"${boards.find(b=>b.id===activeBoardId).title}\".\nSend number and topic (format: <value> [topic])`;

      bot.sendMessage(chatId, msgText);
    } catch (e) {
      console.error(e);
      return bot.sendMessage(chatId, "Ошибка при обработке команды /mood");
    }
  });

  // ==== /skip ====
  bot.onText(/\/skip\b/, async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];
    const language = state?.language || "en";

    if (!state) {
      return bot.sendMessage(chatId, language === "ru" ? "Сейчас нечего пропускать." : "Nothing to skip right now.");
    }

    // На шаге waitingValue - отмена
    if (state.step === "waitingValue") {
      delete userStates[chatId];
      const msgText = language === "ru" ? "Отменено." : "Cancelled.";
      return bot.sendMessage(chatId, msgText);
    }

    // На шаге waitingNote - пропустить комментарий и сохранить
    if (state.step === "waitingNote") {
      try {
        // Формируем финальный note - может быть только тема
        let finalNote = state.title || "";

        await sendMoodToApi(
          chatId,
          msg.from,
          state.moodValue,
          finalNote,
          state.extraMeta || {},
          state.boardId || "default"
        );

        delete userStates[chatId];
        const msgText = language === "ru"
          ? "Записал настроение ✅"
          : "Mood recorded ✅";
        bot.sendMessage(chatId, msgText);
      } catch (err) {
        console.error(err);
        const msgText = language === "ru"
          ? "Ошибка при сохранении"
          : "Error saving mood";
        bot.sendMessage(chatId, msgText);
      }
    } else {
      delete userStates[chatId];
      const msgText = language === "ru" ? "Отменено" : "Cancelled";
      bot.sendMessage(chatId, msgText);
    }
  });

  bot.on("callback_query", async (query) => {
    const { message, data } = query;
    if (!message || !data) return;

    const chatId = message.chat.id;
    const state = userStates[chatId];

    // Обработка выбора доски при /board команде
    if (data.startsWith("selectboard:") && state && state.step === "selectingBoard") {
      const boardId = data.slice("selectboard:".length);
      const language = state.language || "en";

      try {
        // Сохраняем последнюю доску
        await fetch("http://localhost:3000/api/bot/v1/set-last-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramId: query.from.id,
            boardId,
          }),
        });

        const selectedBoard = state.boards.find(b => b.id === boardId);
        const msgText = language === "ru"
          ? `Активная доска: "${selectedBoard.title}"`
          : `Active board: "${selectedBoard.title}"`;
        
        await bot.editMessageText(msgText, {
          chat_id: chatId,
          message_id: message.message_id,
        });

        delete userStates[chatId];
        bot.answerCallbackQuery(query.id);
        const responseText = language === "ru"
          ? "Готово! Используй /m для записи настроения." 
          : "Done! Use /m to log your mood.";
        return bot.sendMessage(chatId, responseText);
      } catch (e) {
        console.error(e);
        bot.answerCallbackQuery(query.id);
        const errorText = language === "ru"
          ? "Ошибка при сохранении доски"
          : "Error saving board";
        return bot.sendMessage(chatId, errorText);
      }
    }

    bot.answerCallbackQuery(query.id);
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];

    if (!state) return;

    if (msg.text && msg.text.startsWith("/")) return;

    const language = state.language || "en";

    // Шаг 1: Ожидаем число + тема
    if (state.step === "waitingValue") {
      let moodValue = null;
      let title = "";
      const extraMeta = {};

      // Парсим текстовое сообщение: число [тема]
      if (msg.text) {
        const textTrim = msg.text.trim();
        const parts = textTrim.split(/\s+/, 2);
        
        moodValue = Number(parts[0].replace(",", "."));

        if (isNaN(moodValue) || moodValue < -100 || moodValue > 100) {
          const msgText = language === "ru"
            ? "Это не похоже на число в диапазоне -100..100."
            : "This doesn't look like a number in the range -100..100.";
          return bot.sendMessage(chatId, msgText);
        }

        // Остаток текста - это тема
        if (parts.length > 1) {
          title = textTrim.slice(parts[0].length).trim();
        }
      }

      // Обработка фото/гифки/видео с подписью - должно быть число [тема]
      if (msg.photo && msg.photo.length) {
        const photo = msg.photo[msg.photo.length - 1];
        extraMeta.photo = {
          file_id: photo.file_id,
          width: photo.width,
          height: photo.height,
        };
        if (msg.caption) {
          const captionTrim = msg.caption.trim();
          const parts = captionTrim.split(/\s+/, 2);
          moodValue = Number(parts[0].replace(",", "."));
          
          if (isNaN(moodValue) || moodValue < -100 || moodValue > 100) {
            const msgText = language === "ru"
              ? "Подпись к фото должна содержать число от -100 до 100."
              : "Photo caption must contain a number between -100 and 100.";
            return bot.sendMessage(chatId, msgText);
          }
          
          if (parts.length > 1) {
            title = captionTrim.slice(parts[0].length).trim();
          }
        }
      }

      if (msg.animation) {
        extraMeta.animation = {
          file_id: msg.animation.file_id,
          mime_type: msg.animation.mime_type,
          file_name: msg.animation.file_name,
        };
        if (msg.caption) {
          const captionTrim = msg.caption.trim();
          const parts = captionTrim.split(/\s+/, 2);
          moodValue = Number(parts[0].replace(",", "."));
          
          if (isNaN(moodValue) || moodValue < -100 || moodValue > 100) {
            const msgText = language === "ru"
              ? "Подпись гифки должна содержать число от -100 до 100."
              : "GIF caption must contain a number between -100 and 100.";
            return bot.sendMessage(chatId, msgText);
          }
          
          if (parts.length > 1) {
            title = captionTrim.slice(parts[0].length).trim();
          }
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
          const captionTrim = msg.caption.trim();
          const parts = captionTrim.split(/\s+/, 2);
          moodValue = Number(parts[0].replace(",", "."));
          
          if (isNaN(moodValue) || moodValue < -100 || moodValue > 100) {
            const msgText = language === "ru"
              ? "Подпись видео должна содержать число от -100 до 100."
              : "Video caption must contain a number between -100 and 100.";
            return bot.sendMessage(chatId, msgText);
          }
          
          if (parts.length > 1) {
            title = captionTrim.slice(parts[0].length).trim();
          }
        }
      }

      if (moodValue === null) {
        const msgText = language === "ru"
          ? "Отправь число от -100 до 100 и опционально тему."
          : "Send a number from -100 to 100 and optional topic.";
        return bot.sendMessage(chatId, msgText);
      }

      // Переходим ко второму шагу - комментарий
      userStates[chatId] = {
        step: "waitingNote",
        boardId: state.boardId,
        language,
        moodValue,
        title,
        extraMeta,
      };

      const msgText = language === "ru"
        ? `Сохранил: ${moodValue} ${title ? `"${title}"` : ""}.\nТеперь отправь комментарий (или /skip для пропуска).`
        : `Saved: ${moodValue} ${title ? `"${title}"` : ""}.\nNow send a comment (or /skip to skip).`;

      bot.sendMessage(chatId, msgText);
    }

    // Шаг 2: Ожидаем комментарий и сохраняем
    else if (state.step === "waitingNote") {
      let note = "";
      const extraMeta = state.extraMeta || {};

      // Парсим текстовое сообщение
      if (msg.text) {
        note = msg.text.trim();
      }

      // Обработка фото/гифки/видео/стикера с подписью
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

      if (msg.sticker) {
        extraMeta.sticker = {
          file_id: msg.sticker.file_id,
          file_unique_id: msg.sticker.file_unique_id,
          width: msg.sticker.width,
          height: msg.sticker.height,
          is_animated: msg.sticker.is_animated,
          is_video: msg.sticker.is_video,
        };
        if (msg.caption) {
          note = msg.caption.trim();
        }
      }

      // Формируем финальный note: тема + комментарий
      let finalNote = state.title;
      if (note) {
        finalNote = finalNote ? `${finalNote}\n${note}` : note;
      }

      try {
        // mark whether user provided a title in the first step
        extraMeta.titleProvided = !!state.title;

        // debug: log what we're about to send for media troubleshooting
        console.log("[bot] sendMoodToApi", {
          chatId,
          moodValue: state.moodValue,
          note: finalNote ? finalNote.slice(0, 200) : "",
          extraMetaKeys: Object.keys(extraMeta),
        });

        await sendMoodToApi(
          chatId,
          msg.from,
          state.moodValue,
          finalNote,
          extraMeta,
          state.boardId || "default"
        );

        delete userStates[chatId];
        const msgText = language === "ru"
          ? "Записал настроение ✅"
          : "Mood recorded ✅";
        bot.sendMessage(chatId, msgText);
      } catch (err) {
        console.error(err);
        const msgText = language === "ru"
          ? "Ошибка при сохранении"
          : "Error saving mood";
        bot.sendMessage(chatId, msgText);
      }
    }
  });
}

// Стартуем и периодически пробуем инициализироваться, пока не появится токен
tryInitBot();
setInterval(tryInitBot, 5000);

const API_URL = "http://localhost:3000/api/bot/v1/moods";

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
