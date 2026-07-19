/* ============================================================================
 * ZXW.LAT | 赛博禅境 — 全局配置（config.js）
 * ----------------------------------------------------------------------------
 * 所有可配置项集中于此：品牌信息、曲目、图片、支付、爱好档案、热爱视频、
 * 徽章、语录、API Key 占位等。修改网站内容时优先改这里，无需动逻辑代码。
 * 资源一律使用相对路径，可直接部署到 GitHub Pages 根目录。
 * ==========================================================================*/

const CONFIG = {
  /* ---- 品牌与基础信息 ---- */
  domain: 'https://zxw.lat',          // 唯一操作域名
  siteName: 'ZXW.LAT | 赛博禅境',
  nickname: '菠萝吹雪',
  terminal: 'boluo@cyber-zen:~',
  douyin: 'https://www.douyin.com/user/MS4wLjABAAAAS2Da8JoiuY9C37Lt2J291z_Tq6Aw5gjh81apmEqzlpU',

  /* ---- 主视觉 / OG 图片 ---- */
  hero: {
    webp: 'assets/img/hero.webp',     // 全尺寸 Hero 背景
    small: 'assets/img/hero-960.webp' // 小屏响应式版本
  },
  ogImage: 'assets/img/og-image.webp', // 1200×630 OG 图（相对路径，部署后拼绝对 URL）

  /* ---- 登录层 4 素材（第二部分第三章） ---- */
  login: {
  bg: 'assets/img/login_bg.webp',          // 素材1：主背景（缓慢缩放）
  transition: 'assets/img/login_transition.webp', // 素材2：转场画面
  particle: 'assets/img/login_particle.webp',     // 素材3：装饰粒子（轨道漂浮）
  avatar: 'assets/img/login_avatar.webp'          // 素材4：中央头像（呼吸灯边框）
  },

  /* ---- 相册轮播（三张照片） ---- */
  album: [
    { src: 'assets/img/album-1.webp', caption: '花海躺平照' },
    { src: 'assets/img/album-2.webp', caption: '腹肌照' },
    { src: 'assets/img/album-3.webp', caption: '猫咪照' }
  ],
  albumInterval: 8000, // 自动播放间隔 8 秒

  /* ---- 图片墙（57 张，Masonry 瀑布流） ---- */
  gallery: (() => {
    const list = [];
    for (let i = 1; i <= 57; i++) {
      const n = String(i).padStart(2, '0');
      list.push({ src: `assets/img/gallery-${n}.webp`, date: '2026年7月', alt: `回忆录照片 ${n}` });
    }
    return list;
  })(),

  /* ---- 音乐曲目 ----
   * main：主背景音乐（zxw.lat.mp3）；alt：备选（爱的回归线.mp3）；
   * extra：扩展曲库（素材库精选）；pure：彩蛋纯净版（禅意白噪音）。 */
  audio: {
    main: { name: 'ZXW.LAT', src: 'assets/audio/bgm-main.mp3' },
    alt:  { name: '爱的回归线', src: 'assets/audio/bgm-alt.mp3' },
    extra: [
      { name: '山丘', src: 'assets/audio/track-1.mp3' },
      { name: '海阔天空', src: 'assets/audio/track-2.mp3' },
      { name: '人间', src: 'assets/audio/track-3.mp3' },
      { name: '夜巴黎', src: 'assets/audio/track-4.mp3' }
    ],
    pure: { name: '禅意·纯净版', src: 'assets/audio/pure-zen.mp3' },
    defaultVolume: 0.7,   // 默认音量 70%
    fadeInSeconds: 2.5    // 载入后 0→70% 渐入时长
  },

  /* ---- 音效（按需加载） ---- */
  sfx: {
    click:      'assets/audio/sfx-click.mp3',      // 咔哒
    woodfish:   'assets/audio/sfx-woodfish.mp3',   // 木鱼敲击
    incense:    'assets/audio/sfx-incense.mp3',    // 香炉点燃
    levelup:    'assets/audio/sfx-levelup.mp3',    // 功德升级
    peach:      'assets/audio/sfx-peach.mp3',      // 桃花雨
    login:      'assets/audio/sfx-login.mp3',      // 登录成功
    transition: 'assets/audio/sfx-transition.mp3', // 转场
    bell:       'assets/audio/sfx-bell.mp3'        // 钟声
  },

  /* ---- 功德段位 ---- */
  meritRanks: [
    { name: '尘世散修', need: 0 },
    { name: '静心居士', need: 100 },
    { name: '大悲行者', need: 500 },
    { name: '般若行者', need: 2000 },
    { name: '功德无量', need: 10000 },
    { name: '赛博斗战胜佛', need: 50000 }
  ],

  /* ---- 木鱼飘字 ---- */
  floatGain: ['功德 +1', '升职加薪 +1 💸', '逢考必过 +1 🎓', '逆天改命 +99 🔥'],
  floatLoss: ['压力 -1', '烦恼 -1', 'Bug -1', '脂肪 -1', '脱发 -1', '水逆 -1'],

  /* ---- 赛博香炉：免费 30 秒 / 付费四档 ---- */
  incense: {
    freeDuration: 30, // 秒
    tiers: [
      { amount: '6.66',  label: '¥6.66',  durationText: '1 小时', hours: 1 },
      { amount: '9.99',  label: '¥9.99',  durationText: '3 小时', hours: 3 },
      { amount: '66.66', label: '¥66.66', durationText: '2 天',   hours: 48 },
      { amount: '188.88',label: '¥188.88',durationText: '5 天',   hours: 120 }
    ],
    wishMaxLen: 10,   // 心愿最长 10 字
    nameMaxLen: 5,    // 留名最长 5 字
    wishQueueMax: 8   // 心愿泡泡 FIFO 队列容量
  },

  /* ---- 功德送礼四档（礼物 + 功德暴增 + 特效） ---- */
  gifts: [
    { amount: '6.66',   label: '¥6.66',   name: '赛博莲花',     merit: 1000,  effect: 'lotus' },
    { amount: '9.99',   label: '¥9.99',   name: '禅意香炉',     merit: 3000,  effect: 'incense' },
    { amount: '66.66',  label: '¥66.66',  name: '功德金身',     merit: 20000, effect: 'golden' },
    { amount: '188.88', label: '¥188.88', name: '赛博斗战胜佛', merit: 50000, effect: 'wukong' }
  ],

  /* ---- 热爱板块：3D 旋转视频墙 ---- */
  passionVideos: [
    { id: 'passion-1', title: '热爱时刻 Ⅰ', src: 'assets/video/passion-1.mp4', thumb: 'assets/video/passion-1-thumb.webp', duration: '00:39', description: '' },
    { id: 'passion-2', title: '热爱时刻 Ⅱ', src: 'assets/video/passion-2.mp4', thumb: 'assets/video/passion-2-thumb.webp', duration: '00:39', description: '' },
    { id: 'passion-3', title: '热爱时刻 Ⅲ', src: 'assets/video/passion-3.mp4', thumb: 'assets/video/passion-3-thumb.webp', duration: '00:20', description: '' },
    { id: 'passion-4', title: '热爱时刻 Ⅳ', src: 'assets/video/passion-4.mp4', thumb: 'assets/video/passion-4-thumb.webp', duration: '01:06', description: '' },
    { id: 'passion-5', title: '热爱时刻 Ⅴ', src: 'assets/video/passion-5.mp4', thumb: 'assets/video/passion-5-thumb.webp', duration: '00:46', description: '' },
    { id: 'passion-6', title: '热爱时刻 Ⅵ', src: 'assets/video/passion-6.mp4', thumb: 'assets/video/passion-6-thumb.webp', duration: '00:24', description: '' },
    { id: 'passion-7', title: '热爱时刻 Ⅶ', src: 'assets/video/passion-7.mp4', thumb: 'assets/video/passion-7-thumb.webp', duration: '00:24', description: '' },
    { id: 'passion-8', title: '热爱时刻 Ⅷ', src: 'assets/video/passion-8.mp4', thumb: 'assets/video/passion-8-thumb.webp', duration: '00:26', description: '' }
  ],

  /* ---- 关于我 — 爱好档案（五大模块，终端风格） ---- */
  hobbies: [
    {
      id: 'reading', command: 'cat hobby_reading.log', icon: 'book',
      title: '阅读短平快内容',
      content: '常看公众号、X平台的干货内容，既能快速获取新知、拓宽视野，也能及时了解多元观点，避开冗长名著的枯燥。',
      tags: ['信息筛选', '知识管理', '高效阅读'], color: '#00D4FF',
      expandContent: { photos: ['assets/img/hobby-reading.webp'], recommendations: ['公众号A', '公众号B', 'X账号C'] }
    },
    {
      id: 'travel', command: 'cat hobby_travel.log', icon: 'plane',
      title: '旅行与探索',
      content: '踏遍不同城市与风景，既能感受不同的风土人情，丰富人生阅历，也能在行走中放松身心。',
      tags: ['城市漫步', '风土人情', '身心疗愈'], color: '#7B2D8E',
      expandContent: { photos: ['assets/img/hobby-travel.webp'], mapLocations: [
        { city: '成都', lng: 104.06, lat: 30.67 }, { city: '大理', lng: 100.23, lat: 25.61 }
      ] }
    },
    {
      id: 'tennis', command: 'cat hobby_tennis.log', icon: 'tennis',
      title: '网球运动',
      content: '虽还是基础小白，但从头开始也是乐趣，享受突破自我的快乐。',
      tags: ['新手成长', '突破自我', '运动疗愈'], color: '#FFD700',
      expandContent: { photos: ['assets/img/hobby-tennis.webp'], progress: '初学者 · 第3个月', goal: '连续对打20回合' }
    },
    {
      id: 'social', command: 'cat hobby_social.log', icon: 'handshake',
      title: '交际与沟通',
      content: '乐于主动交流、结识同好，既能锻炼表达与沟通能力，积累情谊，也能在互动中碰撞想法、收获成长。',
      tags: ['社交连接', '思维碰撞', '共同成长'], color: '#00FF88',
      expandContent: { photos: ['assets/img/hobby-social.webp'], communities: ['网球群', '读书会', '技术交流群'] }
    },
    {
      id: 'music', command: 'cat hobby_music.log', icon: 'note',
      title: '流行音乐',
      content: '闲暇时沉浸其中，既能舒缓压力、治愈情绪，也能为生活增添趣味与氛围感。',
      tags: ['情绪疗愈', '氛围营造', '生活调味'], color: '#FF6B9D',
      expandContent: { photos: ['assets/img/hobby-music.webp'], playlist: ['爱的回归线', '山丘', '海阔天空'], mood: '舒缓 · 治愈 · 氛围' }
    }
  ],

  /* ---- 加载禅意语录（10 条） ---- */
  quotes: [
    '正在加载 ZXW 的世界…',
    '在这里，我收藏了一些关于时间的碎片。',
    '禅意加载中，请静心等候…',
    '万物皆有裂痕，那是光照进来的地方。',
    '代码即禅，禅即代码。',
    '在上班与上进之间，我选择了上香。',
    '一花一世界，一叶一菩提。',
    '信号满格的地方，就是道场。',
    '功德圆满之前，请先清空缓存。',
    '赛博空间里，也有晨钟暮鼓。'
  ],

  /* ---- 分享文案（7 套场景的核心文案，完整版见需求文档 B.2.2） ---- */
  shareTexts: {
    home:   { title: 'ZXW.LAT | 赛博禅境 — 菠萝吹雪的私人领域', text: '在上班与上进之间，我选择了上香。敲敲电子木鱼，赛博空间也能积攒功德。这里不卷KPI，只卷功德值。' },
    merit:  { title: '我在ZXW.LAT敲木鱼攒功德！🐟✨', text: '尘世散修→静心居士→大悲行者→般若行者→功德无量→赛博斗战胜佛，你在哪一层？来比比谁的段位高！' },
    footprint: { title: '我在ZXW.LAT的星空地图上留下了足迹 ✨🌍', text: '地球某处，信号满格。来看看全球修行者的足迹吧，也许我们曾在同一片星空下。' },
    guestbook: { title: '在ZXW.LAT的星际终端留下了一条加密留言 🔒💫', text: '赛博禅境的星际终端，支持AES-256加密留言，设下密码，只有懂的人才能解密。来试试？' },
    incense: { title: '我在ZXW.LAT的赛博香炉敬了一炷香 🕯️🙏', text: '免费敬香30秒，青烟袅袅；或付费供奉1-5天，心愿随青烟升起。心诚则灵，赛博空间也不例外。' },
    about:  { title: '认识一下菠萝吹雪 — ZXW.LAT的主人 🍍❄️', text: '阅读、旅行、网球、社交、音乐...在代码与禅意之间寻找平衡的赛博修行者。欢迎来做客。' },
    passion: { title: '在ZXW.LAT的热爱星球发现了一段超燃视频 🔥🎮', text: '3D旋转视频墙，点击即放，送花点赞送礼...这不是普通的视频站，这是菠萝吹雪的热爱星球。' }
  },

  /* ---- 快捷跳转指令 ---- */
  quickJump: {
    '图片': 'gallery', '图片墙': 'gallery', '相册': 'gallery',
    '音乐': 'music', '音乐台': 'music',
    '热爱': 'passion', '视频': 'passion', '游戏': 'passion',
    '留言': 'guestbook', '留言板': 'guestbook', '星际': 'guestbook',
    '足迹': 'starmap', '星空': 'starmap', '地图': 'starmap',
    '管理': 'admin', '后台': 'admin'
  },

  /* ---- 底部入口卡片（原"游戏与乐趣"已升级为"热爱 🔥"，以第二部分为准） ---- */
  bottomButtons: [
    { title: '图片墙', icon: '🖼️', target: 'gallery', desc: '收藏时间的碎片' },
    { title: '热爱 🔥', icon: '🔥', target: 'passion', desc: '3D 旋转视频墙' }
  ],

  /* ---- 管理员 ---- */
  adminName: 'zxw.zxc.lat',
  adminHash: '2a4494da95131a6fb7a762c0ee3f9d5113eb34870fc694d5c554d03eaf6ec86d', // SHA-256('zxw.zxc.lat')
  adminSessionMs: 30 * 60 * 1000, // 管理员会话 30 分钟过期

  /* ---- 访客层级（VIP 门槛：累计支付 > ¥100） ---- */
  vipThreshold: 100,

  /* ---- 徽章系统（7 个） ---- */
  badges: [
    { id: 'first',   icon: '🌟', name: '初来乍到',   desc: '首次访问' },
    { id: 'fish100', icon: '🐟', name: '木鱼学徒',   desc: '敲木鱼100次' },
    { id: 'incense10', icon: '🔥', name: '香火传承', desc: '敬香10次' },
    { id: 'star',    icon: '💫', name: '星空行者',   desc: '留下足迹' },
    { id: 'secret',  icon: '🔒', name: '密语者',     desc: '发送加密留言' },
    { id: 'giver',   icon: '🎁', name: '功德善人',   desc: '累计送礼>¥50' },
    { id: 'buddha',  icon: '👑', name: '赛博佛主',   desc: '达到最高段位' }
  ],

  /* ---- 敏感词过滤（示例词表，可按需扩充） ---- */
  bannedWords: ['赌博', '诈骗', '代开发票'],

  /* ---- 支付安全：频率限制（1 小时内最多 3 次） ---- */
  paymentRateLimit: { windowMs: 3600000, maxCount: 3 },

  /* ==================== 外部服务配置（占位） ==================== */

  /* 星空足迹：Leaflet + CARTO 暗黑底图（© OpenStreetMap © CARTO），
   * 完全免 API Key，无需任何配置；Leaflet 走 CDN（见 index.html），
   * CDN 加载失败（超时 8 秒）自动降级为内置 Canvas 2D 星图兜底。 */

  /* ==================== 云端共享存储（jsonblob，完全免 Key） ====================
   * 星空足迹 / 星际留言的全球共享由 jsonblob.com 公共 bin 提供，无需任何账号。
   * ⚠️ 公共存储：任何访客可读写，请勿写入敏感信息；所有内容渲染前已做 XSS
   * 过滤，坐标已模糊化到 100m，留言需过敏感词 + PoW 防灌水。
   * 云端不可达时自动降级为纯本地模式，功能不受影响（见 js/cloud.js）。 */
  cloud: {
    provider: 'jsonblob',
    binId: '019f7c81-30e6-7ed9-b489-9c8281b9836f',
    enabled: true
  },

  /* 星空足迹：Leaflet + CARTO 暗黑底图（© OpenStreetMap © CARTO），免 Key。
   * Leaflet CDN 加载失败时自动降级为 Canvas 2D 星图。 */
  leaflet: {
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    defaultCenter: [35.0, 105.0],  // 中国视野
    defaultZoom: 4,
    locateZoom: 11,
    timeoutMs: 8000                // CDN 加载超时 → 降级 Canvas 星图
  },

  /* Three.js CDN（3D 赛博地球）。加载失败时自动降级为 Canvas 2D 星空。 */
  threeJsCdn: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',

  /* ---- 性能：低端设备判定 ---- */
  perf: {
    particleCountHigh: 12, // 木鱼火花数（高端）
    particleCountLow: 6,   // 木鱼火花数（低端）
    starCountHigh: 3000,   // 3D 星空粒子（高端）
    starCountLow: 1200     // 3D 星空粒子（低端）
  }
};

