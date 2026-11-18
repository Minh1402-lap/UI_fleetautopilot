# Fleet Autopilot identity

## Fleet logo preview — 2026-11-18

`fleet-logo-reference.png` is the unchanged reference supplied by the user. The primary logo combines the stylized F, dump truck, crane and construction materials. Preserve that composition in the UI: the user clarified that the F must remain combined with the truck.

Current user direction supersedes the earlier cropped app-icon tile:

| Use | Identity treatment |
| --- | --- |
| Sidebar, all sizes | Actual F + truck + crane + materials from the reference. Compact desktop rail uses a small emblem; expanded menu and phone use a wider emblem. |
| Light | Forest green `#1A2A20` / `#2E4D3A` on white. |
| Dark | Ivory `#E6EDE8` and muted moss on `#0B0F0D`. |
| Moss Lime | Same light mark on dark tile; `#8CCF4D` limited to a 3–4px accent dot. |
| Existing Amber | Ivory/moss mark; retain the surrounding approved amber UI. |

Suggested identity palette: `#0B0F0D`, `#1A2A20`, `#2E4D3A`, `#8CCF4D`, `#E6EDE8`. Branding tokens in `brand-preview.css` do not recolor the whole dashboard. The full logo remains the original reference, not a newly produced set of transparent primary-logo variants. The sidebar uses a CSS luminance mask cropped from the unchanged reference image; it does not redraw the logo. The earlier standalone F SVG was removed following the user correction.

Scope: UI prototype only. Verification and feature code map: `tests/test-cases/logo-preview.md`.

## Kali Linux dragon (historical asset)

Source: https://github.com/simple-icons/simple-icons/blob/develop/icons/kalilinux.svg
Retrieved: 2026-11-18. Source blob: f308f111a1b72967e0d68b0f8ea52d3938255efa.
Simple Icons distributes icons under CC0; brand names and marks belong to their respective owners.
Only the fill color was set to #58a6ff for the Admin System theme.
Used as decoration at the user's request; does not indicate affiliation or use of Kali Linux as the host OS.
