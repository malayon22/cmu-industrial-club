/* ============================================================
   "What's Happening" — Google Calendar sync with sample fallback.

   TO GO LIVE:
   1. Make the club Google Calendar public
      (Calendar settings -> Access permissions -> Make available to public).
   2. Create a Google API key with the Calendar API enabled:
      https://console.cloud.google.com/apis/credentials
   3. IMPORTANT: restrict the key by HTTP referrer to this site's
      domain (e.g. https://<org>.github.io/*) — this is a static site,
      so the key ships in page source; referrer restriction is what
      keeps it from being usable anywhere else.
   4. Paste both values below. That's it — the section syncs itself
      and the status pill flips to LIVE.
   ============================================================ */
(function () {
  'use strict';
  var IC = window.IC = window.IC || {};

  var CONFIG = {
    CALENDAR_ID: '',   /* e.g. 'industrialclub@group.calendar.google.com' */
    API_KEY: ''        /* e.g. 'AIza...' (referrer-restricted!) */
  };

  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  /* Shown until the real calendar is wired up — edit freely. */
  function sampleEvents() {
    return [
      { day: '02', month: 'SEP', title: 'GBM #1 — Welcome & Industrials 101',
        desc: 'Kickoff meeting: what the club does this semester, intro to the industrial sector, and how to get involved. Free food.',
        time: '7:00 PM', location: 'CMU · Room TBD' },
      { day: '09', month: 'SEP', title: 'Sector Deep Dive: Freight & Rail',
        desc: 'How goods actually move — rail economics, trucking cycles, and what current freight data says about the economy.',
        time: '7:00 PM', location: 'CMU · Room TBD' },
      { day: '20', month: 'SEP', title: 'Site Visit: Pittsburgh Plant Tour',
        desc: 'On the floor at a local manufacturing facility. Limited spots — sign up through the mailing list.',
        time: '10:00 AM', location: 'Off campus · Bus provided' }
    ];
  }

  function render(events, live) {
    var list = document.getElementById('calendar-list');
    var pill = document.getElementById('calendar-pill');
    var note = document.getElementById('calendar-note');
    var tpl = document.getElementById('event-row-template');
    if (!list || !tpl) return;

    list.textContent = '';
    events.forEach(function (ev) {
      var row = tpl.content.cloneNode(true);
      row.querySelector('[data-field="day"]').textContent = ev.day;
      row.querySelector('[data-field="month"]').textContent = ev.month;
      row.querySelector('[data-field="title"]').textContent = ev.title;
      row.querySelector('[data-field="desc"]').textContent = ev.desc;
      row.querySelector('[data-field="time"]').textContent = ev.time;
      row.querySelector('[data-field="location"]').textContent = ev.location;
      list.appendChild(row);
    });

    if (pill) {
      pill.textContent = live
        ? '● LIVE · SYNCED FROM GOOGLE CALENDAR'
        : '● SAMPLE FEED · CONNECTS TO GOOGLE CALENDAR';
    }
    if (note) note.hidden = live;
    if (IC.interactions) IC.interactions.refreshGroup(list);
  }

  function loadLive() {
    var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(CONFIG.CALENDAR_ID) + '/events' +
      '?key=' + encodeURIComponent(CONFIG.API_KEY) +
      '&timeMin=' + new Date().toISOString() +
      '&singleEvents=true&orderBy=startTime&maxResults=6';

    window.fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('calendar http ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (!d.items || !d.items.length) throw new Error('no events');
        render(d.items.map(function (item) {
          var start = item.start || {};
          var s = new Date(start.dateTime || start.date);
          return {
            day: String(s.getDate()).padStart(2, '0'),
            month: MONTHS[s.getMonth()],
            title: item.summary || 'Untitled event',
            desc: String(item.description || '').replace(/<[^>]*>/g, '').slice(0, 200),
            time: start.dateTime
              ? s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : 'ALL DAY',
            location: item.location || 'CMU campus'
          };
        }), true);
      })
      .catch(function () {
        /* Never render empty: any failure falls back to samples. */
        render(sampleEvents(), false);
      });
  }

  IC.calendar = {
    init: function () {
      if (CONFIG.CALENDAR_ID && CONFIG.API_KEY && window.fetch) loadLive();
      else render(sampleEvents(), false);
    }
  };
})();
