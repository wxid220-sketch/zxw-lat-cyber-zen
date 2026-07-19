// 赛博木鱼交互、音效合成与高阶特效逻辑

// 功德增加词库 (金色/绿色/橙色)
const POSITIVE_PHRASES = [
    { text: '功德 +1', color: '#ffd700' },
    { text: '福报 +1', color: '#00e676' },
    { text: '财运 +88', color: '#ff9100' },
    { text: '智商 +1', color: '#00b0ff' },
    { text: '桃花 +99', color: '#ff4081' },
    { text: '头发 +10', color: '#a1a1a1' },
    { text: '快乐 +1', color: '#ffeb3b' }
];

// 烦恼递减词库 (红色/粉红，用户期待的有趣的 -1 减量符号)
const NEGATIVE_PHRASES = [
    { text: '压力 -1', color: '#ff2a5f' },
    { text: '烦恼 -1', color: '#ff2a5f' },
    { text: '焦虑 -1', color: '#ff5f56' },
    { text: 'Bug -1', color: '#ff2a5f' },
    { text: '水逆 -1', color: '#ff5f56' },
    { text: '脂肪 -1', color: '#00e676' },
    { text: '疲惫 -1', color: '#ff2a5f' },
    { text: '穷气 -1', color: '#ffd700' }
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

// 全局变量
let meritCount = parseInt(localStorage.getItem('merit_count') || '0', 10);
let audioCtx = null;
let meritMultiplier = 1; // 功德加成倍率
let isIncensing = false;  // 是否正在上香

// 初始化显示
meritValEl.textContent = meritCount.toLocaleString();
updateZenRank(meritCount);

// 功德身份评级更新函数
function updateZenRank(count) {
    const rank = ZEN_RANKS.find(r => count < r.limit);
    if (rank) {
        zenRankEl.textContent = rank.name;
    }
}

// Web Audio API 声音合成函数 (单例重构)
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
        
        // 模拟沉稳木鱼敲击声
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
    
    // 累加功德值 (支持香炉的翻倍加成)
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

    // 木鱼微缩形变回弹
    svgPath.style.transform = 'scale(0.92)';
    setTimeout(() => {
        svgPath.style.transform = 'scale(1)';
    }, 60);
    
    // 获取相对定位坐标
    const rect = woodfishBtn.getBoundingClientRect();
    let x, y;
    if (clientX !== undefined && clientY !== undefined) {
        x = clientX - rect.left;
        y = clientY - rect.top;
    } else {
        x = rect.width / 2;
        y = rect.height / 2 - 20;
    }

    // 1. 特效：生成飘字气泡 (对称飞散：一个功德+1偏右，一个烦恼-1偏左)
    createDoubleFloatingText(x, y);

    // 2. 特效：溅射金光闪烁粒子 (爆发打击感)
    createSparkles(x, y);
}

// 双飘字效果 (增加幽默感与可读性)
function createDoubleFloatingText(x, y) {
    const posWord = POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)];
    const negWord = NEGATIVE_PHRASES[Math.floor(Math.random() * NEGATIVE_PHRASES.length)];

    // 1. 生成正向词 (功德+1等，偏右轨道)
    const elPos = document.createElement('div');
    elPos.className = 'floating-text';
    elPos.textContent = posWord.text;
    elPos.style.color = posWord.color;
    elPos.style.left = `${x}px`;
    elPos.style.top = `${y}px`;
    const rightOffset = 25 + Math.random() * 20; // 偏右 25px 到 45px
    elPos.style.setProperty('--random-x', `${rightOffset}px`);
    floatingContainer.appendChild(elPos);

    // 2. 生成负向词 (烦恼-1等，偏左轨道)
    const elNeg = document.createElement('div');
    elNeg.className = 'floating-text';
    elNeg.textContent = negWord.text;
    elNeg.style.color = negWord.color;
    elNeg.style.left = `${x}px`;
    elNeg.style.top = `${y}px`;
    const leftOffset = -(25 + Math.random() * 20); // 偏左 25px 到 45px
    elNeg.style.setProperty('--random-x', `${leftOffset}px`);
    floatingContainer.appendChild(elNeg);

    // 自动销毁
    setTimeout(() => {
        elPos.remove();
        elNeg.remove();
    }, 850);
}

// 金光四射粒子特效
function createSparkles(x, y) {
    const particleCount = 12; // 溅射粒子数
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'sparkle-particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // 随机极坐标溅射距离与方向
        const angle = Math.random() * Math.PI * 2;
        const velocity = 35 + Math.random() * 45; // 溅射半径 35px 到 80px
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);
        
        floatingContainer.appendChild(particle);
        
        // 自动销毁
        setTimeout(() => {
            particle.remove();
        }, 750);
    }
}

// 电子香炉敬香逻辑
incensePot.addEventListener('click', () => {
    if (isIncensing) return; // 正在敬香时不再重复触发
    
    isIncensing = true;
    meritMultiplier = 2; // 功德获取速率翻倍
    incensePot.classList.add('active');
    incenseHint.textContent = '🔥 敬香中：心澄神明，功德获取速率 x2 倍！';
    incenseHint.style.color = '#ffd700';

    // 激活 AudioContext 兼容
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // 30 秒后香燃尽
    setTimeout(() => {
        incensePot.classList.remove('active');
        meritMultiplier = 1;
        isIncensing = false;
        incenseHint.textContent = '🏮 香烛已燃尽，可再次敬香积累福报';
        incenseHint.style.color = 'var(--text-secondary)';
    }, 30000);
});

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
