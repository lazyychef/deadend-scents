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


## V4.0A.6
- Fixed Fragrance of the Week size buttons so the discount label uses the live Settings sheet percentage.


## V4.0A.7
- Reads `Image`, `Image URL` or `Bottle Image URL` from Catalogue.
- Uses bottle image only for Fragrance of the Week.
- Catalogue tiles remain emoji-only.
- Adds desktop glow/hover effect for the weekly bottle image.
