let siteBaseUrl = "";
let currentAdminId = null;
let currentAdminUsername = "";
let currentAdminTelegramId = null;

const languageLabel = (code) => {
  if (typeof getLanguageLabel === "function") {
    return getLanguageLabel(code);
  }
  const dict =
    (typeof translations !== "undefined" && translations[code]) || {};
  return dict.languageName || String(code || "").toUpperCase();
};

const availableLanguages = () => {
  if (typeof getAvailableLanguages === "function") {
    return getAvailableLanguages();
  }
  if (typeof translations !== "undefined") {
    return Object.keys(translations);
  }
  return [];
};

function populateLanguageSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  availableLanguages().forEach((lang) => {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = languageLabel(lang);
    selectEl.appendChild(opt);
  });
}

function ensureLanguageOption(selectEl, lang) {
  if (!selectEl || !lang) return;
  const exists = Array.from(selectEl.options || []).some(
    (opt) => opt.value === lang
  );
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = languageLabel(lang);
    selectEl.appendChild(opt);
  }
}

function boardOwnedByCurrent(b) {
  if (!b) return false;
  // match by username
  if (
    currentAdminUsername &&
    (b.ownerAdminUsername === currentAdminUsername ||
      b.owner_admin_username === currentAdminUsername ||
      b.ownerUsername === currentAdminUsername ||
      b.owner_username === currentAdminUsername)
  ) {
    return true;
  }
  // match by telegram id
  if (
    currentAdminTelegramId &&
    (String(b.ownerTelegramId || "") === String(currentAdminTelegramId) ||
      String(b.owner_telegram_id || "") === String(currentAdminTelegramId))
  ) {
    return true;
  }
  // fallback: allow legacy boards without owner info
  return (
    !b.ownerAdminUsername &&
    !b.owner_admin_username &&
    !b.ownerTelegramId &&
    !b.owner_telegram_id
  );
}

async function loadAdminInfo() {
  const nameEl = document.getElementById("admin-username");
  const tgEl = document.getElementById("admin-tg-status");
  const authStatus = document.getElementById("admin-auth-status");
  const langSelect = document.getElementById("admin-language");
  nameEl.textContent = "Loading…";
  tgEl.textContent = "Loading…";

  try {
    const data = await apiJson("/api/admin/me");
    const admin = data.admin;
    if (!admin) {
      nameEl.textContent = t("unknown");
      tgEl.textContent = t("unknown");
      if (authStatus) authStatus.style.display = "none";
      return;
    }

    nameEl.textContent = admin.username || "(no name)";
    currentAdminId = admin.id || admin._id || null;
    currentAdminUsername = admin.username || "";
    currentAdminTelegramId = admin.telegramId || null;

    if (langSelect && admin.language) {
      ensureLanguageOption(langSelect, admin.language);
      langSelect.value = admin.language;
    }

    if (authStatus) {
      authStatus.style.display = "block";
      authStatus.innerHTML =
        t("signedInAs") +
        " <b>" +
        (admin.username || "(no name)") +
        '</b><button type="button" id="admin-logout-btn">' +
        t("logout") +
        "</button>";
      const logoutBtn = document.getElementById("admin-logout-btn");
      if (logoutBtn) {
        logoutBtn.onclick = async () => {
          try {
            await fetch("/api/logout", { method: "POST" });
            window.location.reload();
          } catch (e) {
            console.error("Logout error:", e);
          }
        };
      }
    }

    if (admin.telegramId) {
      tgEl.innerHTML =
        '<span class="pill green">' +
        t("linked") +
        "</span> " +
        (admin.telegramUsername
          ? "(@" + admin.telegramUsername + ", id " + admin.telegramId + ")"
          : "(id " + admin.telegramId + ")");
    } else {
      tgEl.innerHTML =
        '<span class="pill gray">' +
        t("notLinked") +
        "</span> " +
        t("linkInstruction");
    }
  } catch (e) {
    console.error(e);
    nameEl.textContent = t("statusErrorPrefix");
    tgEl.textContent = t("statusErrorPrefix") + " " + e.message;
    if (authStatus) authStatus.style.display = "none";
  }
}

