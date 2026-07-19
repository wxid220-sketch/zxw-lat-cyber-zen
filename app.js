// 赛博木鱼交互、音效合成与高阶特效逻辑

// 功德增加词库 (金色/绿色/橙色，融入更丰富的顶级祝福词)
const POSITIVE_PHRASES = [
    { text: '功德 +1', color: '#ffd700' },
    { text: '福报 +1', color: '#00e676' },
    { text: '财运 +88', color: '#ff9100' },
    { text: '智商 +1', color: '#00b0ff' },
    { text: '桃花 +99', color: '#ff4081' },
    { text: '头发 +10', color: '#a1a1a1' },
    { text: '快乐 +1', color: '#ffeb3b' },
    { text: '升职加薪 +1', color: '#ff9100' },
    { text: '逢考必过 +1', color: '#00b0ff' },
    { text: '万事如意 +1', color: '#ffd700' },
    { text: '心想事成 +1', color: '#ff4081' },
    { text: '健康无忧 +1', color: '#00e676' },
    { text: '逆天改命 +99', color: '#ffd700' },
    { text: '好运连连 +1', color: '#ffeb3b' },
    { text: '功德圆满 +1', color: '#ffd700' }
];

// 烦恼递减词库
const NEGATIVE_PHRASES = [
    { text: '压力 -1', color: '#ff2a5f' },
    { text: '烦恼 -1', color: '#ff2a5f' },
    { text: '焦虑 -1', color: '#ff5f56' },
    { text: 'Bug -1', color: '#ff2a5f' },
    { text: '水逆 -1', color: '#ff5f56' },
    { text: '脂肪 -1', color: '#00e676' },
    { text: '疲惫 -1', color: '#ff2a5f' },
    { text: '穷气 -1', color: '#ffd700' },
    { text: '脱发 -1', color: '#a1a1a1' },
    { text: '熬夜 -1', color: '#ff2a5f' }
];

// 功德等级配置
const ZEN_RANKS = [
    { limit: 10, name: '尘世散修' },
    { limit: 50, name: '静心居士' },
    { limit: 150, name: '大悲行者' },
    { limit: 300, name: '般若行者' },
    { limit: 500, name: '功德无量' },
    { limit: Infinity, name: '赛博斗战胜佛' }
];

// 支付固定金额跳转链接配置表
const GIFT_PAY_LINKS = {
    "6.66": {
        alipay: "https://qr.alipay.com/fkx14207u6a4vj30z42vse9",
        wechat: "wxp://f2f0cK4a0S_S99XpC_8J1a3l7c6X-WJ1-b7V"
    },
    "9.99": {
        alipay: "https://qr.alipay.com/fkx12711hsdv2x997z4kua7",
        wechat: "wxp://f2f03f7e02Jz06W-z2GjR_9E858g08N4c5D5"
    },
    "66.66": {
        alipay: "https://qr.alipay.com/fkx12921b7p7g6l17s3v7f5",
        wechat: "wxp://f2f0995166H0-R3522z5-aG-0I9W9J7S18L9"
    },
    "188.88": {
        alipay: "https://qr.alipay.com/fkx13411r1wz7qf16y1a256",
        wechat: "wxp://f2f0N19b1I456Z212G5A0g1z8f185c7X7K2z"
    }
};

// 预设的香炉祈福心愿队列 (FIFO 循环展示)
let wishQueue = [
    { text: "愿家人安康，诸事顺遂", author: "菠萝吹雪" },
    { text: "下季度升职加薪，头发茂密", author: "程序员小张" },
    { text: "期末考试全科通关不挂科！", author: "大二学子" },
    { text: "无病无灾，无Bug运行", author: "技术总监" },
    { text: "暴富爆单，早日财务自由", author: "赛博网商" }
];

