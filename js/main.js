/* =============================================================
   Pflegepartner AG — Infusions-Landingpage · main.js
   Minimal JS: Menü-Prefill, Smooth-Scroll, Tracking, Formular.
   ============================================================= */
(function () {
  "use strict";

  /* --- KONFIG: vor Livegang anpassen ------------------------------ */
  // Formspree / Make-Endpoint für Lead-Weiterleitung (Zieladresse intern konfigurieren).
  // Solange leer, wird kein Request gesendet (Seite funktioniert trotzdem: Tracking + /danke).
  var FORM_ENDPOINT = "https://pflegepartner-leads-production.up.railway.app/api/lead";
  // Lokaler Test: Landingpage auf localhost spricht das lokale Leads-Dashboard an
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    FORM_ENDPOINT = "http://localhost:4174/api/lead";
  }
  var THANKS_URL = "danke.html"; // eigene URL /danke für sauberes Conversion-Tracking
  // Google-Ads Conversion-Label (TODO): "AW-XXXXXXXXXX/xxxxxxxxxxxxxxx"
  var GADS_SEND_TO = "";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Tracking-Helfer (fallen still aus, wenn Pixel/gtag nicht aktiv) --- */
  function trackLead(payload) {
    // Absichtlich KEIN fbq('Lead') und KEINE Ads-Conversion hier:
    // die zaehlbare Conversion feuert erst auf /danke — sonst wird doppelt gezaehlt.
    try {
      if (window.dataLayer) window.dataLayer.push({
        event: "lead_submit",
        infusion: (payload && payload.infusion) || "",
        ziel: (payload && payload.ziel) || "",
        zeitraum: (payload && payload.zeitraum) || ""
      });
    } catch (e) {}
  }
  function trackPhone() {
    try { if (window.fbq) window.fbq("track", "Contact", { method: "phone" }); } catch (e) {}
    try {
      if (window.gtag && GADS_SEND_TO) window.gtag("event", "conversion", { send_to: GADS_SEND_TO });
      if (window.dataLayer) window.dataLayer.push({ event: "phone_click" });
    } catch (e) {}
  }

  /* --- Smooth-Scroll für interne Anker ---------------------------- */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var headerH = 68;
    var y = el.getBoundingClientRect().top + window.pageYOffset - headerH;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      scrollToId(id);
      history.replaceState(null, "", "#" + id);
    });
  });

  /* --- Menü „Anfragen" → Dropdown vorbefüllen + zum Formular ------- */
  var infusionSelect = $("#infusion");
  $$(".btn-inquire").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-infusion") || "";
      if (infusionSelect && name) {
        var matched = false;
        $$("option", infusionSelect).forEach(function (opt) {
          if (opt.value === name || opt.textContent.trim() === name) { infusionSelect.value = opt.value || name; matched = true; }
        });
        if (!matched) infusionSelect.value = name;
      }
      scrollToId("anfrage");
      // kurze visuelle Bestätigung
      setTimeout(function () {
        var nameField = $("#name");
        if (nameField) nameField.focus({ preventScroll: true });
      }, 500);
    });
  });

  /* --- Telefon-Klicks tracken ------------------------------------- */
  $$('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener("click", trackPhone);
  });

  /* --- PLZ-Softcheck: sanfter Hinweis ausserhalb Region (nicht blockierend) --- */
  var plzInput = $("#plz");
  var plzHint = $("#plz-hint");
  if (plzInput && plzHint) {
    plzInput.addEventListener("input", function () {
      var v = plzInput.value.replace(/\D/g, "");
      var inArea = /^8\d{3}$/.test(v); // Grossraum Zürich = PLZ 8xxx
      plzHint.hidden = !(v.length === 4 && !inArea);
    });
  }

  /* --- Formular ---------------------------------------------------- */
  var form = $("#lead-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var submitBtn = $('button[type="submit"]', form);
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Wird gesendet …"; }

      function val(sel) { var el = $(sel); return el ? el.value.trim() : ""; }
      function radioVal(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
      var data = {
        ziel:     val("#ziel"),
        zeitraum: val("#zeitraum"),
        plz:      val("#plz"),
        infusion: infusionSelect ? infusionSelect.value : "",
        name:     val("#name"),
        phone:    val("#phone"),
        email:    val("#email"),
        message:  val("#message"),
        consent:  ($("#consent") && $("#consent").checked) ? "ja" : "",
        arzt_behandlung: radioVal("arzt_behandlung"),
        vorerkrankungen: radioVal("vorerkrankungen"),
        medikamente: radioVal("medikamente"),
        source:   location.href,
        _subject: "Neue Infusions-Anfrage (Landingpage)"
      };

      trackLead({ ziel: data.ziel, infusion: data.infusion, zeitraum: data.zeitraum });

      function done() { window.location.href = THANKS_URL; }

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).then(done).catch(done);
      } else {
        // Kein Endpoint konfiguriert: Tracking ist gefeuert, direkt zur Dankeseite.
        done();
      }
    });
  }

  /* --- Jahr im Footer --------------------------------------------- */
  var yearEl = $("#year");
  if (yearEl) {
    var y = new Date().getFullYear();
    if (y && !isNaN(y)) yearEl.textContent = y;
  }

  /* --- Bilder: sanft aufblenden, sobald geladen ------------------- */
  $$("img.img-fade").forEach(function (img) {
    if (img.complete && img.naturalWidth) img.classList.add("is-loaded");
    else img.addEventListener("load", function () { img.classList.add("is-loaded"); }, { once: true });
    // Falls ein Bild fehlt: nicht unsichtbar stehen lassen
    img.addEventListener("error", function () { img.classList.add("is-loaded"); }, { once: true });
  });

  /* --- Gestaffelte Reveals in Grids (Kaskade statt Blockwechsel) --- */
  [".menu-grid", ".team-grid", ".cards", ".steps", ".trustbar__grid"].forEach(function (sel) {
    $$(sel).forEach(function (grid) {
      Array.prototype.slice.call(grid.children).forEach(function (el, i) {
        el.style.setProperty("--d", Math.min(i, 5) * 80 + "ms");
      });
    });
  });

  /* --- Zahlen hochzaehlen (Trust-Bar) ----------------------------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute("data-to"));
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (isNaN(to)) return;
    var dur = 1100, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // ease-out
      el.textContent = (to * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = to.toFixed(dec);
    }
    requestAnimationFrame(step);
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Reveal-on-scroll (progressive enhancement) -----------------
     Die Animation ist Kür. Sichtbarer Inhalt ist Pflicht: Wenn der
     IntersectionObserver fehlt ODER (aus welchem Grund auch immer) nicht
     feuert, wird nach kurzer Zeit trotzdem alles sichtbar gemacht.
     Eine Landingpage darf nie leer bleiben. */
  function finishCount(c) {
    c.textContent = parseFloat(c.getAttribute("data-to"))
      .toFixed(parseInt(c.getAttribute("data-decimals") || "0", 10));
  }
  function revealAll() {
    // Ohne Animation, damit der Inhalt auch dann erscheint, wenn CSS-Transitions
    // nicht anlaufen — sonst bliebe die Seite bei opacity 0 haengen.
    document.documentElement.classList.add("no-anim");
    reveals.forEach(function (el) { el.classList.add("is-in"); });
    $$("img.img-fade").forEach(function (i) { i.classList.add("is-loaded"); });
    $$(".count").forEach(function (c) {
      if (c.dataset.done) return;
      c.dataset.done = "1";
      finishCount(c);
    });
  }

  var reveals = $$(".reveal, .stagger");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        $$(".count", en.target).forEach(function (c) {
          if (c.dataset.done) return;
          c.dataset.done = "1";
          if (reduceMotion) finishCount(c);
          else countUp(c);
        });
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });

    // Sicherheitsnetz: Hat der Observer nach 1.5s nichts eingeblendet,
    // gilt er als wirkungslos -> Inhalt ohne Animation zeigen.
    setTimeout(function () {
      if (!document.querySelector(".reveal.is-in, .stagger.is-in")) revealAll();
    }, 1500);
  } else {
    revealAll();
  }
})();
