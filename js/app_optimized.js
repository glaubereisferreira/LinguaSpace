// Main Application Entry Point - Optimized for Short Words and INP Performance
import { AudioPlayer } from './audioPlayer.js';
import { TranscriptRenderer } from './transcriptRenderer.js';
import { HighFrequencyHighlighter } from './highFrequencyHighlighter.js';
import { WordCacheSystem } from './wordCacheSystem.js';
import { Dictionary } from './dictionary.js';
import { UIController } from './uiController.js';
import { PerformanceMonitor } from './performanceMonitor.js';

class LinguaSpaceApp {
    constructor() {
        this.audioPlayer = null;
        this.transcriptRenderer = null;
        this.wordCacheSystem = null;
        this.highFrequencyHighlighter = null;
        this.uiController = null;
        this.performanceMonitor = null;
        this.isInitialized = false;
        this.demoMode = false;
        
        // Performance settings
        this.performanceSettings = {
            targetINP: 100, // ms
            maxUIUpdateRate: 60, // fps
            throttleThreshold: 50 // ms
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadTranscript = this.loadTranscript.bind(this);
        this.handleFileLoad = this.handleFileLoad.bind(this);
        this.showError = this.showError.bind(this);
        this.initializeDemoMode = this.initializeDemoMode.bind(this);
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init);
        } else {
            this.init();
        }
    }
    
    // Utility debounce method
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async init() {
        try {
            console.log('🚀 Initializing LinguaSpace with performance optimizations...');
            
            // Initialize performance monitor first
            this.performanceMonitor = new PerformanceMonitor();
            this.performanceMonitor.start();
            
            this.showLoadingOverlay(true);
            
            // Try to load transcript, fallback to demo mode if failed
            try {
                await this.loadTranscript();
            } catch (error) {
                console.warn('📁 Failed to load transcript files, initializing demo mode:', error);
                this.initializeDemoMode();
            }
            
            // Initialize core components
            this.dictionary = new Dictionary();
            this.uiController = new UIController();
            
            // Initialize audio player with fallback
            this.audioPlayer = new AudioPlayer('audio-player');
            
            // Initialize word cache system for better performance
            this.wordCacheSystem = new WordCacheSystem();
            
            // Initialize transcript renderer
            this.transcriptRenderer = new TranscriptRenderer(
                this.transcriptData,
                this.audioPlayer,
                this.dictionary
            );
            
            // Initialize high-frequency highlighter (enabled for short words)
            const transcriptContainer = document.getElementById('transcript-content');
            this.highFrequencyHighlighter = new HighFrequencyHighlighter(
                transcriptContainer,
                this.audioPlayer,
                { enableShortWords: true }
            );
            
            // Setup event listeners with performance optimizations
            this.setupEventListeners();
            
            // Render transcript
            await this.transcriptRenderer.render();
            
            // Initialize highlighter with cache
            await this.highFrequencyHighlighter.init(
                this.transcriptData,
                this.wordCacheSystem
            );
            
            // Update UI
            this.updateWordCount();
            this.setupDebugCommands();
            
            this.showLoadingOverlay(false);
            this.isInitialized = true;
            
            console.log('✅ LinguaSpace initialized successfully');
            console.log('📊 Performance mode: ENABLED');
            console.log('🎯 Short words highlighting: ENABLED');
            
        } catch (error) {
            console.error('❌ Failed to initialize LinguaSpace:', error);
            this.showError('Failed to initialize the application. Using demo mode.');
            this.initializeDemoMode();
        }
    }

    async loadTranscript() {
        try {
            // Try to load the main transcript file
            const response = await fetch('Books_Summary.json');
            if (!response.ok) {
                throw new Error(`Failed to load transcript: ${response.status}`);
            }
            
            this.transcriptData = await response.json();
            
            if (!this.transcriptData.segments || !Array.isArray(this.transcriptData.segments)) {
                throw new Error('Invalid transcript format');
            }
            
            console.log(`📄 Loaded transcript with ${this.transcriptData.segments.length} segments`);
            
        } catch (error) {
            console.error('📁 Error loading main transcript:', error);
            throw error;
        }
    }
    
    initializeDemoMode() {
        console.log('🎭 Initializing demo mode with sample data...');
        this.demoMode = true;
        
        // Create demo transcript data
        this.transcriptData = {
            segments: [
                {
                    start: 0,
                    end: 5,
                    words: [
                        { start: 0, end: 0.5, text: "I", type: "word" },
                        { start: 0.6, end: 1.0, text: "am", type: "word" },
                        { start: 1.1, end: 1.4, text: "a", type: "word" },
                        { start: 1.5, end: 2.2, text: "short", type: "word" },
                        { start: 2.3, end: 2.8, text: "word", type: "word" },
                        { start: 2.9, end: 3.5, text: "test", type: "word" }
                    ]
                },
                {
                    start: 5,
                    end: 10,
                    words: [
                        { start: 5, end: 5.3, text: "The", type: "word" },
                        { start: 5.4, end: 5.7, text: "app", type: "word" },
                        { start: 5.8, end: 6.1, text: "is", type: "word" },
                        { start: 6.2, end: 6.6, text: "now", type: "word" },
                        { start: 6.7, end: 7.2, text: "working", type: "word" },
                        { start: 7.3, end: 7.5, text: "in", type: "word" },
                        { start: 7.6, end: 8.0, text: "demo", type: "word" },
                        { start: 8.1, end: 8.5, text: "mode", type: "word" }
                    ]
                }
            ]
        };
        
        // Show demo mode indicator
        this.showDemoModeIndicator();
    }
    
    showDemoModeIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'demo-mode-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #f59e0b;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        indicator.textContent = '🎭 DEMO MODE';
        document.body.appendChild(indicator);
    }

    setupEventListeners() {
        // Performance-optimized event listeners with proper debouncing
        
        // Audio player events with throttling
        const throttledTimeUpdate = this.debounce((currentTime) => {
            // Only update if there's a meaningful change
            if (Math.abs(currentTime - (this.lastUpdateTime || 0)) > 0.01) {
                this.lastUpdateTime = currentTime;
                
                // Use idle callback for non-critical updates
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => {
                        this.highFrequencyHighlighter?.updateHighlight(currentTime);
                    });
                } else {
                    setTimeout(() => {
                        this.highFrequencyHighlighter?.updateHighlight(currentTime);
                    }, 0);
                }
                
                // Use RAF for UI updates
                requestAnimationFrame(() => {
                    this.uiController?.updateProgress(currentTime, this.audioPlayer.duration);
                });
            }
        }, this.performanceSettings.throttleThreshold);
        
        this.audioPlayer.on('timeupdate', throttledTimeUpdate);
        
        this.audioPlayer.on('play', () => {
            requestAnimationFrame(() => {
                this.uiController.updatePlayButton(true);
            });
        });

        this.audioPlayer.on('pause', () => {
            requestAnimationFrame(() => {
                this.uiController.updatePlayButton(false);
            });
        });

        this.audioPlayer.on('loadedmetadata', () => {
            requestAnimationFrame(() => {
                this.uiController.updateDuration(this.audioPlayer.duration);
            });
        });

        // UI controller events with debouncing
        this.uiController.on('play-pause', this.debounce(() => {
            this.audioPlayer.togglePlayPause();
        }, 150));

        this.uiController.on('seek', this.debounce(async (time) => {
            await this.audioPlayer.seek(time);
        }, 100));

        this.uiController.on('seek-percentage', this.debounce(async (percentage) => {
            await this.audioPlayer.seekToPercentage(percentage);
        }, 50));

        this.uiController.on('jump', this.debounce(async (seconds) => {
            await this.audioPlayer.jump(seconds);
        }, 100));

        this.uiController.on('speed-change', this.debounce((speed) => {
            this.audioPlayer.setPlaybackRate(speed);
        }, 100));

        this.uiController.on('loop-toggle', (isLooping) => {
            this.transcriptRenderer.setLooping(isLooping);
        });

        this.uiController.on('dictionary-toggle', () => {
            this.toggleDictionary();
        });

        // Transcript events
        this.transcriptRenderer.on('word-click', async (word, time) => {
            await this.audioPlayer.seek(time);
        });

        this.transcriptRenderer.on('word-save', (word, color) => {
            this.dictionary.addWord(word, color);
            this.updateDictionaryDisplay();
        });

        this.transcriptRenderer.on('word-remove', (word) => {
            this.dictionary.removeWord(word);
            this.updateDictionaryDisplay();
        });

        // Performance-optimized resize handler
        const throttledResize = this.debounce(() => {
            if (window.requestIdleCallback) {
                requestIdleCallback(() => {
                    this.transcriptRenderer?.handleResize();
                });
            } else {
                setTimeout(() => {
                    this.transcriptRenderer?.handleResize();
                }, 0);
            }
        }, 250);
        
        window.addEventListener('resize', throttledResize, { passive: true });

        // Context menu handling
        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('word')) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.uiController.hideContextMenu();
            }
        }, { passive: true });
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.transcriptData = data;
                this.init();
            } catch (error) {
                this.showError('Invalid JSON file format');
            }
        };
        reader.readAsText(file);
    }

    updateWordCount() {
        if (!this.transcriptData) return;
        
        // Cache word count for performance
        if (this._cachedWordCount === undefined) {
            let totalWords = 0;
            this.transcriptData.segments.forEach(segment => {
                segment.words.forEach(word => {
                    if (word.type === 'word') {
                        totalWords++;
                    }
                });
            });
            this._cachedWordCount = totalWords;
        }
        
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `${this._cachedWordCount} words`;
        }
    }

    toggleDictionary() {
        const sidebar = document.getElementById('dictionary-sidebar');
        const isHidden = sidebar.classList.contains('hidden');
        
        if (isHidden) {
            sidebar.classList.remove('hidden');
            this.updateDictionaryDisplay();
        } else {
            sidebar.classList.add('hidden');
        }
    }

    updateDictionaryDisplay() {
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
            const savedWords = this.dictionary.getSavedWords();
            const statsElement = document.getElementById('dictionary-stats');
            const listElement = document.getElementById('saved-words-list');
            
            if (statsElement) {
                const totalWords = Object.keys(savedWords).length;
                
                statsElement.innerHTML = `
                    <div style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">
                        ${totalWords}
                    </div>
                    <div style="opacity: 0.9;">Words Saved</div>
                `;
            }
            
            if (listElement) {
                const sortedWords = Object.entries(savedWords)
                    .sort(([a], [b]) => a.localeCompare(b));
                
                const html = sortedWords.map(([word, data]) => `
                    <div class="saved-word-item" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.5rem;
                        margin-bottom: 0.5rem;
                        background: rgba(248, 250, 252, 0.8);
                        border-radius: 8px;
                        border-left: 4px solid ${data.color};
                    ">
                        <span style="font-weight: 500; color: ${data.color};">${word}</span>
                        <button 
                            class="remove-saved-word" 
                            data-word="${word}"
                            style="
                                background: none;
                                border: none;
                                color: #6b7280;
                                cursor: pointer;
                                padding: 0.25rem;
                                border-radius: 4px;
                                font-size: 0.75rem;
                            "
                            title="Remove word"
                        >×</button>
                    </div>
                `).join('');
                
                listElement.innerHTML = html;
                
                // Event delegation for remove buttons
                listElement.addEventListener('click', (e) => {
                    if (e.target.classList.contains('remove-saved-word')) {
                        const word = e.target.dataset.word;
                        this.dictionary.removeWord(word);
                        this.updateDictionaryDisplay();
                        this.transcriptRenderer.updateWordColors();
                    }
                }, { once: true });
            }
        });
    }

    setupDebugCommands() {
        window.linguaDebug = {
            stats: () => {
                const stats = {
                    wordCount: this._cachedWordCount || 0,
                    savedWords: Object.keys(this.dictionary.getSavedWords()).length,
                    demoMode: this.demoMode,
                    initialized: this.isInitialized,
                    performanceMode: true
                };
                console.table(stats);
                return stats;
            },
            
            testShortWords: () => {
                console.log('🔍 Testing short words highlighting...');
                this.audioPlayer.seek(0.5);
                setTimeout(() => this.audioPlayer.seek(1.1), 1000);
                setTimeout(() => this.audioPlayer.seek(1.5), 2000);
            },
            
            performance: () => {
                if (this.performanceMonitor) {
                    return this.performanceMonitor.getStats();
                }
                return 'Performance monitor not available';
            },
            
            seek: (time) => {
                this.audioPlayer.seek(time);
            },
            
            enableHighlighting: () => {
                this.highFrequencyHighlighter?.enable();
                console.log('✅ Highlighting enabled');
            },
            
            disableHighlighting: () => {
                this.highFrequencyHighlighter?.disable();
                console.log('❌ Highlighting disabled');
            }
        };
        
        console.log('🐛 Debug commands available: window.linguaDebug');
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
    }

    showError(message) {
        this.showLoadingOverlay(false);
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.innerHTML = `
                <div style="color: #ef4444; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 0.5rem;">Application Error</h3>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" style="
                        margin-top: 1rem;
                        padding: 0.5rem 1rem;
                        background: #ef4444;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Reload Page</button>
                </div>
            `;
        }
    }

    // Cleanup method
    destroy() {
        if (this.audioPlayer) {
            this.audioPlayer.destroy();
        }
        if (this.transcriptRenderer) {
            this.transcriptRenderer.destroy();
        }
        if (this.highFrequencyHighlighter) {
            this.highFrequencyHighlighter.destroy();
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
        }
    }
}

// Initialize the application
const app = new LinguaSpaceApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

// Export for potential external use
export { LinguaSpaceApp };
