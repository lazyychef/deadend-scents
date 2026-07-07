# DeadEnd Scents V6.0.3 — Consolidation + Admin Live Sync

## Purpose
Safe consolidation release built from the current V6.0.2 GitHub files. Keeps the V6 SEO Engine work and adds the latest admin fixes without reverting SEO files.

## Changed
- Admin dashboard now reads catalogue data from the live Apps Script endpoint first.
- New Arrivals in admin use the same date logic as the public site.
- Inventory editor normalises date and currency/number values so Purchase Price, Added Date and Purchase Date populate correctly.
- Inventory save now reloads the bottle from the live spreadsheet after saving.
- Public catalogue quick filters added:
  - Women
  - New
  - Staff Pick
- Apps Script catalogue endpoint now returns live spreadsheet raw values for dates/numbers where possible.

## Upload to GitHub
- index.html
- app.js
- admin/index.html
- admin/admin.js
- admin/inventory.html
- admin/inventory.js
- RELEASE_NOTES_V6.0.3.md

## Update Apps Script
- google-apps-script/Code.gs

## Public site
No redesign. Only filter buttons were added to the existing catalogue controls.
