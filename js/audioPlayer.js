// Audio Player Module - Fixed Version with Proper Seek and Performance
export class AudioPlayer {
    constructor(audioElementId) {
        this.audio = document.getElementById(audioElementId);
        
        if (!this.audio) {
            throw new Error(`Audio element with id "${audioElementId}" not found`);
        }
        
        // Force proper audio source
        if (!this.audio.src || this.audio.src === '') {
            this.audio.src = 'preview_file.mp3';
        }

        // Preload audio via fetch to ensure seeking works even if the server
        // does not support HTTP range requests. This creates an Object URL so
        // all seeking happens against a fully buffered file.
        this.preloadAudio();
        
        this.isLooping = false;
        this.loopStart = 0;
        this.loopEnd = 0;
        this.eventListeners = {};
        
        // Performance optimization
        this.lastEmittedTime = -1;
        this.rafId = null;
        this.isTracking = false;
        
        // Audio state
        this.isReady = false;
        this.isSeeking = false;
        
        this.setupEventListeners();
        this.ensureAudioReady();
    }

    async preloadAudio() {
        const src = this.audio.src;
        if (!src) return;
        try {
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio: ${response.status}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            this.audio.src = url;
            this.audio.load();
        } catch (error) {
            console.warn('Audio preloading failed:', error);
        }
    }

    ensureAudioReady() {
        // Force load the audio
        this.audio.load();
        
        // Set up ready state monitoring
        const checkReady = () => {
            if (this.audio.readyState >= 2) {
                this.isReady = true;
                console.log('✅ Audio is ready for playback');
                this.emit('ready');
            } else {
                setTimeout(checkReady, 100);
            }
        };
        
        checkReady();
    }

    setupEventListeners() {
        // Core audio events
        this.audio.addEventListener('loadeddata', () => {
            this.isReady = true;
            console.log('Audio loaded, duration:', this.audio.duration);
            this.emit('loadeddata');
        });

        this.audio.addEventListener('loadedmetadata', () => {
            console.log('Metadata loaded, duration:', this.audio.duration);
            this.emit('loadedmetadata');
        });

        this.audio.addEventListener('canplay', () => {
            this.isReady = true;
            this.emit('canplay');
        });

        this.audio.addEventListener('play', () => {
            this.startTracking();
            this.emit('play');
        });

        this.audio.addEventListener('pause', () => {
            this.stopTracking();
            this.emit('pause');
        });

        this.audio.addEventListener('ended', () => {
            this.stopTracking();
            this.emit('ended');
        });

        this.audio.addEventListener('seeking', () => {
            this.isSeeking = true;
            this.emit('seeking');
        });

        this.audio.addEventListener('seeked', () => {
            this.isSeeking = false;
            this.emit('seeked');
            // Force time update after seek
            this.emitTimeUpdate();
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.emit('error', e);
        });

        // Native timeupdate as backup
        this.audio.addEventListener('timeupdate', () => {
            if (!this.isTracking) {
                this.emitTimeUpdate();
            }
        });
    }

    // Optimized tracking using requestAnimationFrame
    startTracking() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        
        const track = () => {
            if (!this.isTracking) return;
            
            this.emitTimeUpdate();
            
            // Handle looping
            if (this.isLooping && this.audio.currentTime >= this.loopEnd) {
                this.audio.currentTime = this.loopStart;
            }
            
            this.rafId = requestAnimationFrame(track);
        };
        
