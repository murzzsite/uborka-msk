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
    sup: { 1: 3000, 2: 4000, 3: 5000, 4: 6500 },
    gen: { 1: 6000, 2: 7500, 3: 9500, 4: 12000 },
  };
  const REP_RATE = 150;
  const KIND = { sup: 'Поддерживающая уборка', gen: 'Генеральная уборка', rep: 'Уборка после ремонта' };
  const ROOMS = { 1: 'студия или 1 комната, до 40 м²', 2: '2 комнаты, до 60 м²', 3: '3 комнаты, до 80 м²', 4: '4 комнаты, до 100 м²' };
  const fmt = n => n.toLocaleString('ru-RU').replace(/s/g, ' ') + ' ₽';

  const rowsEl = $('#rows');
  const totalEl = $('#total');
  const orderSum = $('#order-sum');
  const roomsBox = $('#rooms-box');
  const areaBox = $('#area-box');
  const areaEl = $('#area');
  const extras = $$('#extras-opts input[type="checkbox"]');
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

  const getArea = () => {
    const n = Math.round(Number(areaEl.value));
    return Number.isFinite(n) && n > 0 ? Math.min(500, n) : 40;
  };

  const render = () => {
    const kind = $('input[name="kind"]:checked').value;
    const rooms = $('input[name="rooms"]:checked').value;
    const isRep = kind === 'rep';
    roomsBox.hidden = isRep;
    areaBox.hidden = !isRep;

    let base, label;
    if (isRep) {
      const area = getArea();
      base = area * REP_RATE;
      label = KIND.rep + ', ' + area + ' м² × ' + REP_RATE + ' ₽';
    } else {
      base = PRICES[kind][rooms];
      label = KIND[kind] + ', ' + ROOMS[rooms];
    }
    let total = base;
    const lines = [row(label, 'от ' + fmt(base))];
    const names = [];
    extras.forEach(x => {
      const qtyEl = x.closest('.opt').querySelector('.qty');
      if (qtyEl) qtyEl.disabled = !x.checked;
      if (!x.checked) return;
      let n = 1;
      if (qtyEl) n = Math.max(1, Math.min(Number(qtyEl.max) || 99, Math.round(Number(qtyEl.value)) || 1));
      const p = Number(x.dataset.price) * n;
      total += p;
      const nm = x.dataset.name + (x.dataset.unit ? ', ' + n + (x.dataset.unit === 'час' ? ' ч' : ' ств.') : '');
      lines.push(row(nm, 'от ' + fmt(p)));
      names.push(nm.toLowerCase());
    });
    rowsEl.replaceChildren(...lines);
    totalEl.textContent = 'от ' + fmt(total);
    orderSum.textContent = fmt(total);
    summary = label + (names.length ? ', ' + names.join(', ') : '') + '. Стартовая цена по калькулятору: от ' + fmt(total).replace(/ /g, ' ');
  };
  $$('input[name="kind"], input[name="rooms"], #extras-opts input, #area').forEach(i => {
    i.addEventListener('change', render);
    i.addEventListener('input', render);
  });
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

})();
