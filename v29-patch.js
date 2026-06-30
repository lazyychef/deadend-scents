/* V2.9 patch helpers
   Add this script after app.js in index.html:
   <script src="v29-patch.js"></script>
*/

(function () {
  const NEW_DAYS = 14;

  function parseDateAny(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const s = String(value).trim();
    if (!s) return null;

    const au = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (au) return new Date(Number(au[3]), Number(au[2]) - 1, Number(au[1]));

    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  window.deadEndIsNewFragrance = function (item) {
    const d = parseDateAny(item.purchaseDate || item.addedDate || item["Purchase Date"] || item["Added Date"]);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const days = (today - d) / 86400000;
    return days >= 0 && days < NEW_DAYS;
  };

  window.deadEndDiscountPrice = function (price, percent) {
    const n = Number(String(price).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n)) return price;
    return Math.floor(n * (1 - (Number(percent) || 0) / 100));
  };

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      document.querySelectorAll(".featured-card, .fragrance-week-card, .pick-card").forEach(function (card) {
        card.innerHTML = card.innerHTML.replace(/\$(\d+)\.\d{2}/g, function (_, dollars) {
          return "$" + dollars;
        });
      });
    }, 500);
  });
})();
