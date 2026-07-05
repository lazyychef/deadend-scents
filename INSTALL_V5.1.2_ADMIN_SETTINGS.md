# DeadEnd Scents V5.1.2 — Admin Settings Control

## What this update does

This update lets you manage key live website settings from the admin dashboard instead of editing JSON files.

It adds:

- `/admin/settings.html`
- `/admin/settings.js`
- Dashboard link to Settings
- Updated `admin/admin.js` to prefer live Settings tab values
- Updated `admin/features.js` so Fragrance of the Week uses the live Settings tab discount
- Updated `google-apps-script/Code.gs` with `updateSettings` write-back support
- Safer Catalogue write-back support for your `Stock` column

## Website files to upload to GitHub

Upload all files from this ZIP to your GitHub repository and replace existing files.

Key changed files:

- `admin/index.html`
- `admin/admin.css`
- `admin/admin.js`
- `admin/features.js`
- `admin/inventory.js`
- `admin/settings.html`
- `admin/settings.js`
- `google-apps-script/Code.gs`
- `Code.gs`

## Apps Script update

After GitHub upload, update Apps Script:

1. Open your master Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Open `Code.gs`.
4. Replace the entire contents with the updated `google-apps-script/Code.gs` from this ZIP.
5. Click **Save**.
6. Go to **Deploy → Manage deployments**.
7. Click the pencil/edit icon on the current web app deployment.
8. Select **New version**.
9. Click **Deploy**.
10. Keep the same Web App URL unless Google gives you a new one.

Current expected endpoint:

`https://script.google.com/macros/s/AKfycbxKVU2Qt1XTu4z_ezx_BcjdfCuaOphLGBxqV3uGzfqaz3CX2tDIZmIG28QkbT7rpRTr/exec`

## Settings tab structure

Your Settings tab should have at least these columns:

| Setting | Value |
|---|---|
| Weekly Discount Percent | 35 |
| Weekly Discount Days | 7 |
| Express Postage | 10 |
| New Arrival Days | 45 |

Extra columns are fine.

The script updates by setting name, not row number.

## Test checklist

After deployment:

1. Open `/admin/settings.html`.
2. Confirm it loads current settings.
3. Change **Weekly Discount Percent** to `35` if needed.
4. Click **Save Settings**.
5. Open the Google Sheet Settings tab and confirm the value updated.
6. Open `/admin/features.html` and confirm the discount field shows `35`.
7. Open the public homepage and hard refresh.
8. Confirm Fragrance of the Week shows `35% off`.

## Notes

- The public website should read the Settings CSV first.
- `settings.json` remains as a backup only.
- New settings that do not exist in the Settings tab will be added automatically.
