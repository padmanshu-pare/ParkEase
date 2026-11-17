# ParkEase pitch site

A single static page to present ParkEase to investors, professors, and users.

## Files
- `index.html`: the whole site (no build step)
- `images/`: real screenshots from the app

## Before you share it
1. Replace `[your-email]` in the final call-to-action with a real contact address.
2. Fill in the business model prices once you decide them (currently marked "to be set").
3. Re-take the screenshots after payments are finished, so the product looks current.
4. Check the live demo link still works.

## Publish
- Vercel: New project, set the root directory to this folder, no build command.
- GitHub Pages: keep this folder as `docs/` and enable Pages from `main` / `docs`.

## Notes
- The "live floor" in the hero is a demo animation for presentation. It does not show real data.
- Nothing on the page claims user counts, revenue, or awards that are not verified.

## Demo form
The "Book a demo" form works in two ways:
1. Set `FORM_ENDPOINT` in `index.html` to your form URL (free at formspree.io: create a form, copy its URL). Submissions then arrive in your email.
2. If `FORM_ENDPOINT` is empty, the form opens an email to `TEAM_EMAIL` with the details filled in.
Also replace `hello@example.com` with your real address.

## Case study
`case-study.html` is a template. Replace every `[bracketed]` item with real pilot numbers and an approved quote. Do not publish invented numbers. Link it from the home page once it is filled in.
