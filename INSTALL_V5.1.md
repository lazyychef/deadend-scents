# Install DeadEnd Scents V5.1

## 1. Upload website files
Upload the contents of this ZIP to your GitHub repository and replace existing files.

Test these pages after GitHub Pages updates:

- `/admin/`
- `/admin/calculator.html`
- `/admin/inventory.html`
- `/admin/features.html`

## 2. Update Google Apps Script
1. Open your DeadEnd Scents Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Open **Code.gs**.
4. Replace the full contents with the file from this release:
   - `google-apps-script/Code.gs`
5. Click **Save**.

## 3. Redeploy the web app
1. Click **Deploy → Manage deployments**.
2. Click the pencil/edit icon on the current Web App deployment.
3. Select **New version**.
4. Keep these settings:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
5. Click **Deploy**.

## 4. Test write-back
Use a safe test first:

1. Go to `/admin/inventory.html`.
2. Pick one bottle.
3. Change Current mL by a small amount.
4. Press **Save to Google Sheet**.
5. Wait 5–10 seconds.
6. Check the Google Sheet.
7. Reload the public website and confirm the change appears.

## 5. Rollback
If anything goes wrong, upload the V5.0 rollback ZIP. Also restore the previous Apps Script version from **Deploy → Manage deployments** if needed.
