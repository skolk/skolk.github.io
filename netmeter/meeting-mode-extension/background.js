// netmeter Meeting Mode: tab discarding plus network modes.
//
// Connection modes work by proxy, not by freezing the app:
// - "offline": every request goes to a dead proxy (127.0.0.1:1) and fails
//   instantly. Pages already rendered stay fully viewable and scrollable;
//   localhost is bypassed so local dev servers keep working.
// - "essentials": PAC script sends Google domains (Calendar, Meet, auth,
//   static assets) direct and everything else to the dead proxy.
// - "normal": proxy settings cleared.

const MEETING_HOSTS = [
  "meet.google.com",
  "zoom.us",
  "teams.microsoft.com",
  "teams.live.com",
  "whereby.com",
  "webex.com",
  "figma.com" // FigJam/Figma audio rooms; drop this line if unwanted
];

function isMeetingTab(tab) {
  if (tab.audible) return true;
  try {
    const host = new URL(tab.url).hostname;
    return MEETING_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

async function discardOthers() {
  const tabs = await chrome.tabs.query({});
  let discarded = 0;
  for (const tab of tabs) {
    if (tab.active || tab.discarded || isMeetingTab(tab)) continue;
    if (tab.url && tab.url.startsWith("chrome://")) continue;
    try {
      await chrome.tabs.discard(tab.id);
      discarded++;
    } catch (e) {
      // Some tabs (e.g. mid-navigation) refuse to discard; skip them.
    }
  }
  return discarded;
}

const ESSENTIALS_PAC = `function FindProxyForURL(url, host) {
  if (host === "localhost" || host === "127.0.0.1") return "DIRECT";
  if (host === "google.com" || shExpMatch(host, "*.google.com")) return "DIRECT";
  if (shExpMatch(host, "*.googleapis.com")) return "DIRECT";
  if (shExpMatch(host, "*.gstatic.com")) return "DIRECT";
  if (shExpMatch(host, "*.googleusercontent.com")) return "DIRECT";
  return "PROXY 127.0.0.1:1";
}`;

async function applyMode(mode) {
  if (mode === "offline") {
    await chrome.proxy.settings.set({
      scope: "regular",
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: { scheme: "http", host: "127.0.0.1", port: 1 },
          bypassList: ["localhost", "127.0.0.1"]
        }
      }
    });
  } else if (mode === "essentials") {
    await chrome.proxy.settings.set({
      scope: "regular",
      value: { mode: "pac_script", pacScript: { data: ESSENTIALS_PAC } }
    });
  } else {
    await chrome.proxy.settings.clear({ scope: "regular" });
  }
  await chrome.storage.local.set({ mode });
  updateBadge(mode);
}

function updateBadge(mode) {
  const text = mode === "offline" ? "✕" : mode === "essentials" ? "G" : "";
  chrome.action.setBadgeText({ text });
  if (text) {
    chrome.action.setBadgeBackgroundColor({
      color: mode === "offline" ? "#c62828" : "#1565c0"
    });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === "discard") {
    discardOthers().then((count) => sendResponse({ count }));
    return true;
  }
  if (msg.cmd === "setMode") {
    applyMode(msg.mode).then(() => sendResponse({ ok: true }));
    return true;
  }
});

// Re-apply the saved mode when Chrome starts, so a restart doesn't silently
// go back online while you're tethered.
chrome.runtime.onStartup.addListener(async () => {
  const { mode } = await chrome.storage.local.get("mode");
  if (mode && mode !== "normal") applyMode(mode);
});
