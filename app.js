// 赛博木鱼交互与声音合成逻辑

// 功德词库，结合了流行网络幽默与禅意祝福
const MERIT_PHRASES = [
    { text: '功德 +1', color: '#ffd700' }, // 金色
    { text: '烦恼 -1', color: '#bc13fe' }, // 紫色
    { text: '暴富 +100', color: '#00e676' }, // 绿色
    { text: '发财 +88', color: '#ff9100' },  // 橙色
    { text: '上香 +1', color: '#ff2a5f' },  // 红色
    { text: '焦虑 -999', color: '#00b0ff' }, // 蓝色
    { text: '桃花 +99', color: '#ff4081' },  // 粉色
    { text: '运势 +999', color: '#ffd700' }, // 金色
    { text: '功德 +1', color: '#ffd700' },
    { text: '快乐 +1', color: '#ffeb3b' },  // 黄色
    { text: '心平气和', color: '#bc13fe' },
    { text: '水逆退散', color: '#ff2a5f' }
];

// 初始化 DOM 元素
const meritValEl = document.getElementById('merit-val');
const woodfishBtn = document.getElementById('woodfish-btn');
const floatingContainer = document.getElementById('floating-container');
const svgPath = document.querySelector('.woodfish-svg');

// 初始化功德计数
let meritCount = parseInt(localStorage.getItem('merit_count') || '0', 10);
meritValEl.textContent = meritCount.toLocaleString();

let audioCtx = null;

// Web Audio API 声音合成函数 (纯代码合成木鱼敲击声)
function playWoodfishSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        
        // 激活挂起的 AudioContext (针对 iOS Safari/微信等移动端浏览器的关键兼容性处理)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // 模拟木鱼声音：基础频率在 180Hz 左右，快速指数级下降
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
        
        // 音量包络线：极快起音，并在 0.15 秒内指数衰减
        gainNode.gain.setValueAtTime(1.0, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        
        osc.start(now);
        osc.stop(now + 0.15);
    } catch (e) {
        console.warn('Audio Context failed to start (interaction needed first):', e);
    }
}

// 核心敲击执行器
function triggerWoodfish(clientX, clientY) {
    // 1. 播放声音
    playWoodfishSound();
    
    // 2. 计数累加并保存
    meritCount += 1;
    localStorage.setItem('merit_count', meritCount);
    
    // 3. 伴随数字放大动画更新界面
    meritValEl.textContent = meritCount.toLocaleString();
    meritValEl.style.transform = 'scale(1.12)';
    setTimeout(() => {
        meritValEl.style.transform = 'scale(1)';
    }, 80);

    // 4. 触发木鱼微缩回弹动画
    svgPath.style.transform = 'scale(0.92)';
    setTimeout(() => {
        svgPath.style.transform = 'scale(1)';
    }, 60);
    
    // 5. 生成飘字效果
    createFloatingText(clientX, clientY);
}

// 生成漂浮飘字
function createFloatingText(clientX, clientY) {
    const rect = woodfishBtn.getBoundingClientRect();
    let x, y;
    
    // 如果传入了坐标，则飘在鼠标点击的相对位置；否则默认飘在木鱼中心上方
    if (clientX !== undefined && clientY !== undefined) {
        x = clientX - rect.left;
        y = clientY - rect.top;
    } else {
        x = rect.width / 2;
        y = rect.height / 2 - 20;
    }
    
    // 随机选出词句
    const phraseObj = MERIT_PHRASES[Math.floor(Math.random() * MERIT_PHRASES.length)];
    
    const floatingEl = document.createElement('div');
    floatingEl.className = 'floating-text';
    floatingEl.textContent = phraseObj.text;
    floatingEl.style.color = phraseObj.color;
    floatingEl.style.left = `${x}px`;
    floatingEl.style.top = `${y}px`;
    
    // 稍微加点随机的水平漂浮偏移，使得重叠敲击时看起来更灵动
    const randomOffset = (Math.random() - 0.5) * 40;
    floatingEl.style.setProperty('--random-x', `${randomOffset}px`);
    
    floatingContainer.appendChild(floatingEl);
    
    // 动画播放完后销毁 DOM 节点
    setTimeout(() => {
        floatingEl.remove();
    }, 850);
}

// 鼠标/触屏点击事件监听
woodfishBtn.addEventListener('click', (e) => {
    // 传入点击坐标
    triggerWoodfish(e.clientX, e.clientY);
});

// 键盘空格键监听
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        // 防止按空格键时页面向下滚动
        e.preventDefault();
        
        // 模拟无坐标触发（从中心升起飘字）
        triggerWoodfish();
    }
});
