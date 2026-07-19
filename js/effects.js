/* ============================================================================
 * effects.js — 功德送礼 / 支付 / 特效 / 徽章 / 段位
 * 支付安全：分段存储动态拼接 + 1小时3次频率限制 + 数学题人机验证。
 * 特效：桃花雨、感谢横幅、金光佛像虚影、段位突破全屏金光、徽章弹跳飞走。
 * 说明：纯静态站点无法感知真实支付结果，"支付成功特效"在用户从支付页
 * 返回并手动确认后触发（前端演示逻辑），跳转前会明确提示。
 * ==========================================================================*/

const Effects = {
  init() {
    this._buildGiftPanel();
    this._buildPayPanel();
    this._buildWishPanel();
  },

  /* ==================== 支付安全（第二部分 1.1） ==================== */
  _checkRateLimit() {
    const { windowMs, maxCount } = CONFIG.paymentRateLimit;
    const last = parseInt(localStorage.getItem('lastPayment') || '0');
    if (last && Date.now() - last < windowMs) {
      const count = parseInt(localStorage.getItem('paymentCount') || '0');
      if (count >= maxCount) { Utils.toast('支付太频繁', '请 1 小时后再试 🙏'); return false; }
    } else {
      localStorage.setItem('paymentCount', '0');
    }
    return true;
  },

  _captcha() {
    const a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1;
    const ans = prompt(`安全验证：${a} + ${b} = ?`);
    if (parseInt(ans, 10) !== a + b) { Utils.toast('验证失败', '请重新操作'); return false; }
    return true;
  },

  handlePayment(platform, amount, onSuccess) {
    if (!this._checkRateLimit()) return;
    if (!this._captcha()) return;
    localStorage.setItem('lastPayment', Date.now());
    localStorage.setItem('paymentCount', (parseInt(localStorage.getItem('paymentCount') || '0') + 1).toString());
    const link = getPaymentLink(platform, amount); // 动态拼接，不做明文暴露
    if (!link) { Utils.toast('支付配置缺失'); return; }
    /* 记录待确认的供奉，用户支付返回后触发成功特效 */
    this._pending = onSuccess || null;
    Utils.toast('即将跳转到支付页', '完成支付后回到本站，点击「我已完成支付」领取功德 ✨');
    setTimeout(() => {
      window.open(link, '_blank');
      if (this._pending) this._showPayReturn(amount);
    }, 900);
  },

  /* ---- 支付返回确认（静态站点无法回调，手动确认后发放特效） ---- */
  _showPayReturn(amount) {
    const mask = document.getElementById('pay-return-mask');
    document.getElementById('pay-return-amount').textContent = '¥' + amount;
    Utils.openPanel(mask);
    document.getElementById('pay-return-yes').onclick = () => {
      Utils.closePanel(mask);
      const cb = this._pending; this._pending = null;
      if (cb) cb();
    };
    document.getElementById('pay-return-no').onclick = () => {
      Utils.closePanel(mask); this._pending = null;
      Utils.toast('好的', '支付完成后随时回来领取功德');
    };
  },

  /* ==================== 功德藏宝阁（面板 3/4/5） ==================== */
  _buildGiftPanel() {
    const grid = document.getElementById('gift-grid');
    const icons = { lotus: '🪷', incense: '🕯️', golden: '🪙', wukong: '👑' };
    /* 默认行为：功德送礼；热爱板块可临时改写 _giftHandler 复用此面板 */
    this._defaultGiftHandler = g => this.openPayConfirm(g, () => this.giftSuccess(g));
    this._giftHandler = null;
    CONFIG.gifts.forEach(g => {
      const card = document.createElement('button');
      card.className = 'gift-card';
      card.innerHTML = `<div class="g-icon">${icons[g.effect]}</div>
        <div class="g-name">${g.name}</div>
        <div class="g-price">${g.label}</div>
        <div class="g-merit">功德 +${g.merit}</div>`;
      card.addEventListener('click', () => {
        Utils.click();
        (this._giftHandler || this._defaultGiftHandler)(g);
      });
      grid.appendChild(card);
    });
    document.getElementById('gift-btn').addEventListener('click', () => {
      Utils.click();
      this._giftHandler = null; // 从顶部按钮进入时恢复默认送礼行为
      Utils.openPanel(document.getElementById('gift-mask'));
    });
  },

  /* ---- 支付确认面板：选支付宝/微信 ---- */
  _buildPayPanel() {
    this._payAlipay = document.getElementById('pay-alipay');
    this._payWechat = document.getElementById('pay-wechat');
  },

  openPayConfirm(item, onSuccess) {
    const mask = document.getElementById('pay-mask');
    document.getElementById('pay-item-name').textContent = item.name || ('供奉 ' + item.label);
    document.getElementById('pay-item-price').textContent = item.label;
    this._payAlipay.onclick = () => { Utils.closePanel(mask); this.handlePayment('alipay', item.amount, onSuccess); };
    this._payWechat.onclick = () => { Utils.closePanel(mask); this.handlePayment('wechat', item.amount, onSuccess); };
    Utils.closePanel(document.getElementById('gift-mask'));
    Utils.openPanel(mask);
  },

  /* ---- 送礼成功：桃花雨 + 感谢横幅 + 功德暴增 + 累计支付 ---- */
  giftSuccess(g) {
    const petals = { '6.66': 20, '9.99': 50, '66.66': 100, '188.88': 200 }[g.amount] || 20;
    Particles.peachRain(petals);
    ZXAudio.sfx('peach');
    if (g.amount === '66.66' || g.amount === '188.88') this.buddhaGhost(g.amount === '188.88' ? '👑' : '🪷');
    this.thanksBanner(g.name);
    ZXAudio.sfx('levelup');
    Merit.add(g.merit);
    /* VIP 累计支付记录 */
    const paid = Utils.get('totalPaid', 0) + parseFloat(g.amount);
    Utils.set('totalPaid', paid);
    if (paid > CONFIG.vipThreshold) App.refreshUserTier();
    if (paid > 50) Badges.grant('giver');
  },

  /* ---- 通用感谢横幅（第二部分 6.4） ---- */
  thanksBanner(giftName, giverName = null) {
    const name = giverName || localStorage.getItem('user') || '某位修行者';
    const banner = document.createElement('div');
    banner.className = 'thanks-banner';
    banner.innerHTML = `<div style="font-size:32px;margin-bottom:8px">✨</div>
      <div style="font-weight:500">感谢 ${Utils.sanitize(name)}</div>
      <div style="font-size:14px;color:rgba(255,215,0,0.7);margin-top:4px">赠送 ${Utils.sanitize(giftName)}</div>
      <div style="font-size:32px;margin-top:8px">✨</div>`;
    document.body.appendChild(banner);
    banner.animate([
      { transform: 'translateX(-50%) scale(0)', opacity: 0 },
      { transform: 'translateX(-50%) scale(1.1)', opacity: 1, offset: 0.6 },
      { transform: 'translateX(-50%) scale(1)', opacity: 1 }
    ], { duration: 600, easing: 'cubic-bezier(0.4,0,0.2,1)' });
    setTimeout(() => banner.animate([
      { transform: 'translateX(-50%) scale(1)', opacity: 1 },
      { transform: 'translateX(-50%) scale(0.8)', opacity: 0 }
    ], { duration: 300 }).onfinish = () => banner.remove(), 3000);
  },

  /* ---- 金光佛像 / 斗战胜佛虚影 ---- */
  buddhaGhost(icon = '🪷') {
    const g = document.createElement('div');
    g.className = 'buddha-ghost'; g.textContent = icon;
    document.body.appendChild(g);
    ZXAudio.sfx('bell');
    setTimeout(() => g.remove(), 3100);
  },

  /* ==================== 心愿输入面板（面板 6） ==================== */
  _buildWishPanel() {
    const wishInput = document.getElementById('wish-input');
    const nameInput = document.getElementById('wish-name-input');
    wishInput.maxLength = CONFIG.incense.wishMaxLen;
    nameInput.maxLength = CONFIG.incense.nameMaxLen;
    wishInput.addEventListener('input', () => {
      document.getElementById('wish-count').textContent = `${wishInput.value.length}/${CONFIG.incense.wishMaxLen}`;
    });
  },

  /* tier: 付费档位；onDone(wish, name) 提交回调 */
  openWishForm(tier, onDone) {
    const mask = document.getElementById('wish-mask');
    document.getElementById('wish-tier-label').textContent = `${tier.label} · 供奉 ${tier.durationText}`;
    const wishInput = document.getElementById('wish-input');
    const nameInput = document.getElementById('wish-name-input');
    wishInput.value = ''; nameInput.value = localStorage.getItem('user') || '';
    document.getElementById('wish-count').textContent = `0/${CONFIG.incense.wishMaxLen}`;
    document.getElementById('wish-submit').onclick = () => {
      const wish = wishInput.value.trim(), name = nameInput.value.trim();
      if (!wish) { Utils.toast('请写下心愿'); return; }
      if (Utils.hasBannedWords(wish + name)) { Utils.toast('内容包含敏感词', '请修改后再提交'); return; }
      Utils.closePanel(mask);
      onDone(wish.slice(0, CONFIG.incense.wishMaxLen), (name || '无名氏').slice(0, CONFIG.incense.nameMaxLen));
    };
    Utils.openPanel(mask);
  }
};

