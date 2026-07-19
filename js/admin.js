/* ============================================================================
 * admin.js — 管理后台
 * 三层防护：SHA-256 哈希验证 + 30 分钟会话过期 + 设备指纹。
 * 安全要求：非管理员时管理入口 DOM 完全不渲染（非 CSS 隐藏）。
 * 功能：相册图片管理 / 音乐曲目管理 / 留言管理 / 功德数据 / 碎碎念编辑。
 * 注：纯静态站点的"修改"仅写入本机 localStorage；如需线上生效需接后端。
 * ==========================================================================*/

const Admin = {
  rendered: false,

  /* ---- 权限校验（三层防护） ---- */
  async check() {
    const user = localStorage.getItem('user');
    if (!user) return false;
    /* 第一层：哈希验证 */
    const hash = await Utils.sha256(user);
    if (hash !== CONFIG.adminHash) return false;
    /* 第二层：30 分钟过期 */
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    if (Date.now() - loginTime > CONFIG.adminSessionMs) {
      localStorage.removeItem('user');
      return false;
    }
    /* 第三层：设备指纹 */
    if (localStorage.getItem('deviceFingerprint') !== Utils.deviceFingerprint()) {
      localStorage.removeItem('user');
      return false;
    }
    return true;
  },

  /* ---- 仅管理员：渲染隐藏入口（悬停角落显示齿轮） ---- */
  async render() {
    if (this.rendered) return;
    if (!(await this.check())) return;   // 非管理员：DOM 完全不生成
    this.rendered = true;

    const trigger = document.createElement('div');
    trigger.id = 'admin-trigger';
    const gear = document.createElement('button');
    gear.id = 'admin-gear';
    gear.textContent = '⚙️';
    gear.title = '管理后台';
    document.body.append(trigger, gear);
    trigger.addEventListener('mouseenter', () => gear.classList.add('show'));
    trigger.addEventListener('mouseleave', () => gear.classList.remove('show'));
    gear.addEventListener('mouseenter', () => gear.classList.add('show'));
    gear.addEventListener('click', () => { this.open(); Utils.click(); });
  },

  open() {
    const panel = document.getElementById('admin-panel');
    this._fill();
    panel.classList.add('open');
    document.getElementById('admin-close').onclick = () => panel.classList.remove('open');
  },

  _fill() {
    /* 功德数据查看 */
    const paid = Utils.get('totalPaid', 0);
    document.getElementById('admin-stats').innerHTML = `
      当前用户：<b>${Utils.sanitize(localStorage.getItem('user') || '-')}</b><br>
      功德值：<b>${Merit.get()}</b>（${Merit.rankOf(Merit.get()).current.name}）<br>
      访问次数：<b>${localStorage.getItem('visitCount') || 1}</b><br>
      累计支付：<b>¥${paid.toFixed(2)}</b><br>
      心愿队列：<b>${Utils.get('wishes', []).length}</b> 条<br>
      留言数：<b>${Utils.get('messages', []).length}</b> 条<br>
      足迹数：<b>${Utils.get('footprints', []).length}</b> 个<br>
      徽章：<b>${Badges.owned().length}/7</b>`;

    /* 相册图片管理：从图片墙素材中替换三张轮播图 */
    const albumBox = document.getElementById('admin-album');
    albumBox.innerHTML = '';
    CONFIG.album.forEach((a, i) => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `<span style="width:64px">相册 ${i + 1}</span>`;
      const sel = document.createElement('select');
      CONFIG.gallery.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.src; opt.textContent = g.src.split('/').pop();
        if (g.src === a.src) opt.selected = true;
        sel.appendChild(opt);
      });
      const btn = document.createElement('button');
      btn.className = 'admin-btn'; btn.textContent = '替换';
      btn.onclick = () => {
        CONFIG.album[i].src = sel.value;
        Utils.set('albumOverride', CONFIG.album);
        App.renderAlbum();
        Utils.toast(`相册 ${i + 1} 已替换`);
      };
      row.append(sel, btn);
      albumBox.appendChild(row);
    });

    /* 音乐曲目管理：启用/停用扩展曲目 */
    const musicBox = document.getElementById('admin-music');
    musicBox.innerHTML = '';
    const disabled = Utils.get('disabledTracks', []);
    CONFIG.audio.extra.forEach(t => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      const on = !disabled.includes(t.src);
      row.innerHTML = `<span style="flex:1">${t.name}</span>`;
      const btn = document.createElement('button');
      btn.className = 'admin-btn' + (on ? '' : ' danger');
      btn.textContent = on ? '已启用' : '已停用';
      btn.onclick = () => {
        let d = Utils.get('disabledTracks', []);
        d = on ? [...d, t.src] : d.filter(x => x !== t.src);
        Utils.set('disabledTracks', d);
        CONFIG.audio.extra.forEach(x => x._off = d.includes(x.src));
        Utils.toast(on ? '曲目已停用' : '曲目已启用');
        this._fill();
      };
      row.appendChild(btn);
      musicBox.appendChild(row);
    });

    /* 留言管理（查看/删除） */
    const msgBox = document.getElementById('admin-messages');
    msgBox.innerHTML = '';
    const msgs = Utils.get('messages', []);
    if (!msgs.length) msgBox.innerHTML = '<div class="admin-stat">暂无留言</div>';
    msgs.slice(0, 20).forEach(m => {
      const div = document.createElement('div');
      div.className = 'admin-msg';
      div.innerHTML = `<button class="del">删除</button>[${Utils.fmtTime(m.timestamp)}] ${Utils.sanitize(m.nickname || m.visitorId)}：${m.isEncrypted ? '🔒（加密）' : Utils.sanitize(m.plaintext || '')}`;
      div.querySelector('.del').onclick = () => {
        Utils.set('messages', Utils.get('messages', []).filter(x => x.id !== m.id));
        this._fill(); Guestbook.render();
        Utils.toast('留言已删除');
      };
      msgBox.appendChild(div);
    });

    /* 碎碎念编辑 */
    document.getElementById('admin-murmur-input').value = '';
    document.getElementById('admin-murmur-add').onclick = () => {
      const input = document.getElementById('admin-murmur-input');
      const text = input.value.trim();
      if (!text) return;
      if (Utils.hasBannedWords(text)) { Utils.toast('包含敏感词'); return; }
      const list = Utils.get('murmurs', []);
      list.unshift({ text: text.slice(0, 60), ts: Date.now() });
      Utils.set('murmurs', list.slice(0, 3)); // 最多 3 条历史
      App.renderMurmur();
      Utils.toast('碎碎念已更新');
    };
  }
};

window.Admin = Admin;
