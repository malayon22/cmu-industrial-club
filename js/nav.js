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
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
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
