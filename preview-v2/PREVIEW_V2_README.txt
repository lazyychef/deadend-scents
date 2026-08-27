DEADEND SCENTS — PUBLIC V2 SELF-CONTAINED PREVIEW

PURPOSE
This package is a completely separate /preview-v2/ storefront. It does NOT include or alter Admin or Apps Script.
It contains its own bottle images, pack images/data, house assets, logo/theme assets, catalogue data, styles and scripts.

UPLOAD — SAFE PREVIEW
1. Download this ZIP and unzip it.
2. You will see one folder named: preview-v2
3. In the ROOT of your GitHub repository, upload the entire preview-v2 folder.
   It must sit beside your existing admin, assets, fragrances, packs and houses folders — NOT inside any of them.
4. Commit the upload.
5. Do NOT overwrite your current root index.html, app.js, styles.css, catalogue-fallback.json or any admin files.
6. Wait for GitHub Pages to deploy.
7. Test: https://deadendscents.com/preview-v2/

EXPECTED REPOSITORY STRUCTURE
/
  index.html                 <- CURRENT LIVE SITE (leave alone)
  app.js                     <- CURRENT LIVE SITE (leave alone)
  styles.css                 <- CURRENT LIVE SITE (leave alone)
  admin/                     <- LEAVE ALONE
  assets/                    <- LEAVE ALONE
  fragrances/               <- LEAVE ALONE
  packs/                     <- LEAVE ALONE
  houses/                    <- LEAVE ALONE
  preview-v2/               <- NEW SELF-CONTAINED TEST SITE
    index.html
    app.js
    styles.css
    data.js
    settings.json
    catalogue-fallback.json  <- 111-item snapshot
    fragrances.json
    packs.json
    seo-pages.css
    assets/
    fragrances/
    packs/
    houses/

WHAT THIS V2 TESTS
- Beige / forest green / terracotta visual system.
- Explore panel: Discovery Packs, Seasons, Styles, View all fragrances.
- Search and existing category buttons below Fragrance of the Week.
- Landing page shows New/Staff Picks rather than all 111 bottles.
- View All opens full catalogue. Search/filter automatically searches the full catalogue.
- Equal-height compact fragrance tiles, including reserved information space for original vs inspired fragrances.
- 3 fragrance cards across on standard phone screens, 4 on larger phones, 5 tablet, 6 desktop and up to 8 wide desktop.
- Bottle images use a fixed contain area so bottle shape cannot resize a card.
- All 3mL / 5mL / 10mL options remain visible; unavailable sizes remain disabled.
- Fragrantica links retained.
- Search input is >=16px to stop iOS Safari auto-zoom.
- Full 111-item local snapshot renders immediately for speed; live Apps Script prices/stock refresh silently in the background.
- WhatsApp cart message is populated automatically.
- Messenger remains available; the order text is visible/copyable because standard Messenger web links cannot reliably pre-populate arbitrary text.

ROLLBACK
There is nothing to roll back while testing. Delete /preview-v2/ and your live site is unaffected.

DO NOT PROMOTE TO ROOT YET
Test on iPhone Safari, Mac Safari and Chrome first. Once approved, create a separate release package for the root site rather than manually copying random preview files.
