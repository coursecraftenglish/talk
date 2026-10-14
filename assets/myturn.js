// My Turn! — pronunciation practice for words and sentences. Runs on the device; no audio leaves it.
const T = window.TOPIC, B = window.BASE || "";

function init() {
  const mic = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2z"/></svg>';
  const mkBtn = (cls, label, mode) => { const b = document.createElement("button"); b.type = "button"; b.className = "td-proj td-mt " + cls; b.innerHTML = mic + label; b.addEventListener("click", () => open(mode)); return b; };
  const ctr = document.querySelector(".td-controls"); const pj = document.getElementById("projbtn");
  if (ctr) ctr.insertBefore(mkBtn("", "My Turn", "words"), pj ? pj.nextSibling : null);
  const sec = document.querySelector('section[aria-label="Say it"]');
  if (sec && T.phrases && T.phrases.length) {
    const b = mkBtn("td-proj-sm", "My Turn", "say");
    const pjs = sec.querySelector(".td-h2row .td-proj");
    if (pjs) { const g = document.createElement("div"); g.className = "td-h2btns"; pjs.replaceWith(g); g.appendChild(b); g.appendChild(pjs); }
    else sec.querySelector(".td-h2").after(b);
  }
  buildOverlay();
}

let ov, mode = "words", i = 0, busy = false, stopNow = false, lastUrl = null, stream = null;
const $ = (s) => ov.querySelector(s);
const wid = (k) => "w" + String(k + 1).padStart(2, "0");
const voice = () => { try { return localStorage.getItem("tpd-voice") || T.voice || "gia"; } catch (e) { return T.voice || "gia"; } };
const list = () => (mode === "words" ? T.words : T.phrases);
const audioId = () => (mode === "words" ? wid(i) : "p" + (i + 1));
const player = new Audio();

