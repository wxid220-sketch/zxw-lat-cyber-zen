/* ============================================================================
 * particles.js — 粒子与氛围特效
 * 木鱼金色火花（极坐标爆裂）、鼠标轨迹光点、聚光灯跟随、自定义指针、
 * 自定义滚动条（滚动时出现）、桃花雨。
 * ==========================================================================*/

const Particles = {
  lowEnd: false,
  trailDots: [],

  init() {
    this.lowEnd = Utils.isLowEnd();
    this._cursor();
    this._trail();
    this._spotlight();
    this._scrollbar();
  },

  /* ---- 木鱼点击：N 个金色火花，极坐标轨迹爆裂、下坠缩小淡出 ---- */
  woodfishSparks(x, y) {
    const count = this.lowEnd ? CONFIG.perf.particleCountLow : CONFIG.perf.particleCountHigh;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = x + 'px'; spark.style.top = y + 'px';
      document.body.appendChild(spark);
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 70;
      const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist * 0.7;
      spark.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.9)`, opacity: 0.9, offset: 0.55 },
        { transform: `translate(${dx * 1.15}px, ${dy + 70}px) scale(0.1)`, opacity: 0 }
      ], { duration: 800 + Math.random() * 300, easing: 'cubic-bezier(0.2,0.6,0.4,1)' })
        .onfinish = () => spark.remove();
    }
  },

  /* ---- 功德飘字（右金左红，上浮淡出，小屏边界检测） ---- */
  floatText(x, y, text, type) {
    const el = document.createElement('div');
    el.className = 'float-text ' + type;
    el.textContent = text;
    document.body.appendChild(el);
    /* 小屏幕（iPhone SE 等）飘字边界检测：避免飘出视口 */
    const w = el.offsetWidth;
    let fx = x + (type === 'gain' ? 30 : -30 - w);
    fx = Math.max(8, Math.min(fx, window.innerWidth - w - 8));
    el.style.left = fx + 'px';
    el.style.top = Math.max(50, y - 20) + 'px';
    setTimeout(() => el.remove(), 1450);
  },

  /* ---- 桃花雨（数量按档位 20/50/100/200） ---- */
  peachRain(count = 20) {
    const petals = ['🌸', '🌺', '💮'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'peach-petal';
      p.textContent = petals[Math.floor(Math.random() * petals.length)];
      p.style.left = Math.random() * 100 + 'vw';
      p.style.fontSize = (14 + Math.random() * 18) + 'px';
      p.style.animationDuration = (3 + Math.random() * 4) + 's';
      p.style.animationDelay = (Math.random() * 2) + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 9000);
    }
  },

  /* ---- 自定义鼠标指针：极小圆点 + 白色圆环（0.2s 延迟追随） ---- */
  _cursor() {
    if (matchMedia('(pointer: coarse)').matches) return;
    document.body.classList.add('custom-cursor');
    const dot = document.createElement('div'); dot.id = 'cursor-dot';
    const ring = document.createElement('div'); ring.id = 'cursor-ring';
    document.body.append(dot, ring);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function follow() {
      /* 0.2s 延迟追随效果 */
      rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(follow);
    })();
    /* 悬停可交互元素时圆环放大 */
    addEventListener('mouseover', e => {
      ring.classList.toggle('hovering',
        !!e.target.closest('button, a, input, textarea, .masonry-item, .passion-card, .hobby-card'));
    });
  },

  /* ---- 鼠标轨迹：淡淡青色光点，最多 20 个，逐渐淡出 ---- */
  _trail() {
    if (matchMedia('(pointer: coarse)').matches || this.lowEnd) return;
    let last = 0;
    addEventListener('mousemove', e => {
      const now = performance.now();
      if (now - last < 40) return; last = now;
      const d = document.createElement('div');
      d.className = 'trail-dot';
      d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
      document.body.appendChild(d);
      this.trailDots.push(d);
      if (this.trailDots.length > 20) this.trailDots.shift().remove();
      setTimeout(() => { d.remove(); this.trailDots = this.trailDots.filter(x => x !== d); }, 900);
    });
  },

  /* ---- 聚光灯跟随 ---- */
  _spotlight() {
    const sp = document.getElementById('spotlight');
    if (!sp) return;
    addEventListener('mousemove', e => {
      sp.style.setProperty('--sx', e.clientX + 'px');
      sp.style.setProperty('--sy', e.clientY + 'px');
    });
  },

  /* ---- 自定义滚动条：滚动时出现，停止 1s 后消失 ---- */
  _scrollbar() {
    let timer;
    addEventListener('scroll', () => {
      document.body.classList.add('scrolling');
      clearTimeout(timer);
      timer = setTimeout(() => document.body.classList.remove('scrolling'), 1000);
    }, { passive: true });
  }
};

window.Particles = Particles;
