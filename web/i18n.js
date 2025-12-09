const translations = {
  en: {
    languageName: "English",
    boardsBtn: "Boards",
    period: "Period",
    lastDay: "Last day",
    last7Days: "Last 7 days",
    last30Days: "Last 30 days",
    last90Days: "Last 90 days",
    lastYear: "Last year",
    allTime: "All time",
    settings: "Settings",
    login: "Sign in",
    username: "username",
    password: "password",
    logout: "Sign out",
    signedInAs: "Signed in as",
    enterCredentials: "Enter username and password.",
    invalidCredentials: "Invalid username or password.",
    error: "Error:",
    clickToSelect: "Click on a chart point",
    noEntries: "No entries.",
    entriesFor: "Entries for",
    mood: "Mood",
    time: "Time",
    createdBy: "Created by",
    theme: "Theme",
    language: "Language",
    botStart: "Welcome to Mood Graph!\n\n" +
      "🎯 /m — Quick mood\n" +
      "🎯 /mood — Mood with media\n" +
      "📊 /board — Select board\n" +
      "🔗 /link <token> — Link Telegram\n\n" +
      "Format: <value> [comment]",
    botMoodStart: "Enter mood value (-100 to 100) and optional comment.\nFormat: <value> [comment]",
    botSelectBoard: "Select a board:",
    botNoBoards: "You don't have any boards yet.",
    botError: "Error: {message}",
    botLinkUsage: "Usage: /link <token> that you got in the admin panel.",
    botLinkFailed: "Failed to link: {message}",
    botLinkSuccess:
      "Link successful ✅\n" +
      "Admin: {username}\n" +
      "Telegram ID: {telegramId}",
    botLinkUnknownError: "Error while linking.",
    botNotAdminShort: "You are not linked as admin.",
    botNotAdminWithInstructions:
      "You are not linked as admin.\n" +
      "If this is your bot, open the web admin, generate a link token " +
      "and send the command:\n/link <token>",
    botBoardsCreateInAdmin: "Go to the web admin panel and create at least one board.",
    botAdminPanelUrl: "Admin panel: {url}",
    botAdminPanelOpenAdminPath: "Open /admin page on the site.",
    botBoardsFetchError: "Failed to get boards list.",
    botBoardsListError: "Error getting boards list",
    botQuickPrompt:
      "Writing to board: \"{boardTitle}\".\n" +
      "Send a number from -100 to 100 and optional topic.\n" +
      "Format: <value> [topic]",
    botValueOutOfRange: "Value must be between -100 and 100.",
    botInvalidValue: "This doesn't look like a number in the range -100..100.",
    botPhotoCaptionInvalid: "Photo caption must contain a number between -100 and 100.",
    botGifCaptionInvalid: "GIF caption must contain a number between -100 and 100.",
    botVideoCaptionInvalid: "Video caption must contain a number between -100 and 100.",
    botValuePrompt: "Send a number from -100 to 100 and optional topic.",
    botSavedAskComment: "Saved: {value}{titlePart}.\nNow send a comment (or /skip to skip).",
    botSavedAskCommentOrMedia: "Saved: {value}{titlePart}.\nNow send a comment or media (or /skip to skip).",
    botSkipNothing: "Nothing to skip right now.",
    botCancelled: "Cancelled.",
    botCancelledShort: "Cancelled",
    botSavedOk: "Mood recorded ✅",
    botSavedError: "Error saving mood",
    botMoodCommandError: "Error while processing /mood command",
    botActiveBoardSet: "Active board: \"{boardTitle}\"",
    botBoardSetSuccess: "Done! Use /m to log your mood.",
    botBoardSetError: "Error saving board",
    adminPanelTitle: "Admin Panel",
    adminHome: "Home",
    currentAdminLabel: "Current admin:",
    telegramStatusLabel: "Telegram status:",
    loading: "Loading...",
    botSiteSettings: "Bot and Site Settings",
    botTokenLabel: "Telegram Bot Token",
    siteAddressLabel: "Site Address (for invites)",
    siteAddressHint:
      "Used to form full invite link. If left empty, window.location.origin will be used.",
    saveSettings: "Save Settings",
    botLanguageTitle: "Bot Language (personal)",
    botLanguageLabel: "Language for your bot messages:",
    saveLanguage: "Save Language",
    telegramLinking: "Telegram Linking",
    generateLinkToken: "Generate Link Token",
    linkStatusHint: "Click button to get link token.",
    changePasswordTitle: "Change Admin Password",
    currentPasswordLabel: "Current Password",
    newPasswordLabel: "New Password",
    repeatPasswordLabel: "Repeat New Password",
    changePasswordBtn: "Change Password",
    passwordStatusHint: "Enter current and new password.",
    myChartsTitle: "My Charts",
    newChartTitleLabel: "New Chart Title",
    newChartTitlePlaceholder: "E.g.: Daily mood",
    publicChartLabel: "Public chart (visible to all on site)",
    createChartBtn: "Create Chart",
    invitesTitle: "Invites",
    inviteBoardLabel: "Chart to give access to",
    inviteRoleLabel: "Who to invite",
    inviteRoleUser: "Regular user",
    inviteRoleAdmin: "Administrator",
    createInviteBtn: "Create Invite",
    inviteStatusHint: "Select chart and role first.",
    inviteOneTimeNote:
      "Invite is one-time: after registration via token it becomes invalid.",
    usersAccessTitle: "Users and Chart Access",
    usersAccessHint:
      "Here you can view which users have access to which charts, and enable/disable access.",
    boardsLoading: "Loading boards...",
    boardsEmpty: "No boards yet.",
    ownerLabel: "Owner:",
    unknown: "unknown",
    deleteBoardConfirm: 'Delete board "{title}"?',
    deleteBoardError: "Failed to delete: {message}",
    boardCreated: "Board created.",
    boardCreateError: "Error: {message}",
    missingTitle: "Please enter title.",
    creatingBoard: "Creating...",
    loadingGeneric: "Loading...",
    statusErrorPrefix: "Error:",
    generatingToken: "Generating token...",
    tokenLabel: "Token:",
    fullCommandLabel: "Full command:",
    copy: "Copy",
    copied: "Copied",
    linkError: "Error generating token: {message}",
    mustSelectBoard: "Select a chart first.",
    creatingInvite: "Creating invite...",
    inviteCreated: "Invite created.",
    inviteToken: "Token:",
    inviteCommand: "Full command:",
    inviteRoleTextAdmin: "Administrator",
    inviteRoleTextUser: "Regular user",
    inviteLinkNote:
      "One-time: after registration via token it becomes invalid.",
    inviteError: "Error: {message}",
    saving: "Saving...",
    languageSaved: "Language saved.",
    languageSaveError: "Error: {message}",
    fillAllPasswords: "Please fill all password fields.",
    passwordsMismatch: "Passwords do not match.",
    passwordTooShort: "Password is too short (min 6 characters).",
    changingPassword: "Changing password...",
    passwordChanged: "Password changed successfully.",
    passwordChangeError: "Error: {message}",
    noUsers: "No users yet.",
    noBoardsManage: "No boards available to manage.",
    userHeader: "User",
    roleHeader: "Role",
    accessChangeError: "Error updating access: {message}",
    linked: "Linked",
    notLinked: "Not linked",
    linkInstruction: "Generate token and send it to bot via /link.",
  },
  ru: {
    languageName: "Русский",
    boardsBtn: "Графики",
    period: "Период",
    lastDay: "Последний день",
    last7Days: "Последние 7 дней",
    last30Days: "Последние 30 дней",
    last90Days: "Последние 90 дней",
    lastYear: "Последний год",
    allTime: "Всё время",
    settings: "Настройки",
    login: "Войти",
    username: "логин",
    password: "пароль",
    logout: "Выйти",
    signedInAs: "Вошёл как",
    enterCredentials: "Введите логин и пароль.",
    invalidCredentials: "Неверный логин или пароль.",
    error: "Ошибка:",
    clickToSelect: "Кликните на точку графика",
    noEntries: "Нет записей.",
    entriesFor: "Записи за",
    mood: "Настроение",
    time: "Время",
    createdBy: "Создано",
    theme: "Тема",
    language: "Язык",
    botStart: "Добро пожаловать в Mood Graph!\n\n" +
      "🎯 /m — Быстрое настроение\n" +
      "🎯 /mood — Настроение с медиа\n" +
      "📊 /board — Выбрать график\n" +
      "🔗 /link <токен> — Привязать Telegram\n\n" +
      "Формат: <число> [комментарий]",
    botMoodStart: "Введи значение настроения (-100 до 100) и опционально комментарий.\nФормат: <число> [комментарий]",
    botSelectBoard: "Выбери график:",
    botNoBoards: "У тебя ещё нет графиков.",
    botError: "Ошибка: {message}",
    botLinkUsage: "Использование: /link <токен>, который ты получил в админке.",
    botLinkFailed: "Не удалось привязать: {message}",
    botLinkSuccess:
      "Привязка выполнена ✅\n" +
      "Админ: {username}\n" +
      "Telegram ID: {telegramId}",
    botLinkUnknownError: "Ошибка при привязке.",
    botNotAdminShort: "Ты не привязан как админ.",
    botNotAdminWithInstructions:
      "Ты не привязан как админ.\n" +
      "Если это твой бот, зайди в веб-админку, сгенерируй токен " +
      "привязки и отправь команду:\n/link <токен>",
    botBoardsCreateInAdmin: "Зайди в веб-админку и создай хотя бы один график.",
    botAdminPanelUrl: "Админ-панель: {url}",
    botAdminPanelOpenAdminPath: "Открой страницу /admin на сайте.",
    botBoardsFetchError: "Не удалось получить список графиков.",
    botBoardsListError: "Ошибка при получении списка графиков",
    botQuickPrompt:
      "Запишу в график: \"{boardTitle}\".\n" +
      "Отправь число от -100 до 100 и тему (опционально).\n" +
      "Формат: <число> [тема]",
    botValueOutOfRange: "Число должно быть от -100 до 100.",
    botInvalidValue: "Это не похоже на число в диапазоне -100..100.",
    botPhotoCaptionInvalid: "Подпись к фото должна содержать число от -100 до 100.",
    botGifCaptionInvalid: "Подпись гифки должна содержать число от -100 до 100.",
    botVideoCaptionInvalid: "Подпись видео должна содержать число от -100 до 100.",
    botValuePrompt: "Отправь число от -100 до 100 и опционально тему.",
    botSavedAskComment: "Сохранил: {value}{titlePart}.\nТеперь отправь комментарий (или /skip для пропуска).",
    botSavedAskCommentOrMedia: "Сохранил: {value}{titlePart}.\nТеперь отправь комментарий или медиа (или /skip для пропуска).",
    botSkipNothing: "Сейчас нечего пропускать.",
    botCancelled: "Отменено.",
    botCancelledShort: "Отменено",
    botSavedOk: "Записал настроение ✅",
    botSavedError: "Ошибка при сохранении",
    botMoodCommandError: "Ошибка при обработке команды /mood",
    botActiveBoardSet: "Активная доска: \"{boardTitle}\"",
    botBoardSetSuccess: "Готово! Используй /m для записи настроения.",
    botBoardSetError: "Ошибка при сохранении доски",
    adminPanelTitle: "Админ-панель",
    adminHome: "Домой",
    currentAdminLabel: "Текущий админ:",
    telegramStatusLabel: "Статус Telegram:",
    loading: "Загрузка...",
    botSiteSettings: "Настройки бота и сайта",
    botTokenLabel: "Токен Telegram-бота",
    siteAddressLabel: "Адрес сайта (для инвайтов)",
    siteAddressHint:
      "Используется для формирования ссылки. Если пусто — будет window.location.origin.",
    saveSettings: "Сохранить настройки",
    botLanguageTitle: "Язык бота (персональный)",
    botLanguageLabel: "Язык для ваших сообщений от бота:",
    saveLanguage: "Сохранить язык",
    telegramLinking: "Привязка Telegram",
    generateLinkToken: "Сгенерировать токен",
    linkStatusHint: "Нажмите кнопку, чтобы получить токен.",
    changePasswordTitle: "Смена пароля администратора",
    currentPasswordLabel: "Текущий пароль",
    newPasswordLabel: "Новый пароль",
    repeatPasswordLabel: "Повторите новый пароль",
    changePasswordBtn: "Сменить пароль",
    passwordStatusHint: "Введите текущий и новый пароль.",
    myChartsTitle: "Мои графики",
    newChartTitleLabel: "Название нового графика",
    newChartTitlePlaceholder: "Напр.: Ежедневное настроение",
    publicChartLabel: "Публичный график (виден всем на сайте)",
    createChartBtn: "Создать график",
    invitesTitle: "Инвайты",
    inviteBoardLabel: "График для доступа",
    inviteRoleLabel: "Кого пригласить",
    inviteRoleUser: "Обычный пользователь",
    inviteRoleAdmin: "Администратор",
    createInviteBtn: "Создать инвайт",
    inviteStatusHint: "Сначала выберите график и роль.",
    inviteOneTimeNote:
      "Инвайт одноразовый: после регистрации по токену он становится недействительным.",
    usersAccessTitle: "Пользователи и доступ к графикам",
    usersAccessHint:
      "Здесь можно посмотреть, у кого есть доступ к графикам, и включить/отключить его.",
    boardsLoading: "Загрузка графиков...",
    boardsEmpty: "Графиков пока нет.",
    ownerLabel: "Владелец:",
    unknown: "неизвестно",
    deleteBoardConfirm: 'Удалить график "{title}"?',
    deleteBoardError: "Не удалось удалить: {message}",
    boardCreated: "График создан.",
    boardCreateError: "Ошибка: {message}",
    missingTitle: "Введите название.",
    creatingBoard: "Создание...",
    loadingGeneric: "Загрузка...",
    statusErrorPrefix: "Ошибка:",
    generatingToken: "Генерация токена...",
    tokenLabel: "Токен:",
    fullCommandLabel: "Полная команда:",
    copy: "Копировать",
    copied: "Скопировано",
    linkError: "Ошибка генерации токена: {message}",
    mustSelectBoard: "Сначала выберите график.",
    creatingInvite: "Создание инвайта...",
    inviteCreated: "Инвайт создан.",
    inviteToken: "Токен:",
    inviteCommand: "Полная команда:",
    inviteRoleTextAdmin: "Администратор",
    inviteRoleTextUser: "Пользователь",
    inviteLinkNote: "Одноразовый: после регистрации становится недействителен.",
    inviteError: "Ошибка: {message}",
    saving: "Сохранение...",
    languageSaved: "Язык сохранен.",
    languageSaveError: "Ошибка: {message}",
    fillAllPasswords: "Заполните все поля пароля.",
    passwordsMismatch: "Пароли не совпадают.",
    passwordTooShort: "Пароль слишком короткий (минимум 6 символов).",
    changingPassword: "Смена пароля...",
    passwordChanged: "Пароль успешно изменен.",
    passwordChangeError: "Ошибка: {message}",
    noUsers: "Пока нет пользователей.",
    noBoardsManage: "Нет доступных графиков для управления.",
    userHeader: "Пользователь",
    roleHeader: "Роль",
    accessChangeError: "Ошибка изменения доступа: {message}",
    linked: "Привязан",
    notLinked: "Не привязан",
    linkInstruction: "Сгенерируйте токен и отправьте его боту через /link.",
  }
};

