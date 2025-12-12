let chart;
let rawData = [];

let availableBoards = [];
let selectedBoardIds = [];
let currentRange = "1";

const DAY_MS = 24 * 60 * 60 * 1000;
const COLORS = ["#60a5fa", "#f97316", "#22c55e", "#ec4899", "#a855f7", "#eab308"];
const RANGE_COOKIE_NAME = "mood_range";
const BOARDS_COOKIE_NAME = "mood_boards";
const ALLOWED_RANGES = ["1", "7", "30", "90", "365", "all"];

let currentUser = null;

async function loadCurrentUser() {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    currentUser = data.user;
  } catch (e) {
    currentUser = null;
  }
  updateAuthUI();
}

function updateAuthUI() {
  const form = document.getElementById("auth-form");
  const userBox = document.getElementById("auth-user");
  const errorBox = document.getElementById("auth-error");
  const settingsBtn = document.getElementById("settings-btn");

  if (!form || !userBox || !errorBox) return;

  errorBox.textContent = "";

  if (currentUser) {
    form.style.display = "none";
    userBox.style.display = "block";
    if (settingsBtn) settingsBtn.style.display = "inline-flex";
    userBox.innerHTML =
      t("signedInAs") + " <b>" +
      currentUser.username +
      '</b><button type="button" id="auth-logout-btn">' + t("logout") + "</button>";

    const logoutBtn = document.getElementById("auth-logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        try {
          await fetch("/api/logout", { method: "POST" });
        } catch (e) {}
        window.location.reload();
      };
    }
  } else {
    form.style.display = "flex";
    userBox.style.display = "none";
    if (settingsBtn) settingsBtn.style.display = "none";
  }
}

async function handleLogin() {
  const usernameEl = document.getElementById("auth-username");
  const passwordEl = document.getElementById("auth-password");
  const errorBox = document.getElementById("auth-error");

  const username = usernameEl.value.trim();
  const password = passwordEl.value;

  errorBox.textContent = "";

  if (!username || !password) {
    errorBox.textContent = t("enterCredentials");
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      let msg = t("invalidCredentials");
      try {
        const j = await res.json();
        if (j.error) msg = j.error;
      } catch {}
      errorBox.textContent = msg;
      return;
    }
    window.location.reload();
  } catch (e) {
    errorBox.textContent = t("error") + " " + e.message;
  }
}

function buildBoardsQueryParam() {
  return "?boards=" + encodeURIComponent((selectedBoardIds || []).join(","));
}

async function loadData() {
  const q = buildBoardsQueryParam();
  const res = await fetch("/api/moods" + q);
  return res.json();
}

function renderEntries(titleText, entries) {
  const box = document.getElementById("day-entries");
  const title = document.getElementById("day-title");
  title.textContent = t("entriesFor") + ` ${titleText}`;
  box.innerHTML = "";

  if (!entries.length) {
    box.textContent = t("noEntries");
    return;
  }

  entries.forEach((e) => {
    const div = document.createElement("div");
    div.className = "entry";

    let mediaHtml = "";
    if (e.meta) {
      if (e.meta.photo && e.meta.photo.file_id) {
        const src = `/api/media/photo/${encodeURIComponent(
          e.meta.photo.file_id
        )}`;
        mediaHtml += `<div class="entry-media"><img src="${src}" alt="photo" /></div>`;
      }
      if (e.meta.animation && e.meta.animation.file_id) {
        const src = `/api/media/animation/${encodeURIComponent(
          e.meta.animation.file_id
        )}`;
        mediaHtml += `<div class="entry-media"><video src="${src}" autoplay loop muted playsinline></video></div>`;
      }
      if (e.meta.video && e.meta.video.file_id) {
        const src = `/api/media/video/${encodeURIComponent(
          e.meta.video.file_id
        )}`;
        mediaHtml += `<div class="entry-media"><video src="${src}" controls playsinline></video></div>`;
      }
      if (e.meta.sticker && e.meta.sticker.file_id) {
        const src = `/api/media/sticker/${encodeURIComponent(
          e.meta.sticker.file_id
        )}`;
        mediaHtml += `<div class="entry-media"><img src="${src}" alt="sticker" class="sticker"/></div>`;
      }
    }

    let circleColor = "#94a3b8";
    if (e.value <= -20) {
      circleColor = "#ef4444";
    } else if (e.value >= 21) {
      circleColor = "#22c55e";
    }

    let titleInner = "";
    let body = "";
    if (e.note) {
      const lines = e.note.split("\n");
      const titleProvided = e.meta && typeof e.meta.titleProvided !== "undefined" ? e.meta.titleProvided : true;
      if (titleProvided) {
        titleInner = lines[0] || "";
        if (lines.length > 1) {
          body = lines.slice(1).join("\n");
        }
      } else {
        body = e.note;
      }
    }

    const authorName = getAuthorName(
      e.meta || null,
      e.meta && e.meta.chatId ? String(e.meta.chatId) : null
    );

    div.innerHTML = `
      <div style="display: flex; gap: 12px; margin-bottom: 8px; align-items:flex-start;">
        <div style="
          width: 24px;
          height: 24px;
          min-width: 24px;
          border-radius: 50%;
          background: ${circleColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">${e.value}</div>
        <div style="flex: 1;">
          ${titleInner ? `<div class="entry-title">${titleInner}</div>` : ""}
          ${body ? `<div class="entry-body">${body}</div>` : ""}
          ${mediaHtml}
          <div class="entry-meta">
            <div class="entry-author">${authorName}</div>
            <div class="entry-date">${formatFullDateTime(e.timestamp)}</div>
          </div>
        </div>
      </div>
    `;
    box.appendChild(div);
  });
}

