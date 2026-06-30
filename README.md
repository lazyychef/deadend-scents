# DeadEnd Scents V2.7 - Fast Purchase Flow

## What's new
- Purchase form now defaults to **Auto detect**.
- Type a fragrance name:
  - exact catalogue match = restock/update existing bottle
  - no match = new bottle entry
- Fixed the V2.6 issue where purchase items could save as an empty array.
- If Total Paid is entered and bottle line costs are blank, costs are auto-split across bottle lines.
- Keep using this on a feature branch first.

## Test checklist
1. Open `/admin/`.
2. Add Purchase / Bottle.
3. Type an existing fragrance and save. JSON should show `mode: existing` and at least one item.
4. Type a new fragrance and save. JSON should show `mode: new` and at least one item.
5. Add 2 bottle lines, enter Total Paid, leave costs blank. JSON should auto-split costs.

## Important
The form still saves locally until `adminWriteEndpoint` is connected in `settings.json`.
