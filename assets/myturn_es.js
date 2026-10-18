// My Turn! for Spanish: pronunciation practice for words, phrases, folk-tale sentences and story words. Runs on the device; no audio leaves it.
import { createCore } from "./mtcore_es.js?v=2";
const T = window.TOPIC, B = window.BASE || "";
const pad = (k) => String(k + 1).padStart(2, "0");
const A = (v, id) => `${B}a/${T.slug}/${v}/${id}.mp3`;
const SETS = [
  ...(T.words && T.words.length ? [{ key: "words", label: "Words", items: T.words.map((w, k) => ({ text: w[0], img: `${B}a/${T.slug}/w${pad(k)}.webp`, audio: (v) => A(v, "w" + pad(k)) })) }] : []),
  ...(T.phrases && T.phrases.length ? [{ key: "say", label: "Say it!", section: 'section[aria-label="Say it"]', items: T.phrases.map((p, k) => ({ text: p[0], audio: (v) => A(v, "p" + (k + 1)) })) }] : []),
  ...(T.sentences && T.sentences.length ? [{ key: "tale", label: "Folk tale", section: 'section[aria-label="Folk tale"]', items: T.sentences.map((s, k) => ({ text: s, img: `${B}a/${T.slug}/s${k + 1}.webp`, audio: (v) => A(v, "s" + (k + 1)) })) }] : []),
  ...(T.story && T.story.length ? [{ key: "story", label: "Story words", items: T.story.map((s, k) => ({ text: s[0], audio: (v) => A(v, "v" + (k + 1)) })) }] : []),
];
const core = createCore();
let ov, mode = SETS[0] && SETS[0].key, i = 0, busy = false, stopNow = false, lastUrl = null, stream = null, model = false;
const $ = (s) => ov.querySelector(s);
const voice = () => { try { return localStorage.getItem("es-voice") || T.voice || "marisol"; } catch (e) { return T.voice || "marisol"; } };
const S = () => SETS.find((x) => x.key === mode) || SETS[0];
const list = () => S().items.map((x) => x.text);
const player = new Audio();
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function init() {
  const mic = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2z"/></svg>';
  const mkBtn = (cls, label, m) => { const b = document.createElement("button"); b.type = "button"; b.className = "td-proj td-mt " + cls; b.innerHTML = mic + label; b.addEventListener("click", () => open(m)); return b; };
  const ctr = document.querySelector(".td-controls"); const pj = document.getElementById("projbtn");
  if (ctr) ctr.insertBefore(mkBtn("", "My Turn", SETS[0].key), pj ? pj.nextSibling : null);
  SETS.forEach((st) => {
    let anchorRow = null;
    if (st.key === "story") { const h3 = document.querySelector(".es-h3"); anchorRow = h3 && h3.parentNode.classList.contains("td-h2row") ? h3.parentNode : null; }
    const sec = st.section && document.querySelector(st.section);
    const b = mkBtn("td-proj-sm", "My Turn", st.key);
    const row = anchorRow || (sec && sec.querySelector(".td-h2row"));
    if (!row) { if (sec && sec.querySelector(".td-h2")) sec.querySelector(".td-h2").after(b); return; }
    const pjs = row.querySelector(".td-proj");
    if (pjs) { const g = document.createElement("div"); g.className = "td-h2btns"; pjs.replaceWith(g); g.appendChild(b); g.appendChild(pjs); } else row.appendChild(b);
  });
  buildOverlay();
}

function buildOverlay() {
  ov = document.createElement("div");
  ov.className = "td-overlay mt-ov"; ov.hidden = true; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "My Turn");
  ov.innerHTML = `
  <button type="button" class="td-close">Close</button>
  <div class="td-ptabs" role="tablist" ${SETS.length < 2 ? "hidden" : ""}>${SETS.map((x) => `<button type="button" class="td-ptab" data-m="${x.key}">${x.label}</button>`).join("")}</div>
  <div class="mt-card">
    <div class="mt-count"></div>
    <img class="mt-pic" alt="">
    <div class="mt-word"></div>
    <div class="mt-en"></div>
    <button type="button" class="mt-listen">🔊 Escucha</button>
    <button type="button" class="mt-mic" disabled aria-label="My turn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2z"/></svg><span class="mt-micl">My turn!</span></button>
    <div class="mt-stars" aria-live="polite"></div>
    <div class="mt-msg"></div>
    <div class="mt-heard"></div>
    <button type="button" class="mt-me" hidden>▶ Hear me</button>
    <div class="mt-load" hidden><div class="mt-loadt">Getting the listening helper ready. This happens once. Your voice stays on this device.</div><div class="mt-bar"><i></i></div></div>
  </div>
  <div class="td-nav"><button type="button" class="td-arrow" data-d="-1" aria-label="Previous">‹</button><span class="td-count"></span><button type="button" class="td-arrow" data-d="1" aria-label="Next">›</button></div>
`;
  document.body.appendChild(ov);
  $(".td-close").onclick = close;
  ov.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { mode = b.dataset.m; i = 0; show(); }));
  ov.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => { i = (i + +b.dataset.d + list().length) % list().length; show(); }));
  $(".mt-listen").onclick = listen;
  $(".mt-mic").onclick = onMic;
  $(".mt-me").onclick = () => { if (lastUrl) { player.src = lastUrl; player.play().catch(() => {}); } };
  document.addEventListener("keydown", (e) => { if (ov.hidden) return; if (e.key === "Escape") close(); else if (e.key === "ArrowRight") ov.querySelector('[data-d="1"]').click(); else if (e.key === "ArrowLeft") ov.querySelector('[data-d="-1"]').click(); });
}
function open(m) { mode = m; i = 0; ov.hidden = false; document.body.style.overflow = "hidden"; show(); ensureModel(); }
function close() { ov.hidden = true; document.body.style.overflow = ""; player.pause(); stopNow = true; }
function show() {
  ov.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.m === mode)));
  const it = S().items[i], single = !/\s/.test(it.text);
  const pic = $(".mt-pic"); if (it.img) { pic.src = it.img; pic.hidden = false; } else { pic.removeAttribute("src"); pic.hidden = true; }
  $(".mt-word").classList.toggle("sent", !single);
  ov.querySelector(".td-count").textContent = $(".mt-count").textContent = `${i + 1} / ${list().length}`;
  clearResult();
}
function clearResult() {
  if (ov && list()) $(".mt-word").textContent = list()[i];
  $(".mt-stars").innerHTML = ""; $(".mt-heard").textContent = ""; $(".mt-me").hidden = true;
  $(".mt-msg").textContent = model ? "Tap 🔊, then tap the green button and say it." : "";
}
function listen() { player.src = S().items[i].audio(voice()); player.play().catch(() => {}); }

