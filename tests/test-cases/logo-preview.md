# Logo preview — 2026-11-18

Scope: UI prototype only; user-supplied logo, not the separate Next.js product.

## Current revision — F combined with construction vehicles

User correction: retain F + dump truck + crane + materials from the reference; the standalone F below is superseded.

Code map: `index.html` brand link → `.brand-construction-mark` → crop/luminance mask in `brand-preview.css` → original `assets/brand/fleet-logo-reference.png`. Same link and theme handling. Phone/expanded desktop use a 68×40px emblem; closed rail uses 38×24px.

| Case | Expected | Result |
| --- | --- | --- |
| Phone 390×844 | Combined emblem shows truck/crane/materials, brand text and navigation remain unobstructed. | PASS: fresh `tests/reports/logo-construction/mobile.png` inspected. |
| Desktop 1440×900 | Closed rail contains combined emblem without covering menu. | PASS: fresh `tests/reports/logo-construction/desktop.png` inspected. |
| Theme/security regression | Existing forest/ivory/moss tokens and small lime accent retained. Fixed local raster mask; no script/input/API/auth/data change. Decorative wrapper remains hidden from assistive technology and link keeps visible brand name. | PASS: scoped source review; theme browser results from the earlier SVG revision do not verify the new mask. |

Used the existing screenshot commands below with outputs/profiles under `tests/reports/logo-construction/`. No persistent application server started. Moss/phone and dark/expanded desktop mask rendering also inspected in fresh `mobile-moss.png` and `desktop-dark-expanded.png`. Ignored HTML snapshots seed only the theme preference before the existing theme loader; dark snapshot focuses the real brand link on load to exercise :focus-within. Expanded logo/name fit with a visible keyboard focus ring. The screenshot tool reported a 19px bottom stitching gap on the expanded capture; that capture verifies the top logo/menu only. Amber and other roles not rerun. `git diff --check` passed before commit. API/backend tests N/A.

## Earlier revision — standalone F (superseded)

Code map: `index.html` brand link → inline `.brand-monogram` / `.brand-f-primary` / `.brand-f-secondary` → theme tokens and accent in `brand-preview.css`. Existing link and menu handlers remain unchanged; no API or permission change. Canonical full logo: `assets/brand/fleet-logo-reference.png`; identity rules: `assets/brand/README.md`.

| Case | Steps / expected | Current result |
| --- | --- | --- |
| Light phone | Load light at 390×844; forest F on white, label alongside, navigation unobstructed. | PASS: `tests/reports/logo-identity/mobile-light.png` inspected. |
| Dark desktop | Load `?theme=dark` at 1440×900; ivory F and muted moss secondary stroke, dark tile, no construction detail at small size. | PASS: `tests/reports/logo-identity/desktop-dark.png` inspected. |
| Moss phone | Load `?theme=moss` at 390×844; ivory/moss F, lime confined to small corner dot. | PASS: `tests/reports/logo-identity/mobile-moss.png` inspected. |
| Amber regression | Load `?theme=amber` at 1440×900; legible ivory/moss F, approved surrounding amber UI retained. | PASS: `tests/reports/logo-identity/desktop-amber.png` inspected. |
| Security/source regression | Review changed diff; SVG contains only fixed paths, decorative wrapper hidden from assistive technology, existing accessible brand name/link retained; no external resource/script/data mutation. | PASS: source review. API/server security N/A. |

Browser captures used the existing `shoot.mjs` command below, with current output directory `tests/reports/logo-identity/`. Theme captures use a local HTTP server plus `--url http://127.0.0.1:8086/?theme=dark` (or `moss` / `amber`). First separate-server attempts timed out and were not counted as passes; final screenshots replaced those failed captures after moving server/browser into the same execution context. Expanded menu interaction, other roles and physical devices not retested. No new automated suite for this cosmetic change.

## Earlier revision — cropped full app icon

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
