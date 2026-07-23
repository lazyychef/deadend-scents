# DeadEnd Scents Admin V2 — Phase 7.3.1 Operations Update

## Added
- Bulk Stocktake page with desktop and mobile layouts.
- Photo-assisted stock estimation using a bottle photo and fill-level slider.
- Last Stocktake and Stock Confidence fields.
- Inventory Adjustments audit-history sheet.
- Future-ready Catalogue fields: Last Promotion Date, Times Featured, Reorder Threshold, Favourite, Discontinued and Seasonal Score.
- Vanilla Scent Style support in public filtering and all relevant admin selectors.

## Deployment
1. Upload the changed web files, preserving folders.
2. Replace the Apps Script project code with `google-apps-script/Code.gs`.
3. Deploy a new Web App version using the existing URL.
4. Open Admin > Stocktake and click **Create/check sheet columns** once.

## Important
The photo tool is an assisted estimate: the user aligns a percentage slider to the visible bottle level. It does not claim automatic computer-vision accuracy.
