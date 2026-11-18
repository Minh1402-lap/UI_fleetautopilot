# Logo preview — 2026-11-18

Scope: UI prototype only; user-supplied logo, not the separate Next.js product.

| Case | Steps / expected | Result |
| --- | --- | --- |
| Desktop rail | Load at 1440×900. Logo replaces F, fits the closed menu, leaves navigation unobstructed. | PASS: fresh browser screenshot inspected. |
| Phone | Load at 390×844. Logo and Fleet Autopilot label fit on one line; no overlap with navigation. | PASS: fresh browser screenshot inspected. |
| Expanded desktop menu | Hover/focus menu; logo remains fixed and name appears. | Source reviewed; interactive browser check not run. |
| Asset/security | Reference remains local, original file unchanged, decorative image has empty alt beside visible brand name. No script, network integration, permission or data change. | PASS: source review and original/asset SHA-256 match. |

Code map: menu brand link in `index.html` → `.brand-preview-icon` in `brand-preview.css` → `assets/brand/fleet-logo-reference.png`. Existing `href="./"` retained; no new handler/API/permission.

Browser evidence (ignored): `tests/reports/logo-preview/desktop.png`, `mobile.png`.
Commands from UI root:

```powershell
node ../.agents/skills/design-taste-frontend/scripts/shoot.mjs --url index.html --w 1440 --h 900 --out tests/reports/logo-preview/desktop.png --profile tests/reports/logo-preview/chrome --no-tiles
node ../.agents/skills/design-taste-frontend/scripts/shoot.mjs --url index.html --w 390 --h 844 --out tests/reports/logo-preview/mobile.png --profile tests/reports/logo-preview/chrome-mobile --no-tiles
git diff --check
```

Both screenshot commands passed with browser-launch permission after the first restricted attempt failed. `git diff --check` passed. Design gate: `GATE: OFF (no build active)`; this is a scoped asset replacement, not a whole-page redesign. Other themes/roles, interactive menu expansion and physical devices were not retested. Backend/API tests N/A.
