(function () {
  'use strict';

  var KEY = 'theme';
  var root = document.documentElement;

  function apply(mode) {
    root.setAttribute('data-theme', mode);
  }

  function next(current) {
    return current === 'light' ? 'dark' : 'light';
  }

  function current() {
    return localStorage.getItem(KEY) || 'light';
  }

  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var n = next(current());
      localStorage.setItem(KEY, n);
      apply(n);
    });
  }
})();
