# Industrial Club at CMU — Website

**Live at: https://malayon22.github.io/cmu-industrial-club/**

Single-page site for the Carnegie Mellon Industrial Club. Plain HTML/CSS/JS —
**no build step, no dependencies**. Open `index.html` through any static server
(or GitHub Pages) and it works.

## Making edits after launch

The live site IS this git repo. Edit files, then:

```bash
git add -A ; git commit -m "describe the change" ; git push
```

GitHub Pages redeploys automatically in ~1 minute. Nothing else to do. To
undo a bad change: `git revert HEAD` and push again.

## Run it locally

```bash
node scripts/serve.mjs
```

then open http://localhost:5544.

Heads-up: `python -m http.server` will NOT work for the video sections — it
doesn't support HTTP Range requests, so browsers refuse to seek the videos and
the scroll-scrub effect silently freezes on frame one. The bundled
`scripts/serve.mjs` (zero dependencies) handles ranges correctly, as do GitHub
Pages and every real static host.

## Deploy (GitHub Pages)

Already done: repo `malayon22/cmu-industrial-club`, Pages serving branch
`master` at the URL above. Everything is relative-path so it works from
`https://<user>.github.io/<repo>/`; `.nojekyll` keeps Pages from mangling files.

## Custom domain (carnegiemellonindustrialclub.com)

After buying the domain (Porkbun), do these once:

1. In Porkbun → the domain → DNS, delete any parked defaults and add:
   - `A` record, host blank (apex) → `185.199.108.153`
   - `A` record, host blank (apex) → `185.199.109.153`
   - `A` record, host blank (apex) → `185.199.110.153`
   - `A` record, host blank (apex) → `185.199.111.153`
   - `CNAME` record, host `www` → `malayon22.github.io`
2. GitHub repo → Settings → Pages → Custom domain → enter
   `carnegiemellonindustrialclub.com` → Save, then tick **Enforce HTTPS**
   once the certificate is issued (can take ~15 min after DNS propagates).

The github.io URL keeps working as a backup either way.

## Things the club still needs to fill in

- **Team members** ✓ done — the real e-board (names, roles, bios, photos) lives
  at the top of `js/team.js`. To update a bio, change a role, or swap a photo
  for someone new, edit that file directly; drop a headshot in
  `assets/images/team/` and point the member's `photo` field at it. The
  slideshow updates itself.
- **Meeting room + time** ✓ done — Tuesdays 6–7 PM in Tepper 3808, reflected in
  the Meetings section cards and intro copy.
- **Links** ✓ done — TartanConnect (nav, join CTA, footer) and Instagram
  (footer) point to the club's real pages. There's no club LinkedIn yet, so
  that footer link was removed rather than left dead; add it back in
  `index.html` if the club creates one.
- **Photos** — each gray "coming soon" frame is a `.photo-slot`. Replace the
  inner `.photo-ph` div with `<img src="assets/images/your-photo.jpg" alt="...">`
  (keep the `photo-slot` wrapper — it handles sizing and the reveal animation).
  Search the code for **`CLUB TODO`** to find the remaining photo slots.
- **Partner / sponsor content** — if the club lines up partners or sponsors,
  there's no dedicated section for them yet; add one if needed.
- **Google Calendar** — paste `CALENDAR_ID` + `API_KEY` into the config block at
  the top of `js/calendar.js` (instructions are in that file). Until then the
  section shows sample events.
- **Videos** — the three scroll-scrub clips are still placeholder footage (see
  below); swap them for real club/licensed footage before promoting the site
  widely.

## Videos

The three scroll-scrubbed videos live at `assets/video/{hero,interlude,join}.mp4`
with a poster JPG next to each. **Current clips are placeholder footage captured
from YouTube (Oculus Films) — replace them with club/licensed footage before
promoting the site widely.**

To swap in a new clip, encode it for scrubbing (a keyframe every 6 frames is the
whole trick — normal videos seek terribly):

```bash
ffmpeg -i SOURCE.mp4 -ss <start> -to <end> -vf "fps=30,format=yuv420p" -an -c:v libx264 -preset slow -profile:v high -level 4.1 -crf 21 -maxrate 5M -bufsize 10M -g 6 -keyint_min 6 -sc_threshold 0 -movflags +faststart assets/video/hero.mp4
```

```bash
ffmpeg -i SOURCE.mp4 -ss <poster-time> -frames:v 1 -q:v 3 assets/video/hero-poster.jpg
```

Use a **single continuous shot** (no scene cuts) 5–12s long. On phones and for
reduced-motion users the poster shows instead of the scrub — that's intentional.

## How it's organized

```
index.html            all markup (sections in page order)
css/tokens.css        colors, fonts, spacing variables
css/base.css          reset, a11y, fallbacks
css/layout.css        nav, grids, breakpoints
css/components.css    buttons, cards, ticker, event rows
css/sections.css      hero/scrub stages, dividers, per-section styles
css/motion.css        hover/reveal/gear/bridge animations + reduced-motion off-switch
js/motion-gate.js     decides when motion features turn off (mobile etc.)
js/interactions.js    per-letter hover, scroll reveals, gears, bridge scenes
js/scrub.js           scroll-driven video engine
js/calendar.js        Google Calendar sync + sample fallback  ← config lives here
js/team.js            Our Team slideshow  ← member list lives here
js/nav.js             mobile hamburger
js/main.js            boots everything
```

Fun stuff to know about: hover any big heading letter-by-letter; one worker
hides somewhere random on each bridge — sweep your mouse across the deck to
find him (he pops up and says hi, and relocates every time you leave); other
workers pop up on their own; click the bridge deck (a truck drives across),
and anyone still up when the truck arrives gets run over with a mini
explosion; the gears mesh and counter-rotate as you scroll; the red ticker
pauses on hover.
