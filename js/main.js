/* Bootstraps every module once the DOM is ready.
   Load order (see index.html): motion-gate -> interactions ->
   scrub -> calendar -> nav -> main. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var IC = window.IC || {};
    if (IC.interactions) IC.interactions.init();
    if (IC.scrub) IC.scrub.init();
    if (IC.calendar) IC.calendar.init();
    if (IC.nav) IC.nav.init();
    if (IC.scroll) IC.scroll.start();
  });
})();
