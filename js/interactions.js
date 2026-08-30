/* ============================================================
   Interaction layer: per-letter hover, scroll reveals, gears,
   bridge scenes. One shared rAF scroll driver for everything.
   ============================================================ */
(function () {
  'use strict';
  var IC = window.IC = window.IC || {};

  /* ---------------- letterize ----------------
     Splits an element's text into per-letter spans, word-safe so
     lines still wrap on word boundaries. Nested elements (e.g. the
     red .accent period) are recursed into with their class kept.
     The original text stays exposed via aria-label. */
  function letterize(el) {
    var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);

    var index = 0;
    function splitInto(sourceNode, targetParent) {
      var nodes = Array.prototype.slice.call(sourceNode.childNodes);
      nodes.forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          var parts = node.textContent.split(/(\s+)/);
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              targetParent.appendChild(document.createTextNode(' '));
              return;
            }
            var word = document.createElement('span');
            word.className = 'hx-w';
            for (var i = 0; i < part.length; i++) {
              var ch = part[i];
              var l = document.createElement('span');
              l.className = 'l';
              l.setAttribute('data-ch', ch);
              l.style.setProperty('--i', Math.min(index++, 24));
              l.textContent = ch;
              word.appendChild(l);
            }
            targetParent.appendChild(word);
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          var clone = document.createElement(node.tagName.toLowerCase());
          clone.className = node.className;
          targetParent.appendChild(clone);
          splitInto(node, clone);
        }
      });
    }

    var wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');
    splitInto(el, wrap);
    el.textContent = '';
    el.appendChild(wrap);
  }

  function initHoverText() {
    document.querySelectorAll('[data-hover]').forEach(function (el) {
      el.classList.add('hx');
      letterize(el);
    });
  }

  /* ---------------- reveal observer ---------------- */
  var revealIO = null;

  function markGroup(group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--i', Math.min(i, 8));
    });
  }

  function initReveals() {
    var targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');

    /* Inject steel-plate doors (JS-owned so no-JS never hides photos) */
    document.querySelectorAll('[data-reveal="plate"]').forEach(function (slot) {
      ['plate-door plate-door--l', 'plate-door plate-door--r'].forEach(function (cls) {
        var door = document.createElement('div');
        door.className = cls;
        slot.appendChild(door);
      });
    });

    if (IC.gate.reducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }

    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        var repeat = el.hasAttribute('data-reveal-repeat');
        if (entry.isIntersecting) {
          el.classList.add('is-revealed');
          if (!repeat) revealIO.unobserve(el);
        } else if (repeat) {
          el.classList.remove('is-revealed');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) {
      if (el.hasAttribute('data-reveal-group')) markGroup(el);
      revealIO.observe(el);
    });
  }

  /* Re-observe a group whose children were rendered later (calendar rows) */
  function refreshGroup(el) {
    markGroup(el);
    if (revealIO && !el.classList.contains('is-revealed')) revealIO.observe(el);
  }

  /* ---------------- scroll driver ----------------
     The single scroll listener in the app. Subscribers get scrollY. */
  var subscribers = [];
  var ticking = false;

  function runSubscribers() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    for (var i = 0; i < subscribers.length; i++) subscribers[i](y);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(runSubscribers);
  }
  IC.scroll = {
    on: function (fn) { subscribers.push(fn); },
    kick: onScroll,
    start: function () {
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  };

  /* ---------------- gears ----------------
     Geometry from the club logo: 8 rounded teeth + annulus in a
     200x200 viewBox. Injected at runtime (decorative only). */
  function gearSVG(fill, spinDur, spinDir) {
    var teeth = '';
    for (var a = 0; a < 360; a += 45) {
      teeth += '<rect x="86" y="4" width="28" height="30" rx="4"' +
        (a ? ' transform="rotate(' + a + ' 100 100)"' : '') + '></rect>';
    }
    return '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<g class="gear-rotor"><g class="gear-spin" style="--spin-dur:' + spinDur +
      's;--spin-dir:' + (spinDir < 0 ? 'reverse' : 'normal') + '" fill="' + fill + '">' +
      teeth +
      '<circle cx="100" cy="100" r="58" fill="none" stroke="' + fill + '" stroke-width="28"></circle>' +
      '</g></g></svg>';
  }

  function initGears() {
    var rotate = IC.gate.reducedMotion() ? null : [];

    document.querySelectorAll('[data-gear]').forEach(function (host) {
      var size = parseFloat(host.dataset.gear);          /* rendered box px */
      var fill = host.dataset.fill || '#C41230';
      var ratio = parseFloat(host.dataset.ratio || '1'); /* driver R / this R */
      var dir = parseFloat(host.dataset.dir || '1');     /* 1 or -1 */
      var phase = parseFloat(host.dataset.phase || '0'); /* static mesh offset deg */
      var baseSpin = parseFloat(host.dataset.spin || '60');

      /* Meshed pair physics: follower spins faster by the radius ratio,
         opposite direction, half-tooth phase offset. */
      var spinDur = baseSpin / ratio;
      host.innerHTML = gearSVG(fill, spinDur, dir);
      host.style.width = size + 'px';
      host.style.height = size + 'px';

      var rotor = host.querySelector('.gear-rotor');
      rotor.style.transform = 'rotate(' + phase + 'deg)';
      if (rotate) rotate.push({ rotor: rotor, k: 0.06 * ratio * dir, phase: phase });
    });

    if (rotate && rotate.length) {
      IC.scroll.on(function (y) {
        for (var i = 0; i < rotate.length; i++) {
          var g = rotate[i];
          g.rotor.style.transform = 'rotate(' + (y * g.k + g.phase) + 'deg)';
        }
      });
    }
  }

  /* ---------------- bridge scenes ---------------- */
  function initBridgeScene(divider) {
    var svg = divider.querySelector('.bridge-svg');
    if (!svg) return;
    var truck = svg.querySelector('.truck');
    var visible = false;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }, { threshold: 0.2 }).observe(divider);
    } else {
      visible = true;
    }

    function driveTruck() {
      if (!truck || IC.gate.reducedMotion()) return;
      if (truck.getAnimations && truck.getAnimations().length) return;
      var dir = Math.random() < 0.5 ? 1 : -1; /* sometimes drives the other way */
      var from = dir > 0 ? -90 : 1290;
      var to = dir > 0 ? 1290 : -90;
      truck.style.transform = 'translate(' + from + 'px, 168px)' + (dir < 0 ? ' scale(-1, 1)' : '');
      truck.animate(
        [
          { transform: 'translate(' + from + 'px, 168px)' + (dir < 0 ? ' scale(-1,1)' : '') },
          { transform: 'translate(' + to + 'px, 168px)' + (dir < 0 ? ' scale(-1,1)' : '') }
        ],
        { duration: 7000, easing: 'linear' }
      );
    }

    function schedule() {
      var delay = 20000 + Math.random() * 20000; /* every 20-40s */
      window.setTimeout(function () {
        if (document.visibilityState === 'visible' && visible) driveTruck();
        schedule();
      }, delay);
    }
    if (!IC.gate.reducedMotion()) schedule();

    var deck = svg.querySelector('.hit-deck');
    if (deck) deck.addEventListener('pointerup', driveTruck);
  }

  /* ---------------- bootstrap ---------------- */
  IC.interactions = {
    init: function () {
      initHoverText();
      initReveals();
      initGears();
      document.querySelectorAll('.bridge-divider').forEach(initBridgeScene);
    },
    refreshGroup: refreshGroup
  };
})();
