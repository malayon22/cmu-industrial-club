/* Shared capability gate: one place decides when kinetic features
   (video scrub, gear rotation, ambient scenes) switch off.
   Mirrors the CSS media query in sections.css. */
(function () {
  'use strict';
  var IC = window.IC = window.IC || {};

  var fallbackQuery = window.matchMedia(
    '(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 900px)'
  );
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function listen(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn); // older Safari
  }

  IC.gate = {
    /* true => static poster mode: no scrub, no ambient trucks */
    staticFallback: function () { return fallbackQuery.matches; },
    /* true => user asked for minimal motion: no JS-driven animation at all */
    reducedMotion: function () { return reducedQuery.matches; },
    onChange: function (fn) { listen(fallbackQuery, fn); listen(reducedQuery, fn); }
  };
})();
