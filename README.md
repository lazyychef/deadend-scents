# DeadEnd Scents V15

This version loads the public catalogue directly from the published Google Sheet CSV.

## Normal updates

Edit the **Catalogue** tab in Google Sheets. The website will read the latest published CSV on refresh.

Main columns used by the website:

- House
- Fragrance
- Inspiration House
- Inspiration
- Category
- Gender
- Description
- Emojis
- 3mL
- 5mL
- 10mL
- Fragrantica
- Added Date
- Featured
- Staff Pick
- Performance
- Projection
- Season
- Occasion
- Stock
- Concentration
- Status

## New arrivals

Add an **Added Date** in YYYY-MM-DD or DD/MM/YYYY format. New badges show automatically for the number of days set in `settings.json`.

## Settings

The Google Sheet URL, contact links, postage and analytics IDs live in `settings.json`.

## Packs

Flexible discovery packs live in `packs.json`.
