(function () {
  'use strict';

  var cfg = window.WEDDING || {};
  var form = document.querySelector('[data-rsvp]');
  if (!form) return;

  var thanks = document.querySelector('[data-thanks]');
  var thanksTitle = document.querySelector('[data-thanks-title]');
  var thanksText = document.querySelector('[data-thanks-text]');
  var again = document.querySelector('[data-again]');
  var submit = form.querySelector('[data-submit]');
  var submitText = submit.querySelector('.button__text');
  var status = form.querySelector('[data-status]');
  var guestsField = form.querySelector('[data-guests]');
  var STORE_KEY = 'thiep-cuoi-rsvp';

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }

  /* Hide "số người" when the guest can't come */
  function syncAttending() {
    var yes = form.attending.value === 'yes';
    guestsField.hidden = !yes;
  }
  form.querySelectorAll('input[name="attending"]').forEach(function (r) { r.addEventListener('change', syncAttending); });
  syncAttending();

  /* Validation */
  function setError(name, msg) {
    var input = form.elements[name];
    var err = form.querySelector('[data-error-for="' + name + '"]');
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
  }
  function normalisePhone(v) { return v.replace(/[\s.\-()]/g, '').replace(/^\+84/, '0'); }

  function validate() {
    var ok = true;
    var name = form.elements.fullname.value.trim();
    var phone = normalisePhone(form.phone.value.trim());
    if (name.length < 2) { setError('fullname', 'Quý khách vui lòng nhập họ và tên.'); ok = false; } else setError('fullname', '');
    if (phone && !/^0\d{9}$/.test(phone)) { setError('phone', 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0).'); ok = false; } else setError('phone', '');
    return ok;
  }
  ['fullname', 'phone'].forEach(function (n) {
    form.elements[n].addEventListener('input', function () {
      if (form.elements[n].getAttribute('aria-invalid') === 'true') validate();
    });
  });

  function setLoading(on) {
    submit.disabled = on;
    if (on) {
      submitText.textContent = 'Đang gửi…';
      var sp = document.createElement('span');
      sp.className = 'button__spinner';
      sp.setAttribute('aria-hidden', 'true');
      submit.appendChild(sp);
    } else {
      submitText.textContent = 'Gửi xác nhận';
      var s = submit.querySelector('.button__spinner');
      if (s) s.remove();
    }
  }

  function setStatus(msg, isError) {
    status.textContent = msg || '';
    status.classList.toggle('is-error', !!isError);
  }

  function showThanks(data, animate) {
    var yes = data.attending === 'yes';
    thanksTitle.textContent = yes ? 'Cảm ơn ' + data.name + '!' : 'Cảm ơn ' + data.name + ' đã phản hồi';
    thanksText.textContent = yes
      ? 'Gia Đình đã ghi nhận ' + data.guests + ' người. Hẹn gặp Quý Khách lúc 17:00 ngày 24.11.2026 tại CTM Palace.'
      : 'Rất tiếc vì Quý Khách không thể đến. Gia Đình xin cảm ơn lời hồi âm và những lời chúc tốt đẹp.';
    form.hidden = true;
    thanks.hidden = false;
    if (animate && window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(thanks, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' });
      gsap.fromTo(thanks.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07, delay: 0.1 });
    }
    if (animate) thanks.focus({ preventScroll: true });
  }

  again.addEventListener('click', function () {
    thanks.hidden = true;
    form.hidden = false;
    setStatus('');
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    form.elements.fullname.focus();
  });

  // Returning guest: show their previous answer, prefilled if they want to change it
  var saved = store(STORE_KEY);
  if (saved && saved.name) {
    form.elements.fullname.value = saved.name;
    form.phone.value = saved.phone || '';
    form.querySelector('input[name="attending"][value="' + (saved.attending === 'no' ? 'no' : 'yes') + '"]').checked = true;
    if (saved.guests) form.guests.value = String(saved.guests);
    if (saved.side) form.side.value = saved.side;
    form.wish.value = saved.wish || '';
    syncAttending();
    showThanks(saved, false);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus('');
    if (!validate()) {
      var firstBad = form.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }

    var data = {
      name: form.elements.fullname.value.trim().slice(0, 80),
      phone: normalisePhone(form.phone.value.trim()),
      attending: form.attending.value,
      guests: form.attending.value === 'yes' ? parseInt(form.guests.value, 10) : 0,
      side: form.side.value,
      wish: form.wish.value.trim().slice(0, 500),
      website: form.website.value, // honeypot
      userAgent: navigator.userAgent.slice(0, 160),
    };

    if (!cfg.APPS_SCRIPT_URL) {
      setStatus('Thiệp chưa được kết nối Google Sheets (thiếu APPS_SCRIPT_URL trong js/config.js).', true);
      return;
    }

    setLoading(true);
    fetch(cfg.APPS_SCRIPT_URL, {
      method: 'POST',
      // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow',
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || 'unknown');
        delete data.website;
        delete data.userAgent;
        store(STORE_KEY, data);
        showThanks(data, true);
      })
      .catch(function () {
        setStatus('Gửi chưa thành công. Quý Khách vui lòng kiểm tra mạng và thử lại.', true);
      })
      .then(function () { setLoading(false); });
  });
})();
