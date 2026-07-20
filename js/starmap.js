/* ============================================================================
 * starmap.js — 星空足迹（Leaflet + CARTO 暗黑底图，完全免 API Key）
 * ----------------------------------------------------------------------------
 * 底图：CARTO dark_all（© OpenStreetMap © CARTO），天生暗黑，契合赛博禅境。
 * 功能：定位（Geolocation → IP 城市级 → 默认北京）、自定义 SVG 星星标记
 * （pulsating 动画）、时间衰减（亮青→青→紫→暗紫，大小同步衰减）、点击地图
 * 点亮星星（昵称 + 可选留言）、坐标模糊化 100m、localStorage 持久化、
 * 「已有 N 位访客留下足迹」统计。
 * 降级链：Leaflet CDN 未就绪（轮询至超时 8 秒）→ 内置 Canvas 2D 星图兜底。
 * ==========================================================================*/

const Starmap = {
  stars: [],
  inited: false,
  _map: null,
  _local: false,

  init() {
    if (this.inited) return; this.inited = true;
    this.stars = Utils.get('footprints', []);
    this._markers = [];
    this._waitLeaflet(Date.now());
    this._syncFromCloud();   // 拉取全球足迹（失败静默降级本地模式）
  },

  /* ---- 云端合并：按 id 去重 + 时间排序 + 重渲染 ---- */
  async _syncFromCloud() {
    const merged = await Cloud.syncDown('footprints', this.stars);
    if (merged === this.stars) return;      // 云端不可达，保持本地
    this.stars = merged;
    Utils.set('footprints', merged);        // 合并结果回写本地，离线也能看到
    if (this._map) {
      this._markers.forEach(m => this._map.removeLayer(m));
      this._markers = [];
      this.stars.forEach(st => this._addMarker(st));
    }
    this._renderStats();
  },

  /* ---- 按需动态加载 Leaflet（不阻塞首屏）；超时/失败降级 Canvas 2D 星图 ---- */
  _leafletLoading: false,
  _leafletFailed: false,
  _ensureLeaflet() {
    if (window.L || this._leafletLoading) return;
    this._leafletLoading = true;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    js.onerror = () => { this._leafletFailed = true; };
    document.head.appendChild(js);
  },
  _waitLeaflet(start) {
    if (window.L) return this._initLeaflet();
    if (this._leafletFailed || Date.now() - start >= (CONFIG.leaflet.timeoutMs || 8000)) {
      console.warn('[ZXW] Leaflet CDN 不可用，降级为 Canvas 2D 星图');
      return this._initLocal();
    }
    this._ensureLeaflet();
    setTimeout(() => this._waitLeaflet(start), 200);
  },

  /* ==================== Leaflet 真实地图模式 ==================== */
  _initLeaflet() {
    const stage = document.getElementById('starmap-stage');
    stage.innerHTML = '<div id="leaflet-map" style="width:100%;height:100%"></div>';

    const cfg = CONFIG.leaflet;
    const map = L.map('leaflet-map', {
      center: cfg.defaultCenter,
      zoom: cfg.defaultZoom,
      minZoom: 3,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
      tap: true,                 // 移动端触控
      touchZoom: true,
      bounceAtZoomLimits: false
    });
    this._map = map;

    /* CARTO 暗黑底图（attribution 必须保留） */
    L.tileLayer(cfg.tileUrl, {
      attribution: cfg.attribution,
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    /* 渲染历史足迹 */
    this.stars.forEach(st => this._addMarker(st));

    /* 定位流程：Geolocation → IP 城市级 → 默认北京 */
    this._locate(map);

    /* 点击地图任意位置 → 点亮星星（坐标模糊化 100m） */
    map.on('click', e => {
      this._askStar(Utils.fuzzCoord(e.latlng.lng), Utils.fuzzCoord(e.latlng.lat));
    });

    this._renderStats();
  },

  /* 定位：浏览器高精度 → ipapi.co 城市级（免 Key）→ 北京天安门 */
  _locate(map) {
    const cfg = CONFIG.leaflet;
    const toDefault = () => map.setView([39.9042, 116.4074], 9);
    const toIpCity = () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      fetch('https://ipapi.co/json/', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => {
          clearTimeout(timer);
          if (d && d.latitude && d.longitude) map.setView([d.latitude, d.longitude], 9);
          else toDefault();
        })
        .catch(() => { clearTimeout(timer); toDefault(); });
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => map.setView([p.coords.latitude, p.coords.longitude], cfg.locateZoom),
        toIpCity,
        { timeout: 5000, maximumAge: 300000 });
    } else toIpCity();
  },

  /* 星星标记：自定义 SVG 五角星 + pulsating 动画 + 时间衰减 */
  _addMarker(st) {
    if (!this._map) return;
    const { color, size, opacity } = this._decay(st.timestamp);
    const icon = L.divIcon({
      className: 'star-marker',
      html: `<span style="color:${color};opacity:${opacity};display:block;animation:starPulse 2s ease-in-out infinite">${this._starSvg(size)}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
    const marker = L.marker([st.lat, st.lng], { icon, keyboard: false }).addTo(this._map);
    this._markers.push(marker);
    /* 点击星星 → 暗色 Glassmorphism popup 展示留言 */
    const who = Utils.sanitize(st.nickname || '某位修行者');
    const msg = st.message ? Utils.sanitize(st.message) : '（没有留言，只留下了一束光）';
    marker.bindPopup(
      `<div class="star-pop"><b>✨ ${who}</b><span>${msg}</span>
       <time>${Utils.fmtTime(st.timestamp)}</time></div>`,
      { closeButton: false, className: 'star-popup' }
    );
    return marker;
  },

  /* ==================== 本地 Canvas 星图（CDN 失败兜底） ==================== */
  _initLocal() {
    this._local = true;
    const stage = document.getElementById('starmap-stage');
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const resize = () => { cv.width = stage.clientWidth; cv.height = stage.clientHeight; };
    resize(); addEventListener('resize', resize);
    this._cv = cv; this._ctx = ctx;

    /* 星空背景层 */
    this._bgStars = Array.from({ length: 160 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, p: Math.random() * 6.28
    }));

    /* 点击"点亮星星"：本地星图用伪经纬度（中国范围相对映射），同样模糊化 */
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect();
      const lng = Utils.fuzzCoord(73 + (e.clientX - r.left) / r.width * 62);   // 73°E~135°E
      const lat = Utils.fuzzCoord(53 - (e.clientY - r.top) / r.height * 35);   // 53°N~18°N
      this._askStar(lng, lat);
    });

    let t = 0;
    const draw = () => {
      this._raf = requestAnimationFrame(draw);
      t += 0.016;
      ctx.clearRect(0, 0, cv.width, cv.height);
      this._bgStars.forEach(s => {
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.5 + s.p));
        ctx.fillStyle = '#8fc8ff';
        ctx.beginPath(); ctx.arc(s.x * cv.width, s.y * cv.height, s.r, 0, 6.29); ctx.fill();
      });
      ctx.globalAlpha = 1;
      /* 足迹星星：颜色/大小按时间衰减（星空热度图） */
      this.stars.forEach(st => {
        const { color, size, opacity } = this._decay(st.timestamp);
        const x = ((st.lng - 73) / 62) * cv.width;
        const y = ((53 - st.lat) / 35) * cv.height;
        const pulse = 1 + 0.15 * Math.sin(t * 2 + st.lng);
        ctx.save();
        ctx.translate(x, y); ctx.scale(pulse, pulse);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.shadowColor = color; ctx.shadowBlur = 10;
        this._drawStar(ctx, size / 2);
        ctx.restore();
        st._sx = x; st._sy = y;
      });
    };
    draw();

    /* 悬停星星显示留言 */
    cv.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      const hit = this.stars.find(st => Math.hypot(st._sx - (e.clientX - r.left), st._sy - (e.clientY - r.top)) < 12);
      cv.style.cursor = hit ? 'pointer' : 'crosshair';
      if (hit && hit.message) cv.title = `${hit.nickname || '某位修行者'}：${hit.message}`;
    });
    this._renderStats();
  },

  _drawStar(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
  },

  /* ---- 时间衰减：<24h 亮青 / <7d 青 / <30d 紫 / >30d 暗紫，大小同步 ---- */
  _decay(ts) {
    const age = Date.now() - ts, d = 86400000;
    if (age < d) return { color: '#00D4FF', size: 24, opacity: 1 };
    if (age < 7 * d) return { color: '#00A8CC', size: 20, opacity: 0.8 };
    if (age < 30 * d) return { color: '#7B2D8E', size: 16, opacity: 0.6 };
    return { color: '#4A1A5C', size: 12, opacity: 0.4 };
  },

  _starSvg(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="filter:drop-shadow(0 0 6px currentColor)"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg>`;
  },

  /* ---- 点亮星星：昵称 + 留言浮层（与留言板共用面板体系） ---- */
  _askStar(lng, lat) {
    const mask = document.getElementById('star-mask');
    document.getElementById('star-nick').value = localStorage.getItem('user') || '';
    document.getElementById('star-msg').value = '';
    document.getElementById('star-coord').textContent = `${lng.toFixed(3)}°E, ${lat.toFixed(3)}°N`;
    document.getElementById('star-submit').onclick = () => {
      const nick = document.getElementById('star-nick').value.trim().slice(0, 20);
      const msg = document.getElementById('star-msg').value.trim().slice(0, 100);
      if (Utils.hasBannedWords(nick + msg)) { Utils.toast('内容包含敏感词'); return; }
      const st = {
        id: 'f' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
        lng, lat, nickname: nick, message: msg, timestamp: Date.now()
      };
      this.stars.push(st);
      Utils.set('footprints', this.stars);
      Cloud.push('footprints', st);         // 云端共享（失败静默降级本地）
      if (this._map) this._addMarker(st);   // Canvas 模式由绘制循环自动呈现
      Utils.closePanel(mask);
      Utils.toast('星星已点亮 ✨', '你在这片星空留下了足迹');
      Badges.grant('star');
      this._renderStats();
    };
    Utils.openPanel(mask);
  },

  /* 进入页面时尝试定位并自动落一个"当前位置"足迹（仅首次） */
  autoLocate() {
    if (Utils.get('footprintOptOut', false)) return;
    if (!navigator.geolocation || Utils.get('footprintLocated', false)) return;
    navigator.geolocation.getCurrentPosition(p => {
      const st = {
        id: 'f' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
        lng: Utils.fuzzCoord(p.coords.longitude),
        lat: Utils.fuzzCoord(p.coords.latitude),
        nickname: localStorage.getItem('user') || '',
        message: '', timestamp: Date.now(), auto: true
      };
      this.stars.push(st);
      Utils.set('footprints', this.stars);
      Utils.set('footprintLocated', true);
      Cloud.push('footprints', st);         // 云端共享（失败静默降级本地）
      if (this._map) this._addMarker(st);
      this._renderStats();
    }, () => {}, { timeout: 4000 });
  },

  _renderStats() {
    const el = document.getElementById('starmap-stats');
    if (el) el.innerHTML = `已有 <b>${this.stars.length}</b> 位访客在此留下足迹`;
  }
};

window.Starmap = Starmap;
