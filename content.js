/**
 * Content script: runs on every page at document_start.
 * Checks if the current hostname is in the user's dark-mode list,
 * and if so injects the dark-mode stylesheet immediately so there
 * is no flash of light content.
 */

const STYLE_ID = "selective-dark-mode-style";

function getHostname() {
  return location.hostname;
}

function buildDarkCSS() {
  return `
    /* ── Core inversion ──────────────────────────────────────────────────────
     * Invert the whole page, then hue-rotate 180° so blues stay blue
     * (invert alone turns blue→yellow; +180° rotation brings it back).
     * This handles icons, checkboxes, and all UI components automatically
     * without needing per-element overrides that break icon backgrounds.
     * ─────────────────────────────────────────────────────────────────── */
    /* Apply filter to body rather than html — Chrome has a compositing bug
     * on certain pages (e.g. Substack) where filter on the root <html>
     * element does not paint. body is the reliable target. */
    body {
      filter: invert(1) hue-rotate(180deg) !important;
      background: #fff !important; /* anchors body to white so inversion → near-black */
      color: #000 !important;      /* anchors default text to black so it inverts
                                      to white; prevents color-scheme:dark from
                                      setting CanvasText→white which would invert
                                      to invisible black-on-black */
    }

    /* Dark fallback on <html> so any transparent gaps in body don't bleed white */
    html {
      background: #000 !important;
    }

    /* Tell the browser we prefer dark so native widgets (scrollbars,
       date pickers, etc.) also render in dark style. */
    :root { color-scheme: dark !important; }

    /* ── Fix text inputs ──────────────────────────────────────────────────
     * color-scheme:dark makes the browser render native inputs in dark mode,
     * then body:invert flips them back to light → black text on white = invisible.
     * Force color-scheme:light on inputs so they start light and get correctly
     * inverted to: dark background + white text.
     * ─────────────────────────────────────────────────────────────────── */
    input,
    textarea,
    select,
    [contenteditable="true"],
    [contenteditable=""] {
      color-scheme: light !important;
    }

    /* ── Re-invert visual content ────────────────────────────────────────
     * Images, video, and data-viz elements get double-inverted so they
     * appear in their original colors rather than looking like negatives.
     * ─────────────────────────────────────────────────────────────────── */
    img,
    video,
    iframe,
    canvas,
    picture,
    svg image,
    [class*="avatar"],
    [class*="logo"]:not(span):not(div),
    [class*="thumbnail"],
    [class*="preview"],
    [class*="cover"],
    [class*="chart"]:not(th):not(td):not(span),
    [class*="graph"]:not(th):not(td):not(span),
    [class*="map"]:not(th):not(td):not(span),
    /* common charting libraries */
    .recharts-wrapper,
    .highcharts-container,
    .apexcharts-canvas,
    .c3,
    .vega-embed {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* ── Smooth transitions on interactive elements ───────────────────── */
    a,
    button,
    [role="button"],
    [role="tab"],
    [role="menuitem"],
    [role="option"],
    input,
    select,
    textarea,
    [class*="btn"],
    [class*="tab"],
    [class*="item"],
    [class*="row"],
    [class*="chip"],
    [class*="tag"],
    [class*="badge"],
    [class*="link"] {
      transition:
        background-color 150ms ease,
        color            150ms ease,
        border-color     150ms ease,
        box-shadow       150ms ease,
        opacity          150ms ease !important;
    }

    /* ── Counter-invert extension overlays ──────────────────────────────
     * Extensions (pomodoro timers, focus apps, etc.) inject overlays as
     * direct children of <body> using inline style="position:fixed;…".
     * Site elements almost always use CSS classes, not inline positioning.
     * Double-inverting these elements cancels out our body-level inversion
     * so they appear in their original colors (e.g. a black rest overlay
     * stays black instead of turning white).
     * ─────────────────────────────────────────────────────────────────── */
    body > [style*="position: fixed"]:not([role="dialog"]):not([role="alertdialog"]),
    body > [style*="position:fixed"]:not([role="dialog"]):not([role="alertdialog"]),
    html > body > [style*="position: fixed"]:not([role="dialog"]):not([role="alertdialog"]),
    html > body > [style*="position:fixed"]:not([role="dialog"]):not([role="alertdialog"]) {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* ── Scrollbars ──────────────────────────────────────────────────── */
    ::-webkit-scrollbar             { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track       { background: #1e1e1e; }
    ::-webkit-scrollbar-thumb       { background: #555; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #777; }
  `;
}

