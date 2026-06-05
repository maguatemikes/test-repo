/* CRM form embed loader.
 * Usage: <script src="https://YOUR-APP/embed.js" data-form="SLUG" data-max-width="460" async></script>
 * Injects an auto-resizing iframe of the hosted form (no CORS setup needed).
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
  iframe.setAttribute("loading", "lazy");
  iframe.style.width = "100%";
  iframe.style.maxWidth = maxWidth + "px";
  iframe.style.height = "520px"; // initial; auto-resized below
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.margin = "0 auto";
  iframe.style.overflow = "hidden";

  // Insert right after the script tag.
  s.parentNode.insertBefore(iframe, s.nextSibling);

  // Auto-resize from height messages posted by the form page.
  window.addEventListener("message", function (e) {
    if (e.origin !== origin) return;
    var d = e.data;
    if (d && d.type === "crm-form-height" && d.slug === slug && d.height) {
      iframe.style.height = d.height + "px";
    }
  });
})();
