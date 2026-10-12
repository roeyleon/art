(() => {
  // ---- mobile menu
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    });
  }

  // ---- homepage video: pause button, and no autoplay for people who prefer reduced motion
  const reel = document.querySelector('.reel');
  const tog = document.querySelector('.reel-toggle');
  if (reel && tog) {
    const set = (paused) => {
      tog.classList.toggle('is-paused', paused);
      tog.setAttribute('aria-label', paused ? tog.dataset.play : tog.dataset.pause);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { reel.removeAttribute('autoplay'); reel.pause(); set(true); }
    tog.addEventListener('click', () => {
      if (reel.paused) { reel.play().catch(() => {}); set(false); } else { reel.pause(); set(true); }
    });
  }

  // ---- item gallery + lightbox
  const g = document.querySelector('[data-gallery]');
  if (g) {
    const media = JSON.parse(g.dataset.gallery);
    const img = g.querySelector('.stage-img');
    const open = g.querySelector('.stage-open');
    const vid = g.querySelector('.stage-video');
    const rtag = g.querySelector('.stage > .render-tag');
    const thumbs = [...g.querySelectorAll('.thumb')];
    const photos = media.map((m, i) => ({ ...m, i })).filter(m => m.kind === 'img');
    let cur = 0;

    const show = (i) => {
      cur = i;
      const m = media[i];
      thumbs.forEach((t, j) => {
        t.classList.toggle('is-on', j === i);
        if (j === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      });
      if (rtag) rtag.hidden = !m.render;
      if (m.kind === 'video') {
        open.hidden = true;
        vid.hidden = false;
        if (vid.getAttribute('src') !== m.src) { vid.src = m.src; vid.poster = m.thumb; }
        vid.play().catch(() => {});
      } else {
        vid.pause();
        vid.hidden = true;
        open.hidden = false;
        img.src = m.src; img.width = m.w; img.height = m.h; img.alt = m.alt;
        open.setAttribute('aria-label', m.alt);
      }
    };
    thumbs.forEach(t => t.addEventListener('click', () => show(+t.dataset.i)));

    // lightbox (photos only)
    const lb = document.createElement('dialog');
    lb.className = 'lightbox';
    lb.innerHTML = `<img alt=""><p class="lb-caption"></p>
      <button class="lb-btn lb-close" type="button" aria-label="${g.dataset.close}">×</button>
      ${photos.length > 1 ? `<button class="lb-btn lb-prev" type="button" aria-label="${g.dataset.prev}">‹</button>
      <button class="lb-btn lb-next" type="button" aria-label="${g.dataset.next}">›</button>` : ''}`;
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img');
    const lbCap = lb.querySelector('.lb-caption');
    let p = 0;
    const lbShow = (k) => { p = (k + photos.length) % photos.length; lbImg.src = photos[p].src; lbImg.alt = photos[p].alt; lbCap.textContent = photos[p].render ? g.dataset.render : ''; };
    const rtl = document.documentElement.dir === 'rtl';
    open.addEventListener('click', () => {
      lbShow(Math.max(0, photos.findIndex(ph => ph.i === cur)));
      lb.showModal();
    });
    lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
    lb.querySelector('.lb-prev')?.addEventListener('click', () => lbShow(p - 1));
    lb.querySelector('.lb-next')?.addEventListener('click', () => lbShow(p + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') lbShow(rtl ? p - 1 : p + 1);
      if (e.key === 'ArrowLeft') lbShow(rtl ? p + 1 : p - 1);
    });
  }

  // ---- contact form: Web3Forms when a key is set, otherwise WhatsApp
  const form = document.querySelector('[data-form]');
  if (form) {
    const params = new URLSearchParams(location.search);
    const item = params.get('item');
    if (item) {
      form.item.value = item;
      form.querySelector('.field-item').hidden = false;
      form.topic.selectedIndex = 0;
    }
    const status = form.querySelector('.form-status');
    const say = (msg, cls) => { status.textContent = msg; status.className = 'form-status ' + (cls || ''); };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (d.botcheck) return;
      if (!d.name.trim() || (!d.phone.trim() && !d.email.trim())) { say(form.dataset.msgNeed, 'is-err'); return; }
      const lines = [d.topic, d.item && `${form.querySelector('label[for=f-item]').textContent}: ${d.item}`, d.message,
        '', d.name, d.phone, d.email].filter(x => x !== undefined && x !== null);
      const key = form.dataset.key;
      if (!key) {
        window.open(`https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(lines.join('\n').trim())}`, '_blank', 'noopener');
        return;
      }
      const b = form.querySelector('button[type=submit]');
      b.disabled = true; say(form.dataset.msgSending);
      try {
        const r = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: key, subject: `${form.dataset.subject}: ${d.topic}`, from_name: d.name,
            name: d.name, phone: d.phone, email: d.email || undefined, topic: d.topic, item: d.item,
            message: d.message, page: location.href,
          }),
        });
        const j = await r.json();
        if (!j.success) throw new Error(j.message);
        form.reset(); say(form.dataset.msgOk, 'is-ok');
      } catch (err) {
        say(form.dataset.msgErr, 'is-err');
      } finally { b.disabled = false; }
    });
  }
})();
