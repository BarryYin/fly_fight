/**
 * 游戏音效系统
 */
class SoundSystem {
    constructor() {
        // 音频上下文
        this.audioContext = null;
        // 音效缓存
        this.soundCache = new Map();
        // 是否启用音效
        this.enabled = true;
        
        // 音效配置
        this.sounds = {
            'shoot': { url: 'sounds/laser1.mp3', volume: 0.3 },
            'enemy_shoot': { url: 'sounds/laser2.mp3', volume: 0.2 },
            'hit': { url: 'sounds/hit.mp3', volume: 0.5 },
            'explosion': { url: 'sounds/explosion.mp3', volume: 0.6 },
            'drone_loop': { url: 'sounds/drone_loop.mp3', volume: 0.15, loop: true },
            'warning': { url: 'sounds/warning.mp3', volume: 0.4 }
        };
        
        // 初始化
        this.init();
    }
    
    init() {
        try {
            // 创建音频上下文
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // 监听用户交互事件来解锁音频
            const unlockAudio = () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                document.body.removeEventListener('click', unlockAudio);
                document.body.removeEventListener('touchstart', unlockAudio);
            };
            
            document.body.addEventListener('click', unlockAudio);
            document.body.addEventListener('touchstart', unlockAudio);
            
            console.log('音效系统初始化成功');
        } catch (e) {
            console.error('音效系统初始化失败:', e);
            this.enabled = false;
        }
    }
    
    async loadSound(name) {
        if (!this.enabled || !this.audioContext) return null;
        
        const soundConfig = this.sounds[name];
        if (!soundConfig) {
            console.error(`未知的音效: ${name}`);
            return null;
        }
        
        if (this.soundCache.has(name)) {
            return this.soundCache.get(name);
        }
        
        try {
            const response = await fetch(soundConfig.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.soundCache.set(name, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`加载音效 ${name} 失败:`, error);
            return null;
        }
    }
    
    async play(name, options = {}) {
        if (!this.enabled || !this.audioContext) return null;
        
        const buffer = await this.loadSound(name);
        if (!buffer) return null;
        
        const soundConfig = this.sounds[name];
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        // 音量控制
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = options.volume !== undefined ? options.volume : soundConfig.volume;
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // 循环播放
        if (options.loop !== undefined ? options.loop : soundConfig.loop) {
            source.loop = true;
        }
        
        // 播放
        source.start(0);
        
        return {
            source,
            gainNode,
            stop: () => source.stop()
        };
    }
    
    stopAll() {
        // 这个方法需要你跟踪所有播放中的音效
        // 由于实现复杂度，这里只是一个占位符
        console.log('停止所有音效');
    }
    
    setMasterVolume(volume) {
        // 如果需要主音量控制，可以在这里实现
        console.log(`设置主音量: ${volume}`);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopAll();
        }
        return this.enabled;
    }
}

// 创建全局音效系统实例
const soundSystem = new SoundSystem();
