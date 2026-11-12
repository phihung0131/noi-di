(() => {
  if (window.__spLoaded) return;
  window.__spLoaded = true;

  const P = window.SP_PROMPT;
  const DEF = {
    on: false, lang: "en-US", mode: "ielts", output: "vi",
    rate: 0.95, topic: "", pending: false,
    autoQ: true,       // tự đọc câu hỏi mới
    listenOnly: false, // che chữ câu hỏi, chỉ nghe
    showTrans: false,  // tự hiện bản dịch
    voiceName: "",
  };
  let S = { ...DEF };

  /* ================= tiện ích ================= */
  const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  const store = {
    get() {
      return new Promise((res) => {
        if (hasChrome) chrome.storage.local.get("sp", (o) => res({ ...DEF, ...(o.sp || {}) }));
        else { try { res({ ...DEF, ...JSON.parse(localStorage.getItem("sp") || "{}") }); } catch { res({ ...DEF }); } }
      });
    },
    set(s) {
      return new Promise((res) => {
        if (hasChrome) chrome.storage.local.set({ sp: s }, res);
        else { localStorage.setItem("sp", JSON.stringify(s)); res(); }
      });
    },
  };
  const save = () => store.set(S);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  async function waitFor(fn, timeout = 8000, step = 100) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      let v; try { v = fn(); } catch { v = null; }
      if (v) return v;
      await sleep(step);
    }
    return null;
  }
  function setNative(el, v) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  let toastTimer;
  function toast(msg) {
    const t = $("#sp-toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 4000);
  }
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };

  /* ================= đọc bằng giọng Chrome (có tô sáng từng từ) ================= */
  let voices = [];
  const loadVoices = () => { voices = speechSynthesis.getVoices(); fillVoices(); };
  speechSynthesis.addEventListener("voiceschanged", loadVoices);

  const normLang = (l) => (l || "").replace("_", "-").toLowerCase();
  function voicePool(lang) {
    const want = normLang(lang), prefix = want.split("-")[0];
    const exact = voices.filter((v) => normLang(v.lang) === want);
    return exact.length ? exact : voices.filter((v) => normLang(v.lang).split("-")[0] === prefix);
  }
  function pickVoice(lang) {
    const pool = voicePool(lang);
    return pool.find((v) => v.name === S.voiceName) || pool.find((v) => /google/i.test(v.name)) || pool[0] || null;
  }
  function fillVoices() {
    const sel = $("#sp-voice"); if (!sel) return;
    const pool = voicePool(S.lang);
    sel.innerHTML = `<option value="">Tự chọn</option>` + pool.map((v) => `<option value="${esc(v.name)}">${esc(v.name)}</option>`).join("");
    sel.value = pool.some((v) => v.name === S.voiceName) ? S.voiceName : "";
  }

  const TXT = {};          // key -> text để đọc
  let playingKey = null;   // key đang đọc
  let speakToken = 0;

  function markPlaying() {
    $$("[data-speak]").forEach((b) => b.classList.toggle("on", b.dataset.speak === playingKey));
  }
  function highlight(wkey, abs) {
    const ws = $$(`[data-wkey="${wkey}"] .w`);
    let cur = -1;
    ws.forEach((w, i) => { if (+w.dataset.s <= abs) cur = i; });
    ws.forEach((w, i) => { w.classList.toggle("on", i === cur); w.classList.toggle("done", i < cur); });
  }
  function clearHighlight() { $$(".w.on, .w.done").forEach((w) => w.classList.remove("on", "done")); }

  function stopSpeak() {
    speakToken++; speechSynthesis.cancel(); playingKey = null; clearHighlight(); markPlaying();
  }
  // key: "q3" | "q3~slow" ; wkey: nhóm từ để tô sáng
  function speak(key, text, { slow = false } = {}) {
    const same = playingKey === key;
    stopSpeak();
    if (same || !text) return;
    playRecStop();
    const token = ++speakToken;
    playingKey = key; markPlaying();
    const wkey = key.split("~")[0];
    const rate = slow ? Math.max(0.5, S.rate * 0.65) : S.rate;
    const voice = pickVoice(S.lang);
    const parts = (text.match(/[^.!?。！？\n]+[.!?。！？]*/g) || [text]).filter((s) => s.trim());
    let pos = 0;
    parts.forEach((s, i) => {
      const off = text.indexOf(s, pos); pos = off + s.length;
      const u = new SpeechSynthesisUtterance(s.trim());
      u.lang = S.lang; u.rate = rate; if (voice) u.voice = voice;
      u.onboundary = (e) => { if (token === speakToken) highlight(wkey, off + (s.length - s.trimStart().length) + e.charIndex); };
      if (i === parts.length - 1) {
        const done = () => { if (token === speakToken) { playingKey = null; clearHighlight(); markPlaying(); } };
        u.onend = done; u.onerror = done;
      }
      speechSynthesis.speak(u);
    });
  }

  /* ================= đọc nội dung chat gốc của AI Studio ================= */
  const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿️]/gu;
  const LABEL_HINT = /^[^\p{L}\p{N}]*Gợi ý ý tưởng\s*[:：]?\s*/iu;
  const LABEL_SAMPLE = /^[^\p{L}\p{N}]*Câu mẫu\s*[:：]?\s*/iu;
  const clean = (t) => t.replace(/\s+/g, " ").replace(EMOJI, "").replace(/\*\*/g, "").trim();
  const unquote = (t) => t.replace(/^["“”'‘’「」『』]+|["“”'‘’「」『』]+$/g, "").trim();

  function stripLabel(bq, re) {
    const c = bq.cloneNode(true);
    const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      n.nodeValue = n.nodeValue.replace(re, "");
      break;
    }
    // bỏ đoạn rỗng đầu
    const first = c.firstElementChild;
    if (first && !first.textContent.trim()) first.remove();
    return c;
  }
  function safeHTML(node) {
    const c = node.cloneNode(true);
    c.querySelectorAll("button, script, style, [class*=copy], [contenteditable]").forEach((n) => n.remove());
    return c.innerHTML;
  }
  function topBlocks(turn) {
    return $$("p, blockquote, table, ul, ol, h1, h2, h3, h4, h5, hr", turn).filter((el) =>
      !el.parentElement.closest("blockquote, table, ul, ol, p, li, ms-thought-chunk") && !el.closest("ms-thought-chunk"));
  }
  function textNoEm(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll("em, i").forEach((n) => n.remove());
    return c.textContent;
  }

  function parseModel(turn) {
    const r = { q: null, hint: "", sample: null, fb: [] };
    const blocks = topBlocks(turn);
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i], tag = b.tagName, txt = b.textContent.trim();
      if (tag === "BLOCKQUOTE") {
        if (txt.startsWith("🗣") || LABEL_SAMPLE.test(txt)) {
          const c = stripLabel(b, LABEL_SAMPLE);
          const trans = $$("em, i", c).map((e) => e.textContent.trim()).filter(Boolean);
          r.sample = { text: unquote(clean(textNoEm(c))), trans };
        } else if (txt.startsWith("💡") || LABEL_HINT.test(txt)) {
          r.hint = safeHTML(stripLabel(b, LABEL_HINT));
        } else r.fb.push(safeHTML(b));
      } else if (tag === "P" && txt.startsWith("🎤") && !r.q) {
        const m = txt.match(/Q\s*(\d+)/i);
        let trans = $$("em, i", b).map((e) => e.textContent.trim()).filter(Boolean).join(" ");
        const nx = blocks[i + 1];
        if (!trans && nx && nx.tagName === "P" && /^[(（]/.test(nx.textContent.trim())) { trans = nx.textContent.trim(); i++; }
        r.q = { n: m ? m[1] : "", text: unquote(clean(textNoEm(b)).replace(/^\s*Q\d+\s*[:：]\s*/i, "")), trans };
      } else {
        r.fb.push(tag === "P" ? `<p>${safeHTML(b)}</p>` : `<${tag.toLowerCase()}>${safeHTML(b)}</${tag.toLowerCase()}>`);
      }
    }
    return r;
  }

  function readChat() {
    const out = []; let u = 0;
    $$(".chat-turn-container").forEach((t) => {
      if (t.classList.contains("model")) out.push({ role: "model", ...parseModel(t) });
      else out.push({ role: "user", idx: u++, text: ($("ms-text-chunk", t)?.textContent || "").trim() });
    });
    return out;
  }
  const generating = () => /stop/i.test($("ms-run-button")?.innerText || "");

  /* ================= giao diện ================= */
  function buildUI() {
    const root = document.createElement("div");
    root.id = "sp-root";
    const langOpts = Object.entries(P.LANGS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
    root.innerHTML = `
      <button id="sp-fab" title="Bật chế độ luyện nói"><span>🎤</span></button>
      <div id="sp-app">
        <div class="sp-glow"></div>
        <header id="sp-top">
          <div class="sp-brand"><span class="sp-logo">🎤</span><b>Luyện nói</b><span id="sp-chip" class="sp-chip"></span></div>
          <div class="sp-top-actions">
            <button id="sp-new" class="sp-btn pri" title="Tạo chat mới, tự nạp prompt và bắt đầu">＋ Buổi mới</button>
            <button id="sp-gear" class="sp-icon" title="Cài đặt">⚙</button>
            <button id="sp-exit" class="sp-icon" title="Thoát chế độ luyện nói">✕</button>
          </div>
        </header>
        <main id="sp-stage"><div id="sp-feed"></div></main>
        <aside id="sp-drawer">
          <h3>Cài đặt</h3>
          <label>Ngôn ngữ luyện nói<select id="sp-lang">${langOpts}</select></label>
          <label>Chế độ<select id="sp-mode"><option value="ielts">IELTS Speaking</option><option value="chat">Hội thoại</option></select></label>
          <label>Ngôn ngữ phản hồi<select id="sp-out"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
          <label>Chủ đề<input type="text" id="sp-topic" placeholder="(tuỳ chọn) vd: travel, work"></label>
          <label>Giọng đọc<select id="sp-voice"></select></label>
          <label>Tốc độ đọc <span id="sp-rate-v"></span><input type="range" id="sp-rate" min="0.5" max="1.2" step="0.05"></label>
          <div class="sp-sw"><span>Tự đọc câu hỏi mới</span><input type="checkbox" id="sp-autoq"></div>
          <div class="sp-sw"><span>Chế độ nghe (che chữ câu hỏi)</span><input type="checkbox" id="sp-listen"></div>
          <div class="sp-sw"><span>Tự hiện bản dịch</span><input type="checkbox" id="sp-trans"></div>
          <button id="sp-apply" class="sp-btn">Nạp prompt vào chat đang mở</button>
          <p class="sp-keys">Phím tắt: <kbd>Alt</kbd>+<kbd>R</kbd> ghi/dừng · <kbd>Alt</kbd>+<kbd>P</kbd> nghe lại · <kbd>Alt</kbd>+<kbd>Enter</kbd> gửi · <kbd>Alt</kbd>+<kbd>L</kbd> nghe câu hỏi</p>
        </aside>
        <footer id="sp-dock">
          <div class="sp-wavebox">
            <canvas id="sp-wave"></canvas>
            <div id="sp-time" class="sp-time">00:00</div>
          </div>
          <div id="sp-ctrl"></div>
          <div id="sp-hint" class="sp-hint"></div>
        </footer>
      </div>
      <div id="sp-toast"></div>`;
    document.body.appendChild(root);

    $("#sp-fab").onclick = () => setOn(true);
    $("#sp-exit").onclick = () => setOn(false);
    $("#sp-gear").onclick = () => $("#sp-drawer").classList.toggle("open");
    $("#sp-lang").onchange = (e) => { S.lang = e.target.value; syncMode(); fillVoices(); save(); };
    $("#sp-mode").onchange = (e) => { S.mode = e.target.value; save(); };
    $("#sp-out").onchange = (e) => { S.output = e.target.value; save(); };
    $("#sp-topic").onchange = (e) => { S.topic = e.target.value.trim(); save(); };
    $("#sp-voice").onchange = (e) => { S.voiceName = e.target.value; save(); };
    $("#sp-rate").oninput = (e) => { S.rate = parseFloat(e.target.value); $("#sp-rate-v").textContent = S.rate.toFixed(2) + "×"; save(); };
    $("#sp-autoq").onchange = (e) => { S.autoQ = e.target.checked; save(); };
    $("#sp-listen").onchange = (e) => { S.listenOnly = e.target.checked; save(); render(true); };
    $("#sp-trans").onchange = (e) => { S.showTrans = e.target.checked; save(); render(true); };
    $("#sp-apply").onclick = async () => {
      try { await applyPrompt(); toast("Đã nạp prompt vào chat này."); } catch (e) { toast(e.message); }
    };
    $("#sp-new").onclick = newChat;
    $("#sp-ctrl").addEventListener("click", onDockClick);
    $("#sp-feed").addEventListener("click", onFeedClick);
    $("#sp-stage").addEventListener("click", () => $("#sp-drawer").classList.remove("open"));
    new ResizeObserver(sizeCanvas).observe($("#sp-wave"));
  }

  function syncMode() {
    const isEn = S.lang.startsWith("en");
    const ielts = $('#sp-mode option[value="ielts"]');
    if (ielts) ielts.disabled = !isEn;
    if (!isEn && S.mode === "ielts") S.mode = "chat";
    $("#sp-mode").value = S.mode;
  }

  function applyState() {
    html.classList.toggle("sp-on", S.on);
    $("#sp-lang").value = S.lang; syncMode(); fillVoices();
    $("#sp-out").value = S.output;
    $("#sp-topic").value = S.topic;
    $("#sp-rate").value = S.rate; $("#sp-rate-v").textContent = S.rate.toFixed(2) + "×";
    $("#sp-autoq").checked = S.autoQ; $("#sp-listen").checked = S.listenOnly; $("#sp-trans").checked = S.showTrans;
    if (S.on) { renderDock(); render(true); }
  }

  async function setOn(v) {
    S.on = v; await save(); applyState();
    if (v) { lastPath = ""; handleRoute(); }
    else { stopSpeak(); playRecStop(); }
  }

  /* ================= dòng thời gian (thay khung chat) ================= */
  const OV = {};            // trạng thái mở/đóng do người dùng bấm
  const isOpen = (k, d) => (k in OV ? OV[k] : d);
  let lastSig = "", autoSpoken = "";

  const words = (text, wkey) => {
    let h = "", re = /\S+/g, m;
    while ((m = re.exec(text))) h += `<span class="w" data-s="${m.index}">${esc(m[0])}</span> `;
    return `<span class="sp-words" data-wkey="${wkey}">${h}</span>`;
  };
  const spk = (key, label, slow) =>
    `<button class="sp-pill" data-speak="${key}${slow ? "~slow" : ""}" data-slow="${slow ? 1 : 0}">${label}</button>`;

  function render(force) {
    if (!S.on) return;
    const feed = $("#sp-feed"); if (!feed) return;
    const turns = readChat();
    const gen = generating();
    const sig = JSON.stringify([turns, gen, S.listenOnly, S.showTrans, OV, sent.map((x) => x && x.ms)]);
    if (!force && sig === lastSig) return;
    lastSig = sig;

    const lastModel = turns.map((t) => t.role).lastIndexOf("model");
    let h = "", qCount = 0;
    $("#sp-chip").textContent = "";
    if (!turns.length) {
      h = `<div class="sp-empty"><div class="sp-orb">🎤</div><h2>Sẵn sàng luyện nói?</h2>
        <p>Bấm bên dưới để tạo buổi luyện mới. Giám khảo sẽ hỏi, bạn nói, rồi nhận xét ngay.</p>
        <button class="sp-btn pri big" data-act="newchat">▶ Bắt đầu buổi luyện</button></div>`;
    }
    turns.forEach((t, i) => {
      if (t.role === "user") {
        if (t.idx === 0 && /^(bắt đầu|start)$/i.test(t.text)) return;
        const rec = sent[t.idx];
        h += `<section class="sp-card me"><div class="sp-who"><span class="av">🙂</span>Bạn đã nói</div>
          ${rec ? `<div class="sp-rec"><button class="sp-pill" data-playrec="${t.idx}">▶ Nghe lại bản ghi · ${fmt(rec.ms)}</button></div>`
                : `<div class="sp-muted">${esc(t.text || "(audio)")}</div>`}</section>`;
        return;
      }
      const latest = i === lastModel;
      let body = "";
      if (t.q) {
        qCount++;
        const k = "q" + i; TXT[k] = t.q.text;
        const hide = S.listenOnly && !isOpen("rv" + i, false);
        body += `<div class="sp-qrow">${t.q.n ? `<span class="sp-badge">Q${esc(t.q.n)}</span>` : ""}
          <div class="sp-q ${hide ? "blur" : ""}" ${hide ? `data-tog="rv${i}"` : ""}>${words(t.q.text, k)}</div></div>
          ${hide ? `<div class="sp-muted sm">Chế độ nghe: bấm 🔊 để nghe, bấm vào chữ để hiện câu hỏi.</div>` : ""}
          <div class="sp-btns">${spk(k, "🔊 Nghe")}${spk(k, "🐢 Chậm", 1)}
            ${t.q.trans ? `<button class="sp-pill ghost" data-tog="t${i}">🌐 Dịch</button>` : ""}
            ${t.hint ? `<button class="sp-pill ghost" data-tog="h${i}">💡 Gợi ý</button>` : ""}
            ${t.sample ? `<button class="sp-pill ghost" data-tog="s${i}">🗣 Câu mẫu</button>` : ""}</div>`;
        if (t.q.trans) body += `<div data-k="t${i}" class="sp-fold ${isOpen("t" + i, S.showTrans) ? "open" : ""}"><div class="sp-trans">${esc(t.q.trans)}</div></div>`;
        if (t.hint) body += `<div data-k="h${i}" class="sp-fold ${isOpen("h" + i, false) ? "open" : ""}"><div class="sp-box hint"><div class="sp-lab">💡 Gợi ý ý tưởng</div>${t.hint}</div></div>`;
        if (t.sample) {
          const sk = "s" + i; TXT[sk] = t.sample.text;
          body += `<div data-k="${sk}" class="sp-fold ${isOpen(sk, false) ? "open" : ""}"><div class="sp-box sample">
            <div class="sp-lab">🗣 Câu mẫu <span class="sp-btns inl">${spk(sk, "🔊 Nghe")}${spk(sk, "🐢 Chậm", 1)}</span></div>
            <div class="sp-sample">${words(t.sample.text, sk)}</div>
            ${t.sample.trans.map((x) => `<div class="sp-trans">${esc(x)}</div>`).join("")}
            <div class="sp-tip">Nghe → nhại theo từng câu → tự ghi âm của bạn.</div></div></div>`;
        }
      }
      if (t.fb.length) {
        const fk = "f" + i, open = isOpen(fk, latest);
        body += `<div class="sp-fbhead" data-tog="${fk}"><span>📝 ${t.q ? "Nhận xét & ghi chú" : "Giám khảo"}</span><i>${open ? "Ẩn ▴" : "Hiện ▾"}</i></div>
          <div data-k="${fk}" class="sp-fold ${open ? "open" : ""}"><div class="sp-fb">${t.fb.join("")}</div></div>`;
      }
      if (!body) body = `<div class="sp-dots"><i></i><i></i><i></i></div>`;
      h += `<section class="sp-card ex ${latest ? "latest" : ""}"><div class="sp-who"><span class="av">🎓</span>Giám khảo${gen && latest ? ` <span class="sp-live">đang soạn…</span>` : ""}</div>${body}</section>`;
    });
    if (gen && (!turns.length || turns[turns.length - 1].role === "user"))
      h += `<section class="sp-card ex"><div class="sp-who"><span class="av">🎓</span>Giám khảo</div><div class="sp-dots"><i></i><i></i><i></i></div></section>`;
    if (qCount) $("#sp-chip").textContent = qCount + " câu hỏi";

    const stage = $("#sp-stage");
    const nearBottom = stage.scrollHeight - stage.scrollTop - stage.clientHeight < 160;
    feed.innerHTML = h;
    markPlaying();
    if (nearBottom || force === "bottom") stage.scrollTo({ top: stage.scrollHeight, behavior: "smooth" });

    // tự đọc câu hỏi mới
    if (S.autoQ && !gen && lastModel >= 0 && turns[lastModel].q) {
      const key = "q" + lastModel + ":" + turns[lastModel].q.text;
      if (autoSpoken !== key) {
        const first = autoSpoken === "";
        autoSpoken = key;
        if (!first || turns.length <= 3) speak("q" + lastModel, turns[lastModel].q.text);
      }
    }
  }

  function onFeedClick(e) {
    const sp = e.target.closest("[data-speak]");
    if (sp) { const k = sp.dataset.speak, base = k.split("~")[0]; speak(k, TXT[base], { slow: sp.dataset.slow === "1" }); return; }
    const pr = e.target.closest("[data-playrec]");
    if (pr) { playRec(sent[+pr.dataset.playrec], pr); return; }
    const tg = e.target.closest("[data-tog]");
    if (tg) { const k = tg.dataset.tog, f = $(`[data-k="${k}"]`); OV[k] = f ? !f.classList.contains("open") : !isOpen(k, false); render(true); return; }
    if (e.target.closest('[data-act="newchat"]')) newChat();
  }
  let decoTimer;
  new MutationObserver(() => {
    if (!S.on) return;
    clearTimeout(decoTimer); decoTimer = setTimeout(() => render(), 250);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ================= micro riêng: sóng âm + file nghe lại ================= */
  let micStream = null, micCtx = null, analyser = null, mr = null, chunks = [];
  let peaks = [], lastPeakT = 0, curLevel = 0;
  const sent = [];                 // bản ghi đã gửi, theo thứ tự lượt user
  let rec = null;                  // bản ghi hiện tại { blob, url, ms }

  async function micStart() {
    peaks = []; curLevel = 0; chunks = [];
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = micCtx.createMediaStreamSource(micStream);
      analyser = micCtx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      mr = new MediaRecorder(micStream);
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.start();
    } catch { micCleanup(); }
  }
  function micCleanup() {
    try { micStream?.getTracks().forEach((t) => t.stop()); } catch {}
    try { micCtx?.close(); } catch {}
    micStream = micCtx = analyser = null;
  }
  function micStop() {
    return new Promise((res) => {
      if (!mr || mr.state === "inactive") { micCleanup(); mr = null; return res(null); }
      const rr = mr; mr = null;
      rr.onstop = () => { const b = chunks.length ? new Blob(chunks, { type: rr.mimeType }) : null; micCleanup(); res(b); };
      rr.stop();
    });
  }
  function micAbort() { try { if (mr && mr.state !== "inactive") { mr.onstop = null; mr.stop(); } } catch {} mr = null; micCleanup(); }

  /* ----- vẽ sóng ----- */
  const cv = () => $("#sp-wave");
  function sizeCanvas() {
    const c = cv(); if (!c) return;
    const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    c.width = Math.max(10, Math.round(r.width * d)); c.height = Math.max(10, Math.round(r.height * d));
    drawWave();
  }
  const audioEl = new Audio();
  let playhead = 0;
  function drawWave() {
    const c = cv(); if (!c || !S.on) return;
    const g = c.getContext("2d"), W = c.width, H = c.height, d = window.devicePixelRatio || 1;
    g.clearRect(0, 0, W, H);
    const barW = 3 * d, gap = 2 * d, step = barW + gap, n = Math.floor(W / step), mid = H / 2;
    let data = [];
    if (state === "recording") {
      if (analyser) {
        const buf = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(buf);
        let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128) / 128);
        curLevel = curLevel * 0.55 + m * 0.45;
        const now = performance.now();
        if (now - lastPeakT > 55) { peaks.push(curLevel); lastPeakT = now; }
      } else { curLevel = 0.15 + Math.abs(Math.sin(performance.now() / 180)) * 0.25; if (performance.now() - lastPeakT > 55) { peaks.push(curLevel); lastPeakT = performance.now(); } }
      data = peaks.slice(-n);
    } else if (state === "recorded" && peaks.length) {
      const per = peaks.length / n;
      for (let i = 0; i < n; i++) {
        let m = 0; const a = Math.floor(i * per), b = Math.max(a + 1, Math.floor((i + 1) * per));
        for (let j = a; j < b && j < peaks.length; j++) m = Math.max(m, peaks[j]);
        data.push(m);
      }
    }
    const grad = state === "recording" ? "#ef4444" : "#3b82f6";
    const start = state === "recording" ? n - data.length : 0;
    const ph = state === "recorded" ? Math.floor(playhead * n) : -1;
    for (let i = 0; i < n; i++) {
      const v = data[i - start];
      const has = v !== undefined && i >= start;
      const hgt = has ? Math.max(3 * d, Math.min(1, v * 2.4) * (H - 8 * d)) : 3 * d;
      g.fillStyle = !has ? "rgba(160,170,200,.22)" : (state === "recorded" && i > ph && ph >= 0 ? "rgba(160,170,200,.45)" : grad);
      const x = i * step, r = barW / 2;
      g.beginPath(); g.roundRect ? g.roundRect(x, mid - hgt / 2, barW, hgt, r) : g.rect(x, mid - hgt / 2, barW, hgt); g.fill();
    }
  }
  let raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      drawWave();
      if (state === "recording") {
        const t = $("#sp-time"); if (t) { t.textContent = fmt(Date.now() - t0); t.classList.toggle("good", Date.now() - t0 >= 15000); }
      }
      if (state === "recording" || (state === "recorded" && !audioEl.paused)) raf = requestAnimationFrame(tick);
    };
    tick();
  }
  audioEl.addEventListener("timeupdate", () => { playhead = audioEl.duration ? audioEl.currentTime / audioEl.duration : 0; });
  audioEl.addEventListener("ended", () => { playhead = 0; playRecStop(); drawWave(); });

  /* ----- nghe lại ----- */
  let playingRecBtn = null;
  function playRecStop() {
    audioEl.pause(); playingRecBtn = null;
    $$("[data-playrec].on, [data-act=play].on").forEach((b) => b.classList.remove("on"));
    const pb = $('[data-act="play"]'); if (pb) pb.textContent = "▶ Nghe lại";
  }
  function playRec(r, btn) {
    if (!r || !r.url) return;
    const same = playingRecBtn === btn && !audioEl.paused;
    stopSpeak(); playRecStop();
    if (same) return;
    audioEl.src = r.url; playhead = 0;
    audioEl.play().catch(() => toast("Không phát được bản ghi."));
    playingRecBtn = btn; btn?.classList.add("on");
    if (btn && btn.dataset.act === "play") btn.textContent = "⏸ Dừng";
    loop();
  }

  /* ================= ghi âm: điều khiển hộp thoại gốc để gửi lên AI ================= */
  let state = "idle", busy = false, t0 = 0, recMs = 0;
  const dlg = () => $("ms-mic-audio-dialog");
  const dlgBtn = (re) =>
    $$("ms-mic-audio-dialog button").find((b) => re.test(b.innerText + " " + (b.getAttribute("aria-label") || "")));

  function renderDock() {
    const d = $("#sp-ctrl"); if (!d) return;
    let h = "", hint = "";
    if (busy) { h = '<button class="sp-big" disabled><span class="sp-spin"></span></button>'; hint = "Đang xử lý…"; }
    else if (state === "idle") {
      h = '<button data-act="start" class="sp-big mic" title="Ghi âm (Alt+R)"><svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg></button>';
      hint = generating() ? "Giám khảo đang trả lời…" : "Bấm micro hoặc Alt+R để nói · mục tiêu 20–30 giây";
    } else if (state === "recording") {
      h = '<button data-act="stop" class="sp-big stop" title="Dừng (Alt+R)"><span class="sq"></span></button>';
      hint = "Đang nghe bạn nói… bấm để dừng";
    } else if (state === "recorded") {
      h = `<button data-act="cancel" class="sp-sm" title="Huỷ">✕<small>Huỷ</small></button>
           <button data-act="redo" class="sp-sm" title="Ghi lại">↻<small>Ghi lại</small></button>
           <button data-act="play" class="sp-pill2" title="Nghe lại (Alt+P)">▶ Nghe lại</button>
           <button data-act="send" class="sp-send" title="Gửi (Alt+Enter)">➤ Gửi</button>`;
      hint = "Nghe lại trước khi gửi · Alt+P nghe · Alt+Enter gửi";
    }
    if (d.dataset.h !== h) { d.innerHTML = h; d.dataset.h = h; }
    $("#sp-hint").textContent = hint;
    html.dataset.rec = state;
    const t = $("#sp-time");
    if (t) { if (state === "idle") t.textContent = "00:00"; if (state === "recorded") t.textContent = fmt(recMs); t.classList.toggle("good", state !== "idle" && (state === "recorded" ? recMs >= 15000 : false)); }
    loop();
  }

  async function guarded(fn) {
    if (busy) return;
    busy = true; html.classList.add("sp-busy"); renderDock();
    try { await fn(); } catch (e) { toast(e.message || String(e)); micAbort(); if (state !== "recorded") state = "idle"; }
    finally { busy = false; html.classList.remove("sp-busy"); renderDock(); }
  }

  async function beginNative() {
    const start = await waitFor(() => dlgBtn(/start recording/i));
    if (!start) throw new Error("Không thấy nút Start recording.");
    await micStart();
    start.click();
    if (!(await waitFor(() => dlgBtn(/stop recording/i), 6000))) throw new Error("Không bắt đầu ghi được (kiểm tra quyền micro của Chrome).");
    state = "recording"; t0 = Date.now(); lastPeakT = 0;
  }

  const startRecording = () => guarded(async () => {
    stopSpeak(); playRecStop();
    if (!dlg()) {
      const add = $("ms-add-media-button button");
      if (!add) throw new Error("Không thấy nút thêm media của AI Studio.");
      add.click();
      const item = await waitFor(() => $$(".mat-mdc-menu-panel button, .mat-mdc-menu-panel [role=menuitem]").find((b) => /record audio/i.test(b.innerText)));
      if (!item) throw new Error("Không thấy mục Record Audio.");
      item.click();
      if (!(await waitFor(dlg))) throw new Error("Hộp thoại ghi âm không mở.");
    }
    await beginNative();
  });

  const stopRecording = () => guarded(async () => {
    const b = dlgBtn(/stop recording/i); if (!b) throw new Error("Không đang ghi âm.");
    recMs = Date.now() - t0;
    b.click();
    if (!(await waitFor(() => dlgBtn(/add to prompt/i), 6000))) throw new Error("Không dừng được bản ghi.");
    const blob = await micStop();
    if (rec?.url) URL.revokeObjectURL(rec.url);
    rec = blob ? { blob, url: URL.createObjectURL(blob), ms: recMs } : { blob: null, url: "", ms: recMs };
    state = "recorded"; playhead = 0;
  });

  const redo = () => guarded(async () => {
    playRecStop();
    if (rec?.url) URL.revokeObjectURL(rec.url); rec = null;
    dlgBtn(/re-record/i)?.click();
    await beginNative();
  });

  const cancelRec = () => guarded(async () => {
    playRecStop(); micAbort();
    if (rec?.url) URL.revokeObjectURL(rec.url); rec = null;
    dlgBtn(/^\s*close\s*$/i)?.click();
    await waitFor(() => !dlg(), 3000);
    state = "idle";
  });

  const runBtn = () => {
    const b = $("ms-run-button button");
    return b && !b.disabled && b.getAttribute("aria-disabled") !== "true" ? b : null;
  };
  const sendRecording = () => guarded(async () => {
    playRecStop();
    const add = dlgBtn(/add to prompt/i); if (!add) throw new Error("Chưa có bản ghi để gửi.");
    const userCount = $$(".chat-turn-container:not(.model)").length;
    add.click();
    if (!(await waitFor(() => !dlg() && $("ms-prompt-box ms-prompt-audio"), 8000))) throw new Error("Không đính kèm được audio.");
    let btn = await waitFor(runBtn, 1500);
    if (!btn) {
      const ta = $("ms-prompt-box textarea");
      if (ta && !ta.value.trim()) setNative(ta, S.output === "en" ? "(My spoken answer is in the audio.)" : "(Câu trả lời của tôi nằm trong audio.)");
      btn = await waitFor(runBtn, 4000);
    }
    if (!btn) throw new Error("Nút Run đang bị khoá, hãy bấm Run thủ công.");
    btn.click();
    sent[userCount] = rec; rec = null; state = "idle";
    lastSig = ""; setTimeout(() => render("bottom"), 400);
  });

  function onDockClick(e) {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const a = el.dataset.act;
    if (a === "start") startRecording();
    else if (a === "stop") stopRecording();
    else if (a === "redo") redo();
    else if (a === "cancel") cancelRec();
    else if (a === "send") sendRecording();
    else if (a === "play") playRec(rec, el);
  }

  const latestQ = () => { const ks = Object.keys(TXT).filter((k) => k[0] === "q"); return ks.sort((a, b) => +a.slice(1) - +b.slice(1)).pop(); };
  window.addEventListener("keydown", (e) => {
    if (!S.on || !e.altKey) return;
    if (e.code === "KeyR") {
      e.preventDefault();
      if (state === "idle") startRecording(); else if (state === "recording") stopRecording();
    } else if (e.code === "Enter" && state === "recorded") { e.preventDefault(); sendRecording(); }
    else if (e.code === "KeyP" && state === "recorded") { e.preventDefault(); playRec(rec, $('[data-act="play"]')); }
    else if (e.code === "KeyL") { e.preventDefault(); const k = latestQ(); if (k) speak(k, TXT[k]); }
  }, true);

  // đồng bộ nếu hộp thoại bị đóng bằng cách khác (Esc...)
  setInterval(() => {
    if (!S.on || busy) return;
    if ((state === "recording" || state === "recorded") && !dlg()) { micAbort(); playRecStop(); state = "idle"; renderDock(); }
  }, 600);

  /* ================= nạp prompt / chat mới ================= */
  const sysTa = () => $('textarea[aria-label="System instructions"]');
  async function applyPrompt() {
    const text = P.buildPrompt(S);
    html.classList.add("sp-busy");
    try {
      let ta = sysTa();
      if (!ta) {
        const card = await waitFor(() => $("button.system-instructions-card"), 15000);
        if (!card) throw new Error("Không thấy ô System instructions (hãy mở panel Run settings một lần rồi thử lại).");
        card.click();
        ta = await waitFor(sysTa, 5000);
      }
      if (!ta) throw new Error("Không mở được ô System instructions.");
      setNative(ta, text);
      await sleep(400);
      $('.ms-sliding-right-panel-dialog button[aria-label="Close panel"]')?.click();
      await sleep(500);
    } finally { html.classList.remove("sp-busy"); }
  }

  async function startFlow(send) {
    await applyPrompt();
    if (!send) return;
    const ta = await waitFor(() => $("ms-prompt-box textarea"), 8000);
    if (!ta) throw new Error("Không thấy ô nhập chat.");
    setNative(ta, S.output === "en" ? "Start" : "Bắt đầu");
    const btn = await waitFor(runBtn, 5000);
    if (!btn) throw new Error("Nút Run đang bị khoá.");
    btn.click();
  }

  async function handleNewChat() {
    await sleep(800);
    const send = S.pending;
    if (S.pending) { S.pending = false; await save(); }
    sent.length = 0; autoSpoken = ""; for (const k in OV) delete OV[k];
    try { await startFlow(send); if (send) toast("Đã nạp prompt và bắt đầu."); }
    catch (e) { toast(e.message); }
  }

  const isNewChat = () => location.pathname.startsWith("/prompts/new_chat");
  async function newChat() {
    stopSpeak(); playRecStop();
    S.pending = true; await save();
    if (isNewChat()) handleNewChat();
    else location.href = "https://aistudio.google.com/prompts/new_chat";
  }

  let lastPath = "";
  function handleRoute() {
    const p = location.pathname;
    if (p === lastPath) return;
    lastPath = p;
    if (S.on && isNewChat()) handleNewChat();
    else if (S.on) { autoSpoken = ""; lastSig = ""; setTimeout(() => render("bottom"), 1200); }
  }

  /* ================= khởi động ================= */
  (async () => {
    S = await store.get();
    S.lang = P.LANGS[S.lang] ? S.lang : DEF.lang;
    buildUI(); loadVoices(); applyState(); sizeCanvas();
    handleRoute();
    setInterval(handleRoute, 700);
    setInterval(() => { if (S.on && !busy) { renderDock(); render(); } }, 1000);
  })();
})();