// 初始化 DOM 元素
const meritValEl = document.getElementById('merit-val');
const woodfishBtn = document.getElementById('woodfish-btn');
const floatingContainer = document.getElementById('floating-container');
const svgPath = document.querySelector('.woodfish-svg');
const zenRankEl = document.getElementById('zen-rank');

// 电子香炉元素
const incensePot = document.getElementById('incense-pot');
const incenseHint = document.getElementById('incense-hint');
const smokeContainer = document.getElementById('smoke-container');
const incenseSticks = document.getElementById('incense-sticks');

// 祈福控制元素
const tabFreeBtn = document.getElementById('tab-free-btn');
const tabPayBtn = document.getElementById('tab-pay-btn');
const panelFree = document.getElementById('panel-free');
const panelPay = document.getElementById('panel-pay');
const freeIncenseAction = document.getElementById('free-incense-action');
const wishInput = document.getElementById('wish-input');
const nameInput = document.getElementById('name-input');
const wishOptions = document.querySelectorAll('.wish-option');
const wishAlipayBtn = document.getElementById('wish-alipay-btn');
const wishWechatBtn = document.getElementById('wish-wechat-btn');
const wishSmokeBubble = document.getElementById('wish-smoke-bubble');

// 礼物弹窗元素
const paymentModal = document.getElementById('payment-modal');
const giftOpenBtn = document.getElementById('gift-open-btn');
const giftCloseBtn = document.getElementById('gift-close-btn');
const giftItems = document.querySelectorAll('.gift-item');
const giftMeaningText = document.getElementById('gift-meaning-text');
const giftAlipayBtn = document.getElementById('gift-alipay-btn');
const giftWechatBtn = document.getElementById('gift-wechat-btn');
const flowerRainLayer = document.getElementById('flower-rain-layer');

// 全局状态变量
let meritCount = parseInt(localStorage.getItem('merit_count') || '0', 10);
let audioCtx = null;
let meritMultiplier = 1; 
let isIncensing = false;  
let incenseTimeout = null;

// 选中的礼品数据 (默认首选)
let selectedGift = {
    price: '6.66',
    merit: 99,
    name: '清幽雅兰',
    icon: '🌸'
};

// 当前香炉选中的付费祈福金额
let selectedWishPrice = '6.66';

// 初始化显示
meritValEl.textContent = meritCount.toLocaleString();
updateZenRank(meritCount);
updateGiftPayLinks();
updateWishPayLinks();

// 功德境界评级更新
function updateZenRank(count) {
    const rank = ZEN_RANKS.find(r => count < r.limit);
    if (rank) {
        zenRankEl.textContent = rank.name;
    }
}

// Web Audio API 声音合成
function playWoodfishSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
        
        gainNode.gain.setValueAtTime(1.0, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        
        osc.start(now);
        osc.stop(now + 0.15);
    } catch (e) {
        console.warn('Audio Context error:', e);
    }
}

// 核心敲击执行器
function triggerWoodfish(clientX, clientY) {
    playWoodfishSound();
    
    const addVal = 1 * meritMultiplier;
    meritCount += addVal;
    localStorage.setItem('merit_count', meritCount);
    
    meritValEl.textContent = meritCount.toLocaleString();
    updateZenRank(meritCount);
    
    meritValEl.style.transform = 'scale(1.12)';
    setTimeout(() => {
        meritValEl.style.transform = 'scale(1)';
    }, 80);

    svgPath.style.transform = 'scale(0.92)';
    setTimeout(() => {
        svgPath.style.transform = 'scale(1)';
    }, 60);
    
    const rect = woodfishBtn.getBoundingClientRect();
    let x, y;
    if (clientX !== undefined && clientY !== undefined) {
        x = clientX - rect.left;
        y = clientY - rect.top;
    } else {
        x = rect.width / 2;
        y = rect.height / 2 - 20;
    }

    createDoubleFloatingText(x, y);
    createSparkles(x, y);
}

