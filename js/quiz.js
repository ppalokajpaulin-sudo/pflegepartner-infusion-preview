/* =============================================================
   Pflegepartner AG — Infusions-Check (Quiz-Funnel) · quiz.js
   7 Fragen → Empfehlung → Kontakt → POST an Leads-Dashboard.
   ============================================================= */
(function () {
  "use strict";

  /* --- KONFIG ------------------------------------------------------ */
  var FORM_ENDPOINT = "https://pflegepartner-leads-production.up.railway.app/api/lead";
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    FORM_ENDPOINT = "http://localhost:4174/api/lead";
  }
  var THANKS_URL = "danke.html";
  var STORE_KEY = "pp-infusions-check-v1";
  var QUIZ_VERSION = 1;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: ev }, data || {})); } catch (e) {}
  }
  function fbTrack(ev, data) { try { if (window.fbq) window.fbq("trackCustom", ev, data || {}); } catch (e) {} }
  function cookie(name) { var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }

  /* --- Produkte (Namen = identisch mit den Landingpage-Formularen) --- */
  var PRODUCTS = {
    vitamine:   { name: "Vitaminpräparat",        price: "ab CHF 200.–", img: "assets/img/p-vitaminpraeparat.png", url: "https://vitamine.pflegepartner.ch",
                  tagline: "Einzelne Vitamine — gezielt statt Kombiprodukt.",
                  fit: "Statt Kombiprodukt bekommst du gezielt das Vitamin, das dir fehlt — vom Arzt ausgewählt und dosiert." },
    vital:      { name: "Vital+",                 price: "CHF 249.–",    img: "assets/img/p-vital.png",            url: "https://vital.pflegepartner.ch",
                  tagline: "Dein individueller Nährstoff-Boost.",
                  fit: "Vitamin C, B12, Magnesium, B-Komplex, Zink und Selen — der Allrounder für Energie und Vitalität, individuell auf dich abgestimmt." },
    glutathion: { name: "Glutathion",             price: "CHF 260.–",    img: "assets/img/p-glutathion.png",       url: "https://glutathion.pflegepartner.ch",
                  tagline: "Das körpereigene Antioxidans.",
                  fit: "Glutathion ist das körpereigene Antioxidans — ausgelegt auf Zellschutz, Regeneration und ein frisches Hautbild." },
    recovery:   { name: "Recovery / Hangover-Boost", price: "CHF 289.–", img: "assets/img/p-recovery.png",         url: "https://recovery.pflegepartner.ch",
                  tagline: "Schnelle Erholung — in 30–60 Minuten.",
                  fit: "Flüssigkeit, Elektrolyte und Vitamine in 30–60 Minuten — für schnelle Erholung nach Training, Krankheit oder einer langen Nacht." },
    immune:     { name: "Immune Boost",           price: "CHF 299.–",    img: "assets/img/p-immune.png",           url: "https://immune.pflegepartner.ch",
                  tagline: "Unterstützung für dein Immunsystem.",
                  fit: "Hochdosierte Vitamine, Antioxidantien und Elektrolyte — ausgelegt auf dein Immunsystem, gerade bei und nach Infekten." },
    nad:        { name: "NAD+",                   price: "CHF 580.–",    img: "assets/img/p-nad.png",              url: "https://nad.pflegepartner.ch",
                  tagline: "Zellenergie & Regeneration.",
                  fit: "NAD⁺ ist das körpereigene Coenzym für Energiestoffwechsel und Regeneration — beliebt bei Fokus, Longevity und Anti-Aging." },
    beauty:     { name: "Beauty-Cocktail (NAD+)", price: "CHF 899.–",    img: "assets/img/p-beauty.png",           url: "https://beauty.pflegepartner.ch",
                  tagline: "Zellregeneration von innen.",
                  fit: "NAD⁺ Boost mit Vitaminen, Magnesium und Glutathion-Push — Zellregeneration von innen für Vitalität und Ausstrahlung." }
  };
  var PRICE_RANK = { vitamine: 1, vital: 2, glutathion: 3, recovery: 4, immune: 5, nad: 6, beauty: 7 };

  /* --- Fragen ------------------------------------------------------- */
  var STEPS = [
    { id: "ziel", q: "Was möchtest du mit einer Infusion erreichen?", hint: "Wähle dein wichtigstes Ziel.", type: "single", cols: 2, opts: [
      { v: "energie",      l: "Mehr Energie im Alltag",            s: "Weniger müde, mehr Antrieb" },
      { v: "immun",        l: "Immunsystem stärken",               s: "Seltener krank, schneller wieder fit" },
      { v: "regeneration", l: "Schneller regenerieren",            s: "Nach Sport, Krankheit oder langer Nacht" },
      { v: "beauty",       l: "Haut & Ausstrahlung",               s: "Beauty von innen" },
      { v: "longevity",    l: "Anti-Aging & Zellschutz",           s: "Longevity, Zellenergie, Fokus" },
      { v: "mangel",       l: "Einen Vitaminmangel ausgleichen",   s: "Gezielt einzelne Vitamine" }
    ]},
    { id: "befinden", q: "Wie fühlst du dich in letzter Zeit?", hint: "Mehrfachauswahl möglich.", type: "multi", cols: 2, opts: [
      { v: "muede",     l: "Müde und ausgelaugt" },
      { v: "erkaeltet", l: "Oft erkältet oder angeschlagen" },
      { v: "haut",      l: "Fahle Haut, müder Teint" },
      { v: "muskeln",   l: "Muskelkater, langsame Erholung" },
      { v: "fokus",     l: "Konzentrationsprobleme, „Brain Fog“" },
      { v: "gut",       l: "Eigentlich gut — ich möchte vorbeugen" }
    ]},
    { id: "alltag", q: "Wie sieht dein Alltag gerade aus?", type: "single", cols: 1, opts: [
      { v: "stress",  l: "Viel Stress, wenig Schlaf" },
      { v: "sport",   l: "Viel Sport und Training" },
      { v: "infekt",  l: "Gerade eine Erkältung oder einen Infekt überstanden" },
      { v: "party",   l: "Intensive Wochen — Reisen, Events, lange Nächte" },
      { v: "balance", l: "Ausgewogen — ich achte auf mich" }
    ]},
    { id: "erfahrung", q: "Hattest du schon einmal eine Vitamin-Infusion?", type: "single", cols: 1, opts: [
      { v: "nein",         l: "Nein, das wäre das erste Mal" },
      { v: "einmal",       l: "Ja, ein- oder zweimal" },
      { v: "regelmaessig", l: "Ja, regelmässig" }
    ]},
    { id: "zeitraum", q: "Wann möchtest du starten?", type: "single", cols: 2, opts: [
      { v: "So bald wie möglich", l: "So bald wie möglich" },
      { v: "Diese Woche",         l: "Diese Woche" },
      { v: "Diesen Monat",        l: "Diesen Monat" },
      { v: "Nur informieren",     l: "Ich möchte mich erst informieren" }
    ]},
    { id: "plz", q: "Wo sollen wir zu dir kommen?", hint: "Deine Postleitzahl. Wir sind im Zürcher Unterland, in Winterthur und im ganzen Kanton Zürich unterwegs.", type: "plz" },
    { id: "medizin", q: "Kurzer Gesundheits-Check", hint: "Damit unser Arzt dich vorab richtig einschätzen kann. Details klären wir persönlich — bitte keine sensiblen Gesundheitsdaten hier eintragen.", type: "medical", groups: [
      { id: "arzt_behandlung", q: "Bist du aktuell in ärztlicher Behandlung?", opts: ["Nein", "Ja", "Bin mir nicht sicher"] },
      { id: "vorerkrankungen", q: "Bestehen relevante Vorerkrankungen?",      opts: ["Nein", "Ja", "Möchte ich im Gespräch klären"] },
      { id: "medikamente",     q: "Nimmst du regelmässig Medikamente ein?",   opts: ["Nein", "Ja, regelmässig", "Nur gelegentlich"] }
    ]}
  ];
  var TOTAL = STEPS.length;

  /* --- Empfehlungs-Logik: Punkte pro Produkt ------------------------ */
  var W = {
    ziel: {
      energie:      { vital: 4, nad: 2, vitamine: 1 },
      immun:        { immune: 4, vital: 1, vitamine: 1 },
      regeneration: { recovery: 4, glutathion: 1, nad: 1 },
      beauty:       { beauty: 4, glutathion: 2 },
      longevity:    { nad: 4, glutathion: 2, beauty: 1 },
      mangel:       { vitamine: 4, vital: 2 }
    },
    befinden: {
      muede:     { vital: 2, nad: 1 },
      erkaeltet: { immune: 2, vital: 1 },
      haut:      { glutathion: 2, beauty: 1 },
      muskeln:   { recovery: 2 },
      fokus:     { nad: 2 },
      gut:       { vital: 1, vitamine: 1 }
    },
    alltag: {
      stress:  { nad: 1, vital: 1 },
      sport:   { recovery: 2, vital: 1 },
      infekt:  { immune: 2, recovery: 1 },
      party:   { recovery: 2 },
      balance: { vital: 1, glutathion: 1 }
    },
    erfahrung: {
      nein:         { vital: 1, vitamine: 1 },
      regelmaessig: { nad: 1, beauty: 1 }
    }
  };

  function recommend(a) {
    var s = {};
    function add(map) { if (!map) return; for (var k in map) s[k] = (s[k] || 0) + map[k]; }
    add(W.ziel[a.ziel]);
    (a.befinden || []).forEach(function (v) { add(W.befinden[v]); });
    add(W.alltag[a.alltag]);
    add(W.erfahrung[a.erfahrung]);
    var goal = W.ziel[a.ziel] || {};
    var ranked = Object.keys(PRODUCTS).filter(function (k) { return s[k]; }).sort(function (x, y) {
      return (s[y] - s[x]) || ((goal[y] || 0) - (goal[x] || 0)) || (PRICE_RANK[x] - PRICE_RANK[y]);
    });
    if (!ranked.length) ranked = ["vital", "vitamine"];
    return { top: ranked[0], alt: ranked[1] || (ranked[0] === "vital" ? "vitamine" : "vital"), scores: s };
  }

  /* --- State -------------------------------------------------------- */
  var state = { step: -1, answers: {} };  // -1 = Intro, 0..TOTAL-1 = Fragen, TOTAL = Auswertung, TOTAL+1 = Ergebnis
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.v === QUIZ_VERSION && saved.answers) { state.answers = saved.answers; if (typeof saved.step === "number" && saved.step >= 0 && saved.step < TOTAL) state.step = saved.step; }
  } catch (e) {}
  function persist() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ v: QUIZ_VERSION, step: Math.min(state.step, TOTAL - 1), answers: state.answers })); } catch (e) {} }

  var card = $("#quiz");
  var body = $("#q-body");
  var bar = $("#q-bar");
  var barTxt = $("#q-bar-txt");
  var progressWrap = $("#q-progress");
  if (!card || !body) return;

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SHIELD = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l7 3v6c0 4.5-3 8.3-7 9.5C8 19.3 5 15.5 5 11V5l7-3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var BACK = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function setProgress() {
    var idx = state.step;
    if (idx < 0) { progressWrap.hidden = true; return; }
    progressWrap.hidden = false;
    var pct = idx >= TOTAL ? 100 : Math.round(((idx) / (TOTAL + 1)) * 100) + 6;
    bar.style.width = pct + "%";
    barTxt.textContent = idx >= TOTAL ? "Deine Empfehlung" : ("Frage " + (idx + 1) + " von " + TOTAL);
  }

  function scrollToCard() {
    var top = card.getBoundingClientRect().top + window.pageYOffset - 80;
    if (window.pageYOffset > top + 40 || card.getBoundingClientRect().top < 0) window.scrollTo({ top: top, behavior: "smooth" });
  }

  /* --- Render -------------------------------------------------------- */
  function render() {
    setProgress();
    persist();
    if (state.step < 0) return renderIntro();
    if (state.step < TOTAL) return renderStep(STEPS[state.step]);
    if (state.step === TOTAL) return renderCalc();
    return renderResult();
  }

  function renderIntro() {
    var resume = Object.keys(state.answers).length > 0;
    body.innerHTML =
      '<div class="q-panel q-intro">' +
        '<div class="q-intro__icon"><svg class="house" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 14 L50 30 V50 H14 V30 Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M32 32 v12 M26 38 h12" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg></div>' +
        '<h2>Finde in 60 Sekunden deine Infusion.</h2>' +
        '<p>7 kurze Fragen zu deinem Ziel, deinem Befinden und deinem Alltag — am Ende erhältst du deine persönliche Empfehlung und eine kostenlose Erstberatung.</p>' +
        '<button type="button" class="btn btn--primary" id="q-start">' + (resume ? "Check fortsetzen" : "Check starten") + '</button>' +
        '<div class="q-intro__meta">Kostenlos &amp; unverbindlich · keine Anmeldung nötig</div>' +
        '<div class="q-facts">' +
          '<div><b>7</b><span>kurze Fragen</span></div>' +
          '<div><b>60 Sek.</b><span>bis zur Empfehlung</span></div>' +
          '<div><b>7</b><span>Infusionen im Vergleich</span></div>' +
        '</div>' +
      '</div>';
    $("#q-start").addEventListener("click", function () {
      track("quiz_start", { resume: resume });
      fbTrack("QuizStart");
      state.step = resume && typeof state.step === "number" && state.step >= 0 ? state.step : 0;
      if (state.step < 0) state.step = 0;
      render(); scrollToCard();
    });
  }

  function navHtml(nextLabel) {
    return '<div class="q-nav">' +
      '<button type="button" class="q-back" id="q-back"' + (state.step === 0 ? ' style="visibility:hidden"' : '') + '>' + BACK + ' Zurück</button>' +
      '<button type="button" class="btn btn--primary q-next" id="q-next" disabled>' + (nextLabel || "Weiter") + '</button>' +
    '</div>';
  }
  function bindNav(validate, onNext) {
    var back = $("#q-back"), next = $("#q-next");
    back.addEventListener("click", function () { state.step = Math.max(0, state.step - 1); render(); });
    next.addEventListener("click", function () { if (!validate()) return; onNext(); });
    return next;
  }
  function goNext(stepDef, answerForTracking) {
    track("quiz_step", { step_index: state.step + 1, step_id: stepDef.id, answer: answerForTracking });
    state.step += 1;
    render(); scrollToCard();
  }

  function renderStep(step) {
    var html = '<div class="q-panel"><h2>' + esc(step.q) + '</h2>' + (step.hint ? '<p class="q-hint">' + esc(step.hint) + '</p>' : '');
    var a = state.answers;

    if (step.type === "single" || step.type === "multi") {
      var multi = step.type === "multi";
      var cur = a[step.id];
      html += '<div class="q-opts' + (step.cols === 2 ? ' q-opts--2' : '') + '" role="' + (multi ? 'group' : 'radiogroup') + '">';
      step.opts.forEach(function (o) {
        var on = multi ? (Array.isArray(cur) && cur.indexOf(o.v) >= 0) : cur === o.v;
        html += '<button type="button" class="q-opt' + (multi ? ' q-opt--multi' : '') + (on ? ' on' : '') + '" data-v="' + esc(o.v) + '" role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="' + on + '">' +
          '<span class="q-opt__chk">' + CHECK + '</span>' +
          '<span class="q-opt__txt"><b>' + esc(o.l) + '</b>' + (o.s ? '<small>' + esc(o.s) + '</small>' : '') + '</span></button>';
      });
      html += '</div>' + navHtml() + '</div>';
      body.innerHTML = html;
      var next = bindNav(function () { return multi ? (Array.isArray(a[step.id]) && a[step.id].length > 0) : !!a[step.id]; },
        function () { goNext(step, a[step.id]); });
      next.disabled = multi ? !(Array.isArray(cur) && cur.length) : !cur;
      var advancing = false;
      $$(".q-opt", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var v = btn.getAttribute("data-v");
          if (multi) {
            var arr = Array.isArray(a[step.id]) ? a[step.id].slice() : [];
            var i = arr.indexOf(v);
            if (i >= 0) arr.splice(i, 1); else arr.push(v);
            a[step.id] = arr;
            btn.classList.toggle("on", i < 0); btn.setAttribute("aria-checked", String(i < 0));
            next.disabled = !arr.length;
            persist();
          } else {
            if (advancing) return;
            a[step.id] = v;
            $$(".q-opt", body).forEach(function (b) { b.classList.remove("on"); b.setAttribute("aria-checked", "false"); });
            btn.classList.add("on"); btn.setAttribute("aria-checked", "true");
            next.disabled = false;
            persist();
            advancing = true;
            setTimeout(function () { goNext(step, v); }, 280);
          }
        });
      });
      return;
    }

    if (step.type === "plz") {
      html += '<div class="q-plz"><input class="form-control" type="text" id="q-plz" inputmode="numeric" autocomplete="postal-code" maxlength="4" placeholder="8184" value="' + esc(a.plz || "") + '" aria-label="Postleitzahl"></div>' +
        '<div class="q-msg" id="q-plz-hint" hidden>Wir sind vor allem im Zürcher Unterland, in Winterthur und im Kanton Zürich unterwegs — frag trotzdem an, wir prüfen gern, ob wir zu dir kommen.</div>' +
        '<div class="q-error" id="q-plz-err" hidden>Bitte gib deine 4-stellige Postleitzahl ein.</div>' +
        navHtml() + '</div>';
      body.innerHTML = html;
      var input = $("#q-plz"), hint = $("#q-plz-hint"), err = $("#q-plz-err");
      function plzOk() { return /^\d{4}$/.test(input.value.trim()); }
      var nextP = bindNav(function () { err.hidden = plzOk(); return plzOk(); }, function () { a.plz = input.value.trim(); goNext(step, a.plz); });
      function onInput() {
        input.value = input.value.replace(/\D/g, "").slice(0, 4);
        var v = input.value;
        nextP.disabled = !plzOk();
        hint.hidden = !(v.length === 4 && !/^8\d{3}$/.test(v));
        if (plzOk()) err.hidden = true;
        a.plz = v; persist();
      }
      input.addEventListener("input", onInput);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); nextP.click(); } });
      onInput();
      setTimeout(function () { input.focus({ preventScroll: true }); }, 120);
      return;
    }

    if (step.type === "medical") {
      step.groups.forEach(function (g) {
        html += '<div class="q-group"><div class="q-group__q">' + esc(g.q) + '</div><div class="q-pills" role="radiogroup" data-g="' + esc(g.id) + '">';
        g.opts.forEach(function (o) {
          var on = a[g.id] === o;
          html += '<button type="button" class="q-pill' + (on ? ' on' : '') + '" data-v="' + esc(o) + '" role="radio" aria-checked="' + on + '">' + esc(o) + '</button>';
        });
        html += '</div></div>';
      });
      html += '<div class="q-lock">' + SHIELD + ' Vertraulich — nur für die ärztliche Vorab-Einschätzung.</div>' + navHtml("Empfehlung anzeigen") + '</div>';
      body.innerHTML = html;
      function medOk() { return step.groups.every(function (g) { return !!a[g.id]; }); }
      var nextM = bindNav(medOk, function () {
        goNext(step, { arzt_behandlung: a.arzt_behandlung, vorerkrankungen: a.vorerkrankungen, medikamente: a.medikamente });
      });
      nextM.disabled = !medOk();
      $$(".q-pills", body).forEach(function (grp) {
        var gid = grp.getAttribute("data-g");
        $$(".q-pill", grp).forEach(function (p) {
          p.addEventListener("click", function () {
            a[gid] = p.getAttribute("data-v");
            $$(".q-pill", grp).forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-checked", "false"); });
            p.classList.add("on"); p.setAttribute("aria-checked", "true");
            nextM.disabled = !medOk();
            persist();
          });
        });
      });
      return;
    }
  }

  function renderCalc() {
    body.innerHTML =
      '<div class="q-panel q-calc"><div class="q-calc__ring" aria-hidden="true"></div>' +
        '<h2>Wir werten deine Antworten aus …</h2><p>Einen Moment — deine Empfehlung ist gleich da.</p>' +
        '<ul class="q-calc__steps">' +
          '<li id="qc1">' + CHECK + ' Ziel und Befinden abgleichen</li>' +
          '<li id="qc2">' + CHECK + ' Passende Wirkstoffe prüfen</li>' +
          '<li id="qc3">' + CHECK + ' Empfehlung zusammenstellen</li>' +
        '</ul></div>';
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var d = reduce ? 0 : 1;
    setTimeout(function () { var e = $("#qc1"); if (e) e.classList.add("on"); }, 350 * d);
    setTimeout(function () { var e = $("#qc2"); if (e) e.classList.add("on"); }, 850 * d);
    setTimeout(function () { var e = $("#qc3"); if (e) e.classList.add("on"); }, 1300 * d);
    setTimeout(function () { state.step = TOTAL + 1; render(); scrollToCard(); }, 1750 * d);
  }

  function labelOf(stepId, v) {
    var st = STEPS.filter(function (s) { return s.id === stepId; })[0];
    if (!st || !st.opts) return v || "";
    var o = st.opts.filter(function (x) { return x.v === v; })[0];
    return o ? o.l : (v || "");
  }

  function renderResult() {
    var a = state.answers;
    var rec = recommend(a);
    var p = PRODUCTS[rec.top], alt = PRODUCTS[rec.alt];
    var befinden = (a.befinden || []).map(function (v) { return labelOf("befinden", v); });
    track("quiz_result", { infusion: p.name, alternative: alt.name, ziel: labelOf("ziel", a.ziel), zeitraum: a.zeitraum || "" });
    fbTrack("QuizResult", { content_name: p.name, content_category: "Infusion" });

    var why = [
      "<b>Dein Ziel: " + esc(labelOf("ziel", a.ziel)) + ".</b> " + esc(p.fit),
      befinden.length ? "<b>Passt zu deinem Befinden:</b> " + esc(befinden.join(" · ")) + "." : "",
      "<b>Ärztlich abgeklärt und individuell abgestimmt</b> — verabreicht von diplomierten Pflegefachfrauen bei dir zuhause."
    ].filter(Boolean);

    body.innerHTML =
      '<div class="q-panel q-result">' +
        '<span class="q-result__tag">' + CHECK + ' Deine Empfehlung</span>' +
        '<div class="q-product">' +
          '<div class="q-product__img"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="eager" decoding="async"></div>' +
          '<div><h3>' + esc(p.name) + '</h3><p class="q-product__tag">' + esc(p.tagline) + '</p>' +
          '<div class="q-product__price">' + esc(p.price) + '<small>Endpreis inkl. Anfahrt, Material und Betreuung</small></div></div>' +
        '</div>' +
        '<ul class="q-why">' + why.map(function (w) { return '<li>' + CHECK + '<span>' + w + '</span></li>'; }).join("") + '</ul>' +
        '<div class="q-alt">Auch spannend für dich: <b>' + esc(alt.name) + '</b> (' + esc(alt.price) + ') — besprechen wir gern in der Beratung. <a href="' + esc(p.url) + '" target="_blank" rel="noopener">Mehr zu ' + esc(p.name) + ' →</a></div>' +
        '<form class="q-form" id="q-form" novalidate>' +
          '<h3>Kostenlose Erstberatung sichern</h3>' +
          '<p>Unser Team meldet sich meist noch am selben Werktag. Deine Empfehlung mit allen Details schicken wir dir per E-Mail.</p>' +
          '<div class="form-row"><label for="q-name">Vorname &amp; Name</label><input class="form-control" type="text" id="q-name" name="name" autocomplete="name" required></div>' +
          '<div class="form-row--split">' +
            '<div><label for="q-phone">Telefon</label><input class="form-control" type="tel" id="q-phone" name="phone" autocomplete="tel" inputmode="tel" placeholder="079 123 45 67" required></div>' +
            '<div><label for="q-email">E-Mail</label><input class="form-control" type="email" id="q-email" name="email" autocomplete="email" inputmode="email" required></div>' +
          '</div>' +
          '<div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
          '<label class="form-consent"><input type="checkbox" id="q-consent" name="consent" required>' +
            '<span>Ich bin einverstanden, dass die Pflegepartner AG mich zu meiner Anfrage per Telefon und E-Mail kontaktiert und mir Erinnerungen zu meiner Empfehlung schickt. Abmeldung jederzeit möglich. <a href="https://pflegepartner.ch/privacy-policy" target="_blank" rel="noopener">Datenschutz</a></span></label>' +
          '<div class="q-error" id="q-form-err" hidden></div>' +
          '<button type="submit" class="btn btn--primary btn--block" id="q-submit">Kostenlose Erstberatung sichern</button>' +
          '<p class="form-privacy">' + SHIELD + ' Deine Daten behandeln wir vertraulich und geben sie nicht weiter. Kein Abo, keine versteckten Kosten.</p>' +
          '<p class="q-form__call">Lieber direkt anrufen? <a href="tel:+41445250220">044 525 02 20</a></p>' +
        '</form>' +
      '</div>';

    var form = $("#q-form"), errBox = $("#q-form-err");
    function fail(msg, el) { errBox.textContent = msg; errBox.hidden = false; if (el) el.focus(); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errBox.hidden = true;
      var name = $("#q-name").value.trim(), phone = $("#q-phone").value.trim(), email = $("#q-email").value.trim();
      var digits = phone.replace(/\D/g, "");
      if (name.length < 2) return fail("Bitte gib deinen Namen ein.", $("#q-name"));
      if (digits.length < 9 || digits.length > 15) return fail("Bitte gib eine gültige Telefonnummer ein (z.B. 079 123 45 67).", $("#q-phone"));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("Bitte gib eine gültige E-Mail-Adresse ein.", $("#q-email"));
      if (!$("#q-consent").checked) return fail("Bitte bestätige, dass wir dich kontaktieren dürfen.", $("#q-consent"));

      var btn = $("#q-submit"); btn.disabled = true; btn.textContent = "Wird gesendet …";
      var summary = "Infusions-Check · Ziel: " + labelOf("ziel", a.ziel) +
        " · Befinden: " + (befinden.join(", ") || "—") +
        " · Alltag: " + labelOf("alltag", a.alltag) +
        " · Erfahrung: " + labelOf("erfahrung", a.erfahrung) +
        " · Empfehlung: " + p.name + " · Alternative: " + alt.name;
      var data = {
        infusion: p.name,
        ziel: labelOf("ziel", a.ziel),
        zeitraum: a.zeitraum || "",
        plz: a.plz || "",
        name: name, phone: phone, email: email,
        message: summary,
        consent: "ja",
        email_opt_in: "ja",
        arzt_behandlung: a.arzt_behandlung || "", vorerkrankungen: a.vorerkrankungen || "", medikamente: a.medikamente || "",
        quiz: {
          version: QUIZ_VERSION,
          ziel: a.ziel, befinden: a.befinden || [], alltag: a.alltag, erfahrung: a.erfahrung,
          labels: { ziel: labelOf("ziel", a.ziel), befinden: befinden, alltag: labelOf("alltag", a.alltag), erfahrung: labelOf("erfahrung", a.erfahrung) },
          empfehlung: rec.top, alternative: rec.alt, scores: rec.scores
        },
        website: form.website ? form.website.value : "",
        fbp: cookie("_fbp"),
        fbc: cookie("_fbc") || (function () { var id = new URLSearchParams(location.search).get("fbclid"); return id ? "fb.1." + Date.now() + "." + id : ""; })(),
        source: location.href,
        _subject: "Neue Infusions-Anfrage (Infusions-Check)"
      };
      track("lead_submit", { infusion: p.name, ziel: data.ziel, zeitraum: data.zeitraum, funnel: "quiz" });
      function done(leadId) {
        try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
        window.location.href = THANKS_URL + "?quelle=quiz&empfehlung=" + encodeURIComponent(rec.top) + (leadId ? "&lead=" + encodeURIComponent(leadId) : "");
      }
      fetch(FORM_ENDPOINT, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (res) { done(res && res.id); })
        .catch(function () { done(); });
    });
  }

  /* --- Boot ---------------------------------------------------------- */
  document.body.classList.add("q-page");
  // Direkt starten, wenn per Link (#start) gewünscht
  if (location.hash === "#start" && state.step < 0) state.step = 0;
  render();
  $$('a[href="#quiz"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (state.step < 0) { state.step = 0; track("quiz_start", { via: "cta" }); render(); }
      scrollToCard();
    });
  });

  var yearEl = $("#year");
  if (yearEl) { var y = new Date().getFullYear(); if (y && !isNaN(y)) yearEl.textContent = y; }
})();
