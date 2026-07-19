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

// 烦恼递减词库 (红色/粉红，带有有趣的 -1 减量符号)
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

// 初始化 DOM 元素
const meritValEl = document.getElementById('merit-val');
const woodfishBtn = document.getElementById('woodfish-btn');
const floatingContainer = document.getElementById('floating-container');
const svgPath = document.querySelector('.woodfish-svg');
const zenRankEl = document.getElementById('zen-rank');

// 电子香炉元素
const incensePot = document.getElementById('incense-pot');
const incenseHint = document.getElementById('incense-hint');

// 支付/送礼弹窗元素
const paymentModal = document.getElementById('payment-modal');
const giftOpenBtn = document.getElementById('gift-open-btn');
const giftCloseBtn = document.getElementById('gift-close-btn');
const giftItems = document.querySelectorAll('.gift-item');
const payTabs = document.querySelectorAll('.pay-tab');
const qrSvg = document.querySelector('.qrcode-svg');
const paymentHint = document.getElementById('payment-hint');
const confirmPayBtn = document.getElementById('confirm-pay-btn');
const flowerRainLayer = document.getElementById('flower-rain-layer');

// 全局变量
let meritCount = parseInt(localStorage.getItem('merit_count') || '0', 10);
let audioCtx = null;
let meritMultiplier = 1; // 功德加成倍率
let isIncensing = false;  // 是否正在上香

// 选中的礼品数据 (默认首选)
let selectedGift = {
    price: '6.66',
    merit: 99,
    name: '清幽雅兰',
    icon: '🌸'
};
let selectedMethod = 'wechat'; // wechat 或 alipay

// 初始化显示
meritValEl.textContent = meritCount.toLocaleString();
updateZenRank(meritCount);
updateConfirmBtnText();

// 功德身份评级更新
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
    
    // 累加功德值
    const addVal = 1 * meritMultiplier;
    meritCount += addVal;
    localStorage.setItem('merit_count', meritCount);
    
    // 界面与段位更新
    meritValEl.textContent = meritCount.toLocaleString();
    updateZenRank(meritCount);
    
    // 数字跳动效果
    meritValEl.style.transform = 'scale(1.12)';
    setTimeout(() => {
        meritValEl.style.transform = 'scale(1)';
    }, 80);

    // 木鱼形变
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

// 电子香炉敬香
incensePot.addEventListener('click', () => {
    if (isIncensing) return;
    
    isIncensing = true;
    meritMultiplier = 2;
    incensePot.classList.add('active');
    incenseHint.textContent = '🔥 敬香中：心澄神明，功德获取速率 x2 倍！';
    incenseHint.style.color = '#ffd700';

    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    setTimeout(() => {
        incensePot.classList.remove('active');
        meritMultiplier = 1;
        isIncensing = false;
        incenseHint.textContent = '🏮 香烛已燃尽，可再次敬香积累福报';
        incenseHint.style.color = 'var(--text-secondary)';
    }, 30000);
});

// --- 功德送礼与支付模块 ---

// 开启/关闭模态框
giftOpenBtn.addEventListener('click', () => {
    paymentModal.classList.add('active');
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
});

giftCloseBtn.addEventListener('click', () => {
    paymentModal.classList.remove('active');
});

paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
        paymentModal.classList.remove('active');
    }
});

// 礼物卡片点击切换
giftItems.forEach(item => {
    item.addEventListener('click', () => {
        giftItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        selectedGift.price = item.getAttribute('data-price');
        selectedGift.merit = parseInt(item.getAttribute('data-merit'), 10);
        selectedGift.name = item.getAttribute('data-name');
        selectedGift.icon = item.getAttribute('data-icon');
        
        updateConfirmBtnText();
    });
});

// 支付方式 Tab 切换 (微信/支付宝)
payTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        payTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        selectedMethod = tab.getAttribute('data-target');
        
        if (selectedMethod === 'wechat') {
            qrSvg.classList.remove('alipay-theme');
            paymentHint.textContent = `请扫描微信支付码供奉礼物`;
        } else {
            qrSvg.classList.add('alipay-theme');
            paymentHint.textContent = `请扫描支付宝支付码供奉礼物`;
        }
        
        updateConfirmBtnText();
    });
});

// 更新底部确认按钮文字
function updateConfirmBtnText() {
    const methodName = selectedMethod === 'wechat' ? '微信' : '支付宝';
    confirmPayBtn.textContent = `通过 ${methodName} 支付 ¥${selectedGift.price}，供奉「${selectedGift.name}」`;
    if (selectedMethod === 'wechat') {
        confirmPayBtn.style.background = 'linear-gradient(90deg, #07c160, #0ab858)';
        confirmPayBtn.style.boxShadow = '0 4px 15px rgba(7, 193, 96, 0.3)';
    } else {
        confirmPayBtn.style.background = 'linear-gradient(90deg, #1677ff, #005eff)';
        confirmPayBtn.style.boxShadow = '0 4px 15px rgba(22, 119, 255, 0.3)';
    }
}

// 模拟充值并送礼成功
confirmPayBtn.addEventListener('click', () => {
    // 增加对应礼物的巨额功德值
    meritCount += selectedGift.merit;
    localStorage.setItem('merit_count', meritCount);
    
    // 更新主界面
    meritValEl.textContent = meritCount.toLocaleString();
    updateZenRank(meritCount);
    
    // 关闭 Modal
    paymentModal.classList.remove('active');
    
    // 特效 1：满屏花瓣飘落雨 (送花特效)
    triggerFlowerRain();
    
    // 特效 2：屏幕中心飘起华丽的感谢横幅飘字
    showGiftBanner(selectedGift.icon, selectedGift.name, selectedGift.merit);
});

// 满屏桃花雨飘落特效
function triggerFlowerRain() {
    const petalCount = 28; // 花瓣数量
    for (let i = 0; i < petalCount; i++) {
        const petal = document.createElement('div');
        petal.className = 'flower-petal';
        
        // 随机属性分配，形成错落跌落的美感
        petal.style.left = `${Math.random() * 100}vw`;
        
        const delay = Math.random() * 2.2; // 0s - 2.2s 陆续落下
        const duration = 2.5 + Math.random() * 2; // 飘落速度
        petal.style.animationDelay = `${delay}s`;
        petal.style.animationDuration = `${duration}s`;
        
        // 飘落时在水平方向上的漂移偏差 (50px 到 150px)
        const drift = 50 + Math.random() * 100;
        petal.style.setProperty('--drift-x', `${drift}px`);
        
        flowerRainLayer.appendChild(petal);
        
        // 动画结束之后清理 DOM
        setTimeout(() => {
            petal.remove();
        }, (delay + duration) * 1000 + 100);
    }
}

// 供奉感谢横幅飘字
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
            获得双倍加持：功德 +${merit}！
        </div>
    `;
    
    document.body.appendChild(banner);
    
    // 渐显放大
    setTimeout(() => {
        banner.style.opacity = '1';
        banner.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);
    
    // 淡出销毁
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translate(-50%, -50%) scale(0.85) translateY(-30px)';
        setTimeout(() => {
            banner.remove();
        }, 500);
    }, 2800);
}

// 鼠标/触屏点击事件
woodfishBtn.addEventListener('click', (e) => {
    triggerWoodfish(e.clientX, e.clientY);
});

// 键盘空格键监听
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
    carouselTimer = setInterval(nextSlide, 8000); // 8秒自动轮播
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
