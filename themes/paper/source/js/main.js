(function () {
  'use strict';

  var root = document.documentElement;
  var themeKey = 'theme';

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
  }

  function currentTheme() {
    return localStorage.getItem(themeKey) || 'light';
  }

  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      localStorage.setItem(themeKey, next);
      applyTheme(next);
    });
  }

  var nav = document.querySelector('.ambient-nav[data-ambient-nav="true"]');
  var lastScrollY = window.scrollY || 0;
  var navTicking = false;

  function updateNav() {
    if (!nav) return;

    var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    nav.classList.toggle('is-floating', scrollY > 24);
    nav.classList.toggle('is-muted', scrollY > lastScrollY && scrollY > 120);
    lastScrollY = Math.max(scrollY, 0);
  }

  if (nav) {
    window.addEventListener('scroll', function () {
      if (navTicking) return;
      navTicking = true;
      requestAnimationFrame(function () {
        updateNav();
        navTicking = false;
      });
    }, { passive: true });
    updateNav();
  }

  var progressEl = document.querySelector('[data-read-progress]');
  var progressTicking = false;
  var coordinateSymbol = document.querySelector('[data-coordinate-symbol]');
  var returnRail = document.querySelector('[data-return-rail]');
  var timelineItems = Array.prototype.slice.call(document.querySelectorAll('.timeline-item[data-post-year]'));
  var timelineYearMarks = Array.prototype.slice.call(document.querySelectorAll('.timeline-year-mark[data-year]'));

  function updateProgress() {
    if (!progressEl) return;
    var postContent = document.querySelector('[data-post-content]');

    if (postContent) {
      // 文章详情页：基于文章内容区域计算
      var contentRect = postContent.getBoundingClientRect();
      var contentTop = window.scrollY + contentRect.top;
      var contentHeight = contentRect.height;
      var viewportHeight = window.innerHeight;

      // 当文章顶部刚进入视口时是 0%，当文章底部刚离开视口时是 100%
      var scrolledIntoContent = Math.max(0, window.scrollY - contentTop);
      var readableRange = Math.max(1, contentHeight - viewportHeight);
      var percent = Math.min(100, Math.max(0, Math.round((scrolledIntoContent / readableRange) * 100)));

      progressEl.textContent = String(percent).padStart(2, '0');
    } else {
      // 其他页面：使用整页计算
      var doc = document.documentElement;
      var max = Math.max(doc.scrollHeight - window.innerHeight, 1);
      var percent = Math.max(0, Math.round((window.scrollY / max) * 100));
      progressEl.textContent = String(percent).padStart(2, '0');
    }
  }

  function getCoordinateScopeItems() {
    if (!streamContainer || !streamContainer.classList.contains('is-filtering')) {
      return timelineItems;
    }

    var matchedItems = timelineItems.filter(function (item) {
      return item.classList.contains('is-matched');
    });

    return matchedItems.length ? matchedItems : timelineItems;
  }

  function updateCoordinateYear() {
    if (!coordinateSymbol || !timelineItems.length) return;

    var scopedItems = getCoordinateScopeItems();
    if (!scopedItems.length) return;

    var activeYear = scopedItems[0].dataset.postYear || coordinateSymbol.dataset.defaultSymbol || '·';
    var threshold = 176;
    var visibleCandidate = null;

    scopedItems.forEach(function (item) {
      var rect = item.getBoundingClientRect();
      if (rect.top <= threshold) {
        activeYear = item.dataset.postYear || activeYear;
      }
      if (!visibleCandidate && rect.bottom > threshold) {
        visibleCandidate = item.dataset.postYear || activeYear;
      }
    });

    if (visibleCandidate && window.scrollY < 120) {
      activeYear = visibleCandidate;
    }

    coordinateSymbol.textContent = activeYear;
  }

  function scheduleCoordinateYearUpdate() {
    requestAnimationFrame(function () {
      requestAnimationFrame(updateCoordinateYear);
    });
  }

  if (progressEl || coordinateSymbol) {
    window.addEventListener('scroll', function () {
      if (progressTicking) return;
      progressTicking = true;
      requestAnimationFrame(function () {
        if (progressEl) updateProgress();
        updateCoordinateYear();
        progressTicking = false;
      });
    }, { passive: true });
    if (progressEl) updateProgress();
    updateCoordinateYear();
    window.addEventListener('resize', updateCoordinateYear, { passive: true });
    window.addEventListener('load', scheduleCoordinateYearUpdate, { passive: true });
    window.addEventListener('pageshow', scheduleCoordinateYearUpdate, { passive: true });
  }

  function windowScrollToElement(el, offset) {
    var rect = el.getBoundingClientRect();
    var target = window.scrollY + rect.top - (offset || 96);
    window.scrollTo({ top: Math.max(target, 0), behavior: 'smooth' });
  }

  function syncReturnRailState() {
    if (!returnRail) return;
    var hasActivePost = !!document.querySelector('.timeline-item.is-active');
    returnRail.tabIndex = hasActivePost ? 0 : -1;
    returnRail.setAttribute('aria-disabled', hasActivePost ? 'false' : 'true');
  }

  function clearActiveItems(except) {
    document.querySelectorAll('.timeline-item.is-active').forEach(function (item) {
      if (item === except) return;
      collapseArticle(item, false);
    });
  }

  function collapseArticle(article, shouldScroll) {
    if (!article) return false;
    var content = article.querySelector('.item-body-expanded');
    article.classList.remove('is-active');
    if (content) content.hidden = true;
    if (!document.querySelector('.timeline-item.is-active')) {
      document.body.classList.remove('has-expanded-post');
    }
    syncReturnRailState();
    if (shouldScroll !== false) windowScrollToElement(article, 120);
    return true;
  }

  function collapseCurrentArticle(shouldScroll) {
    return collapseArticle(document.querySelector('.timeline-item.is-active'), shouldScroll);
  }

  document.addEventListener('click', function (event) {
    var collapse = event.target.closest('[data-collapse-trigger], [data-collapse-post]');
    if (!collapse) return;

    var article = collapse.closest('.timeline-item');
    if (!article) return;

    event.preventDefault();
    collapseArticle(article, true);
  });

  document.addEventListener('click', function (event) {
    var closeZone = event.target.closest('.coordinate-rail, .right-void, .timeline-year-mark');
    if (!closeZone) return;
    if (event.target.closest('a, button')) return;
    if (collapseCurrentArticle(true)) event.preventDefault();
  });

  if (returnRail) {
    syncReturnRailState();
    returnRail.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (collapseCurrentArticle(true)) event.preventDefault();
    });
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-expand-post]');
    if (!trigger) return;

    var pageRoot = trigger.closest('[data-theater-mode="true"]');
    if (!pageRoot) return;

    var article = trigger.closest('.timeline-item');
    var content = article && article.querySelector('.item-body-expanded');
    var postUrl = article && article.dataset.postUrl;
    if (!article || !content || !postUrl) return;

    event.preventDefault();

    if (article.classList.contains('is-active')) {
      collapseArticle(article, false);
      return;
    }

    clearActiveItems(article);

    function openLoaded() {
      content.hidden = false;
      article.classList.add('is-active');
      document.body.classList.add('has-expanded-post');
      syncReturnRailState();
      windowScrollToElement(article, 104);
    }

    if (content.dataset.loaded) {
      openLoaded();
      return;
    }

    content.innerHTML = '<div class="loading">Loading...</div>';
    content.hidden = false;

    fetch(postUrl, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Request failed');
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var body = doc.querySelector('[data-post-content]') || doc.querySelector('.markdown-body') || doc.querySelector('.post-content') || doc.querySelector('.prose');
        if (!body) throw new Error('Content missing');

        var cleanContent = body.cloneNode(true);
        cleanContent.querySelectorAll('.sidebar, .post-sidebar, .right-void').forEach(function (node) {
          node.remove();
        });

        cleanContent.querySelectorAll('img').forEach(function (img) {
          if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        });

        content.innerHTML = '<div class="expanded-sheet prose"><div class="post-content-inner">' + cleanContent.innerHTML + '</div><div class="post-collapse-wrapper"><div class="post-collapse-trigger" data-collapse-trigger="' + (article.id || '') + '">收起</div></div></div>';
        content.dataset.loaded = 'true';
        openLoaded();
      })
      .catch(function () {
        window.location.href = postUrl;
      });
  });

  var filterBar = document.querySelector('.timeline-filter');
  var filterName = filterBar && filterBar.querySelector('.filter-name');
  var clearButton = filterBar && filterBar.querySelector('.filter-clear');
  var streamContainer = document.querySelector('.timeline-stream');
  var currentFilterTag = '';

  function parseTagDataset(rawValue) {
    if (!rawValue) return [];

    try {
      var parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map(function (tag) { return String(tag).trim(); }).filter(Boolean);
      }
    } catch (error) {}

    return String(rawValue)
      .split(',')
      .map(function (tag) { return tag.trim(); })
      .filter(Boolean);
  }

  function syncTimelineYearMarks() {
    if (!timelineYearMarks.length) return;

    if (!streamContainer || !streamContainer.classList.contains('is-filtering')) {
      timelineYearMarks.forEach(function (mark) {
        mark.classList.remove('is-dimmed');
        mark.classList.remove('is-matched');
      });
      return;
    }

    var matchedYears = Object.create(null);
    document.querySelectorAll('.timeline-item.is-matched').forEach(function (item) {
      var year = item.dataset.postYear;
      if (year) matchedYears[year] = true;
    });

    timelineYearMarks.forEach(function (mark) {
      var year = mark.dataset.year || '';
      var isMatched = !!matchedYears[year];
      mark.classList.toggle('is-matched', isMatched);
      mark.classList.toggle('is-dimmed', !isMatched);
    });
  }

  function applyTagFilter(tagName) {
    var items = document.querySelectorAll('.timeline-item');
    if (!streamContainer || !items.length) return false;

    var matchCount = 0;
    items.forEach(function (item) {
      var tags = parseTagDataset(item.dataset.tags || '');
      if (tags.indexOf(tagName) !== -1) {
        matchCount += 1;
      }
    });

    if (!matchCount) {
      clearTagFilter();
      return false;
    }

    streamContainer.classList.add('is-filtering');
    currentFilterTag = tagName;

    items.forEach(function (item) {
      var tags = parseTagDataset(item.dataset.tags || '');
      var isMatched = tags.indexOf(tagName) !== -1;

      if (isMatched) {
        item.classList.remove('is-dimmed');
        item.classList.add('is-matched');
        return;
      }

      item.classList.add('is-dimmed');
      item.classList.remove('is-matched');

      if (item.classList.contains('is-active')) {
        collapseArticle(item, false);
      }
    });

    syncTimelineYearMarks();
    document.querySelectorAll('[data-tag-filter]').forEach(function (tag) {
      tag.classList.toggle('is-active', tag.dataset.tagFilter === tagName);
    });

    if (filterBar && filterName) {
      filterName.textContent = '#' + tagName;
      filterBar.hidden = false;
      filterBar.classList.add('is-visible');
    }
    updateCoordinateYear();
    return true;
  }

  function clearTagFilter() {
    currentFilterTag = '';

    if (streamContainer) {
      streamContainer.classList.remove('is-filtering');
    }

    document.querySelectorAll('.timeline-item').forEach(function (item) {
      item.classList.remove('is-dimmed');
      item.classList.remove('is-matched');
    });
    syncTimelineYearMarks();
    document.querySelectorAll('[data-tag-filter]').forEach(function (tag) {
      tag.classList.remove('is-active');
    });
    if (filterBar) {
      filterBar.hidden = true;
      filterBar.classList.remove('is-visible');
    }
    if (filterName) filterName.textContent = '';
    updateCoordinateYear();
  }

  document.addEventListener('click', function (event) {
    var tag = event.target.closest('[data-tag-filter]');
    if (!tag) return;

    var tagName = tag.dataset.tagFilter || '';
    if (!tagName) return;

    if (currentFilterTag === tagName) {
      clearTagFilter();
      if (tag.closest('.origami-drawer')) setDrawer(false);
      event.preventDefault();
      return;
    }

    if (applyTagFilter(tagName)) {
      if (tag.closest('.origami-drawer')) setDrawer(false);
      event.preventDefault();
    }
  });

  if (clearButton) {
    clearButton.addEventListener('click', clearTagFilter);
  }

  var drawer = document.getElementById('origamiDrawer');
  var drawerTrigger = document.querySelector('[data-drawer-trigger]');
  var drawerClose = document.querySelector('[data-drawer-close]');

  function setDrawer(open) {
    if (!drawer || !drawerTrigger) return;
    drawer.classList.toggle('is-open', open);
    drawerTrigger.classList.toggle('is-hidden', open);
    document.body.classList.toggle('drawer-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    drawerTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (drawerTrigger) {
    drawerTrigger.addEventListener('click', function () { setDrawer(true); });
  }
  if (drawerClose) {
    drawerClose.addEventListener('click', function () { setDrawer(false); });
  }
  if (drawer) {
    drawer.addEventListener('click', function (event) {
      if (event.target === drawer) setDrawer(false);
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && collapseCurrentArticle(true)) return;
    if (event.key === 'Escape') setDrawer(false);
  });
})();
