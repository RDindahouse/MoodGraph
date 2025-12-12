(function () {
  function setCookie(name, value, days = 180) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  }

  function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const c of cookies) {
      const [k, ...rest] = c.trim().split("=");
      if (k === name) return decodeURIComponent(rest.join("="));
    }
    return null;
  }

  function formatFullDateTime(iso) {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const DD = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const YYYY = d.getFullYear();
    return `${hh}:${mm} ${DD}.${MM}.${YYYY}`;
  }

  function formatShortDate(value) {
    const d = new Date(value);
    const DD = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    return `${DD}.${MM}`;
  }

  function dateKey(iso) {
    return iso.slice(0, 10); // YYYY-MM-DD
  }

  function getAuthorName(meta, fallbackId) {
    if (meta) {
      if (meta.username) return meta.username;
      const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim();
      if (fullName) return fullName;
    }
    if (fallbackId) return `user ${fallbackId}`;
    const unknown = typeof t === "function" ? t("unknown") : "unknown";
    return unknown;
  }

  window.setCookie = setCookie;
  window.getCookie = getCookie;
  window.formatFullDateTime = formatFullDateTime;
  window.formatShortDate = formatShortDate;
  window.dateKey = dateKey;
  window.getAuthorName = getAuthorName;
})();
