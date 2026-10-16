/**
 * Popup script.
 * Manages the UI for toggling dark mode per-site.
 */

const hostnameEl  = document.getElementById("current-hostname");
const toggleEl    = document.getElementById("site-toggle");
const toggleLabel = document.getElementById("toggle-label");
const tempBtnEl   = document.getElementById("temp-btn");
const sitesList   = document.getElementById("sites-list");
const addInput    = document.getElementById("add-input");
const addBtn      = document.getElementById("add-btn");

let currentHostname = "";

// ── Helpers ──────────────────────────────────────────────────────────────────

function normaliseHostname(raw) {
  const trimmed = raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "")   // strip protocol
    .replace(/\/.*$/, "");          // strip path
  return trimmed;
}

function renderSitesList(sites, tempSites) {
  sitesList.innerHTML = "";

  // Permanent sites first, then temp-only sites
  const combined = [
    ...sites.map((s) => ({ hostname: s, temp: false })),
    ...tempSites.filter((s) => !sites.includes(s)).map((s) => ({ hostname: s, temp: true })),
  ];

  if (combined.length === 0) return;

  for (const { hostname: site, temp } of combined) {
    const item = document.createElement("div");
    item.className = "site-item";

    const host = document.createElement("span");
    host.className =
      "site-item-host" +
      (site === currentHostname ? " active" : "") +
      (temp ? " temp" : "");
    host.textContent = site;

    const actions = document.createElement("div");
    actions.className = "site-item-actions";

    if (temp) {
      const badge = document.createElement("span");
      badge.className = "temp-badge";
      badge.textContent = "TEMP";
      actions.appendChild(badge);
    }

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.title = `Remove ${site}`;
    btn.textContent = "×";
    btn.addEventListener("click", () =>
      temp ? removeTempSite(site) : removeSite(site)
    );
    actions.appendChild(btn);

    item.appendChild(host);
    item.appendChild(actions);
    sitesList.appendChild(item);
  }
}

function setToggleUI(enabled) {
  toggleEl.checked = enabled;
  toggleLabel.textContent = enabled ? "On" : "Off";
}

function setTempUI(enabled) {
  tempBtnEl.textContent = enabled ? "Disable session" : "Enable for session";
  tempBtnEl.classList.toggle("active", enabled);
}

// ── Storage ops ──────────────────────────────────────────────────────────────

function toggleCurrentSite(enabled) {
  if (!currentHostname) return;
  chrome.runtime.sendMessage(
    { type: "TOGGLE_SITE", hostname: currentHostname, enabled },
    (response) => {
      if (!response) return;
      renderSitesList(response.sites, response.tempSites || []);
      setToggleUI(enabled);
    }
  );
}

function toggleTempSite(enabled) {
  if (!currentHostname) return;
  chrome.runtime.sendMessage(
    { type: "TOGGLE_TEMP_SITE", hostname: currentHostname, enabled },
    (response) => {
      if (!response) return;
      renderSitesList(response.sites, response.tempSites || []);
      setTempUI(enabled);
    }
  );
}

function removeSite(hostname) {
  chrome.runtime.sendMessage(
    { type: "TOGGLE_SITE", hostname, enabled: false },
    (response) => {
      if (!response) return;
      renderSitesList(response.sites, response.tempSites || []);
      if (hostname === currentHostname) setToggleUI(false);
    }
  );
}

function removeTempSite(hostname) {
  chrome.runtime.sendMessage(
    { type: "TOGGLE_TEMP_SITE", hostname, enabled: false },
    (response) => {
      if (!response) return;
      renderSitesList(response.sites, response.tempSites || []);
      if (hostname === currentHostname) setTempUI(false);
    }
  );
}

function addSite(hostname) {
  if (!hostname) return;
  chrome.runtime.sendMessage(
    { type: "TOGGLE_SITE", hostname, enabled: true },
    (response) => {
      if (!response) return;
      renderSitesList(response.sites, response.tempSites || []);
      if (hostname === currentHostname) setToggleUI(true);
    }
  );
}

// ── Init ─────────────────────────────────────────────────────────────────────

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) return;

  try {
    currentHostname = new URL(tab.url).hostname;
  } catch {
    currentHostname = "";
  }

  hostnameEl.textContent = currentHostname || "—";

  chrome.runtime.sendMessage(
    { type: "GET_STATUS", hostname: currentHostname },
    (response) => {
      if (!response) return;
      setToggleUI(response.enabled);
      setTempUI(response.tempEnabled || false);
      renderSitesList(response.sites, response.tempSites || []);
    }
  );
});

// ── Event listeners ───────────────────────────────────────────────────────────

toggleEl.addEventListener("change", () => {
  toggleCurrentSite(toggleEl.checked);
});

tempBtnEl.addEventListener("click", () => {
  const isActive = tempBtnEl.classList.contains("active");
  toggleTempSite(!isActive);
});

addBtn.addEventListener("click", () => {
  const hostname = normaliseHostname(addInput.value);
  if (!hostname) return;
  addSite(hostname);
  addInput.value = "";
});

addInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBtn.click();
});
