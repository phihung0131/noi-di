/*
 * Chạy trong "MAIN world" của trang AI Studio (document_start).
 * Không mở micro lần hai: chỉ "nghe lén" stream mà hộp thoại ghi âm gốc yêu cầu,
 * rồi gửi mức âm (cho sóng) và file ghi (để nghe lại) về content script qua postMessage.
 */
(() => {
  if (window.__noidiTap) return;
  window.__noidiTap = true;
  const md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) return;
  const orig = md.getUserMedia.bind(md);
  const post = (type, extra) => window.postMessage({ __noidi: true, type, ...(extra || {}) }, "*");
  let cur = null;

  function finish(c, silent) {
    clearInterval(c.timer);
    try { c.s.getTracks().forEach((t) => t.stop()); } catch {}
    try { c.ctx.close(); } catch {}
    if (silent) return;
    const blob = c.chunks.length ? new Blob(c.chunks, { type: (c.mr && c.mr.mimeType) || "audio/webm" }) : null;
    post("blob", { url: blob ? URL.createObjectURL(blob) : null, ms: Date.now() - c.t0 });
  }
  function stop(silent) {
    if (!cur) { if (!silent) post("blob", { url: null, ms: 0 }); return; }
    const c = cur; cur = null;
    if (c.mr && c.mr.state !== "inactive") { c.mr.onstop = () => finish(c, silent); try { c.mr.stop(); } catch { finish(c, silent); } }
    else finish(c, silent);
  }
  function start(stream) {
    if (cur) stop(true);
    try {
      const s = stream.clone();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const an = ctx.createAnalyser();
      an.fftSize = 1024; an.smoothingTimeConstant = 0.6;
      ctx.createMediaStreamSource(s).connect(an);
      const chunks = [];
      let mr = null;
      try { mr = new MediaRecorder(s); mr.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data); mr.start(); } catch {}
      const buf = new Uint8Array(an.fftSize);
      const timer = setInterval(() => {
        an.getByteTimeDomainData(buf);
        let m = 0;
        for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128) / 128);
        post("level", { level: m });
      }, 50);
      cur = { s, ctx, mr, chunks, timer, t0: Date.now() };
      post("started");
    } catch (e) { post("error", { message: String(e) }); }
  }

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || !d.__noidiCmd) return;
    if (d.__noidiCmd === "stop") stop(false);
    else if (d.__noidiCmd === "abort") stop(true);
  });

  md.getUserMedia = async function (constraints) {
    const stream = await orig(constraints);
    try { if (constraints && constraints.audio) start(stream); } catch {}
    return stream;
  };
})();
