/* ============================================================
   OUR TEAM — click-through slideshow.

   Member list below is the real e-board. To update a bio, swap a
   photo, or add someone: edit the fields directly — drop a file
   in assets/images/team/ and point `photo` at it (e.g.
   'assets/images/team/jane.jpg'); leave '' for the "coming soon"
   placeholder frame.
   ============================================================ */
(function () {
  'use strict';
  var IC = window.IC = window.IC || {};

  var MEMBERS = [
    { name: 'SEBASTIAN REICHELT', role: 'PRESIDENT',
      bio: 'Co-founder of Schenley & Co. and a Tepper class of 2029 student who reached the finals of the UCC case competition before his sophomore fall even started. Runs Industrial Club the way he runs a venture — set the agenda, get people in the room, ship something real every Tuesday.', photo: 'assets/images/team/sebastian.jpg' },
    { name: 'BEHRAM DARUWALLA', role: 'VICE PRESIDENT',
      bio: 'Owns and runs Zenith Pioneers LLC, a billboard advertising business — pricing contracts, chasing clients, learning finance from the outside in. A Bank of America Student Leader who has also led program operations for a 4,000-member youth organization and interned across public policy and partnerships at United Way. Handles the logistics side of the club: rooms, schedules, and the gap between a good idea and a Tuesday meeting that actually happens.', photo: 'assets/images/team/behram.jpg' },
    { name: 'MICHAEL ALAYON', role: 'PRESIDENT OF FINANCE',
      bio: "Serves as Assistant Director of Finance at Carnegie Mellon while also working as a Project Assistant for Fraternity and Sorority Life — finance and operations, back to back. Volunteers with HOBY PA East and Ylead outside of Tepper. Runs the club's numbers: the budget, the modeling case studies, and the financial-analysis side of every sector deep dive.", photo: 'assets/images/team/michael.jpg' }
  ];

  var index = 0;
  var lockUntil = 0; /* time-based lockout — can't jam if a timer is missed */

  function fields() {
    return {
      card: document.getElementById('team-card'),
      role: document.getElementById('team-role'),
      name: document.getElementById('team-name'),
      bio: document.getElementById('team-bio'),
      count: document.getElementById('team-count'),
      photoSlot: document.querySelector('.team-photo'),
      dots: document.getElementById('team-dots')
    };
  }

  function paint(f) {
    var m = MEMBERS[index];
    f.role.textContent = m.role;
    f.name.textContent = m.name;
    f.bio.textContent = m.bio;
    f.count.textContent = (index + 1) + ' / ' + MEMBERS.length;
    if (m.photo) {
      f.photoSlot.innerHTML = '<img src="' + m.photo + '" alt="' + m.name + ', ' + m.role.toLowerCase() + '" style="width:100%;height:100%;object-fit:cover">';
    } else {
      f.photoSlot.innerHTML = '<div class="photo-ph"><span>' + m.role + ' PHOTO</span><em>coming soon</em></div>';
    }
    Array.prototype.forEach.call(f.dots.children, function (dot, i) {
      dot.classList.toggle('active', i === index);
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
  }

  function go(delta, jumpTo) {
    var now = Date.now();
    if (now < lockUntil) return;
    var next = typeof jumpTo === 'number' ? jumpTo : index + delta;
    next = ((next % MEMBERS.length) + MEMBERS.length) % MEMBERS.length;
    if (next === index) return;
    var dir = typeof jumpTo === 'number' ? (jumpTo > index ? 1 : -1) : delta;
    index = next;
    var f = fields();

    if (IC.gate && IC.gate.reducedMotion()) { paint(f); return; }

    lockUntil = now + 420;
    f.card.style.setProperty('--slide-x', (dir * -22) + 'px');
    f.card.classList.add('team-switching');
    window.setTimeout(function () {
      paint(f);
      f.card.style.setProperty('--slide-x', (dir * 22) + 'px');
      /* jump to the incoming side, then settle to center */
      window.setTimeout(function () {
        f.card.classList.remove('team-switching');
      }, 30);
    }, 190);
  }

  IC.team = {
    init: function () {
      var f = fields();
      if (!f.card) return;

      var prev = document.querySelector('.team-prev');
      var next = document.querySelector('.team-next');
      if (prev) prev.addEventListener('click', function () { go(-1); });
      if (next) next.addEventListener('click', function () { go(1); });

      MEMBERS.forEach(function (m, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'team-dot';
        dot.setAttribute('aria-label', 'Show team member ' + (i + 1) + ': ' + m.role);
        dot.addEventListener('click', function () { go(0, i); });
        f.dots.appendChild(dot);
      });

      /* bound on the whole section so arrow keys work from the
         prev/next buttons AND the dots (the dots sit outside .team-slider) */
      var section = document.getElementById('team');
      if (section) {
        section.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
          if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        });
      }

      paint(f);
    }
  };
})();
