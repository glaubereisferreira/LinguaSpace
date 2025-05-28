// Main Application Entry Point - Optimized Version
import { AudioPlayer } from './audioPlayer.js';
import { TranscriptRenderer } from './transcriptRenderer.js';
import { HighFrequencyHighlighter } from './highFrequencyHighlighter.js';
import { Dictionary } from './dictionary.js';
import { UIController } from './uiController.js';
import { PerformanceMonitor } from './performanceMonitor.js';

class LinguaSpaceApp {
    constructor() {
        this.audioPlayer = null;
        this.transcriptRenderer = null;
        this.highFrequencyHighlighter = null;
        this.dictionary = null;
        this.uiController = null;
        this.transcriptData = null;
        this.isInitialized = false;
        
        // OPTIMIZATION: Flags to control which systems are active
        this.useHighFrequencyHighlighter = false; // Disable by default
        this.performanceMode = true; // Enable performance optimizations
        
        this.init();
    }

    async init() {
        try {
            // Show loading overlay
            this.showLoadingOverlay(true);
            
            // Initialize core components
            this.dictionary = new Dictionary();
            this.uiController = new UIController();
            
            // Load transcript data
            await this.loadTranscriptData();
            
            // Initialize audio player
            this.audioPlayer = new AudioPlayer('audio-player');
            
            // Initialize transcript renderer (original system)
            this.transcriptRenderer = new TranscriptRenderer(
                this.transcriptData,
                this.audioPlayer,
                this.dictionary
            );
            
            // OPTIMIZATION: Only initialize high-frequency highlighter if needed
            if (this.useHighFrequencyHighlighter) {
                const transcriptContainer = document.getElementById('transcript-content');
                this.highFrequencyHighlighter = new HighFrequencyHighlighter(
                    transcriptContainer,
                    this.audioPlayer
                );
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render transcript with original system
            await this.transcriptRenderer.render();
            
            // OPTIMIZATION: Only initialize if enabled
            if (this.useHighFrequencyHighlighter && this.highFrequencyHighlighter) {
                await this.highFrequencyHighlighter.init(this.transcriptData);
            }
            
            // Update UI
            this.updateWordCount();
            
            // Setup debug commands
            this.setupDebugCommands();
            
            // Hide loading overlay
            this.showLoadingOverlay(false);
            
            this.isInitialized = true;
            
            // OPTIMIZATION: Log performance metrics
            console.log('🚀 App initialized successfully');
            if (this.performanceMode) {
                console.log('⚡ Performance mode enabled');
            }
            
        } catch (error) {
            console.error('Failed to initialize LinguaSpace:', error);
            this.showError('Failed to load the podcast. Please check the file paths.');
        }
    }

    async loadTranscriptData() {
        try {
            const response = await fetch('Books_Summary.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.transcriptData = await response.json();
            
            if (!this.transcriptData.segments || !Array.isArray(this.transcriptData.segments)) {
                throw new Error('Invalid transcript format');
            }
            
            console.log(`Loaded transcript with ${this.transcriptData.segments.length} segments`);
        } catch (error) {
            console.error('Error loading transcript:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // OPTIMIZATION: Debounced timeupdate handler
        let timeUpdateDebounce = null;
        
        this.audioPlayer.on('timeupdate', (currentTime) => {
            // Clear existing timeout
            if (timeUpdateDebounce) {
                clearTimeout(timeUpdateDebounce);
            }
            
            // Debounce updates to prevent excessive rendering
            timeUpdateDebounce = setTimeout(() => {
                // Use only one highlighting system at a time
                if (this.useHighFrequencyHighlighter && this.highFrequencyHighlighter) {
                    // High-frequency highlighter handles its own optimization
                } else {
                    // Use optimized transcript renderer
                    this.transcriptRenderer.updateHighlight(currentTime);
                }
                
                // Update UI progress less frequently
                this.uiController.updateProgress(currentTime, this.audioPlayer.duration);
            }, 16); // ~60fps max
        });

        this.audioPlayer.on('play', () => {
            this.uiController.updatePlayButton(true);
        });

        this.audioPlayer.on('pause', () => {
            this.uiController.updatePlayButton(false);
        });

        this.audioPlayer.on('loadedmetadata', () => {
            this.uiController.updateDuration(this.audioPlayer.duration);
        });

        // UI controller events
        this.uiController.on('play-pause', () => {
            console.log('🎮 [APP] Received play-pause event from UI');
            this.audioPlayer.togglePlayPause();
        });

        this.uiController.on('seek', async (time) => {
            console.log(`App received UI seek: time=${time}, type=${typeof time}`);
            await this.audioPlayer.seek(time);
        });

        this.uiController.on('seek-percentage', async (percentage) => {
            console.log(`App received seek-percentage: ${percentage}%, type=${typeof percentage}`);
            await this.audioPlayer.seekToPercentage(percentage);
        });

        this.uiController.on('jump', async (seconds) => {
            console.log(`App received jump: ${seconds}s, type=${typeof seconds}`);
            await this.audioPlayer.jump(seconds);
        });

        this.uiController.on('speed-change', (speed) => {
            this.audioPlayer.setPlaybackRate(speed);
        });

        this.uiController.on('loop-toggle', (isLooping) => {
            this.transcriptRenderer.setLooping(isLooping);
        });

        this.uiController.on('dictionary-toggle', () => {
            this.toggleDictionary();
        });

        // Transcript renderer events
        this.transcriptRenderer.on('word-click', async (word, time) => {
            console.log(`App received word-click: word="${word.text}", time=${time}, type=${typeof time}`);
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

        // OPTIMIZATION: Debounced resize handler
        let resizeTimeout = null;
        window.addEventListener('resize', () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(() => {
                this.transcriptRenderer.handleResize();
            }, 250); // Wait 250ms after resize ends
        }, { passive: true });

        // Prevent context menu on right-click for our custom implementation
        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('word')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.uiController.hideContextMenu();
            }
        }, { passive: true });
    }

    updateWordCount() {
        if (!this.transcriptData) return;
        
        // OPTIMIZATION: Cache word count
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

    // OPTIMIZATION: Batch DOM updates for dictionary
    updateDictionaryDisplay() {
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
                
                // Create HTML in one go
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
                
                // Use event delegation for remove buttons
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
        // Global debug commands for testing
        window.linguaDebug = {
            shortWords: () => {
                if (this.highFrequencyHighlighter) {
                    this.highFrequencyHighlighter.debugShortWords();
                } else {
                    console.warn('High-frequency highlighter is disabled');
                }
            },
            
            enableHighFrequency: () => {
                this.useHighFrequencyHighlighter = true;
                console.log('High-frequency highlighting enabled (requires reload)');
            },
            
            disableHighFrequency: () => {
                this.useHighFrequencyHighlighter = false;
                console.log('High-frequency highlighting disabled');
            },
            
            performanceMode: (enabled) => {
                this.performanceMode = enabled;
                console.log(`Performance mode ${enabled ? 'enabled' : 'disabled'}`);
            },
            
            stats: () => {
                const stats = {
                    wordCount: this._cachedWordCount || 0,
                    savedWords: Object.keys(this.dictionary.getSavedWords()).length,
                    performanceMode: this.performanceMode,
                    highFrequencyEnabled: this.useHighFrequencyHighlighter
                };
                console.table(stats);
                return stats;
            },
            
            testSeek: (time) => {
                this.audioPlayer.seek(time);
            }
        };
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
                    <h3 style="margin-bottom: 0.5rem;">Error Loading Podcast</h3>
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

    // OPTIMIZATION: Cleanup method
    destroy() {
        if (this.audioPlayer) {
            this.audioPlayer.destroy();
        }
        if (this.transcriptRenderer) {
            this.transcriptRenderer.destroy();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.linguaSpace = new LinguaSpaceApp();
});

// OPTIMIZATION: Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.linguaSpace) {
        window.linguaSpace.destroy();
    }
});

// Export for potential external use
export { LinguaSpaceApp };