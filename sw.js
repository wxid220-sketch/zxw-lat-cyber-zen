/* ============================================================================
 * sw.js — Service Worker：离线缓存
 * 策略：静态资源缓存优先 + 网络回退；HTML 网络优先 + 缓存兜底。
 * 离线时页面顶部显示"您目前处于离线模式，但您的回忆依然陪伴着您。"
 * （横幅由 app.js 的 offline 事件驱动；SW 保证离线可打开站点。）
 * ==========================================================================*/

const CACHE = 'zxw-lat-v1';

/* 核心骨架：安装时预缓存（保证离线可打开） */
const CORE = [
  './',
  'index.html',
  '404.html',
  'css/style.css',
  'js/config.js', 'js/utils.js', 'js/particles.js', 'js/audio.js',
  'js/effects.js', 'js/about.js', 'js/earth.js', 'js/starmap.js',
  'js/guestbook.js', 'js/passion.js', 'js/admin.js', 'js/app.js',
  'favicon.ico', 'apple-touch-icon.png',
  'assets/img/hero.webp', 'assets/img/login_bg.webp', 'assets/img/login_avatar.webp',
  'assets/img/login_transition.webp', 'assets/img/login_particle.webp',
  'assets/img/og-image.webp',
  'assets/audio/bgm-main.mp3', 'assets/audio/bgm-alt.mp3', 'assets/audio/pure-zen.mp3',
  'assets/audio/sfx-click.mp3', 'assets/audio/sfx-woodfish.mp3',
  'assets/audio/sfx-incense.mp3', 'assets/audio/sfx-levelup.mp3',
  'assets/audio/sfx-peach.mp3', 'assets/audio/sfx-login.mp3',
  'assets/audio/sfx-transition.mp3', 'assets/audio/sfx-bell.mp3'
];

/* 安装：预缓存核心资源（单个失败不阻塞整体） */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

/* 激活：清理旧缓存 */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* 拦截请求：
 * HTML → 网络优先，失败回退缓存（再退 404 页）
 * 静态资源（图片/音频/视频/CSS/JS）→ 缓存优先，网络更新（stale-while-revalidate）
 */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  const isHTML = req.mode === 'navigate' || req.destination === 'document';
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match('index.html'))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const fetching = fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetching;
    })
  );
});
