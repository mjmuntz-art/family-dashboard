// =====================================================================
//  Seasonal looks: one per month, one per holiday, and birthdays.
//  Each sets the fonts, colors and card corners; scenes.js paints the
//  background with the same id.
// =====================================================================
(function () {
  function look(o) { return Object.assign({ headW: 700, headLs: '0', titleSize: 34, h2: 34, r: 22, r2: 14 }, o); }
  function solid(rgba) { return rgba.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),[^)]*\)/, 'rgb($1,$2,$3)'); }
  function panel(rgb, a) { return 'rgba(' + rgb + ',' + (a || 0.62) + ')'; }
  function L(o) { o.solid = o.solid || solid(o.panel); o.tile = o.tile || 'rgba(255,255,255,0.09)'; return look(o); }

  var MONTHS = {
    1: L({ id: 'january', title: 'Hello, January', fonts: ['Playfair Display:wght@700', 'Source Sans 3:wght@400;600;700'], head: "'Playfair Display', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif",
      panel: panel('24,30,58'), edge: 'rgba(255,220,200,0.28)', accent: '#ffcfb0', ink: '#2a1408', muted: '#e2e6f2', r: 24, r2: 14 }),
    2: L({ id: 'february', title: 'Hello, February', fonts: ['Cormorant Garamond:wght@700', 'Karla:wght@400;600;700'], head: "'Cormorant Garamond', Georgia, serif", body: "'Karla', system-ui, sans-serif", titleSize: 38, h2: 38,
      panel: panel('24,22,56'), edge: 'rgba(230,210,255,0.30)', accent: '#f2b8cf', ink: '#2a0a1c', muted: '#e4e2f2', r: 20, r2: 12 }),
    3: L({ id: 'march', title: 'Hello, March', fonts: ['Bitter:wght@700', 'Work Sans:wght@400;600;700'], head: "'Bitter', Georgia, serif", body: "'Work Sans', system-ui, sans-serif",
      panel: panel('28,38,38', 0.66), edge: 'rgba(200,240,210,0.26)', accent: '#a8e08a', ink: '#0e2a06', muted: '#dfe8e4', r: 16, r2: 10 }),
    4: L({ id: 'april', title: 'Hello, April', fonts: ['Comfortaa:wght@700', 'Nunito Sans:wght@400;600;700'], head: "'Comfortaa', system-ui, sans-serif", body: "'Nunito Sans', system-ui, sans-serif", titleSize: 32, h2: 32,
      panel: panel('48,30,54', 0.64), edge: 'rgba(255,205,235,0.32)', accent: '#ffb3d1', ink: '#330a20', muted: '#f2e2ea', r: 28, r2: 18 }),
    5: L({ id: 'may', title: 'Hello, May', fonts: ['Lora:wght@700', 'Mulish:wght@400;600;700'], head: "'Lora', Georgia, serif", body: "'Mulish', system-ui, sans-serif",
      panel: panel('36,40,20', 0.64), edge: 'rgba(255,230,170,0.30)', accent: '#ffd27a', ink: '#2a1e04', muted: '#ece8d4', r: 22, r2: 14 }),
    6: L({ id: 'june', title: 'Hello, June', fonts: ['Poppins:wght@700', 'DM Sans:wght@400;600;700'], head: "'Poppins', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif", titleSize: 32, h2: 32,
      panel: panel('14,20,44'), edge: 'rgba(255,240,170,0.26)', accent: '#fff3a0', ink: '#2a2600', muted: '#dfe3f2', r: 26, r2: 16 }),
    7: L({ id: 'july', title: 'Hello, July', fonts: ['Righteous', 'Rubik:wght@400;500;700'], head: "'Righteous', system-ui, sans-serif", body: "'Rubik', system-ui, sans-serif", headW: 400,
      panel: panel('14,40,70', 0.62), edge: 'rgba(255,220,180,0.30)', accent: '#ffcf8a', ink: '#2a1800', muted: '#e2edf6', r: 30, r2: 18 }),
    8: L({ id: 'august', title: 'Hello, August', fonts: ['Alfa Slab One', 'Open Sans:wght@400;600;700'], head: "'Alfa Slab One', Georgia, serif", body: "'Open Sans', system-ui, sans-serif", headW: 400, titleSize: 30, h2: 30,
      panel: panel('40,28,30', 0.64), edge: 'rgba(255,210,160,0.28)', accent: '#ffcf7a', ink: '#2a1a04', muted: '#f0e2d8', r: 14, r2: 8 }),
    9: L({ id: 'september', title: 'Hello, September', fonts: ['Zilla Slab:wght@700', 'IBM Plex Sans:wght@400;600;700'], head: "'Zilla Slab', Georgia, serif", body: "'IBM Plex Sans', system-ui, sans-serif",
      panel: panel('26,20,44', 0.64), edge: 'rgba(255,210,150,0.28)', accent: '#ffcf8a', ink: '#2a1a04', muted: '#ece0d8', r: 18, r2: 12 }),
    10: L({ id: 'october', title: 'Hello, October', fonts: ['Cinzel:wght@700', 'Libre Franklin:wght@400;600;700'], head: "'Cinzel', Georgia, serif", body: "'Libre Franklin', system-ui, sans-serif", titleSize: 32, h2: 32, headLs: '0.02em',
      panel: panel('50,22,10', 0.64), edge: 'rgba(255,190,130,0.28)', accent: '#ffb35c', ink: '#2a1004', muted: '#f2e0cc', r: 14, r2: 10 }),
    11: L({ id: 'november', title: 'Hello, November', fonts: ['Fraunces:opsz,wght@9..144,700', 'Inter:wght@400;500;600;700'], head: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif",
      panel: panel('34,14,30'), edge: 'rgba(255,210,190,0.24)', accent: '#f7b27a', ink: '#2a1406', muted: '#ecd8e2', r: 20, r2: 12 }),
    12: L({ id: 'december', title: 'Hello, December', fonts: ['DM Serif Display', 'Nunito:wght@400;600;700;800'], head: "'DM Serif Display', Georgia, serif", body: "'Nunito', system-ui, sans-serif", headW: 400, titleSize: 36, h2: 36,
      panel: panel('10,22,46', 0.60), edge: 'rgba(190,225,255,0.30)', accent: '#a8d8ff', ink: '#06202e', muted: '#d8e6f5', r: 28, r2: 18 })
  };

  var PATRIOTIC = { panel: panel('6,18,46', 0.72), edge: 'rgba(255,255,255,0.30)', accent: '#ff8f9a', ink: '#2b0508', muted: '#d8deec', r: 8, r2: 6 };
  var HOLIDAYS = [
    { id: 'newyear', name: "New Year's Day", match: function (y) { return d(y, 1, 1); },
      look: L({ title: 'Happy New Year', fonts: ['Bungee', 'Outfit:wght@400;600;700'], head: "'Bungee', system-ui, sans-serif", body: "'Outfit', system-ui, sans-serif", headW: 400, titleSize: 30, h2: 30,
        panel: panel('8,10,32', 0.66), edge: 'rgba(255,215,120,0.34)', accent: '#ffd34d', ink: '#2a2000', muted: '#e6e2f2', r: 18, r2: 12 }) },
    { id: 'mlk', name: 'Martin Luther King Jr. Day', match: function (y) { return nthWeekday(y, 1, 1, 3); }, sub: 'A day of service',
      look: L({ title: 'Martin Luther King Jr. Day', fonts: ['Libre Baskerville:wght@700', 'Source Sans 3:wght@400;600;700'], head: "'Libre Baskerville', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif", titleSize: 26, h2: 30,
        panel: panel('40,30,52', 0.64), edge: 'rgba(255,220,180,0.28)', accent: '#ffd08a', ink: '#2a1a04', muted: '#ece0d6', r: 16, r2: 10 }) },
    { id: 'valentines', name: "Valentine's Day", match: function (y) { return d(y, 2, 14); },
      look: L({ title: "Happy Valentine's Day", fonts: ['Dancing Script:wght@700', 'Quicksand:wght@400;600;700'], head: "'Dancing Script', cursive", body: "'Quicksand', system-ui, sans-serif", titleSize: 40, h2: 40,
        panel: panel('50,12,40', 0.64), edge: 'rgba(255,180,210,0.34)', accent: '#ff9ec4', ink: '#33051a', muted: '#f6dbe6', r: 30, r2: 20 }) },
    { id: 'presidents', name: "Presidents' Day", match: function (y) { return nthWeekday(y, 2, 1, 3); },
      look: L(Object.assign({ title: "Presidents' Day", fonts: ['Oswald:wght@600', 'Barlow:wght@400;600;700'], head: "'Oswald', Impact, sans-serif", body: "'Barlow', system-ui, sans-serif", headLs: '0.03em' }, PATRIOTIC, { panel: panel('20,34,62', 0.70) })) },
    { id: 'stpatricks', name: "St. Patrick's Day", match: function (y) { return d(y, 3, 17); },
      look: L({ title: "Happy St. Patrick's Day", fonts: ['Uncial Antiqua', 'Nunito:wght@400;600;700'], head: "'Uncial Antiqua', Georgia, serif", body: "'Nunito', system-ui, sans-serif", headW: 400, titleSize: 28, h2: 30,
        panel: panel('8,44,24', 0.66), edge: 'rgba(170,255,190,0.30)', accent: '#8dff9f', ink: '#03240e', muted: '#d6f2dc', r: 20, r2: 12 }) },
    { id: 'easter', name: 'Easter', match: function (y) { return easter(y); },
      look: L({ title: 'Happy Easter', fonts: ['Fredoka:wght@600', 'Nunito:wght@400;600;700'], head: "'Fredoka', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif", titleSize: 36, h2: 34,
        panel: panel('44,36,66', 0.64), edge: 'rgba(230,210,255,0.34)', accent: '#ffe27a', ink: '#2a2200', muted: '#ece4f6', r: 30, r2: 20 }) },
    { id: 'mothers', name: "Mother's Day", match: function (y) { return nthWeekday(y, 5, 0, 2); },
      look: L({ title: "Happy Mother's Day", fonts: ['Great Vibes', 'Lato:wght@400;700'], head: "'Great Vibes', cursive", body: "'Lato', system-ui, sans-serif", headW: 400, titleSize: 44, h2: 42,
        panel: panel('60,24,44', 0.62), edge: 'rgba(255,200,225,0.34)', accent: '#ffb8d6', ink: '#33051c', muted: '#f4dfe9', r: 26, r2: 16 }) },
    { id: 'memorial', name: 'Memorial Day', match: function (y) { return lastWeekday(y, 5, 1); }, sub: 'Remembering those who gave all',
      look: L(Object.assign({ title: 'Memorial Day', fonts: ['Libre Baskerville:wght@700', 'Barlow:wght@400;600;700'], head: "'Libre Baskerville', Georgia, serif", body: "'Barlow', system-ui, sans-serif", titleSize: 32, h2: 32 }, PATRIOTIC, { panel: panel('30,30,50', 0.66) })) },
    { id: 'fathers', name: "Father's Day", match: function (y) { return nthWeekday(y, 6, 0, 3); },
      look: L({ title: "Happy Father's Day", fonts: ['Archivo Black', 'Archivo:wght@400;600;700'], head: "'Archivo Black', system-ui, sans-serif", body: "'Archivo', system-ui, sans-serif", headW: 400, titleSize: 30, h2: 30,
        panel: panel('18,30,44', 0.64), edge: 'rgba(170,220,255,0.30)', accent: '#7fd0ff', ink: '#04202e', muted: '#d6e8f2', r: 12, r2: 8 }) },
    { id: 'july4', name: 'Independence Day', match: function (y) { return d(y, 7, 4); },
      look: L(Object.assign({ title: 'Happy 4th of July', fonts: ['Bungee', 'Barlow:wght@400;600;700'], head: "'Bungee', system-ui, sans-serif", body: "'Barlow', system-ui, sans-serif", headW: 400, titleSize: 30, h2: 30 }, PATRIOTIC)) },
    { id: 'labor', name: 'Labor Day', match: function (y) { return nthWeekday(y, 9, 1, 1); },
      look: L({ title: 'Happy Labor Day', fonts: ['Anton', 'Inter:wght@400;600;700'], head: "'Anton', Impact, sans-serif", body: "'Inter', system-ui, sans-serif", headW: 400, headLs: '0.02em', titleSize: 36, h2: 36,
        panel: panel('40,30,30', 0.64), edge: 'rgba(255,215,150,0.28)', accent: '#ffc65c', ink: '#2a1a00', muted: '#efe0c8', r: 10, r2: 6 }) },
    { id: 'halloween', name: 'Halloween', match: function (y) { return d(y, 10, 31); },
      look: L({ title: 'Happy Halloween', fonts: ['Creepster', 'Nunito:wght@400;600;700'], head: "'Creepster', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif", headW: 400, headLs: '0.04em', titleSize: 40, h2: 38,
        panel: panel('18,8,30', 0.70), edge: 'rgba(255,150,60,0.34)', accent: '#ff9a3c', ink: '#2a1000', muted: '#e9dcf0', r: 12, r2: 8 }) },
    { id: 'veterans', name: 'Veterans Day', match: function (y) { return d(y, 11, 11); }, sub: 'Thank you to all who served',
      look: L(Object.assign({ title: 'Veterans Day', fonts: ['Bebas Neue', 'Barlow:wght@400;600;700'], head: "'Bebas Neue', Impact, sans-serif", body: "'Barlow', system-ui, sans-serif", headW: 400, headLs: '0.04em', titleSize: 44, h2: 42 }, PATRIOTIC)) },
    { id: 'thanksgiving', name: 'Thanksgiving', match: function (y) { return nthWeekday(y, 11, 4, 4); },
      look: L({ title: 'Happy Thanksgiving', fonts: ['Yeseva One', 'Lato:wght@400;700;900'], head: "'Yeseva One', Georgia, serif", body: "'Lato', system-ui, sans-serif", headW: 400, titleSize: 32, h2: 32,
        panel: panel('56,30,12', 0.64), edge: 'rgba(255,200,120,0.28)', accent: '#ffc46b', ink: '#2a1a04', muted: '#f2dfc4', r: 16, r2: 10 }) },
    { id: 'christmas', name: 'Christmas', match: function (y) { return d(y, 12, 25); }, also: function (y) { return d(y, 12, 24); },
      look: L({ title: 'Merry Christmas', fonts: ['Mountains of Christmas:wght@700', 'Nunito:wght@400;600;700;800'], head: "'Mountains of Christmas', Georgia, serif", body: "'Nunito', system-ui, sans-serif", titleSize: 40, h2: 40,
        panel: panel('40,8,14', 0.66), edge: 'rgba(255,215,140,0.34)', accent: '#ffd76b', ink: '#2a1c00', muted: '#f2e2dc', r: 24, r2: 16 }) },
    { id: 'nye', name: "New Year's Eve", match: function (y) { return d(y, 12, 31); },
      look: L({ title: "Happy New Year's Eve", fonts: ['Bungee', 'Outfit:wght@400;600;700'], head: "'Bungee', system-ui, sans-serif", body: "'Outfit', system-ui, sans-serif", headW: 400, titleSize: 28, h2: 30,
        panel: panel('14,10,34', 0.66), edge: 'rgba(255,215,120,0.34)', accent: '#ffd34d', ink: '#2a2000', muted: '#e6e2f2', r: 18, r2: 12 }) }
  ];
  var BIRTHDAY = L({ id: 'birthday', title: 'Happy Birthday!', fonts: ['Fredoka:wght@600', 'Nunito:wght@400;600;700;800'], head: "'Fredoka', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif", headW: 600, titleSize: 34, h2: 34,
    panel: panel('40,14,52', 0.62), edge: 'rgba(255,200,240,0.30)', accent: '#ffc94d', ink: '#2a1e00', muted: '#eedcf2', r: 26, r2: 16 });

  var COUNTDOWN = ['newyear', 'valentines', 'stpatricks', 'easter', 'mothers', 'memorial', 'fathers', 'july4', 'labor', 'halloween', 'veterans', 'thanksgiving', 'christmas'];

  function d(y, m, day) { return new Date(y, m - 1, day); }
  function nthWeekday(y, m, wd, n) { var x = new Date(y, m - 1, 1); return new Date(y, m - 1, 1 + (wd - x.getDay() + 7) % 7 + (n - 1) * 7); }
  function lastWeekday(y, m, wd) { var x = new Date(y, m, 0); return new Date(y, m - 1, x.getDate() - (x.getDay() - wd + 7) % 7); }
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function dayDiff(a, b) { return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
  function joinNames(n) { return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' & ' + n[n.length - 1]; }
  function possessive(name) { return name + (/s$/i.test(name) ? '’' : '’s'); }

  function birthdaysOn(now, list) {
    return (list || []).filter(function (b) { var p = String(b.date || '').split('-'); return +p[0] === now.getMonth() + 1 && +p[1] === now.getDate(); });
  }
  function nextBirthday(now, list) {
    var best = null;
    (list || []).forEach(function (b) {
      var p = String(b.date || '').split('-'); if (p.length < 2) return;
      var dt = new Date(now.getFullYear(), +p[0] - 1, +p[1]); if (dayDiff(now, dt) < 0) dt = new Date(now.getFullYear() + 1, +p[0] - 1, +p[1]);
      var n = dayDiff(now, dt); if (n > 0 && (!best || n < best.n)) best = { name: b.name, n: n };
    });
    return best;
  }
  function nextHoliday(now) {
    var best = null;
    [now.getFullYear(), now.getFullYear() + 1].forEach(function (y) {
      HOLIDAYS.forEach(function (h) { if (COUNTDOWN.indexOf(h.id) < 0) return; var n = dayDiff(now, h.match(y)); if (n > 0 && (!best || n < best.n)) best = { name: h.name, n: n }; });
    });
    return best;
  }
  function inDays(name, n) { return name + (n === 1 ? ' is tomorrow' : ' in ' + n + ' days'); }

  // birthdays: [{ name: 'Mom', date: '03-14', year: 1985 }]
  window.resolveTheme = function (now, forceId, birthdays) {
    var y = now.getFullYear(), hit = null, bdays = forceId ? [] : birthdaysOn(now, birthdays);
    if (forceId === 'birthday') bdays = [{ name: '[Name]', date: '' }];
    if (bdays.length) {
      var t = Object.assign({}, BIRTHDAY), names = bdays.map(function (b) { return b.name; });
      t.title = 'Happy Birthday, ' + joinNames(names) + '!';
      if (t.title.length > 30) t.titleSize = 28;
      var ages = bdays.filter(function (b) { return b.year; }).map(function (b) { return (bdays.length > 1 ? b.name + ' turns ' : 'Turning ') + (y - b.year); });
      t.sub = ages.length ? ages.join(' · ') + ' today' : 'Make it a great one';
      t.isHoliday = true; t.birthdayNames = names;
      return t;
    }
    HOLIDAYS.forEach(function (h) { if (forceId ? h.id === forceId : (sameDay(h.match(y), now) || (h.also && sameDay(h.also(y), now)))) hit = h; });
    var base = hit ? Object.assign({ id: hit.id }, hit.look) : null;
    if (!base) {
      var m = now.getMonth() + 1;
      if (forceId) Object.keys(MONTHS).forEach(function (k) { if (MONTHS[k].id === forceId) m = +k; });
      base = MONTHS[m];
    }
    var th = Object.assign({}, base);
    if (!hit) th.title = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()] + ', ' +
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][now.getMonth()] + ' ' + now.getDate();
    if (hit && hit.id === 'christmas' && now.getDate() === 24) th.title = 'Merry Christmas Eve';
    var nb = nextBirthday(now, birthdays), nh = nextHoliday(now);
    if (hit && hit.sub) th.sub = hit.sub;
    else if (nb && nb.n <= 7 && (!nh || nb.n <= nh.n)) th.sub = inDays(possessive(nb.name) + ' birthday', nb.n);
    else th.sub = nh ? inDays(nh.name, nh.n) : '';
    th.isHoliday = !!hit;
    return th;
  };

  window.THEME_IDS = Object.keys(MONTHS).map(function (k) { return MONTHS[k].id; }).concat(HOLIDAYS.map(function (h) { return h.id; })).concat(['birthday']);

  window.themeFontsHref = function (t) {
    var fams = t.fonts.concat(['Barlow Condensed:wght@500;600;700', 'Space Grotesk:wght@500;600;700', 'Oswald:wght@500;600;700', 'Roboto Slab:wght@500;600;700']);
    return 'https://fonts.googleapis.com/css2?' + fams.map(function (s) { return 'family=' + s.replace(/ /g, '+'); }).join('&') + '&display=swap';
  };
})();
