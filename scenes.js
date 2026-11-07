// =====================================================================
//  Painted, animated background scenes — one composition per month,
//  holiday and birthday. Plain SVG + CSS motion (style.css "Scene motion").
//  Focal details sit between y≈130 and y≈430: below that the panels cover it.
// =====================================================================
(function () {
  var W = 1280, H = 800;
  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000003; return h + 11; }
  function f(n) { return Math.round(n * 10) / 10; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function dl(r, d) { return 'animation-duration:' + f(d) + 's;animation-delay:-' + f(r() * d) + 's'; }

  // ------------------------------------------------------------------ canvas
  function Canvas(id, lowPower) {
    this.id = id; this.r = rng(hash(id)); this.defs = ''; this.body = ''; this.low = !!lowPower; this.n = 0;
  }
  Canvas.prototype.uid = function (p) { return this.id + (p || 'g') + (this.n++); };
  Canvas.prototype.add = function (s) { this.body += s; return this; };
  Canvas.prototype.count = function (n) { return this.low ? Math.ceil(n / 3) : n; };
  Canvas.prototype.lin = function (stops, x2, y2) {
    var id = this.uid('l');
    this.defs += '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
    return 'url(#' + id + ')';
  };
  Canvas.prototype.rad = function (stops, cx, cy) {
    var id = this.uid('r');
    this.defs += '<radialGradient id="' + id + '" cx="' + (cx || 0.5) + '" cy="' + (cy || 0.5) + '" r="0.5">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</radialGradient>';
    return 'url(#' + id + ')';
  };
  Canvas.prototype.blur = function (sd) { var id = this.uid('b'); this.defs += '<filter id="' + id + '" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="' + sd + '"/></filter>'; return 'url(#' + id + ')'; };
  Canvas.prototype.svg = function () {
    var g = this.uid('n');
    var grain = this.low ? '' : '<filter id="' + g + '" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>';
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' + this.defs + grain + '</defs>' + this.body +
      (this.low ? '' : '<rect width="' + W + '" height="' + H + '" filter="url(#' + g + ')" opacity="0.16" style="mix-blend-mode:overlay"/>') + '</svg>';
  };

  // ------------------------------------------------------------------ landscape pieces
  var K = {};
  K.sky = function (c, stops) { return c.add('<rect width="' + W + '" height="' + H + '" fill="' + c.lin(stops) + '"/>'); };
  K.sun = function (c, x, y, r, core, glow, size) {
    return c.add('<circle class="a-glow" cx="' + x + '" cy="' + y + '" r="' + (size || r * 7) + '" fill="' + c.rad([[0, glow, 0.85], [0.3, glow, 0.35], [1, glow, 0]]) + '"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + core + '"/>');
  };
  K.moon = function (c, x, y, r, opts) {
    opts = opts || {};
    var s = '<circle class="a-glow" cx="' + x + '" cy="' + y + '" r="' + r * 5 + '" fill="' + c.rad([[0, opts.glow || '#e8eefc', 0.45], [1, opts.glow || '#e8eefc', 0]]) + '"/>';
    if (opts.crescent) s += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (opts.color || '#f6f2e6') + '" opacity="0.14"/><path d="M' + x + ' ' + (y - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + x + ' ' + (y + r) + ' A' + f(r * 0.45) + ' ' + r + ' 0 0 1 ' + x + ' ' + (y - r) + 'Z" fill="' + (opts.color || '#f6f2e6') + '"/>';
    else s += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (opts.color || '#f6f2e6') + '"/><circle cx="' + (x - r * 0.3) + '" cy="' + (y - r * 0.2) + '" r="' + r * 0.18 + '" fill="#000" opacity="0.05"/><circle cx="' + (x + r * 0.25) + '" cy="' + (y + r * 0.3) + '" r="' + r * 0.12 + '" fill="#000" opacity="0.05"/>';
    return c.add(s);
  };
  K.stars = function (c, n, maxY) {
    var s = '', r = c.r;
    for (var i = 0; i < c.count(n); i++) s += '<circle class="a-twinkle" style="animation-delay:-' + f(r() * 5) + 's" cx="' + f(r() * W) + '" cy="' + f(r() * (maxY || 260)) + '" r="' + f(0.5 + r() * 1.2) + '" fill="#fff" opacity="' + f(0.35 + r() * 0.6) + '"/>';
    return c.add(s);
  };
  K.clouds = function (c, n, y0, y1, color, op, blur) {
    var r = c.r, s = '<g filter="' + c.blur(blur || 7) + '">';
    for (var i = 0; i < n; i++) {
      var y = y0 + r() * (y1 - y0), x = r() * W;
      s += '<g class="a-cloud" style="animation-delay:-' + f(r() * 80) + 's">';
      for (var k = 0; k < 4; k++) s += '<ellipse cx="' + f(x + (k - 1.5) * 60 + r() * 30) + '" cy="' + f(y + (r() - 0.5) * 10) + '" rx="' + f(60 + r() * 90) + '" ry="' + f(6 + r() * 9) + '" fill="' + color + '" opacity="' + f(op * (0.7 + r() * 0.6)) + '"/>';
      s += '</g>';
    }
    return c.add(s + '</g>');
  };
  K.puffy = function (c, x, y, w, color, shade, op) { // a big lit cumulus: shadow layer first, then the sunlit tops
    var r = c.r, sh = '', lt = '', blobs = [];
    for (var i = 0; i < 22; i++) { var t = (i / 21 - 0.5), px = x + t * w * 0.95 + (r() - 0.5) * 20, dome = 1 - Math.abs(t) * 1.7, py = y - Math.max(0.12, dome) * w * 0.42 * (0.6 + r() * 0.5), pr = w * (0.08 + Math.max(0.1, dome) * 0.11) * (0.8 + r() * 0.4); blobs.push([px, py, pr]); }
    blobs.forEach(function (b) { sh += '<circle cx="' + f(b[0] + b[2] * 0.15) + '" cy="' + f(b[1] + b[2] * 0.35) + '" r="' + f(b[2]) + '" fill="' + shade + '"/>'; });
    blobs.forEach(function (b) { lt += '<circle cx="' + f(b[0] - b[2] * 0.12) + '" cy="' + f(b[1] - b[2] * 0.12) + '" r="' + f(b[2] * 0.82) + '" fill="' + color + '"/>'; });
    var base = '<ellipse cx="' + x + '" cy="' + (y + 6) + '" rx="' + f(w * 0.55) + '" ry="' + f(w * 0.08) + '" fill="' + shade + '"/>';
    return c.add('<g class="a-cloud" filter="' + c.blur(4) + '" opacity="' + (op || 1) + '">' + base + sh + lt + '</g>');
  };
  K.ridge = function (c, y, rough, color, o) {
    o = o || {}; var r = c.r, pts = [[-20, y + (r() - 0.5) * rough], [W + 20, y + (r() - 0.5) * rough]], disp = rough;
    for (var it = 0; it < 6; it++) {
      var np = [];
      for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1]; np.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (r() - 0.5) * disp]); }
      np.push(pts[pts.length - 1]); pts = np; disp *= o.decay || 0.58;
    }
    var d = 'M' + f(pts[0][0]) + ',' + f(pts[0][1]);
    for (var j = 1; j < pts.length; j++) { var p = pts[j - 1], q = pts[j]; d += ' Q' + f(p[0]) + ',' + f(p[1]) + ' ' + f((p[0] + q[0]) / 2) + ',' + f((p[1] + q[1]) / 2); }
    return c.add('<path d="' + d + ' L' + (W + 20) + ',' + H + ' L-20,' + H + 'Z" fill="' + color + '"' + (o.op ? ' opacity="' + o.op + '"' : '') + '/>');
  };
  K.haze = function (c, y, h, color, op) { return c.add('<rect y="' + y + '" width="' + W + '" height="' + h + '" fill="' + c.lin([[0, color, 0], [1, color, op || 0.5]]) + '"/>'); };
  K.ground = function (c, y, color) { return c.add('<rect y="' + y + '" width="' + W + '" height="' + (H - y) + '" fill="' + color + '"/>'); };
  K.water = function (c, y, h, top, bottom, glintX, glint, spread) {
    var r = c.r, s = '<rect y="' + y + '" width="' + W + '" height="' + h + '" fill="' + c.lin([[0, top], [1, bottom]]) + '"/><g class="a-shimmer">';
    for (var i = 0; i < c.count(30); i++) {
      var yy = y + 3 + r() * (h - 6), x = glintX == null ? r() * W : glintX + (r() - 0.5) * (spread || 220) * (1 + (yy - y) / h);
      s += '<rect x="' + f(x) + '" y="' + f(yy) + '" width="' + f(14 + r() * 46) + '" height="2" rx="1" fill="' + (glint || '#ffffff') + '" opacity="' + f(0.25 + r() * 0.45) + '"/>';
    }
    return c.add(s + '</g>');
  };
  K.treeline = function (c, y, color, hmin, hmax) {
    var r = c.r, s = '';
    for (var x = -10; x < W + 10; x += 6 + r() * 10) { var h = (hmin || 8) + r() * ((hmax || 30) - (hmin || 8)); s += '<ellipse cx="' + f(x) + '" cy="' + f(y - h / 2) + '" rx="' + f(5 + r() * 9) + '" ry="' + f(h / 2) + '" fill="' + color + '"/>'; }
    return c.add(s);
  };
  K.pine = function (c, x, base, h, color, snow) {
    var r = c.r, w = h * 0.34, tiers = 6, d = 'M' + f(x) + ',' + f(base - h), sn = '';
    var right = [], left = [];
    for (var i = 1; i <= tiers; i++) { var yy = base - h + h * i / tiers, ww = w * i / tiers * (0.85 + r() * 0.3); right.push([ww, yy]); }
    right.forEach(function (p) { d += ' L' + f(x + p[0]) + ',' + f(p[1]) + ' L' + f(x + p[0] * 0.45) + ',' + f(p[1] - h / tiers * 0.15); });
    d += ' L' + f(x + w * 0.1) + ',' + base + ' L' + f(x - w * 0.1) + ',' + base;
    for (var k = right.length - 1; k >= 0; k--) { var p = right[k]; d += ' L' + f(x - p[0] * 0.45) + ',' + f(p[1] - h / tiers * 0.15) + ' L' + f(x - p[0]) + ',' + f(p[1]); }
    if (snow && h > 50) right.forEach(function (p, i) { if (i % 2 === 0) sn += '<path d="M' + f(x - p[0] * 0.55) + ',' + f(p[1] - h / tiers * 0.2) + ' Q' + f(x) + ',' + f(p[1] - h / tiers * 0.65) + ' ' + f(x + p[0] * 0.55) + ',' + f(p[1] - h / tiers * 0.2) + '" stroke="#eef4fb" stroke-width="' + f(Math.max(1.2, h / 85)) + '" fill="none" stroke-linecap="round" opacity="0.9"/>'; });
    else if (snow) sn = '<path d="M' + f(x) + ',' + f(base - h) + ' L' + f(x + w * 0.2) + ',' + f(base - h * 0.78) + ' L' + f(x - w * 0.2) + ',' + f(base - h * 0.78) + 'Z" fill="#eef4fb" opacity="0.85"/>';
    return c.add('<path d="' + d + 'Z" fill="' + color + '"/>' + sn);
  };
  K.pineRow = function (c, y, color, hmin, hmax, snow) { var r = c.r; for (var x = -10; x < W; x += 7 + r() * 9) K.pine(c, x, y + r() * 5, hmin + r() * (hmax - hmin), color, snow); return c; };
  K.bareTree = function (c, x, base, len, color, depth, w) {
    var r = c.r, s = '<g class="a-sway" style="animation-delay:-' + f(r() * 6) + 's">';
    (function go(x, y, len, ang, d, w) {
      var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      s += '<path d="M' + f(x) + ',' + f(y) + ' L' + f(x2) + ',' + f(y2) + '" stroke="' + color + '" stroke-width="' + f(w) + '" stroke-linecap="round"/>';
      if (d === 0) return;
      var n = d > 3 ? 2 : 2 + (r() < 0.4 ? 1 : 0);
      for (var i = 0; i < n; i++) go(x2, y2, len * (0.66 + r() * 0.14), ang + (r() - 0.5) * 1.1 + (i - (n - 1) / 2) * 0.45, d - 1, w * 0.68);
    })(x, base, len, -Math.PI / 2 + (r() - 0.5) * 0.1, depth || 5, w || 9);
    return c.add(s + '</g>');
  };
  K.leafyTree = function (c, x, base, h, colors, o) { // painterly stippled canopy
    o = o || {}; var r = c.r, cw = h * (o.wide || 0.55), cy = base - h * 0.62;
    var s = '<path d="M' + f(x - h * 0.03) + ',' + base + ' L' + f(x - h * 0.015) + ',' + f(cy) + ' L' + f(x + h * 0.015) + ',' + f(cy) + ' L' + f(x + h * 0.03) + ',' + base + 'Z" fill="' + (o.trunk || '#3a2418') + '"/>';
    s += '<g class="a-sway" style="animation-delay:-' + f(r() * 6) + 's">';
    var n = o.dots || 46;
    for (var i = 0; i < n; i++) {
      var a = r() * Math.PI * 2, d = Math.sqrt(r()), px = x + Math.cos(a) * d * cw * 0.5, py = cy + Math.sin(a) * d * h * 0.36;
      var col = colors[Math.min(colors.length - 1, Math.floor((py - (cy - h * 0.36)) / (h * 0.72) * colors.length + (r() - 0.5) * 1.4))] || colors[0];
      s += '<circle cx="' + f(px) + '" cy="' + f(py) + '" r="' + f(h * (0.05 + r() * 0.07)) + '" fill="' + col + '"/>';
    }
    if (o.blossom) for (var k = 0; k < 18; k++) s += '<circle cx="' + f(x + (r() - 0.5) * cw * 0.9) + '" cy="' + f(cy + (r() - 0.5) * h * 0.6) + '" r="' + f(1.5 + r() * 2) + '" fill="#fff" opacity="0.85"/>';
    return c.add(s + '</g>');
  };
  K.grass = function (c, n, y0, y1, hmin, hmax, colors, cls) {
    var r = c.r, s = '<g class="' + (cls || 'a-grass') + '">';
    for (var i = 0; i < c.count(n); i++) { var x = r() * W, b = y0 + r() * (y1 - y0), h = hmin + r() * (hmax - hmin), bend = (r() - 0.4) * 20; s += '<path d="M' + f(x) + ',' + f(b) + ' q' + f(bend / 2) + ',' + f(-h / 2) + ' ' + f(bend) + ',' + f(-h) + '" stroke="' + pick(r, colors) + '" stroke-width="' + f(1 + r() * 1.6) + '" fill="none" stroke-linecap="round"/>'; }
    return c.add(s + '</g>');
  };
  K.flowers = function (c, n, y0, y1, colors, size) {
    var r = c.r, s = '<g class="a-grass">';
    for (var i = 0; i < c.count(n); i++) {
      var x = r() * W, y = y0 + r() * (y1 - y0), col = pick(r, colors), sz = (size || 4) * (0.7 + r() * 0.6) * (0.6 + (y - y0) / (y1 - y0 + 1) * 0.8);
      s += '<path d="M' + f(x) + ',' + f(y + sz * 5) + ' q2,' + f(-sz * 2.5) + ' 0,' + f(-sz * 5) + '" stroke="#3f6b2e" stroke-width="1.4" fill="none"/>';
      for (var k = 0; k < 5; k++) { var a = k * 1.2566; s += '<circle cx="' + f(x + Math.cos(a) * sz) + '" cy="' + f(y + Math.sin(a) * sz) + '" r="' + f(sz * 0.8) + '" fill="' + col + '"/>'; }
      s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(sz * 0.55) + '" fill="#5a3a12"/>';
    }
    return c.add(s + '</g>');
  };
  K.rays = function (c, x, y, color, n, op) {
    var r = c.r, s = '<g class="a-rays" opacity="' + (op || 0.18) + '" filter="' + c.blur(10) + '">';
    for (var i = 0; i < n; i++) { var a = 0.35 + i / n * 1.6 + (r() - 0.5) * 0.1, len = 700; s += '<path d="M' + x + ',' + y + ' L' + f(x + Math.cos(a) * len - 30) + ',' + f(y + Math.sin(a) * len) + ' L' + f(x + Math.cos(a) * len + 30) + ',' + f(y + Math.sin(a) * len) + 'Z" fill="' + color + '"/>'; }
    return c.add(s + '</g>');
  };
  K.fog = function (c, y, color, op) {
    var r = c.r, s = '<g filter="' + c.blur(14) + '">';
    for (var i = 0; i < 5; i++) s += '<ellipse class="a-fog" style="animation-delay:-' + f(r() * 40) + 's" cx="' + f(r() * W) + '" cy="' + f(y + (r() - 0.5) * 30) + '" rx="' + f(220 + r() * 200) + '" ry="' + f(18 + r() * 14) + '" fill="' + color + '" opacity="' + (op || 0.35) + '"/>';
    return c.add(s + '</g>');
  };

  // ------------------------------------------------------------------ things
  K.barn = function (c, x, base, s, snow) {
    var w = 110 * s, h = 70 * s, rh = 42 * s;
    var out = '<path d="M' + x + ',' + base + ' V' + (base - h) + ' L' + (x + w * 0.18) + ',' + (base - h - rh * 0.7) + ' L' + (x + w / 2) + ',' + (base - h - rh) + ' L' + (x + w * 0.82) + ',' + (base - h - rh * 0.7) + ' L' + (x + w) + ',' + (base - h) + ' V' + base + 'Z" fill="#8e2a22"/>';
    out += '<path d="M' + (x + w * 0.36) + ',' + base + ' V' + (base - h * 0.62) + ' H' + (x + w * 0.64) + ' V' + base + '" fill="#5e1a16" stroke="#e9d9c8" stroke-width="' + 2 * s + '"/><path d="M' + (x + w * 0.36) + ',' + (base - h * 0.62) + ' L' + (x + w * 0.64) + ',' + base + ' M' + (x + w * 0.64) + ',' + (base - h * 0.62) + ' L' + (x + w * 0.36) + ',' + base + '" stroke="#e9d9c8" stroke-width="' + 1.5 * s + '"/>';
    out += '<rect class="a-window" x="' + (x + w * 0.44) + '" y="' + (base - h - rh * 0.55) + '" width="' + w * 0.12 + '" height="' + rh * 0.3 + '" fill="#ffd27a"/>';
    if (snow) out += '<path d="M' + (x - 3) + ',' + (base - h) + ' L' + (x + w * 0.18) + ',' + (base - h - rh * 0.7) + ' L' + (x + w / 2) + ',' + (base - h - rh) + ' L' + (x + w * 0.82) + ',' + (base - h - rh * 0.7) + ' L' + (x + w + 3) + ',' + (base - h) + '" stroke="#f1f5fb" stroke-width="' + 6 * s + '" fill="none" stroke-linejoin="round"/>';
    out += '<rect x="' + (x + w + 12 * s) + '" y="' + (base - h * 1.5) + '" width="' + 26 * s + '" height="' + h * 1.5 + '" fill="#9aa3a8"/><ellipse cx="' + (x + w + 25 * s) + '" cy="' + (base - h * 1.5) + '" rx="' + 13 * s + '" ry="' + 9 * s + '" fill="' + (snow ? '#f1f5fb' : '#b7bec2') + '"/>';
    return c.add(out);
  };
  K.farmhouse = function (c, x, base, s, wall, roof, smoke) {
    var w = 90 * s, h = 52 * s, out = '';
    if (smoke) for (var i = 0; i < 5; i++) out += '<circle class="a-smoke" style="animation-delay:-' + i * 1.6 + 's" cx="' + (x + w * 0.72) + '" cy="' + (base - h - 46 * s) + '" r="' + 7 * s + '" fill="#e8e2da" opacity="0.5"/>';
    out += '<rect x="' + (x + w * 0.66) + '" y="' + (base - h - 44 * s) + '" width="' + 10 * s + '" height="' + 30 * s + '" fill="#4a3428"/>';
    out += '<rect x="' + x + '" y="' + (base - h) + '" width="' + w + '" height="' + h + '" fill="' + wall + '"/><path d="M' + (x - 8 * s) + ',' + (base - h) + ' L' + (x + w / 2) + ',' + (base - h - 34 * s) + ' L' + (x + w + 8 * s) + ',' + (base - h) + 'Z" fill="' + roof + '"/>';
    [0.18, 0.62].forEach(function (p) { out += '<rect class="a-window" x="' + (x + w * p) + '" y="' + (base - h * 0.7) + '" width="' + w * 0.18 + '" height="' + h * 0.32 + '" fill="#ffd27a"/>'; });
    out += '<rect x="' + (x + w * 0.42) + '" y="' + (base - h * 0.55) + '" width="' + w * 0.14 + '" height="' + h * 0.55 + '" fill="#3a2a22"/>';
    return c.add(out);
  };
  K.elevator = function (c, x, base, s, color) {
    var out = '<g fill="' + (color || '#2a2230') + '">';
    for (var i = 0; i < 4; i++) out += '<rect x="' + (x + i * 26 * s) + '" y="' + (base - 120 * s) + '" width="' + 24 * s + '" height="' + 120 * s + '" rx="' + 3 * s + '"/>';
    out += '<rect x="' + (x + 30 * s) + '" y="' + (base - 168 * s) + '" width="' + 46 * s + '" height="' + 50 * s + '"/><path d="M' + (x + 26 * s) + ',' + (base - 168 * s) + ' L' + (x + 53 * s) + ',' + (base - 186 * s) + ' L' + (x + 80 * s) + ',' + (base - 168 * s) + 'Z"/></g>';
    return c.add(out);
  };
  K.turbine = function (c, x, base, h, color) {
    var hub = base - h, bl = h * 0.42;
    var blades = '';
    for (var i = 0; i < 3; i++) blades += '<path transform="rotate(' + i * 120 + ')" d="M0,0 L-2.5,-4 L-1.2,-' + f(bl) + ' L1.4,-' + f(bl * 0.9) + ' L2.5,-4Z" fill="' + color + '"/>';
    return c.add('<path d="M' + (x - 3) + ',' + base + ' L' + (x - 1.4) + ',' + hub + ' L' + (x + 1.4) + ',' + hub + ' L' + (x + 3) + ',' + base + 'Z" fill="' + color + '"/>' +
      '<g transform="translate(' + x + ' ' + hub + ')"><g class="a-spin" style="animation-duration:' + f(9 + c.r() * 6) + 's">' + blades + '<circle r="3" fill="' + color + '"/></g></g>');
  };
  K.waterTower = function (c, x, base, s, color) {
    return c.add('<g fill="' + color + '"><path d="M' + (x - 16 * s) + ',' + base + ' L' + (x - 10 * s) + ',' + (base - 90 * s) + ' L' + (x - 6 * s) + ',' + (base - 90 * s) + ' L' + (x - 10 * s) + ',' + base + 'Z M' + (x + 16 * s) + ',' + base + ' L' + (x + 10 * s) + ',' + (base - 90 * s) + ' L' + (x + 6 * s) + ',' + (base - 90 * s) + ' L' + (x + 10 * s) + ',' + base + 'Z"/><rect x="' + (x - 3 * s) + '" y="' + (base - 90 * s) + '" width="' + 6 * s + '" height="' + 90 * s + '"/><ellipse cx="' + x + '" cy="' + (base - 102 * s) + '" rx="' + 32 * s + '" ry="' + 18 * s + '"/><path d="M' + (x - 32 * s) + ',' + (base - 102 * s) + ' Q' + x + ',' + (base - 130 * s) + ' ' + (x + 32 * s) + ',' + (base - 102 * s) + 'Z"/></g><circle class="a-twinkle" cx="' + x + '" cy="' + (base - 126 * s) + '" r="3" fill="#ff6b6b"/>');
  };
  K.houses = function (c, x0, base, n, color, snow, wreath) {
    var r = c.r, x = x0, out = '';
    for (var i = 0; i < n; i++) {
      var w = 18 + r() * 14, h = 16 + r() * 10, g = c.rad([[0, '#ffcf7a', 0.5], [1, '#ffcf7a', 0]]);
      out += '<path d="M' + f(x) + ',' + base + ' V' + f(base - h) + ' L' + f(x + w / 2) + ',' + f(base - h - w * 0.45) + ' L' + f(x + w) + ',' + f(base - h) + ' V' + base + 'Z" fill="' + color + '"/>';
      if (snow) out += '<path d="M' + f(x - 2) + ',' + f(base - h) + ' L' + f(x + w / 2) + ',' + f(base - h - w * 0.45 - 2) + ' L' + f(x + w + 2) + ',' + f(base - h) + '" stroke="#eef4fb" stroke-width="2.5" fill="none"/>';
      out += '<circle cx="' + f(x + w / 2) + '" cy="' + f(base - h / 2) + '" r="22" fill="' + g + '"/><rect class="a-window" style="animation-delay:-' + f(r() * 4) + 's" x="' + f(x + w * 0.3) + '" y="' + f(base - h * 0.62) + '" width="' + f(w * 0.4) + '" height="' + f(h * 0.32) + '" fill="#ffd27a"/>';
      if (wreath) out += '<circle cx="' + f(x + w / 2) + '" cy="' + f(base - h - w * 0.12) + '" r="3" fill="none" stroke="#2f7a3a" stroke-width="2"/><circle cx="' + f(x + w / 2) + '" cy="' + f(base - h - w * 0.12 + 3) + '" r="1.2" fill="#d23"/>';
      x += w + 6 + r() * 10;
    }
    return c.add(out);
  };
  K.skyline = function (c, base, color, lit, x0, x1) {
    var r = c.r, out = '', x = x0 == null ? -10 : x0, end = x1 == null ? W + 10 : x1;
    var heights = [60, 95, 140, 80, 200, 120, 170, 90, 260, 110, 150, 230, 85, 130, 70, 180, 100, 60];
    var i = 0;
    while (x < end) {
      var w = 26 + r() * 30, h = heights[i % heights.length] * (0.8 + r() * 0.4);
      out += '<rect x="' + f(x) + '" y="' + f(base - h) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + color + '"/>';
      if (h > 200) out += '<rect x="' + f(x + w / 2 - 1.5) + '" y="' + f(base - h - 40) + '" width="3" height="40" fill="' + color + '"/><circle class="a-twinkle" cx="' + f(x + w / 2) + '" cy="' + f(base - h - 40) + '" r="2.5" fill="#ff5a5a"/>';
      for (var wy = base - h + 8; wy < base - 6; wy += 11) for (var wx = x + 5; wx < x + w - 6; wx += 8) if (r() < 0.33) out += '<rect x="' + f(wx) + '" y="' + f(wy) + '" width="3.5" height="5" fill="' + lit + '" opacity="' + f(0.5 + r() * 0.5) + '"/>';
      x += w + 2 + r() * 4; i++;
    }
    return c.add(out);
  };
  K.fence = function (c, y, color, x0, x1) {
    var out = '<path d="M' + (x0 || 0) + ',' + (y - 10) + ' H' + (x1 || W) + ' M' + (x0 || 0) + ',' + (y - 20) + ' H' + (x1 || W) + '" stroke="' + color + '" stroke-width="2"/>';
    for (var x = x0 || 0; x <= (x1 || W); x += 34) out += '<rect x="' + (x - 2) + '" y="' + (y - 28) + '" width="4" height="28" fill="' + color + '"/>';
    return c.add(out);
  };
  K.pumpkin = function (c, x, y, s, lit) {
    var g = c.rad([[0, '#ffb24d'], [0.7, '#e2701f'], [1, '#b8501a']], 0.4, 0.35);
    var out = '<ellipse cx="' + x + '" cy="' + y + '" rx="' + f(30 * s) + '" ry="' + f(22 * s) + '" fill="' + g + '"/><path d="M' + f(x - 12 * s) + ',' + f(y - 20 * s) + ' Q' + f(x - 18 * s) + ',' + y + ' ' + f(x - 12 * s) + ',' + f(y + 20 * s) + ' M' + f(x + 12 * s) + ',' + f(y - 20 * s) + ' Q' + f(x + 18 * s) + ',' + y + ' ' + f(x + 12 * s) + ',' + f(y + 20 * s) + '" stroke="#b8501a" stroke-width="' + f(1.4 * s) + '" fill="none" opacity="0.6"/><path d="M' + x + ',' + f(y - 20 * s) + ' q2,-8 6,-11" stroke="#4f6b2d" stroke-width="' + f(4 * s) + '" fill="none" stroke-linecap="round"/>';
    if (lit) out += '<g class="a-window" fill="#ffd34d"><path d="M' + f(x - 16 * s) + ',' + f(y - 4 * s) + ' l7,-9 l7,9z M' + f(x + 2 * s) + ',' + f(y - 4 * s) + ' l7,-9 l7,9z"/><path d="M' + f(x - 17 * s) + ',' + f(y + 5 * s) + ' Q' + x + ',' + f(y + 20 * s) + ' ' + f(x + 17 * s) + ',' + f(y + 5 * s) + ' Q' + x + ',' + f(y + 11 * s) + ' ' + f(x - 17 * s) + ',' + f(y + 5 * s) + 'Z"/></g>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + f(60 * s) + '" fill="' + c.rad([[0, '#ffb347', 0.35], [1, '#ffb347', 0]]) + '"/>';
    return c.add(out);
  };
  K.cornShock = function (c, x, base, s) {
    var out = '<g class="a-sway">';
    for (var i = -6; i <= 6; i++) out += '<path d="M' + f(x + i * 3 * s) + ',' + base + ' L' + f(x + i * 0.6 * s) + ',' + f(base - 60 * s) + ' L' + f(x) + ',' + f(base - 74 * s) + '" stroke="' + (i % 2 ? '#c99b4a' : '#dcb466') + '" stroke-width="' + f(3 * s) + '" fill="none"/>';
    return c.add(out + '<path d="M' + f(x - 8 * s) + ',' + f(base - 40 * s) + ' H' + f(x + 8 * s) + '" stroke="#8a5a2b" stroke-width="' + f(3 * s) + '"/></g>');
  };
  K.hayRoll = function (c, x, y, s) { return c.add('<ellipse cx="' + x + '" cy="' + y + '" rx="' + 26 * s + '" ry="' + 22 * s + '" fill="#d6a447"/><ellipse cx="' + (x + 14 * s) + '" cy="' + y + '" rx="' + 12 * s + '" ry="' + 21 * s + '" fill="#c08a35"/><ellipse cx="' + (x + 14 * s) + '" cy="' + y + '" rx="' + 6 * s + '" ry="' + 11 * s + '" fill="none" stroke="#9c6c27" stroke-width="2"/>'); };
  K.flagPole = function (c, x, base, h, s) {
    var fw = 150 * s, fh = 90 * s, top = base - h, out = '<rect x="' + (x - 2) + '" y="' + top + '" width="4" height="' + h + '" fill="#d8dde3"/><circle cx="' + x + '" cy="' + (top - 4) + '" r="5" fill="#e8c56a"/>';
    out += '<g transform="translate(' + (x + 2) + ' ' + (top + 2) + ')"><g class="a-wave">';
    for (var i = 0; i < 13; i++) out += '<rect y="' + f(i * fh / 13) + '" width="' + fw + '" height="' + f(fh / 13 + 0.5) + '" fill="' + (i % 2 ? '#f5f3ee' : '#b31942') + '"/>';
    out += '<rect width="' + f(fw * 0.42) + '" height="' + f(fh * 7 / 13) + '" fill="#0a3161"/>';
    for (var r2 = 0; r2 < 5; r2++) for (var k = 0; k < 6; k++) out += '<circle cx="' + f(fw * 0.42 * (k + 0.5) / 6) + '" cy="' + f(fh * 7 / 13 * (r2 + 0.5) / 5) + '" r="' + f(1.4 * s) + '" fill="#fff"/>';
    out += '<rect width="' + fw + '" height="' + fh + '" fill="' + c.lin([[0, '#000', 0], [0.3, '#000', 0.15], [0.55, '#fff', 0.08], [0.8, '#000', 0.18], [1, '#000', 0]], 1, 0) + '"/></g></g>';
    return c.add(out);
  };
  K.bigFlag = function (c) {
    var sh = H / 13, out = '<g transform="translate(-40 -26) scale(1.065)"><g class="a-wave">';
    for (var i = 0; i < 13; i++) {
      var y0 = i * sh, p1 = [], p2 = [];
      for (var x = 0; x <= W + 40; x += 40) p1.push(x + ',' + f(y0 + 14 * Math.sin(x / W * Math.PI * 2.4)));
      for (var x2 = W; x2 >= -40; x2 -= 40) p2.push(x2 + ',' + f(y0 + sh + 1 + 14 * Math.sin(x2 / W * Math.PI * 2.4)));
      out += '<polygon points="' + p1.join(' ') + ' ' + p2.join(' ') + '" fill="' + (i % 2 ? '#f2efe8' : '#a8173b') + '"/>';
    }
    out += '<rect width="560" height="' + f(sh * 7) + '" fill="#0a2a57"/>';
    for (var row = 0; row < 9; row++) for (var k = 0; k < (row % 2 ? 5 : 6); k++) {
      var cx = 46 + k * 93 + (row % 2 ? 46.5 : 0), cy = 28 + row * 46, pts = [];
      for (var j = 0; j < 10; j++) { var a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? 5.5 : 13; pts.push(f(cx + rr * Math.cos(a)) + ',' + f(cy + rr * Math.sin(a))); }
      out += '<polygon points="' + pts.join(' ') + '" fill="#fff"/>';
    }
    out += '</g></g><g class="a-slide">';
    for (var b = 0, xb = -640; xb < 1600; xb += 160, b++) out += '<rect x="' + xb + '" width="80" height="' + H + '" fill="' + c.lin([[0, '#000', 0], [0.5, '#000', b % 2 ? 0.2 : 0.08], [1, '#000', 0]], 1, 0) + '"/>';
    out += '</g><rect width="' + W + '" height="' + H + '" fill="' + c.lin([[0, '#000', 0.25], [0.5, '#000', 0], [1, '#000', 0.35]]) + '"/>';
    return c.add(out);
  };
  K.lighthouse = function (c, x, base, s) {
    var out = '<path d="M' + (x - 14 * s) + ',' + base + ' L' + (x - 9 * s) + ',' + (base - 110 * s) + ' L' + (x + 9 * s) + ',' + (base - 110 * s) + ' L' + (x + 14 * s) + ',' + base + 'Z" fill="#f0ece4"/>';
    [0.25, 0.6].forEach(function (p) { out += '<path d="M' + (x - 13 * s + p * 4 * s) + ',' + (base - 110 * s * p) + ' h' + (26 * s - p * 8 * s) + ' v' + (-14 * s) + ' h' + (-26 * s + p * 8 * s) + 'Z" fill="#b8322a"/>'; });
    out += '<rect x="' + (x - 10 * s) + '" y="' + (base - 126 * s) + '" width="' + 20 * s + '" height="' + 16 * s + '" fill="#2b2f38"/><rect class="a-window" x="' + (x - 6 * s) + '" y="' + (base - 123 * s) + '" width="' + 12 * s + '" height="' + 10 * s + '" fill="#ffe38a"/><path d="M' + (x - 12 * s) + ',' + (base - 126 * s) + ' L' + x + ',' + (base - 138 * s) + ' L' + (x + 12 * s) + ',' + (base - 126 * s) + 'Z" fill="#2b2f38"/>';
    out += '<g class="a-beam" transform="translate(' + x + ' ' + (base - 118 * s) + ')"><path d="M0,0 L420,-40 L420,40Z" fill="' + c.lin([[0, '#fff3c0', 0.45], [1, '#fff3c0', 0]], 1, 0) + '"/></g>';
    return c.add(out);
  };
  K.sailboat = function (c, x, y, s, color) {
    return c.add('<g class="a-boat"><path d="M' + (x - 30 * s) + ',' + y + ' L' + (x + 30 * s) + ',' + y + ' L' + (x + 22 * s) + ',' + (y + 8 * s) + ' L' + (x - 22 * s) + ',' + (y + 8 * s) + 'Z" fill="' + color + '"/><path d="M' + x + ',' + (y - 2) + ' V' + (y - 60 * s) + ' L' + (x + 28 * s) + ',' + (y - 4 * s) + 'Z" fill="#f4efe6"/><path d="M' + (x - 2) + ',' + (y - 50 * s) + ' L' + (x - 22 * s) + ',' + (y - 4 * s) + ' H' + (x - 2) + 'Z" fill="#e4ddd2"/></g>');
  };
  K.birds = function (c, n, y0, y1, color, cls) {
    var r = c.r, s = '';
    for (var i = 0; i < n; i++) { var x = r() * W, y = y0 + r() * (y1 - y0), sz = 4 + r() * 4; s += '<g class="' + (cls || 'a-gull') + '" style="' + dl(r, 30 + r() * 30) + '"><path d="M' + f(x) + ',' + f(y) + ' q' + f(sz) + ',' + f(-sz) + ' ' + f(sz * 2) + ',0 q' + f(sz) + ',' + f(-sz) + ' ' + f(sz * 2) + ',0" stroke="' + color + '" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>'; }
    return c.add(s);
  };
  K.geese = function (c, x, y, color) {
    var s = '<g class="a-geese" style="animation-delay:-22s">';
    [[0, 0], [-18, 9], [-36, 18], [-18, -9], [-36, -18], [-54, 27], [-54, -27], [-72, 36]].forEach(function (p) { s += '<path d="M' + (x + p[0]) + ',' + (y + p[1]) + ' q6,-6 12,0 q6,-6 12,0" stroke="' + color + '" stroke-width="2" fill="none" stroke-linecap="round"/>'; });
    return c.add(s + '</g>');
  };
  K.butterflies = function (c, n, y0, y1, colors) {
    var r = c.r, s = '';
    for (var i = 0; i < c.count(n); i++) { var x = r() * W, y = y0 + r() * (y1 - y0), col = pick(r, colors); s += '<g class="a-flit" style="' + dl(r, 14 + r() * 10) + '"><g transform="translate(' + f(x) + ' ' + f(y) + ')"><g class="a-flap"><path d="M0,0 C-6,-8 -12,-6 -10,2 C-9,6 -3,4 0,0Z M0,0 C6,-8 12,-6 10,2 C9,6 3,4 0,0Z" fill="' + col + '"/></g></g></g>'; }
    return c.add(s);
  };
  K.lanterns = function (c, n, colors, heart) {
    var r = c.r, s = '';
    for (var i = 0; i < c.count(n); i++) {
      var x = 60 + r() * 1160, sc = 0.6 + r() * 0.7, col = pick(r, colors), g = c.rad([[0, '#fff6d8'], [0.5, col], [1, col, 0.85]], 0.5, 0.6);
      var shape = heart ? '<path d="M0,6 C0,-6 -18,-6 -18,6 C-18,16 0,26 0,32 C0,26 18,16 18,6 C18,-6 0,-6 0,6Z" fill="' + g + '"/>' : '<path d="M-14,-18 Q0,-24 14,-18 L11,18 Q0,22 -11,18Z" fill="' + g + '"/>';
      s += '<g class="a-lantern" style="' + dl(r, 34 + r() * 20) + '"><g transform="translate(' + f(x) + ' 860) scale(' + f(sc) + ')"><circle r="40" fill="' + c.rad([[0, col, 0.35], [1, col, 0]]) + '"/>' + shape + '</g></g>';
    }
    return c.add(s);
  };
  K.balloons = function (c, n) {
    var r = c.r, cols = [['#ff5d8f', '#ffb3c9'], ['#ffc94d', '#fff0b3'], ['#5dc8ff', '#c9efff'], ['#9b7bff', '#dccfff'], ['#4fe0a5', '#c6f7e3'], ['#ff8a4d', '#ffd3b8']];
    var grads = cols.map(function (cc) { return c.rad([[0, cc[1]], [0.45, cc[0]], [1, cc[0], 0.9]], 0.35, 0.3); }), s = '';
    for (var i = 0; i < c.count(n); i++) {
      var x = 80 + r() * 1120, sc = 0.7 + r() * 0.6, k = i % 6;
      s += '<g class="a-balloon" style="' + dl(r, 26 + r() * 18) + '"><g transform="translate(' + f(x) + ' 860) scale(' + f(sc) + ')"><path d="M0,46 q-6,20 4,38 q8,16 -2,34" stroke="#fff" stroke-opacity="0.55" stroke-width="1.4" fill="none"/><ellipse rx="30" ry="37" fill="' + grads[k] + '"/><path d="M-5,36 L5,36 L0,44Z" fill="' + cols[k][0] + '"/><ellipse cx="-10" cy="-14" rx="6" ry="10" fill="#fff" opacity="0.35" transform="rotate(-20 -10 -14)"/></g></g>';
    }
    return c.add(s);
  };
  K.stringLights = function (c, y, sag, colors) {
    var r = c.r, path = 'M-20,' + y, s = '';
    for (var i = 0; i <= 8; i++) { var x = i * 165; path += ' Q' + (x - 82) + ',' + (y + sag + (i % 2 ? 12 : 0)) + ' ' + x + ',' + y; }
    s += '<path d="' + path + '" stroke="#1d1626" stroke-width="2" fill="none"/>';
    for (var j = 0; j < 40; j++) { var t = j / 40, seg = Math.floor(t * 8), u = t * 8 - seg, x2 = seg * 165 + u * 165, sg = 4 * u * (1 - u) * (sag / 2 + (seg % 2 ? 6 : 0)); s += '<circle class="a-twinkle" style="animation-delay:-' + f(r() * 3) + 's" cx="' + f(x2) + '" cy="' + f(y + 6 + sg * 2) + '" r="5" fill="' + colors[j % colors.length] + '"/>'; }
    return c.add(s);
  };
  K.xmasTree = function (c, x, base, h) {
    var r = c.r; K.pine(c, x, base, h, '#1d5e3e', true);
    var cols = ['#ff4d4d', '#ffd34d', '#4dd2ff', '#ff7ad9', '#ffffff'], s = '';
    for (var i = 0; i < 34; i++) { var t = 0.15 + r() * 0.8, yy = base - h + h * t, half = h * 0.32 * t * (0.85 - r() * 0.7); s += '<circle class="a-twinkle" style="animation-delay:-' + f(r() * 3) + 's" cx="' + f(x + (r() < 0.5 ? -1 : 1) * half) + '" cy="' + f(yy) + '" r="' + f(2 + r() * 2.5) + '" fill="' + cols[i % 5] + '"/>'; }
    var p = []; for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 6 : 14; p.push(f(x + rr * Math.cos(a)) + ',' + f(base - h - 4 + rr * Math.sin(a))); }
    s += '<circle cx="' + x + '" cy="' + (base - h - 4) + '" r="34" fill="' + c.rad([[0, '#ffe27a', 0.6], [1, '#ffe27a', 0]]) + '"/><polygon class="a-window" points="' + p.join(' ') + '" fill="#ffe27a"/>';
    return c.add(s);
  };
  K.rainbow = function (c, cx, by, rad, op) {
    var cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'], s = '<g opacity="' + (op || 0.55) + '" filter="' + c.blur(2.5) + '">';
    cols.forEach(function (col, i) { var rr = rad - i * 13; s += '<path d="M' + (cx - rr) + ',' + by + ' A' + rr + ',' + rr + ' 0 0 1 ' + (cx + rr) + ',' + by + '" stroke="' + col + '" stroke-width="13" fill="none"/>'; });
    return c.add(s + '</g>');
  };
  K.poppies = function (c, n, y0, y1) {
    var r = c.r, s = '<g class="a-grass">';
    for (var i = 0; i < c.count(n); i++) { var x = r() * W, y = y0 + r() * (y1 - y0), sz = (3 + r() * 3) * (0.6 + (y - y0) / (y1 - y0) * 0.9); s += '<path d="M' + f(x) + ',' + f(y + sz * 4) + ' q2,-' + f(sz * 2) + ' 0,-' + f(sz * 4) + '" stroke="#476b2e" stroke-width="1.3" fill="none"/><circle cx="' + f(x - sz * 0.4) + '" cy="' + f(y) + '" r="' + f(sz) + '" fill="#d7262b"/><circle cx="' + f(x + sz * 0.4) + '" cy="' + f(y) + '" r="' + f(sz) + '" fill="#c21d22"/><circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(sz * 0.35) + '" fill="#1a1010"/>'; }
    return c.add(s + '</g>');
  };
  K.eggs = function (c, list) {
    var cols = [['#ffb3d1', '#fff'], ['#b3e5ff', '#fff'], ['#fff1a8', '#ff9fc4'], ['#c9f2b0', '#fff'], ['#d9c2ff', '#fff1a8']], s = '';
    list.forEach(function (p, i) { var col = cols[i % 5], g = c.rad([[0, '#ffffff', 0.7], [0.4, col[0]], [1, col[0]]], 0.35, 0.3); s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + 15 * p[2] + '" ry="' + 20 * p[2] + '" fill="' + g + '"/><path d="M' + (p[0] - 14 * p[2]) + ',' + (p[1] - 2) + ' q7,-6 14,0 t14,0" stroke="' + col[1] + '" stroke-width="' + 2.6 * p[2] + '" fill="none"/>'; });
    return c.add(s);
  };
  K.peonies = function (c, n, y0, y1, colors) {
    var r = c.r, s = '<g class="a-grass">';
    for (var i = 0; i < c.count(n); i++) {
      var x = r() * W, y = y0 + r() * (y1 - y0), sz = (8 + r() * 6) * (0.6 + (y - y0) / (y1 - y0) * 0.8), col = pick(r, colors);
      s += '<path d="M' + f(x) + ',' + f(y + sz * 3) + ' q3,-' + f(sz * 1.5) + ' 0,-' + f(sz * 3) + '" stroke="#3f6b2e" stroke-width="2" fill="none"/><ellipse cx="' + f(x - sz * 1.2) + '" cy="' + f(y + sz * 1.6) + '" rx="' + f(sz * 0.8) + '" ry="' + f(sz * 0.35) + '" fill="#4f7d37" transform="rotate(-25 ' + f(x - sz * 1.2) + ' ' + f(y + sz * 1.6) + ')"/>';
      for (var k = 0; k < 7; k++) { var a = k * 0.9; s += '<circle cx="' + f(x + Math.cos(a) * sz * 0.55) + '" cy="' + f(y + Math.sin(a) * sz * 0.45) + '" r="' + f(sz * 0.55) + '" fill="' + col + '" opacity="0.9"/>'; }
      s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(sz * 0.45) + '" fill="#fff" opacity="0.45"/>';
    }
    return c.add(s + '</g>');
  };
  K.dock = function (c, x, y, w, color) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="6" fill="' + color + '"/>';
    for (var px = x + 6; px < x + w; px += 40) s += '<rect x="' + px + '" y="' + y + '" width="5" height="26" fill="' + color + '"/>';
    return c.add(s);
  };
  K.rowboat = function (c, x, y, color) {
    return c.add('<g class="a-bob"><path d="M' + (x - 46) + ',' + y + ' Q' + x + ',' + (y + 18) + ' ' + (x + 46) + ',' + y + 'Z" fill="' + color + '"/><circle cx="' + (x + 6) + '" cy="' + (y - 22) + '" r="6" fill="' + color + '"/><path d="M' + (x + 1) + ',' + (y - 16) + ' h11 l3,16 h-17z" fill="' + color + '"/><path d="M' + (x + 12) + ',' + (y - 12) + ' L' + (x + 70) + ',' + (y - 60) + '" stroke="' + color + '" stroke-width="2"/><path d="M' + (x + 70) + ',' + (y - 60) + ' Q' + (x + 82) + ',' + (y - 20) + ' ' + (x + 80) + ',' + (y + 6) + '" stroke="' + color + '" stroke-width="0.8" fill="none" opacity="0.7"/></g>');
  };
  K.train = function (c, y, color, lit) {
    var s = '<g class="a-train" style="animation-delay:-28s">', x = 0;
    s += '<path d="M' + x + ',' + y + ' h46 v-26 h-14 v-10 h-8 v10 h-24z" fill="' + color + '"/><circle class="a-window" cx="' + (x + 46) + '" cy="' + (y - 8) + '" r="4" fill="' + lit + '"/>';
    x -= 6;
    for (var i = 0; i < 9; i++) { x -= 58; s += '<rect x="' + x + '" y="' + (y - 24) + '" width="54" height="24" rx="2" fill="' + color + '"/>'; }
    return c.add(s + '</g><rect y="' + (y + 1) + '" width="' + W + '" height="2" fill="' + color + '" opacity="0.8"/>');
  };
  K.tractor = function (c, x, y, color) {
    return c.add('<g class="a-crawl"><g transform="translate(' + x + ' ' + y + ')" fill="' + color + '"><circle cx="-14" cy="-10" r="12"/><circle cx="16" cy="-6" r="7"/><path d="M-22,-20 h30 l8,8 v6 h-38z"/><rect x="-18" y="-40" width="18" height="20"/><rect x="2" y="-30" width="3" height="10"/><circle class="a-window" cx="24" cy="-14" r="3" fill="#ffe38a"/><path d="M26,-14 L120,-34 L120,6Z" fill="' + c.lin([[0, '#ffe38a', 0.35], [1, '#ffe38a', 0]], 1, 0) + '"/></g></g>');
  };

  // ------------------------------------------------------------------ particles
  var P = {};
  P.leaves = function (c, n, colors, min, max) { var r = c.r, s = ''; for (var i = 0; i < c.count(n); i++) s += '<g class="a-leaf" style="' + dl(r, (min || 14) + r() * ((max || 26) - (min || 14))) + '"><path transform="translate(' + f(r() * W) + ' -14) rotate(' + f(r() * 360) + ')" d="M0,-6 C4,-3 4,3 0,6 C-4,3 -4,-3 0,-6Z" fill="' + pick(r, colors) + '" opacity="0.9"/></g>'; return c.add(s); };
  P.apples = function (c, n, box) { // an apple drops from the branches now and then: x0, x1, top y0, y1, how far it falls
    var r = c.r, s = '';
    for (var i = 0; i < c.count(n); i++) {
      var x = box[0] + r() * (box[1] - box[0]), y = box[2] + r() * (box[3] - box[2]), d = box[4] + r() * 120, red = r() > 0.25, sz = 0.9 + r() * 0.5;
      s += '<g class="a-apple" style="--d:' + f(d) + 'px;animation-duration:' + f(10 + r() * 14) + 's;animation-delay:-' + f(r() * 24) + 's"><g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(sz) + ')">' +
        '<circle r="9" fill="' + (red ? '#c4202a' : '#8cc63f') + '"/><circle cx="-3" cy="-3" r="3" fill="#ffffff" opacity="0.35"/><path d="M0,-8 L1,-13" stroke="#5a3a1a" stroke-width="2"/><path d="M1,-11 q5,-4 8,-1 q-4,3 -8,1" fill="#4c8a2a"/></g></g>';
    }
    return c.add(s);
  };
  P.ghosts = function (c, n, box) { // a little ghost rises out of the pumpkin patch now and then, wobbles, and fades away
    var r = c.r, s = '';
    for (var i = 0; i < n; i++) {
      var x = box[0] + r() * (box[1] - box[0]), y = box[2] + r() * (box[3] - box[2]), sz = 0.8 + r() * 0.5;
      s += '<g class="a-ghost" style="animation-duration:' + f(18 + r() * 14) + 's;animation-delay:-' + f(r() * 30) + 's"><g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(sz) + ')">' +
        '<circle r="34" fill="' + c.rad([[0, '#eaf2ff', 0.35], [1, '#eaf2ff', 0]]) + '"/>' +
        '<path d="M-16,14 L-16,-6 C-16,-28 16,-28 16,-6 L16,14 Q12,9 8,14 Q4,9 0,14 Q-4,9 -8,14 Q-12,9 -16,14Z" fill="#f4f8ff" opacity="0.85"/>' +
        '<ellipse cx="-6" cy="-7" rx="2.6" ry="3.6" fill="#22223a"/><ellipse cx="6" cy="-7" rx="2.6" ry="3.6" fill="#22223a"/><ellipse cx="0" cy="2" rx="3" ry="2.4" fill="#22223a" opacity="0.8"/></g></g>';
    }
    return c.add(s);
  };
  P.witch = function (c, y, cycle) { // a witch on her broom crosses the sky (and the moon) every so often
    return c.add('<g class="a-witch" style="animation-duration:' + cycle + 's"><g transform="translate(1420 ' + y + ') scale(1.7)"><g class="a-bob">' +
      '<path d="M-38,10 L34,2" stroke="#120d16" stroke-width="3" stroke-linecap="round"/><path d="M30,0 l18,-8 l-4,8 l6,6 l-20,-2 Z" fill="#120d16"/>' +
      '<path d="M-6,4 C-10,-6 -4,-16 4,-16 C10,-16 12,-8 10,4 Z" fill="#120d16"/><circle cx="0" cy="-20" r="5" fill="#120d16"/>' +
      '<path d="M-8,-22 L4,-24 L-6,-42 Z" fill="#120d16"/><path d="M-12,-22 L10,-24" stroke="#120d16" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M8,-4 C16,-2 22,6 18,12" stroke="#120d16" stroke-width="3" fill="none"/><path d="M-4,4 L-14,14 L-8,16" stroke="#120d16" stroke-width="3" fill="none"/>' +
      '<path d="M2,-10 C-14,-12 -20,-2 -28,-6" stroke="#120d16" stroke-width="3" fill="none"/></g></g></g>');
  };
  P.clovers = function (c, n, colors) { // four-leaf clovers tumbling down
    var r = c.r, s = '';
    for (var i = 0; i < c.count(n); i++) {
      var col = pick(r, colors), leaf = function (a) { return '<path transform="rotate(' + a + ')" d="M0,0 C-2,-4 -9,-6 -9,-10 C-9,-14 -3,-15 0,-10 C3,-15 9,-14 9,-10 C9,-6 2,-4 0,0Z" fill="' + col + '"/>'; };
      s += '<g class="a-leaf" style="' + dl(r, 15 + r() * 11) + '"><g transform="translate(' + f(r() * W) + ' -30) scale(' + f(1.1 + r() * 0.9) + ') rotate(' + f(r() * 90) + ')" opacity="0.92">' +
        leaf(0) + leaf(90) + leaf(180) + leaf(270) + '<path d="M0,0 Q4,8 2,16" stroke="' + col + '" stroke-width="1.8" fill="none"/></g></g>';
    }
    return c.add(s);
  };
  P.petals = function (c, n, colors) { var r = c.r, s = ''; for (var i = 0; i < c.count(n); i++) s += '<g class="a-leaf" style="' + dl(r, 16 + r() * 12) + '"><ellipse cx="' + f(r() * W) + '" cy="-12" rx="5" ry="3" fill="' + pick(r, colors) + '" opacity="0.9"/></g>'; return c.add(s); };
  P.snow = function (c, far, mid, near) {
    var r = c.r, s = '', bl = c.blur(1.6);
    for (var i = 0; i < c.count(far); i++) s += '<g class="a-snow" style="' + dl(r, 22 + r() * 14) + '"><circle cx="' + f(r() * W) + '" cy="-6" r="' + f(0.8 + r()) + '" fill="#fff" opacity="0.6"/></g>';
    for (var j = 0; j < c.count(mid); j++) s += '<g class="a-snow" style="' + dl(r, 13 + r() * 8) + '"><circle cx="' + f(r() * W) + '" cy="-6" r="' + f(1.8 + r() * 1.2) + '" fill="#fff" opacity="0.85"/></g>';
    for (var k = 0; k < c.count(near); k++) s += '<g class="a-snow" style="' + dl(r, 8 + r() * 5) + '"><circle cx="' + f(r() * W) + '" cy="-10" r="' + f(4 + r() * 2) + '" fill="#fff" opacity="0.7" filter="' + bl + '"/></g>';
    return c.add(s);
  };
  P.rain = function (c, n, color) { var r = c.r, s = ''; for (var i = 0; i < c.count(n); i++) { var x = r() * (W + 200); s += '<g class="a-rain" style="' + dl(r, 0.9 + r() * 0.6) + '"><line x1="' + f(x) + '" y1="-40" x2="' + f(x - 8) + '" y2="-12" stroke="' + (color || '#d6e4f5') + '" stroke-width="1.4" opacity="' + f(0.35 + r() * 0.35) + '"/></g>'; } return c.add(s); };
  P.fireflies = function (c, n, y0, y1) { var r = c.r, s = '', g = c.rad([[0, '#fff7a8', 0.9], [1, '#fff7a8', 0]]); for (var i = 0; i < c.count(n); i++) s += '<circle class="a-firefly" style="' + dl(r, 5 + r() * 6) + '" cx="' + f(r() * W) + '" cy="' + f(y0 + r() * (y1 - y0)) + '" r="7" fill="' + g + '"/>'; return c.add(s); };
  P.confetti = function (c, n, colors) { var r = c.r, s = ''; for (var i = 0; i < c.count(n); i++) s += '<g class="a-leaf" style="' + dl(r, 11 + r() * 9) + '"><rect x="' + f(r() * W) + '" y="-16" width="' + f(5 + r() * 4) + '" height="' + f(9 + r() * 5) + '" rx="1.5" fill="' + pick(r, colors) + '" opacity="0.9"/></g>'; return c.add(s); };
  P.hearts = function (c, n, colors) { var r = c.r, s = ''; for (var i = 0; i < c.count(n); i++) s += '<g class="a-leaf" style="' + dl(r, 16 + r() * 12) + '"><path transform="translate(' + f(r() * W) + ' -20) scale(' + f(0.4 + r() * 0.4) + ')" d="M0,6 C0,-4 -12,-4 -12,6 C-12,12 0,18 0,22 C0,18 12,12 12,6 C12,-4 0,-4 0,6Z" fill="' + pick(r, colors) + '" opacity="0.85"/></g>'; return c.add(s); };
  P.shamrocks = function (c, n, colors) { var r = c.r, s = ''; for (var i = 0; i < c.count(n); i++) s += '<g class="a-leaf" style="' + dl(r, 16 + r() * 10) + '"><g transform="translate(' + f(r() * W) + ' -20) scale(' + f(0.5 + r() * 0.4) + ')" fill="' + pick(r, colors) + '" opacity="0.85"><circle cy="-7" r="6"/><circle cx="-7" cy="2" r="6"/><circle cx="7" cy="2" r="6"/><rect x="-1" y="4" width="2" height="12"/></g></g>'; return c.add(s); };
  P.bats = function (c, n) { var r = c.r, s = ''; for (var i = 0; i < c.count(n); i++) s += '<g class="a-bat" style="' + dl(r, 14 + r() * 10) + '"><g transform="translate(-60 ' + f(70 + r() * 230) + ') scale(' + f(0.7 + r() * 0.6) + ')"><path class="a-flap" d="M0,0 q8,-10 16,-2 q4,-6 8,0 q4,-6 8,0 q8,-8 16,2 q-10,-2 -16,6 q-4,-4 -8,0 q-4,-4 -8,0 q-6,-8 -16,-6Z" fill="#120d1c"/></g></g>'; return c.add(s); };
  P.fireworks = function (c, n, colors, y0, y1, reflectY, x0, x1) {
    var r = c.r, s = '';
    for (var i = 0; i < c.count(n); i++) {
      var x = (x0 != null ? x0 : 100) + r() * ((x1 != null ? x1 : 1180) - (x0 != null ? x0 : 100)), y = (y0 || 80) + r() * ((y1 || 300) - (y0 || 80)), col = pick(r, colors), d = 3 + r() * 1.6, rays = '', sty = dl(r, d), rad = 40 + r() * 34;
      for (var k = 0; k < 18; k++) { var a = k * Math.PI * 2 / 18; rays += '<line x1="' + f(Math.cos(a) * rad * 0.25) + '" y1="' + f(Math.sin(a) * rad * 0.25) + '" x2="' + f(Math.cos(a) * rad) + '" y2="' + f(Math.sin(a) * rad + rad * 0.12) + '" stroke="' + col + '" stroke-width="2.4" stroke-linecap="round"/><circle cx="' + f(Math.cos(a) * rad * 1.08) + '" cy="' + f(Math.sin(a) * rad * 1.08 + rad * 0.16) + '" r="1.6" fill="#fff"/>'; }
      s += '<g transform="translate(' + f(x) + ' ' + f(y) + ')"><g class="a-burst" style="' + sty + '">' + rays + '<circle r="' + f(rad * 1.6) + '" fill="' + c.rad([[0, col, 0.25], [1, col, 0]]) + '"/></g></g>';
      if (reflectY) s += '<g transform="translate(' + f(x) + ' ' + f(2 * reflectY - y + 40) + ') scale(1 -0.35)" opacity="0.4"><g class="a-burst" style="' + sty + '">' + rays + '</g></g>';
    }
    return c.add(s);
  };
  P.orbs = function (c, n, color, y0, y1) { var r = c.r, s = '', g = c.rad([[0, color, 0.8], [1, color, 0]]); for (var i = 0; i < c.count(n); i++) s += '<circle class="a-orb" style="animation-delay:-' + f(r() * 9) + 's" cx="' + f(r() * W) + '" cy="' + f(y0 + r() * (y1 - y0)) + '" r="' + f(8 + r() * 18) + '" fill="' + g + '"/>'; return c.add(s); };
  P.lightning = function (c, x, y) { return c.add('<path class="a-lightning" d="M' + x + ',' + y + ' l-14,46 l12,-4 l-18,52 l34,-64 l-13,4 l14,-34z" fill="#fff8d6"/><circle class="a-lightning" cx="' + x + '" cy="' + (y + 40) + '" r="130" fill="' + c.rad([[0, '#fff8d6', 0.5], [1, '#fff8d6', 0]]) + '"/>'); };

  // ------------------------------------------------------------------ the scenes
  var S = {};
  S.january = function (c) { // frozen lake at sunrise
    K.sky(c, [[0, '#33456e'], [0.35, '#8f8fb4'], [0.58, '#f0b5a4'], [0.72, '#ffd9a8']]);
    K.sun(c, 640, 312, 26, '#fff6e2', '#ffd8b0', 230); K.clouds(c, 6, 70, 230, '#ffe6d6', 0.3);
    K.ridge(c, 262, 110, '#a4a5c8', { op: 0.55 }); K.ridge(c, 290, 70, '#8486ad', { op: 0.75 }); K.haze(c, 230, 90, '#ffd9c0', 0.45);
    K.pineRow(c, 322, '#3c4566', 14, 34, true);
    K.water(c, 322, 70, '#f3d4cf', '#9db0cc', 640, '#ffffff', 160);
    var s = ''; for (var i = 0; i < 14; i++) { var x = c.r() * W, y = 330 + c.r() * 56; s += '<path d="M' + f(x) + ',' + f(y) + ' l' + f(18 + c.r() * 40) + ',' + f((c.r() - 0.5) * 8) + ' l' + f(14 + c.r() * 30) + ',' + f((c.r() - 0.5) * 8) + '" stroke="#ffffff" stroke-width="1" opacity="0.55" fill="none"/>'; } c.add(s);
    K.ridge(c, 392, 26, '#e7edf7', { decay: 0.5 }); K.ground(c, 440, '#d9e2ef');
    [[60, 440, 230], [170, 432, 170], [1080, 436, 190], [1200, 444, 250]].forEach(function (p) { K.pine(c, p[0], p[1], p[2], '#1f2a45', true); });
    P.snow(c, 40, 18, 4);
  };
  S.february = function (c) { // red barn at blue hour, light snow
    K.sky(c, [[0, '#1b2147'], [0.4, '#3b3f78'], [0.65, '#8577b0'], [0.8, '#d6a6c4']]);
    K.stars(c, 50, 200); K.moon(c, 300, 190, 26, { crescent: true });
    K.ridge(c, 290, 80, '#6d6fa4', { op: 0.6 }); K.ridge(c, 320, 50, '#9a9ccc', { op: 0.8 });
    K.treeline(c, 338, '#3a3d6b', 8, 26); K.ridge(c, 338, 18, '#dfe3f3', { decay: 0.45 });
    K.barn(c, 760, 396, 1.15, true); K.bareTree(c, 650, 400, 46, '#2a2c52', 5, 7);
    K.fence(c, 420, '#3a3550', 0, 700); K.ridge(c, 412, 16, '#eef1f9', { decay: 0.45 }); K.ground(c, 450, '#e4e8f3');
    K.pine(c, 90, 445, 200, '#1d2346', true); K.pine(c, 1190, 446, 220, '#1d2346', true);
    P.snow(c, 30, 14, 3);
  };
  S.march = function (c) { // rain over the wind farm, first green
    K.sky(c, [[0, '#4b5866'], [0.5, '#7e8b98'], [0.75, '#aab4bd']]);
    K.clouds(c, 9, 40, 220, '#5e6b78', 0.55, 10);
    var s = '<g filter="' + c.blur(6) + '" opacity="0.25">'; for (var i = 0; i < 6; i++) { var x = c.r() * W; s += '<path d="M' + f(x) + ',120 l-60,300 h60 l60,-300z" fill="#56636f"/>'; } c.add(s + '</g>');
    K.ridge(c, 300, 60, '#7d917c', { op: 0.7 }); K.haze(c, 250, 90, '#b6c0c6', 0.5);
    [180, 330, 520, 760, 980, 1150].forEach(function (x, i) { K.turbine(c, x, 330 + (i % 2) * 8, 90 + (i % 3) * 18, '#e9edf0'); });
    K.ridge(c, 336, 30, '#6f9a58', { decay: 0.55 }); K.ridge(c, 372, 24, '#5d8a46', { decay: 0.55 });
    K.water(c, 400, 22, '#9fb1bf', '#7d8f9c', null, '#e6eef5'); K.ground(c, 420, '#4d7a3a');
    K.grass(c, 140, 400, 440, 10, 24, ['#6fa04f', '#88b862', '#4e7d38']);
    P.rain(c, 110);
  };
  S.april = function (c) { // cherry orchard morning
    K.sky(c, [[0, '#7cb7e6'], [0.5, '#b9dbf3'], [0.78, '#f2e7df']]);
    K.sun(c, 1010, 170, 30, '#fffbe8', '#fff3c2', 220); K.rays(c, 1010, 170, '#fff6d0', 7, 0.16);
    K.clouds(c, 5, 60, 220, '#ffffff', 0.55);
    K.ridge(c, 300, 70, '#a9cfa0', { op: 0.65 }); K.ridge(c, 330, 50, '#8fc27c');
    for (var i = 0; i < 9; i++) K.leafyTree(c, 120 + i * 135 + (c.r() - 0.5) * 30, 360 + (i % 2) * 6, 70 + c.r() * 20, ['#ffd3e3', '#f7a8c8', '#e98bb2', '#d9739f'], { blossom: true, dots: 40, trunk: '#5a3a2a' });
    K.ridge(c, 370, 22, '#7cb867', { decay: 0.5 });
    for (var j = 0; j < 4; j++) K.leafyTree(c, [60, 300, 980, 1220][j], 440, 150 + c.r() * 40, ['#ffe0eb', '#f9b4cf', '#ee90b8', '#db74a2'], { blossom: true, dots: 60, trunk: '#4a2f22' });
    K.ground(c, 436, '#6aa856'); K.flowers(c, 60, 390, 434, ['#ffffff', '#fff1a8', '#ffc4dc'], 2.6);
    P.petals(c, 30, ['#ffc4dc', '#ffd9e8', '#ffffff']);
  };
  S.may = function (c) { // wildflower prairie at golden hour
    K.sky(c, [[0, '#5d9bd6'], [0.45, '#a6c9e2'], [0.7, '#f7d79a'], [0.82, '#ffc27a']]);
    K.sun(c, 300, 300, 30, '#fff2c8', '#ffd58a', 260); K.clouds(c, 6, 70, 230, '#fff2dc', 0.4);
    K.ridge(c, 300, 60, '#a3b77a', { op: 0.6 }); K.haze(c, 250, 90, '#ffd9a0', 0.4);
    K.leafyTree(c, 980, 330, 120, ['#7fb05a', '#5f9a44', '#4a8236'], { dots: 60, wide: 0.75 });
    K.ridge(c, 330, 30, '#8fae55', { decay: 0.55 }); K.ground(c, 420, '#5f8a3a');
    K.grass(c, 200, 340, 430, 20, 54, ['#8aa84f', '#a9bf63', '#6f8f3c', '#c6c870']);
    K.flowers(c, 120, 345, 432, ['#c45ba8', '#f2a03d', '#ffd84d', '#ffffff', '#8e6bd6'], 3.4);
    K.butterflies(c, 7, 220, 400, ['#ff9f43', '#ffd84d', '#ffffff', '#9ad0ff']);
  };
  S.june = function (c) { // lake at twilight, dock and fireflies
    K.sky(c, [[0, '#14254a'], [0.45, '#3d4f86'], [0.68, '#c27a9a'], [0.8, '#f2b38a']]);
    K.stars(c, 40, 170); K.moon(c, 980, 180, 20, { crescent: true });
    K.ridge(c, 280, 70, '#5a5f8f', { op: 0.75 }); K.pineRow(c, 320, '#262c52', 16, 44, false);
    K.water(c, 320, 90, '#d99a9a', '#2c3866', 980, '#ffe8c8', 120);
    K.dock(c, 760, 382, 260, '#1a1830'); K.ridge(c, 404, 18, '#1d2a2a', { decay: 0.5 }); K.ground(c, 440, '#162224');
    K.leafyTree(c, 120, 440, 220, ['#1f3a33', '#1a302b', '#14261f'], { dots: 70, wide: 0.7, trunk: '#14201c' });
    K.grass(c, 120, 404, 440, 14, 40, ['#1d332c', '#26413a']);
    P.fireflies(c, 26, 220, 430);
  };
  S.july = function (c) { // Lake Michigan beach sunset
    K.sky(c, [[0, '#2f6fb3'], [0.45, '#7fb3d9'], [0.62, '#f6c28c'], [0.72, '#ff9a6b']]);
    K.sun(c, 640, 318, 34, '#fff1c8', '#ffb37a', 260); K.clouds(c, 6, 80, 240, '#ffe0c8', 0.45);
    K.water(c, 318, 90, '#ffb98a', '#2f6d9e', 640, '#fff0cf', 200);
    var s = '<g class="a-surf">'; for (var i = 0; i < 4; i++) s += '<path d="M-40,' + (366 + i * 12) + ' Q160,' + (360 + i * 12) + ' 320,' + (368 + i * 12) + ' T680,' + (366 + i * 12) + ' T1040,' + (368 + i * 12) + ' T1400,' + (366 + i * 12) + '" stroke="#ffffff" stroke-opacity="' + (0.25 + i * 0.1) + '" stroke-width="2" fill="none"/>'; c.add(s + '</g>');
    K.sailboat(c, 860, 340, 0.9, '#2b2f45'); K.lighthouse(c, 1130, 330, 0.9);
    K.ridge(c, 404, 12, '#f0cf96', { decay: 0.5 }); K.ground(c, 440, '#e8c283');
    K.grass(c, 70, 400, 430, 16, 36, ['#9a9a5a', '#b4ad6a'], 'a-grass');
    K.birds(c, 5, 150, 260, '#3a3550');
  };
  S.august = function (c) { // cornfield under a sunset thunderhead
    K.sky(c, [[0, '#3c4a7a'], [0.45, '#b7798f'], [0.7, '#f4b27a'], [0.82, '#ffd18f']]);
    K.puffy(c, 760, 300, 460, '#ffd9b8', '#c98a9a'); P.lightning(c, 780, 150);
    K.sun(c, 260, 300, 26, '#fff0c8', '#ffc27a', 200);
    K.ridge(c, 310, 40, '#9a8a6a', { op: 0.6 }); K.elevator(c, 1040, 330, 0.75, '#4a3a4a');
    K.ridge(c, 330, 16, '#b49a4a', { decay: 0.5 });
    var s = '<g class="a-grass">';
    for (var row = 0; row < 7; row++) for (var x = (row % 2) * 13; x < W; x += 26) { var y = 340 + row * 14, h = 26 + row * 8; s += '<path d="M' + x + ',' + (y + h) + ' L' + x + ',' + y + '" stroke="' + (row % 2 ? '#7a8a32' : '#8f9c3a') + '" stroke-width="' + (2 + row * 0.5) + '"/><path d="M' + x + ',' + (y + h * 0.4) + ' q' + (8 + row) + ',-6 ' + (14 + row * 2) + ',2 M' + x + ',' + (y + h * 0.6) + ' q-' + (8 + row) + ',-6 -' + (14 + row * 2) + ',2" stroke="#9aac44" stroke-width="' + (1.5 + row * 0.3) + '" fill="none"/><path d="M' + x + ',' + y + ' l0,-8" stroke="#e8c35a" stroke-width="2"/>'; }
    c.add(s + '</g>'); K.ground(c, 440, '#556226');
    P.fireflies(c, 12, 260, 400);
  };
  S.september = function (c) { // harvest moon over the fields, grain elevator
    K.sky(c, [[0, '#1c2347'], [0.5, '#4a3d6b'], [0.75, '#b0707a'], [0.86, '#e9a37a']]);
    K.stars(c, 40, 200); K.moon(c, 470, 250, 52, { color: '#ffcf8a', glow: '#ffb46a' });
    K.ridge(c, 300, 40, '#6d4f6f', { op: 0.75 }); K.elevator(c, 860, 322, 0.95, '#2a2038'); K.treeline(c, 330, '#2e2440', 8, 22);
    K.ridge(c, 334, 14, '#a8804a', { decay: 0.5 }); K.ridge(c, 360, 18, '#94703c', { decay: 0.5 });
    [[180, 372, 0.8], [330, 380, 0.9], [560, 390, 1.1], [1080, 384, 1], [1200, 396, 1.2]].forEach(function (p) { K.hayRoll(c, p[0], p[1], p[2]); });
    K.tractor(c, 700, 362, '#2a2038'); K.ground(c, 420, '#6b4e2c');
    K.grass(c, 120, 400, 436, 10, 26, ['#a8804a', '#c49a5a']);
    P.leaves(c, 8, ['#d9a441', '#c9702f'], 18, 28);
  };
  S.october = function (c) { // forest edge at peak color, sunbeams
    K.sky(c, [[0, '#4a78b0'], [0.5, '#9cc1dc'], [0.78, '#f5d8a8']]);
    K.sun(c, 640, 210, 28, '#fff6dc', '#ffe3a8', 210); K.rays(c, 640, 210, '#fff0c8', 8, 0.2);
    K.ridge(c, 290, 70, '#c08a5a', { op: 0.55 });
    for (var i = 0; i < 16; i++) K.leafyTree(c, i * 82 + (c.r() - 0.5) * 30, 360, 110 + c.r() * 60, pick(c.r, [['#f2b33d', '#e8822c', '#c9532a'], ['#e8622c', '#c9381f', '#9a2a1a'], ['#f2c64d', '#d9a12a', '#a87a1a'], ['#d9722c', '#b84a24', '#7a2e1a']]), { dots: 44, wide: 0.7, trunk: '#3a2218' });
    K.ridge(c, 360, 14, '#8a5a2a', { decay: 0.5 });
    K.ground(c, 440, '#6a3f20');
    K.grass(c, 90, 396, 440, 10, 28, ['#a0662f', '#7a4a22', '#c08440']);
    P.leaves(c, 34, ['#e8762c', '#d4492b', '#f2b33d', '#b8401f'], 12, 22);
  };
  S.november = function (c) { // river at dusk, prairie grass, migrating geese
    K.sky(c, [[0, '#2b2350'], [0.38, '#8a4a6b'], [0.62, '#e2866a'], [0.78, '#f7c27f']]);
    K.sun(c, 860, 292, 32, '#fff4dc', '#ffd69a', 260); K.clouds(c, 6, 80, 230, '#ffd9b8', 0.28);
    K.ridge(c, 250, 110, '#b76a74', { op: 0.5 }); K.ridge(c, 275, 80, '#94516a', { op: 0.72 }); K.haze(c, 220, 110, '#f7c27f', 0.55);
    K.ridge(c, 300, 46, '#6e3a5a'); K.water(c, 318, 64, '#f3b27a', '#6d3f5c', 860, '#fff0cf', 220); K.treeline(c, 318, '#4b2746', 8, 30);
    K.ridge(c, 380, 30, '#3a1d33', { decay: 0.55 });
    K.bareTree(c, 150, 440, 62, '#24111f', 6, 11); K.bareTree(c, 1130, 436, 50, '#24111f', 6, 9);
    K.grass(c, 230, 405, 445, 22, 62, ['#2a1426', '#3d1f35']); K.ground(c, 440, '#22101d');
    K.geese(c, 200, 180, '#3b2140'); P.leaves(c, 9, ['#e07a3c', '#c9502f', '#f0b04a'], 16, 28);
  };
  S.december = function (c) { // small town snowfall
    K.sky(c, [[0, '#070d24'], [0.45, '#16294f'], [0.7, '#2f4f7a'], [0.85, '#5b7ea3']]);
    K.stars(c, 90, 260); K.moon(c, 300, 180, 30);
    K.ridge(c, 270, 100, '#8aa4c4', { op: 0.6 }); K.ridge(c, 300, 70, '#a9bfd8', { op: 0.85 });
    K.pineRow(c, 338, '#2b4466', 18, 40, false); K.waterTower(c, 918, 356, 1, '#1d2f4d'); K.houses(c, 560, 356, 9, '#1a2a46', true, false);
    K.ridge(c, 356, 14, '#dfe8f3', { decay: 0.45 }); K.ridge(c, 392, 30, '#c4d3e6', { decay: 0.5 });
    [[70, 450, 220], [170, 440, 160], [1120, 446, 190], [1220, 452, 240], [1010, 438, 120]].forEach(function (p) { K.pine(c, p[0], p[1], p[2], '#0f1b31', true); });
    K.ridge(c, 430, 18, '#e9f0f8', { decay: 0.5 });
    P.snow(c, 70, 40, 12);
  };

  // ---- holidays
  S.newyear = function (c) { // Chicago-style skyline at midnight, fireworks over the lake
    K.sky(c, [[0, '#04061a'], [0.5, '#0d1338'], [0.8, '#1c2456']]); K.stars(c, 50, 160);
    P.fireworks(c, 10, ['#ffd34d', '#ff7ad9', '#5dc8ff', '#ffffff', '#b388ff', '#7dff9a'], 70, 260, 352);
    K.skyline(c, 352, '#0a0d24', '#ffd77a');
    K.water(c, 352, 90, '#141a40', '#05071a', null, '#ffd77a'); K.ground(c, 440, '#05071a');
    P.confetti(c, 36, ['#ffd34d', '#ffffff', '#ff7ad9', '#5dc8ff']);
  };
  S.mlk = function (c) { // sunrise over an open road through the fields
    K.sky(c, [[0, '#3b3a6b'], [0.4, '#7b5f8e'], [0.62, '#e2938a'], [0.76, '#ffd3a0']]);
    K.sun(c, 640, 330, 40, '#fff2d6', '#ffcf9a', 300); K.rays(c, 640, 330, '#ffe6c0', 9, 0.14);
    K.ridge(c, 320, 40, '#8a6a8e', { op: 0.7 }); K.ridge(c, 340, 14, '#e6dbe8', { decay: 0.45 });
    c.add('<path d="M600,340 L680,340 L900,440 L380,440Z" fill="#6b5a6e"/><path d="M638,344 L642,344 L660,380 L650,380Z M646,392 L656,392 L690,440 L668,440Z" fill="#f0e2c0"/>');
    K.fence(c, 440, '#4a3a52', 0, 380); K.fence(c, 440, '#4a3a52', 900, W);
    K.bareTree(c, 200, 420, 46, '#3a2c48', 5, 7); K.bareTree(c, 1080, 418, 52, '#3a2c48', 5, 8);
    K.ground(c, 440, '#e9dfe8'); K.birds(c, 6, 170, 260, '#4a3a5a');
  };
  S.valentines = function (c) { // dusk hills, heart lanterns rising
    K.sky(c, [[0, '#2a1440'], [0.4, '#7a2f6a'], [0.66, '#e0607e'], [0.82, '#ffb39a']]);
    K.stars(c, 30, 160); K.sun(c, 640, 360, 24, '#ffe6d6', '#ff9aa8', 220);
    K.ridge(c, 300, 100, '#a8456f', { op: 0.6 }); K.ridge(c, 330, 70, '#7a3466', { op: 0.85 }); K.ridge(c, 370, 44, '#4a2050'); K.ridge(c, 410, 26, '#2d1435');
    K.lanterns(c, 12, ['#ff5d8f', '#ff8fb0', '#ffb3c9', '#e0245e'], true);
    P.hearts(c, 14, ['#ff7aa2', '#ffffff', '#ffb3c9']);
  };
  S.presidents = function (c) { // flag on a pole over a misty winter morning
    K.sky(c, [[0, '#4f6c9a'], [0.5, '#a7bcd6'], [0.8, '#eef2f7']]);
    K.sun(c, 300, 220, 24, '#fffaf0', '#ffffff', 200); K.clouds(c, 6, 60, 220, '#ffffff', 0.5);
    K.ridge(c, 300, 70, '#9eb0c8', { op: 0.6 }); K.fog(c, 320, '#ffffff', 0.4); K.ridge(c, 340, 30, '#dbe4ef', { decay: 0.5 });
    K.flagPole(c, 820, 430, 330, 1.25);
    K.pine(c, 120, 440, 190, '#2a3a52', true); K.pine(c, 1210, 446, 200, '#2a3a52', true);
    K.ground(c, 430, '#e8eef6');
  };
  S.stpatricks = function (c) { // emerald hills, stone wall, rainbow after rain
    K.sky(c, [[0, '#5f8fb8'], [0.5, '#a9cbe0'], [0.8, '#e6f1f2']]);
    K.clouds(c, 6, 60, 220, '#ffffff', 0.5); K.rainbow(c, 760, 360, 300, 0.5);
    K.ridge(c, 290, 110, '#5aa86a', { op: 0.7 }); K.fog(c, 300, '#ffffff', 0.3); K.ridge(c, 320, 80, '#3f9a55'); K.ridge(c, 360, 50, '#2e8a46');
    var s = ''; for (var x = 0; x < W; x += 16) s += '<ellipse cx="' + (x + c.r() * 6) + '" cy="' + (400 + Math.sin(x / 140) * 6) + '" rx="10" ry="7" fill="' + pick(c.r, ['#9aa0a2', '#b8bdbf', '#80878a']) + '"/>'; c.add(s);
    K.ridge(c, 404, 22, '#26803e', { decay: 0.5 }); K.ground(c, 440, '#1f7034');
    K.grass(c, 120, 404, 440, 10, 22, ['#3fa65a', '#57bf70']);
    P.shamrocks(c, 18, ['#2ecc71', '#27ae60', '#7bed9f']);
  };
  S.easter = function (c) { // pastel sunrise meadow, painted eggs
    K.sky(c, [[0, '#9fc8ef'], [0.45, '#d6e6f6'], [0.72, '#fde3d6'], [0.82, '#ffe9b8']]);
    K.sun(c, 1000, 250, 34, '#fffbe6', '#fff0c2', 240); K.clouds(c, 5, 60, 220, '#ffffff', 0.55);
    K.ridge(c, 310, 70, '#b8dca8', { op: 0.7 }); K.ridge(c, 340, 50, '#9bd087');
    K.leafyTree(c, 200, 400, 150, ['#ffffff', '#fbe6f0', '#f4c6dc'], { blossom: true, dots: 56, trunk: '#5a3a2a' });
    K.ridge(c, 380, 24, '#86c36c', { decay: 0.5 }); K.ground(c, 430, '#7ab85f');
    K.flowers(c, 70, 384, 430, ['#ffffff', '#fff1a8', '#ffd1e6', '#d9c2ff'], 2.8);
    K.eggs(c, [[420, 408, 1], [470, 414, 0.9], [760, 404, 1.1], [820, 412, 0.85], [1010, 410, 1], [1060, 416, 0.9]]);
    K.butterflies(c, 6, 220, 380, ['#ffd1e6', '#fff1a8', '#c9efff']);
  };
  S.mothers = function (c) { // peony garden in soft morning light
    K.sky(c, [[0, '#f2c4c4'], [0.5, '#fcdcd2'], [0.8, '#fff1e6']]);
    K.sun(c, 260, 200, 30, '#fffaf0', '#fff1d6', 240); K.rays(c, 260, 200, '#fff3e0', 7, 0.18);
    K.ridge(c, 310, 60, '#c8d9b4', { op: 0.6 });
    K.leafyTree(c, 980, 380, 200, ['#ffe0eb', '#f9b4cf', '#ee90b8'], { blossom: true, dots: 70, wide: 0.75, trunk: '#5a3a2a' });
    K.ridge(c, 360, 30, '#a8c890', { decay: 0.5 }); K.ground(c, 430, '#7fae66');
    K.peonies(c, 46, 360, 430, ['#f7a6c4', '#ffd1df', '#ffffff', '#e8799f']);
    P.petals(c, 24, ['#ffb3d1', '#ffffff', '#ffd1e6']); P.orbs(c, 10, '#ffffff', 120, 380);
  };
  S.memorial = function (c) { // poppy field at dawn, flag at the treeline
    K.sky(c, [[0, '#3a4a6e'], [0.45, '#8a8aa8'], [0.7, '#e8b8a0'], [0.82, '#f6d7b0']]);
    K.sun(c, 640, 330, 30, '#fff4e0', '#ffd6b0', 240); K.clouds(c, 5, 70, 220, '#f6dccc', 0.35);
    K.ridge(c, 310, 50, '#6a7090', { op: 0.75 }); K.treeline(c, 334, '#3a3f58', 10, 30);
    K.flagPole(c, 1000, 370, 210, 0.8); K.ridge(c, 340, 14, '#5d7a46', { decay: 0.5 });
    K.ground(c, 420, '#3f5a30'); K.grass(c, 110, 350, 430, 12, 30, ['#5d7a46', '#6f8f52']);
    K.poppies(c, 130, 352, 432);
  };
  S.fathers = function (c) { // misty lake at dawn, a dad fishing from a rowboat
    K.sky(c, [[0, '#4d6f94'], [0.5, '#a6bdd1'], [0.78, '#f2d8b8']]);
    K.sun(c, 900, 290, 30, '#fff4dc', '#ffe1b0', 230);
    K.ridge(c, 280, 70, '#7d93ac', { op: 0.7 }); K.pineRow(c, 320, '#3a4f66', 18, 48, false); K.fog(c, 318, '#ffffff', 0.45);
    K.water(c, 320, 100, '#e6d3c0', '#5f7f9c', 900, '#fff4dc', 150);
    K.rowboat(c, 560, 372, '#22303f');
    K.pine(c, 80, 440, 230, '#1e2b3a'); K.pine(c, 190, 436, 170, '#1e2b3a'); K.pine(c, 1200, 446, 240, '#1e2b3a');
    K.ground(c, 420, '#2a3a2e'); K.birds(c, 4, 150, 240, '#3a4a5e');
  };
  S.july4 = function (c) { // fireworks over the lake and town
    K.sky(c, [[0, '#060a22'], [0.5, '#101a44'], [0.8, '#1e2d5e']]); K.stars(c, 40, 150);
    P.fireworks(c, 11, ['#ff3b4f', '#ffffff', '#3b7bff', '#ff6b6b', '#9ec5ff'], 70, 250, 350);
    K.treeline(c, 350, '#0a0f24', 14, 40); K.waterTower(c, 1060, 350, 0.8, '#0a0f24'); K.houses(c, 300, 350, 12, '#0a0f24', false, false);
    K.water(c, 350, 80, '#18234e', '#060a1e', null, '#ffffff'); K.ground(c, 430, '#060a1e');
  };
  S.labor = function (c) { // late-summer evening, freight train across the prairie
    K.sky(c, [[0, '#3e5a8c'], [0.45, '#9a9ab8'], [0.7, '#f4b27a'], [0.82, '#ffd18f']]);
    K.sun(c, 400, 310, 32, '#fff2c8', '#ffc27a', 250); K.clouds(c, 6, 70, 230, '#ffe0c0', 0.4);
    K.ridge(c, 300, 40, '#8a7a7a', { op: 0.6 }); K.elevator(c, 980, 336, 0.85, '#3a2e3e');
    K.ridge(c, 336, 10, '#b49a5a', { decay: 0.5 }); K.train(c, 360, '#2b2433', '#ffe38a');
    K.ridge(c, 368, 16, '#a8904a', { decay: 0.5 }); K.ground(c, 420, '#7a6a34');
    K.grass(c, 190, 372, 436, 18, 46, ['#b49a5a', '#c9ae66', '#8a7a3a']);
  };
  S.halloween = function (c) { // moonlit farmhouse, fog, glowing jack-o'-lanterns
    K.sky(c, [[0, '#0d0820'], [0.5, '#24123e'], [0.8, '#43245a']]); K.stars(c, 50, 220);
    K.moon(c, 900, 190, 56, { color: '#fff4cf', glow: '#ffd98a' });
    K.ridge(c, 300, 90, '#2a1640', { op: 0.9 }); K.farmhouse(c, 560, 330, 1.1, '#1a1026', '#120a1c', false);
    K.bareTree(c, 420, 340, 50, '#0f0918', 6, 8); K.bareTree(c, 760, 336, 40, '#0f0918', 5, 6);
    K.fog(c, 360, '#9b87c4', 0.3); K.ridge(c, 360, 22, '#1a0f2a', { decay: 0.5 }); K.fence(c, 410, '#0e0816', 0, W);
    [[260, 404, 1], [340, 412, 0.8], [880, 408, 1.1], [980, 414, 0.85]].forEach(function (p) { K.pumpkin(c, p[0], p[1], p[2], true); });
    K.ground(c, 430, '#0e0816'); P.bats(c, 9);
  };
  S.veterans = function (c) { K.bigFlag(c); };
  S.thanksgiving = function (c) { // golden afternoon farm, corn shocks, pumpkins, chimney smoke
    K.sky(c, [[0, '#6a8ab8'], [0.45, '#c9b8a8'], [0.7, '#f4c98a'], [0.82, '#f7b06a']]);
    K.sun(c, 300, 260, 32, '#fff3cf', '#ffd08a', 250); K.clouds(c, 6, 60, 220, '#ffe8c8', 0.4);
    K.ridge(c, 300, 60, '#b88a5a', { op: 0.6 }); K.treeline(c, 330, '#8a4a2a', 10, 34);
    K.farmhouse(c, 760, 350, 1.05, '#f1e6d2', '#7a3a2a', true); K.barn(c, 940, 352, 0.75, false);
    K.ridge(c, 352, 14, '#c99b4a', { decay: 0.5 });
    [[140, 400, 1], [230, 396, 0.85], [1150, 402, 1.05]].forEach(function (p) { K.cornShock(c, p[0], p[1], p[2]); });
    K.ground(c, 420, '#9a7034'); K.grass(c, 110, 380, 430, 10, 26, ['#c99b4a', '#b0843a']);
    [[400, 410, 0.9], [470, 416, 0.7], [620, 412, 1], [1010, 414, 0.8]].forEach(function (p) { K.pumpkin(c, p[0], p[1], p[2], false); });
    P.leaves(c, 16, ['#c9532a', '#e8762c', '#b8401f', '#d9a441'], 18, 28);
  };
  S.christmas = function (c) { // town square tree, wreaths, snowfall
    K.sky(c, [[0, '#070d24'], [0.5, '#152650'], [0.8, '#2a4774']]); K.stars(c, 80, 240); K.moon(c, 260, 180, 26, { crescent: true });
    K.ridge(c, 290, 80, '#7f98ba', { op: 0.6 }); K.pineRow(c, 330, '#25405f', 16, 36, true);
    K.houses(c, 120, 360, 8, '#1a2a46', true, true); K.houses(c, 820, 360, 8, '#1a2a46', true, true);
    K.ridge(c, 360, 12, '#e3ebf6', { decay: 0.45 });
    K.xmasTree(c, 640, 420, 230); K.stringLights(c, 132, 34, ['#ff5d5d', '#ffd34d', '#5dd0ff', '#7dff9a', '#ff7ad9']);
    K.ground(c, 420, '#e9f0f8'); P.snow(c, 60, 34, 10);
  };
  S.nye = function (c) { // city lights on the lake, golden bokeh, first fireworks
    K.sky(c, [[0, '#0b0820'], [0.5, '#1d1440'], [0.8, '#3a2458']]); K.stars(c, 40, 150);
    P.orbs(c, 18, '#ffd77a', 80, 320); P.fireworks(c, 5, ['#ffd34d', '#ffffff', '#ffb3e6'], 80, 220, 352);
    K.skyline(c, 352, '#0d0a1e', '#ffd77a'); K.water(c, 352, 90, '#2a1d4a', '#0b0820', null, '#ffd77a'); K.ground(c, 440, '#0b0820');
    P.confetti(c, 20, ['#ffd34d', '#ffffff']);
  };
  S.birthday = function (c) { // dusk hills, string lights, balloons and glints
    K.sky(c, [[0, '#1e1b4b'], [0.4, '#5b2a7a'], [0.66, '#d0567a'], [0.82, '#ffb07a']]);
    K.stars(c, 50, 220);
    K.ridge(c, 300, 110, '#a8456f', { op: 0.6 }); K.ridge(c, 330, 80, '#7a3466', { op: 0.85 }); K.ridge(c, 370, 50, '#4a2050'); K.ridge(c, 420, 30, '#2d1435');
    K.stringLights(c, 40, 56, ['#ffb3c9', '#fff0b3', '#c9efff', '#dccfff', '#c6f7e3', '#ffd3b8']);
    K.balloons(c, 11); P.orbs(c, 18, '#ffffff', 120, 420); P.confetti(c, 20, ['#fde68a', '#f9a8d4', '#a5f3fc', '#c4b5fd', '#ffffff']);
  };

  window.SCENE_IDS = Object.keys(S);
  // Painted photo backgrounds: one image per time of day (scenes/<month>-<time>.jpg), with animated effects on top
  // lights: x, y, size, kind (lamp flickers, window glows softly); smoke: chimney top; stars: sky box for twinkles at night;
  // sparkle: snow box for glints in daylight. Coordinates are on the 1280×800 screen.
  var PHOTO = { january: { snow: [46, 24, 7],
    lights: [[148, 515, 74, 'lamp'], [410, 522, 24, 'lamp'], [612, 516, 20, 'lamp'], [966, 440, 52, 'window'], [966, 398, 14, 'window'], [1042, 438, 18, 'window']],
    smoke: [1021, 336], stars: [560, 1180, 20, 205], sparkle: [220, 1180, 560, 770], skyMask: 'scenes/january-sky.png' },
    // February: hearts fall until Valentine's Day, blossom petals after. dusk = the string-lights image, just after sunset.
    february: { dusk: true, skyMask: 'scenes/february-sky.png', fall: function (d) { return d.getDate() < 14 ? ['hearts', 20, ['#ff5d8f', '#ff8fb1', '#e8325a', '#ffc2d4']] : ['petals', 32, ['#ffc4dc', '#ffd9e8', '#f7a8c8', '#ffffff']]; },
      suns: { morning: [1072, 645, 150], evening: [1069, 638, 170] }, stars: [700, 1260, 20, 520], sparkle: [300, 1250, 705, 790],
      bulbs: { dusk: [[200, 48], [292, 104], [232, 116], [120, 108], [66, 152], [440, 54], [512, 48], [598, 20], [770, 164], [845, 44], [700, 114], [808, 140]] } },
    // March: four-leaf clovers fall all month; morning mist over the field; string lights on the fence at dusk
    march: { dusk: true, skyMask: 'scenes/march-sky.png', fall: function () { return ['clovers', 18, ['#3f9b3a', '#5cb84a', '#2f7d2e', '#7bcf5a']]; },
      suns: { morning: [885, 478, 170], evening: [1178, 483, 170] }, mist: { morning: [592, '#fff1dc'] }, stars: [620, 1260, 20, 400], sparkle: [560, 1250, 650, 790],
      bulbs: { dusk: [[305, 32], [338, 52], [375, 62], [440, 62], [478, 68], [548, 72], [732, 62], [775, 68], [822, 58], [938, 30], [62, 62], [128, 100], [200, 410], [290, 425], [298, 505], [358, 525], [415, 532], [470, 532], [500, 468], [590, 530]] } },
    // April: blossom petals fall all month; candles flicker in the lanterns; butterflies by day, fireflies after dark
    april: { dusk: true, skyMask: 'scenes/april-sky.png', fall: function () { return ['petals', 30, ['#ffffff', '#ffe4ee', '#ffd0e0', '#fff4f8']]; },
      lights: { morning: [[255, 215, 46, 'lamp'], [425, 684, 52, 'lamp']], midday: [[244, 209, 40, 'lamp'], [425, 684, 46, 'lamp']], afternoon: [[425, 684, 48, 'lamp']], evening: [[425, 684, 54, 'lamp']],
        dusk: [[183, 209, 52, 'lamp'], [425, 680, 58, 'lamp'], [915, 465, 16, 'window']], night: [[218, 232, 60, 'lamp'], [418, 650, 64, 'lamp'], [912, 462, 16, 'window']] },
      suns: { morning: [725, 380, 170], evening: [857, 396, 170] }, moon: { night: [1152, 122, 70] }, mist: { morning: [440, '#ffe9d2'] }, stars: [560, 1260, 20, 330],
      butterflies: { midday: [480, 720], afternoon: [480, 720], morning: [500, 720] }, fireflies: { dusk: [430, 760], night: [400, 770] },
      bulbs: { night: [[20, 22], [50, 45], [78, 72], [375, 88], [330, 100], [290, 205], [265, 225], [30, 262], [18, 196]] } },
    // June: beach cottage. Lanterns glow, sun or moon sparkles on the water, gulls by day, lightning bugs in the dunes at night
    june: { dusk: true, skyMask: 'scenes/june-sky.png', lights: [[202, 262, 50, 'lamp'], [342, 492, 34, 'lamp'], [566, 608, 44, 'lamp'], [1182, 690, 54, 'lamp']],
      suns: { morning: [1080, 372, 170], afternoon: [1182, 286, 150], evening: [1079, 376, 170], dusk: [1077, 382, 180] }, moon: { night: [1086, 186, 70] }, stars: [520, 1260, 20, 330],
      glints: { morning: [620, 1270, 410, 500], midday: [620, 1270, 410, 500], afternoon: [620, 1270, 410, 500], evening: [900, 1260, 400, 500], dusk: [980, 1180, 395, 520], night: [1030, 1140, 400, 540] },
      gulls: { morning: [70, 300], midday: [60, 280], afternoon: [60, 280] }, fireflies: { dusk: [400, 650], night: [380, 660] },
      bulbs: { evening: [[8, 110], [38, 128], [90, 78], [100, 112], [150, 124], [212, 146], [300, 92], [332, 96]], dusk: [[8, 110], [38, 128], [90, 78], [100, 112], [150, 124], [212, 146], [300, 92], [332, 96]], night: [[8, 110], [38, 128], [90, 78], [100, 112], [150, 124], [212, 146], [300, 92], [332, 96]] } },
    // July: lake porch. Fireworks over the water at dusk and night, string lights and the wall lantern glow, sailboat-water sparkle by day
    july: { dusk: true, lights: [[175, 105, 56, 'lamp']],
      suns: { morning: [1255, 229, 160], evening: [1270, 200, 180] }, moon: { night: [1175, 70, 60] }, stars: [790, 1260, 20, 180],
      glints: { morning: [290, 1270, 250, 322], midday: [290, 1270, 250, 322], afternoon: [290, 1270, 250, 322], evening: [800, 1270, 250, 322], night: [1110, 1240, 255, 330] },
      gulls: { morning: [110, 210], midday: [100, 200], afternoon: [100, 200] },
      fireworks: { dusk: 3, night: 7, box: [300, 1260, 40, 200], reflect: null, mask: 'scenes/july-sky.png' },
      bulbs: { evening: [[115, 55], [248, 82], [320, 82], [415, 100], [507, 100], [594, 86], [668, 50], [733, 18]], dusk: [[115, 55], [248, 82], [320, 82], [415, 100], [507, 100], [594, 86], [668, 50], [733, 18]], night: [[115, 55], [248, 82], [320, 82], [415, 100], [507, 100], [594, 86], [668, 50], [733, 18]] } },
    // August: sunflower field. Bees by day, golden pollen in the low sun, shooting stars (the Perseids) and lightning bugs at night
    // May: lakeside terrace. Blossom petals drift down, butterflies by day, the lantern glows, sun or moon sparkles on the water
    may: { dusk: true, skyMask: 'scenes/may-sky.png', fall: function () { return ['petals', 26, ['#ffd0e0', '#ffffff', '#f7a8c8', '#d9c2f0']]; },
      lights: [[223, 168, 50, 'lamp']], suns: { morning: [1032, 371, 170], evening: [1036, 361, 180] }, moon: { night: [1057, 183, 70] }, stars: [560, 1260, 20, 380],
      mist: { morning: [430, '#fff0ea'] },
      glints: { morning: [880, 1180, 420, 560], midday: [600, 1270, 420, 560], afternoon: [600, 1270, 420, 560], evening: [960, 1120, 410, 560], dusk: [700, 1270, 420, 560], night: [1000, 1110, 420, 560] },
      butterflies: { morning: [440, 700], midday: [440, 700], afternoon: [440, 700] }, fireflies: { night: [520, 760] } },
    // September: apple orchard. Apples drop now and then, a few leaves drift, geese fly over by day; lanterns and string lights at dusk
    september: { dusk: true, skyMask: 'scenes/september-sky.png', fall: function () { return ['leaves', 9, ['#c9502f', '#e07a3c', '#f0b04a', '#9a2a1a']]; },
      apples: [150, 880, 80, 210, 470],
      lights: { dusk: [[115, 268, 56, 'lamp'], [744, 450, 22, 'lamp'], [1170, 468, 24, 'lamp'], [1262, 492, 26, 'lamp']] },
      suns: { morning: [1056, 215, 170], evening: [1056, 223, 180] }, moon: { night: [1097, 97, 60] }, mist: { morning: [300, '#fff3e4'] }, stars: [640, 1270, 20, 240],
      geese: { morning: [820, 110], midday: [760, 90], afternoon: [800, 100], evening: [780, 120] },
      bulbs: { dusk: [[170, 171], [228, 150], [258, 154], [325, 190], [374, 215], [414, 232], [457, 239], [487, 225], [520, 187], [341, 263], [470, 335], [535, 330], [593, 336], [604, 370], [720, 372], [736, 372], [820, 430], [842, 420], [1018, 397], [1060, 435], [1122, 232], [1135, 220], [1203, 218], [1220, 353], [1252, 357]] } },
    // October: pumpkin farm. Jack-o'-lanterns and the lantern flicker, bats at dusk and night, a ghost now and then, a witch across the moon
    october: { dusk: true, skyMask: 'scenes/october-sky.png', fall: function () { return ['leaves', 12, ['#d9541e', '#e8822c', '#f2b33d', '#b8321a']]; },
      lights: { morning: [[240, 300, 60, 'lamp'], [238, 600, 74, 'pumpkin'], [450, 545, 40, 'pumpkin']], midday: [[240, 300, 52, 'lamp'], [238, 600, 66, 'pumpkin'], [450, 545, 36, 'pumpkin']],
        afternoon: [[240, 300, 60, 'lamp'], [238, 600, 74, 'pumpkin'], [450, 545, 40, 'pumpkin'], [1152, 330, 16, 'window']], evening: [[240, 300, 66, 'lamp'], [238, 600, 84, 'pumpkin'], [450, 545, 46, 'pumpkin'], [1152, 330, 18, 'window'], [1160, 470, 50, 'window']],
        dusk: [[237, 310, 70, 'lamp'], [238, 600, 90, 'pumpkin'], [450, 555, 48, 'pumpkin'], [1152, 325, 18, 'window'], [1160, 470, 54, 'window']], night: [[240, 315, 74, 'lamp'], [238, 600, 92, 'pumpkin'], [450, 545, 50, 'pumpkin'], [520, 570, 26, 'pumpkin'], [1152, 330, 20, 'window'], [1160, 470, 58, 'window']] },
      suns: { morning: [340, 350, 170], evening: [470, 300, 190] }, moon: { night: [928, 165, 80] }, mist: { morning: [520, '#ffe6cc'], night: [520, '#9aa6c8'] }, stars: [560, 1270, 20, 300],
      bats: { evening: 3, dusk: 6, night: 9 }, ghosts: { dusk: 1, night: 3, box: [600, 1000, 470, 560] }, witch: { dusk: [120, 70], night: [158, 45] },
      bulbs: { dusk: [[180, 115], [125, 190], [195, 220], [292, 255], [340, 272], [388, 277], [440, 278], [493, 275], [548, 265], [608, 253], [668, 233], [731, 205], [798, 170], [870, 130], [948, 72], [237, 400]] } },
    // November: harvest farm. Oak leaves drift down, geese fly south by day, morning mist and frost, barn lights at dusk, first flurries on cold nights
    november: { dusk: true, skyMask: 'scenes/november-sky.png', fall: function () { return ['leaves', 11, ['#8a4a22', '#a8602c', '#c27a3a', '#6e3a1c']]; },
      lights: { evening: [[1080, 400, 22, 'window']], dusk: [[1035, 395, 30, 'window'], [1140, 396, 16, 'window'], [915, 402, 14, 'window'], [860, 418, 18, 'lamp'], [1108, 420, 20, 'lamp'], [1205, 425, 22, 'lamp'], [1270, 435, 24, 'lamp']],
        night: [[918, 405, 16, 'window'], [1015, 405, 18, 'window'], [1140, 400, 18, 'window'], [1040, 428, 34, 'lamp']] },
      suns: { morning: [345, 290, 170], evening: [752, 280, 180] }, moon: { night: [1140, 75, 60] }, mist: { morning: [445, '#f4e8e2', 700, 1280], night: [440, '#8fa0c4', 700, 1280] }, stars: [560, 1270, 20, 250],
      glints: { morning: [600, 1280, 560, 780], night: [560, 1280, 430, 780] }, geese: { morning: [760, 100], midday: [720, 90], afternoon: [760, 110], evening: [700, 120] }, flurries: { night: [16, 7, 0] } },
    august: { dusk: true, skyMask: 'scenes/august-sky.png',
      suns: { morning: [315, 321, 170], afternoon: [370, 225, 150], evening: [335, 302, 180], dusk: [329, 315, 190] }, moon: { night: [325, 223, 70] },
      mist: { morning: [372, '#fff3df'] }, stars: [600, 1270, 20, 290], meteors: { night: 6 },
      bees: { morning: [[40, 420, 430, 660], [480, 1180, 455, 525]], midday: [[40, 420, 430, 660], [480, 1180, 455, 525]], afternoon: [[40, 420, 430, 660], [480, 1180, 455, 525]] },
      motes: { afternoon: [0, 1280, 300, 720], evening: [0, 1280, 300, 720], dusk: [0, 1280, 320, 720] },
      butterflies: { afternoon: [470, 700] }, fireflies: { dusk: [460, 740], night: [430, 760] } } };
  var LIGHT = { morning: 0.5, midday: 0.25, afternoon: 0.45, evening: 0.85, dusk: 0.95, night: 1 };
  function photoFx(c, cfg, tod, low) {
    var r = c.r, k = LIGHT[tod] != null ? LIGHT[tod] : 0.8, out = '', blur = c.blur(5);
    var lights = cfg.lights && !Array.isArray(cfg.lights) ? cfg.lights[tod] || [] : cfg.lights || [];
    var moon = cfg.moon && cfg.moon[tod];
    if (moon) out += '<circle class="a-pulse" cx="' + moon[0] + '" cy="' + moon[1] + '" r="' + moon[2] + '" fill="' + c.rad([[0, '#eef3ff', 0.6], [0.4, '#cfdcff', 0.25], [1, '#cfdcff', 0]]) + '"/>';
    var mist = cfg.mist && cfg.mist[tod];
    if (mist && !low) { out += '<g filter="' + c.blur(16) + '">'; for (var mi = 0; mi < 6; mi++) out += '<ellipse class="a-fog" style="animation-delay:-' + f(r() * 40) + 's" cx="' + f(mist[2] != null ? mist[2] + r() * (mist[3] - mist[2]) : r() * W) + '" cy="' + f(mist[0] + (r() - 0.5) * 30) + '" rx="' + f(mist[2] != null ? 90 + r() * 120 : 200 + r() * 220) + '" ry="' + f(14 + r() * 12) + '" fill="' + mist[1] + '" opacity="0.4"/>'; out += '</g>'; }
    lights.forEach(function (L) { // warm glow: lamps flicker, windows breathe
      var g = L[3] === 'pumpkin' ? c.rad([[0, '#ffb347', 0.95 * Math.max(k, 0.55)], [0.45, '#ff7a1a', 0.4 * Math.max(k, 0.55)], [1, '#ff6a00', 0]]) : c.rad([[0, '#ffd590', 0.9 * k], [0.4, '#ffc06a', 0.35 * k], [1, '#ffb050', 0]]);
      out += '<circle class="' + (L[3] === 'window' ? 'a-pulse' : 'a-flicker') + '" style="animation-delay:-' + f(r() * 5) + 's" cx="' + L[0] + '" cy="' + L[1] + '" r="' + L[2] + '" fill="' + g + '"/>';
      if (L[3] === 'lamp' && k > 0.6) out += '<ellipse class="a-pulse" cx="' + L[0] + '" cy="' + (L[1] + L[2] * 1.5) + '" rx="' + f(L[2] * 1.8) + '" ry="' + f(L[2] * 0.35) + '" fill="' + c.rad([[0, '#ffcf8a', 0.35 * k], [1, '#ffcf8a', 0]]) + '"/>';
    });
    var sun = cfg.suns && cfg.suns[tod]; // the low sun breathes
    if (sun) out += '<circle class="a-pulse" cx="' + sun[0] + '" cy="' + sun[1] + '" r="' + sun[2] + '" fill="' + c.rad([[0, '#fff1c8', 0.75], [0.35, '#ffc890', 0.3], [1, '#ffb070', 0]]) + '"/>';
    ((cfg.bulbs && cfg.bulbs[tod]) || []).forEach(function (b) { // string lights twinkle
      out += '<circle class="a-twinkle" style="animation-delay:-' + f(r() * 3) + 's;animation-duration:' + f(1.6 + r() * 2.4) + 's" cx="' + b[0] + '" cy="' + b[1] + '" r="22" fill="' + c.rad([[0, '#fff3c4', 0.95], [0.3, '#ffd27a', 0.5], [1, '#ffc060', 0]]) + '"/>';
    });
    if (cfg.smoke && !low) { // chimney smoke drifting up
      var sc = tod === 'night' ? '#c3c8e4' : tod === 'evening' ? '#efe2f4' : '#ffffff';
      out += '<g filter="' + blur + '">';
      for (var i = 0; i < 6; i++) out += '<ellipse class="a-smoke" style="animation-delay:-' + f(i * 1.6) + 's" cx="' + cfg.smoke[0] + '" cy="' + cfg.smoke[1] + '" rx="12" ry="9" fill="' + sc + '" opacity="0.85"/>';
      out += '</g>';
    }
    var skyIn = '', skyOut = '';
    if (cfg.skyMask) { var smid = c.uid('k'); c.defs += '<mask id="' + smid + '" maskUnits="userSpaceOnUse" x="-71.1" y="0" width="1422.2" height="800"><image href="' + cfg.skyMask + '" x="-71.1" y="0" width="1422.2" height="800" preserveAspectRatio="none"/></mask>'; skyIn = '<g mask="url(#' + smid + ')">'; skyOut = '</g>'; }
    if (cfg.meteors && cfg.meteors[tod]) { // shooting stars streak across the open sky now and then
      out += skyIn;
      for (var mt = 0; mt < cfg.meteors[tod]; mt++) { var mx = cfg.stars[0] + 120 + r() * (cfg.stars[1] - cfg.stars[0] - 60), my = cfg.stars[2] + r() * (cfg.stars[3] - cfg.stars[2]) * 0.6, len = 70 + r() * 70;
        out += '<g class="a-meteor" style="animation-duration:' + f(9 + r() * 14) + 's;animation-delay:-' + f(r() * 20) + 's"><line x1="' + f(mx) + '" y1="' + f(my) + '" x2="' + f(mx + len) + '" y2="' + f(my - len * 0.5) + '" stroke="' + c.lin([[0, '#ffffff', 1], [1, '#ffffff', 0]], 1, 0) + '" stroke-width="2.2" stroke-linecap="round"/></g>'; }
      out += skyOut;
    }
    if (cfg.stars && (tod === 'night' || tod === 'evening')) { out += skyIn; var sb = cfg.stars; for (var j = 0; j < (tod === 'night' ? 34 : 12); j++) out += '<circle class="a-twinkle" style="animation-delay:-' + f(r() * 4) + 's;animation-duration:' + f(2 + r() * 3) + 's" cx="' + f(sb[0] + r() * (sb[1] - sb[0])) + '" cy="' + f(sb[2] + r() * (sb[3] - sb[2])) + '" r="' + f(0.8 + r() * 1.4) + '" fill="#ffffff"/>'; out += skyOut; }
    var spk = cfg.glints ? cfg.glints[tod] : (tod !== 'night' ? cfg.sparkle : null);
    if (spk && !low) { var gb = spk; for (var q = 0; q < 26; q++) { var x = gb[0] + r() * (gb[1] - gb[0]), y = gb[2] + r() * (gb[3] - gb[2]), z = 1.5 + r() * 2.5;
      out += '<path class="a-twinkle" style="animation-delay:-' + f(r() * 6) + 's;animation-duration:' + f(3 + r() * 4) + 's" d="M' + f(x) + ',' + f(y - z * 2) + ' L' + f(x + z * 0.4) + ',' + f(y) + ' L' + f(x) + ',' + f(y + z * 2) + ' L' + f(x - z * 0.4) + ',' + f(y) + 'Z M' + f(x - z * 2) + ',' + f(y) + ' L' + f(x) + ',' + f(y + z * 0.4) + ' L' + f(x + z * 2) + ',' + f(y) + ' L' + f(x) + ',' + f(y - z * 0.4) + 'Z" fill="#ffffff"/>'; } }
    c.add(out);
    var bf = cfg.butterflies && cfg.butterflies[tod]; if (bf) K.butterflies(c, 6, bf[0], bf[1], ['#ffd84d', '#ffffff', '#f7a8c8', '#9ad0ff', '#ff9f43']);
    var ff = cfg.fireflies && cfg.fireflies[tod]; if (ff) P.fireflies(c, tod === 'night' ? 26 : 16, ff[0], ff[1]);
    if (cfg.apples && tod !== 'night') P.apples(c, 6, cfg.apples);
    var sm = function (fn) { if (!cfg.skyMask) return fn(); var k2 = c.uid('k'); c.defs += '<mask id="' + k2 + '" maskUnits="userSpaceOnUse" x="-71.1" y="0" width="1422.2" height="800"><image href="' + cfg.skyMask + '" x="-71.1" y="0" width="1422.2" height="800" preserveAspectRatio="none"/></mask>'; c.add('<g mask="url(#' + k2 + ')">'); fn(); c.add('</g>'); };
    if (cfg.bats && cfg.bats[tod]) sm(function () { P.bats(c, cfg.bats[tod]); });
    if (cfg.witch && cfg.witch[tod]) sm(function () { P.witch(c, cfg.witch[tod][0], cfg.witch[tod][1]); });
    if (cfg.ghosts && cfg.ghosts[tod]) P.ghosts(c, cfg.ghosts[tod], cfg.ghosts.box);
    var gz = cfg.geese && cfg.geese[tod];
    if (gz) { var gk = cfg.skyMask ? c.uid('k') : ''; if (gk) { c.defs += '<mask id="' + gk + '" maskUnits="userSpaceOnUse" x="-71.1" y="0" width="1422.2" height="800"><image href="' + cfg.skyMask + '" x="-71.1" y="0" width="1422.2" height="800" preserveAspectRatio="none"/></mask>'; c.add('<g mask="url(#' + gk + ')">'); }
      K.geese(c, gz[0], gz[1], tod === 'evening' ? '#3b2140' : '#2c2a33'); if (gk) c.add('</g>'); }
    var bz = cfg.bees && cfg.bees[tod];
    if (bz) { var bs = ''; bz.forEach(function (bx) { for (var bi = 0; bi < 5; bi++) { var x = bx[0] + r() * (bx[1] - bx[0]), y = bx[2] + r() * (bx[3] - bx[2]), sz = 0.8 + r() * 0.5;
      bs += '<g class="a-bee" style="animation-duration:' + f(1.8 + r() * 1.6) + 's;animation-delay:-' + f(r() * 3) + 's"><g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(sz) + ')">' +
        '<ellipse class="a-flap" cx="-1" cy="-5" rx="4" ry="3" fill="#ffffff" opacity="0.75"/><ellipse class="a-flap" cx="3" cy="-5" rx="4" ry="3" fill="#ffffff" opacity="0.6"/>' +
        '<ellipse cx="0" cy="0" rx="6" ry="4" fill="#f4b81c"/><rect x="-1.6" y="-4" width="2" height="8" fill="#2a1d10"/><rect x="2.4" y="-3.6" width="1.6" height="7.2" fill="#2a1d10"/></g></g>'; } }); c.add(bs); }
    var mo = cfg.motes && cfg.motes[tod];
    if (mo && !low) { var ms = ''; for (var mi2 = 0; mi2 < 28; mi2++) ms += '<circle class="a-mote" style="animation-duration:' + f(8 + r() * 8) + 's;animation-delay:-' + f(r() * 14) + 's" cx="' + f(mo[0] + r() * (mo[1] - mo[0])) + '" cy="' + f(mo[2] + r() * (mo[3] - mo[2])) + '" r="' + f(1.2 + r() * 2) + '" fill="' + c.rad([[0, '#fff2c0', 1], [1, '#ffd36a', 0]]) + '"/>'; c.add(ms); }
    var gl = cfg.gulls && cfg.gulls[tod];
    if (gl) { if (cfg.skyMask) { var gm = c.uid('k'); c.defs += '<mask id="' + gm + '" maskUnits="userSpaceOnUse" x="-71.1" y="0" width="1422.2" height="800"><image href="' + cfg.skyMask + '" x="-71.1" y="0" width="1422.2" height="800" preserveAspectRatio="none"/></mask>'; c.add('<g mask="url(#' + gm + ')">'); }
      K.birds(c, 4, gl[0], gl[1], '#3a3f4a'); if (cfg.skyMask) c.add('</g>'); }
    var fw = cfg.fireworks;
    if (fw && fw[tod]) { // only in the open sky: a mask made from the photo keeps the porch, lights and trees in front
      var mid = c.uid('m');
      if (fw.mask) { c.defs += '<mask id="' + mid + '" maskUnits="userSpaceOnUse" x="-71.1" y="0" width="1422.2" height="800"><image href="' + fw.mask + '" x="-71.1" y="0" width="1422.2" height="800" preserveAspectRatio="none"/></mask>'; c.add('<g mask="url(#' + mid + ')">'); }
      P.fireworks(c, fw[tod], ['#ff4d5e', '#ffffff', '#5aa0ff', '#ffd166', '#ff7ab6'], fw.box[2], fw.box[3], fw.reflect, fw.box[0], fw.box[1]);
      if (fw.mask) c.add('</g>');
    }
  }
  window.sceneHasTimes = function (id) { return !!PHOTO[id]; };
  window.sceneImage = function (id, tod) { if (!PHOTO[id]) return null; if (tod === 'dusk' && !PHOTO[id].dusk) tod = 'evening'; return 'scenes/' + id + '-' + (tod || 'evening') + '.jpg'; };
  window.buildScene = function (id, lowPower, tod, date) {
    if (PHOTO[id]) {
      var sc = new Canvas(id + 'x', lowPower), sn = PHOTO[id].snow;
      if (tod === 'dusk' && !PHOTO[id].dusk) tod = 'evening';
      photoFx(sc, PHOTO[id], tod, lowPower);
      if (sn) P.snow(sc, sn[0] * (tod === 'night' ? 1.3 : 1), sn[1], sn[2]);
      var fz = PHOTO[id].flurries && PHOTO[id].flurries[tod]; if (fz) P.snow(sc, fz[0], fz[1], fz[2]);
      var fl = PHOTO[id].fall && PHOTO[id].fall(date || new Date());
      if (fl) P[fl[0]](sc, fl[1], fl[2]);
      return '<div class="scimg" style="background-image:url(\'' + window.sceneImage(id, tod) + '\')"></div><div class="scshade"></div>' +
        '<svg width="' + W + '" height="' + H + '" viewBox="-71.1 0 1422.2 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' + sc.defs + '</defs>' + sc.body + '</svg>';
    }
    var c = new Canvas(id, lowPower);
    (S[id] || S.november)(c);
    return c.svg();
  };
})();