/* ==================== 功德与段位 ==================== */
const Merit = {
  get() { return Utils.getSecure('merit', 0) || 0; },
  add(n) {
    const before = this.get();
    const after = before + n;
    Utils.setSecure('merit', after);
    this._checkRank(before, after);
    App.renderRank();
    return after;
  },
  rankOf(v) {
    let r = CONFIG.meritRanks[0], next = null;
    for (let i = 0; i < CONFIG.meritRanks.length; i++) {
      if (v >= CONFIG.meritRanks[i].need) r = CONFIG.meritRanks[i];
      else { next = CONFIG.meritRanks[i]; break; }
    }
    return { current: r, next };
  },
  /* ---- 段位突破：全屏金光闪烁 + 升级提示 ---- */
  _checkRank(before, after) {
    const rb = this.rankOf(before).current, ra = this.rankOf(after).current;
    if (ra.name !== rb.name) {
      const flash = document.createElement('div');
      flash.className = 'rank-flash';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 1200);
      const toast = document.createElement('div');
      toast.className = 'rank-toast';
      toast.innerHTML = `✨ 段位突破 ✨<br><b style="font-size:24px">${ra.name}</b>`;
      document.body.appendChild(toast);
      document.body.classList.add('login-shake');
      setTimeout(() => document.body.classList.remove('login-shake'), 450);
      ZXAudio.sfx('levelup');
      setTimeout(() => toast.remove(), 3000);
      if (ra.name === '赛博斗战胜佛') Badges.grant('buddha');
    }
  }
};

/* ==================== 徽章系统（7 个） ==================== */
const Badges = {
  owned() { return Utils.get('badges', []); },
  has(id) { return this.owned().includes(id); },
  grant(id) {
    if (this.has(id)) return;
    const badge = CONFIG.badges.find(b => b.id === id);
    if (!badge) return;
    Utils.set('badges', [...this.owned(), id]);
    /* 徽章获得动画：中央弹出 → 旋转 → 飞到顶部状态栏 */
    const pop = document.createElement('div');
    pop.className = 'badge-popup';
    pop.innerHTML = `<div class="b-icon">${badge.icon}</div>
      <div class="b-name">${badge.name}</div>
      <div class="b-desc">${badge.desc}</div>`;
    document.body.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('show'));
    ZXAudio.sfx('bell', 0.3);
    setTimeout(() => { pop.classList.add('fly'); setTimeout(() => pop.remove(), 700); }, 2200);
    App.renderBadges();
  }
};

window.Effects = Effects;
window.Merit = Merit;
window.Badges = Badges;
