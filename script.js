const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/3JNUR3Q9JD';

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Меню
  const burger = $('#burger');
  const menu = $('#menu');
  burger?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.textContent = open ? 'Закрыть' : 'Меню';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.textContent = 'Меню';
  }));

  // Плавный якорь
  const goTo = id => {
    const target = $(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 68;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length <= 1 || !$(href)) return;
      e.preventDefault();
      goTo(href);
    });
  });

  // Маска телефона
  $$('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (!v) { e.target.value = ''; return; }
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      e.target.value = out;
    });
  });

  // ===== Первый экран: медленная смена кадров =====
  const frames = $$('#room img');
  if (frames.length > 1 && !reduce) {
    let cur = 0;
    let timer = null;
    const next = () => {
      frames[cur].classList.remove('is-on');
      cur = (cur + 1) % frames.length;
      frames[cur].classList.add('is-on');
    };
    const run = () => { if (!timer) timer = setInterval(next, 6500); };
    const stop = () => { clearInterval(timer); timer = null; };
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
    run();
  }

  // ===== Квитанция =====
  const PRICES = {
    sup: { 0: 3500, 1: 3500, 2: 4800, 3: 6000 },
    gen: { 0: 5500, 1: 5500, 2: 7800, 3: 10000 },
    rep: { 0: 7500, 1: 7500, 2: 10500, 3: 13500 },
  };
  const KIND = { sup: 'Поддерживающая уборка', gen: 'Генеральная уборка', rep: 'Уборка после ремонта' };
  const ROOMS = { 0: 'студия', 1: '1 комната', 2: '2 комнаты', 3: '3 комнаты' };
  const fmt = n => n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';

  const rowsEl = $('#rows');
  const totalEl = $('#total');
  const orderSum = $('#order-sum');
  const winBox = $('#x-win');
  const extras = $$('#extras input');
  const commentEl = $('#f-comment');
  let autoComment = '';
  let summary = '';

  const row = (what, val) => {
    const r = document.createElement('div');
    r.className = 'row';
    const a = document.createElement('span'); a.className = 'row__what'; a.textContent = what;
    const d = document.createElement('span'); d.className = 'row__dots';
    const v = document.createElement('span'); v.className = 'row__val'; v.textContent = val;
    r.append(a, d, v);
    return r;
  };

  const render = () => {
    const kind = $('input[name="kind"]:checked').value;
    const rooms = $('input[name="rooms"]:checked').value;
    // после ремонта окна входят в уборку
    if (kind === 'rep') { winBox.checked = true; winBox.disabled = true; } else { winBox.disabled = false; }

    const base = PRICES[kind][rooms];
    let total = base;
    const lines = [row(KIND[kind] + ', ' + ROOMS[rooms], fmt(base))];
    const names = [];
    extras.forEach(x => {
      if (!x.checked) return;
      if (x === winBox && kind === 'rep') {
        lines.push(row(x.dataset.name, 'входит'));
        return;
      }
      const p = Number(x.dataset.price);
      total += p;
      lines.push(row(x.dataset.name, '+' + fmt(p)));
      names.push(x.dataset.name.toLowerCase());
    });
    rowsEl.replaceChildren(...lines);
    totalEl.textContent = fmt(total);
    orderSum.textContent = fmt(total);
    summary = KIND[kind] + ', ' + ROOMS[rooms] + (names.length ? ', ' + names.join(', ') : '') + '. Ориентир по калькулятору: ' + fmt(total).replace(/ /g, ' ');
  };
  $$('input[name="kind"], input[name="rooms"], #extras input').forEach(i => i.addEventListener('change', render));
  render();

  const prefill = () => {
    if (!commentEl) return;
    if (commentEl.value.trim() === '' || commentEl.value === autoComment) {
      commentEl.value = summary;
      autoComment = summary;
    }
  };
  $('#order')?.addEventListener('click', prefill);

  // ===== Форма → Cloudflare Worker → Telegram =====
  const form = $('#leadForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    const payload = {};
    new FormData(form).forEach((v, k) => { payload[k] = v; });
    if (payload._gotcha) return;
    if (!payload.name || !payload.phone || payload.phone.replace(/\D/g, '').length < 11) {
      btn.textContent = 'Заполните имя и телефон';
      setTimeout(() => { btn.textContent = orig; }, 2200);
      return;
    }
    payload.source = 'uborka-msk';
    btn.disabled = true;
    btn.textContent = 'Отправляем…';
    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      btn.textContent = 'Заявка отправлена';
      form.reset();
      autoComment = '';
    } catch (err) {
      console.error(err);
      btn.textContent = 'Не отправилось, попробуйте ещё раз';
    } finally {
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3200);
    }
  });

  // ===== Появление частей разделов по очереди =====
  const items = $$('.rise');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => el.classList.add('is-in'));
  }
})();
