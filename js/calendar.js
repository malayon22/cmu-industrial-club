/* ============================================================
   "What's Happening" — live from the club Google Calendar.

   HOW IT WORKS (no API key involved):
   - A GitHub Action (.github/workflows/refresh-calendar.yml) runs
     scripts/fetch-calendar.mjs every few hours. It reads the club
     calendar's public ICS feed and writes assets/data/events.json.
   - This file fetches that JSON and renders the next 3 events.
   - If the JSON is missing or unreadable, sample events show and
     the pill says SAMPLE FEED. The section never renders empty.

   To point at a different calendar, edit the ICS_URL constant in
   scripts/fetch-calendar.mjs.
   ============================================================ */
(function () {
  'use strict';
  var IC = window.IC = window.IC || {};

  var SHOW_COUNT = 3;          /* events visible at a time */
  var GRACE_MS = 2 * 3600000;  /* keep an event listed 2h past start */

  /* Fallback only — shown if the live feed can't be loaded. */
  function sampleEvents() {
    return [
      { day: '08', month: 'SEP', title: 'GBM #1: Welcome & Industrials 101',
        desc: 'Kickoff meeting: what Carnegie Industrials does this semester, an intro to manufacturing and supply chains, and how to get involved. Free food.',
        time: '6:00 PM', location: 'Tepper 3808' },
      { day: '15', month: 'SEP', title: 'GBM #2: Freight & Rail Deep Dive',
        desc: 'How goods actually move: rail economics, trucking cycles, and what current freight and logistics data says about the broader economy.',
        time: '6:00 PM', location: 'Tepper 3808' },
      { day: '20', month: 'SEP', title: 'Site Visit: Pittsburgh Plant Tour',
        desc: 'On the floor at a local manufacturing facility. Limited spots, so sign up through the mailing list.',
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

    if (live && !events.length) {
      var empty = document.createElement('div');
      empty.className = 'config-note';
      empty.textContent = 'Nothing on the calendar right now. Check back soon.';
      list.appendChild(empty);
    }

    if (pill) {
      pill.textContent = live
        ? '● LIVE · SYNCED FROM GOOGLE CALENDAR'
        : '● SAMPLE FEED · CALENDAR SYNC UNAVAILABLE';
    }
    if (note) note.hidden = live;
    if (IC.interactions) IC.interactions.refreshGroup(list);
  }

  IC.calendar = {
    init: function () {
      if (!window.fetch) { render(sampleEvents(), false); return; }
      window.fetch('assets/data/events.json', { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('events.json http ' + r.status);
          return r.json();
        })
        .then(function (data) {
          if (!data || !Array.isArray(data.events)) throw new Error('bad events.json');
          var now = Date.now();
          var upcoming = data.events
            .filter(function (ev) { return ev.epochMs >= now - GRACE_MS; })
            .slice(0, SHOW_COUNT);
          render(upcoming, true);
        })
        .catch(function () {
          /* Never render empty: any failure falls back to samples. */
          render(sampleEvents(), false);
        });
    }
  };
})();
