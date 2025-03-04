// 音效系统

class AudioManager {
    constructor() {
        this.enabled = true;
        this.soundsLoaded = false;
        this.volume = 0.5;
        
        this.sounds = {
            shot: null,
            explosion: null,
            hit: null,
            engineLoop: null
        };
        
        this.loadSounds();
    }
    
    loadSounds() {
        // 创建音频上下文
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API不受支持，将禁用音效');
            this.enabled = false;
            return;
        }
        
        // 加载音效
        this.loadSound('shot', 'sounds/laser.mp3');
        this.loadSound('explosion', 'sounds/explosion.mp3');
        this.loadSound('hit', 'sounds/hit.mp3');
        this.loadSound('engineLoop', 'sounds/engine_loop.mp3', true);
        
        // 为按下任意键解锁音频添加事件监听
        document.addEventListener('click', () => this.unlockAudio(), { once: true });
        document.addEventListener('keydown', () => this.unlockAudio(), { once: true });
    }
    
    loadSound(name, url, loop = false) {
        if (!this.enabled) return;
        
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.sounds[name] = {
                    buffer: audioBuffer,
                    loop: loop
                };
                console.log(`音效已加载: ${name}`);
                
                // 检查所有音效是否已加载
                if (Object.values(this.sounds).every(sound => sound !== null)) {
                    this.soundsLoaded = true;
                    console.log('所有音效已加载');
                }
            })
            .catch(error => console.error(`加载音效失败 ${name}:`, error));
    }
    
    unlockAudio() {
        if (!this.enabled || !this.audioContext) return;
        
        // 创建一个空白音频缓冲区
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
        
        console.log('音频已解锁');
        
        // 恢复音频上下文
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('AudioContext已恢复');
            });
        }
    }
    
    playSound(name) {
        if (!this.enabled || !this.soundsLoaded || !this.sounds[name]) return;
        
        // 确保音频上下文处于运行状态
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // 创建音源
        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds[name].buffer;
        source.loop = this.sounds[name].loop;
        
        // 创建音量控制
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.volume;
        
        // 连接节点
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // 播放音效
        source.start();
        
        return { source, gainNode };
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
}

// 创建全局音频管理器实例
const audioManager = new AudioManager();
