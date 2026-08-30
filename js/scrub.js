/* ============================================================
   Scroll-scrubbed video engine.
   Each .scrub section: tall wrapper + sticky stage. Scroll progress
   through the wrapper maps to video.currentTime. Videos are lazy
   (no src until near viewport) and never load in static-fallback
   mode (mobile / coarse pointer / reduced motion) — the poster
   <img> underneath is the fallback everywhere.
   ============================================================ */
(function () {
  'use strict';
  var IC = window.IC = window.IC || {};

  function setupSection(el) {
    var video = el.querySelector('.scrub-video');
    if (!video) return null;

    var state = { el: el, video: video, loaded: false, ready: false };

    video.addEventListener('error', function () {
      el.classList.add('scrub-failed');
      el.classList.remove('scrub-ready');
    }, true);

    video.addEventListener('loadedmetadata', function () {
      el.classList.remove('scrub-failed');
      el.classList.add('scrub-ready');
      state.ready = true;
      scrubOne(state); /* deep links can land mid-section before metadata */
    });

    function load() {
      if (state.loaded || !el.dataset.video) return;
      state.loaded = true;
      video.src = el.dataset.video;
      video.load();
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        if (!IC.gate.staticFallback()) { load(); io.disconnect(); }
      }, { rootMargin: '100% 0px 100% 0px' });
      io.observe(el);
    } else if (!IC.gate.staticFallback()) {
      load();
    }

    state.load = load;
    return state;
  }

  function scrubOne(state) {
    if (!state.ready || IC.gate.staticFallback()) return;
    /* self-heal: a missed media-query flip (e.g. while the tab wasn't
       rendering) can leave the ready class off — restore it here */
    if (!state.el.classList.contains('scrub-failed')) {
      state.el.classList.add('scrub-ready');
    }
    var v = state.video;
    if (!v.duration || !Number.isFinite(v.duration) || v.duration <= 0) return;
    if (v.seeking) return; /* coalesce: don't stack seeks on slow decoders */

    var r = state.el.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return;
    var p = Math.min(1, Math.max(0, -r.top / total));
    /* keep a hair away from the exact end so the last frame holds */
    var t = p * Math.max(0, v.duration - 0.05);
    if (Math.abs(v.currentTime - t) > 0.01) v.currentTime = t;
  }

  IC.scrub = {
    init: function () {
      var sections = [];
      document.querySelectorAll('.scrub').forEach(function (el) {
        var s = setupSection(el);
        if (s) sections.push(s);
      });

      IC.scroll.on(function () {
        for (var i = 0; i < sections.length; i++) scrubOne(sections[i]);
      });

      /* If the environment flips (window resized past the breakpoint,
         OS reduced-motion toggled), load or hide accordingly. */
      IC.gate.onChange(function () {
        var fallback = IC.gate.staticFallback();
        sections.forEach(function (s) {
          if (fallback) {
            s.el.classList.remove('scrub-ready');
            /* release the buffered video entirely — fallback mode
               promises no video is loaded */
            if (s.loaded) {
              s.video.pause();
              s.video.removeAttribute('src');
              s.video.load();
              s.loaded = false;
              s.ready = false;
            }
          } else {
            if (!s.loaded) s.load();
            if (s.ready) { s.el.classList.add('scrub-ready'); scrubOne(s); }
          }
        });
      });
    }
  };
})();