// 双飘字效果 (+1 和 -1 左右对称)
function createDoubleFloatingText(x, y) {
    const posWord = POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)];
    const negWord = NEGATIVE_PHRASES[Math.floor(Math.random() * NEGATIVE_PHRASES.length)];

    // 正向词 (偏右)
    const elPos = document.createElement('div');
    elPos.className = 'floating-text';
    elPos.textContent = posWord.text;
    elPos.style.color = posWord.color;
    elPos.style.left = `${x}px`;
    elPos.style.top = `${y}px`;
    const rightOffset = 25 + Math.random() * 20;
    elPos.style.setProperty('--random-x', `${rightOffset}px`);
    floatingContainer.appendChild(elPos);

    // 负向词 (偏左)
    const elNeg = document.createElement('div');
    elNeg.className = 'floating-text';
    elNeg.textContent = negWord.text;
    elNeg.style.color = negWord.color;
    elNeg.style.left = `${x}px`;
    elNeg.style.top = `${y}px`;
    const leftOffset = -(25 + Math.random() * 20);
    elNeg.style.setProperty('--random-x', `${leftOffset}px`);
    floatingContainer.appendChild(elNeg);

    setTimeout(() => {
        elPos.remove();
        elNeg.remove();
    }, 850);
}

// 金光四射粒子特效
function createSparkles(x, y) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'sparkle-particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 35 + Math.random() * 45;
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);
        
        floatingContainer.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 750);
    }
}

// --- 免费敬香交互系统 ---
function startIncenseTimer(durationMs, multiplierVal, tipText) {
    clearTimeout(incenseTimeout);
    
    // 激活状态
    isIncensing = true;
    meritMultiplier = multiplierVal;
    
    const potCard = document.getElementById('incense-pot');
    potCard.classList.add('active');
    incenseHint.textContent = tipText;
    incenseHint.style.color = '#ffd700';

    // 到期熄灭
    incenseTimeout = setTimeout(() => {
        potCard.classList.remove('active');
        meritMultiplier = 1;
        isIncensing = false;
        incenseHint.textContent = '🏮 香烛已燃尽，可再次敬香积累福报';
        incenseHint.style.color = 'var(--text-secondary)';
    }, durationMs);
}

// 免费烧香执行
freeIncenseAction.addEventListener('click', () => {
    if (isIncensing) {
        alert('当前已有香火在供奉中，施主心诚则灵，无需重复敬香。');
        return;
    }
    // 免费敬香持续 30秒，无功德翻倍
    startIncenseTimer(30000, 1, '🔥 免费供奉中：心平气和，禅意渐浓...');
});

// --- 功德送礼与直连跳转模块 ---

// 开启/关闭礼物模态框
giftOpenBtn.addEventListener('click', () => {
    paymentModal.classList.add('active');
});

giftCloseBtn.addEventListener('click', () => {
    paymentModal.classList.remove('active');
});

paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
        paymentModal.classList.remove('active');
    }
});

// 货架礼物切换
giftItems.forEach(item => {
    item.addEventListener('click', () => {
        giftItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        selectedGift.price = item.getAttribute('data-price');
        selectedGift.merit = parseInt(item.getAttribute('data-merit'), 10);
        selectedGift.name = item.getAttribute('data-name');
        selectedGift.icon = item.getAttribute('data-icon');
        
        // 渲染描述
        giftMeaningText.textContent = item.getAttribute('data-meaning');
        
        updateGiftPayLinks();
    });
});

// 根据选中的礼物金额，动态更新直连微信/支付宝超链接的 href
function updateGiftPayLinks() {
    const links = GIFT_PAY_LINKS[selectedGift.price];
    if (links) {
        giftAlipayBtn.href = links.alipay;
        giftWechatBtn.href = links.wechat;
    }
}

