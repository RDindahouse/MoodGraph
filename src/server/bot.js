const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { json } = require("body-parser");
const { translate } = require("../client/i18n");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

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
  const base = translate(language, key);
  return base.replace(/{(\w+)}/g, (_, k) =>
    (params[k] !== undefined ? params[k] : "")
  );
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

    const text = await getBotMessage("botStart", language);
    bot.sendMessage(chatId, text);
  });


  // ==== /link <token> ====
  bot.onText(/\/link\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const token = (match[1] || "").trim();

    const me = await fetchBotMe(msg.from.id);
    const language = me?.admin?.language || currentBotLanguage || "en";

    if (!token) {
      const text = await getBotMessage("botLinkUsage", language);
      return bot.sendMessage(chatId, text);
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
        const msgErr = json.error?.message || "error";
        const text = await getBotMessage("botLinkFailed", language, {
          message: msgErr,
        });
        return bot.sendMessage(chatId, text);
      }

      const text = await getBotMessage("botLinkSuccess", language, {
        username: json.admin.username,
        telegramId: json.admin.telegramId,
      });
      bot.sendMessage(chatId, text);
    } catch (e) {
      console.error(e);
      const text = await getBotMessage("botLinkUnknownError", language);
      bot.sendMessage(chatId, text);
    }
  });


  // ==== /m  (quick save) ====
  bot.onText(/\/m\b/, async (msg) => {
    const chatId = msg.chat.id;

    const me = await fetchBotMe(msg.from.id);
    const language = me?.admin?.language || currentBotLanguage || "en";

    if (!me || !me.admin) {
      const text = await getBotMessage("botNotAdminWithInstructions", language);
      return bot.sendMessage(chatId, text);
    }

    try {
      const boards = Array.isArray(me.boards) ? me.boards : [];

      if (!boards.length) {
        let msgText = await getBotMessage("botNoBoards", language);
        msgText += "\n" + await getBotMessage("botBoardsCreateInAdmin", language);

        const site = (me.config && me.config.siteBaseUrl) || null;
        const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;

        if (adminUrl) {
          msgText += "\n" + await getBotMessage("botAdminPanelUrl", language, {
            url: adminUrl,
          });
        } else {
          msgText += "\n" + await getBotMessage("botAdminPanelOpenAdminPath", language);
        }

        return bot.sendMessage(chatId, msgText);
      }

      let lastBoardId = me.admin ? me.admin.lastBoardId : null;
      let activeBoardId = null;

      if (lastBoardId && boards.some(b => b.id === lastBoardId)) {
        activeBoardId = lastBoardId;
      } else {
        activeBoardId = boards[0].id;
      }

      // If the user provided arguments inline with the command, try to parse and save immediately.
      const rawText = (msg.text || "").replace(/^\/m(@\S+)?\s*/i, "").trim();
      if (rawText) {
        const m = rawText.match(/^([+-]?\d+(?:[.,]\d+)?)(?:\s+(.*))?$/s);
        if (m) {
          const moodValue = Number(m[1].replace(',', '.'));
          const title = (m[2] || "").trim();
          if (isNaN(moodValue) || moodValue < -100 || moodValue > 100) {
            const badMsg = await getBotMessage("botValueOutOfRange", language);
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
            const okMsg = await getBotMessage("botSavedOk", language);
            return bot.sendMessage(chatId, okMsg);
          } catch (err) {
            console.error(err);
            const errMsg = await getBotMessage("botSavedError", language);
            return bot.sendMessage(chatId, errMsg);
          }
        }
      }

      // No inline args – fall back to interactive flow prompting for number+topic
      const activeBoard =
        boards.find((b) => b.id === activeBoardId) || boards[0];

      userStates[chatId] = {
        step: "waitingValue",
        boardId: activeBoardId,
        language,
      };

      const msgText = await getBotMessage("botQuickPrompt", language, {
        boardTitle: activeBoard.title,
      });

      bot.sendMessage(chatId, msgText);
    } catch (e) {
      console.error(e);

      let msgText = await getBotMessage("botBoardsFetchError", language);
      msgText += "\n" + await getBotMessage("botBoardsCreateInAdmin", language);

      const site = (me && me.config && me.config.siteBaseUrl) || null;
      const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;

      if (adminUrl) {
        msgText += "\n" + await getBotMessage("botAdminPanelUrl", language, {
          url: adminUrl,
        });
      } else {
        msgText += "\n" + await getBotMessage("botAdminPanelOpenAdminPath", language);
      }

      return bot.sendMessage(chatId, msgText);
    }

  });

  // ==== /board - выбор активной доски ====
  bot.onText(/\/board\b/, async (msg) => {
    const chatId = msg.chat.id;

    const me = await fetchBotMe(msg.from.id);
    const language = me?.admin?.language || currentBotLanguage || "en";
    
    if (!me || !me.admin) {
      const text = await getBotMessage("botNotAdminShort", language);
      return bot.sendMessage(chatId, text);
    }

    try {
      const boards = Array.isArray(me.boards) ? me.boards : [];

      if (!boards.length) {
        const msgText = await getBotMessage("botNoBoards", language);
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

      const msgText = await getBotMessage("botSelectBoard", language);
      bot.sendMessage(chatId, msgText, {
        reply_markup: keyboard,
      });
    } catch (e) {
      console.error(e);
      const msgText = await getBotMessage("botBoardsListError", language);
      bot.sendMessage(chatId, msgText);
    }
  });

  // ==== /mood (interactive) ====
  bot.onText(/\/mood\b/, async (msg) => {
    const chatId = msg.chat.id;

    const me = await fetchBotMe(msg.from.id);
    const language = me?.admin?.language || currentBotLanguage || "en";
    
    if (!me || !me.admin) {
      const text = await getBotMessage("botNotAdminShort", language);
      return bot.sendMessage(chatId, text);
    }

    try {
      const boards = Array.isArray(me.boards) ? me.boards : [];

      if (!boards.length) {
        let msgText = await getBotMessage("botNoBoards", language);
        msgText += "\n" + await getBotMessage("botBoardsCreateInAdmin", language);
        
        const site = (me.config && me.config.siteBaseUrl) || null;
        const adminUrl = site ? `${site.replace(/\/$/, "")}/admin` : null;
        
        if (adminUrl) {
          msgText += "\n" + await getBotMessage("botAdminPanelUrl", language, {
            url: adminUrl,
          });
        }
        
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
            const badMsg = await getBotMessage("botValueOutOfRange", language);
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

          const titlePart = title ? ` "${title}"` : "";
          const prompt = await getBotMessage("botSavedAskCommentOrMedia", language, {
            value: moodValue,
            titlePart,
          });

          return bot.sendMessage(chatId, prompt);
        }
      }

      // No inline args – prompt for value+topic first
      userStates[chatId] = {
        step: "waitingValue",
        boardId: activeBoardId,
        language,
        allowFollowup: true, // indicates interactive flow continues to waitingNote
      };

      const activeBoard = boards.find(b => b.id === activeBoardId);
      const msgText = await getBotMessage("botQuickPrompt", language, {
        boardTitle: activeBoard.title,
      });

      bot.sendMessage(chatId, msgText);
    } catch (e) {
      console.error(e);
      const msgText = await getBotMessage("botMoodCommandError", language);
      return bot.sendMessage(chatId, msgText);
    }
  });

  // ==== /skip ====
  bot.onText(/\/skip\b/, async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];
    const language = state?.language || "en";

    if (!state) {
      const msgText = await getBotMessage("botSkipNothing", language);
      return bot.sendMessage(chatId, msgText);
    }

    // На шаге waitingValue - отмена
    if (state.step === "waitingValue") {
      delete userStates[chatId];
      const msgText = await getBotMessage("botCancelled", language);
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
        const okMsg = await getBotMessage("botSavedOk", language);
        return bot.sendMessage(chatId, okMsg);
      } catch (err) {
        console.error(err);
        const errMsg = await getBotMessage("botSavedError", language);
        return bot.sendMessage(chatId, errMsg);
      }
    } else {
      delete userStates[chatId];
      const msgText = await getBotMessage("botCancelledShort", language);
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
        const msgText = await getBotMessage("botActiveBoardSet", language, {
          boardTitle: selectedBoard.title,
        });

        await bot.editMessageText(msgText, {
          chat_id: chatId,
          message_id: message.message_id,
        });

        delete userStates[chatId];
        bot.answerCallbackQuery(query.id);
        
        const responseText = await getBotMessage("botBoardSetSuccess", language);
        return bot.sendMessage(chatId, responseText);
      } catch (e) {
        console.error(e);
        bot.answerCallbackQuery(query.id);
        const errorText = await getBotMessage("botBoardSetError", language);
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
          const msgText = await getBotMessage("botInvalidValue", language);
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
            const msgText = await getBotMessage("botPhotoCaptionInvalid", language);
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
            const msgText = await getBotMessage("botGifCaptionInvalid", language);
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
            const msgText = await getBotMessage("botVideoCaptionInvalid", language);
            return bot.sendMessage(chatId, msgText);
          }

          if (parts.length > 1) {
            title = captionTrim.slice(parts[0].length).trim();
          }
        }
      }

      if (moodValue === null) {
        const msgText = await getBotMessage("botValuePrompt", language);
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

      const titlePart = title ? ` "${title}"` : "";
      const msgText = await getBotMessage("botSavedAskComment", language, {
        value: moodValue,
        titlePart,
      });

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
        const msgText = await getBotMessage("botSavedOk", language);
        bot.sendMessage(chatId, msgText);
      } catch (err) {
        console.error(err);
        const msgText = await getBotMessage("botSavedError", language);
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
