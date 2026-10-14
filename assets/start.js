// Start Here: projector (First Phrases + Alphabet) and My Turn for the first phrases.
(function () {
  var B = "../../";
  var P = [].map.call(document.querySelectorAll('section[aria-label="First phrases"] .td-tile'), function (b) {
    return { id: b.getAttribute("data-say"), text: b.querySelector(".td-word").textContent, img: b.querySelector("img").getAttribute("src") };
  });
  var L = [].map.call(document.querySelectorAll(".st-letter"), function (b) { return { id: b.getAttribute("data-say"), text: b.textContent.trim() }; });
  function voice() { try { var v = localStorage.getItem("tpd-voice"); return v === "mark" ? "mark" : "gia"; } catch (e) { return "gia"; } }
  function slow() { var s = document.querySelector('[data-speed="slow"]'); return s && s.getAttribute("aria-pressed") === "true"; }
  var el = new Audio();
  function play(id) { el.pause(); el.src = B + "a/start/" + voice() + "/" + id + (slow() ? "_slow" : "") + ".mp3"; el.play().catch(function () {}); }
  function h(tag, attrs, kids) { var n = document.createElement(tag); for (var k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); } (kids || []).forEach(function (c) { n.appendChild(c); }); return n; }
  var icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';

  // projector overlay
  var MODES = [["phrases", "First Phrases", P.length], ["letters", "Alphabet", L.length]], mode = "phrases", pi = 0;
  var ov = h("div", { "class": "td-overlay", role: "dialog", "aria-label": "Projector mode" }); ov.hidden = true;
  var tabs = h("div", { "class": "td-ptabs", role: "tablist" });
  MODES.forEach(function (m) { var t = h("button", { type: "button", "class": "td-ptab", "data-mode": m[0], text: m[1] }); t.addEventListener("click", function () { go(m[0], 0); }); tabs.appendChild(t); });
  var stage = h("div", { "class": "td-stage" });
  var prev = h("button", { type: "button", "class": "td-arrow", "aria-label": "Previous", text: "‹" }), next = h("button", { type: "button", "class": "td-arrow", "aria-label": "Next", text: "›" }), cnt = h("span", { "class": "td-count" });
  var closeB = h("button", { type: "button", "class": "td-close", text: "Close" });
  ov.appendChild(closeB); ov.appendChild(tabs); ov.appendChild(stage); ov.appendChild(h("div", { "class": "td-nav" }, [prev, cnt, next]));
  document.body.appendChild(ov);
  function n() { return mode === "phrases" ? P.length : L.length; }
  function cur() { return mode === "phrases" ? P[pi] : L[pi]; }
  function draw() {
    stage.innerHTML = ""; cnt.textContent = (pi + 1) + " / " + n();
    tabs.querySelectorAll(".td-ptab").forEach(function (t) { t.setAttribute("aria-selected", String(t.getAttribute("data-mode") === mode)); });
    var c;
    if (mode === "phrases") c = h("button", { type: "button", "class": "td-card td-pcard td-scard" }, [h("img", { src: P[pi].img, alt: "" }), h("span", { "class": "td-pbig", text: P[pi].text })]);
    else c = h("button", { type: "button", "class": "td-card td-lcard" }, [h("span", { "class": "td-lbig", text: L[pi].text })]);
    c.addEventListener("click", function () { play(cur().id); }); stage.appendChild(c);
  }
  function go(m, i) { mode = m; pi = (i + n()) % n(); draw(); play(cur().id); }
  function key(e) { if (e.key === "ArrowRight") go(mode, pi + 1); else if (e.key === "ArrowLeft") go(mode, pi - 1); else if (e.key === " ") { e.preventDefault(); play(cur().id); } else if (e.key === "Escape") close(); }
  function open(m) { ov.hidden = false; document.addEventListener("keydown", key); go(m, 0); }
  function close() { ov.hidden = true; document.removeEventListener("keydown", key); el.pause(); }
  prev.addEventListener("click", function () { go(mode, pi - 1); }); next.addEventListener("click", function () { go(mode, pi + 1); }); closeB.addEventListener("click", close);

  // buttons, same places as on the topic pages
  var pj = h("button", { type: "button", "class": "td-proj", id: "projbtn" }); pj.innerHTML = icon + "Projector"; pj.addEventListener("click", function () { open("phrases"); });
  document.querySelector(".td-controls").appendChild(pj);
  var sec = document.querySelector('section[aria-label="Alphabet"]'), h2 = sec && sec.querySelector(".td-h2");
  if (h2) { var b = h("button", { type: "button", "class": "td-proj td-proj-sm" }); b.innerHTML = icon + "Projector"; b.addEventListener("click", function () { open("letters"); });
    var row = h("div", { "class": "td-h2row" }); h2.parentNode.insertBefore(row, h2); row.appendChild(h2); row.appendChild(b); }

  // My Turn for the first phrases (the letters are too short to check reliably)
  window.MT_SETS = [{ key: "phrases", label: "First Phrases", kind: "sentence", items: P.map(function (p) { return { text: p.text, img: p.img, audio: function (v) { return B + "a/start/" + v + "/" + p.id + ".mp3"; } }; }) }];
  var mt = document.createElement("script"); mt.type = "module"; mt.src = B + "assets/myturn.js?v=7"; document.body.appendChild(mt);
})();