/* ============================================================================
 * 支付链接配置（第二部分第一章：分段存储 + 动态拼接，不做明文整体暴露）
 * ==========================================================================*/
const PAYMENT_CONFIG = {
  alipay: {
    base: 'https://qr.alipay.com/',
    segments: {
      '6.66':   ['fkx', '14207u6a4vj30z42vse9'],
      '9.99':   ['fkx', '12711hsdv2x997z4kua7'],
      '66.66':  ['fkx', '12921b7p7g6l17s3v7f5'],
      '188.88': ['fkx', '13411r1wz7qf16y1a256']
    }
  },
  wechat: {
    base: 'wxp://',
    segments: {
      '6.66':   ['f2f0cK4a0S_S99XpC_8J1a3l7c6X-WJ1-b7V'],
      '9.99':   ['f2f03f7e02Jz06W-z2GjR_9E858g08N4c5D5'],
      '66.66':  ['f2f0995166H0-R3522z5-aG-0I9W9J7S18L9'],
      '188.88': ['f2f0N19b1I456Z212G5A0g1z8f185c7X7K2z']
    }
  }
};

/* 动态拼接支付链接（点击时才组装） */
function getPaymentLink(platform, amount) {
  const cfg = PAYMENT_CONFIG[platform];
  if (!cfg || !cfg.segments[amount]) return null;
  return [cfg.base, ...cfg.segments[amount]].join('');
}

/* 供其他模块读取的全局命名空间 */
window.CONFIG = CONFIG;
window.getPaymentLink = getPaymentLink;
