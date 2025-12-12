function applyTheme(theme) {
  document.body.dataset.theme = theme;

  const icon = document.getElementById("theme-icon");
  if (!icon) return;

  if (theme === "dark") {
    icon.src = "/icons/light_theme.svg";
  } else {
    icon.src = "/icons/dark_theme.svg";
  }
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const theme = saved === "light" || saved === "dark" ? saved : "dark";
  applyTheme(theme);

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const current =
        document.body.dataset.theme === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      applyTheme(next);
    });
  }
}

window.applyTheme = applyTheme;
window.initTheme = initTheme;
