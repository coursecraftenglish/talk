// My Turn core for Spanish: loads a multilingual Whisper in the browser and scores a spoken attempt against the exact target text.
// Strict by design: the target spelling is force-decoded and every word has to fit; wrong or missing words are returned as flags.
export function createCore(M = "Xenova/whisper-base") {
  const SOT = [50258, 50262, 50359, 50363], EOT = 50257; // <|sot|><|es|><|transcribe|><|notimestamps|>
  let tf, proc, tok, mdl, ready = null;
  const TH = { w3: -5, w2: -9.5, flag: -4.5, bad: -7.7 }; // calibrated on 336 test clips (true targets min -7.4 / words >= -3.5; wrong targets <= -10.4)
  async function load(progress_callback) {
    if (ready) return ready;
    ready = (async () => {
      tf = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2");
      tf.env.allowLocalModels = false;
      proc = await tf.AutoProcessor.from_pretrained(M, { progress_callback });
      tok = await tf.AutoTokenizer.from_pretrained(M, { progress_callback });
      mdl = await tf.WhisperForConditionalGeneration.from_pretrained(M, { dtype: "q8", device: "wasm", progress_callback });
      return true;
    })().catch((e) => { ready = null; throw e; });
    return ready;
  }
  function lsm(d, o, V, id) { let mx = -1e9; for (let v = 0; v < V; v++) if (d[o + v] > mx) mx = d[o + v]; let z = 0; for (let v = 0; v < V; v++) z += Math.exp(d[o + v] - mx); return d[o + id] - mx - Math.log(z); }
  async function dec(enc, ids) { const t = new tf.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]); return (await mdl({ encoder_outputs: enc, decoder_input_ids: t })).logits; }
  async function hear(f32) {
    const { input_features } = await proc(f32);
    const r = await mdl.sessions.model.run({ input_features: input_features.ort_tensor });
    const enc = new tf.Tensor(r.last_hidden_state);
    const ids = SOT.slice();
    for (let k = 0; k < 40; k++) {
      const L = await dec(enc, ids), V = L.dims[2], d = L.data, o = (ids.length - 1) * V; let bi = 0, bv = -1e9;
      for (let v = 0; v < V; v++) if (d[o + v] > bv) { bv = d[o + v]; bi = v; }
      ids.push(bi); if (bi === EOT) break;
    }
    if (ids[ids.length - 1] !== EOT) ids.push(EOT);
    return { enc, heard: tok.decode(ids.slice(SOT.length, -1), { skip_special_tokens: true }) };
  }
  const NUM = { uno: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9", diez: "10", once: "11", doce: "12", trece: "13", catorce: "14", quince: "15", "dieciséis": "16", diecisiete: "17", dieciocho: "18", diecinueve: "19", veinte: "20" };
  const isPunct = (s) => /^[\s.,!?¿¡…:;"'«»()\-–—]*$/.test(s);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
  const nw = (s) => norm(s).split(" ").filter(Boolean).map((w) => { const k = Object.keys(NUM).find((x) => norm(x) === w); return k ? NUM[k] : w; });
  // per token log-probabilities of a forced text, grouped by the text's own words (punctuation tokens ignored)
  async function wordScores(enc, text) {
    const t = tok.encode(" " + text, { add_special_tokens: false }); const ids = SOT.concat(t, [EOT]);
    const L = await dec(enc, ids), V = L.dims[2], d = L.data;
    const full = " " + text, spans = []; { const re = /\S+/g; let m; while ((m = re.exec(full))) spans.push([m.index, m.index + m[0].length]); }
    const words = text.split(/\s+/).filter(Boolean).map((w) => ({ w, lp: 0, n: 0 }));
    let prevLen = 0;
    for (let k = 0; k < t.length; k++) {
      const cur = tok.decode(t.slice(0, k + 1)).length, piece = tok.decode([t[k]]);
      const pos = Math.max(0, Math.min(full.length - 1, cur - 1));
      let wi = spans.findIndex((s) => pos >= s[0] && pos < s[1]); if (wi < 0) wi = spans.findIndex((s) => pos < s[0]); if (wi < 0) wi = words.length - 1;
      prevLen = cur;
      if (isPunct(piece)) continue;
      const lp = lsm(d, (SOT.length - 1 + k) * V, V, t[k]);
      const w = words[wi]; w.lp = w.n ? Math.min(w.lp, lp) : lp; w.n++;
    }
    return words;
  }
  // best fit for one spoken word (several spellings): the weakest sound-piece must fit
  async function wordFit(enc, word) {
    const cap = word[0].toUpperCase() + word.slice(1); const vars = [" " + cap + ".", " " + word, " " + cap];
    const nn = NUM[word.toLowerCase()]; if (nn) vars.push(" " + nn + ".");
    let best = -1e9;
    for (const v of vars) {
      const t = tok.encode(v, { add_special_tokens: false }); const L = await dec(enc, SOT.concat(t, [EOT])), V = L.dims[2], d = L.data; let mn = 0;
      for (let k = 0; k < t.length; k++) { if (isPunct(tok.decode([t[k]]))) continue; mn = Math.min(mn, lsm(d, (SOT.length - 1 + k) * V, V, t[k])); }
      best = Math.max(best, mn);
    }
    return best;
  }
  // similarity of two words (0..1) by edit distance
  function sim(a, b) { const m = a.length, n = b.length; if (!m || !n) return 0; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return 1 - p[n] / Math.max(m, n); }
  // heard words that match no target word (extra words the child said)
  function extras(heard, target) { const T = nw(target), H = nw(heard), used = T.map(() => false), ex = []; for (const w of H) { let bi = -1, bs = 0; T.forEach((x, i) => { if (!used[i]) { const r = sim(w, x); if (r > bs) { bs = r; bi = i; } } }); if (bs >= 0.6) used[bi] = true; else ex.push(w); } return ex; }
  // returns {stars 1-3, heard, flags:[word indexes in target.split(/\s+/)], detail}
  async function check(f32, target) {
    const { enc, heard } = await hear(f32);
    const tw = target.split(/\s+/).filter(Boolean);
    const H = nw(heard).join(" "), Tn = nw(target).join(" ");
    if (H && H === Tn) return { stars: 3, heard, flags: [], detail: { exact: true } };
    if (tw.length === 1) {
      const gap = await wordFit(enc, target.replace(/[¿¡?!.,]/g, ""));
      return { stars: gap >= TH.w3 ? 3 : gap >= TH.w2 ? 2 : 1, heard, flags: gap >= TH.w3 ? [] : [0], detail: { gap } };
    }
    const ws = await wordScores(enc, target);
    const flags = ws.map((x, k) => (x.n && x.lp < TH.flag ? k : -1)).filter((k) => k >= 0);
    const bad = ws.filter((x) => x.n && x.lp < TH.bad).length, allow = tw.length >= 7 ? 2 : 1;
    let stars = flags.length === 0 ? 3 : bad === 0 && flags.length <= allow ? 2 : 1;
    const extra = extras(heard, target);
    if (extra.length) stars = Math.min(stars, extra.length === 1 ? 2 : 1); // extra words: never 3 stars
    return { stars, heard, flags, extra, detail: { lp: ws.map((x) => +x.lp.toFixed(2)) } };
  }
  return { load, check, hear, TH, norm, nw, get ready() { return !!ready; } };
}
