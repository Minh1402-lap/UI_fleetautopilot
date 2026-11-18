"""Trace the supplied construction emblem into native SVG paths (no embedded raster).

Run from UI: python tools/trace-brand-logo.py
Requires Pillow and NumPy. The original reference is never modified.
"""

from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CROP = (202, 142, 754, 474)


def simplify(points, tolerance=0.65):
    """Reduce contour vertices without losing the small truck/crane silhouette."""
    if len(points) < 3:
        return points
    start, end = np.array(points[0]), np.array(points[-1])
    vector = end - start
    offsets = np.array(points) - start
    length = np.linalg.norm(vector)
    distances = (
        np.abs(vector[0] * offsets[:, 1] - vector[1] * offsets[:, 0]) / length
        if length
        else np.linalg.norm(offsets, axis=1)
    )
    split = int(np.argmax(distances))
    if distances[split] <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[: split + 1], tolerance)[:-1] + simplify(points[split:], tolerance)


def trace(mask):
    """Walk oriented pixel boundaries; right turns resolve diagonal contacts."""
    height, width = mask.shape
    edges = defaultdict(set)
    for y, x in zip(*np.where(mask)):
        x, y = int(x), int(y)
        if y == 0 or not mask[y - 1, x]:
            edges[(x, y)].add((x + 1, y))
        if x == width - 1 or not mask[y, x + 1]:
            edges[(x + 1, y)].add((x + 1, y + 1))
        if y == height - 1 or not mask[y + 1, x]:
            edges[(x + 1, y + 1)].add((x, y + 1))
        if x == 0 or not mask[y, x - 1]:
            edges[(x, y + 1)].add((x, y))

    directions = {(1, 0): 0, (0, 1): 1, (-1, 0): 2, (0, -1): 3}
    while edges:
        start = next(iter(edges))
        point, previous_direction = start, 0
        contour = [start]
        while True:
            choices = edges[point]

            def priority(target):
                direction = directions[(target[0] - point[0], target[1] - point[1])]
                return {1: 0, 0: 1, 3: 2, 2: 3}[(direction - previous_direction) % 4]

            target = min(choices, key=priority)
            choices.remove(target)
            if not choices:
                del edges[point]
            previous_direction = directions[(target[0] - point[0], target[1] - point[1])]
            point = target
            contour.append(point)
            if point == start:
                break
        area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(contour, contour[1:]))) / 2
        if area >= 2:
            yield simplify(contour)


def main():
    image = Image.open(ROOT / "assets/brand/fleet-logo-reference.png").convert("RGB").crop(CROP)
    rgb = np.asarray(image, dtype=float)
    # Background stays below this threshold; the actual light/lime emblem stays above.
    mask = rgb @ np.array([0.2126, 0.7152, 0.0722]) >= 100
    primary, secondary = [], []
    for points in trace(mask):
        xs, ys = zip(*points)
        group = primary if min(ys) < 100 or (max(ys) < 180 and min(xs) < 300) else secondary
        group.append("M" + "L".join(f"{x} {y}" for x, y in points[:-1]) + "Z")

    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 552 332">\n'
        '  <title>Fleet Autopilot — F, xe ben, cẩu và vật liệu xây dựng</title>\n'
        '  <!-- Traced from the user reference; transparent canvas, theme colors inherited. -->\n'
        '  <g id="fleet-logo" fill-rule="evenodd" stroke="none">\n'
        f'    <path fill="currentColor" d="{" ".join(primary)}"/>\n'
        f'    <path fill="var(--brand-secondary, currentColor)" d="{" ".join(secondary)}"/>\n'
        '  </g>\n</svg>\n'
    )
    destination = ROOT / "assets/brand/fleet-construction.svg"
    destination.write_text(svg, encoding="utf-8")
    print(f"Created {destination.name}: {len(primary) + len(secondary)} contours, {len(svg)} characters")


if __name__ == "__main__":
    main()
