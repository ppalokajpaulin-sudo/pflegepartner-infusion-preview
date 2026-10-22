/* =============================================================
   Pflegepartner AG — Pflege-Check (Quiz-Funnel fuer Angehoerige) · pflege-check.js
   Person waehlen -> Kontaktdaten (Start-Gate) -> 10 Fragen -> Einschaetzung -> Lead im Leads-Dashboard.

   Fragen, Antwortoptionen, Punkte (0/1/2) und die drei Ergebnisstufen stammen unveraendert aus der
   freigegebenen Vorlage (pflegepartner-website/_vorlagen/pflege-check). Wer daran etwas aendert, aendert
   eine abgenommene Aussage gegenueber Angehoerigen. Neu ist nur der Ablauf: wie beim Infusions-Check
   (quiz.js) werden die Kontaktdaten vor Frage 1 erfasst und das Ergebnis geht ohne weiteren Klick an
   denselben Lead (update_id). GATE_FIRST = false schaltet auf den Ablauf der Vorlage zurueck
   (Formular erst nach dem Ergebnis).
   ============================================================= */
(function () {
  "use strict";

  var root = document.getElementById("pflege-check");
  if (!root) return;

  /* --- KONFIG ------------------------------------------------------ */
  var FORM_ENDPOINT = "https://leads.pflegepartner.ch/api/lead";
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    FORM_ENDPOINT = "http://localhost:4174/api/lead";
  }
  var GATE_FIRST = true;
  var PHONE = "+41445250220", PHONE_LABEL = "044 525 02 20";
  var ADRESSE = "Pflegepartner AG · Bramenstrasse 5 · 8184 Bachenbülach";
  var PRIVACY_URL = "https://pflegepartner.ch/privacy-policy";
  var ZIEL = "Pflege-Check (Beratung für Angehörige)"; // beginnt mit "Pflege-Check": so erkennt der Leads-Server die Art der Anfrage
  var STORE_KEY = "pp-pflege-check-v1";
  var QUIZ_VERSION = 1;

  var view = document.getElementById("ppc-view");
  var houses = document.getElementById("ppc-houses");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: ev, funnel: "pflege-check" }, data || {})); } catch (e) {}
  }
  function fbTrack(ev, data) { try { if (window.fbq) window.fbq("trackCustom", ev, data || {}); } catch (e) {} }
  /* Lead-Event: gleiche eventID wie das Server-Event (lead-<id>), damit Meta nicht doppelt zaehlt */
  function fbLead(stage, id) {
    try { if (window.fbq) window.fbq("track", "Lead", { content_name: "Pflege-Check", content_category: "Pflege", stage: stage }, id ? { eventID: "lead-" + id } : undefined); } catch (e) {}
  }
  function cookie(name) { var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
  function fbc() {
    var c = cookie("_fbc"); if (c) return c;
    var id = new URLSearchParams(location.search).get("fbclid");
    return id ? "fb.1." + Date.now() + "." + id : "";
  }

  /* --- Inhalt (unveraendert aus der freigegebenen Vorlage) ---------- */
  var PERSONS = {
    mutter: { p: "Ihre Mutter", pd: "Ihrer Mutter", s: "sie" },
    vater: { p: "Ihr Vater", pd: "Ihrem Vater", s: "er" },
    partnerin: { p: "Ihre Partnerin", pd: "Ihrer Partnerin", s: "sie" },
    partner: { p: "Ihr Partner", pd: "Ihrem Partner", s: "er" },
    andere: { p: "die Person", pd: "der Person", s: "sie" }
  };
  var OK = [["Ja", "ok", 0], ["Nicht sicher", "mid", 1], ["Nein", "no", 2]];
  var Q = [
    { t: "Nimmt {p} die Medikamente jeden Tag richtig ein?", h: "Volle Wochendosierer oder doppelte Einnahmen sind ein Hinweis.", o: OK },
    { t: "Isst und trinkt {p} genug?", h: "Leerer Kühlschrank, abgelaufene Lebensmittel, Gewichtsverlust.", o: OK },
    { t: "Bewegt sich {p} sicher durch die Wohnung?", h: "Ohne Stürze oder Beinahe-Stürze in den letzten Monaten.", o: OK },
    { t: "Schafft {p} Körperpflege und Anziehen noch alleine?", h: "Und spricht {s} offen darüber, wenn es schwerfällt?", o: OK },
    { t: "Falls {p} Wunden, einen Verband oder einen Zugang (Port, PICC-Line) hat: Ist die Versorgung fachlich geregelt?", h: "Solche Zugänge brauchen regelmässige, fachgerechte Pflege.", o: [["Ja, geregelt", "ok", 0], ["Nicht sicher", "mid", 1], ["Nein", "no", 2], ["Trifft nicht zu", "ok", 0]] },
    { t: "Erinnert sich {p} an Termine, Gespräche und den Wochentag?", h: "", o: OK },
    { t: "Wirkt {p} so aufgestellt wie früher?", h: "Nicht stiller, einsamer oder gereizter als sonst.", o: OK },
    { t: "Wissen Sie, was passiert, wenn {p} nachts stürzt oder sich nicht meldet?", h: "Gibt es einen Plan, wen {s} erreicht?", o: OK },
    { t: "Nach dem letzten Spitalaufenthalt: War klar, wer zuhause übernimmt?", h: "", o: [["Ja", "ok", 0], ["Nicht wirklich", "mid", 1], ["Nein", "no", 2], ["Kein Spitalaufenthalt", "ok", 0]] },
    { t: "Und Sie selbst: Fühlen Sie sich mit der Situation gut unterstützt?", h: "Diese Frage ist genauso wichtig wie die anderen.", o: OK }
  ];
  var HOUSE = '<svg viewBox="0 0 24 24"><path class="h" d="M3 11.5 12 4l9 7.5V21H3z"/><path d="M12 9v6M9 12h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
  var ZEITEN = ["Egal, jederzeit", "Vormittag", "Nachmittag", "Abend"];

  /* --- Zustand (bleibt bei Reload der Seite erhalten) ---------------- */
  var state = { view: "intro", person: "mutter", i: 0, ans: [], gate: { name: "", phone: "", email: "", ort: "", zeit: ZEITEN[0], msg: "" }, consent: false, leadId: null };
  function persist() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ v: QUIZ_VERSION, s: state })); } catch (e) {} }
  function restore() {
    try {
      var d = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (d && d.v === QUIZ_VERSION && d.s) state = Object.assign(state, d.s);
    } catch (e) {}
  }
  function clearStore() { try { sessionStorage.removeItem(STORE_KEY); } catch (e) {} }

  function fill(s) { var P = PERSONS[state.person] || PERSONS.andere; return s.replace(/\{p\}/g, P.p).replace(/\{pd\}/g, P.pd).replace(/\{s\}/g, P.s); }
  function drawHouses() {
    var h = "";
    for (var k = 0; k < Q.length; k++) h += '<span class="' + (k < state.i ? "done" : (k === state.i && state.view === "q" ? "cur" : "")) + '">' + HOUSE + "</span>";
    houses.innerHTML = h;
  }
  function render(html) { view.innerHTML = html; view.classList.remove("ppc-view"); void view.offsetWidth; view.classList.add("ppc-view"); drawHouses(); }
  function scrollToCard() { try { var c = document.querySelector(".ppc-card"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} }
  function focusHeading(sel) { var el = view.querySelector(sel || "h2, h3"); if (el) { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); } }

  function post(data) {
    return fetch(FORM_ENDPOINT, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }); });
  }
  function basePayload() {
    var g = state.gate;
    return { name: g.name, phone: g.phone, email: g.email, plz: g.ort, ziel: ZIEL, zeitraum: "Erreichbar: " + g.zeit, infusion: "", consent: "ja",
             fbp: cookie("_fbp"), fbc: fbc(), source: location.href };
  }
  function totalScore() { return state.ans.reduce(function (s, a) { return s + (a ? a.pts : 0); }, 0); }
  function tierFor(score) {
    var P = PERSONS[state.person];
    if (score <= 4) return { tag: "Vieles läuft gut", h: "Nach Ihren Antworten ist " + P.p + " aktuell gut versorgt.", t: "Damit das so bleibt: Wenn sich etwas verändert, etwa nach einem Spitalaufenthalt oder bei einer neuen Therapie, muss " + P.p + " nicht ins Heim. Wir übernehmen auch medizinische Pflege zuhause. Ein unverbindliches Gespräch gibt Ihnen einen Plan, bevor Sie ihn brauchen." };
    if (score <= 10) return { tag: "Ein paar offene Punkte", h: "Bei " + P.pd + " gibt es Punkte, die Sie nicht mit einem klaren Ja beantworten konnten.", t: "Das heisst nicht, dass " + P.p + " nicht mehr zuhause leben kann. Im Gegenteil: Meistens reicht gezielte Unterstützung, damit es zuhause sicher weitergeht. Unsere Pflegefachfrauen sagen Ihnen ehrlich, was gebraucht wird – und was nicht." };
    return { tag: "Hier lohnt sich ein Gespräch", h: "Mehrere Punkte zeigen, dass " + P.p + " und Sie gerade viel alleine tragen.", t: "Das heisst nicht, dass " + P.p + " ins Heim muss. Wir übernehmen Pflege zuhause – von der Medikamentenkontrolle bis zur Infusionstherapie über Port oder PICC-Line. Wir kommen vorbei, klären den Bedarf und besprechen, was die Krankenkasse übernimmt. Unverbindlich." };
  }
  /* Das Leads-Dashboard kennt nur die Felder des Kontaktformulars: Punktzahl und Antworten gehoeren
     sichtbar in die Nachricht, sonst faellt es beim Empfaenger lautlos weg. */
  function buildMessage(score, tag) {
    var P = PERSONS[state.person], g = state.gate;
    var antworten = state.ans.map(function (a, i) { return (i + 1) + ". " + a.q + " – " + a.label; });
    return ["Anfrage aus dem Pflege-Check", "",
      "Check für: " + P.p,
      "Punktzahl: " + score + " von 20 — " + tag,
      "Wohnort: " + (g.ort || "—"),
      "Erreichbarkeit: " + g.zeit, "",
      "Antworten:"].concat(antworten).concat(["", "Nachricht:", g.msg || "—"]).join("\n");
  }
  function consentText() {
    return 'Ich bin einverstanden, dass die Pflegepartner AG mich zu diesem Anliegen per Telefon oder E-Mail kontaktiert. Meine Angaben werden vertraulich behandelt und nicht weitergegeben. Es gilt die <a class="ppc-phone" style="font-size:14px" href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Datenschutzerklärung</a>.';
  }
  function validContact(f, errEl) {
    var name = f.name.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim(), digits = phone.replace(/\D/g, "");
    if (name.length < 2) { errEl.textContent = "Bitte geben Sie Ihren Namen ein."; f.name.focus(); return null; }
    if (digits.length < 9 || digits.length > 15) { errEl.textContent = "Bitte geben Sie eine gültige Telefonnummer ein (z.B. 079 123 45 67)."; f.phone.focus(); return null; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { errEl.textContent = "Diese E-Mail-Adresse scheint nicht zu stimmen. Sie können das Feld auch leer lassen."; f.email.focus(); return null; }
    if (!f.querySelector("input[type=checkbox]").checked) { errEl.textContent = "Bitte bestätigen Sie, dass wir Sie kontaktieren dürfen."; return null; }
    errEl.textContent = "";
    return { name: name, phone: phone, email: email, ort: (f.ort && f.ort.value.trim()) || "", zeit: (f.zeit && f.zeit.value) || ZEITEN[0], msg: (f.msg && f.msg.value.trim()) || "" };
  }
  function contactFields(P, withMsg) {
    var opts = ZEITEN.map(function (z) { return "<option" + (z === state.gate.zeit ? " selected" : "") + ">" + z + "</option>"; }).join("");
    return '<div class="ppc-hp" aria-hidden="true"><label for="ppc-website">Website (bitte leer lassen)</label><input id="ppc-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<div class="ppc-row"><div><label for="ppc-name">Ihr Name</label><input id="ppc-name" name="name" autocomplete="name" value="' + esc(state.gate.name) + '" required></div>' +
      '<div><label for="ppc-tel">Telefon</label><input id="ppc-tel" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="079 123 45 67" value="' + esc(state.gate.phone) + '" required></div></div>' +
      '<div class="ppc-row"><div><label for="ppc-mail">E-Mail (optional)</label><input id="ppc-mail" name="email" type="email" inputmode="email" autocomplete="email" value="' + esc(state.gate.email) + '"></div>' +
      '<div><label for="ppc-ort">Wohnort von ' + esc(P.pd) + ' (optional)</label><input id="ppc-ort" name="ort" placeholder="z.B. Bülach" value="' + esc(state.gate.ort) + '"></div></div>' +
      '<div><label for="ppc-zeit">Wann erreichen wir Sie am besten?</label><select id="ppc-zeit" name="zeit">' + opts + "</select></div>" +
      (withMsg ? '<div><label for="ppc-msg">Möchten Sie uns etwas mitgeben? (optional)</label><textarea id="ppc-msg" name="msg"></textarea></div>' : "") +
      '<label class="ppc-check"><input type="checkbox" id="ppc-ds" required> <span>' + consentText() + "</span></label>";
  }

  /* --- Ansichten ----------------------------------------------------- */
  function intro() {
    state.view = "intro";
    var opts = Object.keys(PERSONS).map(function (k) {
      var label = { mutter: "Meine Mutter", vater: "Mein Vater", partnerin: "Meine Partnerin", partner: "Mein Partner", andere: "Eine andere Person" }[k];
      return '<option value="' + k + '"' + (k === state.person ? " selected" : "") + ">" + label + "</option>";
    }).join("");
    render('<div class="ppc-intro"><h2 class="ppc-q">Ist meine Mutter zuhause gut versorgt?</h2>' +
      "<p>Zehn Fragen, zwei Minuten. Sie bekommen keine Diagnose, sondern Klarheit – und die Antwort auf die Frage, die viele nicht laut stellen: Kann sie zuhause bleiben? In den meisten Fällen ja.</p>" +
      '<label class="ppc-step" for="ppc-person">Für wen machen Sie den Check?</label>' +
      '<select class="ppc-select" id="ppc-person">' + opts + "</select>" +
      '<button class="ppc-btn" id="ppc-start">Check starten</button></div>');
    document.getElementById("ppc-start").onclick = function () {
      state.person = document.getElementById("ppc-person").value;
      state.i = 0; state.ans = [];
      track("pflege_check_start", { person: state.person }); fbTrack("PflegeCheckStart", {});
      if (GATE_FIRST && !state.leadId) gate(); else question();
      scrollToCard();
    };
  }

  /* Start-Gate: Kontaktdaten vor Frage 1. Der Lead entsteht hier, noch ohne Antworten; die Team-Meldung
     kommt erst, wenn der Check fertig ist (Marke "Start-Gate" in der Nachricht, siehe mailReady im Server). */
  function gate() {
    state.view = "gate"; persist();
    var P = PERSONS[state.person];
    render('<form class="ppc-form ppc-gate" id="ppc-gate-form" novalidate>' +
      '<h2 class="ppc-q" style="font-size:clamp(20px,3.2vw,24px)">Bevor es losgeht</h2>' +
      '<p class="ppc-hint" style="margin-bottom:6px">Tragen Sie kurz Ihre Kontaktdaten ein. Danach folgen die zehn Fragen. Am Ende zeigen wir Ihnen die Einschätzung, und eine unserer Pflegefachfrauen ruft Sie innerhalb eines Werktags an.</p>' +
      contactFields(P, false) +
      '<p class="ppc-err" id="ppc-err" role="status" aria-live="polite"></p>' +
      '<div class="ppc-actions"><button type="submit" class="ppc-btn" id="ppc-gate-btn">Weiter zu den Fragen</button><a class="ppc-phone" href="tel:' + PHONE + '">oder direkt anrufen: ' + PHONE_LABEL + "</a></div>" +
      '<button type="button" class="ppc-back" id="ppc-gate-back" style="justify-self:start">Zurück</button></form>');
    focusHeading("h2");
    document.getElementById("ppc-gate-back").onclick = function () { intro(); };
    document.getElementById("ppc-gate-form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, err = document.getElementById("ppc-err");
      var c = validContact(f, err);
      if (!c) return;
      if (f.website && f.website.value) { state.leadId = null; question(); return; } // Honigtopf: still weiter, nichts senden
      state.gate = c; state.consent = true;
      var btn = document.getElementById("ppc-gate-btn"); btn.disabled = true; btn.textContent = "Einen Moment …";
      var data = Object.assign(basePayload(), {
        message: "Pflege-Check · Start-Gate (Check noch nicht beantwortet)\n\nCheck für: " + P.p,
        _subject: "Pflege-Check Anfrage – Start"
      });
      track("pflege_check_gate_submit", {});
      function proceed(id) {
        if (id) { state.leadId = id; fbLead("gate", id); }
        fbTrack("PflegeCheckGate", {});
        persist(); question(); scrollToCard();
      }
      post(data).then(function (res) { proceed(res && res.ok ? res.id : null); }).catch(function () { proceed(null); });
    };
  }

  function question() {
    state.view = "q"; persist();
    var q = Q[state.i];
    var opts = q.o.map(function (o, idx) { return '<button class="ppc-opt ' + o[1] + '" data-i="' + idx + '"><span class="dot"></span>' + o[0] + "</button>"; }).join("");
    render('<div class="ppc-step">Frage ' + (state.i + 1) + " von " + Q.length + '</div><h2 class="ppc-q">' + esc(fill(q.t)) + "</h2>" +
      (q.h ? '<p class="ppc-hint">' + esc(fill(q.h)) + "</p>" : '<div style="height:14px"></div>') +
      '<div class="ppc-opts">' + opts + '</div><div class="ppc-nav"><button class="ppc-back" id="ppc-back"' + (state.i === 0 ? " hidden" : "") + ">Zurück</button></div>");
    var btns = view.querySelectorAll(".ppc-opt");
    for (var b = 0; b < btns.length; b++) {
      btns[b].onclick = function () {
        var idx = +this.getAttribute("data-i");
        state.ans[state.i] = { label: q.o[idx][0], pts: q.o[idx][2], q: fill(q.t) };
        state.i++;
        if (state.i < Q.length) question(); else result();
      };
    }
    var back = document.getElementById("ppc-back"); if (back) back.onclick = function () { state.i--; question(); };
    focusHeading(".ppc-q");
  }

  function openPoints() {
    var open = state.ans.filter(function (a) { return a && a.pts > 0; });
    return open.length ? '<p><strong>Ihre offenen Punkte:</strong></p><ul class="ppc-list">' + open.map(function (a) { return "<li>" + esc(a.q) + ' <span style="color:var(--muted)">(' + esc(a.label) + ")</span></li>"; }).join("") + "</ul>" : "";
  }
  function doneBlock() {
    var vor = (state.gate.name.split(/\s+/)[0] || "");
    return '<div class="ppc-done" id="ppc-done"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V21H3z" fill="#FD2926"/><path d="M12 9v6M9 12h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<h3 style="font-size:24px;margin-bottom:10px">Danke' + (vor ? ", " + esc(vor) : "") + ". Wir melden uns bei Ihnen.</h3>" +
      '<p style="font-size:17px;max-width:420px;margin:0 auto 18px">Eine unserer Pflegefachfrauen ruft Sie innerhalb eines Werktags an. Wenn es dringend ist: <a class="ppc-phone" href="tel:' + PHONE + '">' + PHONE_LABEL + "</a></p>" +
      '<p style="font-size:14px;color:var(--muted)">' + ADRESSE + "</p></div>";
  }
  function failBlock() {
    return '<p class="ppc-err" style="font-size:16px;margin-top:14px">Das Senden hat nicht geklappt. Bitte rufen Sie uns an: <a class="ppc-phone" href="tel:' + PHONE + '">' + PHONE_LABEL + "</a></p>";
  }

  function result() {
    state.view = "result"; persist();
    var score = totalScore(), tier = tierFor(score), P = PERSONS[state.person];
    track("pflege_check_result", { score: score, tier: tier.tag }); fbTrack("PflegeCheckResult", { tier: tier.tag });
    var head = '<div class="ppc-res"><span class="ppc-res-tag">' + esc(tier.tag) + "</span><h3>" + esc(tier.h) + "</h3><p>" + esc(tier.t) + "</p>" + openPoints();
    var haveContact = !!(state.consent && state.gate.name && state.gate.phone);

    if (haveContact) {
      /* Kontaktdaten + Einwilligung liegen aus dem Start-Gate vor: Ergebnis geht automatisch an den Lead. */
      var data = Object.assign(basePayload(), { message: buildMessage(score, tier.tag), _subject: "Pflege-Check Anfrage – " + state.gate.name });
      if (state.leadId) {
        render(head + doneBlock() + "</div>"); focusHeading("#ppc-done h3");
        data.update_id = state.leadId;
        (function send(retry) {
          post(data).then(function (res) {
            if (!(res && res.ok) && !retry) return send(true); // ein stiller Retry bei Netz-/Serverfehler
            if (res && res.ok) { fbLead("complete", state.leadId); clearStore(); }
          }).catch(function () { if (!retry) send(true); });
        })(false);
      } else {
        /* Gate-Insert war fehlgeschlagen: hier mit den vorhandenen Daten neu einfuegen. */
        render(head + '<p class="ppc-hint" id="ppc-wait">Wir leiten Ihre Anfrage weiter …</p></div>'); focusHeading("h3");
        post(data).then(function (res) {
          if (res && res.ok) { fbLead("complete", res.id); clearStore(); render(head + doneBlock() + "</div>"); focusHeading("#ppc-done h3"); }
          else throw 0;
        }).catch(function () { var w = document.getElementById("ppc-wait"); if (w) w.outerHTML = failBlock(); });
      }
      return;
    }

    /* Ablauf der Vorlage (GATE_FIRST = false): Formular nach dem Ergebnis */
    render(head + '<form class="ppc-form" id="ppc-form" novalidate><h3>Lassen Sie uns kurz reden.</h3>' +
      '<p style="font-size:15px;color:var(--muted);margin:0 0 6px">Wir melden uns innerhalb eines Werktags. Kein Verkaufsgespräch, nur eine ehrliche Einschätzung.</p>' +
      contactFields(P, true) +
      '<p class="ppc-err" id="ppc-err" role="status" aria-live="polite"></p>' +
      '<div class="ppc-actions"><button type="submit" class="ppc-btn" id="ppc-send">Beratung anfragen</button><a class="ppc-phone" href="tel:' + PHONE + '">oder direkt anrufen: ' + PHONE_LABEL + "</a></div></form></div>");
    focusHeading("h3");
    document.getElementById("ppc-form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, err = document.getElementById("ppc-err"), btn = document.getElementById("ppc-send");
      var c = validContact(f, err);
      if (!c) return;
      if (f.website && f.website.value) { render(head + doneBlock() + "</div>"); return; } // Honigtopf: nichts senden
      state.gate = c; state.consent = true;
      var d = Object.assign(basePayload(), { message: buildMessage(score, tier.tag), _subject: "Pflege-Check Anfrage – " + c.name });
      btn.disabled = true; btn.textContent = "Wird gesendet …";
      track("pflege_check_form_submit", {});
      post(d).then(function (res) {
        if (!(res && res.ok)) throw 0;
        fbLead("complete", res.id); clearStore();
        render(head + doneBlock() + "</div>"); focusHeading("#ppc-done h3");
      }).catch(function () { btn.disabled = false; btn.textContent = "Beratung anfragen"; err.textContent = "Senden hat nicht geklappt. Rufen Sie uns an: " + PHONE_LABEL; });
    };
  }

  /* --- Boot ---------------------------------------------------------- */
  restore();
  if (state.view === "gate") gate();
  else if (state.view === "q" && state.i < Q.length) question();
  else if (state.view === "result" && state.ans.length === Q.length) result();
  else intro();
  var links = document.querySelectorAll('a[href="#pflege-check"]');
  for (var k = 0; k < links.length; k++) links[k].addEventListener("click", function (e) { e.preventDefault(); scrollToCard(); });
  var yearEl = document.getElementById("year");
  if (yearEl) { var y = new Date().getFullYear(); if (y && !isNaN(y)) yearEl.textContent = y; }
})();
