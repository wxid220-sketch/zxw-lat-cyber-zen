/* ============================================================================
 * about.js — 关于我 · 赛博档案
 * 终端命令行风格卡片：打字机渲染、IntersectionObserver 滚动渐显（流水线）、
 * 悬停辉光、点击展开/收起（照片 / 推荐 / 足迹 / 进度）。
 * ==========================================================================*/

const About = {
  /* 爱好 SVG 线条图标（2px 描边，需求文档附录 D） */
  icons: {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M13 2l9 10-9 10V2z"/></svg>',
    tennis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M2 12h20"/></svg>',
    handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
  },

  init() {
    /* 板块标题打字机 */
    const titleEl = document.getElementById('about-command');
    this._typeWhenVisible(titleEl, '> cat /home/boluo/profile.txt', 60);

    /* 爱好卡片 */
    const grid = document.getElementById('hobby-grid');
    CONFIG.hobbies.forEach(h => grid.appendChild(this._card(h)));
    this._observe();
  },

  _card(h) {
    const card = document.createElement('div');
    card.className = 'hobby-card';
    card.style.setProperty('--hc', h.color);

    const cmdParts = h.command.split(' ');
    const expand = h.expandContent || {};
    let expandHTML = '';
    if (expand.photos) expandHTML += expand.photos.map(p =>
      `<img src="${p}" alt="${h.title}相关照片" loading="lazy" onerror="this.style.display='none'">`).join('');
    if (expand.recommendations) expandHTML += `<div class="expand-list"><b>推荐关注：</b>${expand.recommendations.join(' · ')}</div>`;
    if (expand.mapLocations) expandHTML += `<div class="expand-list"><b>旅行足迹：</b>${expand.mapLocations.map(m => `📍 ${m.city}（${m.lng}°E, ${m.lat}°N）`).join('　')}</div>`;
    if (expand.progress) expandHTML += `<div class="expand-list"><b>当前进度：</b>${expand.progress}　<b>目标：</b>${expand.goal}</div>`;
    if (expand.communities) expandHTML += `<div class="expand-list"><b>活跃社群：</b>${expand.communities.join(' · ')}</div>`;
    if (expand.playlist) expandHTML += `<div class="expand-list"><b>私藏歌单：</b>${expand.playlist.join(' · ')}<br><b>氛围：</b>${expand.mood}</div>`;

    card.innerHTML = `
      <div class="hobby-head">
        <span class="hobby-icon">${this.icons[h.icon] || ''}</span>
        <span class="hobby-command"><span class="prefix"></span></span>
      </div>
      <div class="hobby-title">${h.title}</div>
      <div class="hobby-content"></div>
      <div class="hobby-tags">${h.tags.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="expand-content">${expandHTML}</div>
      <div class="hobby-hint">▸ 点击卡片展开 / 收起</div>`;

    /* 点击展开/收起（需求文档附录 B） */
    card.addEventListener('click', () => {
      const ec = card.querySelector('.expand-content');
      if (card.classList.contains('expanded')) {
        ec.style.maxHeight = '0'; ec.style.opacity = '0';
        card.classList.remove('expanded');
      } else {
        ec.style.maxHeight = ec.scrollHeight + 'px'; ec.style.opacity = '1';
        card.classList.add('expanded');
      }
      Utils.click();
    });

    /* 记录打字机任务：进入视口后先打命令（100ms/字），再逐行打内容 */
    card._typing = () => {
      const cmdEl = card.querySelector('.hobby-command .prefix');
      const file = cmdParts.slice(1).join(' ');
      Utils.typewriter(cmdEl, cmdParts[0] + ' ', 100, () => {
        const fileEl = document.createElement('span');
        fileEl.className = 'file'; fileEl.textContent = file;
        cmdEl.appendChild(fileEl);
        const contentEl = card.querySelector('.hobby-content');
        Utils.typewriter(contentEl, h.content, 30);
      });
    };
    return card;
  },

  /* ---- IntersectionObserver 滚动渐显，依次延迟 100ms 形成流水线 ---- */
  _observe() {
    const cards = [...document.querySelectorAll('.hobby-card')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
            if (entry.target._typing && !entry.target._typed) {
              entry.target._typed = true;
              entry.target._typing();
            }
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    cards.forEach(c => observer.observe(c));
  },

  _typeWhenVisible(el, text, speed) {
    const ob = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { Utils.typewriter(el, text, speed); ob.disconnect(); }
      });
    }, { threshold: 0.4 });
    ob.observe(el);
  }
};

window.About = About;
