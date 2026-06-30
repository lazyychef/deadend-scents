# Updating GitHub from iPhone / iPad

## Best option on mobile: Safari

The GitHub iOS app is useful for checking commits and merging pull requests, but Safari is better for uploading files.

## Steps

1. Download the V2.9 ZIP.
2. Open the Files app and tap the ZIP to unzip it.
3. Open Safari and go to:
   `https://github.com/lazyychef/deadend-scents`
4. Use the branch dropdown and create:
   `feature/v2.9-mobile-packs`
5. Tap:
   `Add file > Upload files`
6. Upload:
   - `packs.json`
   - `settings.json`
   - `styles-v29.css`
   - `v29-patch.js`
   - `GITHUB_MOBILE_UPDATE_GUIDE.md`
   - `GITHUB_WORKFLOW.md`
7. Commit:
   `V2.9 mobile packs and featured fragrance polish`
8. Edit `index.html` and add the two lines from `INDEX_INCLUDE_NOTES.txt`.
9. Commit again.
10. Create a pull request into `main`.
11. Merge when ready.
12. Wait 1–2 minutes, then test:
   `https://deadendscents.com/?v=29`

## GitHub app is best for
- checking commits
- merging pull requests
- checking deployment status

## Safari is best for
- uploading files
- editing `index.html`
