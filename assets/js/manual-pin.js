/**
 * OrcaCloud Platform Manual – PIN Protection
 *
 * PIN is configured via <meta name="manual-pin" content="XXXX"> in each page.
 * To change the PIN: update MANUAL_DOWNLOAD_PIN in .env, then update each
 * page's <meta name="manual-pin"> to match.
 */
(function () {
  'use strict';

  var PIN      = (document.querySelector('meta[name="manual-pin"]') || {}).content || '8414';
  var PDF_PATH = 'assets/OrcaCloud_Manual.pdf';
  var FILENAME = 'OrcaCloud_Manual.pdf';

  /* ── Styles ─────────────────────────────────────────── */
  function injectStyles() {
    var css = [
      '#mpOverlay{display:none;position:fixed;inset:0;background:rgba(2,15,28,.88);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'z-index:99999;align-items:center;justify-content:center;}',
      '#mpOverlay.mp-open{display:flex;}',

      '#mpBox{background:#05243b;border:1px solid #1a4a6b;border-radius:1rem;',
      'padding:2.5rem 2rem 2rem;width:92%;max-width:360px;text-align:center;',
      'position:relative;box-shadow:0 24px 64px rgba(0,0,0,.7);}',

      '#mpClose{position:absolute;top:.6rem;right:.9rem;background:none;border:none;',
      'color:#4a7992;font-size:1.5rem;line-height:1;cursor:pointer;padding:.2rem;}',
      '#mpClose:hover{color:#cfeafe;}',

      '#mpLock{font-size:2.6rem;margin-bottom:.6rem;user-select:none;}',

      '#mpTitle{color:#cfeafe;font-size:1.05rem;font-weight:700;margin:0 0 .25rem;}',
      '#mpSub{color:#4a7992;font-size:.78rem;margin:0 0 1.6rem;}',

      '#mpInputs{display:flex;justify-content:center;gap:.55rem;margin-bottom:1rem;}',

      '.mp-d{width:54px;height:58px;border:1.5px solid #2b6f8f;border-radius:.5rem;',
      'background:#031a2b;color:#14b8a6;font-size:1.65rem;font-weight:700;',
      'text-align:center;outline:none;caret-color:transparent;',
      'transition:border-color .18s,box-shadow .18s;}',
      '.mp-d:focus{border-color:#14b8a6;box-shadow:0 0 0 3px rgba(20,184,166,.2);}',

      '#mpErr{color:#f87171;font-size:.78rem;min-height:1.1rem;margin-bottom:.8rem;',
      'opacity:0;transition:opacity .2s;}',
      '#mpErr.mp-show{opacity:1;}',

      '#mpBtn{width:100%;padding:.72rem;background:#14b8a6;color:#05243b;border:none;',
      'border-radius:.5rem;font-size:.95rem;font-weight:700;cursor:pointer;',
      'transition:background .18s,transform .1s;display:flex;align-items:center;',
      'justify-content:center;gap:.45rem;}',
      '#mpBtn:hover{background:#0d9488;}',
      '#mpBtn:active{transform:scale(.97);}',
      '#mpBtn svg{flex-shrink:0;}',

      '@keyframes mp-shake{',
      '0%,100%{transform:translateX(0)}',
      '20%{transform:translateX(-7px)}',
      '40%{transform:translateX(7px)}',
      '60%{transform:translateX(-4px)}',
      '80%{transform:translateX(4px)}}',
      '.mp-shake{animation:mp-shake .4s ease;}'
    ].join('');

    var s = document.createElement('style');
    s.id  = 'mp-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ── Build modal DOM ─────────────────────────────────── */
  function buildModal() {
    var overlay = document.createElement('div');
    overlay.id  = 'mpOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'mpTitle');
    overlay.innerHTML =
      '<div id="mpBox">' +
        '<button id="mpClose" aria-label="Close">&times;</button>' +
        '<div id="mpLock">&#128274;</div>' +
        '<p id="mpTitle">Enter PIN to Download</p>' +
        '<p id="mpSub">The Platform Manual is PIN&#8209;protected</p>' +
        '<div id="mpInputs">' +
          '<input class="mp-d" maxlength="1" type="password" inputmode="numeric" pattern="[0-9]" autocomplete="off" aria-label="PIN digit 1">' +
          '<input class="mp-d" maxlength="1" type="password" inputmode="numeric" pattern="[0-9]" autocomplete="off" aria-label="PIN digit 2">' +
          '<input class="mp-d" maxlength="1" type="password" inputmode="numeric" pattern="[0-9]" autocomplete="off" aria-label="PIN digit 3">' +
          '<input class="mp-d" maxlength="1" type="password" inputmode="numeric" pattern="[0-9]" autocomplete="off" aria-label="PIN digit 4">' +
        '</div>' +
        '<div id="mpErr">Incorrect PIN. Please try again.</div>' +
        '<button id="mpBtn">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
          'Unlock &amp; Download' +
        '</button>' +
      '</div>';

    document.body.appendChild(overlay);
    wireEvents(overlay);
    return overlay;
  }

  /* ── Wire events ─────────────────────────────────────── */
  function wireEvents(overlay) {
    var box    = overlay.querySelector('#mpBox');
    var digits = overlay.querySelectorAll('.mp-d');
    var err    = overlay.querySelector('#mpErr');
    var btn    = overlay.querySelector('#mpBtn');
    var close  = overlay.querySelector('#mpClose');

    /* digit auto-advance */
    digits.forEach(function (d, i) {
      d.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').slice(-1);
        if (this.value && i < digits.length - 1) digits[i + 1].focus();
      });
      d.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !this.value && i > 0) {
          digits[i - 1].focus();
        }
        if (e.key === 'Enter') attempt();
      });
      /* paste: fill all digits at once */
      d.addEventListener('paste', function (e) {
        e.preventDefault();
        var val = (e.clipboardData || window.clipboardData)
                    .getData('text').replace(/[^0-9]/g, '');
        digits.forEach(function (dd, j) { dd.value = val[j] || ''; });
        digits[Math.min(val.length, digits.length - 1)].focus();
      });
    });

    function attempt() {
      var entered = Array.from(digits).map(function (d) { return d.value; }).join('');
      if (entered === String(PIN)) {
        closeModal();
        triggerDownload();
      } else {
        err.classList.add('mp-show');
        box.classList.add('mp-shake');
        digits.forEach(function (d) { d.value = ''; });
        digits[0].focus();
        box.addEventListener('animationend', function h() {
          box.classList.remove('mp-shake');
          box.removeEventListener('animationend', h);
        });
      }
    }

    btn.addEventListener('click', attempt);
    close.addEventListener('click', closeModal);

    /* click outside box to close */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    /* Escape key */
    document.addEventListener('keydown', function kh(e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  /* ── Open / close ────────────────────────────────────── */
  function openModal() {
    var overlay = document.getElementById('mpOverlay') || buildModal();
    var digits  = overlay.querySelectorAll('.mp-d');
    var err     = overlay.querySelector('#mpErr');
    digits.forEach(function (d) { d.value = ''; });
    err.classList.remove('mp-show');
    overlay.classList.add('mp-open');
    /* prevent background scroll */
    document.body.style.overflow = 'hidden';
    setTimeout(function () { digits[0].focus(); }, 60);
  }

  function closeModal() {
    var overlay = document.getElementById('mpOverlay');
    if (overlay) overlay.classList.remove('mp-open');
    document.body.style.overflow = '';
  }

  /* ── Trigger download ────────────────────────────────── */
  function triggerDownload() {
    var a      = document.createElement('a');
    a.href     = PDF_PATH;
    a.download = FILENAME;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); }, 100);
  }

  /* ── Public API ──────────────────────────────────────── */
  window.showManualPinModal = function (e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    openModal();
  };

  /* inject styles as soon as this script runs */
  injectStyles();

}());
