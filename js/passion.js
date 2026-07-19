/* ============================================================================
 * passion.js — 热爱板块：3D 旋转视频墙 + 弹幕 + 点赞/送花/送礼
 * 桌面端：Y 轴 60 秒/圈缓慢旋转圆环，点击旋转到焦点后 1 秒全屏展开；
 * 移动端：横向滚动卡片列表（点击直接全屏）。
 * 互动数据（点赞/送花）持久化 localStorage。
 * ==========================================================================*/

const Passion = {
  inited: false,
  angle: 0,
  isHovering: false,
  focusedIndex: -1,
  radius: 400,

  init() {
    if (this.inited) return; this.inited = true;
    this.videos = CONFIG.passionVideos.map(v => {
      const saved = Utils.get('videoLikes', {});
      const flowers = Utils.get('videoFlowers', {});
      return { ...v, likes: saved[v.id] || 0, flowers: flowers[v.id] || 0 };
    });
    this._buildRing();
    this._buildMobileList();
    this.danmaku = new DanmakuSystem(document.getElementById('passion-danmaku'));
    /* 欢迎弹幕 */
    ['欢迎来到热爱星球 🔥', '双击视频有惊喜', '心诚则灵 🙏'].forEach((t, i) =>
      setTimeout(() => this.danmaku.addDanmaku(t, { color: '#00D4FF' }), 800 * (i + 1)));
  },

  /* ==================== 3D 旋转圆环（桌面） ==================== */
  _buildRing() {
    const wrap = document.getElementById('passion-ring-wrap');
    this.ring = document.createElement('div');
    this.ring.className = 'passion-ring';
    this.cards = this.videos.map((v, i) => this._createCard(v, i));
    this.cards.forEach(c => this.ring.appendChild(c));
    const focus = document.createElement('div');
    focus.className = 'passion-focus';
    wrap.append(focus, this.ring);
    /* 60 秒/圈 → 每帧 0.1deg @60fps */
    const animate = () => {
      if (!this.isHovering && this.focusedIndex === -1) {
        this.angle += 0.1;
        this.ring.style.transition = 'none';
        this.ring.style.transform = `rotateY(${this.angle}deg)`;
      }
      requestAnimationFrame(animate);
    };
    animate();
  },

  _createCard(video, index) {
    const card = document.createElement('div');
    card.className = 'passion-card';
    const theta = (index / this.videos.length) * Math.PI * 2;
    const x = Math.cos(theta) * this.radius;
    const z = Math.sin(theta) * this.radius;
    const rotateY = -theta * 180 / Math.PI;
    const base = `translate3d(${x}px,0,${z}px) rotateY(${rotateY}deg)`;
    card.style.transform = base;
    card.innerHTML = `
      <img src="${video.thumb}" alt="${video.title}" loading="lazy">
      <div class="overlay"><b>${video.title}</b><i>${video.duration}</i></div>
      <div class="play-btn">▶</div>`;
    card.addEventListener('click', () => { Utils.click(); this._focusVideo(index); });
    card.addEventListener('mouseenter', () => {
      this.isHovering = true;
      card.style.transform = base + ' scale(1.15)';
      card.style.borderColor = 'rgba(0,212,255,0.5)';
      card.style.boxShadow = '0 0 30px rgba(0,212,255,0.3)';
      card.querySelector('.overlay').style.opacity = '1';
      card.querySelector('.play-btn').style.transform = 'translate(-50%,-50%) scale(1)';
    });
    card.addEventListener('mouseleave', () => {
      this.isHovering = false;
      card.style.transform = base;
      card.style.borderColor = 'rgba(255,255,255,0.1)';
      card.style.boxShadow = 'none';
      card.querySelector('.overlay').style.opacity = '0';
      card.querySelector('.play-btn').style.transform = 'translate(-50%,-50%) scale(0)';
    });
    return card;
  },

  _focusVideo(index) {
    this.focusedIndex = index;
    const targetAngle = -(index / this.videos.length) * 360;
    this.ring.style.transition = 'transform 1s cubic-bezier(0.4,0,0.2,1)';
    this.ring.style.transform = `rotateY(${targetAngle}deg)`;
    setTimeout(() => this.openFullscreen(this.videos[index]), 1000);
  },

  /* ---- 移动端横向滚动列表 ---- */
  _buildMobileList() {
    const list = document.getElementById('passion-list');
    this.videos.forEach((v, i) => {
      const card = document.createElement('div');
      card.className = 'passion-card';
      card.innerHTML = `
        <img src="${v.thumb}" alt="${v.title}" loading="lazy">
        <div class="overlay" style="opacity:1"><b>${v.title}</b><i>${v.duration}</i></div>
        <div class="play-btn" style="transform:translate(-50%,-50%) scale(1)">▶</div>`;
      card.addEventListener('click', () => { Utils.click(); this.openFullscreen(v); });
      list.appendChild(card);
    });
  },

  /* ==================== 全屏播放弹窗（面板 12） ==================== */
  openFullscreen(video) {
    const modal = document.createElement('div');
    modal.className = 'modal-mask';
    const hasDesc = video.description && video.description.trim().length > 0;
    modal.innerHTML = `
      <div class="mask-bg"></div>
      <div class="modal-content">
        <div style="position:relative">
          <video src="${video.src}" controls autoplay playsinline></video>
          <div class="danmaku-layer"></div>
        </div>
        <div class="modal-body">
          <h3>${Utils.sanitize(video.title)}</h3>
          ${hasDesc ? `<p>${Utils.sanitize(video.description)}</p>` : ''}
        </div>
        <div class="modal-actions">
          <button class="act-btn btn-like">❤️ <span>${video.likes}</span></button>
          <button class="act-btn btn-flower">🌸 送花 <span>${video.flowers}</span></button>
          <button class="act-btn gift btn-gift">🎁 送礼</button>
          <button class="act-btn btn-danmaku">💬 发弹幕</button>
          <button class="act-close">✕</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('open'));

    const dm = new DanmakuSystem(modal.querySelector('.danmaku-layer'));
    /* 播放时的氛围弹幕 */
    setTimeout(() => dm.addDanmaku('🔥🔥🔥', { color: '#FFD700' }), 1500);
    setTimeout(() => dm.addDanmaku('这波操作 666', {}), 3000);

    const close = () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => modal.remove(), 300);
      this.focusedIndex = -1;
    };
    modal.querySelector('.act-close').addEventListener('click', close);
    modal.querySelector('.mask-bg').addEventListener('click', close);
    modal._esc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', modal._esc); } };
    document.addEventListener('keydown', modal._esc);

    /* 点赞：本地计数 + 动画 + 持久化 */
    modal.querySelector('.btn-like').addEventListener('click', e => {
      video.likes++;
      const btn = e.currentTarget;
      btn.querySelector('span').textContent = video.likes;
      btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300 });
      const likes = Utils.get('videoLikes', {}); likes[video.id] = video.likes;
      Utils.set('videoLikes', likes);
      dm.addDanmaku('❤️ +1', { color: '#FF6B9D' });
    });

    /* 送花：花朵飞向视频中心 */
    modal.querySelector('.btn-flower').addEventListener('click', e => {
      const button = e.currentTarget;
      video.flowers++;
      button.querySelector('span').textContent = video.flowers;
      const flowers = Utils.get('videoFlowers', {}); flowers[video.id] = video.flowers;
      Utils.set('videoFlowers', flowers);
      const flower = document.createElement('div');
      flower.textContent = '🌸';
      const rect = button.getBoundingClientRect();
      flower.style.cssText = `position:fixed;font-size:24px;pointer-events:none;z-index:9999;left:${rect.left + 20}px;top:${rect.top}px;`;
      document.body.appendChild(flower);
      const vRect = modal.querySelector('video').getBoundingClientRect();
      flower.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${vRect.left + vRect.width / 2 - rect.left - 20}px, ${vRect.top + vRect.height / 2 - rect.top}px) rotate(360deg) scale(0.3)`, opacity: 0 }
      ], { duration: 1000, easing: 'cubic-bezier(0.4,0,0.2,1)' }).onfinish = () => flower.remove();
      dm.addDanmaku('🌸 送出一朵花', { color: '#FF6B9D' });
    });

    /* 送礼：复用功德送礼面板（通过 _giftHandler 临时改写为热爱专属特效） */
    modal.querySelector('.btn-gift').addEventListener('click', () => {
      const mask = document.getElementById('gift-mask');
      Effects._giftHandler = g => {
        Effects.openPayConfirm(g, () => {
          const colors = { '6.66': '#00D4FF', '9.99': '#7B2D8E', '66.66': '#FFD700', '188.88': 'rainbow' };
          const color = colors[g.amount];
          dm.addDanmaku(`🎁 送出「${g.name}」`, { color: color === 'rainbow' ? '#FF6B9D' : color, top: true });
          Effects.giftSuccess(g);
        });
      };
      Utils.openPanel(mask);
    });

    /* 手动发弹幕 */
    modal.querySelector('.btn-danmaku').addEventListener('click', () => {
      const text = prompt('发一条弹幕（20 字以内）');
      if (!text) return;
      if (Utils.hasBannedWords(text)) { Utils.toast('弹幕包含敏感词'); return; }
      dm.addDanmaku(Utils.sanitize(text.slice(0, 20)), { color: '#00D4FF' });
      const danmakuList = Utils.get('danmakus', []);
      danmakuList.push({ video: video.id, text: text.slice(0, 20), ts: Date.now() });
      Utils.set('danmakus', danmakuList.slice(-100));
    });
  }
};

/* ==================== 弹幕系统（第二部分 5.4） ==================== */
class DanmakuSystem {
  constructor(container) {
    this.container = container;
    this.trackCount = 5;
    this.trackStatus = new Array(5).fill(0);
  }
  addDanmaku(text, { color = '#E0E6ED', size = 14, speed = 5, top = false } = {}) {
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = 'danmaku-item';
    el.textContent = text;
    el.style.color = color; el.style.fontSize = size + 'px';
    const track = top ? 0 : this.findAvailableTrack();
    el.style.top = (track * 30 + 10) + 'px';
    this.container.appendChild(el);
    const width = el.offsetWidth;
    el.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(-${this.container.offsetWidth + width + 40}px)` }
    ], { duration: speed * 1000, easing: 'linear' }).onfinish = () => el.remove();
  }
  findAvailableTrack() {
    for (let i = 1; i < this.trackCount; i++) if (this.trackStatus[i] === 0) return i;
    return Math.floor(Math.random() * (this.trackCount - 1)) + 1;
  }
}

window.Passion = Passion;
