/* ============================================================================
 * utils.js — 通用工具：安全（XSS/敏感词/XOR 存储/哈希）、Toast、打字机等
 * ==========================================================================*/

const Utils = {
  /* ---- XSS 过滤：所有用户输入渲染前必须过此函数 ---- */
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  },

  /* ---- 敏感词检查 ---- */
  hasBannedWords(text) {
    return CONFIG.bannedWords.some(w => String(text).includes(w));
  },

  /* ---- SHA-256（异步，返回 hex） ---- */
  async sha256(text) {
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    /* 降级：非安全上下文（如 file://）时使用简易哈希（仅用于本地判断） */
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).padEnd(64, '0');
  },

  /* ---- localStorage XOR 简易加密（敏感数据落盘前调用） ---- */
  _xorKey: 'zxw-lat-zen',
  _xor(str) {
    const k = this._xorKey; let out = '';
    for (let i = 0; i < str.length; i++) out += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    return btoa(unescape(encodeURIComponent(out)));
  },
  _unxor(enc) {
    try {
      const str = decodeURIComponent(escape(atob(enc)));
      const k = this._xorKey; let out = '';
      for (let i = 0; i < str.length; i++) out += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
      return out;
    } catch (e) { return null; }
  },
  /* 加密写入 / 读取 JSON */
  setSecure(key, obj) { try { localStorage.setItem(key, this._xor(JSON.stringify(obj))); } catch (e) {} },
  getSecure(key, fallback = null) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const dec = this._unxor(raw);
    if (dec == null) return fallback;
    try { return JSON.parse(dec); } catch (e) { return fallback; }
  },

  /* ---- 普通存取（带 JSON） ---- */
  set(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} },
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },

  /* ---- 设备指纹（Canvas 指纹后 16 位，仅本地验证用，不上传） ---- */
  deviceFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top'; ctx.font = '14px Arial';
      ctx.fillText('ZXW.LAT', 2, 2);
      return canvas.toDataURL().slice(-16);
    } catch (e) { return 'no-fp'; }
  },

  /* ---- 坐标模糊化到 100m 范围（约 0.001°） ---- */
  fuzzCoord(v) { return Math.round(v * 1000) / 1000; },

  /* ---- Toast 提示 ---- */
  toast(title, subtitle = '') {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div style="font-size:32px;margin-bottom:8px">✨</div>
      <div style="font-size:16px;font-weight:500">${this.sanitize(title)}</div>
      ${subtitle ? `<div style="font-size:14px;opacity:0.7;margin-top:4px">${this.sanitize(subtitle)}</div>` : ''}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
  },

  /* ---- 打字机（需求文档附录 A 同款接口） ---- */
  typewriter(element, text, speed = 50, done) {
    element.textContent = ''; element.classList.remove('typing-done');
    let i = 0;
    (function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i++);
        setTimeout(tick, speed);
      } else {
        element.classList.add('typing-done');
        if (done) done();
      }
    })();
  },

  /* ---- 面板通用：ESC / 点击背景关闭 + 禁止背景滚动 ---- */
  _openPanels: [],
  openPanel(mask) {
    mask.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (!this._openPanels.includes(mask)) this._openPanels.push(mask);
  },
  closePanel(mask) {
    mask.classList.remove('open');
    this._openPanels = this._openPanels.filter(m => m !== mask);
    if (!this._openPanels.length) document.body.style.overflow = '';
  },
  closeTopPanel() {
    const top = this._openPanels[this._openPanels.length - 1];
    if (top) { this.closePanel(top); return true; }
    return false;
  },
  bindPanelClose(mask) {
    mask.addEventListener('click', e => { if (e.target === mask) this.closePanel(mask); });
    const x = mask.querySelector('.panel-close, .act-close');
    if (x) x.addEventListener('click', () => this.closePanel(mask));
  },

  /* ---- 咔哒音效快捷方法（委托 Audio） ---- */
  click() { if (window.ZXAudio) ZXAudio.sfx('click'); },

  /* ---- 低端设备检测 ---- */
  isLowEnd() {
    const mem = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 8;
    return mem <= 4 || cores <= 4 || /Android [5-8]/.test(navigator.userAgent);
  },

  /* ---- 时间格式化 ---- */
  fmtTime(ts) {
    const d = new Date(ts), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  },

  /* ---- 随机访客 ID ---- */
  visitorId() {
    let id = localStorage.getItem('visitorId');
    if (!id) {
      id = 'visitor_' + Math.random().toString(16).slice(2, 6);
      localStorage.setItem('visitorId', id);
    }
    return id;
  }
};

window.Utils = Utils;
