(() => {
  const $ = (id) => document.getElementById(id);
  const STORE = "secretbrowser_v1";
  const defaults = { theme: "dark", desktopMode: false, blockThirdPartyInfo: true, privateDefault: false, bookmarks: [], history: [], profiles: [], activeProfile: "Default" };
  let state = loadState();
  let tabs = [{ id: 1, title: "New tab", url: "", private: false, entries: [], index: -1 }];
  let activeTab = 1;
  let nextTab = 2;
  let toastTimer;

  function loadState() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORE) || "{}") }; }
    catch { return { ...defaults }; }
  }
  function saveState() { localStorage.setItem(STORE, JSON.stringify(state)); }
  function toast(msg) {
    $("toast").textContent = msg; $("toast").classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2400);
  }
  function currentTab() { return tabs.find(t => t.id === activeTab); }
  function normalizeUrl(raw) {
    const value = raw.trim();
    if (!value) return "";
    if (/^(javascript|data|file):/i.test(value)) throw new Error("This address type is not supported.");
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[\w-]+(\.[\w-]+)+([/:?#].*)?$/i.test(value)) return "https://" + value;
    return "https://www.google.com/search?q=" + encodeURIComponent(value);
  }
  function renderTabs() {
    $("tabStrip").innerHTML = "";
    tabs.forEach(tab => {
      const el = document.createElement("button");
      el.className = "tab" + (tab.id === activeTab ? " active" : "");
      el.textContent = (tab.private ? "◉ " : "") + (tab.title || "New tab") + "  ×";
      el.title = tab.url || "New tab";
      el.addEventListener("click", (e) => {
        if (e.offsetX > el.clientWidth - 22 && tabs.length > 1) closeTab(tab.id);
        else { activeTab = tab.id; showTab(); }
      });
      $("tabStrip").appendChild(el);
    });
    $("tabCount").textContent = tabs.length;
  }
  function showTab() {
    const tab = currentTab();
    renderTabs();
    $("addressInput").value = tab.url || "";
    if (!tab.url) {
      $("welcomeView").classList.remove("hidden"); $("webView").classList.add("hidden");
    } else {
      $("welcomeView").classList.add("hidden"); $("webView").classList.remove("hidden");
      const frame = $("pageFrame");
      $("webView").classList.remove("loaded");
      $("fallbackTitle").textContent = tab.url;
      $("fallbackText").textContent = "If the preview stays blank, this website probably blocks embedding. Open it in Safari or another browser tab.";
      $("externalLink").href = tab.url;
      frame.src = tab.url;
      // A parent page cannot reliably detect iframe blocking due to browser security.
    }
  }
  function navigate(raw) {
    try {
      const url = normalizeUrl(raw);
      if (!url) return;
      const tab = currentTab();
      if (!tab.entries) { tab.entries = []; tab.index = -1; }
      tab.entries = tab.entries.slice(0, tab.index + 1);
      tab.entries.push(url);
      tab.index = tab.entries.length - 1;
      tab.url = url;
      try { tab.title = new URL(url).hostname; } catch { tab.title = "Website"; }
      if (!tab.private) {
        state.history = [{ url, title: tab.title, at: Date.now() }, ...state.history.filter(x => x.url !== url)].slice(0, 60);
        saveState();
      }
      showTab();
    } catch (err) { toast(err.message); }
  }
  function newTab(isPrivate = state.privateDefault) {
    const tab = { id: nextTab++, title: isPrivate ? "Private tab" : "New tab", url: "", private: isPrivate };
    tabs.push(tab); activeTab = tab.id; showTab();
  }
  function closeTab(id) {
    if (tabs.length === 1) { tabs[0] = { id: nextTab++, title: "New tab", url: "", private: false }; activeTab = tabs[0].id; }
    else { tabs = tabs.filter(t => t.id !== id); if (activeTab === id) activeTab = tabs[tabs.length - 1].id; }
    showTab();
  }
  $("addressForm").addEventListener("submit", e => { e.preventDefault(); navigate($("addressInput").value); });
  $("mainSearchForm").addEventListener("submit", e => { e.preventDefault(); navigate($("mainSearchInput").value); });
  document.querySelectorAll("[data-url]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.url)));
  $("newTabBtn").addEventListener("click", () => newTab());
  $("homeBtn").addEventListener("click", () => { currentTab().url = ""; currentTab().title = "New tab"; showTab(); });
  $("homeBrand").addEventListener("click", e => { e.preventDefault(); currentTab().url = ""; showTab(); });
  $("backBtn").addEventListener("click", () => {
    const tab = currentTab();
    if (!tab.entries || tab.index <= 0) return toast("No previous page in this tab.");
    tab.index--; tab.url = tab.entries[tab.index]; showTab();
  });
  $("forwardBtn").addEventListener("click", () => {
    const tab = currentTab();
    if (!tab.entries || tab.index >= tab.entries.length - 1) return toast("No next page in this tab.");
    tab.index++; tab.url = tab.entries[tab.index]; showTab();
  });
  $("reloadBtn").addEventListener("click", () => { if (currentTab().url) $("pageFrame").src = currentTab().url; else toast("Start page is already ready."); });

  const panelNames = { privacy: "Privacy Center", cookies: "Cookie Manager", device: "Device Inspector", bookmarks: "Bookmarks", ai: "Secret AI", settings: "Advanced Settings" };
  function openPanel(name) {
    $("panelTitle").textContent = panelNames[name] || "Settings";
    $("panelEyebrow").textContent = "SECRETBROWSER CONTROL";
    $("overlay").classList.remove("hidden");
    const content = $("panelContent");
    content.innerHTML = "";
    if (name === "privacy") privacyPanel(content);
    if (name === "cookies") cookiePanel(content);
    if (name === "device") devicePanel(content);
    if (name === "bookmarks") bookmarkPanel(content);
    if (name === "ai") aiPanel(content);
    if (name === "settings") settingsPanel(content);
  }
  document.querySelectorAll("[data-panel]").forEach(b => b.addEventListener("click", () => openPanel(b.dataset.panel)));
  $("settingsOpen").addEventListener("click", () => openPanel("settings"));
  $("closePanel").addEventListener("click", () => $("overlay").classList.add("hidden"));
  $("overlay").addEventListener("click", e => { if (e.target === $("overlay")) $("overlay").classList.add("hidden"); });

  function block(title, body) {
    const el = document.createElement("section"); el.className = "setting-block";
    const h = document.createElement("h3"); h.textContent = title; el.appendChild(h);
    const div = document.createElement("div"); div.innerHTML = body; el.appendChild(div);
    return el;
  }
  function row(label, control) { return `<div class="setting-row"><span>${label}</span>${control}</div>`; }
  function privacyPanel(root) {
    const privateTab = currentTab().private;
    root.appendChild(block("Private browsing", `
      <p>Private tabs are kept in this page's memory and are not added to SecretBrowser history or bookmarks. Closing the tab ends that local session. Websites and your network may still see connection information.</p>
      ${row("Open new tabs privately", `<input class="toggle" type="checkbox" id="privateDefault" ${state.privateDefault ? "checked" : ""}>`)}
      ${row("Current tab is private", `<b>${privateTab ? "YES" : "NO"}</b>`)}
      <button class="action-btn primary" id="newPrivate">＋ New private tab</button>
      <button class="action-btn" id="closePrivate">Close all private tabs</button>
    `));
    root.appendChild(block("Privacy checklist", `<p>• Review website permissions in iOS Settings → Safari.<br>• Avoid entering passwords on unfamiliar websites.<br>• Use HTTPS websites.<br>• SecretBrowser cannot make the whole iPhone anonymous.</p>`));
    $("privateDefault").addEventListener("change", e => { state.privateDefault = e.target.checked; saveState(); });
    $("newPrivate").addEventListener("click", () => { $("overlay").classList.add("hidden"); newTab(true); });
    $("closePrivate").addEventListener("click", () => {
      const privateIds = tabs.filter(t => t.private).map(t => t.id);
      privateIds.forEach(id => { if (tabs.length > 1) tabs = tabs.filter(t => t.id !== id); });
      if (!tabs.length) tabs = [{ id: nextTab++, title: "New tab", url: "", private: false, entries: [], index: -1 }];
      if (!tabs.some(t => t.id === activeTab)) activeTab = tabs[0].id;
      $("overlay").classList.add("hidden"); showTab(); toast("Private tabs closed.");
    });
  }
  function cookiePanel(root) {
    const cookieCount = document.cookie ? document.cookie.split(";").filter(Boolean).length : 0;
    root.appendChild(block("Cookie storage for SecretBrowser", `
      <p><b>${cookieCount}</b> readable cookie(s) for this app's own domain. Browsers hide HttpOnly cookies from JavaScript. This tool cannot read or delete cookies belonging to Google or other websites opened externally.</p>
      <div class="data-list" id="cookieList">${escapeHtml(document.cookie || "No readable cookies found for this app.")}</div>
      <button class="action-btn danger" id="clearCookies">Delete readable app cookies</button>
    `));
    root.appendChild(block("Site data", `<p>Manage data stored by SecretBrowser in this browser. Clearing it removes local preferences, bookmarks, history and profiles.</p><button class="action-btn danger" id="clearAppData">Clear SecretBrowser data</button>`));
    $("clearCookies").addEventListener("click", () => {
      document.cookie.split(";").forEach(c => {
        const name = c.split("=")[0].trim();
        if (name) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      });
      toast("Readable app cookies cleared."); openPanel("cookies");
    });
    $("clearAppData").addEventListener("click", () => {
      if (confirm("Clear SecretBrowser preferences, bookmarks, history and profiles on this device?")) {
        localStorage.removeItem(STORE); state = { ...defaults }; saveState(); toast("App data cleared."); openPanel("cookies");
      }
    });
  }
  function devicePanel(root) {
    const info = [
      ["Platform", navigator.platform || "Not provided"],
      ["Browser", navigator.userAgent],
      ["Language", navigator.language || "Unknown"],
      ["Languages", (navigator.languages || []).join(", ") || "Unknown"],
      ["Screen", `${screen.width} × ${screen.height}`],
      ["Viewport", `${innerWidth} × ${innerHeight}`],
      ["Pixel ratio", devicePixelRatio || "Unknown"],
      ["Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown"],
      ["Cookies enabled", navigator.cookieEnabled ? "Yes" : "No"],
      ["Online status", navigator.onLine ? "Online" : "Offline"],
      ["Touch points", navigator.maxTouchPoints ?? "Not provided"]
    ];
    const html = info.map(([k,v]) => `<div class="setting-row"><span>${escapeHtml(k)}</span><span style="max-width:65%;text-align:right;overflow-wrap:anywhere;color:#b8c0ce">${escapeHtml(String(v))}</span></div>`).join("");
    root.appendChild(block("Browser-visible device information", `<p>This is what this page can read. It is not a complete device fingerprint and does not identify you by itself.</p>${html}<button class="action-btn" id="copyDevice">Copy report</button>`));
    $("copyDevice").addEventListener("click", () => navigator.clipboard?.writeText(info.map(x => x.join(": ")).join("\n")).then(() => toast("Report copied.")).catch(() => toast("Clipboard permission unavailable.")));
  }
  function bookmarkPanel(root) {
    root.appendChild(block("Save current page", `<p>Save the active non-private tab to this device.</p><button class="action-btn primary" id="saveBookmark">☆ Save current page</button>`));
    const list = state.bookmarks.length ? state.bookmarks.map((b,i) => `<div class="bookmark-item"><a href="#" data-bookmark="${i}">${escapeHtml(b.title || b.url)}<br><small>${escapeHtml(b.url)}</small></a><button class="action-btn danger" data-delete-bookmark="${i}">×</button></div>`).join("") : `<p class="muted">No bookmarks yet.</p>`;
    root.appendChild(block("Saved bookmarks", list));
    $("saveBookmark").addEventListener("click", () => {
      const tab = currentTab(); if (!tab.url || tab.private) return toast("Open a non-private page first.");
      state.bookmarks.unshift({ url: tab.url, title: tab.title }); saveState(); openPanel("bookmarks"); toast("Bookmark saved.");
    });
    root.querySelectorAll("[data-bookmark]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); const b = state.bookmarks[+a.dataset.bookmark]; $("overlay").classList.add("hidden"); navigate(b.url); }));
    root.querySelectorAll("[data-delete-bookmark]").forEach(b => b.addEventListener("click", () => { state.bookmarks.splice(+b.dataset.deleteBookmark,1); saveState(); openPanel("bookmarks"); }));
  }
  function aiPanel(root) {
    root.appendChild(block("Secret AI assistant", `<p>Ask about browser settings, cookies, privacy terms or how to use SecretBrowser. Live AI is optional; without a server key this runs in demo mode.</p><div class="ai-chat" id="aiChat"><div class="bubble ai">Hello! I'm Secret AI. What would you like to know?</div></div><form class="ai-send" id="aiForm"><input class="ai-input" id="aiMessage" placeholder="Ask Secret AI..." maxlength="2000"><button class="action-btn primary" type="submit">Send</button></form><p class="muted" id="aiMode">Checking assistant mode…</p>`));
    $("aiForm").addEventListener("submit", async e => {
      e.preventDefault(); const msg = $("aiMessage").value.trim(); if (!msg) return;
      addBubble("user", msg); $("aiMessage").value = "";
      const pending = addBubble("ai", "Thinking…");
      try {
        const r = await fetch("/api/assistant", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({message:msg}) });
        const data = await r.json();
        pending.textContent = data.reply || data.error || "No response.";
        $("aiMode").textContent = data.mode === "live" ? "Live AI connected" : "Demo mode — no API key configured";
      } catch { pending.textContent = "Assistant unavailable. Check your connection."; }
      $("aiChat").scrollTop = $("aiChat").scrollHeight;
    });
    function addBubble(type, text) { const b = document.createElement("div"); b.className = "bubble " + type; b.textContent = text; $("aiChat").appendChild(b); $("aiChat").scrollTop = $("aiChat").scrollHeight; return b; }
    $("aiMode").textContent = "Demo mode until OPENAI_API_KEY is added on the server.";
  }
  function settingsPanel(root) {
    root.appendChild(block("Browser preferences", `
      ${row("Default new tabs to private", `<input class="toggle" type="checkbox" id="prefPrivate" ${state.privateDefault ? "checked" : ""}>`)}
      ${row("Reduce third-party tracking (guidance)", `<input class="toggle" type="checkbox" id="prefTrack" ${state.blockThirdPartyInfo ? "checked" : ""}>`)}
      ${row("Desktop mode preference", `<input class="toggle" type="checkbox" id="prefDesktop" ${state.desktopMode ? "checked" : ""}>`)}
      <p>These preferences affect SecretBrowser's own interface and guidance. They cannot override iOS Safari or force other sites to accept a different device identity.</p>
    `));
    root.appendChild(block("Profiles & backup", `<p>Profiles are local preference sets, not separate system browser identities. Export your SecretBrowser settings as a JSON backup.</p><button class="action-btn" id="exportData">Export backup</button><button class="action-btn" id="importData">Import backup</button><input type="file" id="importFile" accept="application/json" hidden>`));
    root.appendChild(block("About", `<p><b>SecretBrowser 1.0</b><br>Mobile-first browser workspace. External sites may block embedded previews. Use your normal browser for full website compatibility.</p>`));
    ["prefPrivate","prefTrack","prefDesktop"].forEach((id,i) => $(id).addEventListener("change", e => { const key = ["privateDefault","blockThirdPartyInfo","desktopMode"][i]; state[key] = e.target.checked; saveState(); }));
    $("exportData").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "secretbrowser-backup.json"; a.click(); URL.revokeObjectURL(url);
    });
    $("importData").addEventListener("click", () => $("importFile").click());
    $("importFile").addEventListener("change", async e => {
      const file = e.target.files[0]; if (!file) return;
      try { const data = JSON.parse(await file.text()); state = { ...defaults, ...data }; saveState(); toast("Backup imported."); openPanel("settings"); }
      catch { toast("Invalid backup file."); }
    });
  }
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  // Show browser state and maintain a lightweight local privacy indicator.
  function updateScore() {
    const score = 72 + (state.privateDefault ? 8 : 0) + (state.blockThirdPartyInfo ? 5 : 0);
    $("scoreNumber").textContent = Math.min(score, 95);
    $("privacyScore").textContent = score >= 80 ? "Looking good" : "Good start";
  }
  updateScore(); showTab();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  window.addEventListener("online", () => toast("Connection restored."));
  window.addEventListener("offline", () => toast("You are offline. External websites may not load."));
})();