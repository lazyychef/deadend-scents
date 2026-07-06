# DeadEnd Scents V6.0.1 — SEO Foundation

Admin-first SEO foundation release. No public website redesign.

## Added

- `admin/seo.html` — SEO Manager page.
- `admin/seo.js` — SEO Manager logic.
- SEO Manager link on `admin/index.html`.
- SEO styling in `admin/admin.css`.
- Apps Script actions for SEO setup, generation and saving.

## Apps Script actions added

- `setupSEOColumns`
- `generateFragranceSEO`
- `saveFragranceSEO`

## Google Sheet SEO columns added by setup button

- SEO Slug
- SEO Title
- SEO Description
- SEO Intro
- SEO Keywords
- SEO FAQ
- SEO Similar Fragrances
- SEO Internal Links
- SEO Score
- SEO Last Updated

## Backwards compatibility

This release keeps the existing Add Bottle, Inventory Manager, Bottle Editor, Settings and Calculator files in place. The SEO additions are layered on top of the current admin system.

## Upload notes

Upload the changed GitHub files, then copy `google-apps-script/Code.gs` into Apps Script and deploy a new Web App version.