function injectDarkMode() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = buildDarkCSS();
  // Inject into <head> if available, otherwise <html>
  const target = document.head || document.documentElement;
  target.appendChild(style);
}

function removeDarkMode() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

/**
 * Returns true if `hostname` matches an enabled site entry.
 * Supports exact matches (e.g. "example.com" matches "example.com")
 * and subdomain matches (e.g. "substack.com" matches "foo.substack.com").
 */
function siteMatches(hostname, enabledSite) {
  return hostname === enabledSite || hostname.endsWith("." + enabledSite);
}

function applyIfEnabled() {
  const hostname = getHostname();
  chrome.storage.sync.get(["enabledSites"], (syncResult) => {
    const sites = syncResult.enabledSites || [];
    if (sites.some((site) => siteMatches(hostname, site))) {
      injectDarkMode();
      return;
    }
    chrome.storage.session.get(["tempSites"], (sessionResult) => {
      const tempSites = sessionResult.tempSites || [];
      if (tempSites.some((site) => siteMatches(hostname, site))) {
        injectDarkMode();
      } else {
        removeDarkMode();
      }
    });
  });
}

// Apply immediately on load
applyIfEnabled();

// React to storage changes (e.g. user toggles from popup while page is open)
chrome.storage.onChanged.addListener((changes, area) => {
  if (
    (area === "sync" && changes.enabledSites) ||
    (area === "session" && changes.tempSites)
  ) {
    applyIfEnabled();
  }
});

// Re-apply after SPA navigations (history API)
let lastUrl = location.href;
const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    applyIfEnabled();
  }
});
navObserver.observe(document.documentElement, { subtree: true, childList: true });

// ── Extension overlay counter-invert ─────────────────────────────────────
// Some extensions set position via JS property assignment rather than the
// style attribute (e.g. el.style.position = "fixed"), so the CSS attribute
// selector [style*="position: fixed"] may miss them. This observer catches
// any element added as a direct body child and counter-inverts it when dark
// mode is active and the element looks like a full-screen overlay.

const OVERLAY_ATTR = "data-sdm-counter-inverted";

// ARIA roles that indicate in-page UI components (dialogs, drawers, sidesheets).
// Elements with these roles must never be counter-inverted — they are part of
// the page's own UI and should receive the dark-mode treatment like everything
// else. Only extension overlays (no semantic role) should be counter-inverted.
const APP_ROLES = new Set(["dialog", "alertdialog", "complementary", "navigation", "banner", "main", "region"]);

function looksLikeOverlay(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.style.position !== "fixed") return false;
  // Skip any element that carries a semantic ARIA role — those are in-page
  // components, not extension overlays.
  const role = el.getAttribute("role");
  if (role && APP_ROLES.has(role)) return false;
  // Must cover at least 40% of the viewport in each dimension
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  return w >= window.innerWidth * 0.4 && h >= window.innerHeight * 0.4;
}

function counterInvertIfOverlay(el) {
  if (el.hasAttribute(OVERLAY_ATTR)) return;
  // Defer by one frame so computed styles are available
  requestAnimationFrame(() => {
    if (looksLikeOverlay(el)) {
      el.setAttribute(OVERLAY_ATTR, "1");
      // The CSS rule already handles the filter via [style*=…] but this
      // inline style ensures coverage for JS-only-written positions too.
      el.style.setProperty("filter", "invert(1) hue-rotate(180deg)", "important");
    }
  });
}

function removeCounterInvert(el) {
  if (!(el instanceof HTMLElement)) return;
  if (el.hasAttribute(OVERLAY_ATTR)) {
    el.removeAttribute(OVERLAY_ATTR);
    el.style.removeProperty("filter");
  }
}

const overlayObserver = new MutationObserver((mutations) => {
  // Only run when dark mode is active on this page
  if (!document.getElementById(STYLE_ID)) return;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes)   counterInvertIfOverlay(node);
    for (const node of mutation.removedNodes) removeCounterInvert(node);
  }
});

function startOverlayObserver() {
  const target = document.body || document.documentElement;
  overlayObserver.observe(target, {
    childList: true,
    // Not subtree — we only care about direct body children (extension injections)
  });
}

if (document.body) {
  startOverlayObserver();
} else {
  document.addEventListener("DOMContentLoaded", startOverlayObserver, { once: true });
}
