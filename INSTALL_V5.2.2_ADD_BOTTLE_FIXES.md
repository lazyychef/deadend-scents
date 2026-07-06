# DeadEnd Scents V5.2.2 — Add Bottle Fixes

## What this fixes

- Collection dropdown now matches the Catalogue sheet values:
  - Original Designer
  - Original Niche
  - Middle Eastern
  - Inspired By
  - Other
- Scent Style is now a dropdown.
- Scent Style options are loaded from the live Catalogue CSV where possible.
- When adding a new bottle, calculated formula columns copy from the row above:
  - Cost per mL
  - Revenue as 3mL
  - Revenue as 5mL
  - Revenue as 10mL
  - Best Potential Revenue
  - Projected Profit
  - Low Stock Flag
  - Last Updated

## Install steps

1. Upload the contents of this ZIP to GitHub.
2. Open your Google Sheet.
3. Go to Extensions → Apps Script.
4. Replace Code.gs with google-apps-script/Code.gs from this ZIP.
5. Save.
6. Deploy → Manage deployments → Edit → New version → Deploy.
7. Test /admin/add-bottle.html.

## Test checklist

- Open /admin/add-bottle.html on mobile.
- Confirm Collection shows Original Designer / Original Niche / Middle Eastern / Inspired By.
- Confirm Scent Style is a dropdown.
- Add a test bottle.
- Check the new row in the Catalogue sheet.
- Confirm formula columns populated.
- Delete the test bottle row if needed.
