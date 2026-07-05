# DeadEnd Scents V5.1 — Admin Write-back

## What changed
- Added `/admin/inventory.html` for editing bottle mL, prices, status, bottle size, purchase price, RRP and description.
- Added `/admin/features.html` for setting Fragrance of the Week and Staff Picks.
- Added `/admin/admin-write.js`, `/admin/inventory.js`, and `/admin/features.js`.
- Updated `/admin/calculator.html` and `/admin/calculator.js` with competitor price fields and safer market-adjusted pricing.
- Updated `Code.gs` and `google-apps-script/Code.gs` for spreadsheet write-back actions.

## Write-back actions supported
- `updateBottle`
- `setFeatured`
- `setStaffPicks`

## Important
Upload the GitHub files first, then copy the updated `google-apps-script/Code.gs` into your Google Sheet Apps Script project and redeploy the web app.
