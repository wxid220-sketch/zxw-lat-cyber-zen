/* ============================================================================
 * starmap.js — 星空足迹
 * 优先高德 AMap JSAPI（需在 config.js 填入 key / securityCode）；
 * 未配置或加载失败时自动降级为内置 Canvas 2D 星图：
 * 本地足迹打点、颜色/大小随时间衰减、点击"点亮星星"、坐标模糊化 100m、
 * 底部统计"已有 N 位访客在此留下足迹"。
 * ==========================================================================*/

const Starmap = {
  stars: [],
  inited: false,

  init() {
    if (this.inited) return; this.inited = true;
    this.stars = Utils.get('footprints', []);
    if (CONFIG.amap.key) this._initAmap();
    else this._initLocal();
  },

  /* ==================== 高德地图模式（需 API Key） ==================== */
  _initAmap() {
    window._AMapSecurityConfig = { securityJsCode: CONFIG.amap.securityCode };
    const s = document.createElement('script');
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(CONFIG.amap.key)}`;
    s.onload = () => this._renderAmap();
    s.onerror = () => { Utils.toast('地图加载失败', '已切换为本地星图模式'); this._initLocal(); };
    document.head.appendChild(s);
    setTimeout(() => { if (!window.AMap && !this._local) this._initLocal(); }, 8000);
  },

  _renderAmap() {
    if (!window.AMap) return this._initLocal();
    const stage = document.getElementById('starmap-stage');
    stage.innerHTML = '<div id="amap-container" style="width:100%;height:100%"></div>';
    const map = new AMap.Map('amap-container', {
      zoom: 4, center: [105, 35], mapStyle: 'amap://styles/darkblue'
    });
    this._amap = map;
    this._locate(map);
    this.stars.forEach(st => this._addAmapMarker(map, st));
    map.on('click', e => this._askStar(e.lnglat.lng, e.lnglat.lat));
    this._renderStats();
  },

  /* 定位流程：Geolocation → CitySearch IP → 默认北京天安门 */
  _locate(map) {
    const fallback = () => {
      AMap.plugin('AMap.CitySearch', () => {
        const cs = new AMap.CitySearch();
        cs.getLocalCity((status, res) => {
          if (status === 'complete' && res.bounds) map.setCenter(res.bounds.getCenter());
        });
      });
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => map.setCenter([p.coords.longitude, p.coords.latitude]),
        fallback, { timeout: 5000 });
    } else fallback();
  },

  _addAmapMarker(map, st) {
    const { color, size, opacity } = this._decay(st.timestamp);
    const marker = new AMap.Marker({
      position: [st.lng, st.lat],
      content: `<div style="color:${color};opacity:${opacity}">${this._starSvg(size)}</div>`,
      offset: new AMap.Pixel(-size / 2, -size / 2)
    });
    marker.on('click', () => {
      if (st.message) Utils.toast(st.nickname || '某位修行者', st.message);
    });
    map.add(marker);
  },

  /* ==================== 本地 Canvas 星图（无 Key 降级） ==================== */
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

    /* 点击"点亮星星"：弹出昵称 + 留言浮层 */
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect();
      /* 本地星图用伪经纬度（相对坐标映射），同样模糊化到 100m 级别 */
      const lng = Utils.fuzzCoord(73 + (e.clientX - r.left) / r.width * 62);   // 73°E~135°E
      const lat = Utils.fuzzCoord(53 - (e.clientY - r.top) / r.height * 35);   // 53°N~18°N
      this._askStar(lng, lat);
    });

    let t = 0;
    const draw = () => {
      this._raf = requestAnimationFrame(draw);
      t += 0.016;
      ctx.clearRect(0, 0, cv.width, cv.height);
      /* 背景星 */
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

  /* ---- 时间衰减：新亮青 → 旧暗紫，大 → 小 ---- */
  _decay(ts) {
    const age = Date.now() - ts, d = 86400000;
    if (age < d) return { color: '#00D4FF', size: 24, opacity: 1 };
    if (age < 7 * d) return { color: '#00A8CC', size: 20, opacity: 0.8 };
    if (age < 30 * d) return { color: '#7B2D8E', size: 16, opacity: 0.6 };
    return { color: '#4A1A5C', size: 12, opacity: 0.4 };
  },

  _starSvg(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg>`;
  },

  /* ---- 点亮星星：昵称 + 留言浮层 ---- */
  _askStar(lng, lat) {
    const mask = document.getElementById('star-mask');
    document.getElementById('star-nick').value = localStorage.getItem('user') || '';
    document.getElementById('star-msg').value = '';
    document.getElementById('star-coord').textContent = `${lng.toFixed(3)}°E, ${lat.toFixed(3)}°N`;
    document.getElementById('star-submit').onclick = () => {
      const nick = document.getElementById('star-nick').value.trim().slice(0, 20);
      const msg = document.getElementById('star-msg').value.trim().slice(0, 100);
      if (Utils.hasBannedWords(nick + msg)) { Utils.toast('内容包含敏感词'); return; }
      const st = { lng, lat, nickname: nick, message: msg, timestamp: Date.now() };
      this.stars.push(st);
      Utils.set('footprints', this.stars);
      if (this._amap) this._addAmapMarker(this._amap, st);
      Utils.closePanel(mask);
      Utils.toast('星星已点亮 ✨', '你在这片星空留下了足迹');
      Badges.grant('star');
      this._renderStats();
    };
    Utils.openPanel(mask);
  },

  /* 进入页面时尝试定位并自动落一个"当前位置"足迹（可关闭） */
  autoLocate() {
    if (Utils.get('footprintOptOut', false)) return;
    if (!navigator.geolocation || Utils.get('footprintLocated', false)) return;
    navigator.geolocation.getCurrentPosition(p => {
      const st = {
        lng: Utils.fuzzCoord(p.coords.longitude),
        lat: Utils.fuzzCoord(p.coords.latitude),
        nickname: localStorage.getItem('user') || '',
        message: '', timestamp: Date.now(), auto: true
      };
      this.stars.push(st);
      Utils.set('footprints', this.stars);
      Utils.set('footprintLocated', true);
      this._renderStats();
    }, () => {}, { timeout: 4000 });
  },

  _renderStats() {
    const el = document.getElementById('starmap-stats');
    if (el) el.innerHTML = `已有 <b>${this.stars.length}</b> 位访客在此留下足迹`;
  }
};

window.Starmap = Starmap;
