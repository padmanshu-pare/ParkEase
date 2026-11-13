# ParkEase showcase site

A single static page that presents the ParkEase project.

## Files
- `index.html`: the whole site (no build step)
- `images/`: screenshots used on the page

## Add or replace screenshots
1. Take the screenshot from the live app (Windows: Win + Shift + S).
2. Save it in `images/` with the name listed on the page.
3. Add a block in the "Screens" section:

```html
<figure>
  <img src="images/dashboard.png" alt="Manager dashboard with live floor plan" />
  <figcaption><strong>Dashboard.</strong> One line about what the screen does.</figcaption>
</figure>
```

## Publish
- Vercel: New Project, import the repo, set the root directory to this folder, no build command. Or drag the folder to any static host.
- GitHub Pages: put this folder in `docs/` and enable Pages from `main` / `docs`.
