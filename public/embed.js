/* CRM form embed loader.
 * Usage: <script src="https://YOUR-APP/embed.js" data-form="SLUG" data-max-width="460" async></script>
 *
 * Injects an auto-resizing iframe of the hosted form (no CORS setup needed).
 * The form reports how it wants to be revealed (inline vs popup + trigger +
 * frequency) via a postMessage, so this loader can either render it in place or
 * pop it as a centered modal — armed by a delay, scroll depth, or exit intent —
 * with localStorage frequency capping so visitors aren't pestered.
 */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var slug = s.getAttribute("data-form");
  if (!slug) return;
  var origin = new URL(s.src).origin;
  var maxWidth = s.getAttribute("data-max-width") || "460";

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/f/" + encodeURIComponent(slug) + "?embed=1";
  iframe.title = "Signup form";
  // NOT lazy: a popup snippet often sits at the bottom of the page, and a lazy
  // iframe wouldn't load (and couldn't report "I'm a popup") until scrolled into
  // view — so on a cold load it would wrongly fall back to inline. Load eagerly.
  iframe.style.width = "100%";
  iframe.style.maxWidth = maxWidth + "px";
  iframe.style.height = "520px"; // initial; auto-resized below
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.margin = "0 auto";
  iframe.style.overflow = "hidden";

  // Placeholder marks where an INLINE form should land; a POPUP form is moved
  // out of the flow into an overlay instead. Insert the iframe hidden until the
  // form tells us which mode it is (no flash for popups).
  var anchor = document.createComment("crm-form:" + slug);
  s.parentNode.insertBefore(anchor, s.nextSibling);
  iframe.style.visibility = "hidden";
  anchor.parentNode.insertBefore(iframe, anchor.nextSibling);

  var mode = null; // "inline" | "popup" — locked in on the first display message
  var overlay = null;
  var panel = null; // the modal card wrapper (animated on open/close)

  // ---- frequency capping (per form, on the shopper's browser) ----
  var KEY = "crmform:" + slug;
  var SKEY = "crmform-sess:" + slug;
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function saveStore(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function shouldShow(d) {
    var st = store();
    if (st.subscribed) return false; // already signed up — never nag again
    var freq = d.frequency || "session";
    if (freq === "always") return true;
    if (freq === "session") { try { return !sessionStorage.getItem(SKEY); } catch (e) { return true; } }
    if (freq === "once") return !st.shownAt;
    if (freq === "days") {
      if (!st.shownAt) return true;
      var days = Math.max(1, Number(d.frequencyDays) || 7);
      return Date.now() - st.shownAt > days * 86400000;
    }
    return true;
  }
  function markShown() {
    var st = store(); st.shownAt = Date.now(); saveStore(st);
    try { sessionStorage.setItem(SKEY, "1"); } catch (e) {}
  }
  function markSubscribed() { var st = store(); st.subscribed = true; saveStore(st); }

  // ---- inline vs popup setup ----
  function setInline() {
    mode = "inline";
    iframe.style.visibility = "visible";
  }

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;" +
      "padding:16px;background:rgba(15,23,42,0.5);opacity:0;transition:opacity .22s ease;box-sizing:border-box;" +
      "-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);";
    var wrap = document.createElement("div");
    panel = wrap;
    // Starts slightly down + scaled-in; showPopup() animates it to rest for a soft pop.
    wrap.style.cssText =
      "position:relative;width:100%;max-width:" + maxWidth + "px;opacity:0;" +
      "transform:translateY(10px) scale(0.97);transition:transform .28s cubic-bezier(.16,1,.3,1),opacity .28s ease;";
    var close = document.createElement("button");
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&#10005;"; // thin ✕
    close.style.cssText =
      "position:absolute;top:-13px;right:-13px;width:32px;height:32px;border-radius:999px;border:none;cursor:pointer;" +
      "background:#ffffff;color:#475569;font-size:14px;line-height:32px;font-weight:400;padding:0;" +
      "box-shadow:0 4px 14px rgba(15,23,42,0.22);z-index:3;transition:transform .12s ease;";
    close.onmouseenter = function () { close.style.transform = "scale(1.08)"; };
    close.onmouseleave = function () { close.style.transform = "scale(1)"; };
    close.onclick = hidePopup;
    // Re-home the iframe inside the modal and frame it as a real card (the form's
    // own card sits flush inside this white, rounded, shadowed surface).
    iframe.style.visibility = "visible";
    iframe.style.margin = "0";
    iframe.style.background = "#ffffff";
    iframe.style.borderRadius = "16px";
    iframe.style.boxShadow = "0 24px 70px rgba(15,23,42,0.30)";
    wrap.appendChild(close);
    wrap.appendChild(iframe);
    overlay.appendChild(wrap);
    // Click on the backdrop (not the card) closes.
    overlay.addEventListener("click", function (e) { if (e.target === overlay) hidePopup(); });
    document.body.appendChild(overlay);
  }

  function showPopup() {
    if (!overlay) buildOverlay();
    overlay.style.display = "flex";
    // next frame so the transitions run (backdrop fade + card pop)
    requestAnimationFrame(function () {
      overlay.style.opacity = "1";
      if (panel) { panel.style.opacity = "1"; panel.style.transform = "none"; }
    });
    markShown();
    document.addEventListener("keydown", onKey);
  }
  function hidePopup() {
    if (!overlay) return;
    overlay.style.opacity = "0";
    if (panel) { panel.style.opacity = "0"; panel.style.transform = "translateY(10px) scale(0.97)"; }
    setTimeout(function () { if (overlay) overlay.style.display = "none"; }, 240);
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") hidePopup(); }

  function isTouch() {
    return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia("(hover: none)").matches);
  }

  function armPopup(d) {
    if (!shouldShow(d)) return; // capped — don't even arm it
    var trigger = d.trigger || "immediate";

    if (trigger === "immediate") { showPopup(); return; }

    if (trigger === "delay") {
      var secs = Math.max(0, Number(d.delaySeconds) || 0);
      setTimeout(showPopup, secs * 1000);
      return;
    }

    if (trigger === "scroll") {
      var pct = Math.max(1, Math.min(100, Number(d.scrollPercent) || 50));
      var onScroll = function () {
        var doc = document.documentElement;
        var scrolled = (doc.scrollTop || document.body.scrollTop);
        var height = (doc.scrollHeight - doc.clientHeight) || 1;
        if ((scrolled / height) * 100 >= pct) {
          window.removeEventListener("scroll", onScroll);
          showPopup();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return;
    }

    if (trigger === "exit_intent") {
      // No mouse on touch devices — fall back to a gentle delay so mobile still converts.
      if (isTouch()) { setTimeout(showPopup, 12000); return; }
      var onOut = function (e) {
        if (e.clientY <= 0 && !e.relatedTarget) {
          document.removeEventListener("mouseout", onOut);
          showPopup();
        }
      };
      document.addEventListener("mouseout", onOut);
      return;
    }

    showPopup();
  }

  // ---- page + device targeting: should this form show on THIS page at all? ----
  function globToRegex(p) {
    // escape regex specials, then turn * into .*  (so "*/products/*" matches any product URL)
    var body = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    try { return new RegExp("^" + body + "$", "i"); } catch (e) { return null; }
  }
  function matchOne(pattern, href, path) {
    // No "*" typed → treat it as a "contains" match (auto-wrap in */…/*), so users
    // can just type "/products" instead of "*/products*". If they DO use "*",
    // honor it as a full anchored glob for precise control.
    if (pattern.indexOf("*") === -1) {
      var n = pattern.toLowerCase();
      return href.toLowerCase().indexOf(n) !== -1 || path.toLowerCase().indexOf(n) !== -1;
    }
    var rx = globToRegex(pattern);
    return !!(rx && (rx.test(href) || rx.test(path)));
  }
  function passesTargeting(t) {
    if (!t) return true;
    var dev = t.device || "all";
    if (dev === "desktop" && isTouch()) return false;
    if (dev === "mobile" && !isTouch()) return false;
    var raw = (t.urls || "").trim();
    if (!raw) return true; // blank = show on every page
    var pats = raw.split(/[\s,]+/), hadPattern = false;
    for (var i = 0; i < pats.length; i++) {
      if (!pats[i]) continue;
      hadPattern = true;
      if (matchOne(pats[i], location.href, location.pathname)) return true; // any match wins
    }
    return hadPattern ? false : true;
  }

  // ---- messages from the form iframe ----
  window.addEventListener("message", function (e) {
    if (e.origin !== origin) return;
    var d = e.data;
    if (!d || d.slug !== slug) return;

    if (d.type === "crm-form-height" && d.height) {
      iframe.style.height = d.height + "px";
      return;
    }

    if (d.type === "crm-form-display") {
      // Already armed as a popup, or blocked by targeting → nothing more to do.
      if (mode === "popup" || mode === "blocked") return;
      var cfg = d.display || {};
      // URL + device gate — if this page doesn't qualify, never reveal the form.
      if (!passesTargeting(d.targeting)) { mode = "blocked"; iframe.style.display = "none"; return; }
      if (cfg.format === "popup") {
        // Honor popup even if a slow-load fallback already revealed it inline —
        // re-hide and arm the popup so a late message still wins (cold incognito).
        mode = "popup";
        iframe.style.display = "";
        iframe.style.visibility = "hidden";
        armPopup(cfg);
      } else if (mode !== "inline") {
        setInline();
      }
      return;
    }

    if (d.type === "crm-form-submitted") {
      markSubscribed();
      if (mode === "popup") setTimeout(hidePopup, 1800); // let them see the success state first
      return;
    }
  });

  // Fallback ONLY for OLD form pages that never post a mode. We do NOT race the
  // message with a short timer — on a cold (incognito) load, hydration + the
  // postMessage can take many seconds, and a premature inline fallback would
  // beat it. The iframe stays hidden until the message arrives; this long
  // backstop only fires if the form genuinely never reports its mode. (And even
  // then, a late popup message overrides inline in the handler above.)
  setTimeout(function () { if (!mode) setInline(); }, 30000);
})();
