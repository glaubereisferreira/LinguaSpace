// js/audioPlayer.js - CORREÇÕES PARA PALAVRAS CURTAS

export class AudioPlayer {
    constructor(audioElementId) {
        this.audio = document.getElementById(audioElementId);
        
        if (!this.audio) {
            throw new Error(`Audio element with id "${audioElementId}" not found`);
        }
        
        // CORREÇÃO 1: Verificar se o arquivo existe antes de definir
        if (!this.audio.src || this.audio.src === '') {
            this.audio.src = 'preview_file.mp3';
            // Adicionar listener para erro de carregamento
            this.audio.addEventListener('error', (e) => {
                console.error('Audio loading error:', e);
                // Tentar arquivo alternativo
                if (this.audio.src.includes('preview_file.mp3')) {
                    console.log('Trying alternative audio file...');
                    this.audio.src = 'audio.mp3';
                }
            }, { once: true });
        }
        
        this.isLooping = false;
        this.loopStart = 0;
        this.loopEnd = 0;
        this.eventListeners = {};
        
        // CORREÇÃO 2: Reduzir timer para capturar palavras curtas
        this.highPrecisionTimer = null;
        this.lastEmittedTime = -1;
        this.timeUpdateThrottle = null;
        this.timeUpdateDelay = 50; // ← REDUZIDO DE 200ms PARA 50ms (20 FPS)
        
        this.setupEventListeners();
        
        if (this.audio.readyState === 0) {
            this.audio.load();
        }
    }

    // CORREÇÃO 3: Otimizar throttle para não perder palavras curtas
    throttledTimeUpdate() {
        if (this.timeUpdateThrottle) return;
        
        this.timeUpdateThrottle = setTimeout(() => {
            this.emitTimeUpdate();
            this.timeUpdateThrottle = null;
        }, 25); // ← REDUZIDO DE 50ms PARA 25ms (~40 FPS)
    }

    // CORREÇÃO 4: Reduzir threshold de emissão
    emitTimeUpdate() {
        const currentTime = this.audio.currentTime;
        
        // CORREÇÃO CRÍTICA: Reduzir threshold para capturar palavras curtas
        if (Math.abs(currentTime - this.lastEmittedTime) > 0.025) { // ← REDUZIDO DE 0.1 PARA 0.025 (25ms)
            this.emit('timeupdate', currentTime);
            this.lastEmittedTime = currentTime;
        }
    }

    // CORREÇÃO 5: Timer de alta precisão otimizado
    startHighPrecisionTimer() {
        if (this.highPrecisionTimer) return;
        
        let frameCount = 0;
        let lastFrameTime = performance.now();
        let skipFrames = 0;
        
        this.highPrecisionTimer = setInterval(() => {
            if (!this.audio.paused) {
                const now = performance.now();
                const frameDelta = now - lastFrameTime;
                
                // CORREÇÃO 6: Sistema adaptativo de frame skip
                if (frameDelta > 100) {
                    // Se o sistema está lento, pular alguns frames
                    skipFrames = Math.min(3, Math.floor(frameDelta / 50));
                } else {
                    skipFrames = Math.max(0, skipFrames - 1);
                }
                
                // Só atualizar se não estiver pulando frames
                if (skipFrames === 0) {
                    this.emitTimeUpdate();
                    this.handleLooping();
                }
                
                lastFrameTime = now;
                frameCount++;
                
                // Log performance apenas se houver problemas graves
                if (frameCount % 200 === 0 && frameDelta > 150) {
                    console.warn(`⚠️ Performance: ${frameDelta.toFixed(0)}ms, skipping ${skipFrames} frames`);
                }
            }
        }, this.timeUpdateDelay); // 50ms = 20 FPS base
    }

    // CORREÇÃO 7: Remover delay desnecessário no loop
    handleLooping() {
        if (this.isLooping && this.currentTime >= this.loopEnd) {
            // Remover timeout desnecessário para resposta mais rápida
            this.pause();
            this.seek(this.loopStart).then(() => {
                this.play();
            });
        }
    }

    // CORREÇÃO 8: Seek otimizado sem verificação de servidor
    async seek(time) {
        const numTime = Number(time);
        if (isNaN(numTime) || !isFinite(numTime)) {
            console.error(`❌ [SEEK] Invalid time: ${time}`);
            return;
        }
        
        const duration = this.audio.duration || 0;
        if (duration <= 0) {
            // Aguardar metadados se ainda não carregados
            await this.waitForReady();
        }
        
        const clampedTime = Math.max(0, Math.min(numTime, this.audio.duration || numTime));
        
        try {
            this.audio.currentTime = clampedTime;
            // Emitir update imediato após seek
            this.emitTimeUpdate();
        } catch (error) {
            console.error('❌ [SEEK] Error:', error);
        }
    }

    // Adicionar método para verificar saúde do player
    getHealthStatus() {
        return {
            isReady: this.audio.readyState >= 2,
            hasAudio: this.audio.src && this.audio.src !== '',
            duration: this.audio.duration,
            currentTime: this.audio.currentTime,
            isPaused: this.audio.paused,
            playbackRate: this.audio.playbackRate,
            volume: this.audio.volume,
            error: this.audio.error
        };
    }
}