function buildOverlay() {
  ov = document.createElement("div");
  ov.className = "td-overlay mt-ov"; ov.hidden = true; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "My Turn");
  ov.innerHTML = `
  <button type="button" class="td-close">Close</button>
  <div class="td-ptabs" role="tablist"><button type="button" class="td-ptab" data-m="words">Words</button>${T.phrases && T.phrases.length ? '<button type="button" class="td-ptab" data-m="say">Sentences</button>' : ""}</div>
  <div class="mt-card">
    <div class="mt-count"></div>
    <img class="mt-pic" alt="">
    <div class="mt-word"></div>
    <button type="button" class="mt-listen">🔊 Listen</button>
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
  const words = mode === "words";
  $(".mt-pic").src = words ? `${B}a/${T.slug}/${wid(i)}.webp` : `${B}a/cast/${T.phraseCast[i]}.webp`;
  $(".mt-pic").classList.toggle("round", !words);
  $(".mt-word").textContent = list()[i]; $(".mt-word").classList.toggle("sent", !words);
  ov.querySelector(".td-count").textContent = $(".mt-count").textContent = `${i + 1} / ${list().length}`;
  clearResult();
}
function clearResult() {
  $(".mt-stars").innerHTML = ""; $(".mt-heard").textContent = ""; $(".mt-me").hidden = true;
  $(".mt-msg").textContent = model ? `Tap 🔊, then tap the green button and say the ${mode === "words" ? "word" : "sentence"}.` : "";
}
function listen() { player.src = `${B}a/${T.slug}/${voice()}/${audioId()}.mp3`; player.play().catch(() => {}); }

// ---- speech model (Whisper tiny, in the browser) ----
const M = "Xenova/whisper-tiny.en", SOT = [50257, 50362], EOT = 50256;
let tf, proc, tok, mdl, model = false, loading = null;
function ensureModel() {
  if (model) { $(".mt-mic").disabled = false; return; }
  if (loading) return;
  $(".mt-load").hidden = false;
  const files = {};
  const progress_callback = (p) => { if (p.status === "progress" && p.total) { files[p.file] = [p.loaded, p.total]; let a = 0, b = 0; for (const k in files) { a += files[k][0]; b += files[k][1]; } $(".mt-bar i").style.width = Math.round((100 * a) / b) + "%"; $(".mt-loadt").textContent = `Getting the listening helper ready (${Math.max(1, Math.round(b / 1e6))} MB, only the first time)…`; } };
  loading = (async () => {
    tf = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2");
    tf.env.allowLocalModels = false;
    proc = await tf.AutoProcessor.from_pretrained(M, { progress_callback });
    tok = await tf.AutoTokenizer.from_pretrained(M, { progress_callback });
    mdl = await tf.WhisperForConditionalGeneration.from_pretrained(M, { dtype: "q8", device: "wasm", progress_callback });
    model = true; $(".mt-load").hidden = true; $(".mt-mic").disabled = false; clearResult();
  })().catch((e) => { console.error(e); $(".mt-loadt").textContent = "The listening helper could not load. Check the internet and try again."; loading = null; });
}
function lsm(d, o, V, id) { let mx = -1e9; for (let v = 0; v < V; v++) if (d[o + v] > mx) mx = d[o + v]; let z = 0; for (let v = 0; v < V; v++) z += Math.exp(d[o + v] - mx); return d[o + id] - mx - Math.log(z); }
async function dec(enc, ids) { const t = new tf.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]); return (await mdl({ encoder_outputs: enc, decoder_input_ids: t })).logits; }
async function seqLP(enc, ids) { const L = await dec(enc, ids), V = L.dims[2], d = L.data; let s = 0, n = 0; for (let k = SOT.length - 1; k < ids.length - 1; k++) { s += lsm(d, k * V, V, ids[k + 1]); n++; } return s / n; }
async function hear(f32) {
  const { input_features } = await proc(f32);
  const r = await mdl.sessions.model.run({ input_features: input_features.ort_tensor });
  const enc = new tf.Tensor(r.last_hidden_state);
  const ids = SOT.slice(); let s = 0, n = 0;
  for (let k = 0; k < 30; k++) { const L = await dec(enc, ids), V = L.dims[2], d = L.data, o = (ids.length - 1) * V; let bi = 0, bv = -1e9; for (let v = 0; v < V; v++) if (d[o + v] > bv) { bv = d[o + v]; bi = v; } s += lsm(d, o, V, bi); n++; ids.push(bi); if (bi === EOT) break; }
  if (ids[ids.length - 1] !== EOT) ids.push(EOT);
  return { enc, heard: tok.decode(ids.slice(SOT.length, -1), { skip_special_tokens: true }), lg: s / n };
}
async function targetLP(enc, target) {
  const cap = target[0].toUpperCase() + target.slice(1);
  const vars = mode === "words" ? [" " + cap + ".", " " + target, " " + cap] : [" " + target, " " + target.replace(/[.!?]+$/, "")];
  let best = -1e9; for (const v of vars) best = Math.max(best, await seqLP(enc, SOT.concat(tok.encode(v, { add_special_tokens: false }), [EOT])));
  return best;
}

// ---- matching that forgives sound-alikes (write/right, aunt/ant) ----
const NUM = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20" };
const norm = (s) => s.toLowerCase().replace(/[’']/g, "").replace(/okay/g, "ok").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").map((w) => NUM[w] || w).join(" ");
function key(s) { s = norm(s).replace(/ /g, ""); s = s.replace(/^wr/, "r").replace(/^kn/, "n").replace(/ph/g, "f").replace(/gh/g, "").replace(/tch/g, "ch").replace(/dg/g, "j").replace(/ck/g, "k").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/q/g, "k").replace(/x/g, "ks").replace(/z/g, "s"); const f = s[0] || ""; return (f + s.slice(1).replace(/[aeiouyhw]/g, "")).replace(/(.)\1+/g, "$1"); }
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);
function textScore(heard, target) {
  const H = norm(heard), Tn = norm(target); if (!H) return 0;
  if (mode === "say") { const hw = H.split(" "), tw = Tn.split(" "); const s = 1 - lev(hw, tw) / Math.max(hw.length, tw.length); const ks = sim(key(H), key(Tn)); return s >= 0.85 || ks >= 0.9 ? 3 : 1; }
  const hw = H.split(" "), n = Tn.split(" ").length;
  for (let s = 0; s < hw.length; s++) for (let L = Math.max(1, n - 1); L <= n + 1; L++) { const part = hw.slice(s, s + L).join(" "); if (part && (part === Tn || key(part) === key(Tn))) return 3; }
  return 1;
}
async function check(f32) {
  const target = list()[i]; const { enc, heard, lg } = await hear(f32);
  let st = textScore(heard, target), gap = null;
  if (st < 3) { gap = lg - (await targetLP(enc, target)); st = gap <= 2 ? 3 : gap <= 4.5 ? 2 : 1; }
  window.__mtLast = { heard, gap };
  return { heard, st };
}
window.__mtTest = async (url, m, idx) => { mode = m; i = idx; const f = await toMono16k(await (await fetch(url)).blob()); const t0 = performance.now(); const r = await check(f); return { ...r, gap: window.__mtLast.gap, ms: Math.round(performance.now() - t0) }; };

// ---- recording with auto-stop ----
async function record() {
  stream = stream || (await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }));
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
  const rec = new MediaRecorder(stream); const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const buf = new Float32Array(an.fftSize); let spoke = false, quiet = performance.now(); const t0 = performance.now();
  const maxT = mode === "words" ? 4000 : 7000, gapT = mode === "words" ? 700 : 1000;
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
const MSG = { 3: ["Great job!", "You said it!", "Perfect!"], 2: ["Almost! Listen and try again.", "So close! Try once more."], 1: ["Listen again, then try.", "Let’s try again together."] };
async function onMic() {
  const btn = $(".mt-mic"), lab = $(".mt-micl");
  if (busy) { stopNow = true; return; }
  busy = true; btn.classList.add("rec"); lab.textContent = "Listening…"; clearResult(); $(".mt-msg").textContent = mode === "words" ? "Say the word now." : "Say the sentence now.";
  try {
    const { blob, spoke } = await record();
    btn.classList.remove("rec"); lab.textContent = "Checking…"; btn.disabled = true;
    if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(blob); $(".mt-me").hidden = false;
    if (!spoke) $(".mt-msg").textContent = "I didn’t hear you. Speak a little louder.";
    else {
      const { heard, st } = await check(await toMono16k(blob));
      $(".mt-stars").innerHTML = [1, 2, 3].map((k) => `<span class="${k <= st ? "" : "off"}">★</span>`).join("");
      const m = MSG[st]; $(".mt-msg").textContent = m[Math.floor(Math.random() * m.length)];
      $(".mt-heard").textContent = st < 3 && heard.trim() ? `I heard: “${heard.trim()}”` : "";
    }
  } catch (e) { console.error(e); $(".mt-msg").textContent = /Permission|NotAllowed/i.test(e.name + e.message) ? "Please allow the microphone, then try again." : "Something went wrong. Try again."; }
  busy = false; btn.classList.remove("rec"); btn.disabled = false; lab.textContent = "My turn!";
}

if (T) init();