const resources = Object.keys(translations).reduce((acc, lang) => {
  acc[lang] = { translation: translations[lang] };
  return acc;
}, {});

const fallbackLanguage = "en";
const savedLanguage =
  typeof localStorage !== "undefined" ? localStorage.getItem("language") : null;
const initialLanguage =
  savedLanguage && translations[savedLanguage]
    ? savedLanguage
    : fallbackLanguage;

let currentLanguage = initialLanguage;
let i18nReady = false;

function t(key) {
  if (typeof i18next !== "undefined" && i18next.t) {
    return i18next.t(key);
  }
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function translate(lang, key) {
  if (
    typeof i18next !== "undefined" &&
    i18next.getFixedT &&
    translations[lang]
  ) {
    const fixed = i18next.getFixedT(lang);
    return fixed(key);
  }
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

function getAvailableLanguages() {
  return Object.keys(translations);
}

function getLanguageLabel(lang) {
  const dict = translations[lang];
  return (dict && dict.languageName) || String(lang || "").toUpperCase();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    translations,
    translate,
    getAvailableLanguages,
    getLanguageLabel,
  };
}

function updateAllTranslations() {
  if (typeof document === "undefined") return;
  if (typeof i18next !== "undefined" && i18next.language) {
    currentLanguage = i18next.language;
  }
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (
      (el.tagName === "INPUT" && el.type === "text") ||
      el.type === "password"
    ) {
      el.placeholder = t(key);
    } else if (el.tagName === "OPTION") {
      el.textContent = t(key);
    } else {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    el.innerHTML = t(key);
  });

  document.documentElement.lang = currentLanguage || fallbackLanguage;
}

