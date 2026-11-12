(function () {
  'use strict';

  var root = document.documentElement;
  var cfg = window.WEDDING || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  function ready() { root.classList.add('is-ready'); }
  // Safety net: never leave the hero hidden if something fails to load.
  setTimeout(ready, 2500);

  /* ---------- Map + directions from config ---------- */
  if (cfg.MAP_QUERY) {
    var q = encodeURIComponent(cfg.MAP_QUERY);
    var map = document.querySelector('[data-map]');
    var dir = document.querySelector('[data-directions]');
    if (map) map.src = 'https://www.google.com/maps?q=' + q + '&output=embed&hl=vi&z=16';
    if (dir) dir.href = 'https://www.google.com/maps/dir/?api=1&destination=' + q;
  }

  /* ---------- Countdown with rolling digits ---------- */
  var target = new Date(cfg.WEDDING_TIME || '2026-11-24T17:00:00+07:00').getTime();
  var nums = {};
  document.querySelectorAll('[data-unit]').forEach(function (el) {
    el.textContent = '';
    var span = document.createElement('span');
    span.textContent = '00';
    el.appendChild(span);
    nums[el.dataset.unit] = el;
  });

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function setNum(el, value, animate) {
    var current = el.lastElementChild;
    if (current && current.textContent === value) return;
    if (!animate || reduceMotion || !hasGsap || !current) {
      el.textContent = '';
      var s = document.createElement('span');
      s.textContent = value;
      el.appendChild(s);
      return;
    }
    var next = document.createElement('span');
    next.textContent = value;
    next.style.position = 'absolute';
    next.style.left = '0';
    next.style.right = '0';
    next.style.top = '0';
    el.appendChild(next);
    gsap.fromTo(current, { yPercent: 0 }, { yPercent: -100, duration: 0.45, ease: 'power3.in', onComplete: function () { current.remove(); next.style.position = ''; } });
    gsap.fromTo(next, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', delay: 0.08 });
  }

  var countdownVisible = false;
  function tick(animate) {
    var diff = Math.max(0, target - Date.now());
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (nums.d) setNum(nums.d, pad(d), animate && countdownVisible);
    if (nums.h) setNum(nums.h, pad(h), animate && countdownVisible);
    if (nums.m) setNum(nums.m, pad(m), animate && countdownVisible);
    if (nums.s) setNum(nums.s, pad(sec), animate && countdownVisible);
    return diff;
  }
  tick(false);
  var timer = setInterval(function () { if (tick(true) <= 0) clearInterval(timer); }, 1000);

  var grid = document.querySelector('[data-countdown]');
  if (grid && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      countdownVisible = entries[0].isIntersecting;
    }).observe(grid);
  }

  /* ---------- Lightbox ---------- */
  var tiles = Array.prototype.slice.call(document.querySelectorAll('[data-gallery] .tile'));
  var srcs = tiles.map(function (t) { var i = t.querySelector('img'); return { src: i.getAttribute('src'), alt: i.alt }; });
  var lb = document.querySelector('[data-lightbox]');
  var lbImg = document.querySelector('[data-lightbox-img]');
  var lbCount = document.querySelector('[data-count]');
  var idx = 0;
  var lastFocus = null;

  function show(i) {
    idx = (i + srcs.length) % srcs.length;
    lbImg.classList.remove('is-entering');
    void lbImg.offsetWidth;
    lbImg.src = srcs[idx].src;
    lbImg.alt = srcs[idx].alt;
    lbImg.classList.add('is-entering');
    lbCount.textContent = (idx + 1) + ' / ' + srcs.length;
  }
  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
  }
  function close() {
    if (lb.open && typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
  }
  if (lb) {
    tiles.forEach(function (t, i) { t.addEventListener('click', function () { open(i); }); });
    lb.addEventListener('close', function () {
      document.body.style.overflow = '';
      if (window.__lenis) window.__lenis.start();
      if (lastFocus) lastFocus.focus();
    });
    lb.querySelector('[data-close]').addEventListener('click', close);
    lb.querySelector('[data-prev]').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('[data-next]').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    // Click on the dark area closes
    lb.querySelector('[data-stage]').addEventListener('click', function (e) { if (e.target === e.currentTarget) close(); });
    // Swipe
    var startX = null, startY = null;
    lb.addEventListener('pointerdown', function (e) { startX = e.clientX; startY = e.clientY; });
    lb.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Motion ---------- */
  if (!hasGsap || reduceMotion) { ready(); return; }

  gsap.registerPlugin(ScrollTrigger);
  var EXPO = 'expo.out';

  // Smooth scroll (desktop pointer only; touch keeps native scrolling)
  if (window.Lenis) {
    var lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // 1. Load sequence (signature: the photo opens like a shutter, the names rise out of their lines)
  var heroEls = gsap.utils.toArray('.hero [data-hero]');
  gsap.set(heroEls, { opacity: 0, y: 18 });
  gsap.set('[data-hero-line]', { opacity: 1, yPercent: 110 });
  gsap.set('[data-hero-photo]', { clipPath: 'inset(50% 0% 50% 0%)' });
  gsap.set('[data-hero-divider]', { scaleY: 0 });
  gsap.set('[data-hero-photo] img', { scale: 1.18 });
  ready();

  var intro = gsap.timeline({ defaults: { ease: EXPO } });
  intro
    .to('.hero__title', { opacity: 1, y: 0, duration: 0.9 }, 0)
    .to('[data-hero-photo]', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0.1)
    .to('[data-hero-photo] img', { scale: 1.06, duration: 1.8 }, 0.1)
    .to('[data-hero-line]', { yPercent: 0, duration: 1.0, stagger: 0.09 }, 0.75)
    .to('.hero__tagline', { opacity: 1, y: 0, duration: 0.8 }, 0.95)
    .to('[data-hero-divider]', { scaleY: 1, duration: 0.8, stagger: 0.06 }, 1.05)
    .to('.hero__date [data-hero]', { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 }, 1.05);

  // Slow drift on the couple photo while the hero scrolls away (one moving picture)
  gsap.to('[data-hero-photo] img', {
    scale: 1.0, yPercent: 4, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // 2. Banner parallax
  gsap.fromTo('[data-parallax]', { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '.banner', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  // 3. Generic staggered reveals per section: heading, then text, then the rest
  function revealGroup(container, selector, opts) {
    var els = container.querySelectorAll(selector);
    if (!els.length) return;
    gsap.from(els, Object.assign({
      opacity: 0, y: 24, duration: 0.9, ease: EXPO, stagger: 0.08,
      scrollTrigger: { trigger: els[0], start: 'top 88%', once: true }
    }, opts || {}));
  }

  // Families: label, names, address arrive in reading order
  document.querySelectorAll('.family').forEach(function (f) {
    revealGroup(f, '.family__label, .family__parents, .family__address');
  });

  // Schedule: the sketch is "drawn" from top to bottom, then title and lead
  gsap.fromTo('[data-sketch]', { clipPath: 'inset(0% 0% 100% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.inOut',
    scrollTrigger: { trigger: '[data-sketch]', start: 'top 85%', once: true }
  });
  revealGroup(document.querySelector('.schedule__head'), '[data-reveal]', { delay: 0.35 });

  // Event cards slide in from the side they lean to; the timeline line grows and the dots light up
  document.querySelectorAll('[data-event]').forEach(function (card) {
    var fromRight = card.classList.contains('event--right');
    var tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 85%', once: true }, defaults: { ease: EXPO } });
    tl.from(card, { opacity: 0, x: fromRight ? 40 : -40, duration: 1.0 })
      .from(card.querySelectorAll('.event__time, .event__name'), { opacity: 0, y: 16, duration: 0.8, stagger: 0.08 }, 0.2)
      .from(card.querySelectorAll('.timeline li'), { opacity: 0, y: 12, duration: 0.7, stagger: 0.1 }, 0.4);
  });
  // Scroll-linked: line fills as you read
  document.querySelectorAll('[data-timeline]').forEach(function (list) {
    var line = createLine(list);
    gsap.fromTo(line, { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 80%', end: 'bottom 55%', scrub: true }
    });
  });
  // The ::before line can't be tweened directly; give each list a real element for it.
  function createLine(list) {
    var el = document.createElement('span');
    el.className = 'timeline__line';
    el.setAttribute('aria-hidden', 'true');
    list.appendChild(el);
    list.classList.add('has-line');
    return el;
  }

  // Countdown: monogram + text, then the four cells
  revealGroup(document.querySelector('.countdown'), '[data-reveal]');
  gsap.from('.countdown__cell', {
    opacity: 0, y: 28, duration: 0.9, ease: EXPO, stagger: 0.08,
    scrollTrigger: { trigger: '.countdown__grid', start: 'top 90%', once: true }
  });
  gsap.from('.countdown__cell', {
    borderTopColor: 'rgba(131,136,103,0)', duration: 1.2, ease: 'power2.out', stagger: 0.08,
    scrollTrigger: { trigger: '.countdown__grid', start: 'top 90%', once: true }
  });

  // Album: tiles open from a mask, one after another, pictures settle from a slight zoom
  revealGroup(document.querySelector('.album__head'), '[data-reveal]');
  var tilesEls = gsap.utils.toArray('.tile');
  gsap.fromTo(tilesEls, { clipPath: 'inset(0% 0% 100% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut', stagger: 0.09,
    scrollTrigger: { trigger: '.gallery', start: 'top 82%', once: true },
    onComplete: function () { tilesEls.forEach(function (t) { t.style.clipPath = ''; }); }
  });

  // Venue: title, then the card rises
  revealGroup(document.querySelector('.venue'), '[data-reveal]');
  gsap.from('[data-reveal-card]', {
    opacity: 0, y: 32, duration: 1.0, ease: EXPO,
    scrollTrigger: { trigger: '[data-reveal-card]', start: 'top 88%', once: true }
  });
  gsap.from('.venue__card > *', {
    opacity: 0, y: 16, duration: 0.8, ease: EXPO, stagger: 0.08, delay: 0.15,
    scrollTrigger: { trigger: '[data-reveal-card]', start: 'top 88%', once: true }
  });

  // RSVP: heading and lead, then fields row by row
  revealGroup(document.querySelector('.rsvp__head'), '[data-reveal]');
  gsap.from('.form [data-field]', {
    opacity: 0, y: 20, duration: 0.8, ease: EXPO, stagger: 0.06,
    scrollTrigger: { trigger: '.form', start: 'top 88%', once: true }
  });

  // Footer: monogram settles, closing line follows
  gsap.from('.footer__mono', {
    opacity: 0, scale: 0.92, duration: 1.2, ease: EXPO,
    scrollTrigger: { trigger: '.footer', start: 'top 90%', once: true }
  });
  gsap.from('.footer__text', {
    opacity: 0, y: 16, duration: 0.9, ease: EXPO, delay: 0.2,
    scrollTrigger: { trigger: '.footer', start: 'top 90%', once: true }
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
