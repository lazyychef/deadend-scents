# DeadEnd Scents V5.1.2 — Admin Settings Control

## Added

- Admin Settings Editor at `/admin/settings.html`.
- Settings dashboard card now opens the Settings Editor.
- Apps Script `updateSettings` action.
- Live settings loading in admin dashboard.
- Live settings loading in feature controls.

## Fixed

- Fragrance of the Week admin controls no longer default to `settings.json` when the Settings tab has a different discount.
- Inventory write-back now supports the `Stock` column used by the master Catalogue tab.

## Behaviour

- Settings tab is the primary source.
- `settings.json` is fallback only.
- Settings are updated by column name and setting name.
