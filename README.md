# DeadEnd Scents V2.2 Admin Foundation

## Upload
Replace the existing GitHub files with this ZIP contents.

## Public site
The public site keeps the V2.1 analytics and SEO setup:
- GA4: `G-ZQFKZ1RXLC`
- Microsoft Clarity: `xeuxtee2iy`
- `sitemap.xml`
- `robots.txt`
- `CNAME`

## Admin dashboard
Open:

`https://deadendscents.com/admin/`

This first admin version is a static dashboard. It reads:
- your public Google Sheet catalogue
- local event data from the browser you are using

Google Analytics and Microsoft Clarity remain the source of truth for all visitors. The local admin data is useful for testing events and checking catalogue health quickly.

## What the dashboard shows
- total fragrances
- new this month
- current featured fragrance
- local cart adds
- catalogue by type
- catalogue by scent style
- local searches from this browser
- local add-to-cart events from this browser
- quick checks for GA, Clarity, site URL and featured settings

## Security note
This dashboard does not show private customer data. It is marked `noindex,nofollow` and blocked in `robots.txt`, but it is not password protected because GitHub Pages is static hosting.


## V2.3 Command Centre

Open `/admin/` to view the Command Centre.

This version adds:

- Featured fragrance promo status
- Catalogue health checks
- Type, scent style and house breakdowns
- Local conversion funnel
- Local search and cart-add tracking
- Price coverage checks
- Quick action links
- GitHub workflow guide

Note: `/admin/` is static and not password protected on GitHub Pages. It is blocked from indexing in `robots.txt`, but anyone with the URL can open it.
