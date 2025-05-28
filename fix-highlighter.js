// js/highFrequencyHighlighter.js - OTIMIZADO PARA PERFORMANCE E PALAVRAS CURTAS

import { WordCacheSystem } from './wordCacheSystem.js';

export class HighFrequencyHighlighter {
    constructor(container, audioPlayer) {
        this.container = container;
        this.audioPlayer = audioPlayer;
        this.wordCache = new WordCacheSystem();
        this.elements = [];
        this.currentIndex = -1;
        this.lastTime = -1;
        this.frameCount = 0;
        this.isActive = false;
        
        // CORREÇÃO 1: Taxa adaptativa baseada em performance
        this.trackingIntervalId = null;
        this.animationFrameId = null;
        this.baseUpdateRate = 33; // ~30 FPS base
        this.currentUpdateRate = this.baseUpdateRate;
        this.performanceBuffer = [];
        
        // CORREÇÃO 2: Sistema híbrido RAF + Interval
        this.useRAF = true; // Preferir requestAnimationFrame
        this.lastRAFTime = 0;
    }

    async init(transcript) {
        // Build cache
        this.wordCache.buildCache(transcript);
        
        // Map existing elements
        this.mapExistingElements();
        
        // CORREÇÃO 3: Escolher melhor sistema baseado no navegador
        this.detectBestTrackingMethod();
        
        // Start tracking
        this.startOptimizedTracking();
        
        const stats = this.wordCache.getStats();
        console.log('📊 [HIGHLIGHTER] Initialized:', {
            words: stats.totalWords,
            shortWords: stats.shortWords,
            method: this.useRAF ? 'RAF' : 'Interval'
        });
    }

    detectBestTrackingMethod() {
        // CORREÇÃO 4: Detectar se RAF está funcionando bem
        let rafTest = 0;
        const testRAF = (timestamp) => {
            rafTest++;
            if (rafTest < 60) {
                requestAnimationFrame(testRAF);
            }
        };
        requestAnimationFrame(testRAF);
        
        // Após 1 segundo, verificar se RAF está OK
        setTimeout(() => {
            if (rafTest < 50) { // Menos de 50 FPS, usar interval
                this.useRAF = false;
                console.warn('⚠️ RAF performance poor, using interval');
            }
        }, 1000);
    }

    startOptimizedTracking() {
        // Listeners principais
        this.audioPlayer.on('play', () => {
            this.isActive = true;
            this.startTracking();
        });
        
        this.audioPlayer.on('pause', () => {
            this.isActive = false;
            this.stopTracking();
            this.update(); // Update final
        });
        
        this.audioPlayer.on('seeked', () => {
            this.update(); // Update imediato no seek
        });
        
        // CORREÇÃO 5: Listener de timeupdate como backup
        this.audioPlayer.on('timeupdate', () => {
            if (this.isActive && !this.useRAF) {
                this.update();
            }
        });
    }

    startTracking() {
        if (this.useRAF) {
            this.startRAFTracking();
        } else {
            this.startIntervalTracking();
        }
    }

