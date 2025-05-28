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
        
        // OPTIMIZATION: Reduced timer frequency and debouncing        this.highPrecisionTimer = null;
        this.lastEmittedTime = -1;
        this.timeUpdateThrottle = null;
        this.timeUpdateDelay = 50; // CRITICAL FIX: Reduced from 100ms to 50ms for short words
        
        // CRITICAL FIX: Add range request diagnostics
        this.audio.addEventListener('loadedmetadata', () => {
            console.log('🔍 Audio metadata loaded - checking seekability...');
            console.log(`📊 Duration: ${this.audio.duration}s`);
            console.log(`📡 Network state: ${this.audio.networkState}`);
            console.log(`📥 Ready state: ${this.audio.readyState}`);
            
            if (this.audio.seekable.length > 0) {
                console.log(`✅ Seekable range: ${this.audio.seekable.start(0)} - ${this.audio.seekable.end(0)}`);
                console.log('✅ Server supports range requests');
            } else {
                console.warn('⚠️ Audio não é seekable! Possível problema com range requests.');
                console.warn('💡 Solução: Use "python -m http.server 8000 --bind localhost"');
            }
        });
        
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
    }    // CRITICAL FIX: Faster throttle for short words
    throttledTimeUpdate() {
        if (this.timeUpdateThrottle) return;
        
        this.timeUpdateThrottle = setTimeout(() => {
            this.emitTimeUpdate();
            this.timeUpdateThrottle = null;
        }, 25); // CRITICAL FIX: Reduced from 16ms to 25ms (~40fps)
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
    }    // CRITICAL FIX: Robust seek with range request validation
    async seek(time) {
        console.log(`\n=== SEEK to ${time}s ===`);
        
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
        console.log(`Seeking from ${this.audio.currentTime}s to ${clampedTime}s`);
        
        // Aguarda o áudio estar pronto
        if (this.audio.readyState < 2) {
            console.log('⏳ Aguardando áudio carregar...');
            await new Promise(resolve => {
                const handler = () => {
                    this.audio.removeEventListener('canplay', handler);
                    resolve();
                };
                this.audio.addEventListener('canplay', handler, { once: true });
            });
        }
        
        // Verifica se o áudio é seekable
        if (this.audio.seekable.length === 0) {
            console.error('❌ Áudio não é seekable! O servidor deve suportar range requests.');
            console.error('💡 Tente usar: python -m http.server 8000 --bind localhost');
            return;
        } else {
            console.log(`✅ Seekable range: ${this.audio.seekable.start(0)} - ${this.audio.seekable.end(0)}`);
        }
        
        // Pausa antes do seek (às vezes ajuda com range requests)
        const wasPlaying = !this.audio.paused;
        if (wasPlaying) {
            this.audio.pause();
        }
        
        try {
            // Faz o seek
            this.audio.currentTime = clampedTime;
            
            // Aguarda o seek completar
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 20; // 1 segundo total
                
                const checkSeek = () => {
                    attempts++;
                    const currentTime = this.audio.currentTime;
                    const timeDiff = Math.abs(currentTime - clampedTime);
                    
                    console.log(`Attempt ${attempts}: currentTime=${currentTime}, target=${clampedTime}, diff=${timeDiff}`);
                    
                    if (timeDiff < 0.5) { // Tolerância de 0.5s
                        console.log(`✅ Seek sucesso: ${currentTime}s (target: ${clampedTime}s)`);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        console.error(`❌ Seek falhou após ${maxAttempts} tentativas`);
                        reject(new Error('Seek timeout'));
                    } else {
                        setTimeout(checkSeek, 50);
                    }
                };
                
                setTimeout(checkSeek, 50);
            });
            
            // Resume se estava tocando
            if (wasPlaying) {
                await this.play();
            }
            
        } catch (error) {
            console.error('❌ [SEEK] Error during seek operation:', error);
        }
        
        console.log(`Final time: ${this.audio.currentTime}s`);
        console.log(`=== END SEEK ===\n`);
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
        
        // CRITICAL FIX: Reduce threshold for short words highlighting
        if (Math.abs(currentTime - this.lastEmittedTime) > 0.025) { // Reduced from 0.05 to 0.025 (25ms)
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