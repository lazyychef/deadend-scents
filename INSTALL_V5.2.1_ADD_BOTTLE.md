# DeadEnd Scents V5.2.1 — Add New Bottle

## What this update does

Adds a mobile-first Add New Bottle workflow to Admin.

New files:
- `/admin/add-bottle.html`
- `/admin/add-bottle.js`

Updated files:
- `/admin/index.html`
- `/admin/inventory.html`
- `/admin/admin.css`
- `/google-apps-script/Code.gs`
- `/Code.gs`

## Install steps

1. Upload the ZIP contents to GitHub.
2. Open your Google Sheet.
3. Go to Extensions → Apps Script.
4. Replace the existing `Code.gs` with the updated `google-apps-script/Code.gs` from this release.
5. Save.
6. Deploy → Manage deployments → Edit → New version → Deploy.
7. Test these pages:
   - `/admin/`
   - `/admin/inventory.html`
   - `/admin/add-bottle.html`

## Test checklist

1. Open `/admin/inventory.html` on mobile.
2. Confirm the top section shows `+ Add New Bottle`.
3. Open `/admin/add-bottle.html`.
4. Add a test bottle with House, Fragrance, Collection, Purchase Price, Bottle Size and Current mL.
5. Press Calculate Prices.
6. Press Accept Suggested Prices.
7. Press Add Bottle to Database.
8. Open the Google Sheet and confirm the new row appears.
9. Refresh `/admin/inventory.html` and confirm the bottle appears.

## Notes

This release does not change the public website layout.
