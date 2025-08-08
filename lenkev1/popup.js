
const $ = sel => document.querySelector(sel);
const log = msg => { const el = $("#log"); el.textContent += (msg + "\n"); el.scrollTop = el.scrollHeight; };

async function loadOptions() {
  const defaults = { autoStart: true, autoscroll: true, includeRetweets: false, includeReplies: false, speed: 250 };
  const data = await chrome.storage.sync.get(defaults);
  $("#autoStart").checked = data.autoStart;
  $("#autoscroll").checked = data.autoscroll;
  $("#includeRetweets").checked = data.includeRetweets;
  $("#includeReplies").checked = data.includeReplies;
  $("#speed").value = data.speed;
  $("#speedLabel").textContent = data.speed + " ms";
}

async function saveOptions() {
  const opts = {
    autoStart: $("#autoStart").checked,
    autoscroll: $("#autoscroll").checked,
    includeRetweets: $("#includeRetweets").checked,
    includeReplies: $("#includeReplies").checked,
    speed: parseInt($("#speed").value, 10)
  };
  await chrome.storage.sync.set(opts);
  return opts;
}

async function getActiveTwitterTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return null;
  if (!tab.url.match(/^https:\/\/(twitter|x|mobile\.twitter)\.com\//)) return null;
  return tab;
}

async function sendMessageOrInject(tab, message) {
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (e) {
    log("⚠️ Script non détecté — injection en cours…");
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["auto.js"] });
      await new Promise(res => setTimeout(res, 600));
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (err) {
      log("❌ Impossible d'injecter auto.js : " + err.message);
      return null;
    }
  }
}

["autoStart", "autoscroll", "includeRetweets", "includeReplies", "speed"].forEach(id => {
  $("#" + id).addEventListener("change", async () => {
    if (id === "speed") $("#speedLabel").textContent = $("#speed").value + " ms";
    await saveOptions();
  });
});

$("#startBtn").addEventListener("click", async () => {
  log("▶️ Démarrage demandé…");
  const opts = await saveOptions();
  const tab = await getActiveTwitterTab();
  if (!tab) return log("⚠️ Ouvre un onglet Twitter/X pour lancer le nettoyeur.");
  await sendMessageOrInject(tab, { type: "OPTIONS", payload: opts });
  const resp = await sendMessageOrInject(tab, { type: "START" });
  if (resp && resp.note) log(resp.note);
  if (resp && resp.lastError) log("Dernière erreur: " + resp.lastError);
});

$("#stopBtn").addEventListener("click", async () => {
  log("⏸️ Arrêt demandé.");
  const tab = await getActiveTwitterTab();
  if (!tab) return log("⚠️ Ouvre un onglet Twitter/X pour arrêter le nettoyeur.");
  const resp = await sendMessageOrInject(tab, { type: "STOP" });
  if (resp && resp.lastError) log("Dernière erreur: " + resp.lastError);
});

(async () => {
  await loadOptions();
  const tab = await getActiveTwitterTab();
  if (tab) {
    const resp = await sendMessageOrInject(tab, { type: "STATUS" });
    if (resp) {
      if (resp.state) $("#statusText").textContent = resp.state;
      if (typeof resp.count === "number") $("#countText").textContent = resp.count + " supprimé(s)";
      if (resp.lastError) log("Dernière erreur: " + resp.lastError);
      if (resp.note) log(resp.note);
    }
  } else {
    log("⚠️ Ouvre Twitter/X pour contrôler le nettoyeur.");
  }
})();
