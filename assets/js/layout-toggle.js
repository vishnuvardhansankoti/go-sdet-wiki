(function () {
  const DESKTOP_QUERY = "(min-width: 76.25em)";
  const PRIMARY_KEY = "go-sdet-wiki-hide-primary-sidebar";
  const SECONDARY_KEY = "go-sdet-wiki-hide-secondary-sidebar";

  function readBool(key, fallback) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "1";
  }

  function writeBool(key, value) {
    localStorage.setItem(key, value ? "1" : "0");
  }

  function isDesktop() {
    return window.matchMedia(DESKTOP_QUERY).matches;
  }

  function updateButtonState(btn, hidden, label) {
    const action = hidden ? "Show " : "Hide ";
    const text = action + label;
    btn.setAttribute("title", text);
    btn.setAttribute("aria-label", text);
    btn.setAttribute("aria-pressed", String(hidden));
  }

  function setButtonIcon(btn, iconType) {
    const stroke = 'stroke="currentColor" stroke-width="1.75" stroke-linecap="round"';

    if (iconType === "nav") {
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
        '<path d="M4 6h16" ' + stroke + ' fill="none" />' +
        '<path d="M4 12h16" ' + stroke + ' fill="none" />' +
        '<path d="M4 18h16" ' + stroke + ' fill="none" />' +
        '</svg>';
      return;
    }

    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<rect x="5" y="4" width="14" height="16" rx="2" ry="2" ' + stroke + ' fill="none" />' +
      '<path d="M9 8h6" ' + stroke + ' fill="none" />' +
      '<path d="M9 12h6" ' + stroke + ' fill="none" />' +
      '<path d="M9 16h4" ' + stroke + ' fill="none" />' +
      '</svg>';
  }

  function ensureControls() {
    if (document.querySelector(".layout-toggle-controls")) return;

    const controls = document.createElement("div");
    controls.className = "layout-toggle-controls";

    const navBtn = document.createElement("button");
    navBtn.type = "button";
    navBtn.className = "layout-toggle-btn";
    setButtonIcon(navBtn, "nav");

    const tocBtn = document.createElement("button");
    tocBtn.type = "button";
    tocBtn.className = "layout-toggle-btn";
    setButtonIcon(tocBtn, "toc");

    controls.appendChild(navBtn);
    controls.appendChild(tocBtn);
    document.body.appendChild(controls);

    function apply() {
      if (!isDesktop()) {
        controls.style.display = "none";
        document.body.classList.remove("hide-primary-sidebar", "hide-secondary-sidebar");
        return;
      }

      controls.style.display = "flex";

      const hidePrimary = readBool(PRIMARY_KEY, false);
      const hideSecondary = readBool(SECONDARY_KEY, false);

      document.body.classList.toggle("hide-primary-sidebar", hidePrimary);
      document.body.classList.toggle("hide-secondary-sidebar", hideSecondary);

      updateButtonState(navBtn, hidePrimary, "navigation panel");
      updateButtonState(tocBtn, hideSecondary, "table of contents");
    }

    navBtn.addEventListener("click", function () {
      const next = !readBool(PRIMARY_KEY, false);
      writeBool(PRIMARY_KEY, next);
      apply();
    });

    tocBtn.addEventListener("click", function () {
      const next = !readBool(SECONDARY_KEY, false);
      writeBool(SECONDARY_KEY, next);
      apply();
    });

    window.addEventListener("resize", apply);
    apply();
  }

  document.addEventListener("DOMContentLoaded", ensureControls);
})();
