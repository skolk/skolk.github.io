// netmeter Meeting Mode: click the toolbar button to discard every tab except
// the ones a meeting needs. Discarded tabs stay in the tab strip and reload
// only when clicked, so nothing is lost.

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
  // Audible covers an active Meet/Zoom call even when it's in a background tab,
  // and also spares anything you're deliberately listening to.
  if (tab.audible) return true;
  try {
    const host = new URL(tab.url).hostname;
    return MEETING_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

chrome.action.onClicked.addListener(async () => {
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
  chrome.action.setBadgeBackgroundColor({ color: "#2e7d32" });
  chrome.action.setBadgeText({ text: String(discarded) });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 5000);
});
