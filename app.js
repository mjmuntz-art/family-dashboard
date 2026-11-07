// =====================================================================
//  Muntz Family Dashboard — screens, rotation and live data
// =====================================================================
(function () {
  'use strict';
  var C = window.DASH_CONFIG, L = C.location;
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.has('demo') || !!C.demo;
  var FORCE_DATE = Q.get('date'), FORCE_THEME = Q.get('theme'), STATIC = Q.has('static');
  var ORDER = ['home', 'family', 'photos', 'scores', 'plays', 'news', 'weather'];
  var LABELS = { home: 'Home', family: 'Family', photos: 'Photos', scores: 'Scores', plays: 'Plays', news: 'News', weather: 'Weather' };
  var S = { screen: ORDER.concat(['live', 'alert', 'night']).indexOf(Q.get('screen')) >= 0 ? Q.get('screen') : 'home', detail: null, theme: null, lastScreen: null,
    wx: null, alerts: [], games: [], back: null, backErr: null, wxErr: null, scoresErr: null, photoIdx: 0, timer: null, page: +(Q.get('page') || 0), lastPage: null, sum: {},
    alShown: {}, wasLive: {}, finalShown: load('finalShown', 3 * 86400000) || {}, resume: null, wakeUntil: 0, standings: {} };
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------ helpers
  function now() {
    var n = new Date();
    if (FORCE_DATE) { var p = FORCE_DATE.split('-'); n = new Date(+p[0], +p[1] - 1, +p[2], n.getHours(), n.getMinutes(), n.getSeconds()); }
    if (Q.get('hour')) { var hh = String(Q.get('hour')).split(':'); n = new Date(n.getFullYear(), n.getMonth(), n.getDate(), +hh[0], +(hh[1] || 0), 0); }
    return n;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function onDay(e, d) { var s0 = dayStart(d), s1 = new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + 1); return e.start < s1 && e.end > s0; } // events that span several days count on each of them
  function dayDiff(a, b) { return Math.round((dayStart(b) - dayStart(a)) / 86400000); }
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function hm(d) { var h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM'); }
  function hShort(d) { var h = d.getHours(); return (h % 12 || 12) + (h < 12 ? ' AM' : ' PM'); }
  function whenLabel(d) {
    var n = now(), dd = dayDiff(n, d);
    if (dd === 0) return 'Today ' + hm(d);
    if (dd === 1) return 'Tomorrow ' + hm(d);
    if (dd > 1 && dd < 7) return DOW[d.getDay()] + ' ' + hm(d);
    return MON[d.getMonth()] + ' ' + d.getDate() + ' ' + hm(d);
  }
  function save(k, v) { try { localStorage.setItem('dash:' + k, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* storage unavailable */ } }
  function load(k, maxAgeMs) {
    try { var o = JSON.parse(localStorage.getItem('dash:' + k)); if (o && (!maxAgeMs || Date.now() - o.t < maxAgeMs)) return o.v; } catch (e) { /* ignore */ }
    return null;
  }
  function getJSON(url, ms) {
    return new Promise(function (resolve, reject) {
      var ctl = window.AbortController ? new AbortController() : null;
      var tm = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('timed out')); }, ms || 15000);
      fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { clearTimeout(tm); resolve(j); }, function (e) { clearTimeout(tm); reject(e); });
    });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function lum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0.2;
    var n = parseInt(m[1], 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function bugColor(c1, c2) { // a team color dark enough for white text
    if (lum(c1) <= 0.18) return c1;
    if (c2 && lum(c2) <= 0.18) return c2;
    return '#2b2f38';
  }
  function note(html) { return '<div class="note">' + html + '</div>'; }
  var SETUP = 'Connect your Google account in the Apps Script step of the README to fill this in.';

  // ------------------------------------------------------------ icons
  var ICON = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    partly: '<circle cx="9" cy="9" r="3.2"/><path d="M9 2.5v1.5M3.5 9H2M4.4 4.4l1 1M13.6 4.4l-1 1"/><path d="M8 19h9a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 8.2 13.2 3 3 0 0 0 8 19z"/>',
    partlyN: '<path d="M11 6.5A4.5 4.5 0 1 1 4.6 4 3.6 3.6 0 0 0 11 6.5z"/><path d="M8 19h9a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 8.2 13.2 3 3 0 0 0 8 19z"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 10.5 3.75 3.75 0 0 0 7 18z"/>',
    rain: '<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7.5 3.75 3.75 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    snow: '<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7.5 3.75 3.75 0 0 0 7 15z"/><path d="M8 19h.01M12 18h.01M16 19h.01M10 21.5h.01M14 21.5h.01"/>',
    sleet: '<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7.5 3.75 3.75 0 0 0 7 15z"/><path d="M8 18l-1 3M16 18l-1 3M12 19h.01"/>',
    storm: '<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7.5 3.75 3.75 0 0 0 7 15z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>',
    fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'
  };
  function icon(name, size, sw) {
    return '<svg width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.6) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || ICON.cloud) + '</svg>';
  }
  function wmo(code, isDay) {
    var c = +code, t, i;
    if (c === 0) { t = 'Clear'; i = isDay ? 'sun' : 'moon'; }
    else if (c === 1) { t = 'Mostly clear'; i = isDay ? 'sun' : 'moon'; }
    else if (c === 2) { t = 'Partly cloudy'; i = isDay ? 'partly' : 'partlyN'; }
    else if (c === 3) { t = 'Cloudy'; i = 'cloud'; }
    else if (c === 45 || c === 48) { t = 'Fog'; i = 'fog'; }
    else if (c >= 51 && c <= 57) { t = 'Drizzle'; i = 'rain'; }
    else if (c === 66 || c === 67) { t = 'Freezing rain'; i = 'sleet'; }
    else if (c >= 61 && c <= 65) { t = 'Rain'; i = 'rain'; }
    else if (c >= 71 && c <= 77) { t = 'Snow'; i = 'snow'; }
    else if (c >= 80 && c <= 82) { t = 'Showers'; i = 'rain'; }
    else if (c === 85 || c === 86) { t = 'Snow showers'; i = 'snow'; }
    else if (c >= 95) { t = 'Thunderstorms'; i = 'storm'; }
    else { t = '—'; i = 'cloud'; }
    return { text: t, icon: i };
  }
  function iconFromText(s, isDay) {
    s = (s || '').toLowerCase();
    if (/thunder|t-storm/.test(s)) return 'storm';
    if (/sleet|freezing|ice/.test(s)) return 'sleet';
    if (/snow|flurr|blizzard/.test(s)) return 'snow';
    if (/rain|shower|drizzle/.test(s)) return 'rain';
    if (/fog|haze|smoke|mist/.test(s)) return 'fog';
    if (/partly|mostly sunny|mostly clear/.test(s)) return isDay ? 'partly' : 'partlyN';
    if (/cloud|overcast/.test(s)) return 'cloud';
    if (/wind|breez/.test(s)) return 'wind';
    return isDay ? 'sun' : 'moon';
  }
  function compass(deg) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg || 0) % 360) / 45) % 8]; }
  function aqiLabel(a) { if (a == null) return ''; return a <= 50 ? 'Good' : a <= 100 ? 'Moderate' : a <= 150 ? 'Unhealthy for some' : a <= 200 ? 'Unhealthy' : 'Very unhealthy'; }

  // ------------------------------------------------------------ moon
  function moonInfo(d) {
    var syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    var age = (((d.getTime() - ref) / 86400000) % syn + syn) % syn, frac = age / syn;
    var illum = (1 - Math.cos(2 * Math.PI * frac)) / 2;
    var names = [[1.84566, 'New moon'], [5.53699, 'Waxing crescent'], [9.22831, 'First quarter'], [12.91963, 'Waxing gibbous'], [16.61096, 'Full moon'], [20.30228, 'Waning gibbous'], [23.99361, 'Last quarter'], [27.68493, 'Waning crescent'], [99, 'New moon']];
    var name = names.filter(function (n) { return age < n[0]; })[0][1];
    var toFull = age < syn / 2 ? syn / 2 - age : syn - age + syn / 2;
    var full = new Date(d.getTime() + toFull * 86400000);
    return { name: name, illum: Math.round(illum * 100), f: illum, waxing: frac < 0.5, nextFull: MON[full.getMonth()] + ' ' + full.getDate() };
  }
  function moonSvg(m, size) {
    var R = 34, cx = 40, cy = 40, rx = Math.abs(1 - 2 * m.f) * R, path;
    if (m.waxing) path = 'M' + cx + ' ' + (cy - R) + ' A' + R + ' ' + R + ' 0 0 1 ' + cx + ' ' + (cy + R) + ' A' + rx.toFixed(1) + ' ' + R + ' 0 0 ' + (m.f < 0.5 ? 0 : 1) + ' ' + cx + ' ' + (cy - R) + 'Z';
    else path = 'M' + cx + ' ' + (cy - R) + ' A' + R + ' ' + R + ' 0 0 0 ' + cx + ' ' + (cy + R) + ' A' + rx.toFixed(1) + ' ' + R + ' 0 0 ' + (m.f < 0.5 ? 1 : 0) + ' ' + cx + ' ' + (cy - R) + 'Z';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 80 80" role="img" aria-label="' + esc(m.name) + '"><circle cx="40" cy="40" r="34" fill="rgba(255,255,255,0.14)"/><path d="' + path + '" fill="#f4efdc"/></svg>';
  }

  // ------------------------------------------------------------ theme + clock
  function applyTheme() {
    var t = resolveTheme(now(), FORCE_THEME, C.birthdays || []), tod = timeOfDay();
    var timed = window.sceneHasTimes && sceneHasTimes(t.id), todChanged = timed && S.tod !== tod;
    if (todChanged && S.theme && S.theme.id === t.id) { S.tod = tod; swapScene(t.id, tod); }
    if (S.theme && S.theme.id === t.id && S.theme.sub === t.sub && S.theme.title === t.title) return;
    var changedLook = !S.theme || S.theme.id !== t.id; S.tod = tod;
    S.theme = t;
    var st = document.documentElement.style;
    [['--panel', t.panel], ['--solid', t.solid], ['--edge', t.edge], ['--tile', t.tile], ['--accent', t.accent], ['--ink', t.ink], ['--muted', t.muted],
      ['--r', t.r + 'px'], ['--r2', t.r2 + 'px'], ['--head', t.head], ['--body', t.body], ['--headW', String(t.headW)], ['--headLs', t.headLs],
      ['--titleSize', t.titleSize + 'px'], ['--h2', t.h2 + 'px']].forEach(function (p) { st.setProperty(p[0], p[1]); });
    if (changedLook) { $('fonts').href = themeFontsHref(t); swapScene(t.id, tod, !S.sceneSet); S.sceneSet = true; }
    $('btitle').textContent = t.title; $('bsub').textContent = t.sub;
    fitTitle(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
  }
  // Time of day for the backgrounds, from today's real sunrise and sunset
  function timeOfDay() {
    if (Q.get('tod')) return Q.get('tod');
    var n = now(), w = S.wx, at = function (h, m) { return new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, m || 0); };
    var rise = w && w.riseD ? at(w.riseD.getHours(), w.riseD.getMinutes()) : at(7), set = w && w.setD ? at(w.setD.getHours(), w.setD.getMinutes()) : at(17), M = 60000;
    if (n < rise - 30 * M || n >= set + 45 * M) return 'night';
    if (n < Math.min(rise.getTime() + 210 * M, at(10, 30).getTime())) return 'morning';
    if (n < Math.min(at(14).getTime(), set - 90 * M)) return 'midday';
    if (n < set - 40 * M) return 'afternoon';
    return n < set.getTime() + 5 * M ? 'evening' : 'dusk'; // dusk: just after sunset (uses the evening image if a month has no dusk one)
  }
  function swapScene(id, tod, instant) { // the new background fades in over the old one (after its image has loaded)
    var html = buildScene(id, C.lowPower, tod, now()), url = window.sceneImage && sceneImage(id, tod), el = $('scene');
    var put = function () {
      var olds = [].slice.call(el.children), d = document.createElement('div'); d.className = 'scwrap'; d.innerHTML = html;
      if (instant || STATIC || !olds.length) { el.innerHTML = ''; el.appendChild(d); return; }
      d.style.opacity = '0'; el.appendChild(d);
      requestAnimationFrame(function () { requestAnimationFrame(function () { d.style.transition = 'opacity 4s ease'; d.style.opacity = '1'; }); });
      setTimeout(function () { olds.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); }); }, 4300);
    };
    if (url && !instant) { var im = new Image(); im.onload = im.onerror = put; im.src = url; } else put();
  }
  function fitTitle() { // as big as the space between the clock and the weather allows
    var el = $('btitle'), bar = $('topbar'), room = bar.clientWidth - bar.children[0].offsetWidth - bar.children[2].offsetWidth - 2 * 16 - 72, size = Math.round((S.theme.titleSize || 34) * 1.5);
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > room && size > 26) { size -= 2; el.style.fontSize = size + 'px'; }
  }
  function corner() { // small time + temperature pill shown on the full screens
    var el = $('corner'); if (!el) return;
    var n = now(), h = n.getHours(), m = n.getMinutes(), w = S.wx && S.wx.now;
    var extra = S.screen === 'weather' ? DOW[n.getDay()] + ', ' + MON[n.getMonth()] + ' ' + n.getDate() : (w && typeof w.temp === 'number' ? w.temp + '°' : '');
    el.innerHTML = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + '<span>' + (h < 12 ? 'AM' : 'PM') + (extra ? ' · ' + esc(extra) : '') + '</span>';
  }
  function tick() {
    var n = now(), h = n.getHours(), m = n.getMinutes();
    $('time').textContent = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m;
    $('ampm').textContent = h < 12 ? 'AM' : 'PM';
    $('dow').textContent = DOWL[n.getDay()];
    $('date').textContent = MONL[n.getMonth()] + ' ' + n.getDate();
    $('cdate').style.display = S.theme && S.theme.isHoliday ? 'flex' : 'none';
    if (n.getSeconds() === 0 || !$('corner').innerHTML) corner();
    if (n.getSeconds() % 15 === 0 && !STATIC) {
      checkTakeover();
      if (isNight() && S.screen !== 'night' && S.screen !== 'alert' && !S.detail) setScreen('night');
      else if (!isNight() && S.screen === 'night') setScreen('home');
      else if (S.screen === 'night' && n.getSeconds() === 0) render();
      else if (S.screen === 'home' && !S.detail && S.wasBrief !== isBriefing()) render();
      S.wasBrief = isBriefing();
    }
    if (n.getSeconds() === 0) {
      applyTheme();
      var hh = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      if (C.nightlyReload && hh === C.nightlyReload && !FORCE_DATE) location.reload();
    }
  }

  // ------------------------------------------------------------ weather
  function loadWeather() {
    if (DEMO) { S.wx = demoWeather(); renderWxPill(); render(); return Promise.resolve(); }
    var tz = encodeURIComponent(L.timezone), ll = 'latitude=' + L.lat + '&longitude=' + L.lon;
    var om = getJSON('https://api.open-meteo.com/v1/forecast?' + ll + '&timezone=' + tz + '&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=8' +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max' +
      '&hourly=temperature_2m,precipitation_probability,weather_code,is_day');
    var aq = getJSON('https://air-quality-api.open-meteo.com/v1/air-quality?' + ll + '&current=us_aqi&timezone=' + tz);
    var pt = load('nwsPoint:' + L.lat.toFixed(3) + ',' + L.lon.toFixed(3), 7 * 86400000);
    var nws = (pt ? Promise.resolve(pt) : getJSON('https://api.weather.gov/points/' + L.lat.toFixed(4) + ',' + L.lon.toFixed(4)).then(function (j) {
      var v = { forecast: j.properties.forecast, hourly: j.properties.forecastHourly }; save('nwsPoint:' + L.lat.toFixed(3) + ',' + L.lon.toFixed(3), v); return v;
    })).then(function (p) { return Promise.all([getJSON(p.forecast), getJSON(p.hourly)]); });
    return Promise.allSettled([om, aq, nws]).then(function (r) {
      if (r[0].status !== 'fulfilled' && r[2].status !== 'fulfilled') { S.wxErr = 'Weather services unreachable — retrying'; render(); return; }
      S.wxErr = null;
      S.wx = buildWeather(r[0].value, r[1].value, r[2].status === 'fulfilled' ? r[2].value : null);
      renderWxPill(); render();
    });
  }
  function parseLocal(s) { // "2026-11-06T06:31" (already local)
    var m = /(\d+)-(\d+)-(\d+)T(\d+):(\d+)/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
  }
  function buildWeather(om, aq, nws) {
    var n = now(), wx = { src: [] };
    if (om) {
      var cu = om.current, cond = wmo(cu.weather_code, cu.is_day);
      wx.now = { temp: Math.round(cu.temperature_2m), feels: Math.round(cu.apparent_temperature), hum: Math.round(cu.relative_humidity_2m),
        wind: Math.round(cu.wind_speed_10m), gust: Math.round(cu.wind_gusts_10m), dir: compass(cu.wind_direction_10m), text: cond.text, icon: cond.icon };
      var dl = om.daily;
      wx.hi = Math.round(dl.temperature_2m_max[0]); wx.lo = Math.round(dl.temperature_2m_min[0]); wx.uv = Math.round(dl.uv_index_max[0]);
      var rise = parseLocal(dl.sunrise[0]), set = parseLocal(dl.sunset[0]);
      if (rise && set) { wx.rise = hm(rise); wx.set = hm(set); wx.riseD = rise; wx.setD = set; var mins = Math.round((set - rise) / 60000); wx.daylight = Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
        var r2 = parseLocal(dl.sunrise[1]), s2 = parseLocal(dl.sunset[1]); if (r2 && s2) wx.dayDelta = Math.round((s2 - r2) / 60000) - mins; }
      wx.days = dl.time.slice(0, 7).map(function (t, i) {
        var d = parseLocal(t + 'T12:00'), c = wmo(dl.weather_code[i], 1);
        return { label: i === 0 ? 'Today' : DOW[d.getDay()], hi: Math.round(dl.temperature_2m_max[i]), lo: Math.round(dl.temperature_2m_min[i]), pop: dl.precipitation_probability_max[i], icon: c.icon, text: c.text };
      });
      var hrs = [];
      om.hourly.time.forEach(function (t, i) {
        var d = parseLocal(t); if (d && d >= new Date(n.getTime() - 3600000) && hrs.length < 12) {
          var c = wmo(om.hourly.weather_code[i], om.hourly.is_day[i]);
          hrs.push({ t: hrs.length === 0 ? 'Now' : hShort(d), temp: Math.round(om.hourly.temperature_2m[i]), pop: om.hourly.precipitation_probability[i], icon: c.icon });
        }
      });
      wx.hours = hrs; wx.src.push('Open-Meteo');
    }
    if (aq && aq.current) { wx.aqi = aq.current.us_aqi; }
    if (nws) {
      var fc = nws[0].properties.periods, hr = nws[1].properties.periods;
      // NWS hourly (official)
      var hh = hr.filter(function (p) { return new Date(p.endTime) > n; }).slice(0, 12);
      if (hh.length) wx.hours = hh.map(function (p, i) {
        return { t: i === 0 ? 'Now' : hShort(new Date(p.startTime)), temp: p.temperature, pop: p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value != null ? p.probabilityOfPrecipitation.value : 0, icon: iconFromText(p.shortForecast, p.isDaytime) };
      });
      // NWS 7-day: pair each daytime high with the following night's low
      var byDay = {};
      fc.forEach(function (p) {
        var d = new Date(p.startTime), k = dayStart(d).getTime();
        byDay[k] = byDay[k] || { d: dayStart(d) };
        var pop = p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value != null ? p.probabilityOfPrecipitation.value : 0;
        if (p.isDaytime) { byDay[k].hi = p.temperature; byDay[k].icon = iconFromText(p.shortForecast, true); byDay[k].text = p.shortForecast; }
        else { byDay[k].lo = p.temperature; if (!byDay[k].icon) { byDay[k].icon = iconFromText(p.shortForecast, false); byDay[k].text = p.shortForecast; } }
        byDay[k].pop = Math.max(byDay[k].pop || 0, pop);
      });
      var days = Object.keys(byDay).sort().map(function (k) { return byDay[k]; }).slice(0, 7);
      if (days.length >= 6) wx.days = days.map(function (x, i) {
        var omDay = wx.days && wx.days[i];
        return { label: sameDay(x.d, n) ? 'Today' : DOW[x.d.getDay()], hi: x.hi != null ? x.hi : (omDay ? omDay.hi : '—'), lo: x.lo != null ? x.lo : (omDay ? omDay.lo : '—'), pop: x.pop, icon: x.icon, text: x.text };
      });
      wx.nwsNow = fc[0] ? fc[0].name + ': ' + fc[0].shortForecast : '';
      wx.src.unshift('National Weather Service');
    }
    wx.moon = moonInfo(n);
    return wx;
  }
  function loadAlerts() {
    if (DEMO) return Promise.resolve();
    return getJSON('https://api.weather.gov/alerts/active?point=' + L.lat.toFixed(4) + ',' + L.lon.toFixed(4)).then(function (j) {
      S.alerts = (j.features || []).filter(function (f) { return f.properties && f.properties.status !== 'Test' && f.properties.messageType !== 'Cancel'; }).map(function (f) { var p = f.properties; return { id: f.id || p.id, event: p.event, until: p.ends || p.expires, onset: p.onset || p.effective, headline: p.headline, description: p.description || '', instruction: p.instruction || '', severity: p.severity, area: p.areaDesc || '' }; });
      S.alerts.sort(function (a, b) { return (isUrgent(b) ? 1 : 0) - (isUrgent(a) ? 1 : 0); });
      renderAlert(); checkTakeover(); if (S.screen === 'weather') render();
    }).catch(function () { /* keep last alerts */ });
  }
  function renderAlert() {
    var a = S.alerts[0], el = $('alert');
    if (!a) { el.className = ''; el.innerHTML = ''; return; }
    var until = a.until ? ' until ' + whenLabel(new Date(a.until)) : '';
    el.innerHTML = icon('alert', 18, 2) + '<span>' + esc(a.event + until) + (S.alerts.length > 1 ? ' · +' + (S.alerts.length - 1) + ' more' : '') + '</span>';
    el.className = 'on';
  }
  function renderWxPill() {
    var w = S.wx; if (!w || !w.now) return;
    $('wxicon').innerHTML = icon(w.now.icon, 62, 1.5);
    $('wxtemp').textContent = w.now.temp + '°';
    $('wxsub').textContent = (w.hi != null ? 'H ' + w.hi + '° · L ' + w.lo + '°' : w.now.text);
  }

  // ------------------------------------------------------------ scores (ESPN)
  var ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
  var NEUTRAL = { c1: '#3A3F4A', c2: '#A3ABB8' };
  function teamDirectory(sport, league) {
    var key = 'teams2:' + league, cached = load(key, 86400000);
    if (cached) return Promise.resolve(cached);
    return getJSON(ESPN + sport + '/' + league + '/teams?limit=1000').then(function (j) {
      var map = {};
      ((j.sports || [])[0] || { leagues: [] }).leagues[0].teams.forEach(function (x) {
        var t = x.team; map[t.id] = { color: t.color ? '#' + t.color : null, alt: t.alternateColor ? '#' + t.alternateColor : null, logo: t.logos && t.logos[0] ? t.logos[0].href : null,
          keys: [t.id, t.abbreviation, t.slug, t.displayName, t.shortDisplayName, t.name, t.location, t.nickname].filter(Boolean).map(function (k) { return String(k).toLowerCase(); }) };
      });
      save(key, map); return map;
    }).catch(function () { return {}; });
  }
  // Every team's record for a league, from ESPN's standings (one call per league, cached 30 minutes)
  function recordBook(sport, league) {
    var key = 'recs:' + league, cached = load(key, 30 * 60000);
    if (cached) return Promise.resolve(cached);
    return getJSON('https://site.api.espn.com/apis/v2/sports/' + sport + '/' + league + '/standings').then(function (j) {
      var map = {};
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        (o.standings && o.standings.entries || []).forEach(function (en) {
          if (!en.team) return;
          var st = en.stats || [], pick = st.filter(function (x) { return (x.name === 'overall' || x.type === 'total') && /\d+-\d+/.test(x.summary || x.displayValue || ''); })[0];
          var val = function (n) { var x = st.filter(function (y) { return y.name === n; })[0]; return x ? Math.round(x.value) : null; };
          var rec = pick ? (pick.summary || pick.displayValue) : (val('wins') != null ? val('wins') + '-' + val('losses') + (val('otLosses') ? '-' + val('otLosses') : val('ties') ? '-' + val('ties') : '') : '');
          if (rec) map[en.team.id] = rec;
        });
        (o.children || []).forEach(walk);
      })(j);
      save(key, map); return map;
    }).catch(function () { return {}; });
  }
  // Team colors: ESPN's team-list endpoints don't always answer browsers, but every game's summary
  // carries both teams' colors, so read them from there and remember them for a week.
  function colorsFromSummary(g) {
    return getJSON(ESPN + g.sport + '/' + g.league + '/summary?event=' + g.id).then(function (j) {
      var comp = j.header && j.header.competitions && j.header.competitions[0], got = {};
      (comp ? comp.competitors : []).forEach(function (c) {
        var t = c.team || {}; if (!t.id || !t.color) return;
        var info = { c1: '#' + t.color, c2: t.alternateColor ? '#' + t.alternateColor : '', logo: t.logos && t.logos[0] ? t.logos[0].href : (t.logo || '') };
        save('tc:' + g.league + ':' + t.id, info); got[t.id] = info;
      });
      return got;
    }).catch(function () { return {}; });
  }
  function fillColors(games) {
    var jobs = [];
    games.forEach(function (g) {
      if (!g.sport || g.morris) return;
      var need = g.teams.filter(function (t) {
        if (!t.id || (t.c1 && t.c1 !== NEUTRAL.c1)) return false;
        var c = load('tc:' + g.league + ':' + t.id, 7 * 86400000);
        if (c && c.c1) { t.c1 = c.c1; t.c2 = c.c2 || t.c2; if (!t.logo && c.logo) t.logo = c.logo; return false; }
        return true;
      });
      if (need.length) jobs.push(colorsFromSummary(g).then(function (got) {
        need.forEach(function (t) { var c = got[t.id]; if (c) { t.c1 = c.c1; t.c2 = c.c2 || t.c2; if (!t.logo && c.logo) t.logo = c.logo; } });
      }));
    });
    return Promise.all(jobs);
  }
  function fillRecords(games) { // any team still missing a record gets it from the standings
    var need = {};
    games.forEach(function (g) { if (g.sport && !g.morris && g.teams.some(function (t) { return !t.rec && t.id; })) need[g.sport + '|' + g.league] = 1; });
    return Promise.all(Object.keys(need).map(function (k) {
      var sp = k.split('|');
      return recordBook(sp[0], sp[1]).then(function (book) {
        games.forEach(function (g) { if (g.league === sp[1]) g.teams.forEach(function (t) { if (!t.rec && book[t.id]) t.rec = book[t.id]; }); });
      });
    }));
  }
  // Finds a team in ESPN's list from whatever you typed in config.js: ID, abbreviation (chi), name (Bears), school (Illinois)…
  function resolveTeam(dir, tm) {
    var ids = Object.keys(dir); if (!ids.length) return String(tm.id || tm.team);
    var want = [tm.team, tm.name].filter(Boolean).map(function (k) { return String(k).toLowerCase().trim(); });
    for (var w = 0; w < want.length; w++) for (var i = 0; i < ids.length; i++) if ((dir[ids[i]].keys || []).indexOf(want[w]) >= 0) return ids[i];
    return tm.id ? String(tm.id) : null;
  }
  function scoreVal(s) { if (s == null) return ''; if (typeof s === 'object') return s.displayValue != null ? s.displayValue : (s.value != null ? s.value : ''); return s; }
  function recOf(c) { // a team's record from any of ESPN's formats
    var r = c.records || c.record; if (typeof r === 'string') return r;
    r = (r || []).filter(function (x) { return !x.type || x.type === 'total' || /overall/i.test(x.name || ''); })[0] || (r || [])[0];
    return r ? r.summary || r.displayValue || '' : '';
  }
  function parseEvent(ev, sport, league, label, dir) {
    var comp = ev.competitions[0], st = (comp.status || ev.status).type, d = new Date(ev.date);
    var teams = comp.competitors.slice().sort(function (a, b) { return a.homeAway === 'away' ? -1 : b.homeAway === 'away' ? 1 : 0; }).map(function (c) {
      var t = c.team || {}, ref = (dir && dir[t.id]) || {};
      var c1 = t.color ? '#' + t.color : ref.color, c2 = t.alternateColor ? '#' + t.alternateColor : ref.alt;
      return { abbr: t.abbreviation || '', name: t.shortDisplayName || t.name || t.displayName || '', logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || ref.logo || '',
        c1: c1 || NEUTRAL.c1, c2: c2 || NEUTRAL.c2, score: st.state === 'pre' ? '' : scoreVal(c.score), winner: !!c.winner, home: c.homeAway === 'home', rec: recOf(c), id: t.id,
        full: t.displayName || '', nick: t.name || t.nickname || '', loc: t.location || '' };
    });
    var status = st.state === 'pre' ? whenLabel(d) : (st.shortDetail || st.detail || '');
    return { id: ev.id, sport: sport, league: league, lg: label, state: st.state, status: status, date: d, teams: teams };
  }
  function loadScores() {
    if (DEMO) { S.games = demoGames(); render(); return Promise.resolve(); }
    var n = now(), out = [], seen = {}, miss = [];
    function add(g) { if (g && !seen[g.id]) { seen[g.id] = 1; out.push(g); } }
    var followed = C.teams.map(function (tm) {
      var label = { 'college-football': 'CFB', 'mens-college-basketball': 'CBB', 'womens-college-basketball': 'WCBB' }[tm.league] || tm.league.toUpperCase();
      return teamDirectory(tm.sport, tm.league).then(function (dir) {
        var id = resolveTeam(dir, tm);
        if (!id) { miss.push((tm.name || tm.team) + ' (' + label + ')'); return []; }
        return getJSON(ESPN + tm.sport + '/' + tm.league + '/teams/' + id + '/schedule').then(function (j) {
          var mine = j.team || {}, evs = (j.events || []).map(function (e) {
            var g = parseEvent(e, tm.sport, tm.league, label, dir); g.followed = true;
            g.teams.forEach(function (t) { if (String(t.id) === String(mine.id) && mine.recordSummary && (g.state !== 'post' || !t.rec)) t.rec = mine.recordSummary; });
            return g;
          });
          var live = evs.filter(function (g) { return g.state === 'in'; });
          var past = evs.filter(function (g) { return g.state === 'post' && (n - g.date) < 10 * 86400000; }).sort(function (a, b) { return b.date - a.date; });
          var next = evs.filter(function (g) { return g.state === 'pre' && g.date - n < 10 * 86400000; }).sort(function (a, b) { return a.date - b.date; });
          return live.length ? [live[0], next[0]] : [past[0], next[0]];
        });
      }).catch(function () { miss.push((tm.name || tm.team) + ' (' + label + ')'); return []; });
    });
    var fills = C.fillLeagues.map(function (lg) {
      return getJSON(ESPN + lg.sport + '/' + lg.league + '/scoreboard').then(function (j) {
        return (j.events || []).map(function (e) { return parseEvent(e, lg.sport, lg.league, lg.label); });
      }).catch(function () { return []; });
    });
    return Promise.all([Promise.all(followed), Promise.all(fills)]).then(function (r) {
      var morris = morrisGames();
      // Live games first, then the followed teams, then Morris, then today's best of the rest
      var all = [].concat.apply([], r[0]).filter(Boolean), fillAll = [].concat.apply([], r[1]);
      // one tile per team: live > last night's final > next game this week > final in the last 10 days
      var tile = function (pair) {
        var a = pair.filter(Boolean), past = a.filter(function (g) { return g.state === 'post'; })[0], next = a.filter(function (g) { return g.state === 'pre'; })[0];
        return a.filter(function (g) { return g.state === 'in'; })[0] || (past && n - past.date < 18 * 3600000 ? past : null) || (next && next.date - n < 7 * 86400000 ? next : null) || past || null;
      };
      var mineTiles = r[0].map(tile).filter(Boolean);
      mineTiles.filter(function (g) { return g.state === 'in'; }).forEach(add);
      mineTiles.forEach(add); morris.forEach(add);
      var mine = out.length; // your teams always make it; other live games and today's slate fill the rest
      fillAll.filter(function (g) { return g.state === 'in'; }).forEach(add);
      var rank = function (g) { return g.state === 'pre' ? 1 : 2; };
      fillAll.filter(function (g) { return dayDiff(n, g.date) >= -1 && dayDiff(n, g.date) <= 2; })
        .sort(function (a, b) { return rank(a) - rank(b) || (rank(a) === 1 ? a.date - b.date : b.date - a.date); }).forEach(add);
      var size = Math.min(12, Math.max(6, Math.ceil(mine / 6) * 6)); // full pages of 6 tiles
      S.games = out.slice(0, Math.max(size, mine)); S.mine = all; S.teamMiss = miss; S.scoresErr = null; featureGames().forEach(ensureSummary); liveList().forEach(ensureSummary); standingsLeagues(); render();
      Promise.all([fillRecords(S.games.concat(all)), fillColors(S.games.concat(all))]).then(function () { if (S.screen === 'scores' || S.screen === 'home') render(); });
    }).catch(function () { S.scoresErr = 'Scores unavailable — retrying'; render(); });
  }
  function morrisGames() {
    var b = S.back, m = C.morris; if (!m.enabled || !b || !b.morris) return [];
    var n = now();
    return (b.morris.games || []).map(function (g, i) {
      var d = new Date(g.date), state = g.status && /final/i.test(g.status) ? 'post' : (g.status && /q\d|half|ot|live/i.test(g.status) ? 'in' : 'pre');
      var us = { abbr: m.abbr, name: m.name, logo: m.logo || '', c1: m.color, c2: m.altColor, score: state === 'pre' ? '' : g.morrisScore, winner: +g.morrisScore > +g.oppScore, home: !!g.home };
      var them = { abbr: g.oppAbbr || (g.opponent || '').slice(0, 3).toUpperCase(), name: g.opponent, logo: g.oppLogo || '', c1: g.oppColor || NEUTRAL.c1, c2: g.oppAltColor || NEUTRAL.c2, score: state === 'pre' ? '' : g.oppScore, winner: +g.oppScore > +g.morrisScore, home: !g.home };
      return { id: 'mor' + i, sport: 'ihsa', league: 'ihsa', lg: 'IHSA' + (g.sport ? ' ' + g.sport : ''), state: state, status: state === 'pre' ? whenLabel(d) : g.status, date: d, teams: g.home ? [them, us] : [us, them], morris: g };
    }).filter(function (g) { return Math.abs(dayDiff(n, g.date)) <= 8; }).sort(function (a, b) { return a.date - b.date; }).slice(0, 2);
  }
  function bugHTML(t, h, state, fs) {
    var dim = state === 'post' && !t.winner ? ' dim' : '';
    var logo = t.logo ? '<img src="' + esc(t.logo) + '" alt="" onerror="this.remove()">' : '';
    return '<div class="bug' + dim + '" style="height:' + h + 'px">' +
      '<div class="logo" style="width:' + h + 'px;background:rgba(255,255,255,0.92);color:#101418;font-size:' + Math.round(h * 0.28) + 'px;font-weight:800">' + (logo || esc(t.abbr)) + '</div>' +
      '<div class="nm ellip" style="background:' + bugColor(t.c1, t.c2) + ';font-size:' + fs + 'px">' + esc(t.name) + '</div>' +
      '<div class="sc" style="width:' + Math.round(h * 1.1) + 'px;font-size:' + Math.round(fs * 1.2) + 'px">' + esc(t.score) + '</div></div>';
  }
  function shade(hex, amt) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    var n = parseInt(m[1], 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return Math.max(0, Math.min(255, Math.round(v * (1 + amt)))); });
    return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function teamBg(t) { return lum(t.c1) > 0.6 && t.c2 && lum(t.c2) < lum(t.c1) ? t.c2 : (t.c1 || NEUTRAL.c1); }
  function teamInk(bg) { return lum(bg) > 0.38 ? '#111418' : '#ffffff'; }
  function teamGlow(t) { return lum(t.c1) < 0.03 && t.c2 ? t.c2 : (t.c1 || NEUTRAL.c2); }
  var MATCH = { mini: { logo: 32, name: 11, rec: 10, score: 22, h: 66, gap: 6 }, tile: { logo: 92, name: 16, rec: 13, score: 44, h: 164, gap: 10 },
    page: { logo: 116, name: 24, rec: 16, score: 88, h: 178, gap: 22 }, big: { logo: 132, name: 22, rec: 16, score: 66, h: 220, gap: 18 } };
  function logoHTML(t, px) { // the team's logo with a soft glow of its color; a color badge if there's no logo
    var badge = '<div style="width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:' + teamBg(t) + ';color:' + teamInk(teamBg(t)) + ';display:flex;align-items:center;justify-content:center;font-weight:800;font-size:' + Math.round(px * 0.3) + 'px;box-shadow:0 4px 14px rgba(0,0,0,.35)">' + esc(t.abbr) + '</div>';
    var img = t.logo ? '<img src="' + esc(t.logo) + '" alt="" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.45))" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' + badge.replace('display:flex', 'display:none') : badge;
    return '<div style="position:relative;display:flex;align-items:center;justify-content:center;width:' + px + 'px;height:' + px + 'px;flex-shrink:0">' +
      '<div style="position:absolute;inset:-' + Math.round(px * 0.28) + 'px;border-radius:50%;background:radial-gradient(circle,' + teamGlow(t) + ' 0%,transparent 66%);opacity:.55"></div>' +
      '<div style="position:relative;display:flex">' + img + '</div></div>';
  }
  function matchupHTML(g, size, center) { // big logos, name and record underneath, score (or kickoff) in the middle
    var z = MATCH[size], played = g.state !== 'pre';
    var side = function (t) {
      var dim = g.state === 'post' && !t.winner ? 'opacity:.6;' : '';
      return '<div style="' + dim + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:' + Math.round(z.gap / 2) + 'px;min-width:0">' + logoHTML(t, z.logo) +
        '<div style="display:flex;flex-direction:column;align-items:center;min-width:0;max-width:100%">' +
        '<div class="ellip" style="max-width:100%;font-size:' + z.name + 'px;font-weight:800;line-height:1.15">' + esc(size === 'mini' ? t.abbr : t.name) + '</div>' +
        (t.rec ? '<div class="muted" style="font-size:' + z.rec + 'px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums">' + esc(t.rec) + '</div>' : '') + '</div></div>';
    };
    var a = g.teams[0], b = g.teams[1], sc = function (t) { return '<span style="' + (g.state === 'post' && !t.winner ? 'opacity:.5;' : '') + '">' + esc(t.score) + '</span>'; };
    var mid = center || (played ? '<div style="display:flex;align-items:center;gap:' + Math.round(z.gap * 0.7) + 'px;font-size:' + z.score + 'px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1">' + sc(a) + '<span style="opacity:.35;font-weight:400">–</span>' + sc(b) + '</div>' :
      '<div style="font-size:' + Math.round(z.score * 0.5) + 'px;font-weight:800;opacity:.6">VS</div>');
    return '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:' + z.gap + 'px;height:' + z.h + 'px">' + side(a) + mid + side(b) + '</div>';
  }
  function gameStatus(g) { return '<span class="' + (g.state === 'in' ? 'live' : '') + '">' + esc(g.status) + '</span>'; }

  // ------------------------------------------------------------ backend (Apps Script)
  function loadBackend() {
    if (DEMO) { S.back = demoBack(); render(); return Promise.resolve(); }
    if (!C.appsScriptUrl) { S.backErr = 'setup'; render(); return Promise.resolve(); }
    return getJSON(C.appsScriptUrl + '?action=all&key=' + encodeURIComponent(C.appsScriptKey || ''), 45000).then(function (j) {
      if (j.error) throw new Error(j.error === 'bad key' ? 'the key in config.js doesn’t match KEY in Code.gs' : j.error);
      S.back = j; S.backErr = null; save('back', j); render();
    }).catch(function (e) {
      var why = /JSON|Unexpected token/i.test(e.message) ? 'the Apps Script sent a sign-in page — set its deployment to “Anyone”' : e.message;
      S.backErr = 'Couldn’t reach your Google data (' + why + ') — retrying';
      if (!S.back) { S.back = load('back'); if (S.back) render(); }
    });
  }
  function events() {
    var b = S.back; if (!b || !b.calendar) return null;
    if (b.calendar.error) { S.calErr = 'Calendar error: ' + b.calendar.error; return null; }
    S.calErr = null;
    S.calMissing = (b.calendar.missing || []).map(function (m) { return m.name + ': ' + m.why; });
    return (b.calendar.events || []).map(function (e) { return { title: e.title, start: new Date(e.start), end: new Date(e.end), allDay: e.allDay, who: e.calendar, color: e.color || '#ffb35c', location: e.location, description: e.description, leave: e.leave ? new Date(e.leave) : null, drive: e.drive || null }; })
      .sort(function (a, b) { return a.start - b.start; });
  }
  function photos() {
    var b = S.back; if (!b || !b.photos) return null;
    var all = b.photos.items || [], names = S.theme && S.theme.birthdayNames;
    if (names) { var mine = all.filter(function (p) { return p.person && names.indexOf(p.person) >= 0; }); if (mine.length) return mine; }
    return all;
  }
  var PHOTO_CACHE = {}, PHOTO_ORDER = [];
  function photoSrc(item, cb) { // family photos come through your Apps Script so the folder can stay private
    if (!item) return;
    if (item.url) return cb(item.url);
    if (PHOTO_CACHE[item.id]) return cb(PHOTO_CACHE[item.id]);
    getJSON(C.appsScriptUrl + '?action=photo&id=' + encodeURIComponent(item.id) + '&key=' + encodeURIComponent(C.appsScriptKey || ''), 45000).then(function (j) {
      if (!j.data) return;
      var uri = 'data:' + (j.mime || 'image/jpeg') + ';base64,' + j.data;
      PHOTO_CACHE[item.id] = uri; PHOTO_ORDER.push(item.id);
      while (PHOTO_ORDER.length > 10) delete PHOTO_CACHE[PHOTO_ORDER.shift()];
      cb(uri);
    }).catch(function () { /* try the next photo next time */ });
  }
  function showPhoto(elId) {
    var ph = photos(), el = $(elId); if (!el || !ph || !ph.length) return;
    var item = ph[S.photoIdx % ph.length];
    photoSrc(item, function (src) { var e2 = $(elId); if (e2) e2.style.backgroundImage = 'url("' + src + '")'; });
    var nxt = ph[(S.photoIdx + 1) % ph.length]; photoSrc(nxt, function () { });
  }
  function newsList() {
    var b = S.back; if (!b || !b.news) return null;
    var src = b.news.sources || {}, take = function (name, k) { return (src[name] || [])[k]; };
    var chicago = [];
    ['Chicago Tribune', 'Sun-Times', 'WGN', 'NBC 5', 'ABC 7'].forEach(function (name) { (src[name] || []).slice(0, 2).forEach(function (s) { chicago.push(Object.assign({ src: name }, s)); }); });
    chicago.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var used = {}, pickChicago = function () { // spread across outlets: newest story from an outlet not used yet
      for (var i = 0; i < chicago.length; i++) if (!used[chicago[i].src] && !chicago[i]._u) { chicago[i]._u = 1; used[chicago[i].src] = 1; return chicago[i]; }
      for (var j = 0; j < chicago.length; j++) if (!chicago[j]._u) { chicago[j]._u = 1; return chicago[j]; }
      return null;
    };
    var ap = function (k) { var s = take('AP', k); return s ? Object.assign({ src: 'AP' }, s) : null; };
    var sl = function (k) { var s = take('Shaw Local', k); return s ? Object.assign({ src: 'Shaw Local' }, s) : null; };
    var list = [ap(0), pickChicago(), sl(0), ap(1), pickChicago(), sl(1)].map(function (x) { return x || pickChicago(); });
    return list.filter(Boolean);
  }
  var MODEL_STYLE = {
    'NBAPropSignal': { bg: 'rgba(14,38,90,0.94)', edge: '#3466c2', acc: '#8cc8ff', font: "'Barlow Condensed', sans-serif" },
    'Moonshot': { bg: 'rgba(30,14,60,0.94)', edge: '#6a4ab8', acc: '#d2b2ff', font: "'Space Grotesk', sans-serif" },
    'NFL Props': { bg: 'rgba(10,56,32,0.94)', edge: '#2f8a58', acc: '#8ff0b8', font: "'Oswald', sans-serif" },
    'CFB Model': { bg: 'rgba(72,18,18,0.94)', edge: '#9a4430', acc: '#ffbe98', font: "'Roboto Slab', serif" }
  };
  function models() {
    var b = S.back; if (!b || !b.plays) return null;
    return (b.plays.models || []).map(function (m) { return Object.assign({}, MODEL_STYLE[m.name] || { bg: 'rgba(30,30,40,0.94)', edge: '#666', acc: '#ffffff', font: 'inherit' }, m); });
  }

  // ------------------------------------------------------------ screens
  function render() {
    var el = $('screen'), fresh = S.lastScreen !== S.screen || S.lastPage !== S.page;
    S.lastScreen = S.screen; S.lastPage = S.page;
    var brief = S.screen === 'home' && isBriefing();
    var html = brief ? '<section class="bleed">' + briefingBleed() + '</section>' : S.screen === 'home' ? homeHTML() : fullHTML();
    var cur = el.lastElementChild;
    if (fresh || !cur) { // new screen or page: fade it in over the old one, then remove the old one
      var olds = [].slice.call(el.children);
      olds.forEach(function (o) { o.classList.add('leaving'); [].forEach.call(o.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); }); setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 950); });
      var layer = document.createElement('div'); layer.className = 'layer' + (STATIC ? '' : ' entering'); layer.innerHTML = html; el.appendChild(layer);
    } else cur.innerHTML = html;
    var st = $('stage'), imm = S.screen !== 'home' || brief; st.classList.toggle('immersive', imm); if (!imm) st.classList.remove('peek');
    st.classList.toggle('night', S.screen === 'night'); st.classList.toggle('nocorner', brief || S.screen === 'night' || S.screen === 'alert');
    $('nav').style.display = imm && S.screen !== 'night' ? 'flex' : 'none'; corner();
    $('navbar').innerHTML = ORDER.map(function (k) { return '<button type="button" data-go="' + k + '" class="' + (k === S.screen ? 'on' : '') + '">' + LABELS[k] + '</button>'; }).join('');
    if (S.screen === 'photos' || S.screen === 'home') hookPhotos();
    var p = S.screen === 'home' ? '' : curPage();
    if (S.screen === 'live' && p) { var lg = findGame(p.slice(2)); if (lg && liveState(lg) === 'post' && !S.finalShown[lg.id]) { S.finalShown[lg.id] = Date.now(); save('finalShown', S.finalShown); } }
    if (!(S.detail && S.detail.kind === 'radar')) stopRadar();
    if (S.screen === 'weather' && p === 'radar') startRadar();
    if (S.screen === 'news' && p && p.indexOf('s:') === 0) drawQR((newsStories() || [])[+p.slice(2)]);
  }
  function homeHTML() {
    var n = now(), ev = events(), list, label = 'Family today';
    if (ev) {
      list = ev.filter(function (e) { return sameDay(e.start, n) && (e.allDay || e.end > n); });
      if (!list.length) { label = 'Family tomorrow'; list = ev.filter(function (e) { return dayDiff(n, e.start) === 1; }); }
      if (!list.length) { label = 'Coming up'; list = ev.filter(function (e) { return e.end > n; }).map(function (e) { return Object.assign({}, e, { soon: true }); }); }
    }
    var tags = weeklyTags().concat(leaveTags(ev)), tagRow = tags.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + tags.slice(0, 2).map(function (t) { return tagChip(t, true); }).join('') + '</div>' : '';
    var fam = '<div class="lbl">' + label + '</div>' + tagRow + (!ev ? note(S.backErr === 'setup' ? 'Calendar not connected yet' : esc(S.calErr || (S.backErr ? 'Can\u2019t reach your Google data — open Family for details' : 'Loading…'))) :
      !list.length ? note(S.calMissing && S.calMissing.length ? 'Can\u2019t open ' + esc(S.calMissing.join(' \u00b7 ')) : 'Nothing on the calendar this week') : list.slice(0, tags.length ? 3 : 4).map(function (e) {
        return '<div style="display:flex;align-items:center;gap:10px"><div style="width:9px;height:9px;border-radius:50%;background:' + esc(e.color) + ';flex-shrink:0"></div>' +
          '<div style="min-width:0"><div class="ellip" style="font-size:16px;font-weight:700">' + esc(e.title) + '</div><div class="muted ellip" style="font-size:13px">' + (e.soon ? DOW[e.start.getDay()] + ' ' : '') + (e.allDay ? 'All day' : hm(e.start)) + (e.leave && !e.soon && e.start > n ? ' · Leave ' + hm(e.leave).replace(' ', '') : ' · ' + esc(e.who)) + '</div></div></div>';
      }).join(''));
    var ph = photos(), cur = ph && ph.length ? ph[S.photoIdx % ph.length] : null;
    var photo = cur ? '<div id="homephoto" style="flex:1;border-radius:var(--r2);background:rgba(0,0,0,0.3) center/cover no-repeat"></div>' :
      '<div class="tile" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">' + icon('photo', 48, 1.3) + '<div style="font-size:16px;font-weight:700">Family photos</div>' + (ph ? '<div class="muted" style="font-size:13px">Album is empty</div>' : '') + '</div>';
    var games = S.games.slice(0, 3);
    var sc = '<div class="lbl">Scores</div>' + (games.length ? games.map(function (g) {
      return '<div style="display:flex;flex-direction:column;gap:3px"><div class="muted" style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase"><span>' + esc(g.lg) + '</span>' + gameStatus(g) + '</div>' +
        matchupHTML(g, 'mini') + '</div>';
    }).join('') : note(S.scoresErr || 'Loading scores…'));
    var md = models();
    var pl = '<div class="lbl">Today’s plays</div>' + (!md ? note(S.backErr === 'setup' ? 'Model sheets not connected yet' : 'Loading…') : md.slice(0, 4).map(function (m) {
      var top = m.plays && m.plays[0] ? m.plays[0].play : (m.note || 'No plays yet today');
      return '<div style="display:flex;flex-direction:column;gap:4px;padding:8px 11px;border-radius:10px;background:' + m.bg + ';border:1px solid ' + m.edge + '">' +
        '<div style="font-family:' + m.font + ';font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:' + m.acc + '">' + esc(m.name) + '</div>' +
        '<div class="ellip" style="font-size:14px;font-weight:700">' + esc(top) + '</div></div>';
    }).join(''));
    var nw = newsList();
    var news = '<div class="lbl">Top news</div>' + (!nw ? note(S.backErr === 'setup' ? 'News feeds not connected yet' : 'Loading…') : nw.filter(Boolean).slice(0, 4).map(function (s) {
      return '<div style="display:flex;gap:10px;align-items:center">' + thumb(s.image, 52, 52) +
        '<div style="min-width:0"><div class="clamp2" style="font-size:14px;font-weight:700;line-height:1.2">' + esc(s.title) + '</div><div class="muted" style="font-size:12px">' + esc(s.src) + '</div></div></div>';
    }).join(''));
    return '<div class="home">' +
      '<button type="button" class="tap frost" data-go="family">' + fam + '</button>' +
      '<button type="button" class="tap frost" data-go="photos" style="padding:12px">' + photo + '</button>' +
      '<button type="button" class="tap frost" data-go="scores">' + sc + '</button>' +
      '<button type="button" class="tap frost" data-go="plays">' + pl + '</button>' +
      '<button type="button" class="tap frost" data-go="news">' + news + '</button></div>';
  }
  function thumb(src, w, h) {
    var ph = '<div style="width:' + (w === '100%' ? '100%' : w + 'px') + ';height:' + h + 'px;flex-shrink:0;border-radius:8px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;overflow:hidden">';
    return ph + (src ? '<img src="' + esc(src) + '" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : icon('photo', 22, 1.4)) + '</div>';
  }

  function fullHTML() {
    var pg = pageList(S.screen), p = curPage();
    if (isBleed(p)) return '<section class="bleed">' + bleedHTML(p) + '</section>';
    var WXT = { now: 'Right now', hours: 'Next 12 hours', week: 'The week ahead', sky: 'Sun & moon', radar: 'Live radar' };
    var t = { family: ['Family schedule', 'From the family calendar'], photos: [S.theme && S.theme.birthdayNames ? S.theme.birthdayNames.join(' & ') + '\u2019s photos' : 'Family photos', ''],
      scores: ['Scores & games', String(p).indexOf('grid') === 0 ? (S.teamMiss && S.teamMiss.length ? 'Couldn\u2019t find ' + S.teamMiss.join(', ') + ' — check config.js' : 'Tap a game for the box score') : ''], plays: ['Today’s plays', 'Tap a play for the breakdown · 1 unit flat'],
      news: ['Top news', pg.length > 1 ? 'Story ' + (S.page + 1) + ' of ' + pg.length : ''], weather: ['Weather', (WXT[p] || '') + ' · ' + L.name] }[S.screen];
    if (S.screen === 'scores' && String(p).indexOf('grid') !== 0) { var g = findGame(p.slice(2)); if (g) t = [g.teams[0].name + (g.teams[0].home ? ' vs ' : ' at ') + g.teams[1].name, g.lg + (g.state === 'pre' ? ' · Up next' : g.state === 'in' ? ' · Live' : ' · Final')]; }
    var body = S.screen === 'scores' ? scoresBody(p) : S.screen === 'news' ? (p === 'empty' ? note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…')) : newsPage(+p.slice(2))) :
      S.screen === 'weather' ? weatherPage(p) : { family: familyHTML, photos: photosHTML, plays: playsHTML }[S.screen]();
    if (S.screen === 'photos') { var cg = curGroup(); t[1] = cg && cg[0] ? cg[0].album : ''; }
    return '<section class="full frost"><header><h1 class="ellip">' + esc(t[0]) + '</h1><div style="display:flex;align-items:center;gap:18px;flex-shrink:0"><div class="muted ellip">' + (S.screen === 'family' ? familyLegend() : esc(t[1])) + '</div>' + dotsHTML(pg) + '</div></header>' + body + '</section>';
  }
  function familyHTML() {
    var ev = events(); if (!ev) return note(S.backErr === 'setup' ? SETUP : esc(S.calErr || S.backErr || 'Loading…'));
    var n = now(), idx = function (e) { return ev.indexOf(e); };
    var isDinner = function (e) { return /dinner/i.test(e.who || ''); };
    var today = ev.filter(function (e) { return onDay(e, n) && !isDinner(e); });
    var dinner = ev.filter(function (e) { return onDay(e, n) && isDinner(e); })[0];
    var multi = function (e) { return e.end - e.start > 26 * 3600000; };
    var thru = function (e) { var last = new Date(e.end.getTime() - (e.allDay ? 1 : 0)); return 'Thru ' + DOW[last.getDay()]; };
    var when = function (e) { return multi(e) ? thru(e) : e.allDay ? 'All day' : hm(e.start); };
    var later = ev.filter(function (e) { var dd = dayDiff(n, e.start); return dd >= 1 && dd <= 6 && !isDinner(e); });
    var chip = function (e, fs) { return '<span class="ellip" style="flex-shrink:0;max-width:150px;padding:3px 10px;border-radius:999px;font-size:' + (fs || 13) + 'px;font-weight:700;background:' + esc(e.color) + '33;color:#fff;border:1px solid ' + esc(e.color) + '88">' + esc(e.who) + '</span>'; };
    // ---- today
    var left = n.getHours() < 12 ? 'A free day ahead' : n.getHours() < 17 ? 'A free afternoon' : 'Free evening — enjoy it';
    var rows = today.slice(0, 4).map(function (e) {
      var past = !e.allDay && e.end < n, nowOn = !e.allDay && e.start <= n && e.end > n;
      return '<button type="button" class="tap" data-open="event:' + idx(e) + '" style="align-items:center;gap:14px;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,' + (nowOn ? .14 : .06) + ');' + (past ? 'opacity:.45;' : '') + '">' +
        '<div style="width:5px;align-self:stretch;border-radius:3px;background:' + esc(e.color) + ';flex-shrink:0"></div>' +
        '<div style="width:92px;flex-shrink:0;font-size:17px;font-weight:800">' + esc(when(e)) + (nowOn ? '<div style="font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--accent)">NOW</div>' : '') + '</div>' +
        '<div class="ellip" style="flex:1;font-size:21px;font-weight:700">' + esc(e.title) + '</div>' + (e.leave && e.start > n ? '<span style="flex-shrink:0;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:800;background:' + (e.leave - n < 3600000 ? 'var(--accent);color:var(--ink)' : 'rgba(255,255,255,.14)') + '">🚗 ' + esc(hm(e.leave)) + '</span>' : chip(e)) + '</button>';
    }).join('');
    var next = later[0], nextCard = '';
    if (!rows && next) {
      var hrs = Math.round((next.start - n) / 3600000), inTxt = hrs < 24 ? 'in ' + hrs + ' hour' + (hrs === 1 ? '' : 's') : 'in ' + Math.round(hrs / 24) + ' day' + (Math.round(hrs / 24) === 1 ? '' : 's');
      nextCard = '<button type="button" class="tap" data-open="event:' + idx(next) + '" style="flex-direction:column;align-items:flex-start;gap:4px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.07);border-left:5px solid ' + esc(next.color) + '">' +
        '<div class="lbl">Next up · ' + esc(inTxt) + '</div><div class="ellip" style="max-width:100%;font-size:22px;font-weight:800">' + esc(next.title) + '</div>' +
        '<div class="muted" style="font-size:15px">' + esc(DOWL[next.start.getDay()] + (next.allDay ? '' : ' ' + hm(next.start)) + ' · ' + next.who) + '</div></button>';
    }
    var todayTile = '<div class="tile" style="display:flex;flex-direction:column;gap:12px;padding:18px 22px;min-height:0;overflow:hidden">' +
      '<div style="display:flex;align-items:center;gap:16px;flex-shrink:0"><div class="head" style="font-size:78px;line-height:.85;color:var(--accent)">' + n.getDate() + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:2px"><div style="font-size:24px;font-weight:800">' + DOWL[n.getDay()] + '</div><div class="muted" style="font-size:16px">' + MONL[n.getMonth()] + ' · ' +
      (today.length ? today.length + ' thing' + (today.length === 1 ? '' : 's') + ' today' : 'Nothing scheduled') + '</div></div>' +
      (weeklyTags().length ? '<div style="margin-left:auto">' + tagChip(weeklyTags()[0], true) + '</div>' : '') + '</div>' +
      (rows || '<div class="head" style="font-size:30px;line-height:1.15;flex-shrink:0">' + left + '</div>' + nextCard) +
      (dinner ? '<div style="margin-top:auto;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.08);flex-shrink:0"><span style="font-size:24px">🍽️</span><div style="min-width:0"><div class="lbl">Tonight’s dinner</div><div class="ellip" style="font-size:19px;font-weight:700">' + esc(dinner.title) + '</div></div></div>' : '') + '</div>';
    // ---- coming up, grouped by day
    var groups = [];
    for (var gd = 1; gd <= 6; gd++) {
      var day = new Date(n.getFullYear(), n.getMonth(), n.getDate() + gd);
      var gl = later.filter(function (e) { return sameDay(e.start, day); }), gdin = ev.filter(function (e) { return isDinner(e) && onDay(e, day); })[0];
      if (gl.length || gdin) groups.push({ d: day, list: gl, dinner: gdin });
    }
    var budget = 430, up = groups.map(function (g) { // fill the panel by height: day header 34px, event 40px, dinner 32px
      if (budget < 70) return '';
      var dd = dayDiff(n, g.d), name = dd === 1 ? 'Tomorrow' : DOWL[g.d.getDay()];
      budget -= 34 + (g.dinner ? 32 : 0); var shown = g.list.slice(0, Math.max(g.list.length ? 1 : 0, Math.floor(budget / 40))); budget -= shown.length * 40;
      return '<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)">' + name + '</span><span class="muted" style="font-size:14px">' + MON[g.d.getMonth()] + ' ' + g.d.getDate() + '</span>' +
        (g.list.length > shown.length ? '<span class="muted" style="font-size:13px">+' + (g.list.length - shown.length) + ' more</span>' : '') + '</div>' +
        shown.map(function (e) {
          return '<button type="button" class="tap" data-open="event:' + idx(e) + '" style="align-items:center;gap:14px;padding:4px 0">' +
            '<div style="width:5px;height:30px;border-radius:3px;background:' + esc(e.color) + ';flex-shrink:0"></div><div class="muted" style="width:86px;flex-shrink:0;font-size:16px;font-weight:700">' + esc(when(e)) + '</div>' +
            '<div class="ellip" style="flex:1;font-size:21px;font-weight:700">' + esc(e.title) + '</div>' + chip(e) + '</button>';
        }).join('') + (g.dinner ? '<button type="button" class="tap" data-open="event:' + idx(g.dinner) + '" style="align-items:center;gap:14px;padding:2px 0"><div style="width:5px;height:24px;border-radius:3px;background:' + esc(g.dinner.color) + ';flex-shrink:0"></div>' +
          '<div class="muted" style="width:86px;flex-shrink:0;font-size:15px;font-weight:700">Dinner</div><div class="ellip" style="flex:1;font-size:18px;font-weight:600">🍽️ ' + esc(g.dinner.title) + '</div></button>' : '') + '</div>';
    }).join('');
    var upTile = '<div class="tile" style="display:flex;flex-direction:column;gap:14px;padding:18px 24px;min-height:0;overflow:hidden"><div class="lbl">Coming up</div>' + (up || note('Nothing else on the calendar this week')) + '</div>';
    // ---- 7-day strip: how busy each day is, colored by person
    var strip = '';
    for (var k = 0; k < 7; k++) {
      var d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + k), list = ev.filter(function (e) { return onDay(e, d); });
      strip += '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 4px;border-radius:12px;' + (k === 0 ? 'background:var(--accent);color:var(--ink)' : 'background:rgba(255,255,255,.06)') + '">' +
        '<div style="font-size:13px;font-weight:800;letter-spacing:.08em;opacity:.8">' + DOW[d.getDay()].toUpperCase() + '</div><div style="font-size:24px;font-weight:800;line-height:1">' + d.getDate() + '</div>' +
        '<div style="display:flex;gap:4px;height:9px">' + list.slice(0, 5).map(function (e) { return '<span style="width:9px;height:9px;border-radius:50%;background:' + esc(e.color) + ';box-shadow:0 0 0 1.5px rgba(0,0,0,.25)"></span>'; }).join('') + '</div></div>';
    }
    var warn = S.calMissing && S.calMissing.length ? '<div style="padding:10px 16px;border-radius:10px;background:rgba(255,120,80,0.18);border:1px solid rgba(255,140,100,0.5);font-size:15px">Can’t open ' + esc(S.calMissing.join(' · ')) + '</div>' : '';
    return warn + '<div style="display:flex;flex-direction:column;gap:12px;flex:1;min-height:0">' +
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:12px;flex:1;min-height:0">' + todayTile + upTile + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;height:82px;flex-shrink:0">' + strip + '</div></div>';
  }
  function familyLegend() { // header: each person's color
    var ev = events() || [], seen = {}, out = [];
    ev.forEach(function (e) { if (e.who && !seen[e.who]) { seen[e.who] = 1; out.push(e); } });
    return out.slice(0, 7).map(function (e) { return '<span style="display:inline-flex;align-items:center;gap:6px;margin-left:14px"><span style="width:10px;height:10px;border-radius:50%;background:' + esc(e.color) + '"></span>' + esc(e.who) + '</span>'; }).join('');
  }

  // Photos fill the frame: three portrait photos side by side, or two landscape ones
  function photoGroups() {
    var ph = photos(); if (!ph || !ph.length) return [];
    var P = ph.filter(function (o) { return o.o === 'p'; }), Lp = ph.filter(function (o) { return o.o !== 'p'; });
    var chunk = function (arr, k) { var out = []; for (var i = 0; i < arr.length; i += k) { var g = []; for (var j = 0; j < Math.min(k, arr.length); j++) g.push(arr[(i + j) % arr.length]); out.push(g); } return out; };
    var pg = chunk(P, 2), lg = chunk(Lp, 1), out = []; // full screen: two tall photos side by side, or one wide photo
    for (var i = 0; i < Math.max(pg.length, lg.length); i++) { if (pg[i]) out.push(pg[i]); if (lg[i]) out.push(lg[i]); }
    return out;
  }
  function photoDate(it) { var d = it && it.taken ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(it.taken) ? it.taken + 'T12:00:00' : String(it.taken).replace(' ', 'T')) : null; return d && !isNaN(d) ? d : null; }
  function yearsAgo(it) { var d = photoDate(it), n = now(); return d && d.getMonth() === n.getMonth() && d.getDate() === n.getDate() && d.getFullYear() < n.getFullYear() ? n.getFullYear() - d.getFullYear() : 0; }
  function otdGroups() { // photos taken on today's date in past years: tall ones in pairs, wide ones alone
    var ph = (photos() || []).filter(yearsAgo).sort(function (a, b) { return yearsAgo(a) - yearsAgo(b); }); if (!ph.length) return [];
    var P = ph.filter(function (o) { return o.o === 'p'; }), out = ph.filter(function (o) { return o.o !== 'p'; }).map(function (x) { return [x]; });
    for (var i = 0; i < P.length; i += 2) out.push(P[i + 1] ? [P[i], P[i + 1]] : [P[i]]);
    return out.slice(0, 2);
  }
  function curGroup() {
    var o = otdGroups(); if (S.screen === 'photos' && S.page < o.length) return o[S.page];
    var g = photoGroups(); return g.length ? g[(S.photoIdx + S.page - (S.screen === 'photos' ? o.length : 0)) % g.length] : null;
  }
  function photosHTML() {
    var ph = photos(); if (!ph) return note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…'));
    if (!ph.length) return note('Add photos to your dashboard photo folder in Google Drive.');
    var g = curGroup() || [];
    return '<div style="display:grid;grid-template-columns:repeat(' + g.length + ',minmax(0,1fr));gap:12px;flex:1;min-height:0">' + g.map(function (it, i) {
      var d = it.taken ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(it.taken) ? it.taken + 'T12:00:00' : String(it.taken).replace(' ', 'T')) : null; if (d && isNaN(d)) d = null;
      return '<div style="position:relative;border-radius:var(--r2);overflow:hidden;background:rgba(0,0,0,.35)"><div id="pc' + i + '" class="pcell" style="position:absolute;inset:0;background:center/cover no-repeat;opacity:0;transition:opacity .6s"></div>' +
        (d ? '<div style="position:absolute;left:12px;bottom:12px;padding:5px 12px;border-radius:999px;background:rgba(0,0,0,.55);font-size:14px;font-weight:700">' + esc((it.person ? it.person + ' · ' : '') + MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function loadCollage() {
    var g = curGroup() || [];
    g.forEach(function (it, i) { photoSrc(it, function (src) { var el = $('pc' + i); if (el && curGroup() && curGroup()[i] === it) { el.style.backgroundImage = 'url("' + src + '")'; el.style.opacity = 1; } }); });
    var all = photoGroups(), nx = all.length ? all[(S.photoIdx + S.page + 1) % all.length] : []; (nx || []).forEach(function (it) { photoSrc(it, function () { }); });
  }
  function hookPhotos() { if (S.screen === 'home') showPhoto('homephoto'); else loadCollage(); }

  function scoresHTML(pg) {
    if (!S.games.length) return note(esc(S.scoresErr || 'Loading scores…'));
    pg = pg || 0;
    var tiles = S.games.slice(pg * 6, pg * 6 + 6).map(function (g, k) {
      var i = pg * 6 + k;
      return '<button type="button" class="tap tile" data-open="game:' + i + '" style="flex-direction:column;justify-content:center;gap:6px;padding:12px 14px">' +
        '<div class="muted" style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase"><span>' + esc(g.lg) + '</span>' + gameStatus(g) + '</div>' +
        matchupHTML(g, 'tile') + '</button>';
    });
    while (tiles.length < 6) tiles.push('<div class="tile">' + note('No other games right now') + '</div>');
    return '<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))">' + tiles.join('') + '</div>';
  }

  function playsHTML() {
    var md = models(); if (!md) return note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…'));
    var cards = md.slice(0, 3).map(function (m, mi) {
      var rows = (m.plays || []).slice(0, 6).map(function (p, ri) {
        var res = /^HIT/i.test(p.status) ? '#5fd38a' : /^MISS/i.test(p.status) ? '#ff7a7a' : '';
        return '<button type="button" class="tap" data-open="play:' + mi + ':' + ri + '" style="justify-content:space-between;align-items:center;gap:10px;padding:6px 12px;border-radius:9px;background:rgba(255,255,255,0.07);flex-shrink:0' + (res ? ';box-shadow:inset 4px 0 0 ' + res : '') + '">' +
          '<div style="min-width:0"><div class="ellip" style="font-size:16px;font-weight:700">' + esc(p.play) + '</div><div class="ellip" style="font-size:12px;color:#dfe5ee">' + esc(p.line || '') + '</div></div>' +
          '<div style="font-family:' + m.font + ';font-size:17px;font-weight:700;color:' + m.acc + ';flex-shrink:0">' + esc(p.odds || '') + '</div></button>';
      }).join('');
      return '<div style="display:flex;flex-direction:column;gap:6px;padding:12px 18px;border-radius:14px;background:' + m.bg + ';border:1px solid ' + m.edge + ';min-height:0">' +
        '<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0"><span style="font-family:' + m.font + ';font-size:22px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:' + m.acc + '">' + esc(m.name) + '</span><span style="font-size:14px;font-weight:700;color:#fff">' + esc(m.record || '') + '</span></div>' +
        (rows || '<div class="note" style="color:#dfe5ee">' + esc(m.note || 'No plays yet today') + '</div>') + '<div style="font-size:11px;color:#dfe5ee;margin-top:auto">' + esc(m.source || '') + '</div></div>';
    });
    return '<div class="grid" style="grid-template-columns:repeat(' + Math.max(1, cards.length) + ',minmax(0,1fr))">' + cards.join('') + '</div>';
  }

  // ------------------------------------------------------------ pages: Scores, News and Weather cycle through full-screen pages
  function findGame(id) { return S.games.concat(S.mine || []).filter(function (x) { return String(x.id) === String(id); })[0]; }
  function featureGames() { // full pages: anything live, your teams' finals from the last 2 days, and their games in the next 4 days
    var n = now(), seen = {}, list = S.games.concat(S.mine || []).filter(function (g) {
      if (seen[g.id]) return false; seen[g.id] = 1;
      if (!g.followed && !g.morris) return false;
      if (g.state === 'in') return true;
      return g.state === 'post' ? n - g.date < 2 * 86400000 : g.date - n < 4 * 86400000;
    });
    var rank = function (g) { return g.state === 'in' ? 0 : g.state === 'post' ? 1 : 2; };
    return list.sort(function (a, b) { return rank(a) - rank(b) || (rank(a) === 1 ? b.date - a.date : a.date - b.date); }).slice(0, 8);
  }
  function pageList(screen) {
    if (screen === 'scores') { var gp = []; for (var i = 0; i < Math.max(1, Math.ceil(S.games.length / 6)); i++) gp.push('grid:' + i); return gp.concat(featureGames().map(function (g) { return 'g:' + g.id; }), standingsLeagues().map(function (l) { return 'st:' + l; })); }
    if (screen === 'news') { var nw = newsStories(); return nw && nw.length ? nw.map(function (s, i) { return 's:' + i; }) : ['empty']; }
    if (screen === 'weather') return S.alerts.map(function (a, i) { return 'al:' + i; }).concat(S.wx ? ['now', 'hours', 'week', 'sky', 'radar'] : S.alerts.length ? [] : ['empty']);
    if (screen === 'photos') { var pgN = Math.min(3, photoGroups().length) + otdGroups().length; var out = []; for (var q = 0; q < Math.max(1, pgN); q++) out.push('c:' + q); return out; }
    if (screen === 'family') { var fp = ['main']; if (boardLists().grocery || boardLists().notes.length) fp.push('board'); if (countdownItems().length) fp.push('cd'); return fp; }
    if (screen === 'live') { var lv = liveList(); return lv.length ? lv.map(function (g) { return 'g:' + g.id; }) : ['none']; }
    if (screen === 'alert') { var ua = S.alerts.filter(isUrgent); return ua.length ? ua.map(function (a, i) { return 'al:' + S.alerts.indexOf(a); }) : ['none']; }
    if (screen === 'night') return ['main'];
    return ['main'];
  }
  function pageDur() {
    var t = C.timing;
    if (S.screen === 'home') return t.home;
    var cp = String(curPage());
    if (S.screen === 'night') return 60;
    if (S.screen === 'alert') return Math.max(DEMO ? 2 : 30, Math.round(((C.alerts && C.alerts.takeoverSec) || 150) / Math.max(1, pageList('alert').length)));
    if (S.screen === 'live') return t.live || 40;
    if (cp.indexOf('st:') === 0) return t.standings || 15;
    if (cp.indexOf('al:') === 0) return t.alert || 15;
    if (S.screen === 'family' && cp !== 'main') return t.board || 20;
    if (S.screen === 'news') return t.story || 10;
    if (S.screen === 'scores') return String(curPage()).indexOf('grid') === 0 ? (t.scoresGrid || 15) : (t.game || t.page || 12);
    if (S.screen === 'weather') return t.weather || t.page || 12;
    if (S.screen === 'photos') return t.photo || 10;
    return t.screen;
  }
  function curPage() { var pg = pageList(S.screen); return pg[S.page < pg.length ? S.page : 0]; }
  function dotsHTML(pg) {
    if (pg.length < 2) return '';
    return '<div class="dots">' + pg.map(function (p, i) { return '<button type="button" data-page="' + i + '" class="' + (i === S.page ? 'on' : '') + '" aria-label="Page ' + (i + 1) + '" style="--dur:' + pageDur() + 's"></button>'; }).join('') + '</div>';
  }

  // ---- scores
  function scoresBody(p) {
    if (p.indexOf('grid') === 0) return scoresHTML(+p.split(':')[1] || 0);
    var g = findGame(p.slice(2));
    if (!g) return note('Game not found');
    var sum = S.sum[g.id] && S.sum[g.id].j;
    if (!sum && !g.morris) ensureSummary(g);
    var teams = g.teams.map(function (t, i) { // fill in records from the game summary
      var r = sum && sum.recs && sum.recs[t.abbr]; return r && !t.rec ? Object.assign({}, t, { rec: r }) : t;
    });
    var gg = Object.assign({}, g, { teams: teams });
    var badge = function (txt, live) { return '<div style="display:inline-flex;align-self:center;padding:4px 14px;border-radius:999px;font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;' + (live ? 'background:#c62828;color:#fff' : 'background:rgba(255,255,255,.14)') + '">' + esc(txt) + '</div>'; };
    if (g.state === 'pre') {
      var d = g.date, center = '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;line-height:1">' + badge(sameDay(d, now()) ? 'Today' : DOWL[d.getDay()]) +
        '<div style="font-size:54px;font-weight:800">' + esc(hm(d).replace(' ', ' ')) + '</div><div class="muted" style="font-size:16px">' + esc(MONL[d.getMonth()] + ' ' + d.getDate()) + '</div></div>';
      return '<div style="display:flex;flex-direction:column;gap:16px;flex:1;min-height:0">' + matchupHTML(gg, 'page', center) +
        '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:14px;flex:1;min-height:0">' + gameInfoHTML(g, sum) + storyHTML(g, sum) + '</div></div>';
    }
    var scoreMid = '<div style="display:flex;flex-direction:column;align-items:center;gap:10px">' + badge(g.state === 'in' ? 'Live · ' + g.status : g.status, g.state === 'in') +
      '<div style="display:flex;align-items:center;gap:16px;font-size:88px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1">' +
      '<span style="' + (g.state === 'post' && !teams[0].winner ? 'opacity:.5' : '') + '">' + esc(teams[0].score) + '</span><span style="opacity:.35;font-weight:400">–</span>' +
      '<span style="' + (g.state === 'post' && !teams[1].winner ? 'opacity:.5' : '') + '">' + esc(teams[1].score) + '</span></div></div>';
    return '<div style="display:flex;flex-direction:column;gap:16px;flex:1;min-height:0">' + matchupHTML(gg, 'page', scoreMid) +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;flex:1;min-height:0">' + lineScoreHTML(g, sum) + leadersHTML(g, sum) + '</div></div>';
  }
  function panel(label, inner, extra) { return '<div class="tile" style="display:flex;flex-direction:column;gap:10px;padding:16px 20px;min-height:0;overflow:hidden;' + (extra || '') + '"><div class="lbl">' + label + '</div>' + inner + '</div>'; }
  function lineScoreHTML(g, sum) {
    if (g.morris) return panel('Final', '<div style="font-size:18px">' + esc((g.morris.home ? 'vs ' : 'at ') + (g.morris.opponent || '')) + '</div><div class="muted" style="font-size:16px">' + esc(g.morris.notes || '') + '</div>');
    if (DEMO) return panel('Box score', note('Quarter-by-quarter scoring from ESPN'));
    if (!sum) return panel('Box score', note('Loading…'));
    var rows = sum.lines, n = Math.max.apply(null, rows.map(function (r) { return r.ls.length; }).concat([g.sport === 'baseball' ? 9 : g.sport === 'hockey' ? 3 : /college-basketball/.test(g.league) ? 2 : 4]));
    var reg = g.sport === 'baseball' ? 99 : g.sport === 'hockey' ? 3 : /college-basketball/.test(g.league) ? 2 : 4;
    var per = function (i) {
      if (i > reg) return n - reg > 1 ? 'OT' + (i - reg) : 'OT';
      return g.sport === 'hockey' ? 'P' + i : reg === 2 ? 'H' + i : g.sport === 'baseball' ? String(i) : 'Q' + i;
    };
    var cols = 'grid-template-columns:minmax(0,2.2fr) repeat(' + (n + 1) + ',minmax(0,1fr))';
    var head = '<div class="muted" style="display:grid;' + cols + ';gap:6px;font-size:14px;font-weight:700;text-align:center"><span></span>';
    for (var i = 1; i <= n; i++) head += '<span>' + per(i) + '</span>';
    head += '<span>T</span></div>';
    var body = rows.map(function (r) {
      var t = g.teams.filter(function (x) { return x.abbr === r.abbr; })[0] || { abbr: r.abbr, logo: r.logo, c1: NEUTRAL.c1 };
      var ls = r.ls.map(function (v) { return '<span>' + esc(v) + '</span>'; }).join(''); for (var k = r.ls.length; k < n; k++) ls += '<span class="muted">–</span>';
      return '<div style="display:grid;' + cols + ';gap:6px;align-items:center;font-size:24px;font-weight:700;text-align:center;font-variant-numeric:tabular-nums">' +
        '<span style="display:flex;align-items:center;gap:10px;text-align:left">' + logoHTML(t, 30) + esc(r.abbr) + '</span>' + ls + '<span style="font-weight:800">' + esc(r.total) + '</span></div>';
    }).join('');
    var stats = (sum.stats || []).slice(0, 3).map(function (s) {
      return '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;font-size:17px"><b style="text-align:left">' + esc(s.a) + '</b><span class="muted" style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">' + esc(s.label) + '</span><b style="text-align:right">' + esc(s.b) + '</b></div>';
    }).join('');
    return panel('Box score', head + body + (stats ? '<div style="height:1px;background:rgba(255,255,255,.12);margin:2px 0"></div>' + stats : ''), 'gap:8px');
  }
  function leadersHTML(g, sum) {
    if (g.morris) return panel('Where', '<div style="font-size:18px">' + esc(g.morris.location || (g.morris.home ? 'Morris' : '')) + '</div>');
    if (DEMO) return panel('Game leaders', note('Top performers for each team from ESPN'));
    if (!sum) return panel('Game leaders', note('Loading…'));
    if (!sum.leaders.length) return panel('Game leaders', note('Not available yet'));
    var person = function (x, right) {
      if (!x) return '<div></div>';
      var face = x.head ? '<img src="' + esc(x.head) + '" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.12);flex-shrink:0" onerror="this.style.visibility=\'hidden\'">' : '<div style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.12);flex-shrink:0"></div>';
      return '<div style="display:flex;align-items:center;gap:10px;min-width:0;' + (right ? 'flex-direction:row-reverse;text-align:right' : '') + '">' + face +
        '<div style="min-width:0"><div class="ellip" style="font-size:16px;font-weight:800">' + esc(x.name) + '</div><div class="muted ellip" style="font-size:14px">' + esc(x.stat) + '</div></div></div>';
    };
    return panel('Game leaders', sum.leaders.slice(0, 3).map(function (c) {
      return '<div style="display:grid;grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr);gap:10px;align-items:center">' + person(c.a, false) +
        '<div class="muted" style="text-align:center;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;line-height:1.2">' + esc(c.label) + '</div>' + person(c.b, true) + '</div>';
    }).join(''), 'justify-content:flex-start');
  }
  function gameInfoHTML(g, sum) {
    var rows = [];
    if (g.morris) { rows.push(['Where', g.morris.location || (g.morris.home ? 'Morris' : '')]); if (g.morris.notes) rows.push(['Notes', g.morris.notes]); }
    else if (DEMO) rows = [['Where', '[Stadium]'], ['TV', '[Network]'], ['Line', '[Spread] · O/U [Total]']];
    else if (sum) { if (sum.venue) rows.push(['Where', sum.venue]); if (sum.tv) rows.push(['TV', sum.tv]); if (sum.line) rows.push(['Line', sum.line]); }
    var inner = rows.length ? rows.map(function (r) { return '<div style="display:flex;flex-direction:column;gap:2px"><div class="muted" style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">' + esc(r[0]) + '</div><div style="font-size:20px;font-weight:700;line-height:1.25">' + esc(r[1]) + '</div></div>'; }).join('') : note(sum || g.morris ? 'Details closer to game day' : 'Loading…');
    return panel('Game info', inner, 'gap:14px');
  }
  function storyHTML(g, sum) {
    var a = sum && sum.story;
    if (g.morris) return panel('Preview', note('Game notes come from your dashboard sheet'));
    if (DEMO) a = { headline: '[Game preview headline from ESPN]', description: '[A couple of lines from the preview story about the matchup]', image: '' };
    if (!a) return panel('Preview', note(sum ? 'No preview story yet — check back closer to game day' : 'Loading…'));
    return '<div class="tile" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:18px;padding:14px;min-height:0;overflow:hidden">' +
      '<div style="border-radius:calc(var(--r2) * .8);overflow:hidden;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center">' + (a.image ? '<img src="' + esc(a.image) + '" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : icon('photo', 40, 1.3)) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;min-height:0;padding:4px 6px 4px 0"><div class="lbl">Preview · ESPN</div><div class="head clamp3" style="font-size:26px;line-height:1.15">' + esc(a.headline) + '</div><div class="muted clamp4" style="font-size:17px;line-height:1.45">' + esc(a.description || '') + '</div></div></div>';
  }
  function ensureSummary(g) {
    if (DEMO || g.morris || !g.sport) return;
    var c = S.sum[g.id], age = c ? Date.now() - c.t : 1e12, ttl = g.state === 'in' ? 25000 : 30 * 60000;
    if (c && (c.loading || age < ttl)) return;
    S.sum[g.id] = { t: Date.now(), j: c && c.j, loading: true };
    getJSON(ESPN + g.sport + '/' + g.league + '/summary?event=' + g.id).then(function (j) {
      var comp = j.header && j.header.competitions && j.header.competitions[0], cs = comp ? comp.competitors.slice() : [];
      cs.forEach(function (c) { var tt = c.team || {}, mine = g.teams.filter(function (x) { return String(x.id) === String(tt.id); })[0];
        if (tt.color) { save('tc:' + g.league + ':' + tt.id, { c1: '#' + tt.color, c2: tt.alternateColor ? '#' + tt.alternateColor : '' }); if (mine && (!mine.c1 || mine.c1 === NEUTRAL.c1)) { mine.c1 = '#' + tt.color; if (tt.alternateColor) mine.c2 = '#' + tt.alternateColor; } } });
      cs.sort(function (a, b) { return a.homeAway === 'away' ? -1 : b.homeAway === 'away' ? 1 : 0; });
      var recs = {}; cs.forEach(function (c) { var r = recOf(c); if (r && c.team) recs[c.team.abbreviation] = r; });
      var lines = cs.map(function (c) { return { abbr: c.team ? c.team.abbreviation : '', logo: c.team && c.team.logos && c.team.logos[0] ? c.team.logos[0].href : '', ls: (c.linescores || []).map(function (x) { return x.displayValue != null ? x.displayValue : x.value; }), total: scoreVal(c.score) }; });
      // a few team stats, side by side
      var want = g.sport === 'basketball' ? ['fieldGoalPct', 'threePointFieldGoalPct', 'totalRebounds', 'turnovers'] : ['totalYards', 'turnovers', 'possessionTime', 'firstDowns'];
      var bt = (j.boxscore && j.boxscore.teams || []).slice().sort(function (a, b) { return a.homeAway === 'away' ? -1 : b.homeAway === 'away' ? 1 : 0; });
      if (bt.length === 2 && cs[0] && bt[0].team && bt[0].team.id !== cs[0].team.id) bt.reverse();
      var stats = [];
      if (bt.length === 2) want.forEach(function (k) {
        var f = function (t) { return (t.statistics || []).filter(function (s) { return s.name === k; })[0]; }, x = f(bt[0]), y = f(bt[1]);
        if (x && y) stats.push({ label: x.label || x.name, a: x.displayValue, b: y.displayValue });
      });
      // leaders: same category for both teams
      var lead = (j.leaders || []).slice(), cats = [];
      if (lead.length === 2 && cs[0] && lead[0].team && lead[0].team.id !== cs[0].team.id) lead.reverse();
      var pick = function (tm, name) { var c = ((tm && tm.leaders) || []).filter(function (x) { return x.name === name; })[0], a = c && c.leaders && c.leaders[0]; return a ? { name: a.athlete ? a.athlete.shortName || a.athlete.displayName : '', stat: a.displayValue || '', head: a.athlete && a.athlete.headshot ? a.athlete.headshot.href : '' } : null; };
      ((lead[0] && lead[0].leaders) || []).slice(0, 3).forEach(function (c) { cats.push({ label: c.displayName || c.name, a: pick(lead[0], c.name), b: pick(lead[1], c.name) }); });
      var pc = (j.pickcenter || [])[0], bc = comp && comp.broadcasts && comp.broadcasts[0];
      var live = liveFromSummary(j, comp, cs);
      if (live && live.state) { // the summary is fresher than the schedule: update the game itself
        g.teams.forEach(function (t) { if (live.scores[t.abbr] != null && live.state !== 'pre') t.score = live.scores[t.abbr]; });
        if (live.state === 'post' && g.state === 'in') { g.state = 'post'; g.teams.forEach(function (t) { t.winner = live.win[t.abbr]; }); }
        if (live.state === 'in') g.state = 'in';
        if (live.detail && live.state !== 'pre') g.status = live.detail;
      }
      var story = bestStory(g, (j.news && j.news.articles || []).concat(j.article && j.article.headline ? [j.article] : []));
      S.sum[g.id] = { t: Date.now(), j: { recs: recs, lines: lines, stats: stats, leaders: cats, venue: j.gameInfo && j.gameInfo.venue ? j.gameInfo.venue.fullName : '',
        live: live, tv: bc ? (bc.media && bc.media.shortName) || (bc.names || []).join(', ') : '', line: pc ? [pc.details, pc.overUnder != null ? 'O/U ' + pc.overUnder : ''].filter(Boolean).join(' · ') : '', story: story } };
      if (g.state === 'pre' && !(story && story.both)) return teamStory(g).then(function (s) { if (s && (!story || s.score > story.score)) S.sum[g.id].j.story = s; });
    }).catch(function () { S.sum[g.id] = { t: Date.now(), j: c && c.j }; }).then(function () { if (S.screen === 'scores' || S.screen === 'live' || S.detail) render(); });
  }
  // Picks the story most about THIS game: tagged with either team, or naming them in the headline. Generic league stories are skipped.
  function bestStory(g, arts) {
    var college = /college/.test(g.league), best = null;
    var names = g.teams.map(function (t) { return [t.full, t.nick && t.nick.length > 3 ? t.nick : '', college ? t.loc : ''].filter(Boolean); });
    (arts || []).forEach(function (a) {
      if (!a || !a.headline) return;
      var head = a.headline, text = head + ' ' + (a.description || ''), tagged = (a.categories || []).map(function (c) { return String(c.teamId || (c.team && c.team.id) || ''); });
      var hits = g.teams.map(function (t, i) {
        var sc = tagged.indexOf(String(t.id)) >= 0 ? 3 : 0;
        names[i].forEach(function (nm) { if (head.indexOf(nm) >= 0) sc = Math.max(sc, 3); else if (text.indexOf(nm) >= 0) sc = Math.max(sc, 2); });
        return sc;
      });
      var score = hits[0] + hits[1] + (hits[0] && hits[1] ? 4 : 0);
      if (score >= 3 && (!best || score > best.score)) best = { headline: a.headline, description: a.description || '', image: a.images && a.images[0] ? a.images[0].url : '', score: score, both: !!(hits[0] && hits[1]) };
    });
    return best;
  }
  function teamStory(g) { // each team's own ESPN news feed
    return Promise.all(g.teams.map(function (t) {
      return t.id ? getJSON(ESPN + g.sport + '/' + g.league + '/news?team=' + t.id + '&limit=15').then(function (j) { return j.articles || []; }).catch(function () { return []; }) : Promise.resolve([]);
    })).then(function (r) { return bestStory(g, r[0].concat(r[1])); });
  }

  // ---- news
  function newsStories() { return newsList(); }
  function newsPage(i) {
    var nw = newsStories(), s = nw && nw[i];
    if (!s) return note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…'));
    return '<div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:28px;flex:1;min-height:0">' +
      '<div style="position:relative;border-radius:var(--r2);overflow:hidden;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center">' + icon('photo', 56, 1.2) +
      (s.image ? '<img src="' + esc(s.image) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : '') +
      '<div style="position:absolute;left:16px;top:16px;padding:7px 14px;border-radius:999px;background:var(--accent);color:var(--ink);font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase">' + esc(s.src) + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px;min-height:0;overflow:hidden;padding:4px 0">' +
      '<div class="muted" style="font-size:17px;font-weight:600;flex-shrink:0">' + (s.date ? esc(whenLabel(new Date(s.date))) : '') + '</div>' +
      '<div class="head clamp3" style="flex-shrink:0;font-size:' + (s.title.length > 95 ? 30 : s.title.length > 65 ? 34 : 40) + 'px;line-height:1.12">' + esc(s.title) + '</div>' +
      '<div class="muted clamp3" style="flex-shrink:0;font-size:19px;line-height:1.45">' + esc(s.summary || '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:16px;margin-top:auto;flex-shrink:0"><div id="qr" style="width:104px;height:104px;padding:6px;box-sizing:border-box;border-radius:10px;background:#fff;overflow:hidden;flex-shrink:0"></div><div class="muted" style="font-size:16px">Scan to read the whole story on your phone</div></div></div></div>';
  }

  // ---- weather
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function wxIcon(name, size) { // larger animated version of the weather icon
    return '<div class="wxbig wx-' + name + '" style="width:' + size + 'px;height:' + size + 'px;color:var(--accent)">' + icon(name, size, 1.3) + '</div>';
  }
  function vibe(w) {
    var n = w.now || {}, t = n.temp, ic = n.icon || '';
    if (!num(t)) return { head: '[A one-line take on today’s weather]', sub: '[What to expect the rest of the day]' };
    var head;
    if (ic === 'storm') head = 'Storms around — stay weather aware';
    else if (ic === 'snow') head = t <= 28 ? 'Snow day energy' : 'Snowflakes in the air';
    else if (ic === 'sleet') head = 'Icy mix — take it slow out there';
    else if (ic === 'rain') head = 'Grab an umbrella';
    else if (ic === 'fog') head = 'Foggy out — headlights on';
    else if (t < 10) head = 'Dangerously cold — bundle up';
    else if (t < 25) head = 'Bitter cold — hats and gloves';
    else if (t < 40) head = 'Winter coat weather';
    else if (t < 52) head = 'Jacket weather';
    else if (t < 64) head = 'Hoodie weather';
    else if (t < 78) head = ic === 'sun' ? 'Absolutely beautiful out' : 'Pretty much perfect';
    else if (t < 88) head = 'Shorts weather';
    else head = 'Hot one — stay hydrated';
    if (num(n.wind) && n.wind >= 20 && ic !== 'storm') head += n.wind >= 30 ? ', and very windy' : ', and breezy';
    var sub = (n.text || '') + ' right now. ';
    if (num(w.hi) && w.hi > t + 2 && now().getHours() < 15) sub += 'Climbing to ' + w.hi + '° this afternoon.';
    else if (num(w.lo)) sub += 'Down to ' + w.lo + '° tonight.';
    var wet = (w.hours || []).slice(1).filter(function (h) { return num(h.pop) && h.pop >= 40; })[0];
    if (wet && ic !== 'rain' && ic !== 'storm' && ic !== 'snow') sub += ' Precipitation chances pick up around ' + wet.t + '.';
    return { head: head, sub: sub };
  }
  function weatherPage(p) {
    var w = S.wx; if (!w) return note(esc(S.wxErr || 'Loading weather…'));
    var n = w.now || {}, d = function (v) { return num(v) ? v + '°' : '—'; };
    if (p === 'now') {
      var v = vibe(w), chip = function (label, val, sub) { return '<div class="tile" style="display:flex;flex-direction:column;justify-content:center;gap:4px;padding:14px 20px"><div class="lbl">' + label + '</div><div style="font-size:30px;font-weight:800;line-height:1.1">' + val + '</div><div class="muted" style="font-size:15px">' + (sub || '&nbsp;') + '</div></div>'; };
      return '<div style="display:flex;flex-direction:column;gap:14px;flex:1;min-height:0">' +
        '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;flex:1;min-height:0">' +
        '<div class="tile" style="display:flex;align-items:center;justify-content:center;gap:28px;padding:16px">' + wxIcon(n.icon || 'cloud', 168) +
        '<div style="display:flex;flex-direction:column;gap:4px"><div style="font-size:132px;font-weight:800;line-height:.9;letter-spacing:-.03em">' + d(n.temp) + '</div><div style="font-size:24px;font-weight:700">' + esc(n.text || '') + '</div><div class="muted" style="font-size:18px">Feels like ' + d(n.feels) + '</div></div></div>' +
        '<div class="tile" style="display:flex;flex-direction:column;justify-content:center;gap:16px;padding:22px 28px"><div class="lbl">Today in ' + esc(L.name.split(',')[0]) + '</div>' +
        '<div class="head" style="font-size:44px;line-height:1.08">' + esc(v.head) + '</div><div class="muted" style="font-size:19px;line-height:1.45">' + esc(v.sub) + '</div>' +
        '<div style="display:flex;gap:30px;margin-top:4px"><div><div class="muted" style="font-size:14px;font-weight:700;letter-spacing:.08em">HIGH</div><div style="font-size:44px;font-weight:800;line-height:1">' + d(w.hi) + '</div></div>' +
        '<div><div class="muted" style="font-size:14px;font-weight:700;letter-spacing:.08em">LOW</div><div style="font-size:44px;font-weight:800;line-height:1">' + d(w.lo) + '</div></div></div></div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;height:112px">' +
        chip('Wind', (num(n.wind) ? n.wind : '—') + ' <span style="font-size:18px">mph ' + esc(n.dir || '') + '</span>', num(n.gust) ? 'Gusts to ' + n.gust + ' mph' : '') +
        chip('Humidity', num(n.hum) ? n.hum + '%' : '—', '') + chip('UV index', num(w.uv) ? w.uv : '—', num(w.uv) ? (w.uv <= 2 ? 'Low' : w.uv <= 5 ? 'Moderate' : w.uv <= 7 ? 'High' : 'Very high') : '') +
        chip('Air quality', num(w.aqi) ? w.aqi : '—', aqiLabel(w.aqi)) + '</div></div>';
    }
    if (p === 'hours') {
      var hrs = (w.hours || []).slice(0, 12), wet = hrs.filter(function (h) { return num(h.pop) && h.pop >= 40; })[0];
      var temps = hrs.map(function (h) { return h.temp; }).filter(num), hi = Math.max.apply(null, temps), lo = Math.min.apply(null, temps);
      var kind = wet ? ({ snow: 'Snow', sleet: 'Icy mix', storm: 'Storm' }[wet.icon] || 'Rain') : '';
      var head = !temps.length ? '[The next 12 hours at a glance]' : wet ? (wet.t === 'Now' ? kind + ' around right now' : kind + ' chances pick up around ' + wet.t) : 'Dry for the next 12 hours';
      var sub = temps.length ? 'Temperatures from ' + lo + '° to ' + hi + '°' : '';
      return '<div style="display:flex;flex-direction:column;gap:12px;flex:1;min-height:0"><div style="display:flex;align-items:baseline;gap:16px"><div class="head" style="font-size:34px">' + esc(head) + '</div><div class="muted" style="font-size:18px">' + esc(sub) + '</div></div>' +
        '<div class="tile" style="flex:1;min-height:0;padding:10px 14px">' + hourChart(hrs, 1132, 360) + '</div></div>';
    }
    if (p === 'week') {
      var days = w.days || [], his = days.map(function (x) { return x.hi; }).filter(num), los = days.map(function (x) { return x.lo; }).filter(num);
      var top = Math.max.apply(null, his.concat(los)), bot = Math.min.apply(null, los.concat(his)), span = Math.max(1, top - bot);
      var warm = days.filter(function (x) { return x.hi === top; })[0], cold = days.filter(function (x) { return num(x.lo) && x.lo === bot; })[0];
      var head2 = his.length ? 'Warmest ' + (warm ? warm.label : '') + ' at ' + top + '°' + (cold ? ' · coldest ' + cold.label + ' night at ' + bot + '°' : '') : '[The week ahead at a glance]';
      return '<div style="display:flex;flex-direction:column;gap:12px;flex:1;min-height:0"><div class="head" style="font-size:34px">' + esc(head2) + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px;flex:1;min-height:0">' + days.map(function (x) {
          var ok = num(x.hi) && num(x.lo), t0 = ok ? (top - x.hi) / span * 100 : 20, t1 = ok ? (x.lo - bot) / span * 100 : 20;
          return '<div class="tile" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;min-height:0" title="' + esc(x.text || '') + '">' +
            '<div style="font-size:20px;font-weight:800">' + esc(x.label) + '</div><div style="color:var(--accent)">' + icon(x.icon, 50, 1.4) + '</div>' +
            '<div style="font-size:26px;font-weight:800">' + d(x.hi) + '</div>' +
            '<div style="flex:1;width:14px;position:relative;border-radius:7px;background:rgba(255,255,255,.08)"><div style="position:absolute;left:0;right:0;top:' + t0.toFixed(1) + '%;bottom:' + t1.toFixed(1) + '%;border-radius:7px;background:linear-gradient(#ffb35c,#6fb7ff)"></div></div>' +
            '<div class="muted" style="font-size:22px;font-weight:700">' + d(x.lo) + '</div>' +
            '<div style="font-size:15px;font-weight:700;color:' + (num(x.pop) && x.pop >= 40 ? '#8fc8ff' : 'var(--muted)') + '">💧 ' + (num(x.pop) ? x.pop + '%' : '—') + '</div></div>';
        }).join('') + '</div></div>';
    }
    if (p === 'sky') {
      var m = w.moon;
      return '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;flex:1;min-height:0">' +
        '<div class="tile" style="display:flex;flex-direction:column;gap:6px;padding:18px 24px;min-height:0"><div class="lbl">Sun</div>' + sunArc(w, 520, 210) +
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">' +
        '<div><div class="muted" style="font-size:14px;font-weight:700;letter-spacing:.08em">SUNRISE</div><div style="font-size:34px;font-weight:800">' + esc(w.rise || '—') + '</div></div>' +
        '<div style="text-align:right"><div class="muted" style="font-size:14px;font-weight:700;letter-spacing:.08em">SUNSET</div><div style="font-size:34px;font-weight:800">' + esc(w.set || '—') + '</div></div></div>' +
        '<div class="muted" style="font-size:17px;text-align:center">' + esc(w.daylight ? w.daylight + ' of daylight' + (num(w.dayDelta) && w.dayDelta !== 0 ? ' · ' + Math.abs(w.dayDelta) + ' min ' + (w.dayDelta < 0 ? 'shorter' : 'longer') + ' tomorrow' : '') : '') + '</div></div>' +
        '<div class="tile" style="display:flex;align-items:center;justify-content:center;gap:34px;padding:18px 24px"><div class="wxbig wx-moon">' + moonSvg(m, 210) + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px"><div class="lbl">Moon</div><div class="head" style="font-size:40px;line-height:1.05">' + esc(m.name) + '</div>' +
        '<div style="font-size:22px">' + m.illum + '% lit</div><div class="muted" style="font-size:18px">Next full moon ' + esc(m.nextFull) + '</div></div></div></div>';
    }
    if (p === 'radar') {
      return '<div style="display:flex;flex-direction:column;gap:8px;flex:1;min-height:0"><div id="radar" style="flex:1;position:relative;overflow:hidden;border-radius:var(--r2);background:#0b0f17"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div class="muted" id="radarnote" style="font-size:13px">Loading radar…</div>' +
        '<div style="display:flex;align-items:center;gap:8px;font-size:13px" class="muted">Light<div style="width:160px;height:8px;border-radius:4px;background:linear-gradient(90deg,#88ddee,#0077cc,#ffee00,#ff8800,#ff0000,#cc00cc)"></div>Heavy</div></div></div>';
    }
    return note('Loading weather…');
  }
  function smooth(pts) { // Catmull-Rom → cubic Bézier path
    if (pts.length < 2) return '';
    var dd = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      dd += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return dd;
  }
  function hourChart(hrs, W, H) {
    var n = hrs.length || 1, px = 46, step = (W - 2 * px) / Math.max(1, n - 1), xs = hrs.map(function (h, i) { return px + i * step; });
    var temps = hrs.map(function (h) { return h.temp; }), ok = temps.filter(num), hi = ok.length ? Math.max.apply(null, ok) : 1, lo = ok.length ? Math.min.apply(null, ok) : 0;
    var y0 = 128, y1 = 238, ty = function (t) { return num(t) ? y1 - (t - lo) / Math.max(1, hi - lo) * (y1 - y0) : (y0 + y1) / 2; };
    var pts = hrs.map(function (h, i) { return [xs[i], ty(h.temp)]; }), line = smooth(pts);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;color:#fff">' +
      '<defs><linearGradient id="tfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".45"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>';
    if (pts.length > 1) s += '<path d="' + line + ' L' + xs[n - 1] + ',' + (y1 + 22) + ' L' + xs[0] + ',' + (y1 + 22) + 'Z" fill="url(#tfill)"/><path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"' + (ok.length ? '' : ' stroke-dasharray="8 8" opacity=".5"') + '/>';
    hrs.forEach(function (h, i) {
      var x = xs[i];
      s += '<text x="' + x + '" y="26" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor" opacity=".7">' + esc(h.t) + '</text>';
      s += '<svg x="' + (x - 19) + '" y="40" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (ICON[h.icon] || ICON.cloud) + '</svg>';
      s += '<circle cx="' + x + '" cy="' + pts[i][1].toFixed(1) + '" r="6" fill="var(--accent)" stroke="#fff" stroke-width="2"/>';
      s += '<text x="' + x + '" y="' + (pts[i][1] - 16).toFixed(1) + '" text-anchor="middle" font-size="24" font-weight="800" fill="currentColor">' + (num(h.temp) ? h.temp + '°' : '—') + '</text>';
      var pop = num(h.pop) ? h.pop : 0, bh = pop / 100 * 64;
      s += '<rect x="' + (x - 14) + '" y="' + (H - 34 - bh).toFixed(1) + '" width="28" height="' + Math.max(2, bh).toFixed(1) + '" rx="5" fill="#6fb7ff" opacity="' + (pop >= 40 ? .95 : .55) + '"/>';
      s += '<text x="' + x + '" y="' + (H - 10) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#8fc8ff">' + (num(h.pop) ? h.pop + '%' : '—') + '</text>';
    });
    return s + '</svg>';
  }
  function sunArc(w, W, H) {
    var cx = W / 2, cy = H - 22, rx = W / 2 - 40, ry = H - 52, n = now(), f = null;
    if (w.riseD && w.setD) f = (n - w.riseD) / (w.setD - w.riseD);
    var up = f != null && f >= 0 && f <= 1, ff = f == null ? 0.5 : Math.max(0, Math.min(1, f)), ang = Math.PI * (1 - ff);
    var sx = cx + rx * Math.cos(ang), sy = cy - ry * Math.sin(ang);
    var arc = 'M' + (cx - rx) + ',' + cy + ' A' + rx + ',' + ry + ' 0 0 1 ' + (cx + rx) + ',' + cy;
    var done = up ? 'M' + (cx - rx) + ',' + cy + ' A' + rx + ',' + ry + ' 0 0 1 ' + sx.toFixed(1) + ',' + sy.toFixed(1) : '';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;flex:1;min-height:0">' +
      '<path d="' + arc + '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>' +
      (done ? '<path d="' + done + '" fill="none" stroke="#ffc65c" stroke-width="4" stroke-linecap="round"/>' : '') +
      '<line x1="18" y1="' + cy + '" x2="' + (W - 18) + '" y2="' + cy + '" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
      (up ? '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="30" fill="#ffc65c" opacity=".25"/><circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="17" fill="#ffd27a"/>'
        : '<text x="' + cx + '" y="' + (cy - ry / 2) + '" text-anchor="middle" font-size="20" fill="rgba(255,255,255,.6)">' + (f != null && f > 1 ? 'The sun has set' : f != null ? 'Before sunrise' : '') + '</text>') + '</svg>';
  }

  // ------------------------------------------------------------ full-screen ("bleed") pages: photos, news, your team's games, weather
  function isBleed(p) { return S.screen !== 'family' && S.screen !== 'plays' || (S.screen === 'family' && p !== 'main'); }
  function btag(txt) { return '<div class="btag">' + txt + '</div>'; }
  function bleedHTML(p) {
    var pg = pageList(S.screen), top = dotsHTML(pg);
    if (S.screen === 'photos') return photosBleed(top);
    if (S.screen === 'night') return nightBleed();
    if (S.screen === 'live') return p === 'none' ? emptyBleed('No live games right now') : gameBleed(findGame(p.slice(2)), top, true);
    if (String(p).indexOf('al:') === 0) return alertBleed(S.alerts[+p.slice(3)], top, S.screen === 'alert');
    if (S.screen === 'alert') return emptyBleed('Warning has ended');
    if (S.screen === 'family') return p === 'board' ? boardBleed(top) : countdownBleed(top);
    if (String(p).indexOf('st:') === 0) return standingsBleed(p.slice(3), top);
    if (S.screen === 'news') return newsBleed(p, top);
    if (S.screen === 'scores') return String(p).indexOf('grid') === 0 ? scoreboardBleed(+p.split(':')[1] || 0, top) : gameBleed(findGame(p.slice(2)), top);
    return weatherBleed(p, top);
  }
  function photosBleed(top) {
    var ph = photos();
    if (!ph || !ph.length) return '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' + note(!ph ? (S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…')) : 'Add photos to your dashboard photo folder in Google Drive.') + '</div>';
    var g = curGroup() || [];
    return '<div style="position:absolute;inset:0;background:#000;display:grid;grid-template-columns:repeat(' + g.length + ',minmax(0,1fr));gap:6px">' + g.map(function (it, i) {
      var d = it.taken ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(it.taken) ? it.taken + 'T12:00:00' : String(it.taken).replace(' ', 'T')) : null; if (d && isNaN(d)) d = null;
      var ya = yearsAgo(it);
      return '<div style="position:relative;overflow:hidden;background:#111"><div id="pc' + i + '" style="position:absolute;inset:0;background:center/cover no-repeat;opacity:0;transition:opacity .8s"></div>' +
        (ya && i === 0 ? '<div style="position:absolute;left:22px;top:84px;padding:10px 20px;border-radius:999px;background:var(--accent);color:var(--ink);font-size:24px;font-weight:900;box-shadow:0 6px 18px rgba(0,0,0,.35)">📸 ' + ya + ' year' + (ya === 1 ? '' : 's') + ' ago today</div>' : '') +
        (d ? '<div style="position:absolute;left:22px;bottom:22px;padding:7px 14px;border-radius:999px;background:rgba(0,0,0,.5);font-size:16px;font-weight:700">' + esc((it.person ? it.person + ' · ' : '') + MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()) + '</div>' : '') + '</div>';
    }).join('') + '</div>' + top;
  }
  function newsBleed(p, top) {
    var nw = newsStories(), s = nw && p && p.indexOf('s:') === 0 ? nw[+p.slice(2)] : null;
    if (!s) return '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' + note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…')) + '</div>';
    var len = s.title.length, fs = len > 110 ? 42 : len > 80 ? 48 : 56;
    return '<div style="position:absolute;inset:0;background:linear-gradient(135deg,var(--accent) -40%,#1b2433 45%,#140f1c)"></div>' +
      (s.image ? '<img src="' + esc(s.image) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : '') +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.4) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,.2) 42%,rgba(0,0,0,.9) 100%)"></div>' +
      '<div class="btag" style="background:var(--accent);color:var(--ink)">' + esc(s.src) + ' · Top news</div>' + top +
      '<div style="position:absolute;left:56px;right:290px;bottom:52px;display:flex;flex-direction:column;gap:14px">' +
      '<div style="font-size:18px;font-weight:700;color:rgba(255,255,255,.8)">' + (s.date ? esc(whenLabel(new Date(s.date))) : '') + '</div>' +
      '<div class="head clamp3" style="font-size:' + fs + 'px;line-height:1.08;text-shadow:0 2px 12px rgba(0,0,0,.5)">' + esc(s.title) + '</div>' +
      (s.summary ? '<div class="clamp2" style="font-size:21px;line-height:1.45;color:rgba(255,255,255,.82)">' + esc(s.summary) + '</div>' : '') + '</div>' +
      '<div style="position:absolute;right:56px;bottom:52px;display:flex;flex-direction:column;align-items:center;gap:10px"><div id="qr" style="width:150px;height:150px;padding:8px;box-sizing:border-box;border-radius:14px;background:#fff;overflow:hidden"></div><div style="font-size:14px;color:rgba(255,255,255,.75)">Scan to read</div></div>';
  }
  // ---- your team's game page: TV scorebug (two big team-color bars)
  // ESPN keeps a version of most logos made for dark backgrounds (light edges on dark parts): use it, fall back to the normal logo
  function darkLogo(url) { return String(url || '').replace(/\/500\//, '/500-dark/').replace(/\/500-dark\/scoreboard\//, '/500-dark/'); }
  function logoDisc(t, px) {
    var txt = '<span style="font-weight:900;font-size:' + Math.round(px * .34) + 'px;color:#fff;text-shadow:0 4px 12px rgba(0,0,0,.45)">' + esc(t.abbr) + '</span>';
    var dark = darkLogo(t.logo), shadow = 'filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))';
    var fallback = "this.onerror=function(){this.outerHTML=\'" + txt.replace(/'/g, "\\'").replace(/"/g, '&quot;') + "\'};this.src=\'" + esc(t.logo) + "\'";
    var inner = t.logo ? '<img src="' + esc(dark) + '" alt="" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;' + shadow + '" onerror="' + (dark !== t.logo ? fallback : "this.outerHTML=\'" + txt.replace(/'/g, "\\'").replace(/"/g, '&quot;') + "\'") + '">' : txt;
    return '<div style="width:' + px + 'px;height:' + px + 'px;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + inner + '</div>';
  }
  function glowColor(t) { // the team's most colorful color (Vegas glows gold, not steel gray)
    var sat = function (h) { var m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 0; var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
    var ok = function (h) { var l = lum(h); return h && l > 0.02 && l < 0.85; };
    var c = [t.c1, t.c2].filter(ok).sort(function (x, y) { return sat(y) - sat(x); });
    return c[0] || t.c1 || NEUTRAL.c2;
  }
  function bigStat(s) { // "22/31, 254 YDS, 2 TD" → 254 + "YDS · 22/31, 2 TD"
    s = String(s || ''); var m = /(\d+)\s*(YDS|PTS|REB|AST)/i.exec(s);
    if (m) return [m[1], (m[2].toUpperCase() + ' · ' + s.replace(m[0], '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s*,\s*,/g, ',')).replace(/ · $/, '')];
    m = /^\s*(\d+(\.\d+)?)/.exec(s); return m ? [m[1], s.slice(m[0].length).replace(/^[\s,]+/, '')] : [s, ''];
  }
  function gameBleed(g, top, takeover) {
    if (!g) return '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' + note('Game not found') + '</div>';
    var sum = S.sum[g.id] && S.sum[g.id].j; if (!sum && !g.morris) ensureSummary(g);
    var lv = sum && sum.live, crunch = g.state === 'in' && inCrunch(g);
    var teams = g.teams.map(function (t) { var r = sum && sum.recs && sum.recs[t.abbr]; return Object.assign({}, t, { rec: t.rec || r || '', poss: !!(lv && g.state === 'in' && lv.poss && String(lv.poss) === String(t.id)) }); }), a = teams[0], b = teams[1];
    var star = g.state === 'post' ? (b.winner ? b : a) : (b.home ? b : a); // the winner (or home team) sets the backdrop
    var bar = function (t) {
      var lose = g.state === 'post' && !t.winner, col = teamBg(t);
      var right = g.state === 'pre' ? '<div style="font-size:16px;font-weight:800;letter-spacing:.12em;opacity:.7">RECORD</div><div style="font-size:72px;font-weight:900;line-height:1">' + esc(t.rec || '—') + '</div>'
        : '<div style="font-size:138px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums">' + esc(t.score) + '</div>';
      var nick = t.full && t.loc ? t.full.replace(t.loc, '').trim() : '', sub = [nick && nick !== t.name ? nick : '', g.state !== 'pre' ? t.rec : ''].filter(Boolean).join(' · ');
      return '<div style="display:flex;align-items:center;height:196px;border-radius:22px;overflow:hidden;background:linear-gradient(90deg,' + col + ',' + col + 'd9);box-shadow:0 12px 30px rgba(0,0,0,.4);' + (lose ? 'opacity:.7;' : '') + '">' +
        '<div style="width:16px;align-self:stretch;background:' + (t.c2 || '#fff') + '"></div><div style="margin:0 32px">' + logoDisc(t, 152) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="ellip" style="font-size:74px;font-weight:900;line-height:1.05;color:' + teamInk(col) + '">' + esc(t.name) + (t.poss ? ' <span style="font-size:40px;vertical-align:middle">' + (g.sport === 'football' ? '🏈' : '●') + '</span>' : '') +
        (g.state === 'post' && t.winner ? ' <span style="font-size:24px;padding:4px 12px;border-radius:9px;background:var(--accent);color:var(--ink);vertical-align:middle">W</span>' : '') + '</div>' +
        (sub ? '<div style="font-size:26px;font-weight:700;opacity:.85;color:' + teamInk(col) + '">' + esc(sub) + '</div>' : '') + '</div>' +
        '<div style="width:290px;align-self:stretch;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.28);color:#fff">' + right + '</div></div>';
    };
    var status = g.state === 'pre' ? (sameDay(g.date, now()) ? 'Today' : DOWL[g.date.getDay()]) + ' · ' + hm(g.date) + (sum && sum.tv ? ' · ' + sum.tv : '') : g.state === 'in' ? 'Live · ' + g.status : g.status + (sum && sum.venue ? ' · ' + sum.venue : '');
    var bottom = g.state === 'pre' ? previewCards(g, sum) : g.state === 'in' && lv ? liveCards(g, lv, teams) : statCards(g, sum, teams);
    if (takeover) status = (g.state === 'in' ? 'Live · ' + g.status : 'Final · ' + g.status.replace(/^Final\s*[·/-]?\s*/i, '')).replace(/ · $/, '');
    // arena lights: each team's color glows in from its own side
    return '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 75% 90% at 0% 10%,' + glowColor(a) + '99,transparent 70%),radial-gradient(ellipse 75% 90% at 100% 90%,' + glowColor(b) + '99,transparent 70%),radial-gradient(ellipse at 50% 50%,#151a20,#07090c 80%)"></div>' +
      '<div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 2px,transparent 2px 120px)"></div>' +
      btag(esc(g.lg) + (g.state === 'pre' ? ' · Up next' : g.state === 'in' ? ' · Live' : ' · Final')) + top + (crunch ? '<div class="btag" style="left:auto;right:240px;background:#c62828;animation:blink 1.4s ease-in-out infinite">Close finish</div>' : '') +
      '<div style="position:absolute;left:56px;right:56px;top:88px;display:flex;flex-direction:column;gap:12px">' + bar(a) + bar(b) +
      '<div style="align-self:center;margin-top:2px;padding:7px 22px;border-radius:999px;font-size:17px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;' + (g.state === 'in' ? 'background:#c62828' : 'background:rgba(255,255,255,.14)') + '">' + esc(status) + '</div></div>' + bottom;
  }
  function statCards(g, sum, teams) {
    var wrap = function (inner) { return '<div style="position:absolute;left:40px;right:40px;bottom:30px;height:182px;display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:14px">' + inner + '</div>'; };
    var card = function (inner, extra) { return '<div class="glass" style="padding:16px 20px;display:flex;flex-direction:column;gap:4px;min-width:0;' + (extra || '') + '">' + inner + '</div>'; };
    if (g.morris) return wrap(card('<div class="lbl">Notes</div><div style="font-size:20px">' + esc(g.morris.notes || g.morris.location || '') + '</div>', 'grid-column:1/-1'));
    if (!sum) return wrap(card(note(DEMO ? 'Box score and top performers from ESPN' : 'Loading box score…'), 'grid-column:1/-1'));
    var reg = g.sport === 'baseball' ? 99 : g.sport === 'hockey' ? 3 : /college-basketball/.test(g.league) ? 2 : 4;
    var n = Math.max.apply(null, sum.lines.map(function (r) { return r.ls.length; }).concat([reg === 99 ? 9 : reg]));
    var per = function (i) { return i > reg ? (n - reg > 1 ? 'OT' + (i - reg) : 'OT') : g.sport === 'hockey' ? 'P' + i : reg === 2 ? 'H' + i : g.sport === 'baseball' ? String(i) : 'Q' + i; };
    var cols = 'display:grid;grid-template-columns:minmax(0,1.6fr) repeat(' + (n + 1) + ',minmax(0,1fr));text-align:center';
    var head = '<div style="' + cols + ';font-size:13px;font-weight:800;color:rgba(255,255,255,.65)"><span></span>'; for (var i = 1; i <= n; i++) head += '<span>' + per(i) + '</span>'; head += '<span>T</span></div>';
    var rows = sum.lines.map(function (r) {
      var t = teams.filter(function (x) { return x.abbr === r.abbr; })[0] || {}, ls = r.ls.map(function (v) { return '<span>' + esc(v) + '</span>'; }).join(''); for (var j = r.ls.length; j < n; j++) ls += '<span style="opacity:.4">–</span>';
      return '<div style="' + cols + ';font-size:' + (n > 6 ? 18 : 26) + 'px;font-weight:800;font-variant-numeric:tabular-nums;' + (g.state === 'post' && !t.winner ? 'opacity:.65' : '') + '"><span style="text-align:left">' + esc(r.abbr) + '</span>' + ls + '<span>' + esc(r.total) + '</span></div>';
    }).join('');
    var leaders = (sum.leaders || []).slice(0, 3).map(function (c) {
      var A = c.a ? bigStat(c.a.stat) : null, B = c.b ? bigStat(c.b.stat) : null, aFirst = !B || (A && (+A[0] || 0) >= (+B[0] || 0));
      var top = aFirst ? c.a : c.b, topS = aFirst ? A : B, oth = aFirst ? c.b : c.a, othS = aFirst ? B : A, topTeam = aFirst ? teams[0] : teams[1], othTeam = aFirst ? teams[1] : teams[0];
      if (!top) return '';
      return card('<div class="lbl">' + esc(c.label) + '</div><div class="ellip" style="font-size:24px;font-weight:900">' + esc(top.name) + ' <span style="font-size:15px;opacity:.6">' + esc(topTeam.abbr) + '</span></div>' +
        '<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:44px;font-weight:900;line-height:1;color:var(--accent)">' + esc(topS[0]) + '</span><span class="ellip" style="font-size:14px;opacity:.75">' + esc(topS[1]) + '</span></div>' +
        (oth ? '<div class="ellip" style="font-size:14px;opacity:.65;margin-top:auto">' + esc(othTeam.abbr + ' · ' + oth.name + ' ' + othS[0]) + '</div>' : ''));
    }).join('');
    while ((leaders.match(/class="glass"/g) || []).length < 3) leaders += card('<div class="lbl">Top performers</div><div style="opacity:.6">Not available yet</div>');
    return wrap(card('<div class="lbl">Box score</div>' + head + rows, 'gap:6px') + leaders);
  }
  function previewCards(g, sum) {
    var info = [];
    if (g.morris) { info.push(['Where', g.morris.location || (g.morris.home ? 'Morris' : '')]); if (g.morris.notes) info.push(['Notes', g.morris.notes]); }
    else if (DEMO) info = [['Where', '[Stadium]'], ['TV', '[Network]'], ['Line', '[Spread] · O/U [Total]']];
    else if (sum) { if (sum.venue) info.push(['Where', sum.venue]); if (sum.tv) info.push(['TV', sum.tv]); if (sum.line) info.push(['Line', sum.line]); }
    var st = sum && sum.story; if (DEMO && !st) st = { headline: '[Game preview headline from ESPN]', description: '[A couple of lines from the preview story]', image: '' };
    var left = '<div class="glass" style="padding:18px 22px;display:flex;flex-direction:column;gap:10px;min-width:0"><div class="lbl">Game info</div>' + (info.length ? info.map(function (r) { return '<div style="display:flex;gap:12px;align-items:baseline"><span style="width:56px;flex-shrink:0;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;opacity:.7">' + esc(r[0]) + '</span><span class="ellip" style="font-size:20px;font-weight:700">' + esc(r[1]) + '</span></div>'; }).join('') : '<div style="opacity:.7">' + (sum ? 'Details closer to game day' : 'Loading…') + '</div>') + '</div>';
    var right = '<div class="glass" style="padding:16px 20px;display:flex;gap:18px;min-width:0">' + (st ? (st.image ? '<img src="' + esc(st.image) + '" alt="" style="width:220px;height:100%;object-fit:cover;border-radius:12px;flex-shrink:0" onerror="this.remove()">' : '') +
      '<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><div class="lbl">Preview · ESPN</div><div class="head clamp2" style="font-size:26px;line-height:1.15">' + esc(st.headline) + '</div><div class="clamp2" style="font-size:16px;line-height:1.4;opacity:.8">' + esc(st.description || '') + '</div></div>'
      : '<div style="display:flex;flex-direction:column;gap:8px"><div class="lbl">Preview</div><div style="opacity:.7">' + (g.morris ? 'Game notes come from your dashboard sheet' : sum ? 'No preview story yet — check back closer to game day' : 'Loading…') + '</div></div>') + '</div>';
    return '<div style="position:absolute;left:40px;right:40px;bottom:30px;height:182px;display:grid;grid-template-columns:1fr 1.9fr;gap:14px">' + left + right + '</div>';
  }
  // ---- scoreboard: six split team-color cards, two across
  function scoreboardBleed(pgIdx, top) {
    if (!S.games.length) return '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' + note(esc(S.scoresErr || 'Loading scores…')) + '</div>';
    var list = S.games.slice(pgIdx * 6, pgIdx * 6 + 6), n = now();
    var cards = list.map(function (g, k) {
      var a = g.teams[0], b = g.teams[1], ca = teamBg(a), cb = teamBg(b), live = g.state === 'in';
      var side = function (t, right) {
        var lose = g.state === 'post' && !t.winner;
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;text-align:center;' + (lose ? 'opacity:.62' : '') + '">' + logoDisc(t, 80) +
          '<div class="ellip" style="max-width:100%;font-size:' + (t.name.length > 11 ? 20 : 24) + 'px;font-weight:900;line-height:1.1;text-shadow:0 2px 8px rgba(0,0,0,.35)">' + esc(t.name) + '</div><div style="font-size:16px;font-weight:700;opacity:.85;line-height:1">' + esc(t.rec || '') + '</div></div>';
      };
      var mid = g.state === 'pre' ? '<div style="font-size:24px;font-weight:900;opacity:.9">VS</div>'
        : '<div style="font-size:66px;font-weight:900;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums;text-shadow:0 2px 12px rgba(0,0,0,.45)"><span style="' + (g.state === 'post' && !a.winner ? 'opacity:.55' : '') + '">' + esc(a.score) + '</span><span style="opacity:.45;font-weight:300"> – </span><span style="' + (g.state === 'post' && !b.winner ? 'opacity:.55' : '') + '">' + esc(b.score) + '</span></div>';
      return '<button type="button" class="tap" data-open="game:' + (pgIdx * 6 + k) + '" style="position:relative;display:block;border-radius:20px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.4);color:#fff">' +
        '<div style="position:absolute;inset:0;background:linear-gradient(112deg,' + ca + ' 0%,' + ca + ' 49.6%,' + cb + ' 50.4%,' + cb + ' 100%)"></div>' +
        '<div style="position:absolute;left:0;top:0;bottom:0;width:8px;background:' + (a.c2 || '#fff') + '"></div><div style="position:absolute;right:0;top:0;bottom:0;width:8px;background:' + (b.c2 || '#fff') + '"></div>' +
        '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.4))"></div>' +
        '<div style="position:relative;height:100%;display:flex;flex-direction:column;padding:12px 24px 12px">' +
        '<div style="display:flex;justify-content:center;gap:8px;font-size:13px;font-weight:800;letter-spacing:.1em"><span style="padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.4)">' + esc(g.lg) + '</span><span style="padding:4px 12px;border-radius:999px;background:' + (live ? '#c62828' : 'rgba(0,0,0,.4)') + ';text-transform:uppercase">' + esc(g.status) + '</span></div>' +
        '<div style="flex:1;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:16px">' + side(a, false) + mid + side(b, true) + '</div></div></button>';
    });
    while (cards.length < 6) cards.push('<div class="glass" style="display:flex;align-items:center;justify-content:center;opacity:.6">' + note('No other games right now') + '</div>');
    return '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,#2a2036 0%,#0e0b14 70%)"></div>' +
      btag('Scoreboard · ' + DOWL[n.getDay()]) + top + (S.teamMiss && S.teamMiss.length ? '<div class="btag" style="left:auto;right:260px;background:rgba(160,40,30,.7)">Couldn’t find ' + esc(S.teamMiss.join(', ')) + '</div>' : '') +
      '<div style="position:absolute;left:36px;right:36px;top:92px;bottom:30px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:14px">' + cards.join('') + '</div>';
  }
  function weatherBleed(p, top) {
    var w = S.wx, names = { now: 'Right now', hours: 'Next 12 hours', week: 'The week ahead', sky: 'Sun & moon', radar: 'Live radar' };
    var tag = btag('Weather · ' + (names[p] || '')) + top;
    if (!w) return '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' + note(esc(S.wxErr || 'Loading weather…')) + '</div>';
    if (p === 'radar') return '<div id="radar" style="position:absolute;inset:0;background:#0b0f17"></div>' + tag +
      '<div class="glass" style="position:absolute;left:24px;right:24px;bottom:24px;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 18px"><div id="radarnote" style="font-size:14px;color:rgba(255,255,255,.8)">Loading radar…</div>' +
      '<div style="display:flex;align-items:center;gap:8px;font-size:14px;color:rgba(255,255,255,.8)">Light<div style="width:180px;height:9px;border-radius:5px;background:linear-gradient(90deg,#88ddee,#0077cc,#ffee00,#ff8800,#ff0000,#cc00cc)"></div>Heavy</div></div>';
    var n = w.now || {}, d = function (v) { return num(v) ? v + '°' : '—'; };
    if (p === 'now') {
      var v = vibe(w), hrs = (w.hours || []).slice(0, 6);
      var bits = [num(n.wind) ? 'Wind ' + n.wind + ' mph ' + (n.dir || '') : '', num(n.hum) ? 'Humidity ' + n.hum + '%' : '', num(w.uv) ? 'UV ' + w.uv : '', num(w.aqi) ? 'Air quality ' + w.aqi + ' ' + aqiLabel(w.aqi) : ''].filter(Boolean).join('  ·  ');
      return '<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,6,18,.8) 0%,rgba(10,6,18,.4) 55%,rgba(10,6,18,.05) 80%),linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(0,0,0,.6) 100%)"></div>' + tag +
        '<div style="position:absolute;left:64px;top:104px;right:260px;display:flex;flex-direction:column;gap:6px">' +
        '<div class="lbl">' + esc(L.name.split(',')[0]) + ' right now</div>' +
        '<div style="display:flex;align-items:flex-start;gap:22px"><div style="font-size:210px;font-weight:800;line-height:.86;letter-spacing:-.04em;text-shadow:0 4px 24px rgba(0,0,0,.35)">' + d(n.temp) + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;padding-top:14px">' + wxIcon(n.icon || 'cloud', 92) + '<div style="font-size:26px;font-weight:700">' + esc(n.text || '') + '</div><div style="font-size:20px;color:rgba(255,255,255,.8)">Feels like ' + d(n.feels) + '</div></div></div>' +
        '<div class="head" style="font-size:52px;line-height:1.05;margin-top:16px">' + esc(v.head) + '</div>' +
        '<div style="font-size:21px;line-height:1.45;color:rgba(255,255,255,.85);max-width:720px">' + esc(v.sub) + '</div>' +
        (bits ? '<div style="font-size:17px;font-weight:600;color:rgba(255,255,255,.7);margin-top:4px">' + esc(bits) + '</div>' : '') + '</div>' +
        '<div class="glass" style="position:absolute;left:40px;right:40px;bottom:36px;height:128px;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));align-items:center;text-align:center;padding:0 14px">' +
        hrs.map(function (h) { return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="font-size:15px;font-weight:700;color:rgba(255,255,255,.75)">' + esc(h.t) + '</div><div style="color:var(--accent)">' + icon(h.icon, 32, 1.5) + '</div><div style="font-size:24px;font-weight:800">' + d(h.temp) + '</div></div>'; }).join('') +
        '<div style="border-left:1px solid rgba(255,255,255,.2)"><div style="font-size:14px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.75)">HIGH</div><div style="font-size:36px;font-weight:800">' + d(w.hi) + '</div></div>' +
        '<div><div style="font-size:14px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.75)">LOW</div><div style="font-size:36px;font-weight:800">' + d(w.lo) + '</div></div></div>';
    }
    // hours, week, sun & moon: the regular layouts on glass, over the scene
    var body = weatherPage(p).replace(/class="tile"/g, 'class="glass"');
    return '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,6,18,.55) 0%,rgba(10,6,18,.3) 40%,rgba(10,6,18,.65) 100%)"></div>' + tag +
      '<div style="position:absolute;left:40px;right:40px;top:96px;bottom:36px;display:flex;flex-direction:column">' + body + '</div>';
  }

  // ------------------------------------------------------------ time of day: night mode and the morning briefing
  function hmToH(s, dflt) { var m = /^(\d+):(\d+)$/.exec(String(s || '')); return m ? +m[1] + +m[2] / 60 : dflt; }
  function isNight() {
    if (Q.has('night')) return true;
    if (Q.has('day') || S.wakeUntil > Date.now()) return false;
    var c = C.night || {}, n = now(), h = n.getHours() + n.getMinutes() / 60;
    if (c.enabled === false) return false;
    var a = c.start != null ? c.start : 23, b = c.end != null ? c.end : 5;
    return a > b ? (h >= a || h < b) : (h >= a && h < b);
  }
  function isBriefing() {
    if (Q.has('briefing')) return true;
    var c = C.briefing || {}, n = now(), h = n.getHours() + n.getMinutes() / 60, wkend = n.getDay() === 0 || n.getDay() === 6;
    if (c.enabled === false || isNight()) return false;
    return h >= hmToH(c.start, 5) && h < hmToH(wkend ? c.weekendEnd : c.weekdayEnd, wkend ? 10 : 8.5);
  }
  function emptyBleed(msg) { return '<div style="position:absolute;inset:0;background:rgba(8,6,14,.7);display:flex;align-items:center;justify-content:center">' + note(esc(msg)) + '</div>'; }
  function tagChip(t, hot) { return '<span class="tagchip' + (hot && t.hot ? ' hot' : '') + '">' + (t.emoji ? '<span>' + t.emoji + '</span>' : '') + esc(t.text) + '</span>'; }
  // weekly things (trash day): the night before after 3 PM, and the morning of
  function weeklyTags() {
    var n = now(), h = n.getHours(), dow = n.getDay(), out = [];
    (C.weekly || []).forEach(function (w) {
      if (w.nightBefore !== false && (dow + 1) % 7 === w.day && h >= (w.from != null ? w.from : 15)) out.push({ emoji: w.emoji || '', text: w.tonight || w.label + ' tomorrow', hot: true });
      else if (dow === w.day && h < (w.until != null ? w.until : 12)) out.push({ emoji: w.emoji || '', text: w.today || w.label + ' today', hot: true });
    });
    return out;
  }
  // "leave by" for the next event that has an address (drive times come from Google Maps through your Apps Script)
  function leaveTags(ev) {
    var n = now(), e = (ev || events() || []).filter(function (x) { return x.leave && x.start > n && x.leave - n < 3 * 3600000 && sameDay(x.start, n); })[0];
    if (!e) return [];
    var late = e.leave <= n;
    return [{ emoji: '🚗', text: (late ? 'Leave now' : 'Leave by ' + hm(e.leave)) + ' · ' + e.title + (e.drive ? ' (' + e.drive + ' min)' : ''), hot: e.leave - n < 45 * 60000, e: e }];
  }

  function nightBleed() {
    var n = now(), h = n.getHours(), m = n.getMinutes(), ev = events() || [], w = S.wx;
    var day = h < 12 ? n : new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
    var first = ev.filter(function (e) { return sameDay(e.start, day) && !e.allDay && !/dinner/i.test(e.who || ''); })[0] || ev.filter(function (e) { return sameDay(e.start, day); })[0];
    var temps = w && w.hours ? w.hours.slice(0, 9).map(function (x) { return x.temp; }).filter(num) : [], low = temps.length ? Math.min.apply(null, temps) : w && num(w.lo) ? w.lo : null;
    var live = liveList().filter(function (g) { return g.state === 'in'; })[0];
    var bits = [];
    if (first) bits.push('<div><div class="nl">' + (h < 12 ? 'Today' : 'Tomorrow') + '</div><div class="nv">' + esc((first.allDay ? '' : hm(first.start) + ' · ') + first.title) + '</div></div>');
    if (low != null) bits.push('<div><div class="nl">Overnight low</div><div class="nv">' + low + '°</div></div>');
    if (live) bits.push('<div><div class="nl">' + esc(live.lg) + ' · ' + esc(live.status) + '</div><div class="nv">' + esc(live.teams[0].abbr + ' ' + live.teams[0].score + ' – ' + live.teams[1].score + ' ' + live.teams[1].abbr) + '</div></div>');
    weeklyTags().forEach(function (t) { bits.push('<div><div class="nl">Reminder</div><div class="nv">' + t.emoji + ' ' + esc(t.text) + '</div></div>'); });
    return '<div class="nightbg"></div><div class="nightwrap">' +
      '<div class="ntime">' + (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + '<span>' + (h < 12 ? 'AM' : 'PM') + '</span></div>' +
      '<div class="ndate">' + DOWL[n.getDay()] + ', ' + MONL[n.getMonth()] + ' ' + n.getDate() + '</div>' +
      (bits.length ? '<div class="nbits">' + bits.slice(0, 3).join('') + '</div>' : '') + '</div><div class="nhint">Tap to wake</div>';
  }

  function wearAdvice(w) {
    var nw = w.now || {}, feels = num(nw.feels) ? nw.feels : nw.temp, hi = num(w.hi) ? w.hi : feels, today = (w.days || [])[0] || {};
    if (!num(feels)) return null;
    var base = feels <= 20 ? ['🧤', 'Winter coat, hat & gloves'] : feels <= 35 ? ['🧥', 'Heavy coat'] : feels <= 50 ? ['🧥', 'Jacket or hoodie'] : feels <= 62 ? ['👕', 'Long sleeves'] : feels <= 80 ? ['👕', 'T-shirt weather'] : ['🩳', 'Shorts & sunscreen'];
    var extra = [];
    if (num(hi) && hi - feels >= 15) extra.push(['🌤️', 'Layers — warming to ' + hi + '°']);
    var wet = (w.hours || []).filter(function (x) { return num(x.pop) && x.pop >= 40; })[0];
    if (num(today.pop) && today.pop >= 40) extra.push([today.icon === 'snow' ? '🥾' : '☔', (today.icon === 'snow' ? 'Boots — snow ' : 'Umbrella — rain ') + today.pop + '%' + (wet && wet.t !== 'Now' ? ' around ' + wet.t : '')]);
    if (num(w.uv) && w.uv >= 6) extra.push(['🕶️', 'Sunglasses & sunscreen · UV ' + w.uv]);
    if (num(nw.gust) && nw.gust >= 30) extra.push(['💨', 'Windy — gusts to ' + nw.gust + ' mph']);
    return { emoji: base[0], head: base[1], extra: extra.slice(0, 3) };
  }
  function briefHead(greet, n, h, m, wn) { // the top of the morning briefing: greeting, time, date, weather
    var style = +(Q.get('bh') || (C.briefing && C.briefing.header) || 2), time = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m;
    var date = DOWL[n.getDay()] + ', ' + MONL[n.getMonth()] + ' ' + n.getDate(), has = wn && num(wn.temp);
    var wx = function (extra) { return has ? '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;padding-top:8px"><div style="display:flex;align-items:center;gap:14px">' + wxIcon(wn.icon || 'cloud', 96) + '<div style="text-align:right"><div style="font-size:96px;font-weight:800;line-height:.9">' + wn.temp + '°</div><div style="font-size:20px;opacity:.85">Feels ' + (num(wn.feels) ? wn.feels + '°' : '—') + '</div></div></div>' + (extra || '') + '</div>' : (extra ? '<div style="padding-top:8px">' + extra + '</div>' : ''); };
    var big = function (px) { return '<span style="font-size:' + px + 'px;font-weight:800;line-height:.9;letter-spacing:-.03em">' + time + '<span style="font-size:' + Math.round(px * .26) + 'px;font-weight:700;letter-spacing:0;margin-left:10px;opacity:.85">' + (h < 12 ? 'AM' : 'PM') + '</span></span>'; };
    var left;
    if (style === 1) // date is the headline, time underneath
      left = '<div><div style="font-size:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)">' + esc(greet) + '</div><div class="head" style="font-size:58px;line-height:1.05;margin:6px 0 4px">' + date + '</div>' + big(112) + '</div>';
    else if (style === 3) // greeting and time on the left, date moves under the weather
      left = '<div><div class="head" style="font-size:44px;line-height:1">' + esc(greet) + '</div><div style="margin-top:10px">' + big(126) + '</div></div>';
    else if (style === 4) // calendar page next to the time
      left = '<div style="display:flex;align-items:center;gap:30px"><div style="width:156px;height:176px;border-radius:20px;overflow:hidden;background:rgba(255,255,255,.94);color:#1b1622;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(0,0,0,.35);text-shadow:none">' +
        '<div style="background:var(--accent);color:var(--ink);font-size:22px;font-weight:900;letter-spacing:.14em;text-align:center;padding:8px 0">' + MON[n.getMonth()].toUpperCase() + '</div><div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:92px;font-weight:900;line-height:1">' + n.getDate() + '</div>' +
        '<div style="font-size:18px;font-weight:800;letter-spacing:.1em;text-align:center;padding-bottom:10px;opacity:.7">' + DOWL[n.getDay()].toUpperCase() + '</div></div>' +
        '<div><div class="head" style="font-size:42px;line-height:1">' + esc(greet) + '</div><div style="margin-top:8px">' + big(118) + '</div></div></div>';
    else // 2: time | divider | greeting and date
      left = '<div style="display:flex;align-items:center;gap:32px;padding-top:14px">' + big(132) + '<div style="width:4px;height:128px;border-radius:2px;background:var(--accent)"></div>' +
        '<div><div class="head" style="font-size:44px;line-height:1.05">' + esc(greet) + '</div><div style="font-size:30px;font-weight:700;margin-top:10px">' + DOWL[n.getDay()] + '</div><div style="font-size:30px;font-weight:600;opacity:.8">' + MONL[n.getMonth()] + ' ' + n.getDate() + '</div></div></div>';
    return left + wx(style === 3 ? '<div class="head" style="font-size:36px;text-align:right;margin-top:10px">' + date + '</div>' : '');
  }
  function briefingBleed() {
    var n = now(), h = n.getHours(), m = n.getMinutes(), w = S.wx, ev = events(), wn = w && w.now || {};
    var greet = (h < 12 ? 'Good morning' : 'Good afternoon') + (C.familyName ? ', ' + C.familyName : '');
    var col = function (label, inner) { return '<div class="glass" style="display:flex;flex-direction:column;gap:14px;padding:22px 26px;min-width:0;min-height:0;overflow:hidden"><div class="lbl">' + label + '</div>' + inner + '</div>'; };
    // today
    var today = ev ? ev.filter(function (e) { return onDay(e, n) && !/dinner/i.test(e.who || '') && (e.allDay || e.end > n); }) : null;
    var sched = !ev ? note(esc(S.calErr || 'Loading calendar…')) : !today.length ? '<div class="head" style="font-size:34px;line-height:1.15">Nothing on the calendar — a free day</div>' :
      today.slice(0, 5).map(function (e) {
        return '<div style="display:flex;gap:14px;align-items:center"><div style="width:6px;align-self:stretch;border-radius:3px;background:' + esc(e.color) + ';flex-shrink:0"></div>' +
          '<div style="width:96px;flex-shrink:0;font-size:19px;font-weight:800">' + esc(e.allDay ? 'All day' : hm(e.start)) + '</div><div style="min-width:0;flex:1"><div class="ellip" style="font-size:22px;font-weight:700">' + esc(e.title) + '</div>' +
          '<div class="ellip" style="font-size:15px;opacity:.75">' + esc(e.who) + (e.leave ? ' · 🚗 leave ' + hm(e.leave) : '') + '</div></div></div>';
      }).join('') + (today.length > 5 ? '<div style="opacity:.7;font-size:16px">+' + (today.length - 5) + ' more</div>' : '');
    // wear
    var wa = w && wearAdvice(w);
    var wear = !wa ? note(esc(S.wxErr || 'Loading weather…')) : '<div style="display:flex;align-items:center;gap:16px"><span style="font-size:64px;line-height:1">' + wa.emoji + '</span><div class="head" style="font-size:34px;line-height:1.1">' + esc(wa.head) + '</div></div>' +
      '<div style="font-size:19px;opacity:.85">' + (num(w.hi) ? 'High ' + w.hi + '° · Low ' + w.lo + '°' : '') + (wn.text ? ' · ' + esc(wn.text) : '') + '</div>' +
      wa.extra.map(function (x) { return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.08)"><span style="font-size:26px">' + x[0] + '</span><span style="font-size:19px;font-weight:700">' + esc(x[1]) + '</span></div>'; }).join('');
    // tonight & ahead
    var rows = [], dinner = ev && ev.filter(function (e) { return onDay(e, n) && /dinner/i.test(e.who || ''); })[0];
    if (dinner) rows.push(['🍽️', 'Dinner tonight', dinner.title]);
    var seen = {};
    S.games.concat(S.mine || []).filter(function (g) { if (seen[g.id] || !(g.followed || g.morris) || g.state === 'post' || !sameDay(g.date, n)) return false; seen[g.id] = 1; return true; }).slice(0, 2).forEach(function (g) {
      var sum = S.sum[g.id] && S.sum[g.id].j; rows.push(['🏟️', g.lg + (g.state === 'in' ? ' · Live' : ' · ' + hm(g.date)) + (sum && sum.tv ? ' · ' + sum.tv : ''), g.teams[0].name + (g.teams[1].home ? ' at ' : ' vs ') + g.teams[1].name]);
    });
    var cd = countdownItems()[0]; if (cd) rows.push([cd.emoji, cd.n === 0 ? 'Today!' : cd.n + ' day' + (cd.n === 1 ? '' : 's') + ' to go', cd.name]);
    var ahead = rows.length ? rows.slice(0, 4).map(function (r) { return '<div style="display:flex;gap:14px;align-items:center"><span style="font-size:34px;width:44px;text-align:center;flex-shrink:0">' + r[0] + '</span><div style="min-width:0"><div style="font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.7">' + esc(r[1]) + '</div><div class="ellip" style="font-size:22px;font-weight:700">' + esc(r[2]) + '</div></div></div>'; }).join('')
      : '<div style="opacity:.75;font-size:19px">No games or plans tonight</div>';
    var tags = weeklyTags().concat(leaveTags(ev));
    return '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,6,18,.15) 0%,rgba(10,6,18,.45) 38%,rgba(10,6,18,.8) 100%)"></div>' +
      '<div style="position:absolute;left:44px;right:44px;top:30px;display:flex;justify-content:space-between;align-items:flex-start;text-shadow:0 2px 16px rgba(0,0,0,.4)">' +
      briefHead(greet, n, h, m, wn) + '</div>' +
      (tags.length ? '<div style="position:absolute;left:44px;right:44px;top:252px;display:flex;gap:10px;flex-wrap:wrap">' + tags.slice(0, 3).map(function (t) { return tagChip(t, true); }).join('') + '</div>' : '') +
      '<div style="position:absolute;left:36px;right:36px;bottom:30px;top:' + (tags.length ? 306 : 266) + 'px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">' +
      col('Today', sched) + col('What to wear', wear) + col('Tonight & ahead', ahead) + '</div>';
  }

  // ------------------------------------------------------------ live game takeover
  function liveState(g) { var l = S.sum[g.id] && S.sum[g.id].j && S.sum[g.id].j.live; return (l && l.state) || g.state; }
  function liveList() { // your teams' games in progress, plus a just-finished one (shown once)
    var seen = {}, list = S.games.concat(S.mine || []).filter(function (g) { if (!g.followed || seen[g.id]) return false; seen[g.id] = 1; return true; });
    list.forEach(function (g) { if (g.state === 'in') S.wasLive[g.id] = 1; });
    return list.filter(function (g) { return g.state === 'in' || (g.state === 'post' && S.wasLive[g.id] && (!S.finalShown[g.id] || (S.screen === 'live' && Date.now() - S.finalShown[g.id] < 120000))); });
  }
  function inCrunch(g) {
    if (!g || g.state !== 'in') return false;
    var l = (S.sum[g.id] && S.sum[g.id].j && S.sum[g.id].j.live) || {}, per = +l.period || 0, sp = g.sport;
    var reg = sp === 'hockey' ? 3 : sp === 'baseball' ? 9 : /college-basketball/.test(g.league) ? 2 : 4;
    var mm = /(\d+):(\d+)/.exec(l.clock || ''), secs = mm ? +mm[1] * 60 + +mm[2] : /^\d+(\.\d+)?$/.test(l.clock || '') ? +l.clock : 9999;
    var margin = Math.abs((parseFloat(g.teams[0].score) || 0) - (parseFloat(g.teams[1].score) || 0));
    var lim = (C.closeFinish || {})[sp] != null ? C.closeFinish[sp] : sp === 'football' ? 8 : sp === 'basketball' ? 6 : 1;
    if (sp === 'baseball') return per >= 9 && margin <= lim;
    return (per > reg || (per === reg && secs <= 300)) && margin <= lim;
  }
  function liveFromSummary(j, comp, cs) {
    if (!comp) return null;
    var st = comp.status || {}, ty = st.type || {}, scores = {}, win = {}, home = '';
    cs.forEach(function (c) { var ab = c.team ? c.team.abbreviation : ''; scores[ab] = scoreVal(c.score); win[ab] = !!c.winner; if (c.homeAway === 'home') home = ab; });
    var sit = j.situation || comp.situation || null, drv = j.drives && j.drives.current, dp = drv && drv.plays && drv.plays.length ? drv.plays[drv.plays.length - 1] : null;
    var plays = j.plays || [], lp = plays.length ? plays[plays.length - 1] : null;
    var last = (sit && sit.lastPlay && sit.lastPlay.text) || (dp && dp.text) || (lp && lp.text) || '';
    var down = (sit && (sit.downDistanceText || sit.shortDownDistanceText)) || (dp && dp.end && (dp.end.downDistanceText || dp.end.shortDownDistanceText)) || '';
    var poss = (sit && sit.possession) || (drv && drv.team && drv.team.id) || '';
    var wpa = j.winprobability || [], wp = wpa.length ? wpa[wpa.length - 1].homeWinPercentage : (sit && sit.lastPlay && sit.lastPlay.probability ? sit.lastPlay.probability.homeWinPercentage : null);
    return { state: ty.state, detail: ty.shortDetail || ty.detail || '', period: st.period, clock: st.displayClock, scores: scores, win: win, home: home, last: last, down: down, poss: poss, wp: typeof wp === 'number' ? wp : null };
  }
  function liveCards(g, lv, teams) {
    var card = function (inner, extra) { return '<div class="glass" style="padding:16px 22px;display:flex;flex-direction:column;gap:6px;min-width:0;overflow:hidden;' + (extra || '') + '">' + inner + '</div>'; };
    var reg = g.sport === 'hockey' ? 'Period' : g.sport === 'baseball' ? 'Inning' : /college-basketball/.test(g.league) ? 'Half' : 'Quarter';
    var left = lv.down ? card('<div class="lbl">On the field</div><div class="head" style="font-size:34px;line-height:1.1">' + esc(lv.down) + '</div>' + (teams.filter(function (t) { return t.poss; })[0] ? '<div style="font-size:18px;opacity:.8">🏈 ' + esc(teams.filter(function (t) { return t.poss; })[0].name) + ' ball</div>' : ''))
      : card('<div class="lbl">' + reg + '</div><div style="font-size:64px;font-weight:900;line-height:1">' + esc(lv.clock && g.sport !== 'baseball' ? lv.clock : lv.detail || '') + '</div><div style="font-size:18px;opacity:.8">' + esc(lv.detail || '') + '</div>');
    var mid = card('<div class="lbl">Last play</div><div class="clamp3" style="font-size:24px;font-weight:700;line-height:1.3">' + esc(lv.last || 'Waiting for the next play…') + '</div>');
    var right;
    if (lv.wp != null) {
      var homeT = teams.filter(function (t) { return t.abbr === lv.home; })[0] || teams[1], awayT = teams.filter(function (t) { return t !== homeT; })[0] || teams[0];
      var hp = Math.round(lv.wp * 100), ap = 100 - hp, fav = hp >= ap ? homeT : awayT, fp = Math.max(hp, ap);
      right = card('<div class="lbl">Win chances · ESPN</div><div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:52px;font-weight:900;line-height:1;color:var(--accent)">' + fp + '%</span><span class="ellip" style="font-size:20px;font-weight:800">' + esc(fav.name) + '</span></div>' +
        '<div style="display:flex;height:16px;border-radius:8px;overflow:hidden;margin-top:auto"><div style="width:' + ap + '%;background:' + glowColor(awayT) + '"></div><div style="width:' + hp + '%;background:' + glowColor(homeT) + '"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;opacity:.8"><span>' + esc(awayT.abbr) + ' ' + ap + '%</span><span>' + esc(homeT.abbr) + ' ' + hp + '%</span></div>');
    } else right = card('<div class="lbl">Updates</div><div style="font-size:20px;line-height:1.4;opacity:.85">Score and last play refresh every 30 seconds' + (inCrunch(g) ? ' — staying on this game for the finish' : '') + '</div>');
    return '<div style="position:absolute;left:40px;right:40px;bottom:30px;height:182px;display:grid;grid-template-columns:1fr 1.7fr 1fr;gap:14px">' + left + mid + right + '</div>';
  }

  // ------------------------------------------------------------ weather alerts
  var URGENT = /tornado (warning|emergency)|severe thunderstorm warning|flash flood (warning|emergency)|extreme wind warning|snow squall warning|dust storm warning/i;
  function isUrgent(a) { return !!(a && URGENT.test(a.event || '')); }
  function checkTakeover() { // urgent warnings take over for ~2½ minutes, then come back every ~10 minutes while they last
    if (STATIC || S.screen === 'alert') return;
    var urg = S.alerts.filter(isUrgent); if (!urg.length) return;
    var every = ((C.alerts && C.alerts.everyMin) || 10) * 60000;
    if (!urg.some(function (a) { return !S.alShown[a.id] || Date.now() - S.alShown[a.id] >= every; })) return;
    if (S.detail) { S.detail = null; $('overlay').className = ''; $('card').innerHTML = ''; stopRadar(); }
    urg.forEach(function (a) { S.alShown[a.id] = Date.now(); });
    S.resume = S.screen; S.screen = 'alert'; S.page = 0; render(); schedule();
  }
  function alertLook(a) {
    var e = a.event || '';
    if (URGENT.test(e)) return { c: '#e53935', emoji: /tornado/i.test(e) ? '🌪️' : /flood/i.test(e) ? '🌊' : /snow/i.test(e) ? '🌨️' : /wind|dust/i.test(e) ? '💨' : '⛈️' };
    if (/winter|snow|ice|blizzard|freez|frost|chill|cold|sleet/i.test(e)) return { c: '#5b7cff', emoji: /ice|freez|sleet/i.test(e) ? '🧊' : /chill|cold|frost/i.test(e) ? '🥶' : '❄️' };
    if (/watch/i.test(e)) return { c: '#fb8c00', emoji: /tornado/i.test(e) ? '🌪️' : /flood/i.test(e) ? '🌊' : '⛈️' };
    if (/heat/i.test(e)) return { c: '#ff6f3c', emoji: '🥵' };
    if (/fog/i.test(e)) return { c: '#90a4ae', emoji: '🌫️' };
    if (/wind/i.test(e)) return { c: '#26a69a', emoji: '💨' };
    if (/warning/i.test(e)) return { c: '#e53935', emoji: '⚠️' };
    return { c: '#f2b400', emoji: '⚠️' };
  }
  function alertParts(txt) { // NWS text: "* WHAT...Heavy snow. * WHERE...Kendall County. * WHEN..."
    var out = [], re = /\*\s*([A-Z][A-Z ]+?)\.\.\.([\s\S]*?)(?=\n\s*\*\s*[A-Z][A-Z ]+?\.\.\.|$)/g, m;
    while ((m = re.exec(txt || ''))) out.push([m[1].trim(), m[2].replace(/\s+/g, ' ').trim()]);
    return out;
  }
  function alertBleed(a, top, urgent) {
    if (!a) return emptyBleed('That alert has ended');
    var lk = alertLook(a), n = now(), on = a.onset ? new Date(a.onset) : null, end = a.until ? new Date(a.until) : null;
    var started = !on || on <= n, span = on && end && end > on ? Math.min(1, Math.max(0, (n - on) / (end - on))) : null;
    var parts = alertParts(a.description).filter(function (x) { return !/^WHERE$/.test(x[0]); });
    var what = parts.filter(function (x) { return x[0] === 'WHAT' || x[0] === 'HAZARD'; })[0];
    var rest = parts.filter(function (x) { return x !== what; }).slice(0, 3);
    var body = parts.length ? rest.map(function (x) { return '<div style="display:flex;gap:14px"><span style="width:96px;flex-shrink:0;font-size:14px;font-weight:900;letter-spacing:.08em;color:' + lk.c + ';filter:brightness(1.4);padding-top:6px">' + esc(x[0].replace('ADDITIONAL DETAILS', 'DETAILS')) + '</span><span class="clamp4" style="font-size:23px;line-height:1.35">' + esc(x[1]) + '</span></div>'; }).join('')
      : '<div class="clamp6" style="font-size:23px;line-height:1.4">' + esc((a.description || a.headline || '').replace(/\s+/g, ' ')) + '</div>';
    var instr = (a.instruction || '').replace(/\s+/g, ' ').trim();
    var when = function (d) { return sameDay(d, n) ? hm(d) : DOW[d.getDay()] + ' ' + hm(d); };
    var timeline = '<div style="display:flex;align-items:center;gap:16px;font-size:20px;font-weight:800"><span>' + (started ? 'In effect now' : 'Starts ' + esc(when(on))) + '</span>' +
      '<div style="flex:1;height:10px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden"><div style="height:100%;width:' + (span != null ? Math.max(3, span * 100) : started ? 50 : 0) + '%;background:' + lk.c + '"></div></div>' +
      '<span>' + (end ? 'Until ' + esc(when(end)) : '') + '</span></div>';
    return '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 70% at 15% 0%,' + lk.c + 'aa,transparent 70%),radial-gradient(ellipse at 50% 60%,#141019,#07060a 85%)"></div>' +
      (urgent ? '<div class="urgent-frame"></div><div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,' + lk.c + '18 0 26px,transparent 26px 52px)"></div>' : '') +
      '<div class="btag" style="background:' + lk.c + '">' + (urgent ? '⚠ Active warning' : 'Weather alert') + '</div>' + top +
      '<div style="position:absolute;left:56px;right:56px;top:96px;display:flex;flex-direction:column;gap:16px">' +
      '<div style="display:flex;align-items:center;gap:24px"><span style="font-size:110px;line-height:1">' + lk.emoji + '</span><div style="min-width:0"><div class="head" style="font-size:' + (a.event.length > 26 ? 62 : 78) + 'px;line-height:1">' + esc(a.event) + '</div>' +
      '<div class="clamp2" style="font-size:24px;font-weight:600;opacity:.85;margin-top:8px">' + esc(what ? what[1] : a.headline || '') + '</div></div></div>' + timeline + '</div>' +
      '<div style="position:absolute;left:40px;right:40px;bottom:32px;top:330px;display:grid;grid-template-columns:' + (instr ? '1.25fr 1fr' : '1fr') + ';gap:16px">' +
      '<div class="glass" style="padding:20px 24px;display:flex;flex-direction:column;gap:12px;overflow:hidden"><div class="lbl">Details · National Weather Service</div>' + body + '</div>' +
      (instr ? '<div class="glass" style="padding:20px 24px;display:flex;flex-direction:column;gap:12px;overflow:hidden;border-color:' + lk.c + '"><div class="lbl">What to do</div><div class="clamp6" style="font-size:26px;line-height:1.4;font-weight:600">' + esc(instr) + '</div></div>' : '') + '</div>';
  }
  function demoAlerts(kind) {
    var n = now(), t = function (hh) { return new Date(n.getTime() + hh * 3600000).toISOString(); };
    var w = { id: 'demo-w', event: 'Winter Storm Warning', onset: t(-2), until: t(20), headline: '', severity: 'Severe',
      description: '* WHAT...Heavy snow expected. Total snow accumulations of 6 to 10 inches.\n\n* WHERE...Kendall and Grundy counties.\n\n* WHEN...Until 6 PM CST Saturday.\n\n* IMPACTS...Travel could be very difficult. The hazardous conditions could impact the Saturday morning commute.',
      instruction: 'If you must travel, keep an extra flashlight, food, and water in your vehicle in case of an emergency. The latest road conditions can be obtained by calling 511.' };
    var u = { id: 'demo-u', event: 'Severe Thunderstorm Warning', onset: t(-0.2), until: t(0.6), severity: 'Severe',
      description: '* WHAT...60 mph wind gusts and quarter size hail.\n\n* WHERE...Yorkville, Oswego and Plano.\n\n* WHEN...Until 9:45 PM CDT.\n\n* IMPACTS...Hail damage to vehicles is expected. Expect wind damage to roofs, siding, and trees.',
      instruction: 'For your protection move to an interior room on the lowest floor of a building.' };
    return kind === 'urgent' ? [u] : kind === 'both' ? [u, w] : [w];
  }

  // ------------------------------------------------------------ family: countdowns and the reminders board
  var HOLI_EMOJI = { newyear: '🎆', mlk: '✊', valentines: '💘', presidents: '🇺🇸', stpatricks: '☘️', easter: '🐣', mothers: '💐', memorial: '🇺🇸', fathers: '👔', july4: '🎆', labor: '🛠️', halloween: '🎃', veterans: '🎖️', thanksgiving: '🦃', christmas: '🎄', nye: '🥂' };
  function cdEmoji(t) {
    var r = [[/disney|universal|vacation|trip|cruise|flight/i, '✈️'], [/beach|lake|pool/i, '🏖️'], [/birthday|bday/i, '🎂'], [/christmas/i, '🎄'], [/wedding|anniversary/i, '💍'], [/school|class/i, '🎒'], [/game|season|opener|tailgate/i, '🏈'], [/concert|show|tickets/i, '🎟️'], [/party/i, '🎉'], [/camp/i, '🏕️'], [/graduat/i, '🎓'], [/baby|due/i, '👶']];
    for (var i = 0; i < r.length; i++) if (r[i][0].test(t)) return r[i][1];
    return '⏳';
  }
  function countdownItems() { // your Countdowns calendar first, then birthdays and holidays
    var n = now(), mine = [], other = [];
    ((S.back && S.back.calendar && S.back.calendar.countdowns) || []).forEach(function (c) { var d = new Date(c.start), k = dayDiff(n, d); if (k >= 0) mine.push({ name: c.title, date: d, n: k, emoji: cdEmoji(c.title) }); });
    (C.birthdays || []).forEach(function (b) {
      var p = String(b.date || '').split('-'); if (p.length < 2) return;
      var d = new Date(n.getFullYear(), +p[0] - 1, +p[1]); if (dayDiff(n, d) < 0) d = new Date(n.getFullYear() + 1, +p[0] - 1, +p[1]);
      other.push({ name: b.name + '’s birthday', sub: b.year ? 'Turning ' + (d.getFullYear() - b.year) : '', date: d, n: dayDiff(n, d), emoji: '🎂' });
    });
    (window.upcomingHolidays ? window.upcomingHolidays(n, 4) : []).forEach(function (h) { other.push({ name: h.name, date: h.date, n: h.n, emoji: HOLI_EMOJI[h.id] || '🎉' }); });
    mine = mine.slice(0, 6); other.sort(function (a, b) { return a.n - b.n; });
    return mine.concat(other.slice(0, Math.max(0, 6 - mine.length))).sort(function (a, b) { return a.n - b.n; });
  }
  function countdownBleed(top) {
    var all = countdownItems(), k = all.length >= 6 ? 6 : all.length >= 4 ? 4 : all.length, list = all.slice(0, k);
    var cols = k === 4 ? 2 : Math.min(3, k), rows = Math.ceil(k / cols);
    var cards = list.map(function (c, i) {
      return '<div class="glass" style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;padding:18px;overflow:hidden;' + (i === 0 ? 'border:2px solid var(--accent);' : '') + '">' +
        '<div style="font-size:' + (rows > 1 ? 52 : 72) + 'px;line-height:1">' + c.emoji + '</div>' +
        (c.n === 0 ? '<div class="head" style="font-size:' + (rows > 1 ? 70 : 96) + 'px;line-height:1;color:var(--accent)">Today!</div>' :
          '<div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:' + (rows > 1 ? 96 : 130) + 'px;font-weight:900;line-height:.95;color:var(--accent);font-variant-numeric:tabular-nums">' + c.n + '</span><span style="font-size:24px;font-weight:800;opacity:.8">day' + (c.n === 1 ? '' : 's') + '</span></div>') +
        '<div class="ellip" style="max-width:100%;font-size:' + (rows > 1 ? 28 : 34) + 'px;font-weight:800">' + esc(c.name) + '</div>' +
        '<div style="font-size:17px;opacity:.75">' + esc(DOWL[c.date.getDay()] + ', ' + MONL[c.date.getMonth()] + ' ' + c.date.getDate() + (c.sub ? ' · ' + c.sub : '')) + '</div></div>';
    });
    return '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,6,18,.55),rgba(10,6,18,.75))"></div>' + btag('Countdowns') + top +
      '<div style="position:absolute;left:40px;right:40px;top:92px;bottom:32px;display:grid;grid-template-columns:repeat(' + cols + ',minmax(0,1fr));grid-template-rows:repeat(' + rows + ',minmax(0,1fr));gap:16px">' + cards.join('') + '</div>';
  }
  function boardLists() { // lists your iPhone Shortcut sends: one with "grocer" in the name, and the family board
    var L2 = (S.back && S.back.reminders && S.back.reminders.lists) || {}, out = { grocery: null, notes: [], at: null };
    Object.keys(L2).forEach(function (name) {
      var items = String(L2[name].items || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (/grocer|shopping/i.test(name)) { if (items.length) out.grocery = { name: name, items: items, at: L2[name].at }; }
      else if (/board|family|message|note/i.test(name)) out.notes = out.notes.concat(items);
    });
    return out;
  }
  function ago(iso) { var m = Math.round((Date.now() - new Date(iso)) / 60000); return !iso || isNaN(m) ? '' : m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; }
  function boardBleed(top) {
    var b = boardLists(), both = b.grocery && b.notes.length;
    var groc = '';
    if (b.grocery) {
      var it = b.grocery.items.slice(0, both ? 20 : 30), gc = both ? (it.length > 10 ? 2 : 1) : (it.length > 20 ? 3 : it.length > 10 ? 2 : 1);
      groc = '<div class="notepad"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="head" style="font-size:36px">🛒 ' + esc(b.grocery.name) + '</div><div style="font-size:16px;opacity:.6">' + b.grocery.items.length + ' item' + (b.grocery.items.length === 1 ? '' : 's') + (b.grocery.at ? ' · ' + ago(b.grocery.at) : '') + '</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(' + gc + ',minmax(0,1fr));grid-auto-rows:min-content;column-gap:28px;row-gap:2px;margin-top:10px">' + it.map(function (x) { return '<div class="ellip" style="display:flex;align-items:center;gap:12px;font-size:23px;font-weight:600;padding:5px 0;border-bottom:1px solid rgba(60,40,20,.15)"><span style="width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(60,40,20,.45);flex-shrink:0"></span>' + esc(x) + '</div>'; }).join('') + '</div>' +
        (b.grocery.items.length > it.length ? '<div style="margin-top:auto;font-size:17px;opacity:.6">+' + (b.grocery.items.length - it.length) + ' more on your phone</div>' : '') + '</div>';
    }
    var notes = '';
    if (b.notes.length) {
      var cols2 = ['#fff59d', '#ffcc80', '#a5d6a7', '#90caf9', '#f48fb1', '#ce93d8'], nn = b.notes.slice(0, both ? 4 : 6), nc = both ? 2 : 3;
      notes = '<div style="display:grid;grid-template-columns:repeat(' + nc + ',minmax(0,1fr));grid-template-rows:repeat(' + Math.ceil(nn.length / nc) + ',minmax(0,1fr));gap:22px;padding:8px;min-height:0">' + nn.map(function (x, i) {
        return '<div class="sticky" style="background:' + cols2[i % cols2.length] + ';transform:rotate(' + [-2, 1.5, -1, 2, -1.5, 1][i % 6] + 'deg)"><div class="clamp5" style="font-size:' + (x.length > 60 ? 22 : 28) + 'px">' + esc(x) + '</div></div>';
      }).join('') + '</div>';
    }
    return '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,6,18,.5),rgba(10,6,18,.75))"></div>' + btag('Family board') + top +
      '<div style="position:absolute;left:40px;right:40px;top:92px;bottom:32px;display:grid;grid-template-columns:' + (both ? '1fr 1fr' : '1fr') + ';gap:26px">' + groc + notes + '</div>';
  }

  // ------------------------------------------------------------ standings (Scores pages)
  var PRO = { nfl: 'NFL', nba: 'NBA', nhl: 'NHL', mlb: 'MLB', wnba: 'WNBA' };
  function standingsLeagues() { // leagues of your pro teams that are in season (one of your teams played or plays within 10 days)
    if (C.standings === false) return [];
    var out = [];
    C.teams.forEach(function (tm) {
      if (!PRO[tm.league] || out.indexOf(tm.league) >= 0) return;
      if (!DEMO && !(S.mine || []).some(function (g) { return g.league === tm.league; })) return;
      out.push(tm.league);
    });
    out.forEach(function (lg) { if (!S.standings[lg]) loadStandings(lg); });
    return out.filter(function (lg) { return S.standings[lg] && S.standings[lg].length; });
  }
  function loadStandings(league) {
    var tm = C.teams.filter(function (t) { return t.league === league; })[0], key = 'stand:' + league, c = load(key, 60 * 60000);
    if (window.__STAND && window.__STAND[league]) { S.standings[league] = window.__STAND[league]; return; }
    if (c) { S.standings[league] = c; return; }
    S.standings[league] = [];
    var base = 'https://site.api.espn.com/apis/v2/sports/' + tm.sport + '/' + league + '/standings';
    getJSON(base + (league === 'nba' || league === 'wnba' ? '' : '?level=3')).catch(function () { return getJSON(base); }).then(function (j) {
      var groups = [];
      (function walk(o, parent) {
        if (!o || typeof o !== 'object') return;
        var kids = o.children || [];
        if (o.standings && (o.standings.entries || []).length && !kids.length) groups.push({ name: o.name || '', abbr: o.abbreviation || '', parent: parent, entries: o.standings.entries.map(standRow) });
        kids.forEach(function (k) { walk(k, o.abbreviation || o.name || ''); });
      })(j, '');
      groups.forEach(function (g) { sortStand(g.entries, league); });
      S.standings[league] = groups; if (groups.length) save(key, groups);
      if (S.screen === 'scores') render();
    }).catch(function () { setTimeout(function () { delete S.standings[league]; }, 10 * 60000); });
  }
  function standRow(en) {
    var st = en.stats || [], t = en.team || {}, g = function (nm) { var x = st.filter(function (y) { return y.name === nm || y.type === nm; })[0]; return x ? (x.displayValue != null ? x.displayValue : x.value) : ''; },
      v = function (nm) { var x = st.filter(function (y) { return y.name === nm; })[0]; return x && typeof x.value === 'number' ? x.value : null; };
    return { id: t.id, name: t.shortDisplayName || t.name || t.displayName || '', full: t.displayName || '', abbr: t.abbreviation || '', logo: (t.logos && t.logos[0] && t.logos[0].href) || '',
      w: g('wins'), l: g('losses'), t: v('ties') ? g('ties') : '', otl: g('otLosses'), pct: g('winPercent'), gb: g('gamesBehind'), pts: g('points'), gp: g('gamesPlayed'), strk: g('streak'),
      seed: v('playoffSeed'), pv: v('points'), wp: v('winPercent'), wv: v('wins'), clinch: g('clincher') };
  }
  function sortStand(rows, league) {
    rows.sort(function (a, b) {
      if (league === 'nhl') return (b.pv || 0) - (a.pv || 0) || (b.wv || 0) - (a.wv || 0);
      return (b.wp || 0) - (a.wp || 0) || (b.wv || 0) - (a.wv || 0);
    });
  }
  function isMine(row, league) {
    return C.teams.some(function (tm) {
      if (tm.league !== league) return false;
      var k = String(tm.team || '').toLowerCase();
      return (tm.id && String(tm.id) === String(row.id)) || k === String(row.abbr).toLowerCase() || (tm.name && String(row.full).toLowerCase().indexOf(String(tm.name).toLowerCase()) >= 0);
    });
  }
  function standingsBleed(league, top) {
    var groups = S.standings[league] || []; if (!groups.length) return emptyBleed('Loading standings…');
    var pick = groups.filter(function (g) { return g.entries.some(function (r) { return isMine(r, league); }); }).slice(0, 2);
    if (pick.length < 2) { // keep it to two even panels: add the group next to yours
      var first = pick[0] || groups[0], sib = groups.filter(function (g) { return g !== first && g.parent === first.parent; })[0] || groups.filter(function (g) { return g !== first; })[0];
      pick = [first].concat(sib ? [sib] : []);
    }
    var tc = function (r) { var c = load('tc:' + league + ':' + r.id); return c && c.c1 ? c : null; };
    var ties = pick.some(function (g) { return g.entries.some(function (r) { return +r.t > 0; }); });
    var heads = league === 'nhl' ? ['GP', 'W', 'L', 'OTL', 'PTS'] : league === 'nfl' ? ['W', 'L'].concat(ties ? ['T'] : [], ['PCT', 'STRK']) : ['W', 'L', 'PCT', 'GB', 'STRK'];
    var vals = function (r) { return league === 'nhl' ? [r.gp, r.w, r.l, r.otl, r.pts] : league === 'nfl' ? [r.w, r.l].concat(ties ? [r.t || '0'] : [], [r.pct, r.strk]) : [r.w, r.l, r.pct, r.gb, r.strk]; };
    var glow = [];
    var panel = function (g) {
      var rows = g.entries, rh = Math.max(30, Math.min(118, Math.floor(600 / rows.length))), fs = rh >= 80 ? 28 : rh >= 56 ? 25 : rh >= 42 ? 21 : 17, lp = Math.min(64, Math.round(rh * .72));
      var grid = 'display:grid;grid-template-columns:' + (rh >= 80 ? 36 : 30) + 'px ' + (lp + 6) + 'px minmax(0,1fr) repeat(' + heads.length + ',' + (rh >= 42 ? 58 : 50) + 'px);align-items:center;column-gap:6px';
      return '<div class="glass" style="display:flex;flex-direction:column;padding:16px 18px;min-width:0;overflow:hidden">' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px"><img src="https://a.espncdn.com/i/teamlogos/leagues/500/' + league + '.png" alt="" style="width:46px;height:46px;object-fit:contain" onerror="this.remove()"><div class="head ellip" style="font-size:30px">' + esc(g.name.replace(/ Conference$/, '')) + '</div></div>' +
        '<div style="' + grid + ';font-size:13px;font-weight:800;letter-spacing:.08em;opacity:.6;padding:0 8px 6px"><span></span><span></span><span>TEAM</span>' + heads.map(function (h) { return '<span style="text-align:center">' + h + '</span>'; }).join('') + '</div>' +
        rows.map(function (r, i) {
          var me = isMine(r, league), c = tc(r), c1 = c ? c.c1 : '#555c68';
          if (me) glow.push(c ? glowColor({ c1: c.c1, c2: c.c2 }) : 'var(--accent)');
          return '<div style="' + grid + ';height:' + rh + 'px;padding:0 8px;border-radius:10px;font-size:' + fs + 'px;font-weight:' + (me ? 900 : 600) + ';box-shadow:inset 5px 0 0 ' + c1 + ';' +
            (me ? 'background:linear-gradient(90deg,' + teamBg({ c1: c1, c2: c ? c.c2 : '' }) + 'ee,' + teamBg({ c1: c1, c2: c ? c.c2 : '' }) + '66);' : i % 2 ? 'background:rgba(255,255,255,.04);' : '') + '">' +
            '<span style="opacity:.7;text-align:right;padding-right:4px">' + (i + 1) + '</span>' +
            (r.logo ? '<img src="' + esc(darkLogo(r.logo)) + '" alt="" style="width:' + lp + 'px;height:' + lp + 'px;object-fit:contain" onerror="this.onerror=null;this.src=\'' + esc(r.logo) + '\'">' : '<span></span>') +
            '<span class="ellip">' + esc(r.name) + (r.clinch && /^[xyz*e]$/i.test(r.clinch) ? ' <span style="font-size:.6em;opacity:.7">' + esc(r.clinch) + '</span>' : '') + '</span>' +
            vals(r).map(function (x) { return '<span style="text-align:center;font-variant-numeric:tabular-nums">' + esc(x == null ? '' : x) + '</span>'; }).join('') + '</div>';
        }).join('') + '</div>';
    };
    var html = pick.map(panel).join(''), ga = glow[0] || 'var(--accent)', gb = glow[1] || ga;
    return '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 80% at 0% 0%,' + ga + '66,transparent 70%),radial-gradient(ellipse 70% 80% at 100% 100%,' + gb + '66,transparent 70%),radial-gradient(ellipse at 50% 50%,#151a20,#07090c 80%)"></div>' +
      btag('Standings · ' + PRO[league]) + top +
      '<div style="position:absolute;left:36px;right:36px;top:88px;bottom:28px;display:grid;grid-template-columns:repeat(' + pick.length + ',minmax(0,1fr));gap:18px">' + html + '</div>';
  }

  // ------------------------------------------------------------ details
  function openDetail(kind, a, b) { S.detail = { kind: kind, a: a, b: b }; drawDetail(); schedule(); }
  function closeDetail() { S.detail = null; $('overlay').className = ''; $('card').innerHTML = ''; stopRadar(); schedule(); }
  function drawDetail() {
    var d = S.detail, card = $('card'), x = '<button type="button" class="x" data-close="1" aria-label="Close">' + icon('x', 20, 2) + '</button>', html = '';
    card.style.background = ''; card.style.borderColor = '';
    if (d.kind === 'game') html = gameDetailHTML(S.games[d.a]);
    else if (d.kind === 'news') html = newsDetailHTML(newsList()[d.a]);
    else if (d.kind === 'play') { var m = models()[d.a]; card.style.background = m.bg.replace(/^rgba\((\d+),\s*(\d+),\s*(\d+),[^)]*\)$/, 'rgb($1,$2,$3)'); card.style.borderColor = m.edge; html = playDetailHTML(m, m.plays[d.b]); }
    else if (d.kind === 'event') html = eventDetailHTML(events()[d.a]);
    else if (d.kind === 'radar') html = '<div class="lbl">Live radar · ' + esc(L.name) + '</div><div id="radar" style="flex:1;position:relative;overflow:hidden;border-radius:var(--r2);background:#0b0f17"></div><div class="muted" id="radarnote" style="font-size:13px">Loading radar…</div>';
    card.innerHTML = x + html; $('overlay').className = 'on';
    if (d.kind === 'game') loadBox(S.games[d.a]);
    if (d.kind === 'news') drawQR(newsList()[d.a]);
    if (d.kind === 'radar') startRadar();
  }
  function gameDetailHTML(g) {
    if (!g) return note('Game not found');
    return '<div class="lbl">' + esc(g.lg) + ' · ' + gameStatus(g) + '</div><div style="margin-right:60px">' + matchupHTML(g, 'big') + '</div><div id="box" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;flex:1;min-height:0">' + note('Loading…') + '</div>';
  }
  function loadBox(g) {
    if (!g) return;
    var box = function (html) { var el = $('box'); if (el) el.innerHTML = html; };
    if (g.morris) {
      var m = g.morris;
      box('<div class="tile" style="padding:16px 18px"><div class="lbl">Game</div><div style="font-size:18px;margin-top:8px">' + esc((m.home ? 'vs ' : 'at ') + m.opponent) + '</div><div class="muted" style="margin-top:6px">' + esc(m.notes || '') + '</div></div>' +
        '<div class="tile" style="padding:16px 18px"><div class="lbl">Where</div><div style="font-size:18px;margin-top:8px">' + esc(m.location || (m.home ? 'Morris' : '')) + '</div></div>');
      return;
    }
    if (DEMO) { box('<div class="tile" style="padding:16px 18px"><div class="lbl">Box score</div>' + note('Live box score from ESPN') + '</div><div class="tile" style="padding:16px 18px"><div class="lbl">Top performers</div>' + note('Live leaders from ESPN') + '</div>'); return; }
    getJSON(ESPN + g.sport + '/' + g.league + '/summary?event=' + g.id).then(function (j) {
      var comp = j.header && j.header.competitions && j.header.competitions[0], left, right;
      if (g.state === 'pre') {
        var pc = (j.pickcenter || [])[0], gi = j.gameInfo || {}, bc = comp && comp.broadcasts && comp.broadcasts[0];
        left = '<div class="tile" style="display:flex;flex-direction:column;gap:8px;padding:16px 18px"><div class="lbl">Game info</div><div style="font-size:17px">' + esc(whenLabel(g.date)) + '</div>' +
          (gi.venue ? '<div style="font-size:17px">' + esc(gi.venue.fullName) + '</div>' : '') + (bc ? '<div class="muted" style="font-size:15px">TV: ' + esc((bc.media && bc.media.shortName) || bc.type && bc.type.shortName || '') + '</div>' : '') + '</div>';
        right = '<div class="tile" style="display:flex;flex-direction:column;gap:8px;padding:16px 18px"><div class="lbl">Odds</div>' +
          (pc ? '<div style="font-size:20px;font-weight:800">' + esc(pc.details || '') + '</div><div style="font-size:17px">Total ' + esc(pc.overUnder != null ? pc.overUnder : '—') + '</div><div class="muted" style="font-size:13px">' + esc(pc.provider ? pc.provider.name : '') + '</div>' : note('No line posted yet')) + '</div>';
      } else {
        var rows = (comp ? comp.competitors : []).slice().sort(function (a, b) { return a.homeAway === 'away' ? -1 : 1; });
        var n = Math.max.apply(null, rows.map(function (c) { return (c.linescores || []).length; }).concat([4]));
        var head = '<span></span>'; for (var i = 1; i <= n; i++) head += '<span>' + (i <= 4 ? (g.sport === 'basketball' || g.sport === 'football' ? 'Q' + i : i) : 'OT' + (n > 5 ? i - 4 : '')) + '</span>';
        head += '<span>T</span>';
        var cols = 'grid-template-columns:repeat(' + (n + 2) + ',minmax(0,1fr))';
        left = '<div class="tile" style="display:flex;flex-direction:column;gap:10px;padding:16px 18px"><div class="lbl">Box score</div><div class="muted" style="display:grid;' + cols + ';gap:6px;font-size:14px">' + head + '</div>' +
          rows.map(function (c) {
            var ls = (c.linescores || []).map(function (x) { return '<span>' + esc(x.displayValue != null ? x.displayValue : x.value) + '</span>'; }).join('');
            for (var k = (c.linescores || []).length; k < n; k++) ls += '<span>—</span>';
            return '<div style="display:grid;' + cols + ';gap:6px;font-size:18px;font-weight:700"><span>' + esc(c.team.abbreviation) + '</span>' + ls + '<span>' + esc(scoreVal(c.score)) + '</span></div>';
          }).join('') + '</div>';
        var leaders = [];
        (j.leaders || []).forEach(function (tm) { (tm.leaders || []).slice(0, 2).forEach(function (cat) { var a = cat.leaders && cat.leaders[0]; if (a) leaders.push('<div style="font-size:15px"><b>' + esc(a.athlete ? a.athlete.shortName || a.athlete.displayName : '') + '</b> <span class="muted">(' + esc(tm.team ? tm.team.abbreviation : '') + ')</span> · ' + esc(a.displayValue || '') + '</div>'); }); });
        right = '<div class="tile" style="display:flex;flex-direction:column;gap:8px;padding:16px 18px;min-height:0;overflow:hidden"><div class="lbl">Top performers</div>' + (leaders.length ? leaders.slice(0, 6).join('') : note('Not available yet')) + '</div>';
      }
      box(left + right);
    }).catch(function () { box(note('Box score unavailable right now')); });
  }
  function newsDetailHTML(s) {
    if (!s) return note('Story not found');
    return '<div style="display:flex;gap:26px;flex:1;min-height:0">' + '<div style="width:420px;flex-shrink:0;border-radius:var(--r2);overflow:hidden;background:rgba(255,255,255,0.12)">' +
      (s.image ? '<img src="' + esc(s.image) + '" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : '') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;flex:1;padding-right:40px;min-height:0"><div class="lbl">' + esc(s.src) + '</div>' +
      '<div class="head clamp3" style="font-size:32px;line-height:1.12">' + esc(s.title) + '</div><div class="muted" style="font-size:14px">' + (s.date ? esc(whenLabel(new Date(s.date))) : '') + '</div>' +
      '<div class="muted clamp3" style="font-size:18px;line-height:1.5">' + esc(s.summary || '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:16px;margin-top:auto"><div id="qr" style="width:110px;height:110px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center"></div><div class="muted" style="font-size:16px">Scan to read the full story on your phone</div></div></div></div>';
  }
  function drawQR(s) {
    if (!s || !s.link) return;
    var go = function () { var q = window.qrcode(0, 'M'); q.addData(s.link); q.make(); var el = $('qr'); if (el) { el.innerHTML = q.createSvgTag({ cellSize: 3, margin: 2 }); var sv = el.querySelector('svg'); if (sv) { sv.removeAttribute('width'); sv.removeAttribute('height'); sv.style.width = '100%'; sv.style.height = '100%'; } } };
    if (window.qrcode) go(); else loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js').then(go).catch(function () { var el = $('qr'); if (el) el.style.display = 'none'; });
  }
  function playDetailHTML(m, p) {
    if (!p) return note('Play not found');
    var stats = (p.stats || []).slice(0, 6); while (stats.length < 6) stats.push({ label: '', value: '', from: '' });
    return '<div style="font-family:' + m.font + ';font-size:16px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + m.acc + '">' + esc(m.name) + '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-right:60px;gap:16px"><div class="ellip" style="font-family:' + m.font + ';font-size:38px;font-weight:700">' + esc(p.play) + '</div>' +
      '<div style="font-family:' + m.font + ';font-size:32px;font-weight:700;color:' + m.acc + '">' + esc(p.odds || '') + '</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:14px;flex:1">' + stats.map(function (st) {
        return '<div style="display:flex;flex-direction:column;justify-content:center;gap:4px;padding:14px 18px;border-radius:12px;background:rgba(255,255,255,0.08)">' +
          '<div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#dfe5ee">' + esc(st.label) + '</div>' +
          '<div style="font-family:' + m.font + ';font-size:30px;font-weight:700">' + esc(st.value) + '</div><div style="font-size:12px;color:#dfe5ee">' + esc(st.from) + '</div></div>';
      }).join('') + '</div><div style="font-size:14px;color:#dfe5ee">' + esc([p.status, p.book ? 'Best price @ ' + p.book : '', m.source].filter(Boolean).join(' · ')) + '</div>';
  }
  function eventDetailHTML(e) {
    if (!e) return note('Event not found');
    return '<div class="lbl">' + esc(e.who) + '</div><div class="head" style="font-size:36px;margin-right:60px">' + esc(e.title) + '</div>' +
      '<div style="font-size:20px">' + esc(e.allDay ? DOWL[e.start.getDay()] + ', ' + MONL[e.start.getMonth()] + ' ' + e.start.getDate() + ' · All day' : whenLabel(e.start) + ' – ' + hm(e.end)) + '</div>' +
      (e.location ? '<div class="muted" style="font-size:18px">' + esc(e.location) + '</div>' : '') +
      '<div class="muted" style="font-size:17px;line-height:1.5;white-space:pre-line;overflow:hidden">' + esc((e.description || '').slice(0, 600)) + '</div>';
  }

  // ------------------------------------------------------------ radar (RainViewer + CARTO basemap)
  var RADAR = { timer: null };
  // Radar: tiles are laid out around the center of the box, so it fills the box whatever its size.
  // RainViewer's free tiles stop at zoom 7 and allow ~100 requests a minute, so the loop is built once and reused for 5 minutes.
  function startRadar() {
    var box = $('radar'), noteEl = $('radarnote'); if (!box) return;
    if (DEMO) { noteEl.textContent = 'Live radar loop from RainViewer appears here'; return; }
    stopRadar();
    var run = function (frames) {
      box = $('radar'); noteEl = $('radarnote'); if (!box) return;
      box.innerHTML = RADAR.html;
      var layers = box.querySelectorAll('.rf'), k = layers.length - 1;
      var step = function () {
        if (!layers.length) return;
        layers[k].style.opacity = 0; k = (k + 1) % layers.length; layers[k].style.opacity = 0.9;
        noteEl.textContent = 'Radar ' + hm(new Date(frames[k].time * 1000)) + ' · RainViewer · map © Esri, HERE, Garmin, © OpenStreetMap contributors';
        RADAR.timer = setTimeout(step, k === layers.length - 1 ? 2000 : 600);
      };
      step();
    };
    if (RADAR.html && Date.now() - RADAR.t < 5 * 60000) return run(RADAR.frames);
    getJSON('https://api.rainviewer.com/public/weather-maps.json').then(function (j) {
      var frames = (j.radar && j.radar.past || []).slice(-6); if (!frames.length) throw new Error('no frames');
      var z = 7, scale = 1.7, n = Math.pow(2, z), latR = L.lat * Math.PI / 180;
      var px = (L.lon + 180) / 360 * n * 256, py = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n * 256;
      var tx0 = Math.floor((px - 400) / 256), tx1 = Math.floor((px + 400) / 256), ty0 = Math.floor((py - 250) / 256), ty1 = Math.floor((py + 250) / 256);
      var layer = function (urlFn, cls, extra, backup) {
        var h = '<div class="' + cls + '" style="position:absolute;left:50%;top:50%;width:0;height:0;transform:scale(' + scale + ');transform-origin:0 0;' + (extra || '') + '">';
        for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++)
          h += '<img alt="" src="' + urlFn(tx, ty) + '" style="position:absolute;width:256px;height:256px;max-width:none;left:' + (tx * 256 - px).toFixed(1) + 'px;top:' + (ty * 256 - py).toFixed(1) + 'px" onerror="' +
            (backup ? 'this.onerror=function(){this.style.visibility=\'hidden\'};this.src=\'' + backup(tx, ty) + '\';this.style.filter=\'invert(1) hue-rotate(180deg) brightness(.75)\'' : 'this.style.visibility=\'hidden\'') + '">';
        return h + '</div>';
      };
      // Esri's dark gray map (free, no key); if a tile fails it falls back to OpenStreetMap
      var esri = 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/';
      var html = layer(function (x, y) { return esri + 'World_Dark_Gray_Base/MapServer/tile/' + z + '/' + y + '/' + x; }, 'base', '', function (x, y) { return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png'; });
      frames.forEach(function (f) { html += layer(function (x, y) { return j.host + f.path + '/256/' + z + '/' + x + '/' + y + '/2/1_1.png'; }, 'rf', 'opacity:0;transition:opacity .3s'); });
      html += layer(function (x, y) { return esri + 'World_Dark_Gray_Reference/MapServer/tile/' + z + '/' + y + '/' + x; }, 'labels'); // city names on top of the radar
      html += '<div style="position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px rgba(0,0,0,.4)"></div>' +
        '<div style="position:absolute;left:50%;top:50%;margin:12px 0 0 -50px;width:100px;text-align:center;font-size:14px;font-weight:700;text-shadow:0 1px 3px #000">' + esc(L.name.split(',')[0]) + '</div>';
      RADAR.html = html; RADAR.frames = frames; RADAR.t = Date.now();
      run(frames);
    }).catch(function () { if (noteEl) noteEl.textContent = 'Radar unavailable right now'; });
  }
  function stopRadar() { clearTimeout(RADAR.timer); }

  // ------------------------------------------------------------ rotation + input
  function setScreen(name) {
    if (S.detail) { S.detail = null; $('overlay').className = ''; stopRadar(); }
    if (name === 'photos' && S.screen !== 'photos') S.photoIdx += 3;
    S.screen = name; S.page = 0; render(); schedule();
  }
  function schedule() {
    clearTimeout(S.timer); if (STATIC) return;
    var s = S.detail ? C.timing.detail : pageDur();
    S.timer = setTimeout(advance, s * 1000);
  }
  function advance() {
    if (S.detail) return closeDetail();
    if (S.screen === 'night') { if (!isNight()) return setScreen('home'); render(); schedule(); return; }
    var pg = pageList(S.screen);
    if (S.screen !== 'home' && S.page < pg.length - 1) { S.page++; render(); schedule(); return; }
    if (S.screen === 'alert') { var back = S.resume; S.resume = null; return setScreen(isNight() ? 'night' : back && back !== 'alert' && back !== 'night' ? back : 'home'); }
    if (isNight()) return setScreen('night');
    if (S.screen === 'live') { if (liveList().some(inCrunch)) { S.page = 0; S.lastPage = null; render(); schedule(); return; } return setScreen(ORDER[1]); } // close finish: stay on it
    if (S.screen === 'home' && liveList().length) return setScreen('live');
    setScreen(ORDER[(ORDER.indexOf(S.screen) + 1) % ORDER.length]);
  }
  var peekT = null;
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go],[data-open],[data-close],[data-page]');
    var st = $('stage');
    if (st.classList.contains('immersive') && !e.target.closest('#overlay')) { // full screens: a tap shows the menu for a few seconds
      st.classList.add('peek'); clearTimeout(peekT); peekT = setTimeout(function () { st.classList.remove('peek'); }, 6000);
    }
    if (S.screen === 'night') { S.wakeUntil = Date.now() + ((C.night && C.night.wakeMin) || 10) * 60000; return setScreen('home'); } // tap to wake
    if (!el) return;
    if (el.hasAttribute('data-close')) return closeDetail();
    if (el.hasAttribute('data-page')) { S.page = +el.getAttribute('data-page'); render(); schedule(); return; }
    if (el.hasAttribute('data-go')) return setScreen(el.getAttribute('data-go'));
    var p = el.getAttribute('data-open').split(':');
    openDetail(p[0], +p[1], +p[2]);
  });
  $('overlay').addEventListener('click', function (e) { if (e.target.id === 'overlay') closeDetail(); });

  function fit() {
    // Wider screens (a 16:9 TV) get a wider layout instead of black bars; the Echo Show stays 1280×800
    var ar = innerWidth / innerHeight, w = Math.round(Math.min(1600, Math.max(1280, 800 * ar))), st = $('stage');
    var s = Math.min(innerWidth / w, innerHeight / 800);
    st.style.width = w + 'px'; st.style.transform = 'scale(' + s + ')';
    st.style.left = Math.max(0, (innerWidth - w * s) / 2) + 'px'; st.style.top = Math.max(0, (innerHeight - 800 * s) / 2) + 'px';
    if (S.stageW && S.stageW !== w) { S.stageW = w; render(); } S.stageW = w;
  }
  function start() {
    var v = $('keepalive'); try { var p = v.play(); if (p && p.catch) p.catch(function () { }); } catch (e) { /* ignore */ }
    var de = document.documentElement, rf = de.requestFullscreen || de.webkitRequestFullscreen;
    if (rf) { try { var r = rf.call(de); if (r && r.catch) r.catch(function () { }); } catch (e) { /* ignore */ } }
    $('start').style.display = 'none';
  }

  // ------------------------------------------------------------ demo data (placeholders only)
  function demoWeather() {
    var n = now(), days = [], hours = [];
    for (var i = 0; i < 7; i++) { var d = new Date(n.getTime() + i * 86400000); days.push({ label: i ? DOW[d.getDay()] : 'Today', hi: '—', lo: '—', pop: '—', icon: 'partly', text: '' }); }
    for (var k = 0; k < 12; k++) hours.push({ t: k ? hShort(new Date(n.getTime() + k * 3600000)) : 'Now', temp: '—', pop: '—', icon: 'partly' });
    return { src: ['Demo'], now: { temp: '—', feels: '—', hum: '—', wind: '—', gust: '—', dir: '', text: '[Forecast]', icon: 'partly' }, hours: hours, days: days, moon: moonInfo(n) };
  }
  function demoGames() {
    var T = function (abbr, name, c1, c2) { return { abbr: abbr, name: name, c1: c1, c2: c2, logo: '', score: '—', winner: false }; };
    var O = function () { return T('OPP', '[Opponent]', NEUTRAL.c1, NEUTRAL.c2); }, M = function () { return T('TM', '[Team]', NEUTRAL.c1, NEUTRAL.c2); };
    var pre = function (g) { g.teams.forEach(function (t) { t.score = ''; }); g.state = 'pre'; return g; };
    return [
      { id: 'd1', lg: 'NFL', state: 'post', status: 'Final', teams: [T('TEN', 'Titans', '#0C2340', '#4B92DB'), O()] },
      { id: 'd2', lg: 'IHSA', state: 'post', status: 'Final', teams: [T('MOR', 'Morris', '#5D2E2F', '#C1A675'), O()] },
      { id: 'd3', lg: 'CFB', state: 'post', status: 'Final', teams: [M(), M()] },
      pre({ id: 'd4', lg: 'NBA', status: 'Tonight', teams: [M(), M()] }),
      pre({ id: 'd5', lg: 'CFB', status: 'Sat', teams: [M(), M()] }),
      pre({ id: 'd6', lg: 'NFL', status: 'Sun', teams: [T('TEN', 'Titans', '#0C2340', '#4B92DB'), O()] })
    ];
  }
  function demoBack() {
    var n = now(), at = function (dd, h) { return new Date(n.getFullYear(), n.getMonth(), n.getDate() + dd, h, 0).toISOString(); };
    var cols = ['#ffb35c', '#8fc8ff', '#a9e09f', '#f5a9cf', '#d9b8ff'], evs = [];
    for (var i = 0; i < 4; i++) evs.push({ title: '[Event]', start: at(0, 17 + i), end: at(0, 18 + i), calendar: '[Name]', color: cols[i] });
    for (var j = 1; j <= 5; j++) evs.push({ title: '[Event]', start: at(j, 16), end: at(j, 17), calendar: '[Name]', color: cols[j - 1] });
    var story = function () { return { title: '[Headline]', link: 'https://example.com', image: '', summary: '[First few lines of the story from the news feed]', date: n.toISOString() }; };
    var three = function (play, line, stats) { return [0, 1, 2].map(function () { return { play: play, line: line, odds: '[Odds]', status: 'Locks [Time]', book: '[Book]', stats: stats.map(function (s) { return { label: s[0], value: '—', from: s[1] }; }) }; }); };
    return {
      calendar: { events: evs }, photos: { items: [] }, morris: { games: [] },
      news: { sources: { 'AP': [story(), story()], 'Chicago Tribune': [story()], 'Sun-Times': [story()], 'WGN': [story()], 'NBC 5': [story()], 'ABC 7': [story()], 'Shaw Local': [story(), story()] } },
      plays: { models: [
        { name: 'NBAPropSignal', record: 'Form 6 [W–L] · [units]', source: 'Morning Form 6 · trimmed L10 vs line · xEP · 1 unit flat', plays: [1, 2, 3, 4, 5, 6].map(function (k) { return three('[Player] O [Line] [stat]', '#' + k + ' · xEP [proj] · L10 [avg] · [Grade] · [Game]', [['xEP projection', 'xEP'], ['Trimmed L10', 'Game logs'], ['Form gap', 'Form 6'], ['Projected minutes', 'NBAPropSignal'], ['Grade', 'xEP'], ['Price', 'Best line']])[0]; }) },
        { name: 'Moonshot', record: '[W] up / [L] down · [$]', source: 'Paper trial · $5 straights · $1 round robin · $1 top-3 parlay', plays: three('[Player] 5+ threes', 'Model [x]% vs book [x]%', [['Model prob', 'Moonshot'], ['Book implied', 'Sportsbook'], ['Edge', 'Moonshot'], ['Est. EV', 'Moonshot'], ['Best price', 'Pikkit / books'], ['Matchup', 'Schedule']]) },
        { name: 'NFL Props', record: 'Week [x]', source: 'V3 top signal scores this week · BET and LEAN straights', plays: three('[Player] O [Line] rec yds', 'LEAN · hit [x]% · [Team] vs [Opp]', [['Est. hit %', 'NFLPropSignal V3'], ['Est. EV', 'NFLPropSignal V3'], ['Signal score', 'NFLPropSignal V3'], ['Slate rank', 'Slate'], ['Bet-to price', 'Price needed to BET'], ['Price', 'Best line']]) }
      ] }
    };
  }

  // ------------------------------------------------------------ auto-update
  // Every 5 minutes, check whether any dashboard file changed on GitHub; if so, reload.
  var WATCH = ['index.html', 'style.css', 'config.js', 'themes.js', 'scenes.js', 'app.js'], PRINT = null;
  function fingerprint() {
    return Promise.all(WATCH.map(function (f) { return fetch(f + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }); }))
      .then(function (ts) { return ts.map(function (x) { var h = 0; for (var i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0; return x.length + ':' + h; }).join('|'); });
  }
  function checkUpdate() {
    fingerprint().then(function (fp) { if (PRINT && fp !== PRINT) location.reload(); PRINT = PRINT || fp; }).catch(function () { /* offline: try again later */ });
  }

  // ------------------------------------------------------------ boot
  function every(fn, ms) { fn(); return setInterval(fn, ms); }
  window.addEventListener('resize', fit); fit();
  if (C.lowPower) document.body.classList.add('low');
  if (DEMO) {
    $('demo').innerHTML = 'Demo data · preview look <select id="lookpick" aria-label="Preview a seasonal look" style="font:inherit;background:rgba(0,0,0,.5);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:6px;padding:2px 4px"><option value="">Today</option>' +
      THEME_IDS.map(function (id) { return '<option value="' + id + '"' + (id === FORCE_THEME ? ' selected' : '') + '>' + id + '</option>'; }).join('') + '</select>';
    $('lookpick').addEventListener('change', function (e) { FORCE_THEME = e.target.value || null; S.theme = null; applyTheme(); });
  }
  applyTheme(); tick(); setInterval(tick, 1000);
  $('startbtn').addEventListener('click', start);
  if (Q.has('nostart') || DEMO) $('start').style.display = 'none'; else setTimeout(function () { $('start').style.display = 'none'; }, 15000);
  render();
  if (!DEMO && location.protocol.indexOf('http') === 0) every(checkUpdate, 5 * 60000);
  every(loadWeather, 10 * 60000);
  every(loadAlerts, 5 * 60000);
  loadBackend().then(function () { every(loadScores, 2 * 60000); });
  setInterval(loadBackend, 10 * 60000);
  setInterval(function () { if (S.screen === 'home' && !S.detail) { S.photoIdx++; showPhoto('homephoto'); } }, 15000);
  setInterval(function () { if (S.games.some(function (g) { return g.state === 'in'; })) loadScores(); }, 45000);
  setInterval(function () { liveList().forEach(function (g) { if (g.state === 'in') ensureSummary(g); }); }, 30000); // live game: score, last play and win chances every 30 seconds
  if (DEMO && Q.get('alerts')) S.alerts = demoAlerts(Q.get('alerts'));
  if (Q.get('pg')) setTimeout(function () { var i = pageList(S.screen).indexOf(Q.get('pg')); if (i >= 0) { S.page = i; render(); } }, 200);
  var D = Q.get('detail');
  if (D) { var p = D.split(':'); setTimeout(function () { openDetail(p[0], +(p[1] || 0), +(p[2] || 0)); }, 300); } else { if (isNight() && S.screen === 'home') S.screen = 'night'; render(); schedule(); }
})();
