# VERTICALS — interactive website prototype

A full single-page, responsive frontend for Verticals, using the supplied Cubist character artwork and the requested wine / crimson / gold / cobalt / cream visual system.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.

Example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Main interaction

- Hover or focus a business vertical to expand it.
- The selected vertical updates the full-width detail panel below.
- On mobile, tap a panel.
- Scroll-reveal animations progressively bring sections in.
- FAQ uses native expandable details.

The only external dependency is Google Fonts; the artwork itself is bundled locally in `assets/`.
