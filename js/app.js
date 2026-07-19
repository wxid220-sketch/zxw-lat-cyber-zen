/* ============================================================================
 * app.js — 主逻辑：启动流程 / SPA 路由 / 木鱼 / 香炉 / 心愿 / 相册 / 彩蛋
 * ==========================================================================*/

const App = {
  page: 'home',
  _isAdmin: false,
  _albumIdx: 0,
  _albumTimer: null,

  /* ==================== 启动流程 ==================== */
  async boot() {
    Particles.init();
    Earth.init();
    Effects.init();
    About.init();
    ZXAudio.init();
    this._applyAlbumOverride();
    this._bindGlobal();
    this._runPreloader();
  },

  isAdmin() { return this._isAdmin; },

  /* ==================== 1. 加载页 ==================== */
  _runPreloader() {
    const pre = document.getElementById('preloader');
    const bar = pre.querySelector('.preloader-progress');
    const quoteEl = pre.querySelector('.preloader-quote');
    pre.querySelector('.preloader-bg').style.backgroundImage = `url('${CONFIG.login.bg}')`;

    /* 禅意语录随机轮换（打字机效果） */
    const quotes = [...CONFIG.quotes].sort(() => Math.random() - 0.5);
    let qi = 0;
    const nextQuote = () => Utils.typewriter(quoteEl, quotes[qi++ % quotes.length], 50);
    nextQuote();
    const quoteTimer = setInterval(nextQuote, 2600);

    /* 进度条：模拟资源加载节奏，50% 时转场素材淡入 */
    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(100, p + (p < 60 ? 7 : p < 90 ? 3 : 1.5));
      bar.style.width = p + '%';
      if (p >= 50 && p < 52) this._flashTransition();
      if (p >= 100) {
        clearInterval(timer); clearInterval(quoteTimer);
        setTimeout(() => {
          pre.classList.add('done');
          setTimeout(() => pre.remove(), 900);
          this._enterLogin();
        }, 350);
      }
    }, 120);
  },

  /* 素材2：转场画面淡入 0.5s */
  _flashTransition(cb) {
    const ts = document.getElementById('transition-screen');
    ts.style.backgroundImage = `url('${CONFIG.login.transition}')`;
    ts.classList.add('active');
    setTimeout(() => { ts.classList.remove('active'); if (cb) cb(); }, 700);
  },

  /* ==================== 2. 登录层 ==================== */
  _enterLogin() {
    const overlay = document.getElementById('login-overlay');
    /* 已登录：跳过登录层，直接开场白（老访客） */
    if (localStorage.getItem('user')) {
      overlay.remove();
      this._afterLogin(false);
      return;
    }
    overlay.querySelector('.login-bg').style.backgroundImage = `url('${CONFIG.login.bg}')`;
    overlay.querySelector('.login-avatar').style.backgroundImage = `url('${CONFIG.login.avatar}')`;
    overlay.querySelector('.login-orbit').style.setProperty('--pimg', `url('${CONFIG.login.particle}')`);
    overlay.querySelector('.login-orbit').style.setProperty('background', 'none');
    overlay.querySelector('.login-orbit').insertAdjacentHTML('beforeend',
      `<style>.login-orbit::before{background-image:url('${CONFIG.login.particle}')}</style>`);

    /* 时间问候语 */
    const h = new Date().getHours();
    const greet = h <= 5 ? '深夜里的灵感，zxw.lat 陪您静候黎明。'
      : h <= 18 ? '万物生长，zxw.lat 记录您的当下。'
      : '星空璀璨，欢迎回到您的私人领域。';
    overlay.querySelector('.login-greeting').textContent = greet;

    /* 访客印记：第 N 次相遇 */
    const visits = parseInt(localStorage.getItem('visitCount') || '0', 10) + 1;
    localStorage.setItem('visitCount', visits);
    if (visits > 1) {
      const stamp = overlay.querySelector('.login-visit');
      stamp.textContent = `这是我们第 ${visits} 次相遇`;
    }

    /* 移动端：登录层显示时强制禁用页面滚动 */
    document.body.style.overflow = 'hidden';

    const input = document.getElementById('login-input');
    const err = overlay.querySelector('.login-error');
    const doLogin = async () => {
      const name = input.value.trim();
      /* 验证：非空 + 长度≤20 + 敏感词过滤 */
      if (!name) { err.textContent = '请输入你的修行代号'; return this._shake(overlay); }
      if (name.length > 20) { err.textContent = '代号最长 20 个字符'; return this._shake(overlay); }
      if (Utils.hasBannedWords(name)) { err.textContent = '代号包含敏感词'; return this._shake(overlay); }

      /* 记录登录信息（含设备指纹） */
      localStorage.setItem('user', name);
      localStorage.setItem('loginTime', Date.now());
      localStorage.setItem('deviceFingerprint', Utils.deviceFingerprint());
      ZXAudio.sfx('login');
      document.body.style.overflow = '';
      this._flashTransition(() => {
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 700);
        this._afterLogin(true);
      });
    };
    document.getElementById('login-btn').addEventListener('click', doLogin);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    input.focus();
  },

  _shake(el) {
    el.querySelector('.login-box').classList.add('login-shake');
    setTimeout(() => el.querySelector('.login-box') && el.querySelector('.login-box').classList.remove('login-shake'), 450);
  },

  /* ---- 登录后：开场白叙事（3 秒打字机）→ 主页 ---- */
  _afterLogin(isNew) {
    Badges.grant('first');
    this._isAdminCheck();
    const intro = document.getElementById('intro-narrative');
    const textEl = intro.querySelector('.intro-text');
    Utils.typewriter(textEl, '在这里，我收藏了一些关于时间的碎片。', 70);
    setTimeout(() => {
      intro.classList.add('hidden');
      setTimeout(() => intro.remove(), 900);
      this._enterHome();
    }, 3000);
  },

  async _isAdminCheck() {
    this._isAdmin = await Admin.check();
    if (this._isAdmin) Admin.render();
    this.refreshUserTier();
  },

  /* ==================== 3. 主页 ==================== */
  _enterHome() {
    document.getElementById('app').style.display = '';
    this.showPage('home', true);
    /* Hero：blur(10px) → blur(0) 过渡 */
    const hero = document.querySelector('.hero');
    const heroBg = hero.querySelector('.hero-bg');
    const img = new Image();
    img.onload = () => hero.classList.add('loaded');
    img.src = CONFIG.hero.webp;
    heroBg.style.backgroundImage = `url('${CONFIG.hero.webp}')`;

    this.renderRank();
    this.renderBadges();
    this.renderMurmur();
    this.renderAlbum();
    this._renderVisitStamp();
    this._renderUserChip();
    this._renderWishes();
    this._restoreScroll();
    setInterval(() => this._incenseTick(), 1000);
  },

  /* ---- 访客印记（右上角状态栏） ---- */
  _renderVisitStamp() {
    const n = localStorage.getItem('visitCount') || 1;
    const el = document.getElementById('visit-stamp');
    if (parseInt(n, 10) > 1) el.textContent = `这是我们第 ${n} 次相遇`;
  },

  _renderUserChip() {
    const name = localStorage.getItem('user') || '';
    const el = document.getElementById('user-name');
    el.textContent = name;
    el.title = name;
  },

  /* 用户层级视觉：访客白 / 注册青 / VIP 金 / 管理员紫 */
  refreshUserTier() {
    const el = document.getElementById('user-name');
    const paid = Utils.get('totalPaid', 0);
    if (this._isAdmin) el.style.color = '#c88ede';
    else if (paid > CONFIG.vipThreshold) el.style.color = '#FFD700';
    else el.style.color = '';
  },

  /* ==================== 电子木鱼 ==================== */
  _woodfishTap(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    Particles.woodfishSparks(x, y);
    ZXAudio.sfx('woodfish', 0.6);
    /* 敬香期间功德加成 ×2 */
    const gain = this._incenseActive() ? 2 : 1;
    /* 随机飘字：右侧增益（金/橙），左侧减益（红/粉） */
    const g = CONFIG.floatGain[Math.floor(Math.random() * CONFIG.floatGain.length)];
    const l = CONFIG.floatLoss[Math.floor(Math.random() * CONFIG.floatLoss.length)];
    Particles.floatText(x, y, gain > 1 ? g.replace('+1', '+2') : g, 'gain');
    if (Math.random() < 0.6) Particles.floatText(x, y, l, 'loss');
    /* 逆天改命 +99 彩蛋 */
    const bonus = g.includes('99') ? 99 : gain;
    Merit.add(bonus);
    document.getElementById('woodfish-count').innerHTML = `功德 <b>${Merit.get()}</b>`;
    /* 木鱼学徒徽章 */
    const taps = Utils.get('woodfishTaps', 0) + 1;
    Utils.set('woodfishTaps', taps);
    if (taps >= 100) Badges.grant('fish100');
  },

  renderRank() {
    const v = Merit.get();
    const { current, next } = Merit.rankOf(v);
    document.getElementById('rank-name').textContent = current.name;
    document.getElementById('rank-merit').textContent = `${v} 功德`;
    const pct = next ? ((v - current.need) / (next.need - current.need)) * 100 : 100;
    document.getElementById('rank-progress').style.width = Math.min(100, pct) + '%';
  },

  renderBadges() {
    const box = document.getElementById('badge-shelf');
    if (!box) return;
    box.innerHTML = Badges.owned().map(id => {
      const b = CONFIG.badges.find(x => x.id === id);
      return b ? `<span title="${b.name} · ${b.desc}" style="cursor:default">${b.icon}</span>` : '';
    }).join(' ');
  },

  /* ==================== 赛博香炉 ==================== */
  _incenseState() {
    return Utils.get('incense', { until: 0, tier: null, count: 0 });
  },
  _incenseActive() {
    return this._incenseState().until > Date.now();
  },

  /* 免费敬香：燃 30 秒，功德 ×2 */
  _lightFree() {
    if (this._incenseActive()) { Utils.toast('香正燃着', '心诚则灵，不必贪多 🙏'); return; }
    const until = Date.now() + CONFIG.incense.freeDuration * 1000;
    const st = this._incenseState();
    Utils.set('incense', { until, tier: 'free', count: (st.count || 0) + 1 });
    ZXAudio.sfx('incense');
    this._incenseVisual(true);
    if (st.count + 1 >= 10) Badges.grant('incense10');
  },

  /* 付费供奉：四档 → 心愿 → 支付 */
  _lightPaid(tier) {
    Effects.openWishForm(tier, (wish, name) => {
      Effects.openPayConfirm(
        { amount: tier.amount, label: tier.label, name: `赛博供奉 ${tier.durationText}` },
        () => {
          const until = Date.now() + tier.hours * 3600000;
          Utils.set('incense', { until, tier: tier.amount, count: (this._incenseState().count || 0) + 1 });
          this._pushWish(wish, name);
          this._incenseVisual(true);
          /* 档位特效（第二部分 6.1） */
          const petals = { '6.66': 0, '9.99': 20, '66.66': 40, '188.88': 80 }[tier.amount] || 0;
          if (petals) Particles.peachRain(petals);
          if (tier.amount === '66.66' || tier.amount === '188.88') Effects.buddhaGhost();
          Effects.thanksBanner(`供奉 ${tier.durationText}`, name);
          ZXAudio.sfx('incense');
        });
    });
  },

  _incenseVisual(burning) {
    const stick = document.getElementById('incense-stick');
    stick.classList.toggle('burning', burning);
    clearInterval(this._smokeTimer);
    if (burning) {
      this._smokeTimer = setInterval(() => {
        if (!this._incenseActive()) { this._incenseVisual(false); return; }
        /* CSS 粒子青烟 */
        const s = document.createElement('div');
        s.className = 'smoke';
        s.style.left = `calc(50% + ${(Math.random() - 0.5) * 10}px)`;
        document.querySelector('.incense-burner').appendChild(s);
        setTimeout(() => s.remove(), 3300);
      }, 450);
    }
  },

  /* 每秒刷新：香体缩短 + 倒计时 */
  _incenseTick() {
    const st = this._incenseState();
    const el = document.getElementById('incense-status');
    const stick = document.getElementById('incense-stick');
    if (st.until > Date.now()) {
      const left = st.until - Date.now();
      const total = st.tier === 'free' ? CONFIG.incense.freeDuration * 1000
        : (CONFIG.incense.tiers.find(t => t.amount === st.tier) || { hours: 1 }).hours * 3600000;
      stick.style.height = Math.max(8, 110 * (left / total)) + 'px';
      const h = Math.floor(left / 3600000), m = Math.floor(left % 3600000 / 60000), s = Math.floor(left % 60000 / 1000);
      el.innerHTML = `香火正旺 · 功德加成 <b>×2</b> · 剩余 ${h > 0 ? h + '时' : ''}${m}分${h > 0 ? '' : s + '秒'}`;
      this._incenseVisual(true);
    } else {
      stick.style.height = '110px';
      el.textContent = '点击敬香，青烟袅袅，功德 ×2';
    }
  },

  /* ---- 心愿泡泡：FIFO 循环队列，新心愿推入头部 ---- */
  _pushWish(wish, name) {
    const list = Utils.get('wishes', []);
    list.unshift({ wish, name, ts: Date.now() });
    Utils.set('wishes', list.slice(0, CONFIG.incense.wishQueueMax));
    this._renderWishes();
  },

  _renderWishes() {
    const layer = document.getElementById('wish-layer');
    layer.innerHTML = '';
    Utils.get('wishes', []).forEach((w, i) => {
      const b = document.createElement('div');
      b.className = 'wish-bubble';
      b.innerHTML = `🫧 ${Utils.sanitize(w.wish)} <span class="wisher">— ${Utils.sanitize(w.name)}</span>`;
      /* 随机分布在上半屏，错开漂浮节奏 */
      b.style.left = (6 + (i * 13) % 80) + 'vw';
      b.style.top = (5 + (i * 7) % 22) + 'vh';
      b.style.animationDuration = (5 + (i % 4)) + 's';
      b.style.animationDelay = (i * 0.6) + 's';
      layer.appendChild(b);
    });
  },

  /* ==================== 相册轮播 ==================== */
  _applyAlbumOverride() {
    const saved = Utils.get('albumOverride', null);
    if (saved && saved.length === 3) CONFIG.album = saved;
  },

  renderAlbum() {
    const box = document.getElementById('album-slides');
    const dots = document.getElementById('album-dots');
    box.innerHTML = ''; dots.innerHTML = '';
    CONFIG.album.forEach((a, i) => {
      const slide = document.createElement('div');
      slide.className = 'album-slide' + (i === this._albumIdx ? ' active' : '');
      slide.innerHTML = `<img src="${a.src}" alt="${a.caption}" loading="${i ? 'lazy' : 'eager'}">
        <div class="album-caption">${a.caption}</div>`;
      box.appendChild(slide);
      const dot = document.createElement('span');
      dot.className = i === this._albumIdx ? 'on' : '';
      dot.addEventListener('click', () => this._albumGo(i));
      dots.appendChild(dot);
    });
    clearInterval(this._albumTimer);
    this._albumTimer = setInterval(() => this._albumGo((this._albumIdx + 1) % CONFIG.album.length, true), CONFIG.albumInterval);
  },

  _albumGo(i, auto = false) {
    this._albumIdx = i;
    document.querySelectorAll('.album-slide').forEach((s, j) => s.classList.toggle('active', j === i));
    document.querySelectorAll('#album-dots span').forEach((d, j) => d.classList.toggle('on', j === i));
    if (!auto) { Utils.click(); this.renderAlbumRestart(); }
  },
  renderAlbumRestart() { /* 手动切换后重置 8 秒自动播放计时 */
    clearInterval(this._albumTimer);
    this._albumTimer = setInterval(() => this._albumGo((this._albumIdx + 1) % CONFIG.album.length, true), CONFIG.albumInterval);
  },

  /* ==================== 碎碎念 ==================== */
  renderMurmur() {
    const box = document.getElementById('murmur-list');
    const list = Utils.get('murmurs', [{ text: '今天也是功德圆满的一天 🙏', ts: Date.now() }]);
    box.innerHTML = list.slice(0, 3).map(m =>
      `<div class="murmur-item"><time>${Utils.fmtTime(m.ts).slice(5, 10)}</time>${Utils.sanitize(m.text)}</div>`).join('');
  },

  /* ==================== SPA 路由 ==================== */
  showPage(name, instant = false) {
    if (name === this.page && !instant) return;
    const from = document.querySelector(`.page[data-page="${this.page}"]`);
    const to = document.querySelector(`.page[data-page="${name}"]`);
    if (!to) return;
    /* 记录当前阅读位置 */
    sessionStorage.setItem('scroll_' + this.page, scrollY);
    const doSwitch = () => {
      if (from) from.classList.remove('active');
      to.classList.add('active');
      this.page = name;
      ZXAudio.onPageChange(name);   // 上下文感知切歌
      ZXAudio.sfx('transition', 0.25);
      /* 懒初始化各页面模块 */
      if (name === 'starmap') { Starmap.init(); Starmap.autoLocate(); }
      if (name === 'guestbook') Guestbook.init();
      if (name === 'passion') Passion.init();
      /* 恢复目标页面阅读位置 */
      const y = parseInt(sessionStorage.getItem('scroll_' + name) || '0', 10);
      scrollTo({ top: y, behavior: instant ? 'auto' : 'smooth' });
    };
    if (instant) { doSwitch(); return; }
    if (from) {
      from.classList.add('page-leaving');
      setTimeout(() => { from.classList.remove('page-leaving'); doSwitch(); }, 300);
    } else doSwitch();
  },

  _restoreScroll() {
    const y = parseInt(sessionStorage.getItem('scroll_home') || '0', 10);
    if (y) setTimeout(() => scrollTo({ top: y, behavior: 'smooth' }), 400);
  },

  /* ==================== 图片墙 ==================== */
  renderGallery() {
    const wall = document.getElementById('masonry');
    wall.innerHTML = '';
    const observer = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); observer.unobserve(en.target); } });
    }, { threshold: 0.1 });
    CONFIG.gallery.forEach((g, i) => {
      const item = document.createElement('div');
      item.className = 'masonry-item skeleton';
      const img = new Image();
      img.loading = 'lazy'; img.alt = g.alt || '回忆录照片';
      img.onload = () => item.classList.remove('skeleton');
      img.onerror = () => { item.classList.add('skeleton'); img.remove(); }; // 失败保留骨架屏
      img.src = g.src;
      const date = document.createElement('span');
      date.className = 'm-date'; date.textContent = g.date;
      item.append(img, date);
      item.addEventListener('click', () => this._openLightbox(i));
      wall.appendChild(item);
      observer.observe(item);
    });
  },

  /* ---- Lightbox（面板 7）：点击位置放大 / ESC / 左右滑动 ---- */
  _openLightbox(i) {
    this._lbIdx = i;
    const lb = document.getElementById('lightbox');
    const img = lb.querySelector('img');
    img.src = CONFIG.gallery[i].src;
    img.alt = CONFIG.gallery[i].alt || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    Utils.click();
  },
  _closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
  },
  _lbStep(d) {
    this._lbIdx = (this._lbIdx + d + CONFIG.gallery.length) % CONFIG.gallery.length;
    const img = document.querySelector('#lightbox img');
    img.src = CONFIG.gallery[this._lbIdx].src;
  },

  /* ==================== 彩蛋 ==================== */
  _bindEasterEggs() {
    /* 底部三击（1 秒内 3 次）：访客感言录 + 纯净版音乐 */
    const zone = document.getElementById('triple-zone');
    let taps = [], tripleTimer;
    zone.addEventListener('click', () => {
      const now = Date.now();
      taps = taps.filter(t => now - t < 1000);
      taps.push(now);
      if (taps.length >= 3) {
        taps = [];
        this._openGuestVoices();
      }
    });

    /* 底部动态小点：点击切换主题色彩（青/紫/金循环） */
    const themes = ['#00D4FF', '#7B2D8E', '#FFD700'];
    let themeIdx = 0;
    document.querySelectorAll('.foot-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => {
        themeIdx = (themeIdx + 1) % themes.length;
        document.documentElement.style.setProperty('--cyan', themes[themeIdx]);
        ZXAudio.sfx('click');
        Utils.toast('主题色已切换', i === 1 ? '禅意流转 ✨' : '');
      });
    });
  },

  /* 访客感言录：随机 3 条留言 + 纯净版音乐 */
  _openGuestVoices() {
    const msgs = Utils.get('messages', []).filter(m => !m.isEncrypted);
    const pick = msgs.sort(() => Math.random() - 0.5).slice(0, 3);
    const mask = document.getElementById('voices-mask');
    document.getElementById('voices-list').innerHTML = pick.length
      ? pick.map(m => `<div class="admin-msg">「${Utils.sanitize(m.plaintext)}」<br><span style="color:rgba(255,255,255,0.4);font-size:11px">— ${Utils.sanitize(m.nickname || m.visitorId)}</span></div>`).join('')
      : '<div class="admin-stat">还没有访客留言，去星际终端留下第一条吧 ✨</div>';
    Utils.openPanel(mask);
    ZXAudio.crossFade(CONFIG.audio.pure); // 纯净版音乐
  },

  /* ---- 快捷跳转框 ---- */
  _quickJump(text) {
    const t = text.trim();
    if (!t) return;
    const target = CONFIG.quickJump[t];
    if (!target) { Utils.toast('未识别的指令', '试试：图片 / 音乐 / 热爱 / 留言 / 足迹 / 管理'); return; }
    Utils.click();
    if (target === 'music') document.getElementById('music-panel').classList.add('open');
    else if (target === 'admin') { if (this._isAdmin) Admin.open(); else Utils.toast('需要管理员权限'); }
    else this.showPage(target);
  },

  /* ---- 分享（7 套场景文案 + Toast） ---- */
  share(scene = 'home') {
    const s = CONFIG.shareTexts[scene] || CONFIG.shareTexts.home;
    let text = s.text;
    if (scene === 'merit') text = `当前段位：${Merit.rankOf(Merit.get()).current.name}，功德 ${Merit.get()}。` + text;
    const data = { title: s.title, text, url: CONFIG.domain };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(CONFIG.domain).then(() =>
        Utils.toast('链接已复制', '快去分享给懂你的人吧 💫'));
    } else {
      Utils.toast('请手动复制', CONFIG.domain);
    }
  },

  /* ==================== 全局绑定 ==================== */
  _bindGlobal() {
    /* 木鱼 */
    document.getElementById('woodfish').addEventListener('click', e => this._woodfishTap(e));
    /* 香炉 */
    document.getElementById('incense-free').addEventListener('click', () => { Utils.click(); this._lightFree(); });
    document.querySelectorAll('#incense-tiers button').forEach((b, i) =>
      b.addEventListener('click', () => { Utils.click(); this._lightPaid(CONFIG.incense.tiers[i]); }));
    /* 相册箭头 */
    document.getElementById('album-prev').addEventListener('click', () =>
      this._albumGo((this._albumIdx - 1 + CONFIG.album.length) % CONFIG.album.length));
    document.getElementById('album-next').addEventListener('click', () =>
      this._albumGo((this._albumIdx + 1) % CONFIG.album.length));
    /* 底部入口卡片 */
    document.querySelectorAll('.entry-card').forEach(c =>
      c.addEventListener('click', () => { Utils.click(); this.showPage(c.dataset.target); }));
    document.querySelectorAll('[data-nav]').forEach(b =>
      b.addEventListener('click', () => { Utils.click(); this.showPage(b.dataset.nav); }));
    document.querySelectorAll('.back-btn').forEach(b =>
      b.addEventListener('click', () => { Utils.click(); this.showPage('home'); }));
    /* 分享 */
    document.getElementById('share-btn').addEventListener('click', () => this.share('home'));
    /* 快捷跳转 */
    const qj = document.getElementById('quick-jump-input');
    document.getElementById('quick-jump-btn').addEventListener('click', () => this._quickJump(qj.value));
    qj.addEventListener('keydown', e => { if (e.key === 'Enter') this._quickJump(qj.value); });
    /* Lightbox */
    document.getElementById('lb-close').addEventListener('click', () => this._closeLightbox());
    document.getElementById('lb-prev').addEventListener('click', () => this._lbStep(-1));
    document.getElementById('lb-next').addEventListener('click', () => this._lbStep(1));
    document.getElementById('lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') this._closeLightbox(); });
    /* Lightbox 触摸滑动 */
    let tx = 0;
    document.getElementById('lightbox').addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
    document.getElementById('lightbox').addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) this._lbStep(dx > 0 ? -1 : 1);
    }, { passive: true });
    /* 面板通用关闭 */
    document.querySelectorAll('.panel-mask').forEach(m => Utils.bindPanelClose(m));
    /* 彩蛋 */
    this._bindEasterEggs();
    /* 动态页面标题 + 音量联动 */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { document.title = 'ZXW.lat 正在等待您…'; ZXAudio.onVisibility(true); }
      else { document.title = '欢迎回来 ✦ ZXW.LAT'; ZXAudio.onVisibility(false);
        setTimeout(() => { if (!document.hidden) document.title = 'ZXW.LAT | 赛博禅境'; }, 2500); }
    });
    /* 离线提示 */
    addEventListener('offline', () => document.getElementById('offline-banner').classList.add('show'));
    addEventListener('online', () => document.getElementById('offline-banner').classList.remove('show'));
    /* 键盘快捷键 */
    addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const lb = document.getElementById('lightbox');
      if (e.key === 'Escape') {
        if (lb.classList.contains('open')) return this._closeLightbox();
        if (Utils.closeTopPanel()) return;
        document.getElementById('music-panel').classList.remove('open');
        document.getElementById('admin-panel').classList.remove('open');
      }
      if (lb.classList.contains('open')) {
        if (e.key === 'ArrowLeft') this._lbStep(-1);
        if (e.key === 'ArrowRight') this._lbStep(1);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'g') this.showPage('gallery');
      else if (k === 'p') this.showPage('passion');
      else if (k === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
      else if (k === 'h') {
        const mask = document.getElementById('help-mask');
        mask.classList.contains('open') ? Utils.closePanel(mask) : Utils.openPanel(mask);
      }
    });
    /* 图片墙渲染（延迟到主流程后） */
    this.renderGallery();
    /* Service Worker 离线缓存 */
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    /* 性能监控（LCP，控制台可见） */
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver(list => {
          const e = list.getEntries().pop();
          if (e) console.log(`[ZXW] LCP: ${Math.round(e.startTime)}ms`);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}
    }
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.boot());
