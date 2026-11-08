/* PoiWallet 1.3.0 — all data stays in this browser (localStorage). */
(() => {
  "use strict";
  const VERSION = "1.3.0";
  const KEY = "poiwallet.v1";
  const $ = id => document.getElementById(id);

  // ---------- Code formats ----------
  // id = bwip-js symbology; bd = BarcodeDetector name; zx = ZXing BarcodeFormat name
  const FORMATS = [
    { id: "code128", label: "Code 128", bd: "code_128", zx: "CODE_128" },
    { id: "ean13", label: "EAN-13 / JAN", bd: "ean_13", zx: "EAN_13" },
    { id: "ean8", label: "EAN-8", bd: "ean_8", zx: "EAN_8" },
    { id: "upca", label: "UPC-A", bd: "upc_a", zx: "UPC_A" },
    { id: "upce", label: "UPC-E", bd: "upc_e", zx: "UPC_E" },
    { id: "code39", label: "Code 39", bd: "code_39", zx: "CODE_39" },
    { id: "interleaved2of5", label: "ITF", bd: "itf", zx: "ITF" },
    { id: "rationalizedCodabar", label: "Codabar (NW-7)", bd: "codabar", zx: "CODABAR" },
    { id: "qrcode", label: "QR", bd: "qr_code", zx: "QR_CODE", square: true },
    { id: "datamatrix", label: "Data Matrix", bd: "data_matrix", zx: "DATA_MATRIX", square: true },
    { id: "azteccode", label: "Aztec", bd: "aztec", zx: "AZTEC", square: true },
    { id: "pdf417", label: "PDF417", bd: "pdf417", zx: "PDF_417" },
    { id: "none", label: "" },
  ];
  const fmtById = id => FORMATS.find(f => f.id === id) || FORMATS[0];
  const CATS = ["grocery", "drug", "fashion", "food", "electronics", "travel", "fuel", "other"];
  const COLORS = ["#c8352b", "#e0731f", "#e9b10e", "#2f8f4e", "#0f8a8a", "#1f6fb2", "#5a3fa0", "#b0306f", "#2d3a4f", "#7a5a43"];

  // ---------- i18n ----------
  const LANGS = Object.keys(window.I18N);
  function detectLang() {
    for (const raw of navigator.languages || [navigator.language || "en"]) {
      const l = raw.toLowerCase();
      if (l.startsWith("zh")) return /tw|hk|mo|hant/.test(l) ? "zh-Hant" : "zh-Hans";
      const base = l.split("-")[0];
      if (window.I18N[base]) return base;
    }
    return "en";
  }
  let lang = "en";
  const t = (k, vars) => {
    let s = (window.I18N[lang] && window.I18N[lang][k]) ?? window.I18N.en[k] ?? k;
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll("{" + a + "}", b);
    return s;
  };
  const nf = () => new Intl.NumberFormat(lang);
  const df = () => new Intl.DateTimeFormat(lang, { year: "numeric", month: "short", day: "numeric" });
  const rtf = () => new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = window.I18N[lang]._dir || "ltr";
    document.title = t("appName");
    document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll("[data-t-ph]").forEach(el => { el.placeholder = t(el.dataset.tPh); });
    document.querySelectorAll("[data-t-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.tAria)); });
    document.querySelectorAll("[data-t-title]").forEach(el => { el.title = t(el.dataset.tTitle); });
    $("q").setAttribute("aria-label", t("searchPh"));
    const fmtOpts = FORMATS.map(f => `<option value="${f.id}">${esc(f.id === "none" ? t("fmtNone") : f.label)}</option>`).join("");
    $("fFmt").innerHTML = fmtOpts; $("cFmt").innerHTML = fmtOpts;
    $("fCat").innerHTML = CATS.map(c => `<option value="${c}">${esc(t("cat_" + c))}</option>`).join("");
    $("langSel").innerHTML = LANGS.map(l => `<option value="${l}">${esc(window.I18N[l]._name)}</option>`).join("");
    $("langSel").value = lang;
    $("authLang").innerHTML = $("langSel").innerHTML; $("authLang").value = lang;
    if (!$("auth").hidden) paintAuth();
  }

  // ---------- Storage ----------
  let storageOk = true;
  let state = load();
  function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function isoIn(days) { const d = today(); d.setDate(d.getDate() + days); return d.toLocaleDateString("sv"); }
  function samples() {
    return [
      { id: "s1", name: t("ex1"), num: "2900123456785", fmt: "ean13", pts: 1240, exp: isoIn(12), notes: t("exNote1"), cat: "drug", color: COLORS[0], fav: true, used: 6, lastUsed: Date.now() - 864e5, sample: true,
        hist: [{ at: Date.now() - 864e5, d: 40, bal: 1240 }, { at: Date.now() - 4 * 864e5, d: -300, bal: 1200 }, { at: Date.now() - 9 * 864e5, d: 120, bal: 1500 }],
        coupons: [{ id: "k1", title: "10% OFF", detail: "", exp: isoIn(5), code: "COUPON10", fmt: "code128", used: false }] },
      { id: "s2", name: t("ex2"), num: "BAKERY-00482", fmt: "qrcode", pts: 8, exp: isoIn(95), notes: t("exNote2"), cat: "food", color: COLORS[1], used: 3, lastUsed: Date.now() - 3 * 864e5, sample: true },
      { id: "s3", name: t("ex3"), num: "A12345678B", fmt: "rationalizedCodabar", pts: 560, exp: isoIn(-3), notes: "", cat: "other", color: COLORS[5], used: 1, lastUsed: Date.now() - 20 * 864e5, sample: true },
    ];
  }
  function load() {
    try {
      localStorage.setItem(KEY + ".probe", "1"); localStorage.removeItem(KEY + ".probe");
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.cards)) return s; }
    } catch (e) { storageOk = false; }
    return { v: 1, cards: null, deleted: {}, settings: {} };
  }
  function save() {
    if (!storageOk) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { storageOk = false; $("storageBanner").hidden = false; }
    scheduleSync();
  }
  const cards = () => state.cards;

  // ---------- Helpers ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function daysLeft(exp) { if (!exp) return null; return Math.round((new Date(exp + "T00:00:00") - today()) / 864e5); }
  function textOn(hex) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    const L = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    return (0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b)) > 0.4 ? "#141821" : "#ffffff";
  }
  function fmtPts(v) { return nf().format(+v || 0); }
  const round2 = v => Math.round(v * 100) / 100;
  const HIST_MAX = 60;
  function logPoints(c, before, after, kind) {
    const d = round2(after - before); if (!d) return;
    c.hist = [{ at: Date.now(), d, bal: after, ...(kind ? { k: kind } : {}) }, ...(c.hist || [])].slice(0, HIST_MAX);
  }
  function monthStart() { const d = today(); d.setDate(1); return d.getTime(); }
  function monthTotals(list) {
    const from = monthStart(); let plus = 0, minus = 0;
    for (const c of list) for (const h of c.hist || []) {
      if (h.at < from || h.k === "edit") continue;
      if (h.d > 0) plus += h.d; else minus -= h.d;
    }
    return { plus: round2(plus), minus: round2(minus) };
  }
  const signed = v => (v > 0 ? "+" : v < 0 ? "−" : "") + fmtPts(Math.abs(v));

  // ---------- Barcode rendering ----------
  function codeText(fmt, num) {
    if (fmt === "rationalizedCodabar" && !/^[A-D].*[A-D]$/i.test(num)) return "A" + num + "A";
    return num;
  }
  function barcodeSvg(fmt, num, compact) {
    if (fmt === "none" || !window.bwipjs) return "";
    const f = fmtById(fmt);
    const opts = { bcid: fmt, text: codeText(fmt, num), scale: 3, includetext: false, backgroundcolor: "FFFFFF", barcolor: "000000",
      paddingwidth: f.square ? 4 : 10, paddingheight: 4 };
    if (!f.square) opts.height = compact ? 10 : 22;
    if (fmt === "pdf417") { delete opts.height; opts.columns = 4; }
    if (fmt === "qrcode") opts.eclevel = "M";
    return window.bwipjs.toSVG(opts);
  }
  function cleanLink(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";
    if (/^(javascript|data|vbscript|file|blob):/i.test(s)) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
    try { const u = new URL(s); if (u.protocol === "http:") u.protocol = "https:"; return u.href; } catch (e) { return null; }
  }
  // ---------- Official app directory ----------
  const APPS = window.POI_APPS || [];
  const normName = s => String(s || "").toLowerCase().normalize("NFKC").replace(/[\s・\-‐_.'’!！]/g, "");
  function matchApp(name) {
    const n = normName(name); if (n.length < 2) return null;
    return APPS.find(a => a.names.some(x => { const y = normName(x); return n.includes(y) || (y.startsWith(n) && n.length >= 2); })) || null;
  }
  const appById = id => APPS.find(a => a.id === id) || null;
  const isAndroid = /android/i.test(navigator.userAgent);
  function appHref(c) {
    let pkg = null, iosId = null;
    const a = c.appId && appById(c.appId);
    if (a) { pkg = a.android; iosId = a.ios; }
    else if (c.link) {
      try {
        const u = new URL(c.link);
        if (u.hostname === "play.google.com") pkg = u.searchParams.get("id");
        const m = u.hostname === "apps.apple.com" && u.pathname.match(/\/id(\d+)/);
        if (m) iosId = m[1];
      } catch (e) {}
    }
    if (pkg && !/^[A-Za-z0-9_.]+$/.test(pkg)) pkg = null;
    const play = pkg ? `https://play.google.com/store/apps/details?id=${pkg}` : "";
    const appStore = iosId ? `https://apps.apple.com/jp/app/id${iosId}` : "";
    // Android, running as its own page or installed app: start the installed app directly,
    // falling back to its Play page. Embedded previews block that kind of link, so there we use the store page.
    let framed = true; try { framed = window.top !== window; } catch (e) {}
    if (isAndroid && pkg && !framed) return { href: `intent://#Intent;package=${pkg};S.browser_fallback_url=${encodeURIComponent(play)};end`, alt: play };
    if (isAndroid && pkg) return { href: play, alt: "" };
    if (isIOS && appStore) return { href: appStore, alt: "" };
    return { href: c.link || play || appStore || "", alt: "" };
  }
  let chosenAppId = null, appDismissed = false;
  function paintAppUI() {
    const linked = chosenAppId && appById(chosenAppId);
    $("appLinked").hidden = !linked; $("linkWrap").hidden = !!linked;
    if (linked) { $("appLinkedText").textContent = "↗ " + t("appLinked", { name: linked.name }); $("appSuggest").hidden = true; return; }
    const m = !appDismissed && matchApp($("fName").value);
    $("appSuggest").hidden = !m;
    if (m) { $("appSuggestText").textContent = t("appSuggest", { name: m.name }); $("appAttach").dataset.app = m.id; }
  }

  function validate(fmt, num) {
    if (fmt === "none") return "";
    try { barcodeSvg(fmt, num, true); return ""; }
    catch (e) { return t("errFormat", { name: fmtById(fmt).label }); }
  }

  // ---------- Rendering the list ----------
  let filter = "all";
  function sortCards(list, how) {
    const far = 1e9;
    const by = {
      smart: (a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (b.used || 0) - (a.used || 0) || (b.lastUsed || 0) - (a.lastUsed || 0),
      expiry: (a, b) => (daysLeft(a.exp) ?? far) - (daysLeft(b.exp) ?? far),
      points: (a, b) => (b.pts || 0) - (a.pts || 0),
      name: (a, b) => a.name.localeCompare(b.name, lang),
    };
    return list.sort(by[how] || by.smart);
  }
  function expiryChip(c) {
    const d = daysLeft(c.exp);
    if (d === null) return "";
    if (d < 0) return `<span class="chip bad">${esc(t("expired"))} · ${esc(df().format(new Date(c.exp + "T00:00:00")))}</span>`;
    if (d <= 30) return `<span class="chip warn">${esc(t("expires"))} ${esc(rtf().format(d, "day"))}</span>`;
    return `<span class="chip">${esc(t("expires"))} ${esc(df().format(new Date(c.exp + "T00:00:00")))}</span>`;
  }
  const activeCoupons = c => (c.coupons || []).filter(k => !k.used && (daysLeft(k.exp) ?? 0) >= 0);
  function couponChip(c) {
    const list = activeCoupons(c); if (!list.length) return "";
    const soon = list.some(k => { const d = daysLeft(k.exp); return d !== null && d <= 7; });
    return `<span class="chip ${soon ? "warn" : ""}">🎟 ${esc(t("couponCount", { n: nf().format(list.length) }))}</span>`;
  }
  function paintHello(all, soon) {
    const hr = new Date().getHours();
    const greet = t(hr < 11 ? "hiMorning" : hr < 18 ? "hiDay" : "hiEvening");
    const total = all.filter(c => !c.sample).length;
    const coupons = all.reduce((s, c) => s + activeCoupons(c).length, 0);
    let msg = greet + " " + (total === 0 ? t("poiEmpty") : soon ? t("poiSoon", { n: nf().format(soon) }) : coupons ? t("poiCoupons", { n: nf().format(coupons) }) : monthTotals(all).plus > 0 ? t("poiMonth", { n: fmtPts(monthTotals(all).plus) }) : t("poiFine"));
    $("helloText").textContent = msg;
    const mood = total === 0 ? "hi" : soon ? "worried" : "happy";
    if ($("helloPoi").dataset.mood !== mood && window.mascotSvg) { $("helloPoi").innerHTML = mascotSvg(mood); $("helloPoi").dataset.mood = mood; }
  }
  function paintMascots() {
    if (!window.mascotSvg) return;
    document.querySelectorAll("[data-poi]").forEach(el => { el.innerHTML = mascotSvg(el.dataset.poi); });
  }
  function render() {
    const all = cards();
    const q = $("q").value.trim().toLowerCase();
    let rows = all.filter(c => {
      if (filter === "fav" && !c.fav) return false;
      if (filter !== "all" && filter !== "fav" && c.cat !== filter) return false;
      return !q || c.name.toLowerCase().includes(q) || c.num.toLowerCase().includes(q) || (c.notes || "").toLowerCase().includes(q);
    });
    rows = sortCards(rows, $("sort").value);

    $("list").innerHTML = rows.length ? rows.map(c => `
      <button class="card" type="button" data-id="${esc(c.id)}" style="--c:${esc(c.color)};--cf:${textOn(c.color)}">
        <span class="store">${c.fav ? '<span aria-hidden="true">★</span>' : ""}${esc(c.name)}</span>
        <span class="num">${esc(c.num)}</span>
        <span class="pts"><b>${esc(fmtPts(c.pts))}</b><small>${esc(t("pts"))}</small></span>
        <span class="meta">${expiryChip(c)}${couponChip(c)}${c.link || c.appId ? `<span class="chip soft">↗ ${esc(t("appChip"))}</span>` : ""}${c.cat ? `<span class="chip soft">${esc(t("cat_" + c.cat))}</span>` : ""}</span>
      </button>`).join("")
      : all.length
        ? `<div class="empty"><p>${esc(t("noMatch"))}</p></div>`
        : `<div class="empty"><span class="poi-s">${window.mascotSvg ? mascotSvg("sleepy") : ""}</span><h2>${esc(t("emptyTitle"))}</h2><p>${esc(t("emptyBody"))}</p><button class="btn primary" type="button" data-act="add">＋ ${esc(t("add"))}</button></div>`;

    const soon = all.filter(c => { const d = daysLeft(c.exp); return d !== null && d >= 0 && d <= 30; }).length;
    $("sCount").textContent = nf().format(all.length);
    $("sPts").textContent = fmtPts(all.reduce((s, c) => s + (+c.pts || 0), 0));
    $("sSoon").textContent = nf().format(soon);
    $("sMonth").textContent = "+" + fmtPts(monthTotals(all).plus);
    $("soonBanner").hidden = soon === 0 || $("sort").value === "expiry";
    $("soonText").textContent = t("soonBanner", { n: nf().format(soon) });
    paintHello(all, soon);
    $("sampleNote").hidden = !all.some(c => c.sample);
    $("storageBanner").hidden = storageOk;

    const used = new Set(all.map(c => c.cat));
    const chips = [["all", t("all")]];
    if (all.some(c => c.fav)) chips.push(["fav", "★ " + t("favorites")]);
    CATS.filter(c => used.has(c)).forEach(c => chips.push([c, t("cat_" + c)]));
    if (!chips.some(([k]) => k === filter)) filter = "all";
    $("chips").hidden = chips.length < 3;
    $("chips").innerHTML = chips.map(([k, label]) => `<button type="button" role="tab" data-f="${k}" aria-selected="${k === filter}">${esc(label)}</button>`).join("");
  }

  // ---------- Overlays (with Back-button support) ----------
  const stack = [];
  function openOverlay(id, focusId) {
    const el = $(id);
    stack.push({ id, returnFocus: document.activeElement });
    el.hidden = false;
    try { history.pushState({ pw: id }, ""); } catch (e) {}
    setTimeout(() => { const f = focusId ? $(focusId) : el.querySelector("button, input, select"); f && f.focus(); }, 30);
  }
  function hideTop() {
    const top = stack.pop(); if (!top) return;
    $(top.id).hidden = true;
    onHide(top.id);
    try { top.returnFocus && top.returnFocus.focus(); } catch (e) {}
  }
  function closeTop() {
    if (!stack.length) return;
    if (history.state && history.state.pw === stack[stack.length - 1].id) { try { history.back(); return; } catch (e) {} }
    hideTop();
  }
  window.addEventListener("popstate", () => { if (stack.length) hideTop(); });
  function onHide(id) {
    if (id === "show") { releaseWake(); showingId = null; render(); }
    if (id === "scanner") stopScan();
    if (id === "sheet") editingId = null;
  }

  // ---------- Show at register ----------
  let showingId = null, wakeLock = null;
  async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch (e) { wakeLock = null; } }
  function releaseWake() { try { wakeLock?.release(); } catch (e) {} wakeLock = null; }
  document.addEventListener("visibilitychange", () => { if (showingId && document.visibilityState === "visible") keepAwake(); });

  function paintSub(c) {
    const sub = [];
    if (c.pts) sub.push(fmtPts(c.pts) + " " + t("pts"));
    if (c.notes) sub.push(c.notes);
    $("showSub").textContent = sub.join(" · ");
  }
  let histAll = false;
  function paintPoints(c) {
    const hist = c.hist || [];
    const m = monthTotals([c]);
    $("ptsMonth").textContent = m.plus || m.minus ? t("ptsMonth", { plus: "+" + fmtPts(m.plus), minus: "−" + fmtPts(m.minus) }) : "";
    const rows = histAll ? hist : hist.slice(0, 5);
    $("ptsHist").innerHTML = rows.map(h => `<li><time datetime="${esc(new Date(h.at).toISOString())}">${esc(df().format(new Date(h.at)))}${h.k === "edit" ? " · " + esc(t("ptsEdited")) : ""}</time>
      <span class="d ${h.d > 0 ? "up" : "down"}">${esc(signed(h.d))}</span><span class="bal">${esc(fmtPts(h.bal))}</span></li>`).join("");
    $("ptsNone").hidden = hist.length > 0;
    $("ptsMore").hidden = hist.length <= 5;
    $("ptsMore").textContent = t(histAll ? "ptsLess" : "ptsMore");
  }
  function adjustPoints(kind) {
    const c = cards().find(x => x.id === showingId); if (!c) return;
    const amt = parseFloat(String($("ptsAmt").value).replace(",", "."));
    if (!isFinite(amt) || amt <= 0) { toast(t("ptsErr")); $("ptsAmt").focus(); return; }
    const before = +c.pts || 0;
    const raw = kind === "spend" ? before - amt : before + amt;
    const after = round2(Math.max(0, raw));
    const prevHist = c.hist, prevUpdated = c.updated;
    c.pts = after; logPoints(c, before, after); c.updated = Date.now(); c.sample = false;
    save(); $("ptsAmt").value = ""; paintSub(c); paintPoints(c);
    toast(raw < 0 ? t("ptsOver") : t("ptsSaved", { n: fmtPts(after) }), t("undo"), () => {
      c.pts = before; c.hist = prevHist; c.updated = Math.max(Date.now(), (prevUpdated || 0) + 1); save();
      if (showingId === c.id) { paintSub(c); paintPoints(c); }
    });
  }
  function paintShow(c) {
    $("showName").textContent = c.name;
    $("showNum").textContent = c.num;
    paintSub(c);
    paintPoints(c);
    const { href, alt } = appHref(c);
    $("showApp").hidden = !href;
    if (href) { $("showApp").href = href; if (href.startsWith("intent:")) $("showApp").removeAttribute("target"); else $("showApp").target = "_blank"; }
    $("showAppAlt").hidden = !alt; if (alt) $("showAppAlt").href = alt;
    $("showNum").hidden = !c.num;
    paintCoupons(c);
    const box = $("showCode");
    box.className = "code" + (fmtById(c.fmt).square ? " square" : "");
    try { box.innerHTML = barcodeSvg(c.fmt, c.num, false); }
    catch (e) { box.innerHTML = `<p class="code-err">${esc(t("errFormat", { name: fmtById(c.fmt).label }))}</p>`; }
    box.hidden = !box.innerHTML.trim();
    document.querySelector(".show .hint").hidden = box.hidden;
  }
  function openShow(id) {
    const c = cards().find(x => x.id === id); if (!c) return;
    showingId = id; histAll = false; $("ptsAmt").value = "";
    c.used = (c.used || 0) + 1; c.lastUsed = Date.now(); save();
    paintShow(c);
    openOverlay("show", "showClose");
    keepAwake();
  }
  let openCoupon = null;
  function paintCoupons(c) {
    const list = activeCoupons(c).sort((x, y) => (daysLeft(x.exp) ?? 1e9) - (daysLeft(y.exp) ?? 1e9));
    $("couponList").innerHTML = list.length ? list.map(k => {
      const d = daysLeft(k.exp);
      const chip = d === null ? "" : `<span class="chip ${d <= 7 ? "warn" : ""}">${esc(t("expires"))} ${esc(d <= 30 ? rtf().format(d, "day") : df().format(new Date(k.exp + "T00:00:00")))}</span>`;
      let body = "";
      if (openCoupon === k.id) {
        let svg = "";
        if (k.code && k.fmt !== "none") { try { svg = barcodeSvg(k.fmt, k.code, true); } catch (e) { svg = ""; } }
        body = `<div class="coupon-body">${svg}${k.code ? `<div class="code-txt">${esc(k.code)}</div>` : ""}
          <div class="row"><button class="btn small ghost" type="button" data-cedit="${esc(k.id)}">${esc(t("edit"))}</button>
          <button class="btn small primary" type="button" data-cuse="${esc(k.id)}">${esc(t("couponUse"))}</button></div></div>`;
      }
      return `<div class="coupon"><button class="coupon-main" type="button" data-copen="${esc(k.id)}" aria-expanded="${openCoupon === k.id}">
        <b>${esc(k.title)}</b>${k.detail ? `<span>${esc(k.detail)}</span>` : ""}${chip}</button>${body}</div>`;
    }).join("") : `<p class="coupon-none">${esc(t("couponNone"))}</p>`;
  }
  let editingCoupon = null;
  function openCouponForm(cid) {
    const c = cards().find(x => x.id === showingId); if (!c) return;
    editingCoupon = cid || null;
    const k = (c.coupons || []).find(x => x.id === cid) || { title: "", detail: "", exp: "", code: "", fmt: "code128" };
    $("couponFormTitle").textContent = t(cid ? "editCoupon" : "addCoupon");
    $("cTitle").value = k.title; $("cDetail").value = k.detail || ""; $("cExp").value = k.exp || ""; $("cCode").value = k.code || ""; $("cFmt").value = k.fmt || "code128";
    $("cDel").hidden = true;
    $("cErr").hidden = true;
    openOverlay("couponSheet", "cTitle");
  }
  function submitCoupon(e) {
    e.preventDefault();
    const c = cards().find(x => x.id === showingId); if (!c) return;
    const title = $("cTitle").value.trim(), code = $("cCode").value.trim(), fmt = $("cFmt").value;
    const err = !title ? t("errName") : code ? validate(fmt, code) : "";
    if (err) { $("cErr").textContent = err; $("cErr").hidden = false; return; }
    c.coupons = c.coupons || [];
    const data = { title, detail: $("cDetail").value.trim(), exp: $("cExp").value, code, fmt };
    if (editingCoupon) Object.assign(c.coupons.find(x => x.id === editingCoupon), data);
    else { const id = uid(); c.coupons.push({ id, used: false, ...data }); openCoupon = id; }
    c.updated = Date.now(); c.sample = false;
    save(); closeTop(); paintCoupons(c); toast(t("saved"));
  }
  function useCoupon(cid) {
    const c = cards().find(x => x.id === showingId); if (!c) return;
    const k = (c.coupons || []).find(x => x.id === cid); if (!k) return;
    k.used = true; k.usedAt = Date.now(); c.updated = Date.now(); save(); paintCoupons(c);
    toast(t("couponUsed"), t("undo"), () => { k.used = false; c.updated = Date.now(); save(); paintCoupons(c); });
  }
  async function copyNumber() {
    const n = $("showNum").textContent;
    try { await navigator.clipboard.writeText(n); toast(t("copied")); }
    catch (e) { const r = document.createRange(); r.selectNodeContents($("showNum")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  }

  // ---------- Add / edit ----------
  let editingId = null, chosenColor = COLORS[0];
  function paintSwatches() {
    $("swatches").innerHTML = COLORS.map(col => `<button type="button" style="--c:${col}" data-col="${col}" aria-label="${col}" aria-pressed="${col === chosenColor}"></button>`).join("");
    $("fColorPick").value = chosenColor;
    const n = parseInt(chosenColor.slice(1), 16);
    if (document.activeElement !== $("fRgb")) $("fRgb").value = `${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}`;
  }
  function setColorFromRgb() {
    const parts = $("fRgb").value.split(/[^0-9]+/).filter(Boolean).map(Number);
    const ok = parts.length === 3 && parts.every(v => v >= 0 && v <= 255);
    if (!ok) { $("fErr").textContent = t("rgbErr"); $("fErr").hidden = false; return false; }
    $("fErr").hidden = true;
    chosenColor = "#" + parts.map(v => v.toString(16).padStart(2, "0")).join("");
    paintSwatches(); return true;
  }
  function updatePreview() {
    const fmt = $("fFmt").value, num = $("fNum").value.trim();
    let html = "";
    if (num && fmt !== "none") { try { html = barcodeSvg(fmt, num, true); } catch (e) { html = ""; } }
    $("preview").innerHTML = html;
  }
  function openForm(id) {
    editingId = id || null;
    const c = cards().find(x => x.id === id) || { name: "", num: "", fmt: "code128", pts: "", exp: "", notes: "", cat: "other", fav: false, color: COLORS[cards().filter(x => !x.sample).length % COLORS.length] };
    $("formTitle").textContent = t(id ? "editTitle" : "addTitle");
    $("fName").value = c.name; $("fNum").value = c.num; $("fFmt").value = c.fmt; $("fCat").value = c.cat || "other";
    $("fLink").value = c.link || "";
    chosenAppId = c.appId || null; appDismissed = false; paintAppUI();
    $("fPts").value = c.pts === "" || c.pts == null ? "" : c.pts; $("fExp").value = c.exp || ""; $("fNotes").value = c.notes || ""; $("fFav").checked = !!c.fav;
    $("fImg").value = ""; chosenColor = c.color; paintSwatches();
    $("fDel").hidden = !id; $("fDel").dataset.armed = ""; $("fDel").textContent = t("del");
    $("fErr").hidden = true; updatePreview();
    openOverlay("sheet", "fName");
  }
  function submitForm(e) {
    e.preventDefault();
    const name = $("fName").value.trim();
    const num = $("fNum").value.trim();
    const fmt = $("fFmt").value;
    if ($("fRgb").value.trim() && !setColorFromRgb()) return;
    const link = cleanLink($("fLink").value);
    const err = !name ? t("errName") : link === null && !chosenAppId ? t("linkErr") : !num && !link && !chosenAppId ? t("errNumber") : num ? validate(fmt, num) : "";
    if (err) { $("fErr").textContent = err; $("fErr").hidden = false; return; }
    const ptsRaw = parseFloat(String($("fPts").value).replace(",", "."));
    const data = { name, num, link: chosenAppId ? "" : link, appId: chosenAppId || "", fmt: num ? fmt : "none", cat: $("fCat").value, pts: isFinite(ptsRaw) && ptsRaw > 0 ? ptsRaw : 0, exp: $("fExp").value, notes: $("fNotes").value.trim(), fav: $("fFav").checked, color: chosenColor, updated: Date.now() };
    if (editingId) {
      const cur = cards().find(x => x.id === editingId);
      logPoints(cur, +cur.pts || 0, data.pts, "edit");
      Object.assign(cur, data, { sample: false });
      toast(t("saved"));
    } else {
      state.cards = cards().filter(c => !c.sample);
      state.cards.push({ id: uid(), used: 0, created: Date.now(), coupons: [], ...data });
      toast(t("added"));
    }
    save();
    const reopen = showingId && editingId ? showingId : null;
    closeTop();
    if (reopen) { const c = cards().find(x => x.id === reopen); if (c) paintShow(c); }
    render();
  }
  function deleteCard() {
    const btn = $("fDel");
    if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = t("del") + " ?"; return; }
    const idx = cards().findIndex(c => c.id === editingId); if (idx < 0) return;
    const [removed] = cards().splice(idx, 1);
    if (!removed.sample) state.deleted[removed.id] = Date.now();
    save();
    closeTop(); if (stack.length && stack[stack.length - 1].id === "show") setTimeout(closeTop, 50);
    render();
    toast(t("deleted"), t("undo"), () => { delete state.deleted[removed.id]; removed.updated = Date.now(); cards().splice(idx, 0, removed); save(); render(); });
  }

  // ---------- Scanning ----------
  let stream = null, scanTimer = null, zxingPromise = null;
  function loadZXing() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (!zxingPromise) zxingPromise = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = "vendor/zxing.min.js";
      s.onload = () => res(window.ZXing); s.onerror = () => { zxingPromise = null; rej(new Error("zxing")); };
      document.head.appendChild(s);
    });
    return zxingPromise;
  }
  async function nativeDetector() {
    if (!("BarcodeDetector" in window)) return null;
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      const want = FORMATS.map(f => f.bd).filter(x => x && supported.includes(x));
      return want.length ? new BarcodeDetector({ formats: want }) : null;
    } catch (e) { return null; }
  }
  function zxingDecode(canvas) {
    const Z = window.ZXing;
    const hints = new Map();
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, FORMATS.filter(f => f.zx).map(f => Z.BarcodeFormat[f.zx]));
    const reader = new Z.MultiFormatReader(); reader.setHints(hints);
    try {
      const r = reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas))));
      const zxName = Z.BarcodeFormat[r.getBarcodeFormat()];
      return { value: r.getText(), fmt: (FORMATS.find(f => f.zx === zxName) || FORMATS[0]).id };
    } catch (e) { return null; }
  }
  async function detectOn(source, canvas) {
    const det = await nativeDetector();
    if (det) {
      try {
        const found = await det.detect(source);
        if (found.length) return { value: found[0].rawValue, fmt: (FORMATS.find(f => f.bd === found[0].format) || FORMATS[0]).id };
        if (source instanceof HTMLVideoElement) return null;
      } catch (e) {}
    }
    await loadZXing();
    return zxingDecode(canvas);
  }
  function accept(result) {
    $("fNum").value = result.value;
    $("fFmt").value = result.fmt;
    updatePreview();
    toast(t("scanned") + " · " + fmtById(result.fmt).label);
  }
  async function startScan() {
    if (!navigator.mediaDevices?.getUserMedia) { toast(t("cameraError")); return; }
    openOverlay("scanner", "scanClose");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) { closeTop(); toast(t("cameraError")); return; }
    const video = $("video"); video.srcObject = stream;
    try { await video.play(); } catch (e) {}
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const tick = async () => {
      if (!stream) return;
      if (video.readyState >= 2 && video.videoWidth) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const r = await detectOn(video, canvas);
        if (r && stream) { navigator.vibrate?.(60); closeTop(); accept(r); return; }
      }
      scanTimer = setTimeout(tick, 180);
    };
    tick();
  }
  function stopScan() {
    clearTimeout(scanTimer); scanTimer = null;
    if (stream) stream.getTracks().forEach(tr => tr.stop());
    stream = null; $("video").srcObject = null;
  }
  async function scanPhoto(file) {
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      const img = new Image(); img.src = url; await img.decode();
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const r = await detectOn(canvas, canvas);
      r ? accept(r) : toast(t("scanNotFound"));
    } catch (e) { toast(t("scanNotFound")); }
  }

  // ---------- Backup ----------
  async function exportBackup() {
    const data = { app: "poiwallet", v: 1, version: VERSION, exported: new Date().toISOString(), cards: cards().filter(c => !c.sample) };
    const name = `poiwallet-backup-${new Date().toLocaleDateString("sv")}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const file = new File([blob], name, { type: "application/json" });
    if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.app !== "poiwallet" || !Array.isArray(data.cards)) throw new Error("bad");
      let n = 0;
      state.cards = cards().filter(c => !c.sample);
      for (const raw of data.cards) {
        if (!raw || typeof raw.name !== "string" || typeof raw.num !== "string") continue;
        if (raw.coupons && !Array.isArray(raw.coupons)) raw.coupons = [];
        const c = {
          id: typeof raw.id === "string" ? raw.id : uid(), name: raw.name.slice(0, 50), num: raw.num.slice(0, 200),
          fmt: FORMATS.some(f => f.id === raw.fmt) ? raw.fmt : "code128", cat: CATS.includes(raw.cat) ? raw.cat : "other",
          pts: +raw.pts > 0 ? +raw.pts : 0, exp: /^\d{4}-\d{2}-\d{2}$/.test(raw.exp || "") ? raw.exp : "",
          notes: String(raw.notes || "").slice(0, 120), link: cleanLink(raw.link) || "", appId: APPS.some(x => x.id === raw.appId) ? raw.appId : "", fav: !!raw.fav, color: /^#[0-9a-f]{6}$/i.test(raw.color || "") ? raw.color : COLORS[0],
          used: +raw.used || 0, lastUsed: +raw.lastUsed || 0, created: +raw.created || Date.now(), updated: +raw.updated || Date.now(),
          hist: (Array.isArray(raw.hist) ? raw.hist : []).filter(h => h && isFinite(h.at) && isFinite(h.d) && isFinite(h.bal)).slice(0, HIST_MAX)
            .map(h => ({ at: +h.at, d: round2(+h.d), bal: Math.max(0, round2(+h.bal)), ...(h.k === "edit" ? { k: "edit" } : {}) })),
          coupons: (raw.coupons || []).filter(k => k && typeof k.title === "string").slice(0, 200).map(k => ({
            id: typeof k.id === "string" ? k.id : uid(), title: k.title.slice(0, 60), detail: String(k.detail || "").slice(0, 120),
            exp: /^\d{4}-\d{2}-\d{2}$/.test(k.exp || "") ? k.exp : "", code: String(k.code || "").slice(0, 200),
            fmt: FORMATS.some(f => f.id === k.fmt) ? k.fmt : "code128", used: !!k.used })),
        };
        const i = state.cards.findIndex(x => x.id === c.id || (x.num === c.num && x.fmt === c.fmt));
        if (i >= 0) state.cards[i] = { ...state.cards[i], ...c, id: state.cards[i].id }; else state.cards.push(c);
        n++;
      }
      save(); render(); toast(t("imported", { n: nf().format(n) }));
    } catch (e) { toast(t("importError")); }
    $("importFile").value = "";
  }

  // ---------- Settings / theme / install ----------
  function applyTheme() {
    const th = state.settings.theme || "system";
    const root = document.documentElement;
    if (th === "system") { if (root.dataset.pwTheme) { root.removeAttribute("data-theme"); delete root.dataset.pwTheme; } }
    else { root.setAttribute("data-theme", th); root.dataset.pwTheme = "1"; }
    $("themeSel").value = th;
  }
  let installEvt = null;
  const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function paintInstall() {
    const canPrompt = !!installEvt, iosHint = isIOS && !isStandalone();
    $("installSec").hidden = !(canPrompt || iosHint);
    $("installBtn").hidden = !canPrompt;
    $("installIos").hidden = !iosHint;
  }
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; paintInstall(); });
  window.addEventListener("appinstalled", () => { installEvt = null; paintInstall(); });

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg, actLabel, act) {
    $("toastMsg").textContent = msg;
    const b = $("toastAct");
    b.hidden = !actLabel;
    if (actLabel) { b.textContent = actLabel; b.onclick = () => { $("toast").hidden = true; act(); }; }
    $("toast").hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").hidden = true; }, actLabel ? 6000 : 2600);
  }


  // ---------- Accounts (Supabase), cloud sync ----------
  const CFG = window.POIWALLET_CONFIG || {};
  const cloud = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  let sb = null, session = null, authMode = "signin", syncTimer = null, syncing = false, lastSyncOk = true;
  if (cloud) {
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit", storageKey: "poiwallet.auth" },
    });
  }
  const emailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const pwOk = s => s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);

  function paintAuth() {
    const m = authMode;
    $("authTitle").textContent = t({ signin: "signIn", signup: "signUp", forgot: "forgotPw", verify: "signIn", reset: "setPassword" }[m]);
    $("aEmailRow").hidden = m === "reset";
    $("aPwRow").hidden = m === "forgot";
    $("aPwLabel").textContent = t(m === "reset" ? "newPassword" : "password");
    $("aPw").autocomplete = m === "signin" || m === "verify" ? "current-password" : "new-password";
    $("aPw2Row").hidden = !(m === "signup" || m === "reset");
    $("aRule").hidden = !(m === "signup" || m === "reset");
    $("aShowRow").hidden = m === "forgot";
    $("aSubmit").textContent = t({ signin: "signIn", verify: "signIn", signup: "signUp", forgot: "forgotPw", reset: "setPassword" }[m]);
    $("aSwitch").textContent = t(m === "signup" ? "haveAccount" : m === "signin" || m === "verify" ? "noAccount" : "backToSignIn");
    $("aSwitch").hidden = m === "reset";
    $("aForgot").hidden = !(m === "signin" || m === "verify");
    $("aResend").hidden = m !== "verify";
  }
  function setAuthMode(m, info) {
    authMode = m; $("aErr").hidden = true;
    $("authInfo").hidden = !info; $("authInfo").textContent = info || "";
    paintAuth();
  }
  function authError(err) {
    const msg = String(err && (err.code || err.message) || "");
    $("aErr").textContent = /invalid.*cred|invalid_credentials/i.test(msg) ? t("authErrInvalid")
      : /not.*confirm|email_not_confirmed/i.test(msg) ? t("authErrNotConfirmed") : t("authErrGeneric");
    $("aErr").hidden = false;
  }
  function showAuth(m) { setAuthMode(m || "signin"); $("auth").hidden = false; setTimeout(() => $(m === "reset" ? "aPw" : "aEmail").focus(), 30); }
  async function submitAuth(e) {
    e.preventDefault();
    const email = $("aEmail").value.trim(), pw = $("aPw").value, pw2 = $("aPw2").value;
    const fail = k => { $("aErr").textContent = t(k); $("aErr").hidden = false; };
    if (authMode !== "reset" && !emailOk(email)) return fail("authErrEmail");
    if ((authMode === "signup" || authMode === "reset") && !pwOk(pw)) return fail("passwordRule");
    if ((authMode === "signup" || authMode === "reset") && pw !== pw2) return fail("pwMismatch");
    $("aSubmit").disabled = true;
    try {
      const redirect = location.origin + location.pathname;
      if (authMode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: redirect, data: { lang } } });
        if (error) throw error;
        if (data.session) await onSignedIn(data.session);
        else setAuthMode("verify", t("verifySent", { email }));
      } else if (authMode === "signin" || authMode === "verify") {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        await onSignedIn(data.session);
      } else if (authMode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (error) throw error;
        setAuthMode("signin", t("resetSent", { email }));
      } else if (authMode === "reset") {
        const { error } = await sb.auth.updateUser({ password: pw });
        if (error) throw error;
        toast(t("pwUpdated"));
        const { data } = await sb.auth.getSession();
        await onSignedIn(data.session);
      }
    } catch (err) { authError(err); }
    finally { $("aSubmit").disabled = false; $("aPw").value = ""; $("aPw2").value = ""; }
  }
  async function resendVerify() {
    const email = $("aEmail").value.trim(); if (!emailOk(email)) return;
    try { const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error;
      setAuthMode("verify", t("verifySent", { email })); } catch (err) { authError(err); }
  }
  async function onSignedIn(s) {
    if (!s) return;
    const firstTime = !session;
    session = s;
    $("auth").hidden = true;
    if (state.cards) state.cards = state.cards.filter(c => !c.sample);
    await pull();
    render(); paintAccount();
    if (firstTime && !state.settings.lockCred && !state.settings.lockAsked && await bioAvailable()) {
      state.settings.lockAsked = true; save(); openOverlay("lockAsk", "lockAskYes");
    }
  }
  async function signOut() {
    try { await sb.auth.signOut(); } catch (e) {}
    session = null;
    state = { v: 1, cards: [], deleted: {}, settings: { lang, theme: state.settings.theme } };
    save(); while (stack.length) hideTop(); render(); showAuth("signin");
  }
  async function deleteAccount() {
    const b = $("delAccBtn");
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = t("deleteAccountConfirm"); return; }
    try { const { error } = await sb.rpc("delete_account"); if (error) throw error; await signOut(); }
    catch (e) { toast(t("authErrGeneric")); }
  }

  // Merge two wallets: newest card wins, deletions win over older edits.
  function merge(local, remote) {
    const deleted = { ...(remote.deleted || {}) };
    for (const [id, ts] of Object.entries(local.deleted || {})) deleted[id] = Math.max(ts, deleted[id] || 0);
    const byId = new Map();
    for (const c of [...(remote.cards || []), ...(local.cards || [])]) {
      if (c.sample) continue;
      const prev = byId.get(c.id);
      if (!prev) byId.set(c.id, c);
      else {
        const win = (c.updated || 0) >= (prev.updated || 0) ? c : prev;
        byId.set(c.id, { ...win, used: Math.max(c.used || 0, prev.used || 0), lastUsed: Math.max(c.lastUsed || 0, prev.lastUsed || 0) });
      }
    }
    const cardsOut = [...byId.values()].filter(c => !(deleted[c.id] && deleted[c.id] >= (c.updated || c.created || 0)));
    return { cards: cardsOut, deleted };
  }
  async function pull() {
    if (!session) return;
    try {
      const { data, error } = await sb.from("wallets").select("data").eq("user_id", session.user.id).maybeSingle();
      if (error) throw error;
      const m = merge({ cards: state.cards || [], deleted: state.deleted || {} }, (data && data.data) || {});
      state.cards = m.cards; state.deleted = m.deleted;
      save(); await push();
    } catch (e) { lastSyncOk = false; paintAccount(); }
  }
  async function push() {
    if (!session || syncing) return;
    syncing = true;
    try {
      const payload = { cards: state.cards.filter(c => !c.sample), deleted: state.deleted || {} };
      const { error } = await sb.from("wallets").upsert({ user_id: session.user.id, data: payload, updated_at: new Date().toISOString() });
      if (error) throw error;
      lastSyncOk = true;
    } catch (e) { lastSyncOk = false; }
    syncing = false; paintAccount();
  }
  function scheduleSync() { if (!session) return; clearTimeout(syncTimer); syncTimer = setTimeout(push, 1200); }
  window.addEventListener("online", () => { if (session) pull().then(render); });
  function paintAccount() {
    $("accountSec").hidden = !session;
    $("localLockSec").hidden = !!session || !bioOk;
    $("privacyCloud").hidden = !cloud;
    if (!session) return;
    $("accEmail").textContent = t("signedInAs", { email: session.user.email || "" });
    $("accSync").textContent = lastSyncOk ? "✓ " + t("syncOk") : t("syncPending");
    $("lockToggle").checked = !!state.settings.lockCred;
    $("lockRow").hidden = !bioOk; $("lockNa").hidden = bioOk;
    $("delAccBtn").dataset.armed = ""; $("delAccBtn").textContent = t("deleteAccount");
  }

  // ---------- Fingerprint / face unlock (WebAuthn platform authenticator) ----------
  let bioOk = false, locked = false, hiddenAt = 0;
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const rand = n => crypto.getRandomValues(new Uint8Array(n));
  async function bioAvailable() {
    try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); }
    catch (e) { return false; }
  }
  async function enableLock() {
    try {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: rand(32), rp: { name: t("appName") },
        user: { id: rand(16), name: (session && session.user.email) || "PoiWallet", displayName: (session && session.user.email) || t("appName") },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60000,
      } });
      state.settings.lockCred = b64(cred.rawId); save(); paintAccount();
      $("lockToggleLocal").checked = true;
      return true;
    } catch (e) { toast(t("lockFailed")); paintAccount(); $("lockToggleLocal").checked = !!state.settings.lockCred; return false; }
  }
  function disableLock() { delete state.settings.lockCred; save(); paintAccount(); }
  function showLock() {
    if (!state.settings.lockCred) return;
    locked = true; $("lockErr").hidden = true; $("lockPw").hidden = !session; $("lock").hidden = false;
    setTimeout(() => $("unlockBtn").focus(), 30);
  }
  async function unlock() {
    try {
      await navigator.credentials.get({ publicKey: {
        challenge: rand(32), allowCredentials: [{ type: "public-key", id: unb64(state.settings.lockCred), transports: ["internal", "hybrid"] }],
        userVerification: "required", timeout: 60000,
      } });
      locked = false; $("lock").hidden = true;
    } catch (e) { $("lockErr").textContent = t("lockFailed"); $("lockErr").hidden = false; }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hiddenAt = Date.now();
    else if (state.settings.lockCred && !locked && hiddenAt && Date.now() - hiddenAt > 60000) showLock();
  });

  // ---------- Wiring ----------
  function bind() {
    $("list").addEventListener("click", e => {
      const card = e.target.closest(".card"); if (card) return openShow(card.dataset.id);
      if (e.target.closest("[data-act=add]")) openForm();
    });
    $("chips").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { filter = b.dataset.f; render(); } });
    $("addBtn").addEventListener("click", () => openForm());
    $("q").addEventListener("input", render);
    $("sort").addEventListener("change", () => { state.settings.sort = $("sort").value; save(); render(); });
    $("soonBtn").addEventListener("click", () => { $("sort").value = "expiry"; render(); });
    $("clearSample").addEventListener("click", () => { state.cards = cards().filter(c => !c.sample); save(); render(); });

    $("showClose").addEventListener("click", closeTop);
    $("showEdit").addEventListener("click", () => openForm(showingId));
    $("showNum").addEventListener("click", copyNumber);
    $("ptsForm").addEventListener("submit", e => { e.preventDefault(); adjustPoints(e.submitter?.dataset.kind || "earn"); });
    $("ptsMore").addEventListener("click", () => { histAll = !histAll; const c = cards().find(x => x.id === showingId); if (c) paintPoints(c); });

    $("form").addEventListener("submit", submitForm);
    $("fCancel").addEventListener("click", closeTop);
    $("fDel").addEventListener("click", deleteCard);
    $("fNum").addEventListener("input", updatePreview);
    $("fFmt").addEventListener("change", () => { updatePreview(); $("fErr").hidden = true; });
    $("swatches").addEventListener("click", e => { const b = e.target.closest("[data-col]"); if (b) { chosenColor = b.dataset.col; paintSwatches(); } });
    $("scanBtn").addEventListener("click", startScan);
    $("scanClose").addEventListener("click", closeTop);
    $("fImg").addEventListener("change", () => scanPhoto($("fImg").files[0]));
    ["sheet", "settings"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) closeTop(); }));

    $("settingsBtn").addEventListener("click", () => { paintInstall(); openOverlay("settings", "langSel"); });
    $("setClose").addEventListener("click", closeTop);
    $("langSel").addEventListener("change", () => {
      lang = $("langSel").value; state.settings.lang = lang;
      // Sample cards follow the language
      if (cards().some(c => c.sample)) state.cards = [...cards().filter(c => !c.sample), ...samples()];
      save(); applyLang(); render();
    });
    $("themeSel").addEventListener("change", () => { state.settings.theme = $("themeSel").value; save(); applyTheme(); });
    $("exportBtn").addEventListener("click", exportBackup);
    $("importFile").addEventListener("change", () => importBackup($("importFile").files[0]));
    $("installBtn").addEventListener("click", async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; paintInstall(); });


    $("fName").addEventListener("input", paintAppUI);
    $("appAttach").addEventListener("click", () => {
      const m = appById($("appAttach").dataset.app); if (!m) return;
      chosenAppId = m.id; if ($("fCat").value === "other") $("fCat").value = m.cat; paintAppUI();
    });
    $("appUnlink").addEventListener("click", () => { chosenAppId = null; appDismissed = true; paintAppUI(); });
    $("fColorPick").addEventListener("input", () => { chosenColor = $("fColorPick").value; paintSwatches(); });
    $("fRgb").addEventListener("change", setColorFromRgb);
    $("addCouponBtn").addEventListener("click", () => openCouponForm());
    $("couponList").addEventListener("click", e => {
      const o = e.target.closest("[data-copen]"), u = e.target.closest("[data-cuse]"), ed = e.target.closest("[data-cedit]");
      const c = cards().find(x => x.id === showingId); if (!c) return;
      if (u) return useCoupon(u.dataset.cuse);
      if (ed) return openCouponForm(ed.dataset.cedit);
      if (o) { openCoupon = openCoupon === o.dataset.copen ? null : o.dataset.copen; paintCoupons(c); }
    });
    $("couponForm").addEventListener("submit", submitCoupon);
    $("cCancel").addEventListener("click", closeTop);
    $("couponSheet").addEventListener("click", e => { if (e.target === $("couponSheet")) closeTop(); });
    $("authForm").addEventListener("submit", submitAuth);
    $("aSwitch").addEventListener("click", () => setAuthMode(authMode === "signup" ? "signin" : authMode === "signin" || authMode === "verify" ? "signup" : "signin"));
    $("aForgot").addEventListener("click", () => setAuthMode("forgot"));
    $("aResend").addEventListener("click", resendVerify);
    $("aShow").addEventListener("change", () => { const ty = $("aShow").checked ? "text" : "password"; $("aPw").type = ty; $("aPw2").type = ty; });
    $("authLang").addEventListener("change", () => { $("langSel").value = $("authLang").value; $("langSel").dispatchEvent(new Event("change")); });
    $("unlockBtn").addEventListener("click", unlock);
    $("lockPw").addEventListener("click", async () => { $("lock").hidden = true; locked = false; await signOut(); });
    $("lockAskYes").addEventListener("click", async () => { closeTop(); await enableLock(); });
    $("lockAskNo").addEventListener("click", closeTop);
    $("lockToggle").addEventListener("change", () => $("lockToggle").checked ? enableLock() : disableLock());
    $("lockToggleLocal").addEventListener("change", () => $("lockToggleLocal").checked ? enableLock() : disableLock());
    $("signOutBtn").addEventListener("click", signOut);
    $("delAccBtn").addEventListener("click", deleteAccount);
    document.addEventListener("keydown", e => {
      if (!$("auth").hidden || !$("lock").hidden) return;
      if (e.key === "Escape" && stack.length) { e.preventDefault(); closeTop(); return; }
      if (stack.length || e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
      if (typing) return;
      if (e.key === "/") { e.preventDefault(); $("q").focus(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); openForm(); }
    });
  }

  async function init() {
    lang = LANGS.includes(state.settings.lang) ? state.settings.lang : detectLang();
    state.deleted = state.deleted || {};
    if (!state.cards) { state.cards = cloud ? [] : samples(); }
    bioOk = await bioAvailable();
    $("lockToggleLocal").checked = !!state.settings.lockCred;
    if (state.settings.sort) $("sort").value = state.settings.sort;
    paintMascots(); applyLang(); applyTheme(); bind(); render();
    if (location.hash === "#add") { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} openForm(); }
    try { navigator.storage?.persist?.(); } catch (e) {}
    paintAccount();
    if (state.settings.lockCred) showLock();
    if (cloud) {
      sb.auth.onAuthStateChange((event, s) => {
        if (event === "PASSWORD_RECOVERY") { session = s; showAuth("reset"); }
        else if (event === "SIGNED_IN" && s && !session) onSignedIn(s);
        else if (event === "TOKEN_REFRESHED" && s) session = s;
      });
      const { data } = await sb.auth.getSession();
      if (data.session) { if (authMode !== "reset") await onSignedIn(data.session); }
      else if ($("auth").hidden) showAuth("signin");
    }
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }
  init();
})();
