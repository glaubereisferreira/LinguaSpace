// High Frequency Transcript Highlighter - Inspired by ElevenLabs approach
import { WordCacheSystem } from './wordCacheSystem.js';

export class HighFrequencyHighlighter {    constructor(container, audioPlayer) {
        this.container = container;
        this.audioPlayer = audioPlayer;
        this.wordCache = new WordCacheSystem();
        this.elements = [];
        this.currentIndex = -1;
        this.lastTime = -1;
        this.frameCount = 0;
        this.isActive = false;
        
        // Optimized tracking - single system only
        this.trackingIntervalId = null;
        this.optimizedUpdateRate = 67; // ~15 FPS (67ms)
    }    async init(transcript) {
        // Build cache
        this.wordCache.buildCache(transcript);
        
        // Map existing elements from TranscriptRenderer  
        this.mapExistingElements();
        
        // Start optimized tracking system
        this.startOptimizedTracking();
        
        // Log stats (reduced logging)
        const stats = this.wordCache.getStats();
        console.log('📊 [HIGHLIGHTER] Cache ready:', stats.totalWords, 'words');
    }    mapExistingElements() {
        // Map existing elements instead of creating new ones
        this.elements = [];
        const existingWords = this.container.querySelectorAll('.word');
        
        existingWords.forEach((element, index) => {
            this.elements[index] = element;
        });
    }

    startOptimizedTracking() {
        // Single optimized tracking system at ~15 FPS
        this.audioPlayer.on('play', () => {
            this.isActive = true;
            this.startTrackingInterval();
        });
        
        this.audioPlayer.on('pause', () => {
            this.isActive = false;
            this.stopTrackingInterval();
            this.update(); // Final update when paused
        });
        
        this.audioPlayer.on('seeked', () => {
            this.update(); // Immediate update on seek
        });
    }

    startTrackingInterval() {
        if (this.trackingIntervalId) {
            clearInterval(this.trackingIntervalId);
        }
        
        this.trackingIntervalId = setInterval(() => {
            if (this.isActive) {
                this.update();
            }
        }, this.optimizedUpdateRate);
    }

    stopTrackingInterval() {
        if (this.trackingIntervalId) {
            clearInterval(this.trackingIntervalId);
            this.trackingIntervalId = null;
        }
    }update() {
        const currentTime = this.audioPlayer.currentTime;
        
        // Evita atualizações desnecessárias (threshold de 1ms)
        if (Math.abs(currentTime - this.lastTime) < 0.001) {
            return;
        }
        
        this.lastTime = currentTime;
        
        // Busca palavra no cache otimizado
        const wordData = this.wordCache.findWordAtTime(currentTime);
        
        if (wordData && wordData.index !== this.currentIndex) {
            // Remove highlight anterior
            if (this.currentIndex >= 0 && this.elements[this.currentIndex]) {
                this.elements[this.currentIndex].classList.remove('current');
            }
            
            // Adiciona novo highlight
            if (this.elements[wordData.index]) {
                const element = this.elements[wordData.index];
                element.classList.add('current');
                
                // Marca palavra curta para CSS especial
                if (wordData.isShort) {
                    element.classList.add('short-word');
                    element.dataset.durationShort = 'true';
                    element.title = `Short word: ${(wordData.duration * 1000).toFixed(0)}ms`;
                }
                  this.scrollToElement(element);
            }
            
            this.currentIndex = wordData.index;
        }
    }

    scrollToElement(element) {
        const rect = element.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        // Scroll se estiver fora da área visível
        if (rect.bottom > containerRect.bottom - 100 || rect.top < containerRect.top + 100) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Debug methods
    debugShortWords() {
        const shortWords = this.wordCache.getShortWords();
        console.log('🔍 [DEBUG] Short words analysis:');
        console.log(`Total short words: ${shortWords.length}`);
        
        shortWords.forEach((word, index) => {
            if (index < 20) { // Limita a 20 para não spammar
                console.log(`  "${word.text}": ${(word.duration * 1000).toFixed(0)}ms (${word.start.toFixed(3)}-${word.end.toFixed(3)})`);
            }
        });
        
        if (shortWords.length > 20) {
            console.log(`  ... and ${shortWords.length - 20} more short words`);
        }
    }

    enableDebugMode() {
        this.container.classList.add('debug-mode');
        console.log('🐛 [DEBUG] Debug mode enabled - words will show borders');
    }

    disableDebugMode() {
        this.container.classList.remove('debug-mode');
        console.log('🐛 [DEBUG] Debug mode disabled');
    }

    getStats() {
        return {
            ...this.wordCache.getStats(),
            currentIndex: this.currentIndex,
            isActive: this.isActive,
            elementsCount: this.elements.length
        };
    }

    destroy() {
        this.isActive = false;
        console.log('🗑️ [HIGHLIGHTER] High-frequency highlighter destroyed');
    }
}
