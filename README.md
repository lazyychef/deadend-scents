# DeadEnd Scents V4.0A.5 — Settings CSV Wire-up

## What changed
- `settings.json` now points to the published Settings CSV tab.
- The live site should load settings from the Settings tab first, then fall back to `settings.json` if Google Sheets is blocked.
- No homepage design changes.

## Upload
Upload the full ZIP contents to the GitHub root.

## Test
1. Change `Weekly Discount %` in the Settings tab.
2. Wait 30–60 seconds.
3. Hard refresh the website.
4. Confirm the Fragrance of the Week ribbon/discount updates.

## Keep
Do not delete `settings.json`. It is still the backup/boot file.
