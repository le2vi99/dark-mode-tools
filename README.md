# Selective Dark Mode

A Chrome extension that turns on dark mode only for the sites you pick. Every other site stays as it is.

## Features

- Toggle dark mode per site from the toolbar popup.
- **Permanent**: the site stays dark and the choice syncs across your Chrome devices.
- **Session only**: the **Enable for session** button keeps a site dark until you close the browser.
- Subdomains match: enabling `substack.com` also covers `foo.substack.com`.
- Dark styles load at `document_start`, so there is no white flash.

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Pin the extension, open a site, and click the icon.

## How it works

The content script inverts the page body (`invert(1) hue-rotate(180deg)`) so blues stay blue, then fixes inputs, images, and video so they are not inverted twice.

| File | Role |
|---|---|
| `content.js` | Checks the site list and injects the dark stylesheet |
| `background.js` | Handles toggle messages and storage |
| `popup.html` / `popup.js` | Toolbar popup UI |

Storage: `chrome.storage.sync` for permanent sites, `chrome.storage.session` for session sites.

## Limits

Inversion is a filter, not a real theme. Some sites with complex backgrounds, canvas, or custom colors may look off. Disable dark mode for that site from the popup.