async function loadBotConfig() {
  const status = document.getElementById("status-bot");
  const tokenInput = document.getElementById("bot-token");
  const siteInput = document.getElementById("site-base-url");

  status.textContent = t("loadingGeneric");
  try {
    const cfg = await apiJson("/api/admin/config");
    if (cfg.botToken) {
      tokenInput.value = "";
      status.textContent = t("boardCreated");
      status.style.color = "lightgreen";
    } else {
      status.textContent = t("boardsEmpty");
      status.style.color = "#9ca3af";
    }

    siteBaseUrl = cfg.siteBaseUrl || "";
    siteInput.value = siteBaseUrl;

    if (!siteBaseUrl) {
      siteBaseUrl = window.location.origin;
    }
  } catch (e) {
    status.textContent = t("statusErrorPrefix") + " " + e.message;
    status.style.color = "red";
  }
}

async function saveBotToken() {
  const tokenInput = document.getElementById("bot-token");
  const siteInput = document.getElementById("site-base-url");
  const status = document.getElementById("status-bot");

  const token = tokenInput.value.trim();
  const site = siteInput.value.trim();

  status.textContent = t("saving");
  status.style.color = "#9ca3af";

  try {
    await apiJson("/api/admin/config", "POST", {
      botToken: token || undefined,
      siteBaseUrl: site || "",
    });
    status.textContent = t("saveSettings");
    status.style.color = "lightgreen";

    siteBaseUrl = site || window.location.origin;
    tokenInput.value = "";
  } catch (e) {
    status.textContent = t("statusErrorPrefix") + " " + e.message;
    status.style.color = "red";
  }
}