function renderDayEntries(date, entries) {
  const d = new Date(date + "T00:00:00");
  const DD = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const YYYY = d.getFullYear();
  renderEntries(`${DD}.${MM}.${YYYY}`, entries);
}

function alignToMidnight(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function loadBoardsForViewer() {
  try {
    const res = await fetch("/api/boards");
    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error("Failed to parse /api/boards response", parseErr);
      data = null;
    }

    availableBoards = Array.isArray(data?.boards) ? data.boards : [];

    const saved = getCookie(BOARDS_COOKIE_NAME);
    const validIds = new Set((availableBoards || []).map((b) => b.id));
    const savedIds = (saved || "")
      .split(",")
      .map((s) => s.trim())
      .filter((id) => id && validIds.has(id));

    selectedBoardIds = savedIds.length ? savedIds : availableBoards.map((b) => b.id);
    setCookie(BOARDS_COOKIE_NAME, selectedBoardIds.join(","));

    renderBoardsFilter();
  } catch (e) {
    console.error("Failed to load boards", e);
    availableBoards = [];
    selectedBoardIds = [];
    const el = document.getElementById("boards-filter");
    if (el) {
      el.textContent = t("noBoardsManage") || "Failed to load boards.";
    }
  }
}

function renderBoardsFilter() {
  const container = document.getElementById("boards-filter");
  if (!container) return;

  if (!availableBoards.length) {
    container.textContent = t("noBoardsManage") || "No available boards.";
    return;
  }

  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "boards-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>${t("boardAuthor")}</th>
        <th>${t("boardTitle")}</th>
        <th>${t("boardShow")}</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  availableBoards.forEach((b) => {
    const tr = document.createElement("tr");

    const authorCell = document.createElement("td");
    authorCell.textContent =
      b.ownerAdminUsername || (b.ownerTelegramId ? `tg:${b.ownerTelegramId}` : t("unknown"));

    const titleCell = document.createElement("td");
    titleCell.textContent = b.title;

    const toggleCell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = selectedBoardIds.includes(b.id);
    input.addEventListener("change", async () => {
      if (input.checked) {
        if (!selectedBoardIds.includes(b.id)) {
          selectedBoardIds.push(b.id);
        }
      } else {
        selectedBoardIds = selectedBoardIds.filter((id) => id !== b.id);
      }
      setCookie(BOARDS_COOKIE_NAME, selectedBoardIds.join(","));
      rawData = await loadData();
      updateChart(currentRange);
    });
    toggleCell.appendChild(input);

    tr.appendChild(authorCell);
    tr.appendChild(titleCell);
    tr.appendChild(toggleCell);
    tbody.appendChild(tr);
  });

  container.appendChild(table);
}

