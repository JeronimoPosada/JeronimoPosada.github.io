(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";

  /* ================= Idioma ================= */
  var dict = window.I18N;
  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-i18n]"));
  dict.es = {};
  nodes.forEach(function (n) { dict.es[n.dataset.i18n] = n.textContent; });

  var lang = "es";
  try { lang = localStorage.getItem("lang") || ((navigator.language || "es").slice(0, 2) === "es" ? "es" : "en"); } catch (e) {}
  function ui(k) { return dict.ui[lang][k]; }

  function setLang(next) {
    lang = next === "en" ? "en" : "es";
    doc.lang = lang;
    nodes.forEach(function (n) {
      var v = dict[lang][n.dataset.i18n];
      if (v != null) n.textContent = v;
    });
    document.title = ui("title");
    document.querySelectorAll(".js-cv").forEach(function (a) { a.setAttribute("href", ui("cv")); });
    document.querySelectorAll("#ledgerRows li").forEach(paintRow);
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }
  document.getElementById("lang").addEventListener("click", function () {
    setLang(lang === "es" ? "en" : "es");
  });

  /* ================= Caja en vivo ================= */
  var rowsEl = document.getElementById("ledgerRows");
  var okEl = document.getElementById("okCount");
  var revEl = document.getElementById("revCount");
  var msgEl = document.getElementById("ledgerMsg");
  var ROW_H = 53, MAX = 6;
  var names = ["Laura M.", "Andrés G.", "Valentina R.", "Camilo T.", "Sara P.", "Mateo C.", "Daniela V.", "Juan E.", "Isabella H.", "Santiago L."];
  var amounts = [18500, 22500, 31000, 36900, 48000, 54200, 61000, 73500, 27800, 42300];
  var rows = [];
  var ok = 0, rev = 0, tick = 0;

  function money(n) { return "$" + n.toLocaleString("es-CO"); }

  function paintRow(li) {
    var st = li.dataset.state;
    li.querySelector("small").textContent = ui("table") + " " + li.dataset.table + ", " + li.dataset.amount;
    li.querySelector(".pill").textContent = ui(st);
    li.querySelector(".bankcell").textContent =
      st === "ok" ? li.dataset.amount : st === "rev" ? ui("none") : "…";
  }

  function layout() {
    rows.forEach(function (li, i) { li.style.transform = "translateY(" + i * ROW_H + "px)"; });
  }

  function setState(li, st) {
    li.dataset.state = st;
    li.className = (st === "reading" ? "reading" : st);
    paintRow(li);
  }

  function addRow(fake, instant) {
    var li = document.createElement("li");
    var i = tick++;
    li.dataset.table = 1 + ((i * 5) % 13);
    li.dataset.amount = money(amounts[(i * 3) % amounts.length]);
    li.innerHTML = '<span class="who"><span></span><small></small></span><span class="bankcell"></span><span class="pill"></span>';
    li.querySelector(".who span").textContent = names[i % names.length];
    var bad = fake || (i % 9 === 5);
    var final = bad ? "rev" : "ok";

    rowsEl.prepend(li);
    rows.unshift(li);
    if (instant) {
      setState(li, final);
    } else {
      setState(li, "reading");
      li.classList.add("enter");
      requestAnimationFrame(function () { requestAnimationFrame(function () { li.classList.remove("enter"); }); });
      setTimeout(function () { setState(li, "matching"); }, 950);
      setTimeout(function () {
        setState(li, final);
        if (fake) msgEl.textContent = ui("caught");
      }, 1700);
    }
    if (final === "ok") ok++; else rev++;
    setTimeout(function () { okEl.textContent = ok; revEl.textContent = rev; }, instant ? 0 : 1700);

    if (rows.length > MAX) {
      var old = rows.pop();
      old.classList.add("leave");
      setTimeout(function () { old.remove(); }, 400);
    }
    layout();
  }

  for (var k = 0; k < 4; k++) addRow(false, true);
  layout();

  var timer = null;
  function start() { if (!timer && !reduce) timer = setInterval(function () { addRow(false, false); }, 2600); }
  function stop() { clearInterval(timer); timer = null; }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }, { threshold: 0.2 })
      .observe(document.getElementById("ledger"));
  } else { start(); }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

  document.getElementById("fakeBtn").addEventListener("click", function () {
    msgEl.textContent = "";
    addRow(true, reduce);
    if (reduce) msgEl.textContent = ui("caught");
  });

  /* ================= Auditoría: tachado al entrar ================= */
  var audit = document.getElementById("auditDemo");
  if ("IntersectionObserver" in window && !reduce) {
    var ao = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { audit.classList.add("seen"); ao.disconnect(); }
    }, { threshold: 0.6 });
    ao.observe(audit);
  } else { audit.classList.add("seen"); }

  var flow = document.getElementById("flow");
  if ("IntersectionObserver" in window) {
    var fo = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { flow.classList.add("seen"); fo.disconnect(); }
    }, { threshold: 0.5 });
    fo.observe(flow);
  } else { flow.classList.add("seen"); }

  setLang(lang);

  /* ================= Animaciones con GSAP ================= */
  if (!hasGsap || reduce) {
    doc.classList.remove("js");
    document.querySelector("#bank .match").classList.add("lit");
    return;
  }
  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  var out = "expo.out";

  // Entrada del hero: el único momento orquestado al cargar.
  gsap.timeline({ defaults: { ease: out } })
    .to(".hero-title .line > span", { yPercent: 0, y: 0, duration: 1.1, stagger: 0.09 }, 0.1)
    .to(".hero-sub", { opacity: 1, duration: 0.6 }, 0.55)
    .to(".hero-cta", { opacity: 1, duration: 0.6 }, 0.65)
    .fromTo(".ledger", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, 0.45);

  // ConciliaIA: el comprobante recorre el proceso mientras se hace scroll.
  var steps = Array.prototype.slice.call(document.querySelectorAll("#steps li"));
  function setStep(i) { steps.forEach(function (s, n) { s.classList.toggle("is-on", n <= i); }); }
  var matchRow = document.querySelector("#bank .match");

  var PIN = "(min-width: 981px) and (min-height: 700px)";
  gsap.matchMedia().add(PIN, function () {
    gsap.set("#fields li", { opacity: 0, x: -24 });
    gsap.set("#bank", { opacity: 0, y: 24 });
    gsap.set("#stamp", { opacity: 0, scale: 1.5, rotate: 8 });
    gsap.set(".receipt-scan", { opacity: 0, yPercent: 0 });
    setStep(0);

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".concilia-inner",
        start: "center 54%",
        end: "+=1800",
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        onUpdate: function (self) {
          var p = self.progress;
          setStep(p < 0.14 ? 0 : p < 0.48 ? 1 : p < 0.8 ? 2 : 3);
          matchRow.classList.toggle("lit", p > 0.66);
        }
      }
    });
    tl.to(".receipt-scan", { opacity: 1, duration: 0.05 }, 0.12)
      .to(".receipt-scan", { y: 230, duration: 0.3, ease: "none" }, 0.12)
      .to(".receipt-scan", { opacity: 0, duration: 0.05 }, 0.42)
      .to("#fields li", { opacity: 1, x: 0, duration: 0.14, stagger: 0.06, ease: "power2.out" }, 0.2)
      .to("#bank", { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.5)
      .to("#stamp", { opacity: 1, scale: 1, rotate: -12, duration: 0.12, ease: "power3.out" }, 0.82)
      .to({}, { duration: 0.06 });

    return function () { setStep(0); matchRow.classList.add("lit"); };
  });

  if (!window.matchMedia(PIN).matches) {
    steps.forEach(function (s) { s.classList.add("is-on"); });
    matchRow.classList.add("lit");
  }

  // "Hablemos." crece al llegar al final.
  gsap.from(".contact h2", {
    scale: 0.82, transformOrigin: "left bottom", ease: "none",
    scrollTrigger: { trigger: ".contact", start: "top 90%", end: "top 30%", scrub: 0.5 }
  });
})();