    stopTracking() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.trackingIntervalId) {
            clearInterval(this.trackingIntervalId);
            this.trackingIntervalId = null;
        }
    }

    // CORREÇÃO 6: Sistema RAF otimizado
    startRAFTracking() {
        const rafLoop = (timestamp) => {
            if (!this.isActive) {
                this.animationFrameId = null;
                return;
            }
            
            // Limitar taxa de atualização
            if (timestamp - this.lastRAFTime >= this.currentUpdateRate) {
                const startUpdate = performance.now();
                
                this.update();
                
                // CORREÇÃO 7: Ajustar taxa baseado em performance
                const updateTime = performance.now() - startUpdate;
                this.adjustUpdateRate(updateTime);
                
                this.lastRAFTime = timestamp;
            }
            
            this.animationFrameId = requestAnimationFrame(rafLoop);
        };
        
        this.animationFrameId = requestAnimationFrame(rafLoop);
    }

    // CORREÇÃO 8: Sistema interval como fallback
    startIntervalTracking() {
        if (this.trackingIntervalId) {
            clearInterval(this.trackingIntervalId);
        }
        
        this.trackingIntervalId = setInterval(() => {
            if (this.isActive) {
                const startUpdate = performance.now();
                
                this.update();
                
                const updateTime = performance.now() - startUpdate;
                this.adjustUpdateRate(updateTime);
            }
        }, this.currentUpdateRate);
    }

    // CORREÇÃO 9: Taxa adaptativa baseada em performance
    adjustUpdateRate(updateTime) {
        this.performanceBuffer.push(updateTime);
        if (this.performanceBuffer.length > 10) {
            this.performanceBuffer.shift();
        }
        
        const avgTime = this.performanceBuffer.reduce((a, b) => a + b, 0) / this.performanceBuffer.length;
        
        if (avgTime > 20) { // Update levando mais de 20ms
            // Reduzir frequência
            this.currentUpdateRate = Math.min(67, this.currentUpdateRate * 1.1);
        } else if (avgTime < 5 && this.currentUpdateRate > this.baseUpdateRate) {
            // Performance boa, aumentar frequência
            this.currentUpdateRate = Math.max(this.baseUpdateRate, this.currentUpdateRate * 0.9);
        }
    }

    // CORREÇÃO 10: Update otimizado com cache melhorado
    update() {
        const currentTime = this.audioPlayer.currentTime;
        
        // Skip se tempo não mudou significativamente
        if (Math.abs(currentTime - this.lastTime) < 0.001) {
            return;
        }
        
        // CORREÇÃO 11: Busca otimizada para palavras curtas
        const wordData = this.wordCache.findWordAtTimeOptimized(currentTime);
        
        if (wordData && wordData.index !== this.currentIndex) {
            // Usar requestAnimationFrame para mudanças visuais
            requestAnimationFrame(() => {
                // Remove highlight anterior
                if (this.currentIndex >= 0 && this.elements[this.currentIndex]) {
                    const prevElement = this.elements[this.currentIndex];
                    prevElement.classList.remove('current', 'short-word-active');
                }
                
                // Adiciona novo highlight
                if (this.elements[wordData.index]) {
                    const element = this.elements[wordData.index];
                    element.classList.add('current');
                    
                    // CORREÇÃO 12: Highlight especial para palavras curtas
                    if (wordData.isShort) {
                        element.classList.add('short-word-active');
                        // Forçar repaint para garantir visibilidade
                        element.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            element.style.transform = '';
                        }, 100);
                    }
                    
                    // Scroll suave
                    this.smoothScrollToElement(element);
                }
                
                this.currentIndex = wordData.index;
            });
        }
        
        this.lastTime = currentTime;
    }

    // CORREÇÃO 13: Scroll otimizado com debounce
    smoothScrollToElement(element) {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        this.scrollTimeout = setTimeout(() => {
            const rect = element.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            
            if (rect.bottom > containerRect.bottom - 100 || rect.top < containerRect.top + 100) {
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }
        }, 100);
    }

    mapExistingElements() {
        this.elements = Array.from(this.container.querySelectorAll('.word'));
        console.log(`📝 [HIGHLIGHTER] Mapped ${this.elements.length} word elements`);
    }

    // Métodos de debug melhorados
    getPerformanceStats() {
        return {
            updateRate: this.currentUpdateRate.toFixed(1) + 'ms',
            method: this.useRAF ? 'RAF' : 'Interval',
            avgUpdateTime: this.performanceBuffer.length > 0 
                ? (this.performanceBuffer.reduce((a, b) => a + b, 0) / this.performanceBuffer.length).toFixed(2) + 'ms'
                : 'N/A',
            isActive: this.isActive,
            currentIndex: this.currentIndex
        };
    }

    destroy() {
        this.isActive = false;
        this.stopTracking();
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        console.log('🗑️ [HIGHLIGHTER] Destroyed');
    }
}