function buildChartDatasets(rangeValue) {
  const now = Date.now();

  if (!rawData.length) {
    const toTime = now;
    const fromTime = alignToMidnight(now - 7 * DAY_MS);
    return { datasets: [], unit: "day", fromTime, toTime };
  }

  let filtered = rawData.slice();
  let rangeDays;
  let fromTime;
  const toTime = now;

  if (rangeValue === "all") {
    filtered = rawData.filter(
      (e) => new Date(e.timestamp).getTime() <= now
    );
    if (!filtered.length) {
      const ft = alignToMidnight(now - 7 * DAY_MS);
      return { datasets: [], unit: "day", fromTime: ft, toTime: now };
    }
    const first = new Date(filtered[0].timestamp).getTime();
    rangeDays = Math.max(1, Math.round((now - first) / DAY_MS));
    fromTime = alignToMidnight(first);
  } else {
    rangeDays = Number(rangeValue);
    fromTime = alignToMidnight(now - rangeDays * DAY_MS);
    filtered = rawData.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= fromTime && t <= now;
    });
  }

  if (!filtered.length) {
    return { datasets: [], unit: "day", fromTime, toTime };
  }

  const byUser = {};
  filtered.forEach((e) => {
    const authorId =
      e.meta && e.meta.chatId ? String(e.meta.chatId) : "unknown";

    if (!byUser[authorId]) {
      byUser[authorId] = {
        raw: [],
        meta: e.meta || {},
      };
    }
    byUser[authorId].raw.push(e);
  });

  let unit = "day";
  if (rangeValue === "1") unit = "hour";
  else if (["all", "365"].includes(rangeValue)) unit = "month";
  else unit = "day";

  const datasets = [];
  const authorIds = Object.keys(byUser);

  authorIds.forEach((authorId, idx) => {
    const group = byUser[authorId];
    let points = [];

    if (rangeValue === "all" || rangeValue === "365") {
      const map = {};
      group.raw.forEach((e) => {
        const key = e.timestamp.slice(0, 7); // YYYY-MM
        if (!map[key]) {
          map[key] = { sum: 0, count: 0 };
        }
        map[key].sum += e.value;
        map[key].count += 1;
      });

      const keys = Object.keys(map).sort();
      points = keys.map((key) => {
        const info = map[key];
        const avg = info.sum / info.count;
        const x = new Date(key + "-01T00:00:00Z").getTime();
        return { x, y: avg, month: key };
      });
    } else if (["7", "30", "90"].includes(rangeValue)) {
      const map = {};
      group.raw.forEach((e) => {
        const key = dateKey(e.timestamp);
        if (!map[key]) {
          map[key] = { sum: 0, count: 0 };
        }
        map[key].sum += e.value;
        map[key].count += 1;
      });

      const keys = Object.keys(map).sort();
      points = keys.map((key) => {
        const info = map[key];
        const avg = info.sum / info.count;
        const x = new Date(key + "T00:00:00Z").getTime();
        return { x, y: avg, day: key };
      });
    } else {
      points = group.raw.map((e) => ({
        x: new Date(e.timestamp).getTime(),
        y: e.value,
        day: dateKey(e.timestamp),
        rawTs: e.timestamp,
      }));
    }

    const m = group.meta;
    const label = getAuthorName(m || null, authorId);

    datasets.push({
      label,
      data: points,
      borderWidth: 2,
      pointRadius: 3,
      tension: 0,
      borderColor: COLORS[idx % COLORS.length],
      fill: false,
    });
  });

  return { datasets, unit, fromTime, toTime };
}

