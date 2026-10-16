/**
 * Background service worker.
 * Listens for messages from the popup to toggle a site,
 * then re-runs the content script on the active tab.
 *
 * Storage:
 *  - chrome.storage.sync  → enabledSites  (permanent, synced across devices)
 *  - chrome.storage.session → tempSites   (session-only, cleared when browser closes)
 */

// Allow content scripts to read/watch session storage so that session-mode
// dark mode applies in real-time without a page reload.
chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
});

/**
 * Returns true if `hostname` matches an enabled site entry.
 * Supports exact matches and subdomain matches
 * (e.g. "substack.com" matches "foo.substack.com").
 */
function siteMatches(hostname, enabledSite) {
  return hostname === enabledSite || hostname.endsWith("." + enabledSite);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_SITE") {
    const { hostname, enabled } = message;
    chrome.storage.sync.get(["enabledSites"], (syncResult) => {
      let sites = syncResult.enabledSites || [];
      if (enabled) {
        if (!sites.includes(hostname)) sites = [...sites, hostname];
      } else {
        sites = sites.filter((s) => s !== hostname);
      }
      chrome.storage.sync.set({ enabledSites: sites }, () => {
        chrome.storage.session.get(["tempSites"], (sessionResult) => {
          const tempSites = sessionResult.tempSites || [];
          sendResponse({ ok: true, sites, tempSites });
        });
      });
    });
    return true; // keep channel open for async sendResponse
  }

  if (message.type === "TOGGLE_TEMP_SITE") {
    const { hostname, enabled } = message;
    chrome.storage.session.get(["tempSites"], (sessionResult) => {
      let tempSites = sessionResult.tempSites || [];
      if (enabled) {
        if (!tempSites.includes(hostname)) tempSites = [...tempSites, hostname];
      } else {
        tempSites = tempSites.filter((s) => s !== hostname);
      }
      chrome.storage.session.set({ tempSites }, () => {
        chrome.storage.sync.get(["enabledSites"], (syncResult) => {
          const sites = syncResult.enabledSites || [];
          sendResponse({ ok: true, sites, tempSites });
        });
      });
    });
    return true;
  }

  if (message.type === "GET_STATUS") {
    const { hostname } = message;
    chrome.storage.sync.get(["enabledSites"], (syncResult) => {
      chrome.storage.session.get(["tempSites"], (sessionResult) => {
        const sites = syncResult.enabledSites || [];
        const tempSites = sessionResult.tempSites || [];
        sendResponse({
          enabled: sites.some((s) => siteMatches(hostname, s)),
          tempEnabled: tempSites.some((s) => siteMatches(hostname, s)),
          sites,
          tempSites,
        });
      });
    });
    return true;
  }
});
