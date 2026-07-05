# DeadEnd Scents V5.0 — Admin Dashboard + Calculator V2

## Scope
Admin-focused release. Public website remains as per V4.3 Stability.

## Added
- Mobile-first admin dashboard at `/admin/`.
- Live catalogue snapshot from Google Sheets where available.
- Quick stats for total bottles, new arrivals, low stock and out of stock.
- Low stock preview using Current mL / Amount Left style fields.
- Settings preview for key site links and sheet URLs.
- Updated Sample Pricing Calculator at `/admin/calculator.html`.

## Calculator V2 changes
- Adds optional competitor prices for 3mL, 5mL and 10mL.
- Uses cost-based pricing first.
- Applies RRP caps to stop inflated prices.
- Applies market caps when competitor pricing is entered.
- Can estimate missing competitor sizes from the entered competitor size.
- Adds Remaining Juice Value and Market Check outputs.

## Important
V5.0 is safe/read-only for spreadsheet data. It does not write changes back to Google Sheets yet.
Spreadsheet write-back for editing bottles, updating Fragrance of the Week and Staff Picks is planned for V5.1.
