const audio = document.getElementById('audioSource');
const togglePlayBtn = document.getElementById('togglePlay');
const playIcon = document.getElementById('playIcon');
const progressBar = document.getElementById('progressBar');
const volumeBar = document.getElementById('volumeBar');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');
const canvas = document.getElementById('equalizer');
const ctx = canvas.getContext('2d');

let audioCtx, analyser, dataArray, bufferLength;
let isContextInitialized = false;

// 初始化音訊解析器
function initAudioAnalyzer() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    // 設定為 64，會產生 32 根柱子，拿來做山形左右對稱（左16根、右16根）視覺效果最好
    analyser.fftSize = 64; 
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    isContextInitialized = true;
}

// 播放 / 暫停 切換
togglePlayBtn.addEventListener('click', () => {
    if (!isContextInitialized) {
        initAudioAnalyzer();
        resizeCanvas();
        drawEqualizer();
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (audio.paused) {
        audio.play();
        playIcon.className = 'fas fa-pause';
    } else {
        audio.pause();
        playIcon.className = 'fas fa-play';
    }
});

// 音量控制
volumeBar.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

// 同步進度條最大值
audio.addEventListener('loadedmetadata', () => {
    progressBar.max = Math.floor(audio.duration);
    durationTimeEl.innerText = formatTime(audio.duration);
});

// 播放時同步更新時間與進度條
audio.addEventListener('timeupdate', () => {
    if (!isChangingProgress) {
        progressBar.value = Math.floor(audio.currentTime);
    }
    currentTimeEl.innerText = formatTime(audio.currentTime);
});

// 讓用戶可以拖動進度條
let isChangingProgress = false;
progressBar.addEventListener('mousedown', () => isChangingProgress = true);
progressBar.addEventListener('mouseup', () => {
    audio.currentTime = progressBar.value;
    isChangingProgress = false;
});
progressBar.addEventListener('change', () => {
    audio.currentTime = progressBar.value;
});

function formatTime(secs) {
    let min = Math.floor(secs / 60);
    let sec = Math.floor(secs % 60);
    return `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
}
window.addEventListener('resize', resizeCanvas);


// 核心：繪製「山形、中間最高、左右對稱」的格子狀音波動畫
function drawEqualizer() {
    requestAnimationFrame(drawEqualizer);
    
    analyser.getByteFrequencyData(dataArray);
    
    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 1.3; // 柱子寬度
    const gap = (canvas.width / bufferLength) * 0.25;     // 柱子間距
    const blockHeight = 5;                                // 單個方格的高度
    const blockGap = 3;                                   // 方格與方格的垂直間距
    
    // 2. 【置中魔法：計算水平偏移量】
    // 算出所有柱子加起來的總寬度，並用畫布總寬度去減，除以 2 就是左邊該留白的距離
    const totalBarsWidth = (barWidth + gap) * bufferLength - gap;
    const offsetX = (canvas.width - totalBarsWidth) / 2;
    
    // 3. 【山形魔法演算法】
    let mountainArray = new Array(bufferLength);
    let mid = Math.floor(bufferLength / 2);
    
    for (let i = 0; i < bufferLength; i++) {
        if (i % 2 === 0) {
            mountainArray[mid + Math.floor(i / 2)] = dataArray[i];
        } else {
            mountainArray[mid - 1 - Math.floor(i / 2)] = dataArray[i];
        }
    }
    
    // 4. 開始繪製
    for (let i = 0; i < bufferLength; i++) {
        let value = mountainArray[i] || 0;
        
        let distanceFromCenter = Math.abs(i - mid);
        let factor = 1 - (distanceFromCenter / mid) * 0.6; // 越往兩側壓得越低
        
        let percent = (value / 255) * factor;
        let targetHeight = canvas.height * percent * 0.6;
        
        let blocksCount = Math.floor(targetHeight / (blockHeight + blockGap));
        
        // 【核心修正】在計算 X 軸座標時，強制加上剛剛算好的置中偏移量 offsetX
        let x = offsetX + i * (barWidth + gap);
        
        // 從下往上畫方格
        for (let j = 0; j < blocksCount; j++) {
            let y = canvas.height - (j * (blockHeight + blockGap)) - blockHeight;
            
            // 橘紅色發光印刷感
            ctx.fillStyle = 'rgba(211, 47, 47, 0.9)'; 
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#d32f2f';
            
            ctx.fillRect(x, y, barWidth, blockHeight);
        }
        ctx.shadowBlur = 0; // 重設陰影
    }
}