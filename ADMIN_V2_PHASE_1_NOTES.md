# DeadEnd Scents Admin V2 — Phase 1

## Scope
Admin-only foundation update. The public storefront files were hash-checked and remain unchanged.

## Added
- Shared responsive admin navigation (`admin/admin-shell.js`)
- Orders, Customers, Analytics and Shipping foundation pages
- Unified admin visual styling matching the public brand
- New dashboard links to the Phase 1 pages

## Changed
- All existing `admin/*.html` pages load the shared navigation script
- `admin/admin.css` contains the Phase 1 admin-only design system
- `admin/index.html` includes the four new admin areas

## Not included yet
- Google Sheets write-back for orders
- Stock deduction
- Live sales analytics
- Customer database write-back

These are Phase 2 tasks.
