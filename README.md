# DeadEnd Scents V4.0A.3 — Settings Sync

This update keeps the public homepage unchanged and adds live Settings sheet support.

## What changed
- `app.js` now loads `settings.json` first, then overlays values from the Master Database `Settings` tab.
- `/packs/` also reads live settings before loading Catalogue and Discovery Packs.
- `settings.json` now includes `settingsCsvUrl` as the fallback/start point.
- `settings.json` remains the backup if the Settings sheet cannot load.

## Upload
Upload the full ZIP contents to the GitHub repository root.
Keep `/admin` if it is already working.

## Database
Copy the Settings tab from `deadend-scents-settings-sheet-v4.0A.3.xlsx` into the Master Database.
Headers must remain: Setting, Value, Notes.

## Test
Change `Weekly Discount %` in the Settings tab, wait 30-60 seconds, then hard refresh the website.
