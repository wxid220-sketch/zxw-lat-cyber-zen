/* ============================================================================
 * guestbook.js — 星际终端留言板
 * 双模式：公开留言（明文本地存储） / 私密留言（AES-GCM-256 + PBKDF2，
 * 使用浏览器内置 WebCrypto，存储 ciphertext/iv/salt，不存明文）。
 * 防滥用：前端 PoW（Hashcash 简化版，难度 4，异步分片计算不卡 UI）。
 * 无 Supabase Key 时全部数据存 localStorage，功能完整可用。
 * ==========================================================================*/

const Guestbook = {
  msgs: [],
  filter: 'all',
  inited: false,

  init() {
    if (this.inited) return; this.inited = true;
    this.msgs = Utils.get('messages', []);
    this._bind();
    this.render();
    this._syncFromCloud();   // 拉取全球留言（失败静默降级本地模式）
  },

  /* ---- 云端合并：按 id 去重 + 时间倒序 + 重渲染 ---- */
  async _syncFromCloud() {
    const merged = await Cloud.syncDown('messages', this.msgs);
    if (merged === this.msgs) return;       // 云端不可达，保持本地
    this.msgs = merged;
    Utils.set('messages', merged);          // 合并结果回写本地，离线也能看到
    this.render();
  },

  _bind() {
    const input = document.getElementById('gb-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._submit(); }
    });
    document.getElementById('gb-send').addEventListener('click', () => this._submit());
    document.querySelectorAll('.msg-filter button').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.msg-filter button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        this.filter = b.dataset.filter;
        this.render();
        Utils.click();
      });
    });
  },

  /* ==================== 提交（含 PoW） ==================== */
  async _submit() {
    const input = document.getElementById('gb-input');
    const text = input.value.trim();
    if (!text) return;
    if (text.length > 200) { Utils.toast('留言最长 200 字'); return; }
    if (Utils.hasBannedWords(text)) { Utils.toast('内容包含敏感词', '请修改后再提交'); return; }

    const isPrivate = document.getElementById('gb-private').checked;
    const pwd = document.getElementById('gb-password').value;
    if (isPrivate && !pwd) { Utils.toast('私密留言需要设置密码'); return; }

    const btn = document.getElementById('gb-send');
    btn.disabled = true; btn.textContent = 'PoW 计算中…';

    try {
      /* 防滥用：Hashcash 简化版（难度 4 ≈ 浏览器 2-3 秒） */
      const { nonce, hash } = await this._pow(text, 4);
      const msg = {
        id: 'm' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
        visitorId: Utils.visitorId(),
        nickname: (localStorage.getItem('user') || '').slice(0, 20),
        timestamp: Date.now(),
        powNonce: nonce, powHash: hash,
        likes: 0, isEncrypted: isPrivate
      };
      if (isPrivate) {
        const enc = await this._encrypt(text, pwd);
        Object.assign(msg, enc);
      } else {
        msg.plaintext = text;
      }
      this.msgs.unshift(msg);
      Utils.set('messages', this.msgs);
      Cloud.push('messages', msg);          // 云端共享（失败静默降级本地）
      input.value = '';
      this.render();
      Utils.toast(isPrivate ? '加密留言已发送 🔒' : '留言已发送 ✨');
      if (isPrivate) Badges.grant('secret');
      Earth.flash(); // 地球表面闪烁反馈（模块联动）
    } catch (e) {
      Utils.toast('发送失败', '请重试');
    }
    btn.disabled = false; btn.textContent = '发送 ↵';
  },

  /* ---- PoW：SHA-256(message+nonce) 前 4 位为 0，分片计算避免阻塞 ---- */
  async _pow(message, difficulty = 4) {
    const target = '0'.repeat(difficulty);
    let nonce = 0;
    while (true) {
      for (let i = 0; i < 5000; i++) {
        const hash = await Utils.sha256(message + nonce);
        if (hash.startsWith(target)) return { nonce, hash };
        nonce++;
      }
      await new Promise(r => setTimeout(r, 0)); // 让出主线程
    }
  },

  /* ==================== AES-GCM-256 + PBKDF2（WebCrypto） ==================== */
  async _deriveKey(password, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },

  async _encrypt(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this._deriveKey(password, salt);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
    const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { ciphertext: b64(ct), iv: b64(iv), salt: b64(salt) };
  },

  async _decrypt(msg, password) {
    const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const key = await this._deriveKey(password, unb64(msg.salt));
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(msg.iv) }, key, unb64(msg.ciphertext));
    return new TextDecoder().decode(pt);
  },

  /* ---- 解密入口：选中加密留言 → 输入密码 → 验证 authTag ---- */
  async _unlock(msg, el) {
    const pwd = prompt('输入密码解密这条留言 🔒');
    if (!pwd) return;
    try {
      const text = await this._decrypt(msg, pwd);
      el.querySelector('.msg-text').textContent = text;
      el.querySelector('.msg-foot .lock-state').textContent = '[已解密 · 仅本次可见]';
    } catch (e) {
      Utils.toast('密码错误', 'authTag 校验失败');
    }
  },

  /* ==================== 渲染 ==================== */
  render() {
    const body = document.getElementById('gb-body');
    body.innerHTML = '';
    const myId = Utils.visitorId();
    let list = this.msgs;
    if (this.filter === 'public') list = list.filter(m => !m.isEncrypted);
    else if (this.filter === 'private') list = list.filter(m => m.isEncrypted);
    else if (this.filter === 'mine') list = list.filter(m => m.visitorId === myId);

    if (!list.length) {
      body.innerHTML = '<div style="color:rgba(255,255,255,0.35);font-size:12px;padding:20px 0">// 暂无留言，来做第一位星际旅人吧</div>';
      return;
    }

    list.forEach((m, idx) => {
      const block = document.createElement('div');
      block.className = 'msg-block' + (m.isEncrypted ? ' private' : '');
      const isAdmin = App.isAdmin();
      block.innerHTML = `
        <div class="msg-meta">[${Utils.fmtTime(m.timestamp)}] <span class="vid">${Utils.sanitize(m.nickname || m.visitorId)}</span></div>
        <div class="msg-text"></div>
        <div class="msg-foot">
          <span class="lock-state">${m.isEncrypted ? '[私密] 🔒 点击解密' : '[公开]'}</span>
          <button class="like">💖 <span>${m.likes}</span></button>
          ${isAdmin ? '<button class="del">删除</button>' : ''}
        </div>`;
      const textEl = block.querySelector('.msg-text');
      if (m.isEncrypted) {
        textEl.textContent = '▓▓▓▓▓▓▓▓▓▓（加密内容，需密码解密）';
        block.addEventListener('click', () => this._unlock(m, block));
      } else {
        /* 打字机效果逐字渲染（30ms/字），XSS 已过滤（textContent） */
        const full = m.plaintext;
        let i = 0;
        const timer = setInterval(() => {
          textEl.textContent = full.slice(0, ++i);
          if (i >= full.length) clearInterval(timer);
        }, 30);
        setTimeout(() => clearInterval(timer), full.length * 30 + 200);
      }
      /* 点赞：本地计数 + 动画 */
      block.querySelector('.like').addEventListener('click', e => {
        e.stopPropagation();
        m.likes++;
        Utils.set('messages', this.msgs);
        e.currentTarget.querySelector('span').textContent = m.likes;
        e.currentTarget.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300 });
      });
      /* 管理员删除 */
      const del = block.querySelector('.del');
      if (del) del.addEventListener('click', e => {
        e.stopPropagation();
        this.msgs = this.msgs.filter(x => x.id !== m.id);
        Utils.set('messages', this.msgs);
        this.render();
        Utils.toast('留言已删除');
      });
      body.appendChild(block);
    });
  }
};

window.Guestbook = Guestbook;
