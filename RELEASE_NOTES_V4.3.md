# DeadEnd Scents V4.3 Stability

## Purpose
Stabilise the live public website without redesigning the homepage or catalogue.

## Changes
- Locked the main logo to fixed dimensions across desktop and mobile.
- Added logo width/height attributes in HTML so it cannot render huge before CSS loads.
- Added a small critical header style to reduce flash/layout shift.
- Preloaded the logo image for faster, cleaner header rendering.
- Hardened the navigation area against Microsoft Clarity replay and in-app browser rendering issues.
- Kept the public layout and design unchanged.

## Logo sizes
- Desktop: 72px
- Mobile: 60px
- Small mobile: 54px

## Files changed
- index.html
- styles.css

## Test checklist
1. Open the homepage on desktop.
2. Confirm the logo is larger but not cropped.
3. Open on mobile.
4. Confirm the logo does not cover the page.
5. Check Packs, Catalogue and Cart anchors.
6. Check one Microsoft Clarity replay after new visits come through.
