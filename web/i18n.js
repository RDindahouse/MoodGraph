const translations = {
  en: {
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
  },
  ru: {
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
  }
};

let currentLanguage = localStorage.getItem("language") || "en";

function t(key) {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem("language", lang);
    updateAllTranslations();
  }
}

function updateAllTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" && el.type === "text" || el.type === "password") {
      el.placeholder = t(key);
    } else if (el.tagName === "OPTION") {
      el.textContent = t(key);
    } else {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    el.innerHTML = t(key);
  });

  document.documentElement.lang = currentLanguage;
}

function getCurrentLanguage() {
  return currentLanguage;
}
