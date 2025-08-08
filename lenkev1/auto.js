
(() => {
  console.log("🚀 Twitter Tweet Cleaner — FILTERED v3.8 (skip articles vides / séparateurs)");

  const state = {
    running: false,
    options: { autoStart: true, autoscroll: true, includeRetweets: true, includeReplies: false, speed: 250 },
    deletedCount: 0,
    undidRetweets: 0,
    lastError: "",
    lastNote: ""
  };

  const delay = ms => new Promise(res => setTimeout(res, ms));

  const deleteKeywords = [
    "Supprimer", "Delete", "Sil", "Eliminar", "Löschen", "Elimina",
    "Удалить", "Ta bort", "Verwijderen", "삭제", "削除", "Excluir"
  ];

  const undoRtKeywords = [
    "Annuler le Repost", "Annuler le repost", "Undo Repost", "Undo Retweet",
    "Retweet'i geri al", "Deshacer Retweet", "Retweet rückgängig machen",
    "Annulla Retweet", "Отменить ретвит", "Ångra Retweet",
    "Retweet ongedaan maken", "리포스트 취소", "리트윗 취소",
    "リポストを取り消す", "リツイートを取り消す", "Desfazer Retweet", "Desfazer Repost"
  ];

  function setError(msg){ state.lastError = msg; console.warn(msg); }
  function setNote(msg){ state.lastNote = msg; console.log(msg); }

  function simulateClick(el) {
    if (!el) return;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
    el.dispatchEvent(ev);
  }

  function onOwnProfile() {
    try {
      const header = document.querySelector('div[data-testid="UserName"]');
      return !!header;
    } catch { return false; }
  }

  function shouldIgnoreTweet(article) {
    const txt = (article?.innerText || "").trim();
    const isRetweetOrRepost = /(Retweet|Retweeté|Retweeted|Repost|Reposté)/i.test(txt);
    const isReply = /En réponse à|Replying to/i.test(txt);
    if (!state.options.includeRetweets && isRetweetOrRepost) return true;
    if (!state.options.includeReplies && isReply) return true;
    return false;
  }

  // Heuristique: article exploitable (= pas un séparateur/publicité/espace vide)
  function isActionableArticle(article){
    if (!article) return false;
    const textLen = (article.innerText || "").trim().length;
    if (textLen < 2) return false; // quasi vide

    // ignorer pubs / sponsorisés
    const txt = article.innerText;
    if (/Sponsorisé|Promoted/i.test(txt)) return false;

    // doit contenir un auteur ou un bloc de meta
    const hasAuthor = !!(article.querySelector('div[data-testid="User-Name"]') || article.querySelector('div[data-testid="UserName"]'));
    if (!hasAuthor) return false;

    // doit contenir au moins un bouton pertinent
    if (findCaretInArticle(article) || findRtBtn(article)) return true;

    // fallback: présence de menuitems invisibles
    const possibleMenuMarkers = article.querySelector('[data-testid*="overflow"]') || article.querySelector('[aria-haspopup="menu"]');
    return !!possibleMenuMarkers;
  }

  const PER_ARTICLE_CARET_SELECTORS = [
    'button[data-testid="caret"]',
    'div[data-testid="caret"]',
    '[data-testid="tweetActionMore"]',
    '[data-testid="more"]',
    '[data-testid*="overflow"]',
    'button[aria-haspopup="menu"]',
    'div[aria-haspopup="menu"][role="button"]',
    'div[aria-label="More"]',
    'div[aria-label*="More"]',
    'div[aria-label*="Plus"]',
    'div[aria-label*="options"]',
    'a[aria-haspopup="menu"]'
  ];

  const PER_ARTICLE_RT_BTN = [
    'div[data-testid="retweet"]',
    'button[data-testid="retweet"]',
    'div[data-testid="repost"]',
    'button[data-testid="repost"]',
    'div[aria-label*="Retweet"]',
    'button[aria-label*="Retweet"]',
    'div[aria-label*="Repost"]',
    'button[aria-label*="Repost"]',
    'div[role="button"][aria-label*="Retweet"]',
    'div[role="button"][aria-label*="Repost"]'
  ];

  function findCaretInArticle(article){
    for (const sel of PER_ARTICLE_CARET_SELECTORS){
      const el = article.querySelector(sel);
      if (el) return el;
    }
    const group = article.querySelector('div[role="group"]');
    if (group){
      const buttons = [...group.querySelectorAll('[role="button"],button,a')];
      if (buttons.length) return buttons[buttons.length - 1];
    }
    return null;
  }

  function findRtBtn(article){
    for (const sel of PER_ARTICLE_RT_BTN){
      const el = article.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  async function waitForMenu(timeout = 3000) {
    const started = performance.now();
    return new Promise(resolve => {
      const id = setInterval(() => {
        const items = [...document.querySelectorAll('[role="menuitem"]')];
        if (items.length) { clearInterval(id); resolve(items); }
        if (performance.now() - started > timeout) { clearInterval(id); resolve([]); }
      }, 50);
    });
  }

  function findDeleteButton(menuItems) {
    let el = menuItems.find(x => x.getAttribute("data-testid") === "delete-action");
    if (el) return el;
    el = menuItems.find(x => deleteKeywords.some(w => (x.innerText || "").trim().toLowerCase().startsWith(w.toLowerCase())));
    if (el) return el;
    el = menuItems.find(x => x.querySelector('svg[aria-label*="Delete"], svg[aria-label*="Supprimer"]'));
    return el || null;
  }

  function findUndoRtButton(menuItems) {
    let el = menuItems.find(x => {
      const id = (x.getAttribute("data-testid") || "").toLowerCase();
      return id.includes("unretweet") || id.includes("unrepost");
    });
    if (el) return el;
    el = menuItems.find(x => undoRtKeywords.some(w => (x.innerText || "").trim().toLowerCase().startsWith(w.toLowerCase())));
    return el || null;
  }

  function findConfirmButton() {
    const btns = [...document.querySelectorAll('div[data-testid="confirmationSheetConfirm"], button, div[role="button"]')];
    const match = btns.find(b => /Supprimer|Delete|Sil|Eliminar|Löschen|Elimina|Удалить|Ta bort|Verwijderen|삭제|削除|Excluir|Annuler le Retweet|Undo Retweet|Annuler le Repost|Annuler le repost|Undo Repost/i
      .test((b.innerText || "") + " " + (b.getAttribute('aria-label') || "")));
    return match || null;
  }

  async function tryDeleteTweet(article, idx){
    const caret = findCaretInArticle(article);
    if (!caret) return false;

    caret.scrollIntoView({ behavior: "smooth", block: "center" });
    simulateClick(caret);
    await delay(state.options.speed);

    const menuItems = await waitForMenu();
    if (!menuItems.length) { setError("Menu non détecté après clic caret (article #" + idx + ")"); return false; }

    const deleteBtn = findDeleteButton(menuItems);
    if (!deleteBtn) return false;

    simulateClick(deleteBtn);
    await delay(state.options.speed + 80);

    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      simulateClick(confirmBtn);
      state.deletedCount++;
      setNote(`🗑️ Tweet supprimé — total: ${state.deletedCount}`);
      await delay(state.options.speed);
      return true;
    } else {
      setError("Bouton de confirmation introuvable (article #" + idx + ")");
      return false;
    }
  }

  async function tryUndoRt(article, idx){
    const rt = findRtBtn(article);
    if (!rt) { setNote("Bouton Retweet/Repost introuvable (article #" + idx + ")"); return false; }
    rt.scrollIntoView({ behavior: "smooth", block: "center" });
    simulateClick(rt);
    await delay(state.options.speed);

    const menuItems = await waitForMenu();
    if (!menuItems.length) { setError("Menu Retweet/Repost non détecté (article #" + idx + ")"); return false; }

    const undoBtn = findUndoRtButton(menuItems);
    if (!undoBtn) { setNote("Option 'Annuler le Repost/Retweet' introuvable (article #" + idx + ")"); return false; }

    simulateClick(undoBtn);
    await delay(state.options.speed + 50);

    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      simulateClick(confirmBtn);
      await delay(state.options.speed);
    }

    state.undidRetweets++;
    setNote(`🔁 Repost/Retweet annulé — total: ${state.undidRetweets}`);
    return true;
  }

  async function deleteTweetsPass() {
    const articles = [...document.querySelectorAll('article')];
    if (!articles.length) {
      setNote("Aucun article (post) détecté — je scrolle…");
      if (state.options.autoscroll) window.scrollTo(0, document.body.scrollHeight);
      await delay(800);
      return;
    }

    let deletedThisPass = 0, undoneThisPass = 0, inspected = 0, skipped = 0;

    for (let i = 0; i < articles.length && state.running; i++) {
      const article = articles[i];
      inspected++;

      // Filtre: sauter articles vides/séparateurs
      if (!isActionableArticle(article)) { skipped++; continue; }
      if (shouldIgnoreTweet(article)) continue;

      const deleted = await tryDeleteTweet(article, i);
      if (!deleted && state.options.includeRetweets) {
        const undone = await tryUndoRt(article, i);
        if (undone) undoneThisPass++;
      } else if (deleted) {
        deletedThisPass++;
      }
    }

    if ((deletedThisPass + undoneThisPass) === 0 && state.options.autoscroll) {
      window.scrollTo(0, document.body.scrollHeight);
      await delay(800);
    }

    setNote(`Pass: inspectés=${inspected}, ignorés(sep/pub/vides)=${skipped}, supprimés=${deletedThisPass}, reposts/retweets annulés=${undoneThisPass}`);
  }

  async function mainLoop() {
    while (state.running) {
      await deleteTweetsPass();
    }
  }

  function applyOptionsFromStorage() {
    const defaults = { autoStart: true, autoscroll: true, includeRetweets: true, includeReplies: false, speed: 250 };
    return new Promise(resolve => {
      try {
        chrome.storage.sync.get(defaults, opts => {
          state.options = Object.assign({}, defaults, opts || {});
          if (state.options.speed < 100) state.options.speed = 100;
          resolve(state.options);
        });
      } catch {
        resolve(defaults);
      }
    });
  }

  function start() {
    if (state.running) return;
    if (!onOwnProfile()) setNote("ℹ️ Conseil: ouvre ton profil pour voir uniquement tes publications/reposts.");
    state.running = true;
    setNote("▶️ Démarrage FILTERED v3.8");
    mainLoop();
  }

  function stop() {
    state.running = false;
    setNote("⏸️ Arrêt");
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "OPTIONS") {
      state.options = Object.assign(state.options, msg.payload || {});
      sendResponse({ ok: true, state: state.running ? "Actif" : "Inactif", count: state.deletedCount, lastError: state.lastError, note: state.lastNote });
      return true;
    }
    if (msg?.type === "START") {
      start();
      sendResponse({ ok: true, state: "Actif", count: state.deletedCount, lastError: state.lastError, note: state.lastNote });
      return true;
    }
    if (msg?.type === "STOP") {
      stop();
      sendResponse({ ok: true, state: "Inactif", count: state.deletedCount, lastError: state.lastError, note: state.lastNote });
      return true;
    }
    if (msg?.type === "STATUS") {
      sendResponse({ ok: true, state: state.running ? "Actif" : "Inactif", count: state.deletedCount, lastError: state.lastError, note: state.lastNote });
      return true;
    }
  });

  (async () => {
    await applyOptionsFromStorage();
    if (state.options.autoStart) start();
  })();
})();
