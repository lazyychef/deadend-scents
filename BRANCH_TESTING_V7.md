# How to test V7 on a separate GitHub branch

1. Open your GitHub repository.
2. Create a new branch from the current live branch.
   - Suggested name: `redesign-v7`
3. Upload the contents of this ZIP to that branch.
4. Commit with a clear message:
   - `Add V7 design system test branch`
5. Do not merge into `main` yet.
6. Open the GitHub Pages preview/deployment for the branch if available.
7. Test:
   - Homepage mobile
   - Homepage desktop
   - Catalogue filters
   - Women / New / Staff Pick buttons
   - Add to cart
   - Discovery packs
   - Admin dashboard
   - Inventory manager
   - Add bottle
   - Settings
   - SEO Engine
   - A few SEO pages under `/fragrances/` and `/houses/`

## Rollback
No rollback is needed if this stays on a separate branch. Your live `main` branch remains untouched.

## Important
This V7 branch is mainly a UI/design-system test. It does not require a Google Apps Script redeploy unless you choose to change Apps Script separately.
