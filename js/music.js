// Nhạc nền: phát từ file mp3 (MUSIC_FILE) nếu có, không thì từ YouTube (MUSIC_YOUTUBE_ID).
// Trình duyệt không cho tự phát nhạc có tiếng khi chưa có thao tác, nên nhạc bắt đầu khi khách
// bấm "Mở thiệp" trên màn bìa (hoặc lần chạm đầu tiên nếu không có bìa). Nhạc lặp lại khi hết bài.
(function () {
  'use strict';

  var cfg = window.WEDDING || {};
  var btn = document.querySelector('[data-music]');
  var hint = document.querySelector('[data-music-hint]');
  if (!btn || (!cfg.MUSIC_FILE && !cfg.MUSIC_YOUTUBE_ID)) return;

  // Nhạc luôn bật khi vào thiệp (xoá lựa chọn "tắt" cũ còn lưu từ bản trước)
  try { localStorage.removeItem('thiep-cuoi-music-off'); } catch (e) {}

  var playing = false;
  var wantPlay = true; // nút hiện trạng thái bật ngay từ đầu
  var ready = false;
  var player = null; // { play(), pause() }

  function render() {
    var on = playing || wantPlay;
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Tắt nhạc' : 'Bật nhạc');
  }

  function hideHint() { if (hint) hint.classList.add('is-hidden'); }

  function play() {
    wantPlay = true;
    render();
    if (ready && player) player.play();
  }
  function pause() {
    wantPlay = false;
    render();
    if (ready && player) player.pause();
  }

  btn.hidden = false;
  render();

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    hideHint();
    if (playing || wantPlay) pause();
    else play();
  });

  // "Mở thiệp" on the cover is the guest's first tap: start the music right there.
  document.addEventListener('invite:open', function () {
    hideHint();
    if (wantPlay) play();
  });

  // Fallback (no cover, or the browser refused): any later tap/click/key starts it.
  // Only these events count as a user gesture for audio on phones (not touchstart/pointerdown).
  var GESTURES = ['click', 'touchend', 'keydown'];
  function onGesture(e) {
    if (playing) return stopListening();
    if (e && e.target && e.target.closest && e.target.closest('[data-music]')) return;
    hideHint();
    if (wantPlay) play();
  }
  function stopListening() { GESTURES.forEach(function (t) { window.removeEventListener(t, onGesture, true); }); }
  GESTURES.forEach(function (t) { window.addEventListener(t, onGesture, true); });

  // Pause while the tab is in the background, resume when the guest comes back
  var resumeOnShow = false;
  document.addEventListener('visibilitychange', function () {
    if (!ready || !player) return;
    if (document.hidden) { resumeOnShow = wantPlay && playing; if (resumeOnShow) player.pause(); }
    else if (resumeOnShow) { player.play(); }
  });

  function fail(reason) {
    console.warn('[nhạc nền] không phát được:', reason);
    btn.hidden = true;
    if (hint) hint.hidden = true;
  }

  /* ---------- Option 1: an mp3 file in assets/ ---------- */
  if (cfg.MUSIC_FILE) {
    var audio = new Audio(cfg.MUSIC_FILE);
    audio.loop = true;
    audio.preload = 'none'; // only download the song once the guest interacts
    if (cfg.MUSIC_START) {
      audio.addEventListener('loadedmetadata', function () { audio.currentTime = cfg.MUSIC_START; }, { once: true });
    }
    // loop = true: hết bài tự phát lại từ đầu
    audio.addEventListener('playing', function () { playing = true; render(); stopListening(); });
    audio.addEventListener('play', function () { playing = true; render(); });
    audio.addEventListener('pause', function () { playing = false; render(); });
    audio.addEventListener('error', function () { fail('file ' + cfg.MUSIC_FILE); });
    player = {
      play: function () { var p = audio.play(); if (p && p.catch) p.catch(function () { playing = false; render(); }); },
      pause: function () { audio.pause(); },
    };
    ready = true;
    return;
  }

  /* ---------- Option 2: YouTube IFrame API ---------- */
  var holder = document.createElement('div');
  holder.className = 'music__yt';
  holder.setAttribute('aria-hidden', 'true');
  var target = document.createElement('div');
  target.id = 'music-yt';
  holder.appendChild(target);
  document.body.appendChild(holder);

  var prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    if (typeof prev === 'function') prev();
    var yt = new YT.Player('music-yt', {
      width: 200,
      height: 200,
      videoId: cfg.MUSIC_YOUTUBE_ID,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1,
        loop: 1, playlist: cfg.MUSIC_YOUTUBE_ID, start: cfg.MUSIC_START || 0,
      },
      events: {
        onReady: function () {
          yt.setVolume(70);
          player = {
            play: function () { yt.playVideo(); },
            pause: function () { yt.pauseVideo(); },
          };
          ready = true;
          if (wantPlay) yt.playVideo();
        },
        onStateChange: function (e) {
          playing = e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING;
          if (playing) stopListening();
          render();
        },
        onError: function (e) {
          // 100: video bị xoá/riêng tư · 101/150: chủ video không cho nhúng
          fail('YouTube error ' + e.data);
        },
      },
    });
  };

  var s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.async = true;
  s.onerror = function () { fail('không tải được YouTube'); };
  document.head.appendChild(s);
})();