// ---- speech model (Whisper, in the browser) ----
let loading = null;
function ensureModel() {
  if (model) { $(".mt-mic").disabled = false; return; }
  if (loading) return;
  $(".mt-load").hidden = false;
  const files = {};
  const progress_callback = (p) => { if (p.status === "progress" && p.total) { files[p.file] = [p.loaded, p.total]; let a = 0, b = 0; for (const k in files) { a += files[k][0]; b += files[k][1]; } $(".mt-bar i").style.width = Math.round((100 * a) / b) + "%"; $(".mt-loadt").textContent = `Getting the listening helper ready (${Math.max(1, Math.round(b / 1e6))} MB, only the first time)…`; } };
  loading = core.load(progress_callback).then(() => { model = true; $(".mt-load").hidden = true; $(".mt-mic").disabled = false; clearResult(); })
    .catch((e) => { console.error(e); $(".mt-loadt").textContent = "The listening helper could not load. Check the internet and try again."; loading = null; });
}
window.__mtTest = async (url, m, idx) => { mode = m; i = idx; const f = await toMono16k(await (await fetch(url)).blob()); return core.check(f, S().items[idx].text); };

// ---- recording with auto-stop ----
async function record() {
  stream = stream || (await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }));
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
  const rec = new MediaRecorder(stream); const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const buf = new Float32Array(an.fftSize); let spoke = false, quiet = performance.now(); const t0 = performance.now();
  const single = !/\s/.test(S().items[i].text);
  const maxT = single ? 4000 : 8000, gapT = single ? 700 : 1100;
  rec.start();
  await new Promise((res) => { const tick = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; const rms = Math.sqrt(s / buf.length), now = performance.now(); if (rms > 0.02) { spoke = true; quiet = now; } if ((spoke && now - quiet > gapT) || now - t0 > maxT || (!spoke && now - t0 > 3500) || stopNow) return res(); requestAnimationFrame(tick); }; tick(); });
  stopNow = false;
  await new Promise((r) => { rec.onstop = r; rec.stop(); });
  ctx.close();
  return { blob: new Blob(chunks, { type: rec.mimeType }), spoke };
}
async function toMono16k(blob) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const d = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close();
  const off = new OfflineAudioContext(1, Math.ceil(d.duration * 16000), 16000);
  const s = off.createBufferSource(); s.buffer = d; s.connect(off.destination); s.start();
  return (await off.startRendering()).getChannelData(0);
}
const MSG = { 3: ["¡Muy bien! Great job!", "¡Perfecto!", "¡Excelente! You said it!"], 2: ["Almost! Listen and try again.", "So close! Try once more."], 1: ["Listen again, then try.", "Let’s try again together."] };
async function onMic() {
  const btn = $(".mt-mic"), lab = $(".mt-micl");
  if (busy) { stopNow = true; return; }
  busy = true; btn.classList.add("rec"); lab.textContent = "Listening…"; clearResult(); $(".mt-msg").textContent = "Say it now.";
  try {
    const { blob, spoke } = await record();
    btn.classList.remove("rec"); lab.textContent = "Checking…"; btn.disabled = true;
    if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(blob); $(".mt-me").hidden = false;
    if (!spoke) $(".mt-msg").textContent = "I didn’t hear you. Speak a little louder.";
    else {
      const target = list()[i], single = !/\s/.test(target);
      const { heard, stars, flags, extra = [] } = await core.check(await toMono16k(blob), target);
      $(".mt-stars").innerHTML = [1, 2, 3].map((k) => `<span class="${k <= stars ? "" : "off"}">★</span>`).join("");
      const m = MSG[stars]; $(".mt-msg").textContent = m[Math.floor(Math.random() * m.length)];
      if (stars < 3 && flags.length) {
        const w = flags.length === 1 ? "the word" : "the words";
        $(".mt-msg").textContent = stars > 1 ? `Almost! Check ${w} in red.` : `Listen again. Check ${w} in red.`;
        $(".mt-word").innerHTML = target.split(/\s+/).filter(Boolean).map((x, k) => flags.includes(k) ? `<span class="mt-bad">${esc(x)}</span>` : esc(x)).join(" ");
      }
      if (stars < 3 && !flags.length && extra.length) $(".mt-msg").textContent = "Almost! You said an extra word. Say just the words you see.";
      $(".mt-heard").textContent = stars < 3 && heard.trim() ? `I heard: “${heard.trim()}”` : "";
    }
  } catch (e) { console.error(e); $(".mt-msg").textContent = /Permission|NotAllowed/i.test(e.name + e.message) ? "Please allow the microphone, then try again." : "Something went wrong. Try again."; }
  busy = false; btn.classList.remove("rec"); btn.disabled = false; lab.textContent = "My turn!";
}

if (SETS.length) init();
