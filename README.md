# DeadEnd Scents V2.6 — Unified Purchase Form

This update keeps the existing customer site and updates `/admin/`.

## Main change

`Add Bottle` has been merged into `Add Purchase`. Use one form for:

- new bottle purchases
- existing bottle restocks
- bundle purchases with multiple bottles
- cost, current mL, bottle size and seller/source details

The form is now near the top of the Command Centre under the KPI cards.

## Google Apps Script

Use the updated `google-apps-script/Code.gs` when you connect write-back. It supports new bottles inside `addPurchase`.

## Current mode

Until `adminWriteEndpoint` is added to `settings.json`, the form saves locally and shows the staged payload for testing.


## V2.6 update

- Add Purchase / Bottle now has a clear Bottle action dropdown.
- Existing/restock uses an editable field with autocomplete, so you can search prior bottles and update stock/cost details.
- New bottle remains fully editable and adds a new Catalogue row when write-back is connected.
