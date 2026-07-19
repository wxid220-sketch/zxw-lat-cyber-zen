/* ============================================================================
 * audio.js — 多媒体系统：背景音乐 / 音效 / 音乐控制台 / 音频可视化
 * 渐入 0→70%、上下文感知切歌（首页主曲目 / 图片墙备选曲目）、Cross-fade、
 * 唱片机旋转、2px 音量滑轨、键盘快捷键、切歌内存释放。
 * ==========================================================================*/

const ZXAudio = {
  bgm: null,            // 当前背景音乐 <audio>
  current: null,        // 当前曲目信息
  playing: false,
  muted: false,
  volume: 0.7,
  ctx: null, analyser: null, source: null,
  _sfxCache: {},
  _crossfading: false,

  init() {
    this.volume = Utils.get('volume', CONFIG.audio.defaultVolume);
    this.muted = Utils.get('muted', false);
    this._buildPanel();
    this._bindShortcuts();
    /* 用户首次交互后再创建音频（浏览器自动播放策略） */
    const kick = () => {
      this._ensureBgm(CONFIG.audio.main);
      document.removeEventListener('pointerdown', kick);
      document.removeEventListener('keydown', kick);
    };
    document.addEventListener('pointerdown', kick);
    document.addEventListener('keydown', kick);
  },

  /* ---- 创建/替换 BGM。切换时释放旧音频（内存管理） ---- */
  _ensureBgm(track, autoplay = true) {
    if (this.current && this.current.src === track.src) { if (autoplay && !this.playing) this.play(); return; }
    if (this.bgm) { this.bgm.pause(); this.bgm.src = ''; this.bgm = null; }
    const a = new Audio();
    a.src = track.src;
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    a.onerror = () => { this._setState('暂无曲目'); };
    this.bgm = a; this.current = track;
    this._renderTrackName();
    if (autoplay) this.play();
  },

  /* ---- 播放：2.5 秒内从 0 渐入到目标音量 ---- */
  play() {
    if (!this.bgm) return;
    this.bgm.play().then(() => {
      this.playing = true;
      this._fadeTo(this.muted ? 0 : this.volume, CONFIG.audio.fadeInSeconds);
      this._initViz();
      this._syncUI();
    }).catch(() => { this._setState('点击页面任意处开启音乐'); });
  },

  pause() {
    if (!this.bgm) return;
    this._fadeTo(0, 0.4, () => { this.bgm.pause(); });
    this.playing = false; this._syncUI();
  },

  toggle() { this.playing ? this.pause() : this.play(); },

  toggleMute() {
    this.muted = !this.muted;
    Utils.set('muted', this.muted);
    if (this.bgm) this.bgm.volume = this.muted ? 0 : this.volume;
    this._syncUI();
  },

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    Utils.set('volume', this.volume);
    if (this.bgm && !this.muted) this.bgm.volume = this.volume;
    this._renderVolume();
  },

  /* ---- 音量渐变（渐入 / 切换淡出用） ---- */
  _fadeTo(target, seconds, done) {
    if (!this.bgm) { if (done) done(); return; }
    const start = this.bgm.volume, steps = Math.max(1, Math.round(seconds * 30));
    let i = 0;
    clearInterval(this._fadeTimer);
    this._fadeTimer = setInterval(() => {
      i++;
      if (this.bgm) this.bgm.volume = start + (target - start) * (i / steps);
      if (i >= steps) { clearInterval(this._fadeTimer); if (done) done(); }
    }, 1000 / 30);
  },

  /* ---- Cross-fade 切歌 ---- */
  crossFade(track) {
    if (this._crossfading || !track) return;
    this._crossfading = true;
    const wasPlaying = this.playing;
    this._fadeTo(0, 0.8, () => {
      this._ensureBgm(track, false);
      if (wasPlaying) { this.bgm.volume = 0; this.play(); } else this._syncUI();
      this._crossfading = false;
    });
  },

  /* ---- 上下文感知：切页面自动切歌 ---- */
  onPageChange(page) {
    if (!this.bgm) return;
    if (page === 'gallery' && this.current !== CONFIG.audio.alt) this.crossFade(CONFIG.audio.alt);
    else if (page === 'home' && this.current === CONFIG.audio.alt) this.crossFade(CONFIG.audio.main);
  },

  /* ---- 音效（按需加载，不与 BGM 冲突） ---- */
  sfx(name, vol = 0.5) {
    const src = CONFIG.sfx[name];
    if (!src) return;
    let a = this._sfxCache[name];
    if (!a) { a = new Audio(src); a.preload = 'auto'; this._sfxCache[name] = a; }
    try { a.currentTime = 0; a.volume = vol; a.play().catch(() => {}); } catch (e) {}
  },

  /* ---- 页面可见性：离开自动降低音量，回来恢复 ---- */
  onVisibility(hidden) {
    if (!this.bgm || !this.playing) return;
    this.bgm.volume = hidden ? (this.muted ? 0 : this.volume * 0.2) : (this.muted ? 0 : this.volume);
  },

  /* ============================ 音乐控制台 UI ============================ */
  _buildPanel() {
    const panel = document.getElementById('music-panel');
    const btn = document.getElementById('music-btn');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      panel.classList.toggle('open');
      Utils.click();
    });
    document.addEventListener('click', e => {
      if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
    });

    document.getElementById('mp-play').addEventListener('click', () => { this.toggle(); Utils.click(); });
    document.getElementById('mp-prev').addEventListener('click', () => this._step(-1));
    document.getElementById('mp-next').addEventListener('click', () => this._step(1));
    document.getElementById('mp-mute').addEventListener('click', () => { this.toggleMute(); Utils.click(); });

    /* 2px 线条音量滑轨 */
    const track = document.getElementById('volume-track');
    const setFromEvent = e => {
      const r = track.getBoundingClientRect();
      this.setVolume((e.clientX - r.left) / r.width);
    };
    track.addEventListener('pointerdown', e => {
      setFromEvent(e);
      const move = ev => setFromEvent(ev);
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });

    /* 曲库列表 */
    const list = document.getElementById('mp-list');
    const all = this._allTracks();
    all.forEach(t => {
      const b = document.createElement('button');
      b.textContent = '♪ ' + t.name;
      b.dataset.src = t.src;
      b.addEventListener('click', () => { this.crossFade(t); Utils.click(); });
      list.appendChild(b);
    });
    this._renderVolume();
  },

  _allTracks() {
    const disabled = Utils.get('disabledTracks', []);
    return [CONFIG.audio.main, CONFIG.audio.alt, ...CONFIG.audio.extra.filter(t => !disabled.includes(t.src))];
  },

  _step(dir) {
    const all = this._allTracks();
    const idx = all.findIndex(t => this.current && t.src === this.current.src);
    this.crossFade(all[(idx + dir + all.length) % all.length]);
    Utils.click();
  },

  _renderTrackName() {
    const el = document.getElementById('mp-name');
    if (el) el.textContent = this.current ? this.current.name : '暂无曲目';
    document.querySelectorAll('#mp-list button').forEach(b =>
      b.classList.toggle('on', this.current && b.dataset.src === this.current.src));
    this._setState(this.playing ? 'PLAYING' : 'READY');
  },

  _renderVolume() {
    const fill = document.getElementById('volume-fill');
    const thumb = document.getElementById('volume-thumb');
    if (fill) fill.style.width = this.volume * 100 + '%';
    if (thumb) thumb.style.left = this.volume * 100 + '%';
  },

  _setState(s) { const el = document.getElementById('mp-state'); if (el) el.textContent = s; },

  _syncUI() {
    const panel = document.getElementById('music-panel');
    const btn = document.getElementById('music-btn');
    panel.classList.toggle('playing', this.playing);
    btn.classList.toggle('playing', this.playing);
    document.getElementById('mp-play').textContent = this.playing ? '⏸' : '▶';
    document.getElementById('mp-mute').textContent = this.muted ? '🔇' : '🔊';
    this._renderTrackName();
    document.getElementById('viz-ring').classList.toggle('on', this.playing);
  },

  /* ---- 键盘快捷键（Space 播放暂停 / M 静音 / ↑↓ 音量） ---- */
  _bindShortcuts() {
    addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.code === 'Space') { e.preventDefault(); this.toggle(); }
      else if (e.key === 'm' || e.key === 'M') this.toggleMute();
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.setVolume(this.volume + 0.05); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.setVolume(this.volume - 0.05); }
    });
  },

  /* ---- 音频可视化：装饰圆环 + 控制台波形（Web Audio API） ---- */
  _initViz() {
    if (this.ctx || !window.AudioContext) { this._startVizLoop(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.source = this.ctx.createMediaElementSource(this.bgm);
      this.source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch (e) { /* 部分浏览器限制，静默降级 */ }
    this._startVizLoop();
  },

  _startVizLoop() {
    if (this._vizRunning) return; this._vizRunning = true;
    const bars = [...document.querySelectorAll('.mp-viz span')];
    const ring = document.getElementById('viz-ring');
    const data = new Uint8Array(32);
    const loop = () => {
      requestAnimationFrame(loop);
      if (!this.playing) { bars.forEach(b => b.style.height = '15%'); if (ring) ring.style.transform = 'translateX(-50%) scale(1)'; return; }
      if (this.analyser) {
        this.analyser.getByteFrequencyData(data);
        bars.forEach((b, i) => { b.style.height = Math.max(12, (data[i * 2] / 255) * 100) + '%'; });
        /* 装饰圆环按低频能量缩放 —— 把不可见的音乐变成可见波形 */
        const bass = (data[0] + data[1] + data[2]) / 765;
        if (ring) ring.style.transform = `translateX(-50%) scale(${1 + bass * 0.5})`;
      } else {
        /* 无 AudioContext 时的装饰性伪波形 */
        bars.forEach(b => b.style.height = (15 + Math.random() * 60) + '%');
      }
    };
    loop();
  }
};

window.ZXAudio = ZXAudio;