// 用户点击微信/支付宝一键支付时，我们立刻响应本地送礼特效 (极速反馈)
[giftAlipayBtn, giftWechatBtn].forEach(btn => {
    btn.addEventListener('click', () => {
        // 关闭 Modal
        paymentModal.classList.remove('active');
        
        // 延时 1 秒自动结算功德并触发特效 (让用户有跳转支付的反应时间)
        setTimeout(() => {
            meritCount += selectedGift.merit;
            localStorage.setItem('merit_count', meritCount);
            meritValEl.textContent = meritCount.toLocaleString();
            updateZenRank(meritCount);
            
            // 爆桃花雨特效
            triggerFlowerRain();
            
            // 横幅感谢飘字
            showGiftBanner(selectedGift.icon, selectedGift.name, selectedGift.merit);
        }, 1500);
    });
});

// 满屏桃花雨飘落
function triggerFlowerRain() {
    const petalCount = 28;
    for (let i = 0; i < petalCount; i++) {
        const petal = document.createElement('div');
        petal.className = 'flower-petal';
        
        petal.style.left = `${Math.random() * 100}vw`;
        const delay = Math.random() * 2.2;
        const duration = 2.5 + Math.random() * 2;
        
        petal.style.animationDelay = `${delay}s`;
        petal.style.animationDuration = `${duration}s`;
        
        const drift = 50 + Math.random() * 100;
        petal.style.setProperty('--drift-x', `${drift}px`);
        
        flowerRainLayer.appendChild(petal);
        
        setTimeout(() => {
            petal.remove();
        }, (delay + duration) * 1000 + 100);
    }
}

// 送礼横幅
function showGiftBanner(icon, name, merit) {
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '40%';
    banner.style.left = '50%';
    banner.style.transform = 'translate(-50%, -50%) scale(0.6)';
    banner.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 42, 95, 0.95))';
    banner.style.border = '2px solid #ffd700';
    banner.style.boxShadow = '0 0 35px rgba(255, 215, 0, 0.6), 0 10px 40px rgba(0,0,0,0.8)';
    banner.style.borderRadius = '20px';
    banner.style.padding = '1.5rem 2.5rem';
    banner.style.zIndex = '99999';
    banner.style.textAlign = 'center';
    banner.style.pointerEvents = 'none';
    banner.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    banner.style.opacity = '0';
    
    banner.innerHTML = `
        <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">${icon}</div>
        <div style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 700; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5)">
            成功供奉「${name}」
        </div>
        <div style="font-size: 1.15rem; font-weight: 800; color: #fffde0; margin-top: 0.4rem;">
            获得加持：功德 +${merit}！
        </div>
    `;
    
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.style.opacity = '1';
        banner.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);
    
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translate(-50%, -50%) scale(0.85) translateY(-30px)';
        setTimeout(() => { banner.remove(); }, 500);
    }, 2800);
}

// --- 赛博香炉付费模式与心愿展示系统 ---

// Tab 切换 (免费/付费)
tabFreeBtn.addEventListener('click', () => {
    tabFreeBtn.classList.add('active');
    tabPayBtn.classList.remove('active');
    panelFree.classList.add('active');
    panelPay.classList.remove('active');
});

tabPayBtn.addEventListener('click', () => {
    tabPayBtn.classList.add('active');
    tabFreeBtn.classList.remove('active');
    panelPay.classList.add('active');
    panelFree.classList.remove('active');
});

// 祈福金额单选框点击切换
wishOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        wishOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) {
            radio.checked = true;
            selectedWishPrice = radio.value;
            updateWishPayLinks();
        }
    });
});

// 更新付费祈福的支付跳转链接 href
function updateWishPayLinks() {
    const links = GIFT_PAY_LINKS[selectedWishPrice];
    if (links) {
        wishAlipayBtn.href = links.alipay;
        wishWechatBtn.href = links.wechat;
    }
}