const moodFillPlugin = {
  id: "moodFill",
  beforeDatasetsDraw(chart) {
    const { ctx, scales } = chart;
    const yAxis = scales.y;
    const yZeroPix = yAxis.getPixelForValue(0);

    ctx.save();

    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di);
      if (!meta || !meta.data || meta.data.length < 2) return;

      const data = dataset.data;

      for (let i = 0; i < meta.data.length - 1; i++) {
        const p1 = meta.data[i];
        const p2 = meta.data[i + 1];
        const d1 = data[i].y;
        const d2 = data[i + 1].y;

        if (p1.skip || p2.skip || d1 == null || d2 == null) continue;

        const x1 = p1.x;
        const y1 = p1.y;
        const x2 = p2.x;
        const y2 = p2.y;

        if (d1 === 0 && d2 === 0) continue;

        const fillSegment = (xStart, yStart, xEnd, yEnd, color) => {
          ctx.beginPath();
          ctx.moveTo(xStart, yStart);
          ctx.lineTo(xEnd, yEnd);
          ctx.lineTo(xEnd, yZeroPix);
          ctx.lineTo(xStart, yZeroPix);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.25;
          ctx.fill();
          ctx.globalAlpha = 1;
        };

        if (d1 >= 0 && d2 >= 0) {
          fillSegment(x1, y1, x2, y2, "rgba(34,197,94,1)");
        } else if (d1 <= 0 && d2 <= 0) {
          fillSegment(x1, y1, x2, y2, "rgba(248,113,113,1)");
        } else {
          const t = d1 / (d1 - d2);
          const xZero = x1 + t * (x2 - x1);

          if (d1 > 0 && d2 < 0) {
            fillSegment(x1, y1, xZero, yZeroPix, "rgba(34,197,94,1)");
            fillSegment(
              xZero,
              yZeroPix,
              x2,
              y2,
              "rgba(248,113,113,1)"
            );
          } else if (d1 < 0 && d2 > 0) {
            fillSegment(x1, y1, xZero, yZeroPix, "rgba(248,113,113,1)");
            fillSegment(xZero, yZeroPix, x2, y2, "rgba(34,197,94,1)");
          }
        }
      }
    });

    ctx.restore();
  },
};

async function renderChart(initialRange = "7") {
  currentRange = initialRange;
  rawData = await loadData();

  const rangeSelect = document.getElementById("range-select");
  rangeSelect.value = initialRange;

  const ctx = document.getElementById("chart");
  const { datasets, unit, fromTime, toTime } =
    buildChartDatasets(initialRange);

  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets,
    },
    options: {
      parsing: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: unit,
          },
          ticks: {
            callback: (value, index, ticks) => {
              const v = ticks[index].value;
              return formatShortDate(v);
            },
          },
          grid: {
            display: true,
          },
          min: fromTime,
          max: toTime,
        },
        y: {
          min: -100,
          max: 100,
          grid: {
            color: (ctxGrid) => {
              const isDark = document.body.dataset.theme !== "light";
              const isZero = ctxGrid.tick && ctxGrid.tick.value === 0;
              if (isZero) return isDark ? "#e5e7eb55" : "#1f293733";
              return isDark ? "#ffffff14" : "#1f293712";
            },
          },
        },
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
            title: () => "",
          },
        },
      },
      interaction: {
        mode: "nearest",
        intersect: true,
      },
      onClick: async (evt) => {
        const pointsAtClick = chart.getElementsAtEventForMode(
          evt,
          "nearest",
          { intersect: true },
          true
        );
        if (!pointsAtClick.length) return;

        const first = pointsAtClick[0];
        const dsIndex = first.datasetIndex;
        const ptIndex = first.index;
        const point = chart.data.datasets[dsIndex].data[ptIndex];

        let entries = [];
        let titleLabel = "";
        const rangeVal = currentRange;

        if (rangeVal === "1") {
          const targetTs = new Date(point.x).getTime();
          entries = rawData.filter((e) => new Date(e.timestamp).getTime() === targetTs);
          titleLabel = formatFullDateTime(entries[0]?.timestamp || new Date(point.x).toISOString());
        } else if (["7", "30", "90"].includes(rangeVal)) {
          const key = point.day || dateKey(new Date(point.x).toISOString());
          entries = rawData.filter((e) => dateKey(e.timestamp) === key);
          const d = new Date(key + "T00:00:00");
          const DD = String(d.getDate()).padStart(2, "0");
          const MM = String(d.getMonth() + 1).padStart(2, "0");
          const YYYY = d.getFullYear();
          titleLabel = `${DD}.${MM}.${YYYY}`;
        } else if (["365", "all"].includes(rangeVal)) {
          const mKey = point.month || new Date(point.x).toISOString().slice(0, 7);
          entries = rawData.filter((e) => e.timestamp.startsWith(mKey));
          const [year, month] = mKey.split("-");
          titleLabel = `${month}.${year}`;
        } else {
          const key = point.day || dateKey(new Date(point.x).toISOString());
          entries = rawData.filter((e) => dateKey(e.timestamp) === key);
          titleLabel = key;
        }

        renderEntries(titleLabel, entries);
      },
    },
    plugins: [moodFillPlugin],
  });

  rangeSelect.addEventListener("change", () => {
    currentRange = rangeSelect.value;
    setCookie(RANGE_COOKIE_NAME, currentRange);
    updateChart(currentRange);
  });
}

