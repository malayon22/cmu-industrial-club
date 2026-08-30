# Industrial Club at CMU — Website

Single-page site for the Carnegie Mellon Industrial Club. Plain HTML/CSS/JS —
**no build step, no dependencies**. Open `index.html` through any static server
(or GitHub Pages) and it works.

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

Push this folder to a GitHub repo → Settings → Pages → deploy from branch.
Everything is relative-path so it works from `https://<org>.github.io/<repo>/`.
`.nojekyll` is already there so Pages doesn't mangle anything.

## Things the club still needs to fill in

Search the code for **`CLUB TODO`** — every placeholder is marked:

- **Photos** — each gray "coming soon" frame is a `.photo-slot`. Replace the
  inner `.photo-ph` div with `<img src="assets/images/your-photo.jpg" alt="...">`
  (keep the `photo-slot` wrapper — it handles sizing and the reveal animation).
- **Partner logos** — swap the `LOGO` placeholders in the Network section.
- **Meeting room + time** — cards in the Meetings section.
- **Links** — TartanConnect join URL, Instagram / LinkedIn / Slack in the footer.
- **Google Calendar** — paste `CALENDAR_ID` + `API_KEY` into the config block at
  the top of `js/calendar.js` (instructions are in that file). Until then the
  section shows sample events.

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
js/nav.js             mobile hamburger
js/main.js            boots everything
```

Fun stuff to know about: hover any big heading letter-by-letter; hover the
bridge towers (a worker waves); click the bridge deck (a truck drives across);
the gears mesh and counter-rotate as you scroll; the red ticker pauses on hover.
