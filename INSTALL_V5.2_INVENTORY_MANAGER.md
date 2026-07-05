# DeadEnd Scents V5.2 — Inventory Manager Install

## What this release does

V5.2 focuses only on the admin side.

It adds a polished Inventory Manager so Google Sheets becomes the database, not the main interface.

No public homepage or catalogue design changes are included.

## Files changed

Upload the full ZIP contents to GitHub, or replace these changed files:

- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`
- `admin/inventory.html`
- `admin/inventory.js`
- `google-apps-script/Code.gs`
- `Code.gs`

## Apps Script update

After uploading the GitHub files:

1. Open the master Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Open `Code.gs`.
4. Replace the full contents with `google-apps-script/Code.gs` from this ZIP.
5. Save.
6. Go to **Deploy → Manage deployments**.
7. Click the pencil/edit icon on the current web app deployment.
8. Select **New version**.
9. Click **Deploy**.

Your web app URL does not need to change if it remains:

`https://script.google.com/macros/s/AKfycbxKVU2Qt1XTu4z_ezx_BcjdfCuaOphLGBxqV3uGzfqaz3CX2tDIZmIG28QkbT7rpRTr/exec`

## Test checklist

Open these pages:

- `/admin/`
- `/admin/settings.html`
- `/admin/inventory.html`

Then test:

1. Search for a bottle.
2. Open the bottle editor.
3. Add or update Current mL.
4. Add or update Purchase Price, Bottle Size and RRP.
5. Paste an Image URL and check the preview.
6. Click **Calculate prices**.
7. Click **Accept suggested prices**.
8. Click **Save bottle**.
9. Open Google Sheets and confirm the row updated.
10. Hard refresh the public site and confirm the bottle data is still loading correctly.

## Important notes

- V5.2 writes by column name, not column number.
- If a column does not exist, Apps Script skips it rather than breaking.
- Your current Settings tab remains the main control source.
- `settings.json` remains the backup only.
