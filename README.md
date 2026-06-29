# DeadEnd Scents V22

V22 user experience polish:

- Wider, shorter hero
- Duplicate hero pills removed
- Fragrance of the Week section
- Automatic 20% discount for the featured fragrance
- Discounted price is applied to cart and WhatsApp order message

## Fragrance of the Week setup

In Google Sheets:

1. Set `Featured` to `TRUE` for one fragrance.
2. Add `Featured Start` with the start date, e.g. `2026-06-30`.
3. The website applies 20% off for 7 days.

If `Featured Start` is blank, the site will try to use `Added Date`. If both are blank, it will still feature the fragrance, but the discount timing cannot be calculated properly.
