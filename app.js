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
  var S = { screen: ORDER.indexOf(Q.get('screen')) >= 0 ? Q.get('screen') : 'home', detail: null, theme: null, lastScreen: null,
    wx: null, alerts: [], games: [], back: null, backErr: null, wxErr: null, scoresErr: null, photoIdx: 0, timer: null, page: +(Q.get('page') || 0), lastPage: null, sum: {} };
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------ helpers
  function now() {
    var n = new Date();
    if (FORCE_DATE) { var p = FORCE_DATE.split('-'); n = new Date(+p[0], +p[1] - 1, +p[2], n.getHours(), n.getMinutes(), n.getSeconds()); }
    return n;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
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
    var t = resolveTheme(now(), FORCE_THEME, C.birthdays || []);
    if (S.theme && S.theme.id === t.id && S.theme.sub === t.sub && S.theme.title === t.title) return;
    var changedLook = !S.theme || S.theme.id !== t.id;
    S.theme = t;
    var st = document.documentElement.style;
    [['--panel', t.panel], ['--solid', t.solid], ['--edge', t.edge], ['--tile', t.tile], ['--accent', t.accent], ['--ink', t.ink], ['--muted', t.muted],
      ['--r', t.r + 'px'], ['--r2', t.r2 + 'px'], ['--head', t.head], ['--body', t.body], ['--headW', String(t.headW)], ['--headLs', t.headLs],
      ['--titleSize', t.titleSize + 'px'], ['--h2', t.h2 + 'px']].forEach(function (p) { st.setProperty(p[0], p[1]); });
    if (changedLook) { $('fonts').href = themeFontsHref(t); $('scene').innerHTML = buildScene(t.id, C.lowPower); }
    $('btitle').textContent = t.title; $('bsub').textContent = t.sub;
    fitTitle(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
  }
  function fitTitle() { // as big as the space between the clock and the weather allows
    var el = $('btitle'), bar = $('topbar'), room = bar.clientWidth - bar.children[0].offsetWidth - bar.children[2].offsetWidth - 2 * 16 - 72, size = Math.round((S.theme.titleSize || 34) * 1.5);
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > room && size > 26) { size -= 2; el.style.fontSize = size + 'px'; }
  }
  function tick() {
    var n = now(), h = n.getHours(), m = n.getMinutes();
    $('time').textContent = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m;
    $('ampm').textContent = h < 12 ? 'AM' : 'PM';
    $('dow').textContent = DOWL[n.getDay()];
    $('date').textContent = MONL[n.getMonth()] + ' ' + n.getDate();
    $('cdate').style.display = S.theme && S.theme.isHoliday ? 'flex' : 'none';
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
      S.alerts = (j.features || []).map(function (f) { var p = f.properties; return { event: p.event, until: p.ends || p.expires, headline: p.headline }; });
      renderAlert();
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
    var key = 'teams:' + league, cached = load(key, 86400000);
    if (cached) return Promise.resolve(cached);
    return getJSON(ESPN + sport + '/' + league + '/teams?limit=1000').then(function (j) {
      var map = {};
      ((j.sports || [])[0] || { leagues: [] }).leagues[0].teams.forEach(function (x) {
        var t = x.team; map[t.id] = { color: t.color ? '#' + t.color : null, alt: t.alternateColor ? '#' + t.alternateColor : null, logo: t.logos && t.logos[0] ? t.logos[0].href : null };
      });
      save(key, map); return map;
    }).catch(function () { return {}; });
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
        c1: c1 || NEUTRAL.c1, c2: c2 || NEUTRAL.c2, score: st.state === 'pre' ? '' : scoreVal(c.score), winner: !!c.winner, home: c.homeAway === 'home', rec: recOf(c), id: t.id };
    });
    var status = st.state === 'pre' ? whenLabel(d) : (st.shortDetail || st.detail || '');
    return { id: ev.id, sport: sport, league: league, lg: label, state: st.state, status: status, date: d, teams: teams };
  }
  function loadScores() {
    if (DEMO) { S.games = demoGames(); render(); return Promise.resolve(); }
    var n = now(), out = [], seen = {};
    function add(g) { if (g && !seen[g.id]) { seen[g.id] = 1; out.push(g); } }
    var followed = C.teams.map(function (tm) {
      var label = tm.league === 'nfl' ? 'NFL' : tm.league === 'nba' ? 'NBA' : tm.league === 'college-football' ? 'CFB' : tm.league.toUpperCase();
      return teamDirectory(tm.sport, tm.league).then(function (dir) {
        return getJSON(ESPN + tm.sport + '/' + tm.league + '/teams/' + tm.team + '/schedule').then(function (j) {
          var mine = j.team || {}, evs = (j.events || []).map(function (e) {
            var g = parseEvent(e, tm.sport, tm.league, label, dir); g.followed = true;
            g.teams.forEach(function (t) { if (String(t.id) === String(mine.id) && mine.recordSummary && (g.state !== 'post' || !t.rec)) t.rec = mine.recordSummary; });
            return g;
          });
          var live = evs.filter(function (g) { return g.state === 'in'; });
          var past = evs.filter(function (g) { return g.state === 'post' && (n - g.date) < 10 * 86400000; }).sort(function (a, b) { return b.date - a.date; });
          var next = evs.filter(function (g) { return g.state === 'pre'; }).sort(function (a, b) { return a.date - b.date; });
          return live.length ? [live[0], next[0]] : [past[0], next[0]];
        });
      }).catch(function () { return []; });
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
      all.concat(fillAll).filter(function (g) { return g.state === 'in'; }).forEach(add);
      all.forEach(add); morris.forEach(add);
      var rank = function (g) { return g.state === 'pre' ? 1 : 2; };
      fillAll.filter(function (g) { return dayDiff(n, g.date) >= -1 && dayDiff(n, g.date) <= 2; })
        .sort(function (a, b) { return rank(a) - rank(b) || (rank(a) === 1 ? a.date - b.date : b.date - a.date); }).forEach(add);
      S.games = out.slice(0, 6); S.scoresErr = null; featureGames().forEach(ensureSummary); render();
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
    return (b.calendar.events || []).map(function (e) { return { title: e.title, start: new Date(e.start), end: new Date(e.end), allDay: e.allDay, who: e.calendar, color: e.color || '#ffb35c', location: e.location, description: e.description }; })
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
      while (PHOTO_ORDER.length > 6) delete PHOTO_CACHE[PHOTO_ORDER.shift()];
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
    var html = S.screen === 'home' ? homeHTML() : fullHTML();
    el.innerHTML = '<div class="' + (fresh ? 'screen-in' : '') + '">' + html + '</div>';
    $('nav').style.display = S.screen === 'home' ? 'none' : 'flex';
    $('navbar').innerHTML = ORDER.map(function (k) { return '<button type="button" data-go="' + k + '" class="' + (k === S.screen ? 'on' : '') + '">' + LABELS[k] + '</button>'; }).join('');
    if (S.screen === 'photos' || S.screen === 'home') hookPhotos();
    var p = S.screen === 'home' ? '' : curPage();
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
    var fam = '<div class="lbl">' + label + '</div>' + (!ev ? note(S.backErr === 'setup' ? 'Calendar not connected yet' : esc(S.calErr || (S.backErr ? 'Can\u2019t reach your Google data — open Family for details' : 'Loading…'))) :
      !list.length ? note(S.calMissing && S.calMissing.length ? 'Can\u2019t open ' + esc(S.calMissing.join(' \u00b7 ')) : 'Nothing on the calendar this week') : list.slice(0, 4).map(function (e) {
        return '<div style="display:flex;align-items:center;gap:10px"><div style="width:9px;height:9px;border-radius:50%;background:' + esc(e.color) + ';flex-shrink:0"></div>' +
          '<div style="min-width:0"><div class="ellip" style="font-size:16px;font-weight:700">' + esc(e.title) + '</div><div class="muted ellip" style="font-size:13px">' + (e.soon ? DOW[e.start.getDay()] + ' ' : '') + (e.allDay ? 'All day' : hm(e.start)) + ' · ' + esc(e.who) + '</div></div></div>';
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
    var WXT = { now: 'Right now', hours: 'Next 12 hours', week: 'The week ahead', sky: 'Sun & moon', radar: 'Live radar' };
    var t = { family: ['Family schedule', 'From the family calendar'], photos: [S.theme && S.theme.birthdayNames ? S.theme.birthdayNames.join(' & ') + '\u2019s photos' : 'Family photos', ''],
      scores: ['Scores & games', p === 'grid' ? 'Tap a game for the box score' : ''], plays: ['Today’s plays', 'Tap a play for the breakdown · 1 unit flat'],
      news: ['Top news', pg.length > 1 ? 'Story ' + (S.page + 1) + ' of ' + pg.length : ''], weather: ['Weather', (WXT[p] || '') + ' · ' + L.name] }[S.screen];
    if (S.screen === 'scores' && p !== 'grid') { var g = S.games.filter(function (x) { return 'g:' + x.id === p; })[0]; if (g) t = [g.teams[0].name + (g.teams[0].home ? ' vs ' : ' at ') + g.teams[1].name, g.lg + (g.state === 'pre' ? ' · Up next' : g.state === 'in' ? ' · Live' : ' · Final')]; }
    var body = S.screen === 'scores' ? scoresBody(p) : S.screen === 'news' ? (p === 'empty' ? note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…')) : newsPage(+p.slice(2))) :
      S.screen === 'weather' ? weatherPage(p) : { family: familyHTML, photos: photosHTML, plays: playsHTML }[S.screen]();
    if (S.screen === 'photos') { var ph = photos(), cur = ph && ph.length ? ph[S.photoIdx % ph.length] : null; t[1] = cur ? [cur.album, cur.taken ? 'Taken ' + MON[new Date(cur.taken).getMonth()] + ' ' + new Date(cur.taken).getDate() + ', ' + new Date(cur.taken).getFullYear() : ''].filter(Boolean).join(' · ') : ''; }
    return '<section class="full frost"><header><h1 class="ellip">' + esc(t[0]) + '</h1><div style="display:flex;align-items:center;gap:18px;flex-shrink:0"><div class="muted ellip">' + esc(t[1]) + '</div>' + dotsHTML(pg) + '</div></header>' + body + '</section>';
  }
  function familyHTML() {
    var ev = events(); if (!ev) return note(S.backErr === 'setup' ? SETUP : esc(S.calErr || S.backErr || 'Loading…'));
    var n = now(), today = ev.filter(function (e) { return sameDay(e.start, n) && (e.allDay || e.end > n); }).slice(0, 5);
    var week = ev.filter(function (e) { var dd = dayDiff(n, e.start); return dd >= 1 && dd <= 6; }).slice(0, 5);
    var row = function (e, showDay, i) {
      var when = showDay ? DOW[e.start.getDay()] + (e.allDay ? '' : ' ' + hm(e.start).replace(' ', ' ')) : (e.allDay ? 'All day' : hm(e.start));
      return '<button type="button" class="tap" data-open="event:' + i + '" style="align-items:center;gap:14px;padding:6px 0">' +
        '<div class="muted" style="width:' + (showDay ? 120 : 84) + 'px;font-size:15px;flex-shrink:0">' + esc(when) + '</div>' +
        '<div style="width:11px;height:11px;border-radius:50%;background:' + esc(e.color) + ';flex-shrink:0"></div>' +
        '<div class="ellip" style="font-size:20px;font-weight:700;flex:1">' + esc(e.title) + '</div><div class="muted ellip" style="font-size:15px;max-width:140px">' + esc(e.who) + '</div></button>';
    };
    var col = function (label, list, showDay) {
      return '<div class="tile" style="display:flex;flex-direction:column;gap:6px;padding:18px 22px;min-height:0"><div class="lbl">' + label + '</div>' +
        (list.length ? list.map(function (e) { return row(e, showDay, ev.indexOf(e)); }).join('') : note(showDay ? 'Nothing else this week' : 'Nothing else today')) + '</div>';
    };
    var warn = S.calMissing && S.calMissing.length ? '<div style="padding:10px 16px;border-radius:10px;background:rgba(255,120,80,0.18);border:1px solid rgba(255,140,100,0.5);font-size:15px">Can\u2019t open ' + esc(S.calMissing.join(' \u00b7 ')) + '</div>' : '';
    return warn + '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + col('Today', today, false) + col('Rest of the week', week, true) + '</div>';
  }

  function photosHTML() {
    var ph = photos(); if (!ph) return note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…'));
    if (!ph.length) return note('Add photos to your dashboard photo folder in Google Drive.');
    var cur = ph[S.photoIdx % ph.length];
    return '<div id="bigphoto" style="flex:1;border-radius:var(--r2);background:#000 center/contain no-repeat"></div>';
  }
  function hookPhotos() { showPhoto(S.screen === 'home' ? 'homephoto' : 'bigphoto'); }

  function scoresHTML() {
    if (!S.games.length) return note(esc(S.scoresErr || 'Loading scores…'));
    var tiles = S.games.slice(0, 6).map(function (g, i) {
      return '<button type="button" class="tap tile" data-open="game:' + i + '" style="flex-direction:column;justify-content:center;gap:6px;padding:12px 14px">' +
        '<div class="muted" style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase"><span>' + esc(g.lg) + '</span>' + gameStatus(g) + '</div>' +
        matchupHTML(g, 'tile') + '</button>';
    });
    while (tiles.length < 6) tiles.push('<div class="tile">' + note('No other games right now') + '</div>');
    return '<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))">' + tiles.join('') + '</div>';
  }

  function playsHTML() {
    var md = models(); if (!md) return note(S.backErr === 'setup' ? SETUP : esc(S.backErr || 'Loading…'));
    var cards = md.slice(0, 4).map(function (m, mi) {
      var rows = (m.plays || []).slice(0, 3).map(function (p, ri) {
        return '<button type="button" class="tap" data-open="play:' + mi + ':' + ri + '" style="justify-content:space-between;align-items:center;gap:10px;padding:4px 10px;border-radius:8px;background:rgba(255,255,255,0.07)">' +
          '<div style="min-width:0"><div class="ellip" style="font-size:16px;font-weight:700">' + esc(p.play) + '</div><div class="ellip" style="font-size:12px;color:#dfe5ee">' + esc(p.line || '') + '</div></div>' +
          '<div style="font-family:' + m.font + ';font-size:17px;font-weight:700;color:' + m.acc + '">' + esc(p.odds || '') + '</div></button>';
      }).join('');
      return '<div style="display:flex;flex-direction:column;gap:6px;padding:12px 18px;border-radius:14px;background:' + m.bg + ';border:1px solid ' + m.edge + ';min-height:0">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-family:' + m.font + ';font-size:20px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:' + m.acc + '">' + esc(m.name) + '</span><span style="font-size:13px;color:#dfe5ee">' + esc(m.record || '') + '</span></div>' +
        (rows || '<div class="note" style="color:#dfe5ee">' + esc(m.note || 'No plays yet today') + '</div>') + '<div style="font-size:11px;color:#dfe5ee;margin-top:auto">' + esc(m.source || '') + '</div></div>';
    });
    while (cards.length < 4) cards.push('<div class="tile">' + note('Add another model in Code.gs') + '</div>');
    return '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))">' + cards.join('') + '</div>';
  }

  // ------------------------------------------------------------ pages: Scores, News and Weather cycle through full-screen pages
  function featureGames() { // your teams' latest final and next game, Morris, and anything live
    return S.games.filter(function (g) { return g.followed || g.morris || g.state === 'in'; }).slice(0, 4);
  }
  function pageList(screen) {
    if (screen === 'scores') return S.games.length ? ['grid'].concat(featureGames().map(function (g) { return 'g:' + g.id; })) : ['grid'];
    if (screen === 'news') { var nw = newsStories(); return nw && nw.length ? nw.map(function (s, i) { return 's:' + i; }) : ['empty']; }
    if (screen === 'weather') return S.wx ? ['now', 'hours', 'week', 'sky', 'radar'] : ['empty'];
    return ['main'];
  }
  function pageDur() {
    var t = C.timing;
    if (S.screen === 'home') return t.home;
    if (S.screen === 'news') return t.story || 10;
    if (S.screen === 'scores') return S.page === 0 ? (t.scoresGrid || 15) : (t.page || 12);
    if (S.screen === 'weather') return t.page || 12;
    return t.screen;
  }
  function curPage() { var pg = pageList(S.screen); return pg[S.page < pg.length ? S.page : 0]; }
  function dotsHTML(pg) {
    if (pg.length < 2) return '';
    return '<div class="dots">' + pg.map(function (p, i) { return '<button type="button" data-page="' + i + '" class="' + (i === S.page ? 'on' : '') + '" aria-label="Page ' + (i + 1) + '" style="--dur:' + pageDur() + 's"></button>'; }).join('') + '</div>';
  }

  // ---- scores
  function scoresBody(p) {
    if (p === 'grid') return scoresHTML();
    var id = p.slice(2), g = S.games.filter(function (x) { return String(x.id) === id; })[0];
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
    var rows = sum.lines, n = Math.max.apply(null, rows.map(function (r) { return r.ls.length; }).concat([4]));
    var per = function (i) { return i <= 4 ? (g.sport === 'basketball' || g.sport === 'football' ? 'Q' + i : String(i)) : (n > 5 ? 'OT' + (i - 4) : 'OT'); };
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
    var c = S.sum[g.id], age = c ? Date.now() - c.t : 1e12, ttl = g.state === 'in' ? 45000 : 30 * 60000;
    if (c && (c.loading || age < ttl)) return;
    S.sum[g.id] = { t: Date.now(), j: c && c.j, loading: true };
    getJSON(ESPN + g.sport + '/' + g.league + '/summary?event=' + g.id).then(function (j) {
      var comp = j.header && j.header.competitions && j.header.competitions[0], cs = comp ? comp.competitors.slice() : [];
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
      var art = (j.news && j.news.articles || []).filter(function (x) { return x.headline; })[0] || (j.article && j.article.headline ? j.article : null);
      var story = art ? { headline: art.headline, description: art.description || '', image: art.images && art.images[0] ? art.images[0].url : '' } : null;
      S.sum[g.id] = { t: Date.now(), j: { recs: recs, lines: lines, stats: stats, leaders: cats, venue: j.gameInfo && j.gameInfo.venue ? j.gameInfo.venue.fullName : '',
        tv: bc ? (bc.media && bc.media.shortName) || (bc.names || []).join(', ') : '', line: pc ? [pc.details, pc.overUnder != null ? 'O/U ' + pc.overUnder : ''].filter(Boolean).join(' · ') : '', story: story } };
      if (!story && g.state === 'pre') return teamStory(g).then(function (s) { if (s) S.sum[g.id].j.story = s; });
    }).catch(function () { S.sum[g.id] = { t: Date.now(), j: c && c.j }; }).then(function () { if (S.screen === 'scores' || S.detail) render(); });
  }
  function teamStory(g) { // league news that mentions either team
    return getJSON(ESPN + g.sport + '/' + g.league + '/news?limit=30').then(function (j) {
      var names = g.teams.map(function (t) { return t.name; }).filter(Boolean);
      var a = (j.articles || []).filter(function (x) { return names.some(function (n) { return (x.headline + ' ' + (x.description || '')).indexOf(n) >= 0; }); })[0];
      return a ? { headline: a.headline, description: a.description || '', image: a.images && a.images[0] ? a.images[0].url : '' } : null;
    }).catch(function () { return null; });
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
      '<div style="display:flex;flex-direction:column;gap:14px;min-height:0;padding:4px 0">' +
      '<div class="muted" style="font-size:17px;font-weight:600">' + (s.date ? esc(whenLabel(new Date(s.date))) : '') + '</div>' +
      '<div class="head clamp4" style="font-size:40px;line-height:1.1">' + esc(s.title) + '</div>' +
      '<div class="muted clamp4" style="font-size:20px;line-height:1.45">' + esc(s.summary || '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:16px;margin-top:auto"><div id="qr" style="width:104px;height:104px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0"></div><div class="muted" style="font-size:16px">Scan to read the whole story on your phone</div></div></div></div>';
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
    var go = function () { var q = window.qrcode(0, 'M'); q.addData(s.link); q.make(); var el = $('qr'); if (el) el.innerHTML = q.createSvgTag({ cellSize: 3, margin: 2 }); };
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
  function startRadar() {
    var box = $('radar'), noteEl = $('radarnote'); if (!box) return;
    if (DEMO) { noteEl.textContent = 'Live radar loop from RainViewer appears here'; return; }
    getJSON('https://api.rainviewer.com/public/weather-maps.json').then(function (j) {
      var frames = (j.radar && j.radar.past || []).slice(-8); if (!frames.length) throw new Error('no frames');
      var z = 7, scale = 1.6, w = box.clientWidth, h = box.clientHeight;
      var n = Math.pow(2, z), px = (L.lon + 180) / 360 * n * 256, latR = L.lat * Math.PI / 180, py = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n * 256;
      var vw = w / scale, vh = h / scale, x0 = px - vw / 2, y0 = py - vh / 2;
      var tx0 = Math.floor(x0 / 256), ty0 = Math.floor(y0 / 256), tx1 = Math.floor((x0 + vw) / 256), ty1 = Math.floor((y0 + vh) / 256);
      var layer = function (urlFn, cls, extra) {
        var s = '<div class="' + cls + '" style="position:absolute;left:0;top:0;transform:scale(' + scale + ');transform-origin:0 0;' + (extra || '') + '">';
        for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) s += '<img alt="" src="' + urlFn(tx, ty) + '" style="position:absolute;width:256px;height:256px;left:' + (tx * 256 - x0) + 'px;top:' + (ty * 256 - y0) + 'px">';
        return s + '</div>';
      };
      var html = layer(function (x, y) { return 'https://basemaps.cartocdn.com/dark_all/' + z + '/' + x + '/' + y + '.png'; }, 'base');
      frames.forEach(function (f, i) { html += layer(function (x, y) { return j.host + f.path + '/256/' + z + '/' + x + '/' + y + '/2/1_1.png'; }, 'rf', 'opacity:' + (i === frames.length - 1 ? 0.85 : 0) + ';transition:opacity .3s'); });
      html += '<div style="position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px rgba(0,0,0,.4)"></div>' +
        '<div style="position:absolute;left:50%;top:50%;margin:12px 0 0 -40px;width:80px;text-align:center;font-size:13px;font-weight:700;text-shadow:0 1px 3px #000">' + esc(L.name.split(',')[0]) + '</div>';
      box.innerHTML = html;
      var layers = box.querySelectorAll('.rf'), k = layers.length - 1;
      var step = function () {
        layers[k].style.opacity = 0; k = (k + 1) % layers.length; layers[k].style.opacity = 0.85;
        var t = new Date(frames[k].time * 1000); noteEl.textContent = 'Radar ' + hm(t) + ' · RainViewer · map © OpenStreetMap contributors © CARTO';
        RADAR.timer = setTimeout(step, k === layers.length - 1 ? 1800 : 550);
      };
      step();
    }).catch(function () { noteEl.textContent = 'Radar unavailable right now'; });
  }
  function stopRadar() { clearTimeout(RADAR.timer); }

  // ------------------------------------------------------------ rotation + input
  function setScreen(name) {
    if (S.detail) { S.detail = null; $('overlay').className = ''; stopRadar(); }
    if (name === 'photos' && S.screen !== 'photos') S.photoIdx++;
    S.screen = name; S.page = 0; render(); schedule();
  }
  function schedule() {
    clearTimeout(S.timer); if (STATIC) return;
    var s = S.detail ? C.timing.detail : pageDur();
    S.timer = setTimeout(function () {
      if (S.detail) return closeDetail();
      var pg = pageList(S.screen);
      if (S.screen !== 'home' && S.page < pg.length - 1) { S.page++; render(); schedule(); return; }
      setScreen(ORDER[(ORDER.indexOf(S.screen) + 1) % ORDER.length]);
    }, s * 1000);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go],[data-open],[data-close],[data-page]'); if (!el) return;
    if (el.hasAttribute('data-close')) return closeDetail();
    if (el.hasAttribute('data-page')) { S.page = +el.getAttribute('data-page'); render(); schedule(); return; }
    if (el.hasAttribute('data-go')) return setScreen(el.getAttribute('data-go'));
    var p = el.getAttribute('data-open').split(':');
    openDetail(p[0], +p[1], +p[2]);
  });
  $('overlay').addEventListener('click', function (e) { if (e.target.id === 'overlay') closeDetail(); });

  function fit() {
    var s = Math.min(innerWidth / 1280, innerHeight / 800), st = $('stage');
    st.style.transform = 'scale(' + s + ')';
    st.style.left = Math.max(0, (innerWidth - 1280 * s) / 2) + 'px'; st.style.top = Math.max(0, (innerHeight - 800 * s) / 2) + 'px';
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
        { name: 'NBAPropSignal', record: 'Record [W–L]', source: 'xEP edges · Pikkit best price', plays: three('[Player] O [Line] PTS', 'Edge [x]% · xEP [Grade] · L5 / L10', [['L5 avg', 'Game logs'], ['L10 avg', 'Game logs'], ['vs opponent', 'Game logs'], ['Model edge', 'NBAPropSignal V2'], ['xEP grade', 'xEP'], ['Best price', 'Pikkit']]) },
        { name: 'Moonshot', record: 'Trial day [x] of 30', source: 'Pikkit best price · parlay target +10000 to +18000', plays: three('[Player] 5+ threes', 'Model [x]% vs book [x]%', [['Model prob', 'Moonshot'], ['Book implied', 'Sportsbook'], ['Edge', 'Moonshot'], ['3PA per game', 'Game logs'], ['Best price', 'Pikkit'], ['Card parlay', 'Top 3 legs']]) },
        { name: 'NFL Props', record: 'Record [W–L]', source: 'Model projection · Pikkit best price', plays: three('[Player] O [Line] rec yds', 'Proj [x] · Edge [x]%', [['Projection', 'NFL Props'], ['Line', 'Sportsbook'], ['Edge', 'NFL Props'], ['L5 avg', 'Game logs'], ['Opp vs position', 'Defense ranks'], ['Best price', 'Pikkit']]) },
        { name: 'CFB Model', record: 'Record [W–L]', source: 'xEP xVAL · CFBD stats · Pikkit best price', plays: three('[Team] [Spread]', 'xVAL [x] · Grade [0–10]', [['xVAL', 'xEP'], ['Grade (0–10)', 'CFB Model'], ['Tier', 'CFB Model'], ['SP+ gap', 'CFBD'], ['Weather', 'NOAA'], ['Best price', 'Pikkit']]) }
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
  var D = Q.get('detail');
  if (D) { var p = D.split(':'); setTimeout(function () { openDetail(p[0], +(p[1] || 0), +(p[2] || 0)); }, 300); } else schedule();
})();
