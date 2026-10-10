# Pink Purse ✦

A personal budgeting app: **spend less, earn more, save more.**
Built for iPhone first, works on the Mac too. Everything stays on your device.

**Live app:** https://julielebreton222.github.io/Budget/

## Put it on your iPhone

1. Open the live app link in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open Pink Purse from the home screen. It works offline from then on.

## Using it

- **Activity → Import Wise statement.** In Wise, download your EUR statement as `.xlsx` or `.csv`
  and pick it here. It is read in the browser and never uploaded. Importing the same file again
  adds nothing new.
- Tap a category chip to change it. Tick *Always use this category* to save a rule for that merchant.
- **Budget**: tap a target to change it, or use the **Step 1** / **Step 2** presets.
- **Jar**: log things you almost bought and didn't.

## Moving data between iPhone and Mac

Your data lives only in the browser on each device. To move it:
**Activity → Settings → Export backup** on one device, then **Restore backup** on the other
(AirDrop or Files work well). Export a backup now and then to keep your data safe.

Never commit statements or backups: `*.xlsx`, `*.csv` and backup JSON files are git-ignored.

## Development

```sh
npm install
npm run dev       # local dev server
npm test          # unit tests
npm run build     # production build in dist/
```

To check a real statement against the expected totals without committing it:

```sh
WISE_STATEMENT=~/Downloads/statement.xlsx npm test
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

Stack: Vite, React, TypeScript, plain CSS, IndexedDB (`idb`), SheetJS, a hand-written service worker.
