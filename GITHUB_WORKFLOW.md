# DeadEnd Scents GitHub Workflow

Use this simple workflow when testing larger updates.

## Normal small update

For small fixes, upload the ZIP contents directly to `main` like you have been doing.

## Larger update / safer workflow

1. In GitHub, open the repository.
2. Click the branch dropdown that says `main`.
3. Type a new branch name, for example `v2-3-command-centre`.
4. Click **Create branch**.
5. Upload the updated files to that branch.
6. Test the GitHub Pages deployment if enabled, or ask ChatGPT to review the changed files.
7. Open a Pull Request back into `main`.
8. Merge only when happy.

## Rollback

If something breaks after a merge:

1. Open the repository.
2. Go to **Commits**.
3. Open the last good commit.
4. Download or restore those files.

## Current key files

- `index.html` — customer site structure
- `app.js` — catalogue, cart, Google Sheet loader and event tracking
- `styles.css` — customer site styling
- `settings.json` — contact links, analytics IDs and CSV URL
- `packs.json` — discovery packs
- `admin/` — Command Centre
- `sitemap.xml` — Search Console sitemap
- `robots.txt` — search engine rules
- `CNAME` — custom domain for GitHub Pages