// 拦截付费祈福的微信/支付宝点击
[wishAlipayBtn, wishWechatBtn].forEach(btn => {
    btn.addEventListener('click', (e) => {
        const wishText = wishInput.value.trim();
        const authorText = nameInput.value.trim() || "匿名施主";
        
        if (!wishText) {
            e.preventDefault(); // 阻止跳转
            alert("请施主填写您的祈福心愿，方能供奉神佛！");
            return;
        }

        // 把用户刚写的愿望推入 FIFO 循环队列的第一位 (插队优先展示，爽快感倍增！)
        const newWish = { text: wishText, author: `— ${authorText}` };
        wishQueue.unshift(newWish);
        
        // 瞬间在烟雾缭绕中展示当前愿望
        showWishInSmoke(newWish);
        
        // 清空输入框
        wishInput.value = '';
        nameInput.value = '';
        
        // 开启功德翻倍燃烧特效！(6.66元对应双倍，不同档位可直接开启双倍，这里统一定制为 1.5分钟功德翻倍加速)
        setTimeout(() => {
            startIncenseTimer(90000, 2, `🔥 付费祈福加持中：功德速度 x2 倍！已为您供奉「${selectedWishPrice}元」栏目`);
        }, 1500);
    });
});

// 心愿轮流滚动展示调度 (FIFO)
let currentWishIndex = 0;
function startWishCarousel() {
    setInterval(() => {
        // 先淡出并虚化
        wishSmokeBubble.classList.remove('active');
        
        setTimeout(() => {
            // 从队列中取出下一个展示
            currentWishIndex = (currentWishIndex + 1) % wishQueue.length;
            const wish = wishQueue[currentWishIndex];
            
            const textEl = wishSmokeBubble.querySelector('.wish-text');
            const authorEl = wishSmokeBubble.querySelector('.wish-author');
            
            textEl.textContent = wish.text;
            authorEl.textContent = wish.author.startsWith('—') ? wish.author : `— ${wish.author}`;
            
            // 淡入并清晰展示
            wishSmokeBubble.classList.add('active');
        }, 1200); // 配合 CSS 1.2s 的 transition 动画
    }, 7000); // 每 7 秒滚动一次
}

// 立即展示刚付费的专属心愿
function showWishInSmoke(wish) {
    wishSmokeBubble.classList.remove('active');
    setTimeout(() => {
        const textEl = wishSmokeBubble.querySelector('.wish-text');
        const authorEl = wishSmokeBubble.querySelector('.wish-author');
        
        textEl.textContent = wish.text;
        authorEl.textContent = wish.author;
        
        wishSmokeBubble.classList.add('active');
        // 重设当前循环指针
        currentWishIndex = 0;
    }, 1200);
}

// 初始化开启心愿循环展示
setTimeout(() => {
    wishSmokeBubble.classList.add('active');
    startWishCarousel();
}, 2000);

// --- 木鱼基本点击事件 ---
woodfishBtn.addEventListener('click', (e) => {
    triggerWoodfish(e.clientX, e.clientY);
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        triggerWoodfish();
    }
});

// --- 交互式相册轮播逻辑 (Carousel) ---
const slides = document.querySelectorAll('.carousel-slide');
const indicators = document.querySelectorAll('.indicator');
const prevBtn = document.getElementById('carousel-prev-btn');
const nextBtn = document.getElementById('carousel-next-btn');
let currentSlideIndex = 0;
let carouselTimer = null;

function showSlide(index) {
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    
    currentSlideIndex = index;
    
    slides.forEach((slide, i) => {
        if (i === index) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    indicators.forEach((indicator, i) => {
        if (i === index) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

function prevSlide() {
    showSlide(currentSlideIndex - 1);
}

function resetCarouselTimer() {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(nextSlide, 8000);
}

if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prevSlide();
        resetCarouselTimer();
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextSlide();
        resetCarouselTimer();
    });
}

indicators.forEach((indicator, idx) => {
    indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        showSlide(idx);
        resetCarouselTimer();
    });
});

resetCarouselTimer();