function setLanguage(lang) {
  if (translations[lang]) {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("language", lang);
      } catch (e) {}
    }
    if (typeof i18next !== "undefined" && i18next.changeLanguage && i18nReady) {
      i18next.changeLanguage(lang).then(() => {
        currentLanguage = i18next.language || lang;
        updateAllTranslations();
      });
    } else {
      currentLanguage = lang;
      updateAllTranslations();
    }
  }
}

function getCurrentLanguage() {
  if (typeof i18next !== "undefined" && i18next.language) {
    return i18next.language;
  }
  return currentLanguage;
}

function initI18n() {
  if (typeof window === "undefined") {
    // Node.js environment: skip DOM-related init
    return;
  }
  if (typeof i18next === "undefined") {
    updateAllTranslations();
    return;
  }
  i18next
    .init({
      lng: initialLanguage,
      fallbackLng: fallbackLanguage,
      resources,
      interpolation: { escapeValue: false },
    })
    .then(() => {
      i18nReady = true;
      currentLanguage = i18next.language || initialLanguage;
      updateAllTranslations();
    })
    .catch((err) => {
      console.error("i18next init error:", err);
      updateAllTranslations();
    });
}

// Sync language across tabs/windows
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "language") {
      const lang = event.newValue;
      if (lang && translations[lang] && lang !== currentLanguage) {
        setLanguage(lang);
      }
    }
  });
}

// Lazy-load i18next if not present
if (typeof window !== "undefined") {
  if (typeof i18next === "undefined" && typeof document !== "undefined") {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/i18next@23.10.1/i18next.min.js";
    script.onload = () => initI18n();
    script.onerror = () => {
      console.error("Failed to load i18next from CDN, using fallback.");
      initI18n();
    };
    document.head.appendChild(script);
  } else {
    initI18n();
  }
}
