(function () {
  'use strict';

  // ---- Theme toggle: light → dark → auto (system) ----
  var KEY = 'theme';
  var root = document.documentElement;

  function apply(mode) {
    if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function next(current) {
    if (current === 'light') return 'dark';
    if (current === 'dark') return 'auto';
    return 'light';
  }

  function current() {
    return localStorage.getItem(KEY) || 'auto';
  }

  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var n = next(current());
      if (n === 'auto') {
        localStorage.removeItem(KEY);
      } else {
        localStorage.setItem(KEY, n);
      }
      apply(n);
    });
  }

  // ---- TOC active-section highlight ----
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (!tocLinks.length) return;

  var headings = [];
  tocLinks.forEach(function (link) {
    var id = decodeURIComponent(link.getAttribute('href').slice(1));
    var el = document.getElementById(id);
    if (el) headings.push({ el: el, link: link });
  });

  if (!headings.length) return;

  function activate() {
    var offset = 120;
    var scrollY = window.scrollY;
    var active = headings[0];
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].el.offsetTop - offset <= scrollY) {
        active = headings[i];
      } else {
        break;
      }
    }
    tocLinks.forEach(function (l) { l.classList.remove('toc-active'); });
    active.link.classList.add('toc-active');
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      activate();
      ticking = false;
    });
  }, { passive: true });
  activate();
})();
