// My First Words in English and Spanish: talking topic pages (Book 5).
// Audio files: a/w/NN/<voice>/wMM[_slow].mp3  voices: gia, mark (English) · marisol, leo (Spanish)
// Until a recorded file exists, the page falls back to the device's own voice and says so.
(function () {
  var T = window.TOPIC, B = window.BASE || "../../";
  var NN = String(T.n).padStart(2, "0"), IB = B + "a/w/" + NN + "/";
  var st = { lang: "both", who: "f", slow: false };
  try { var s = JSON.parse(localStorage.getItem("fw-prefs") || "{}"); for (var k in s) st[k] = s[k]; } catch (e) {}
  function save() { try { localStorage.setItem("fw-prefs", JSON.stringify(st)); } catch (e) {} }
  var VO = { en: { f: "gia", m: "mark" }, es: { f: "marisol", m: "leo" } };
  function wid(i) { return "w" + String(i + 1).padStart(2, "0"); }
  function h(tag, a, kids) { var e = document.createElement(tag); for (var k in a || {}) { if (k === "text") e.textContent = a[k]; else if (k === "html") e.innerHTML = a[k]; else e.setAttribute(k, a[k]); } (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }

  // ---- sound ----
  var cur = null, noted = false;
  function note() { if (noted) return; noted = true; var n = document.getElementById("fwnote"); if (n) n.hidden = false; }
  function tts(text, lang, done) {
    if (!("speechSynthesis" in window)) { done && done(); return; }
    var u = new SpeechSynthesisUtterance(text); u.lang = lang === "es" ? "es-MX" : "en-US"; u.rate = st.slow ? 0.6 : 0.9;
    var vs = speechSynthesis.getVoices().filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(lang) === 0; }); if (vs.length) u.voice = vs[0];
    u.onend = function () { done && done(); }; speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  function play1(i, lang, done) {
    var w = T.words[i], text = lang === "en" ? w[0] : w[1];
    var a = new Audio(IB + VO[lang][st.who] + "/" + wid(i) + (st.slow ? "_slow" : "") + ".mp3");
    cur = a; var fell = false;
    function fb() { if (fell) return; fell = true; note(); tts(text, lang, done); }
    a.onerror = fb; a.onended = function () { done && done(); };
    var p = a.play(); if (p && p.catch) p.catch(fb);
  }
  function say(i, onlyLang) {
    if (cur) { try { cur.pause(); } catch (e) {} }
    var L = onlyLang || st.lang;
    mark(i, true);
    var end = function () { mark(i, false); };
    if (L === "both") play1(i, "en", function () { setTimeout(function () { play1(i, "es", end); }, 250); });
    else play1(i, L, end);
  }
  function mark(i, on) { var c = document.querySelector('[data-i="' + i + '"]'); if (c) c.classList.toggle("on", on); }

  // ---- cards ----
  function esLabel(es) { var m = es.match(/^(el|la|los|las) (.*)$/); var d = h("span", { "class": "fw-es" }); if (m) { d.appendChild(h("span", { "class": "fw-art " + (m[1][0] === "e" || m[1] === "los" ? "el" : "la"), text: m[1] })); d.appendChild(document.createTextNode(" " + m[2])); } else d.textContent = es; return d; }
  var grid = document.getElementById("grid");
  T.words.forEach(function (w, i) {
    var b = h("button", { type: "button", "class": "fw-card", "data-i": i, "aria-label": w[0] + " / " + w[1] },
      [h("img", { src: IB + wid(i) + ".webp", alt: "", loading: "lazy", width: "300", height: "300" }), h("span", { "class": "fw-en", text: w[0] }), esLabel(w[1])]);
    b.addEventListener("click", function () { say(i); });
    grid.appendChild(b);
  });

  // ---- controls ----
  function group(attr, val) { document.querySelectorAll("[data-" + attr + "]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-" + attr) === String(val))); }); }
  function bind(attr, key, conv) { document.querySelectorAll("[data-" + attr + "]").forEach(function (b) { b.addEventListener("click", function () { st[key] = conv ? conv(b.getAttribute("data-" + attr)) : b.getAttribute("data-" + attr); save(); group(attr, b.getAttribute("data-" + attr)); }); }); }
  bind("lang", "lang"); bind("who", "who"); bind("speed", "slow", function (v) { return v === "slow"; });
  group("lang", st.lang); group("who", st.who); group("speed", st.slow ? "slow" : "normal");

  // ---- listen and find ----
  var lf = document.getElementById("find"), score = 0, tries = 0, target = -1;
  function round() {
    lf.innerHTML = ""; var opts = []; while (opts.length < 3) { var r = Math.floor(Math.random() * T.words.length); if (opts.indexOf(r) < 0) opts.push(r); }
    target = opts[Math.floor(Math.random() * 3)];
    var lang = st.lang === "both" ? (Math.random() < .5 ? "en" : "es") : st.lang;
    var sp = h("button", { type: "button", "class": "fw-spk", "aria-label": "Play the word", html: "🔊" }); sp.addEventListener("click", function () { if (cur) try { cur.pause(); } catch (e) {} play1(target, lang); });
    lf.appendChild(sp);
    opts.forEach(function (o) { var b = h("button", { type: "button", "class": "fw-opt" }, [h("img", { src: IB + wid(o) + ".webp", alt: "" })]); b.addEventListener("click", function () { tries++; if (o === target) { score++; b.classList.add("ok"); setTimeout(round, 900); } else b.classList.add("no"); document.getElementById("score").textContent = "⭐ " + score + " / " + tries; }); lf.appendChild(b); });
    setTimeout(function () { play1(target, lang); }, 300);
  }
  var startFind = document.getElementById("findgo"); if (startFind) startFind.addEventListener("click", function () { startFind.hidden = true; round(); });

  // ---- My Turn (speech practice, runs in the browser) ----
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, mt = document.getElementById("myturn");
  if (mt) {
    if (!SR) { mt.querySelector(".fw-mtmsg").textContent = "My Turn needs Chrome, Edge or Safari with a microphone. / Mi turno necesita Chrome, Edge o Safari con micrófono."; }
    var mi = 0, mlang = "en";
    function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ñ]/g, "").replace(/\b(el|la|los|las|the|a|an)\b/g, "").trim(); }
    function show() { var w = T.words[mi]; mt.querySelector("img").src = IB + wid(mi) + ".webp"; mt.querySelector(".fw-mtword").textContent = mlang === "en" ? w[0] : w[1]; mt.querySelector(".fw-mtmsg").textContent = "Listen, then press the microphone and say it. / Escucha, luego presiona el micrófono y dilo."; }
    mt.querySelectorAll("[data-mtlang]").forEach(function (b) { b.addEventListener("click", function () { mlang = b.getAttribute("data-mtlang"); mt.querySelectorAll("[data-mtlang]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); show(); }); });
    mt.querySelector(".fw-mtlisten").addEventListener("click", function () { play1(mi, mlang); });
    mt.querySelector(".fw-mtnext").addEventListener("click", function () { mi = (mi + 1) % T.words.length; show(); });
    mt.querySelector(".fw-mtmic").addEventListener("click", function () {
      if (!SR) return; var r = new SR(); r.lang = mlang === "es" ? "es-MX" : "en-US"; r.maxAlternatives = 5; var msg = mt.querySelector(".fw-mtmsg"); msg.textContent = "🎙️ …";
      r.onresult = function (e) { var want = norm(mlang === "en" ? T.words[mi][0] : T.words[mi][1]), ok = false, heard = ""; for (var k = 0; k < e.results[0].length; k++) { var t = norm(e.results[0][k].transcript); if (!heard) heard = e.results[0][k].transcript; if (t === want || t.indexOf(want) >= 0) ok = true; } msg.textContent = ok ? "⭐⭐⭐ Great! / ¡Muy bien!" : "I heard “" + heard + "”. Try again! / ¡Inténtalo otra vez!"; };
      r.onerror = function () { msg.textContent = "I didn't hear you. Try again. / No te escuché. Otra vez."; };
      r.start();
    });
    show();
  }

  // ---- projector ----
  var ov = document.getElementById("proj"), pi = 0;
  function pshow() { var w = T.words[pi]; ov.querySelector("img").src = IB + wid(pi) + ".webp"; ov.querySelector(".fw-pen").textContent = w[0]; var es = ov.querySelector(".fw-pes"); es.innerHTML = ""; es.appendChild(esLabel(w[1])); ov.querySelector(".fw-pcount").textContent = (pi + 1) + " / " + T.words.length; }
  document.getElementById("projbtn").addEventListener("click", function () { ov.hidden = false; pi = 0; pshow(); if (ov.requestFullscreen) ov.requestFullscreen().catch(function () {}); });
  ov.querySelector(".fw-close").addEventListener("click", function () { ov.hidden = true; if (document.fullscreenElement) document.exitFullscreen(); });
  ov.querySelector("[data-prev]").addEventListener("click", function () { pi = (pi + T.words.length - 1) % T.words.length; pshow(); });
  ov.querySelector("[data-next]").addEventListener("click", function () { pi = (pi + 1) % T.words.length; pshow(); });
  ov.querySelector(".fw-pcard").addEventListener("click", function () { say(pi); });
  document.addEventListener("keydown", function (e) { if (ov.hidden) return; if (e.key === "ArrowRight") ov.querySelector("[data-next]").click(); if (e.key === "ArrowLeft") ov.querySelector("[data-prev]").click(); if (e.key === " ") { e.preventDefault(); say(pi); } if (e.key === "Escape") ov.querySelector(".fw-close").click(); });
})();