        this.rafId = requestAnimationFrame(track);
    }

    stopTracking() {
        this.isTracking = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    emitTimeUpdate() {
        const currentTime = this.audio.currentTime;
        
        // Emit only if time changed significantly (10ms threshold)
        if (Math.abs(currentTime - this.lastEmittedTime) > 0.01) {
            this.emit('timeupdate', currentTime);
            this.lastEmittedTime = currentTime;
        }
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
        return this.audio.duration || 0;
    }

    get volume() {
        return this.audio.volume;
    }

    set volume(value) {
        this.audio.volume = Math.max(0, Math.min(1, value));
    }

    async play() {
        try {
            // Wait for audio to be ready
            if (!this.isReady) {
                await this.waitForReady();
            }
            
            await this.audio.play();
        } catch (error) {
            console.error('Error playing audio:', error);
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

    async seek(time) {
        const numTime = Number(time);
        if (isNaN(numTime) || !isFinite(numTime)) {
            console.error(`Invalid seek time: ${time}`);
            return;
        }

        // Ensure the audio element is ready before attempting to seek
        if (!this.isReady) {
            console.log('Waiting for audio to be ready before seeking...');
            await this.waitForReady();
        }

        const duration = this.duration;
        if (duration <= 0) {
            console.error(`Cannot seek - invalid duration: ${duration}`);
            return;
        }

        const target = Math.max(0, Math.min(numTime, duration));

        console.log(`Seeking to ${target.toFixed(2)}s (duration: ${duration.toFixed(2)}s)`);

        try {
            const wasPlaying = !this.audio.paused;

            // Pause playback while seeking to avoid glitches
            if (wasPlaying) {
                this.pause();
            }

            // Use fastSeek when available for better accuracy
            if (typeof this.audio.fastSeek === 'function') {
                this.audio.fastSeek(target);
            } else {
                this.audio.currentTime = target;
            }

            // Wait until the audio element reports the correct time
            await this.waitForSeekCompletion(target);

            // Resume playback if it was previously playing
            if (wasPlaying) {
                await this.play();
            }

            this.emitTimeUpdate();

            console.log(`Seek completed. Current time: ${this.audio.currentTime.toFixed(2)}s`);
        } catch (error) {
            console.error('Error during seek:', error);
        }
    }

    waitForSeekCompletion(targetTime) {
        return new Promise((resolve, reject) => {
            const maxAttempts = 20;
            let attempts = 0;

            const onSeeked = () => check(true);

            const check = (fromEvent = false) => {
                const diff = Math.abs(this.audio.currentTime - targetTime);
                if (diff < 0.05) {
                    cleanup();
                    resolve();
                } else if (attempts >= maxAttempts) {
                    cleanup();
                    reject(new Error('Seek timeout'));
                } else if (!fromEvent) {
                    attempts++;
                    setTimeout(check, 100);
                }
            };

            const cleanup = () => {
                this.audio.removeEventListener('seeked', onSeeked);
            };

            this.audio.addEventListener('seeked', onSeeked);
            check();
        });
    }

    async jump(seconds) {
        const targetTime = this.currentTime + seconds;
        console.log(`Jumping ${seconds}s: ${this.currentTime.toFixed(2)}s -> ${targetTime.toFixed(2)}s`);
        await this.seek(targetTime);
    }

    async seekToPercentage(percentage) {
        const time = (percentage / 100) * this.duration;
        await this.seek(time);
    }

    setPlaybackRate(rate) {
        this.audio.playbackRate = rate;
    }

    setLoop(start, end) {
        this.isLooping = true;
        this.loopStart = start;
        this.loopEnd = end;
        console.log(`Loop set: ${start.toFixed(2)}s - ${end.toFixed(2)}s`);
    }

    clearLoop() {
        this.isLooping = false;
        this.loopStart = 0;
        this.loopEnd = 0;
        console.log('Loop cleared');
    }

    waitForReady() {
        return new Promise((resolve) => {
            if (this.isReady && this.audio.readyState >= 2) {
                resolve();
            } else {
                const handler = () => {
                    this.audio.removeEventListener('canplay', handler);
                    this.isReady = true;
                    resolve();
                };
                this.audio.addEventListener('canplay', handler, { once: true });
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    this.audio.removeEventListener('canplay', handler);
                    resolve();
                }, 5000);
            }
        });
    }

    // Cleanup
    destroy() {
        this.stopTracking();
        this.eventListeners = {};
    }
}
