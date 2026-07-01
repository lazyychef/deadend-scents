# DeadEnd Scents v3.1

## What changed
- The website now treats the Master Database as the main source of truth.
- Catalogue loads from the `Catalogue` tab.
- Discovery packs load from the `Discovery Packs` tab.
- `packs.json` remains only as an emergency backup if the sheet cannot load.
- Current dark green UI, fragrance cards, filters, Fragrance of the Week and cart flow stay the same.

## Sheet setup
The site is connected to this Master Database:
`1GSW1Bytauoi53o4orbojoZl9K-ixL4Y4Mj6NyehzCrc`

Expected tabs:
- `Catalogue`
- `Discovery Packs`

The Discovery Packs tab can use either format:

### Simple one-row-per-pack format
- Pack ID
- Pack Name
- Emojis
- Description
- Discount
- Size mL
- Items or Fragrance IDs
- Fallback Items
- Active

### Database row-per-fragrance format
- Pack ID
- Pack Name
- Fragrance ID
- Order
- Discount
- Size mL
- Active

Fragrance IDs are best. Names still work as a backup.

## Upload
Upload all ZIP contents to the GitHub root.
Keep the `/admin` folder.


## v3.1.1
- Fixes live app still reading packs.json first.
- Discovery Packs now reads from the Master Database Discovery Packs tab via settings.discoveryPacksCsvUrl.
- packs.json remains as backup only.
- Do not delete /admin.