async function generateLinkToken() {
  const status = document.getElementById("status-link");
  status.textContent = t("generatingToken");
  status.style.color = "#9ca3af";
  try {
    const data = await apiJson("/api/admin/link-token", "POST", {});
    status.innerHTML =
      t("tokenLabel") + ' <code id="link-token">' + data.token + "</code>" +
      "<br>" + t("fullCommandLabel") + ' <code id="link-full">/link ' + data.token + "</code>" +
      '<br><button class="btn primary" id="btn-copy-link">' + t("copy") + "</button>";

    status.style.color = "lightgreen";

    const copyBtn = document.getElementById("btn-copy-link");
    const tokenEl = document.getElementById("link-token");
    if (copyBtn && tokenEl) {
      copyBtn.addEventListener("click", async () => {
        try {
          const fullCmd = document.getElementById("link-full").textContent;
          await navigator.clipboard.writeText(fullCmd);
          copyBtn.textContent = t("copied");
          setTimeout(() => (copyBtn.textContent = t("copy")), 1500);
        } catch (e) {
          const range = document.createRange();
          range.selectNodeContents(tokenEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    }
  } catch (e) {
    status.textContent = t("statusErrorPrefix") + " " + e.message;
    status.style.color = "red";
  }
}

let cachedBoards = [];

async function loadBoards() {
  const status = document.getElementById("boards-status");
  const list = document.getElementById("boards-list");
  const inviteSelect = document.getElementById("invite-board");

  status.textContent = t("boardsLoading");
  list.innerHTML = "";
  inviteSelect.innerHTML = "";

  try {
    const data = await apiJson("/api/admin/boards");
    const boards = (data.boards || []).filter(boardOwnedByCurrent);
    cachedBoards = boards;

    if (!boards.length) {
      status.textContent = t("boardsEmpty");
      status.style.color = "#9ca3af";
      return;
    }

    status.textContent = "";
    status.style.color = "#9ca3af";

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.padding = "0";
    ul.style.margin = "0";

    boards.forEach((b) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.justifyContent = "space-between";
      li.style.padding = "4px 0";

      const left = document.createElement("div");
      left.innerHTML =
        "<b>" +
        b.title +
        "</b> <span class='small'>(id: " +
        b.id +
        ")</span><br>" +
        "<span class='small'>" +
        t("ownerLabel") +
        " " +
        (b.ownerAdminUsername || t("unknown")) +
        (b.ownerTelegramId ? ", tgId " + b.ownerTelegramId : "") +
        "</span> " +
        (b.isPublic
          ? "<span class='pill green'>public</span>"
          : "<span class='pill gray'>private</span>");

    const btnDel = document.createElement("button");
    btnDel.className = "btn danger";
    btnDel.textContent = t("delete");
      btnDel.addEventListener("click", async () => {
        if (!confirm(t("deleteBoardConfirm").replace("{title}", b.title))) return;
        try {
          await apiJson(
            "/api/admin/boards/" + encodeURIComponent(b.id),
            "DELETE"
          );
          await loadBoards();
          await loadUsersAccess();
        } catch (e) {
          alert(t("deleteBoardError").replace("{message}", e.message));
        }
      });

      li.appendChild(left);
      li.appendChild(btnDel);
      ul.appendChild(li);
    });

    list.appendChild(ul);

    boards.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.title + " (" + b.id + ")";
      inviteSelect.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    status.textContent = t("statusErrorPrefix") + " " + e.message;
    status.style.color = "red";
  }
}

async function createBoard() {
  const titleInput = document.getElementById("board-title");
  const publicCheckbox = document.getElementById("board-public");
  const status = document.getElementById("boards-status");

  const title = titleInput.value.trim();
  if (!title) {
    status.textContent = t("missingTitle");
    status.style.color = "orange";
    return;
  }

  status.textContent = t("creatingBoard");
  status.style.color = "#9ca3af";

  try {
    await apiJson("/api/admin/boards", "POST", {
      title,
      isPublic: publicCheckbox.checked,
    });
    titleInput.value = "";
    publicCheckbox.checked = false;
    status.textContent = t("boardCreated");
    status.style.color = "lightgreen";
    await loadBoards();
    await loadUsersAccess();
  } catch (e) {
    status.textContent = t("boardCreateError").replace("{message}", e.message);
    status.style.color = "red";
  }
}

async function createInvite() {
  const boardSelect = document.getElementById("invite-board");
  const roleSelect = document.getElementById("invite-role");
  const out = document.getElementById("invite-output");

  const boardId = boardSelect.value;
  const role = roleSelect.value;

  if (!boardId) {
    out.textContent = t("mustSelectBoard");
    out.style.color = "orange";
    return;
  }

  out.textContent = t("creatingInvite");
  out.style.color = "#9ca3af";

  try {
    const data = await apiJson("/api/admin/invites", "POST", {
      boardId,
      role,
    });

    const base =
      (siteBaseUrl && siteBaseUrl.trim()) || window.location.origin;
    const fullUrl =
      base.replace(/\/$/, "") + (data.inviteUrl || "/invite/" + data.token);

    out.innerHTML =
      t("inviteCreated") + "<br>" +
      t("inviteToken") + ` <code>${data.token}</code><br>` +
      t("inviteCommand") + ` <code>/link ${data.token}</code><br>` +
      t("inviteRoleText" + (role === "admin" ? "Admin" : "User")) +
      "<br>" +
      t("inviteLinkNote");
    out.style.color = "lightgreen";
  } catch (e) {
    out.textContent = t("inviteError").replace("{message}", e.message);
    out.style.color = "red";
  }
}

async function loadUsersAccess() {
  const out = document.getElementById("users-access-output");
  out.textContent = "Loading...";
  try {
    const data = await apiJson("/api/admin/users");
    const users = data.users || [];
    const boards = data.boards || [];

    const ownBoards = boards.filter(boardOwnedByCurrent);

    if (!users.length) {
      out.textContent = t("noUsers");
      return;
    }

    if (!ownBoards.length) {
      out.textContent = t("noBoardsManage");
      return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    headRow.innerHTML =
      "<th>" + t("userHeader") + "</th><th>" + t("roleHeader") + "</th>" +
      ownBoards.map((b) => `<th>${b.title}</th>`).join("");
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    users.forEach((u) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = u.username;
      tr.appendChild(nameTd);

      const roleTd = document.createElement("td");
      roleTd.textContent =
        (u.role || "user") === "admin" ? "admin" : "user";
      tr.appendChild(roleTd);

      ownBoards.forEach((b) => {
        const td = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = u.boards.includes(b.id);

        checkbox.addEventListener("change", async () => {
          try {
            const newBoards = new Set(u.boards || []);
            if (checkbox.checked) {
              newBoards.add(b.id);
            } else {
              newBoards.delete(b.id);
            }
            const arrBoards = Array.from(newBoards);
            u.boards = arrBoards;

            await apiJson(
              "/api/admin/users/" + encodeURIComponent(u.id) + "/boards",
              "POST",
              { boards: arrBoards }
            );
          } catch (err) {
            alert(t("accessChangeError").replace("{message}", err.message));
          }
        });

        td.appendChild(checkbox);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    out.innerHTML = "";
    out.appendChild(table);
  } catch (e) {
    out.textContent = "Error: " + e.message;
  }
}

async function saveAdminLanguage() {
  const langSelect = document.getElementById("admin-language");
  const status = document.getElementById("status-admin-language");
  const language = langSelect.value;

  status.textContent = t("saving");
  status.style.color = "var(--text)";

  try {
    await apiJson("/api/admin/language", "POST", { language });
    status.textContent = t("languageSaved");
    status.style.color = "lightgreen";
  } catch (e) {
    status.textContent = t("languageSaveError").replace("{message}", e.message);
    status.style.color = "red";
  }
}

async function changeAdminPassword() {
  const oldInput = document.getElementById("pwd-old");
  const newInput = document.getElementById("pwd-new");
  const new2Input = document.getElementById("pwd-new2");
  const status = document.getElementById("status-password");

  const oldPassword = (oldInput.value || "").trim();
  const newPassword = (newInput.value || "").trim();
  const newPassword2 = (new2Input.value || "").trim();

  status.style.color = "#9ca3af";

  if (!oldPassword || !newPassword || !newPassword2) {
    status.textContent = t("fillAllPasswords");
    status.style.color = "orange";
    return;
  }

  if (newPassword !== newPassword2) {
    status.textContent = t("passwordsMismatch");
    status.style.color = "orange";
    return;
  }

  if (newPassword.length < 6) {
    status.textContent = t("passwordTooShort");
    status.style.color = "orange";
    return;
  }

  status.textContent = t("changingPassword");
  try {
    await apiJson("/api/admin/password", "POST", {
      oldPassword,
      newPassword,
    });
    status.textContent = t("passwordChanged");
    status.style.color = "lightgreen";

    oldInput.value = "";
    newInput.value = "";
    new2Input.value = "";
  } catch (e) {
    status.textContent = t("passwordChangeError").replace("{message}", e.message);
    status.style.color = "red";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  if (typeof updateAllTranslations === "function") {
    updateAllTranslations();
  }

  const uiLangSelect = document.getElementById("language-select");
  const adminLangSelect = document.getElementById("admin-language");
  populateLanguageSelect(adminLangSelect);

  if (uiLangSelect) {
    uiLangSelect.value =
      (typeof getCurrentLanguage === "function" && getCurrentLanguage()) ||
      (typeof currentLanguage !== "undefined" ? currentLanguage : "en");
    uiLangSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
      updateAllTranslations();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === "language" && event.newValue && uiLangSelect) {
        uiLangSelect.value = event.newValue;
        updateAllTranslations();
      }
    });
  }

  document
    .getElementById("btn-save-bot-token")
    .addEventListener("click", saveBotToken);
  document
    .getElementById("btn-save-admin-language")
    .addEventListener("click", saveAdminLanguage);
  document
    .getElementById("btn-generate-link-token")
    .addEventListener("click", generateLinkToken);
  document
    .getElementById("btn-create-board")
    .addEventListener("click", createBoard);
  document
    .getElementById("btn-create-invite")
    .addEventListener("click", createInvite);

  const pwdBtn = document.getElementById("btn-change-password");
  if (pwdBtn) {
    pwdBtn.addEventListener("click", changeAdminPassword);
  }

  (async () => {
    await loadAdminInfo();
    await loadBotConfig();
    await loadBoards();
    await loadUsersAccess();
  })();
});