function updateChart(rangeValue) {
  if (!chart) return;
  const { datasets, unit, fromTime, toTime } =
    buildChartDatasets(rangeValue);

  chart.data.datasets = datasets;
  chart.options.scales.x.time.unit = unit;
  chart.options.scales.x.min = fromTime;
  chart.options.scales.x.max = toTime;

  chart.update();
}

function initPanelState() {
  const panel = document.getElementById("left-panel");
  const pinBtn = document.getElementById("pin-btn");
  const pinIcon = pinBtn ? pinBtn.querySelector("img") : null;
  const toggleBtn = document.getElementById("boards-toggle");
  const closeBtn = document.getElementById("panel-close-btn");
  const hoverZone = document.querySelector(".left-hover-zone");

  const mqDesktop = window.matchMedia("(min-width: 769px)");
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  const savedPinned = localStorage.getItem("panelPinned");
  let pinned = savedPinned === "true";
  if (savedPinned === null && mqDesktop.matches) pinned = true;

  const updatePinIcon = () => {
    if (!pinIcon) return;
    const isPinned = document.body.classList.contains("panel-pinned");
    pinIcon.src = isPinned ? "/icons/unpin.svg" : "/icons/pin.svg";
    pinBtn.title = isPinned ? "Открепить панель" : "Закрепить панель";
  };

  document.body.classList.toggle("panel-pinned", pinned);
  panel.classList.toggle("open", pinned);
  updatePinIcon();

  if (pinBtn) {
    pinBtn.addEventListener("click", () => {
      const isPinned = document.body.classList.contains("panel-pinned");
      const nowPinned = !isPinned;
      document.body.classList.toggle("panel-pinned", nowPinned);
      localStorage.setItem("panelPinned", String(nowPinned));
      updatePinIcon();
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      panel.classList.toggle("open");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const wasPinned = document.body.classList.contains("panel-pinned");
      document.body.classList.remove("panel-pinned");
      panel.classList.remove("open");
      if (wasPinned) {
        localStorage.setItem("panelPinned", "false");
        updatePinIcon();
      }
    });
  }

  if (hoverZone && panel) {
    hoverZone.addEventListener("mouseenter", () => {
      if (isMobile()) return;
      if (!document.body.classList.contains("panel-pinned")) {
        panel.classList.add("open");
      }
    });
  }

  panel.addEventListener("mouseleave", () => {
    if (isMobile()) return;
    if (!document.body.classList.contains("panel-pinned")) {
      panel.classList.remove("open");
    }
  });

  mqDesktop.addEventListener("change", (e) => {
    const savedPinnedNow = localStorage.getItem("panelPinned");
    const pinnedNow = savedPinnedNow === "true";
    document.body.classList.toggle("panel-pinned", pinnedNow || e.matches);
    panel.classList.toggle(
      "open",
      document.body.classList.contains("panel-pinned")
    );
    updatePinIcon();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  updateAllTranslations();
  initPanelState();

  const languageSelect = document.getElementById("language-select");
  if (languageSelect) {
    languageSelect.value = currentLanguage;
    languageSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
      updateAllTranslations();
    });
  }

  const loginBtn = document.getElementById("auth-login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", handleLogin);
  }

  (async () => {
    await loadCurrentUser();
    await loadBoardsForViewer();

    let savedRange = getCookie(RANGE_COOKIE_NAME) || "1";
    if (!ALLOWED_RANGES.includes(savedRange)) {
      savedRange = "1";
    }

    await renderChart(savedRange);
  })();
});
