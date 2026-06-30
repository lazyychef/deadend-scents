# DeadEnd Scents GitHub Workflow

## Branches
- `main` = live website.
- `develop` = stable testing branch.
- `feature/*` = individual changes.

## Recommended workflow
1. Create/switch to a feature branch, e.g. `feature/v2.7-fast-purchase-flow`.
2. Upload the updated files.
3. Commit with a clear message.
4. Test `/admin/`.
5. Merge into `develop` if you want another testing step.
6. Merge into `main` when ready to go live.

## Simple option while the site is small
For admin-only changes, you can test on the feature branch and merge straight to `main` once happy.
