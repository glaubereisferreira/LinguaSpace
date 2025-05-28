// Audio Player Module - Optimized Version
export class AudioPlayer {
    constructor(audioElementId) {
        this.audio = document.getElementById(audioElementId);
        
        if (!this.audio) {
            throw new Error(`Audio element with id "${audioElementId}" not found`);
        }
        
        if (!this.audio.src || this.audio.src === '') {
            this.audio.src = 'preview_file.mp3';
        }
        
        this.isLooping = false;
        this.loopStart = 0;
        this.loopEnd = 0;
        this.eventListeners = {};
          // OPTIMIZATION: Increased timer frequency and debouncing
        this.highPrecisionTimer = null;
        this.lastEmittedTime = -1;
        this.timeUpdateThrottle = null;
        this.timeUpdateDelay = 200; // Increased to 200ms for better INP
        
        this.setupEventListeners();
        
        if (this.audio.readyState === 0) {
            this.audio.load();
        }
    }

    setupEventListeners() {
        // OPTIMIZATION: Use passive listeners where possible
        this.audio.addEventListener('play', () => {
            this.startHighPrecisionTimer();
            this.emit('play');
        }, { passive: true });

        this.audio.addEventListener('pause', () => {
            this.stopHighPrecisionTimer();
            this.emit('pause');
        }, { passive: true });

        this.audio.addEventListener('ended', () => {
            this.stopHighPrecisionTimer();
            this.emit('ended');
        }, { passive: true });

        // OPTIMIZATION: Throttle timeupdate events
        this.audio.addEventListener('timeupdate', () => {
            this.throttledTimeUpdate();
            this.handleLooping();
        }, { passive: true });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.emit('error', e);
        }, { passive: true });

        this.audio.addEventListener('loadedmetadata', () => {
            this.emit('loadedmetadata');
        }, { passive: true });

        this.audio.addEventListener('canplay', () => {
            this.emit('canplay');
        }, { passive: true });

        this.audio.addEventListener('seeking', () => {
            this.emit('seeking');
        }, { passive: true });

        this.audio.addEventListener('seeked', () => {
            this.emit('seeked');
        }, { passive: true });
    }    // OPTIMIZATION: Aggressive throttle to prevent INP issues
    throttledTimeUpdate() {
        if (this.timeUpdateThrottle) return;
        
        this.timeUpdateThrottle = setTimeout(() => {
            this.emitTimeUpdate();
            this.timeUpdateThrottle = null;
        }, 50); // Reduced to ~20fps for better INP
    }

    // Event emitter methods
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, ...args) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(...args));
        }
    }

    // Audio control methods
    get currentTime() {
        return this.audio.currentTime;
    }

    get duration() {
        return this.audio.duration;
    }

    get volume() {
        return this.audio.volume;
    }

    set volume(value) {
        this.audio.volume = Math.max(0, Math.min(1, value));
    }

    async play() {
        try {
            await this.audio.play();
        } catch (error) {
            console.error('🎮 [AUDIO] Error playing audio:', error);
        }
    }

    pause() {
        this.audio.pause();
    }

    togglePlayPause() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    isSeekable() {
        try {
            const seekable = this.audio.seekable;
            return seekable.length > 0;
        } catch (error) {
            console.error('❌ [SEEKABLE] Error checking seekable ranges:', error);
            return false;
        }
    }

    // OPTIMIZATION: Remove server check for each seek
    async seek(time) {
        const numTime = Number(time);
        if (isNaN(numTime) || !isFinite(numTime)) {
            console.error(`❌ [SEEK] Invalid time: ${time}`);
            return;
        }
        
        const duration = this.audio.duration || 0;
        if (duration <= 0) {
            console.error(`❌ [SEEK] Invalid duration: ${duration}`);
            return;
        }
        
        const clampedTime = Math.max(0, Math.min(numTime, duration));
        
        if (this.audio.readyState < 2) {
            await new Promise(resolve => {
                const handler = () => {
                    this.audio.removeEventListener('loadeddata', handler);
                    resolve();
                };
                this.audio.addEventListener('loadeddata', handler);
            });
        }
        
        try {
            this.audio.currentTime = clampedTime;
        } catch (error) {
            console.error('❌ [SEEK] Error during seek operation:', error);
        }
    }

    async jump(seconds) {
        const newTime = this.currentTime + seconds;
        await this.seek(Math.max(0, Math.min(newTime, this.duration)));
    }

    setPlaybackRate(rate) {
        this.audio.playbackRate = rate;
    }

    setLoop(start, end) {
        this.isLooping = true;
        this.loopStart = start;
        this.loopEnd = end;
    }

    clearLoop() {
        this.isLooping = false;
        this.loopStart = 0;
        this.loopEnd = 0;
    }

    // OPTIMIZATION: Debounce loop handling
    handleLooping() {
        if (this.isLooping && this.currentTime >= this.loopEnd) {
            if (this.loopTimeout) return; // Prevent multiple triggers
            
            this.loopTimeout = setTimeout(() => {
                this.pause();
                this.seek(this.loopStart).then(() => {
                    this.play();
                    this.loopTimeout = null;
                });
            }, 100); // Reduced from 1000ms
        }
    }

    async seekToPercentage(percentage) {
        const time = (percentage / 100) * this.duration;
        await this.seek(time);
    }

    waitForReady() {
        return new Promise((resolve) => {
            if (this.audio.readyState >= 2 && this.audio.duration > 0) {
                resolve();
            } else {
                this.audio.addEventListener('canplay', resolve, { once: true });
            }
        });
    }

    // OPTIMIZATION: Increased interval and added performance monitoring
    startHighPrecisionTimer() {
        if (this.highPrecisionTimer) return;
        
        let frameCount = 0;
        let lastFrameTime = performance.now();
        
        this.highPrecisionTimer = setInterval(() => {
            if (!this.audio.paused) {
                const now = performance.now();
                const frameDelta = now - lastFrameTime;
                
                // Skip frame if system is too slow
                if (frameDelta < 200) { // Only update if less than 200ms passed
                    this.emitTimeUpdate();
                    this.handleLooping();
                }
                
                lastFrameTime = now;
                frameCount++;
                
                // Log performance warning every 100 frames
                if (frameCount % 100 === 0 && frameDelta > 100) {
                    console.warn(`⚠️ Performance warning: Frame took ${frameDelta.toFixed(2)}ms`);
                }
            }
        }, this.timeUpdateDelay); // Using 100ms instead of 50ms
    }

    stopHighPrecisionTimer() {
        if (this.highPrecisionTimer) {
            clearInterval(this.highPrecisionTimer);
            this.highPrecisionTimer = null;
        }
    }    emitTimeUpdate() {
        const currentTime = this.audio.currentTime;
        
        // OPTIMIZATION: Much higher threshold to reduce INP impact
        if (Math.abs(currentTime - this.lastEmittedTime) > 0.1) { // Increased to 100ms threshold
            this.emit('timeupdate', currentTime);
            this.lastEmittedTime = currentTime;
        }
    }

    // Cleanup method
    destroy() {
        this.stopHighPrecisionTimer();
        if (this.timeUpdateThrottle) {
            clearTimeout(this.timeUpdateThrottle);
        }
        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
        }
    }
}