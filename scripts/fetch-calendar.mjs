/* Fetches the club's public Google Calendar (ICS feed — no API key
   needed) and writes upcoming events to assets/data/events.json.
   Runs on a schedule via .github/workflows/refresh-calendar.yml and
   can be run locally: node scripts/fetch-calendar.mjs

   To point at a different calendar, change ICS_URL (Google Calendar
   settings -> Integrate calendar -> "Public address in iCal format"). */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ICS_URL =
  'https://calendar.google.com/calendar/ical/' +
  'c_017ba1f3627fe2fd10977d093f65a395a1f8b90aaf1b604e401fa2f1af78bb9d%40group.calendar.google.com' +
  '/public/basic.ics';

const TZ = 'America/New_York';
const HORIZON_DAYS = 120; /* how far ahead to expand recurring events */
const MAX_EVENTS = 10;    /* the site shows 3; keep a few spares */

/* ---- timezone: wall time in TZ -> real UTC epoch (two-pass) ---- */
function zonedEpoch(y, mo, d, h = 0, mi = 0, s = 0) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const asZone = (t) => {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    }).formatToParts(new Date(t)).reduce((a, x) => (a[x.type] = x.value, a), {});
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  };
  let t = guess - (asZone(guess) - guess);
  t = guess - (asZone(t) - t); /* second pass handles DST edges */
  return t;
}

/* real UTC epoch -> wall-clock parts in TZ */
function wallParts(epoch) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date(epoch)).reduce((a, x) => (a[x.type] = x.value, a), {});
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}

/* ---- ICS parsing ---- */
function unfold(ics) {
  return ics.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function parseDate(value, params) {
  /* forms: 20260907T180000 (+TZID param), 20260907T220000Z, 20260907 (all-day) */
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const allDay = !h;
  let epoch, wall;
  if (z) {
    epoch = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
    wall = wallParts(epoch);
  } else {
    /* floating or TZID times are treated as club-local (America/New_York) */
    wall = { y: +y, mo: +mo, d: +d, h: +(h || 0), mi: +(mi || 0) };
    epoch = zonedEpoch(wall.y, wall.mo, wall.d, wall.h, wall.mi);
  }
  return { epoch, allDay, wall };
}

function unescapeText(v) {
  return v
    .replace(/\\n/gi, ' ')
    .replace(/\\([,;\\])/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEvents(ics) {
  const events = [];
  const blocks = unfold(ics).split('BEGIN:VEVENT').slice(1);
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0];
    const ev = { exdates: new Set() };
    for (const line of body.split('\n')) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const left = line.slice(0, idx);
      const value = line.slice(idx + 1).trim();
      const [prop] = left.split(';');
      const params = left;
      switch (prop) {
        case 'DTSTART': ev.start = parseDate(value, params); break;
        case 'SUMMARY': ev.title = unescapeText(value); break;
        case 'DESCRIPTION': ev.desc = unescapeText(value); break;
        case 'LOCATION': ev.location = unescapeText(value); break;
        case 'RRULE': ev.rrule = value; break;
        case 'STATUS': ev.status = value; break;
        case 'EXDATE':
          for (const v of value.split(',')) {
            const d = parseDate(v.trim(), params);
            if (d) ev.exdates.add(d.epoch);
          }
          break;
      }
    }
    if (ev.start && ev.title && ev.status !== 'CANCELLED') events.push(ev);
  }
  return events;
}

/* ---- basic recurrence expansion (WEEKLY/DAILY/MONTHLY) ---- */
const DAY_MS = 86400000;
const BYDAY_NUM = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function expand(ev, now, horizonEnd) {
  const out = [];
  const push = (epoch) => {
    if (epoch >= now - 3 * 3600000 && epoch <= horizonEnd && !ev.exdates.has(epoch)) {
      out.push(epoch);
    }
  };
  if (!ev.rrule) { push(ev.start.epoch); return out; }

  const rule = Object.fromEntries(ev.rrule.split(';').map((p) => p.split('=')));
  const interval = +(rule.INTERVAL || 1);
  let until = horizonEnd;
  if (rule.UNTIL) {
    const u = parseDate(rule.UNTIL);
    if (u) until = Math.min(until, u.epoch);
  }
  const maxCount = rule.COUNT ? +rule.COUNT : 1000;

  /* All expansion walks WALL dates (club-local), so a 6 PM event stays
     6 PM across DST changes, exactly as Google renders it. */
  const w = ev.start.wall;
  const occurrenceAt = (dayOffset) => {
    const dt = new Date(Date.UTC(w.y, w.mo - 1, w.d + dayOffset));
    return {
      epoch: zonedEpoch(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), w.h, w.mi),
      dow: dt.getUTCDay(),
    };
  };

  if (rule.FREQ === 'WEEKLY') {
    const days = (rule.BYDAY ? rule.BYDAY.split(',') : [])
      .map((d) => BYDAY_NUM[d.replace(/^[+-]?\d+/, '')])
      .filter((d) => d !== undefined);
    if (!days.length) days.push(occurrenceAt(0).dow);
    let count = 0;
    for (let k = 0; count < maxCount; k++) {
      const { epoch, dow } = occurrenceAt(k);
      if (epoch > until) break;
      if (days.includes(dow) && Math.floor(k / 7) % interval === 0) {
        count++;
        push(epoch);
      }
    }
  } else if (rule.FREQ === 'DAILY') {
    let count = 0;
    for (let k = 0; count < maxCount; k += interval) {
      const { epoch } = occurrenceAt(k);
      if (epoch > until) break;
      count++;
      push(epoch);
    }
  } else if (rule.FREQ === 'MONTHLY' || rule.FREQ === 'YEARLY') {
    const step = rule.FREQ === 'MONTHLY' ? interval : 12 * interval;
    for (let k = 0, count = 0; count < maxCount; k++) {
      const epoch = zonedEpoch(w.y, w.mo + k * step, w.d, w.h, w.mi);
      if (epoch > until) break;
      count++;
      push(epoch);
    }
  } else {
    push(ev.start.epoch);
  }
  return out;
}

/* ---- formatting for the site ---- */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function display(epoch, allDay) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(new Date(epoch)).reduce((a, x) => (a[x.type] = x.value, a), {});
  return {
    day: String(p.day).padStart(2, '0'),
    month: MONTHS[+p.month - 1],
    time: allDay ? 'ALL DAY' : `${p.hour}:${p.minute} ${p.dayPeriod.toUpperCase()}`,
  };
}

/* ---- main ---- */
const res = await fetch(ICS_URL);
if (!res.ok) throw new Error('ICS fetch failed: HTTP ' + res.status);
const ics = await res.text();
if (!ics.includes('BEGIN:VCALENDAR')) throw new Error('Not an ICS response');

const now = Date.now();
const horizonEnd = now + HORIZON_DAYS * DAY_MS;
const upcoming = [];
for (const ev of parseEvents(ics)) {
  for (const epoch of expand(ev, now, horizonEnd)) {
    upcoming.push({
      epochMs: epoch,
      ...display(epoch, ev.start.allDay),
      title: ev.title,
      desc: (ev.desc || '').slice(0, 220),
      location: ev.location || 'CMU campus',
    });
  }
}
upcoming.sort((a, b) => a.epochMs - b.epochMs);

const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'data', 'events.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({
  updated: new Date().toISOString(),
  events: upcoming.slice(0, MAX_EVENTS),
}, null, 2));
console.log(`Wrote ${Math.min(upcoming.length, MAX_EVENTS)} upcoming events to assets/data/events.json`);
