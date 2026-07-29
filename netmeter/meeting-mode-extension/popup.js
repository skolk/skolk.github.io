const radios = document.querySelectorAll('input[name="mode"]');

chrome.storage.local.get("mode").then(({ mode }) => {
  const current = mode || "normal";
  for (const r of radios) r.checked = r.value === current;
});

for (const r of radios) {
  r.addEventListener("change", () => {
    chrome.runtime.sendMessage({ cmd: "setMode", mode: r.value });
  });
}

document.getElementById("discard").addEventListener("click", async () => {
  const res = await chrome.runtime.sendMessage({ cmd: "discard" });
  document.getElementById("out").textContent =
    `${res.count} tab${res.count === 1 ? "" : "s"} discarded`;
});
