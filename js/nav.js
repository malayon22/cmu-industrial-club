/* Mobile nav: hamburger toggles the link panel. */
(function () {
  'use strict';
  var IC = window.IC = window.IC || {};

  IC.nav = {
    init: function () {
      var toggle = document.querySelector('.nav-toggle');
      var panel = document.getElementById('nav-panel');
      if (!toggle || !panel) return;

      function setOpen(open) {
        toggle.setAttribute('aria-expanded', String(open));
        panel.classList.toggle('is-open', open);
      }

      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        setOpen(open);
        /* the panel sits BEFORE the toggle in the DOM, so forward-Tab
           would skip it — move focus into the menu when it opens */
        if (open) {
          var first = panel.querySelector('.nav-link');
          if (first) first.focus();
        }
      });

      panel.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          toggle.focus();
        }
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 980) setOpen(false);
      });
    }
  };
})();
