# DeadEnd Scents

Static website for the DeadEnd Scents fragrance catalogue.

## Updating fragrances

Edit `fragrances.json` only.

To add a new bottle, copy an existing fragrance object, paste it at the top of the list, then update:

- `name`
- `house`
- `inspiration`
- `emojis`
- `p3`, `p5`, `p10`
- `fragranticaUrl`
- `category`
- `occasion`
- `notes`
- `addedDate`

Example:

```json
{
  "name": "New Fragrance",
  "house": "Brand Name",
  "inspiration": "Original Creation",
  "status": "In stock",
  "emojis": "🍋🌲✨",
  "p3": "$6",
  "p5": "$10",
  "p10": "$18",
  "fragranticaUrl": "https://www.fragrantica.com/...",
  "category": "Fresh / Clean",
  "occasion": "Daily / Summer",
  "notes": "Short scent description.",
  "addedDate": "2026-06-29"
}
```

Any fragrance with `addedDate` inside the last 45 days will show as **New** automatically.

## Updating packs

Edit `packs.json`.

## Updating contact, postage and analytics

Edit `settings.json`.

Optional traffic tracking fields:

- `googleAnalyticsId`
- `microsoftClarityId`

Leave them blank until you create those accounts.
