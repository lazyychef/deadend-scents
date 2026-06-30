/* DeadEnd Scents V2.9 replacement patch
   Safe to replace v29-patch.js with this file.
*/
(function () {
  function roundFeaturedPrices() {
    document.querySelectorAll("#featuredGrid .price-add, .featured-card .price-add, .weekly-card .price-add").forEach(function (btn) {
      const strong = btn.querySelector("strong");
      if (!strong) return;

      const text = strong.textContent || "";
      if (!text.includes(".")) return;

      strong.innerHTML = strong.innerHTML.replace(/\$(\d+)\.(\d{2})/g, function (_, dollars) {
        return "$" + dollars;
      });

      const price = btn.getAttribute("data-price");
      if (price && /\$\d+\.\d{2}/.test(price)) {
        btn.setAttribute("data-price", price.replace(/\$(\d+)\.(\d{2})/g, "$$1"));
      }
    });
  }

  function removeOldPackItems() {
    document.querySelectorAll("#packsGrid li").forEach(function (li) {
      if ((li.textContent || "").trim().toLowerCase() === "cinder kiss") {
        li.remove();
      }
    });
  }

  function runPatch() {
    roundFeaturedPrices();
    removeOldPackItems();
  }

  document.addEventListener("DOMContentLoaded", function () {
    runPatch();
    setTimeout(runPatch, 500);
    setTimeout(runPatch, 1500);

    const target = document.body;
    if (!target) return;

    const observer = new MutationObserver(function () {
      runPatch();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
})();
