# DeadEnd Intelligence — Admin V3

Admin-only consolidation release.

## Changes
- Daily Pick moved into `/admin/` and added to grouped navigation.
- New Admin V3 dashboard with Daily Pick, operations attention, business KPIs and quick actions.
- Shared two-minute read cache for Google Apps Script endpoints to reduce repeated page load latency.
- Visible live/cached data status with a manual refresh control.
- Mobile admin navigation redesigned as a compact drawer.
- Existing admin modules retained.
- Public storefront files unchanged.

## Data refresh
The cache is session-only and expires after two minutes. Any page can force fresh data using the data badge refresh button.
