/* ============================================================================
 * cloud.js — 全球云端共享（jsonblob.com，完全免 Key / 免账号）
 * ----------------------------------------------------------------------------
 * 供 starmap.js（星空足迹）与 guestbook.js（星际留言）复用：
 *   syncDown(type, localList)  读取云端 bin → 校验/裁剪/按 id 去重合并 → 按时间排序
 *   push(type, item)           写本地后调用：GET 最新 bin → 追加 → 裁剪 → PUT（重试 1 次）
 * 容量保护：footprints 最新 500 条、messages 最新 200 条；
 * 字段上限：昵称 20 字符、留言 200 字符（足迹附言 100 字符）；
 * 防错：GET 6 秒超时；云端条目缺字段/格式异常 → 跳过该条不影响整体；
 * 云端不可达 → 静默降级为仅本地，状态点显示「本地模式」。
 * ⚠️ 公共 bin，任何访客可读写，请勿存敏感信息。
 * ==========================================================================*/

const Cloud = {
  base: 'https://jsonblob.com/api/jsonBlob/',
  CAPS: { footprints: 500, messages: 200 },   // 每类条目上限（保留最新）
  _bin: null,                                  // 最近一次读取的云端文档
  _online: null,                               // null=未知 true=已同步 false=本地模式

  enabled() {
    return !!(CONFIG.cloud && CONFIG.cloud.enabled && CONFIG.cloud.binId);
  },

  _url() { return this.base + CONFIG.cloud.binId; },

  /* ==================== 读取（6 秒超时） ==================== */
  async fetchBin() {
    if (!this.enabled()) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(this._url(), {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      this._bin = {
        footprints: Array.isArray(d.footprints) ? d.footprints : [],
        messages: Array.isArray(d.messages) ? d.messages : []
      };
      this._setStatus(true);
      return this._bin;
    } catch (e) {
      clearTimeout(timer);
      this._setStatus(false);
      return null;
    }
  },

  /* ==================== 条目校验与清洗（异常条目跳过） ==================== */
  _clampStr(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; },

  /* 足迹：必须有合法经纬度与时间戳；坐标二次模糊化兜底 */
  _cleanFootprint(s) {
    if (!s || typeof s !== 'object') return null;
    const lng = Number(s.lng), lat = Number(s.lat), ts = Number(s.timestamp);
    if (!isFinite(lng) || !isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
    if (!isFinite(ts) || ts <= 0) return null;
    return {
      id: typeof s.id === 'string' && s.id ? s.id.slice(0, 32) : this._fpKey(lng, lat, ts),
      lng: Utils.fuzzCoord(lng),
      lat: Utils.fuzzCoord(lat),
      nickname: this._clampStr(s.nickname, 20),
      message: this._clampStr(s.message, 100),
      timestamp: ts
    };
  },

  /* 留言：公开需 plaintext；加密需 ciphertext/iv/salt 三件套 */
  _cleanMessage(m) {
    if (!m || typeof m !== 'object') return null;
    const ts = Number(m.timestamp);
    if (typeof m.id !== 'string' || !m.id || !isFinite(ts) || ts <= 0) return null;
    const out = {
      id: m.id.slice(0, 32),
      visitorId: this._clampStr(m.visitorId, 32),
      nickname: this._clampStr(m.nickname, 20),
      timestamp: ts,
      likes: Math.max(0, Math.min(99999, parseInt(m.likes, 10) || 0)),
      isEncrypted: !!m.isEncrypted
    };
    if (out.isEncrypted) {
      if (typeof m.ciphertext !== 'string' || typeof m.iv !== 'string' || typeof m.salt !== 'string') return null;
      out.ciphertext = m.ciphertext.slice(0, 2000);
      out.iv = m.iv.slice(0, 32);
      out.salt = m.salt.slice(0, 32);
    } else {
      if (typeof m.plaintext !== 'string') return null;
      out.plaintext = m.plaintext.slice(0, 200);
    }
    return out;
  },

  _fpKey(lng, lat, ts) { return `f${ts.toString(36)}-${lng.toFixed(3)}|${lat.toFixed(3)}`; },
  _key(type, item) { return type === 'messages' ? item.id : (item.id || this._fpKey(item.lng, item.lat, item.timestamp)); },

  /* ==================== 下行：云端 + 本地合并（按 id 去重，按时间排序） ==================== */
  async syncDown(type, localList) {
    const bin = await this.fetchBin();
    if (!bin) return localList;               // 离线：直接用本地
    const clean = type === 'footprints' ? this._cleanFootprint.bind(this) : this._cleanMessage.bind(this);
    const map = new Map();
    /* 本地优先入表，云端同 id 覆盖（云端可能更新过点赞数等） */
    (localList || []).forEach(item => { const c = clean(item); if (c) map.set(this._key(type, c), c); });
    bin[type].forEach(item => { const c = clean(item); if (c) map.set(this._key(type, c), c); });
    const merged = [...map.values()].sort((a, b) =>
      type === 'messages' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return merged;
  },

  /* ==================== 上行：GET 最新 → 追加 → 裁剪 → PUT（重试 1 次） ==================== */
  async push(type, item) {
    if (!this.enabled()) return false;
    const clean = type === 'footprints' ? this._cleanFootprint(item) : this._cleanMessage(item);
    if (!clean) return false;

    for (let attempt = 0; attempt < 2; attempt++) {   // 首次 + 1 次重试
      try {
        const bin = (await this.fetchBin()) || { footprints: [], messages: [] };
        const list = bin[type].map(x => type === 'footprints' ? this._cleanFootprint(x) : this._cleanMessage(x)).filter(Boolean);
        /* 同 id 去重后追加，再按时间裁剪到容量上限 */
        const map = new Map(list.map(x => [this._key(type, x), x]));
        map.set(this._key(type, clean), clean);
        let merged = [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
        if (merged.length > this.CAPS[type]) merged = merged.slice(merged.length - this.CAPS[type]);

        const body = { footprints: bin.footprints, messages: bin.messages };
        body[type] = merged;
        const res = await fetch(this._url(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        this._bin = body;
        this._setStatus(true);
        return true;
      } catch (e) {
        if (attempt === 1) { this._setStatus(false); return false; }
        await new Promise(r => setTimeout(r, 800));   // 重试前稍作等待
      }
    }
    return false;
  },

  /* ==================== 状态点：云端已同步（青） / 本地模式（灰） ==================== */
  _setStatus(online) {
    this._online = online;
    document.querySelectorAll('.sync-dot').forEach(el => {
      el.classList.toggle('ok', online);
      el.classList.toggle('off', !online);
      el.innerHTML = online ? '● 云端已同步' : '● 本地模式';
      el.title = online ? '全球足迹 / 留言已通过云端共享' : '云端不可达，数据仅保存在本机';
    });
  }
};

window.Cloud = Cloud;
