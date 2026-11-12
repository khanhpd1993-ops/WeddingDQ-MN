// Màn bìa "Mở thiệp": cú bấm của khách vừa mở thiệp, vừa là thao tác cho phép phát nhạc.
// Link riêng cho từng khách: thêm ?to=Tên vào link, ví dụ …vercel.app/?to=Anh%20Tuấn
(function () {
  'use strict';

  var root = document.documentElement;
  var cover = document.querySelector('[data-cover]');
  var openBtn = document.querySelector('[data-cover-open]');

  function unlock() {
    root.classList.remove('cover-lock');
    if (window.__lenis) window.__lenis.start();
  }

  if (!cover || !openBtn) { unlock(); return; }

  // Guest name from ?to=
  var guest = '';
  try { guest = (new URLSearchParams(location.search).get('to') || '').trim().slice(0, 60); } catch (e) {}
  if (guest) {
    var line = cover.querySelector('[data-guest]');
    line.querySelector('[data-guest-name]').textContent = guest;
    line.hidden = false;
    var nameInput = document.getElementById('f-name');
    if (nameInput && !nameInput.value) nameInput.value = guest;
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { openBtn.focus({ preventScroll: true }); } catch (e) {}

  openBtn.addEventListener('click', function () {
    if (window.__inviteOpened) return;
    window.__inviteOpened = true;
    // Synchronous, still inside the click: music.js starts the song, main.js the hero intro
    document.dispatchEvent(new CustomEvent('invite:open'));

    window.scrollTo(0, 0);
    unlock();
    if (reduce) { cover.remove(); return; }
    cover.classList.add('is-opening');
    setTimeout(function () { cover.remove(); }, 1300);
  });
})();
