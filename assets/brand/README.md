# Fleet Autopilot identity

## Fleet logo preview — 2026-11-18

`fleet-logo-reference.png` is the unchanged reference supplied by the user. The primary logo combines the stylized F, dump truck, crane and construction materials. Preserve that composition in the UI: the user clarified that the F must remain combined with the truck.

Current user direction supersedes the earlier cropped app-icon tile:

| Use | Identity treatment |
| --- | --- |
| Sidebar, all sizes | Actual F + truck + crane + materials from the reference. Compact desktop rail uses a small emblem; expanded menu and phone use a wider emblem. |
| Light | Forest green `#1A2A20` / `#2E4D3A`; transparent backing shows the actual menu theme. |
| Dark | Ivory `#E6EDE8` and muted moss; transparent backing shows the actual menu theme. |
| Moss Lime | Ivory/moss mark with transparent backing; no accent dot (latest user correction). |
| Existing Amber | Ivory/moss mark; retain the surrounding approved amber UI. |

Suggested identity palette: `#0B0F0D`, `#1A2A20`, `#2E4D3A`, `#8CCF4D`, `#E6EDE8`. Branding tokens in `brand-preview.css` do not recolor the whole dashboard.

`fleet-construction.svg` is the native vector emblem traced from the supplied image: F, truck, crane and materials, without an embedded bitmap, background rectangle or script. `index.html` references its `#fleet-logo` group through SVG `<use>`. Primary paths inherit `currentColor`; vehicle/material paths inherit `--brand-secondary`. The transparent canvas follows the real menu background, replacing the earlier fixed white/dark tile and raster mask. Standalone SVG defaults to current text color. The accompanying brand name remains accessible HTML text.

Reproduce with `python tools/trace-brand-logo.py` from UI (Pillow + NumPy). It traces the original crop and simplifies contours at 0.65px tolerance; it does not modify the reference. The vector represents the emblem, not the full wordmark/tagline board.

Scope: UI prototype only. Verification and feature code map: `tests/test-cases/logo-preview.md`.

## Kali Linux dragon (historical asset)

Source: https://github.com/simple-icons/simple-icons/blob/develop/icons/kalilinux.svg
Retrieved: 2026-11-18. Source blob: f308f111a1b72967e0d68b0f8ea52d3938255efa.
Simple Icons distributes icons under CC0; brand names and marks belong to their respective owners.
Only the fill color was set to #58a6ff for the Admin System theme.
Used as decoration at the user's request; does not indicate affiliation or use of Kali Linux as the host OS.
