// Main Application Entry Point - Optimized Version with Critical Fixes
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
        
        // CRITICAL FIX 1: ENABLE HIGH FREQUENCY HIGHLIGHTER FOR SHORT WORDS
        this.useHighFrequencyHighlighter = true; // ← CRITICAL CHANGE
        this.performanceMode = true;
        
        this.init();
    }

    async init() {
        try {
            this.showLoadingOverlay(true);
            
            this.dictionary = new Dictionary();
            this.uiController = new UIController();
            
            // CRITICAL FIX 2: Add fallback system for missing files
            await this.loadTranscriptData();
            
            this.audioPlayer = new AudioPlayer('audio-player');
            
            // CRITICAL FIX 3: Disable duplicate TranscriptRenderer when using HighFrequency
            if (this.useHighFrequencyHighlighter) {
                // Create minimal renderer only for structure
                this.transcriptRenderer = new TranscriptRenderer(
                    this.transcriptData,
                    this.audioPlayer,
                    this.dictionary
                );
                // Disable old renderer's highlight update to prevent conflicts
                this.transcriptRenderer.updateHighlight = () => {}; // Noop
            } else {
                this.transcriptRenderer = new TranscriptRenderer(
                    this.transcriptData,
                    this.audioPlayer,
                    this.dictionary
                );
            }
            
            // Initialize high-frequency highlighter
            if (this.useHighFrequencyHighlighter) {
                const transcriptContainer = document.getElementById('transcript-content');
                this.highFrequencyHighlighter = new HighFrequencyHighlighter(
                    transcriptContainer,
                    this.audioPlayer
                );
            }
            
            this.setupEventListeners();
            await this.transcriptRenderer.render();
            
            // Initialize high-frequency highlighter after render
            if (this.useHighFrequencyHighlighter && this.highFrequencyHighlighter) {
                await this.highFrequencyHighlighter.init(this.transcriptData);
            }
            
            this.updateWordCount();
            this.setupDebugCommands();
            this.showLoadingOverlay(false);
            
            this.isInitialized = true;
            console.log('🚀 App initialized with High Frequency Highlighter for short words');
            
        } catch (error) {
            console.error('Failed to initialize LinguaSpace:', error);
            this.showError(`Failed to load: ${error.message}`);
        }
    }

    // CRITICAL FIX 4: Better error handling for file loading
    async loadTranscriptData() {
        try {
            // Try to load main file
            let response = await fetch('Books_Summary.json');
            
            // If failed, try alternative file
            if (!response.ok) {
                console.warn('Books_Summary.json not found, trying fallback...');
                response = await fetch('transcript.json');
            }
            
            // If still failed, use demo data
            if (!response.ok) {
                console.warn('No transcript file found, using demo data');
                this.transcriptData = this.getDemoTranscript();
                return;
            }
            
            this.transcriptData = await response.json();
            
            if (!this.transcriptData.segments || !Array.isArray(this.transcriptData.segments)) {
                throw new Error('Invalid transcript format');
            }
            
            console.log(`Loaded transcript with ${this.transcriptData.segments.length} segments`);
        } catch (error) {
            console.error('Error loading transcript:', error);
            this.transcriptData = this.getDemoTranscript();
        }
    }

    // CRITICAL FIX 5: Demo data to prevent total failure
    getDemoTranscript() {
        return {
            segments: [{
                words: [
                    { type: 'word', text: 'Welcome', start: 0.0, end: 0.5 },
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'to', start: 0.5, end: 0.6 }, // Short word!
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'LinguaSpace', start: 0.6, end: 1.2 },
                    { type: 'spacing', text: '. ' },
                    { type: 'word', text: 'This', start: 1.3, end: 1.5 },
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'is', start: 1.5, end: 1.6 }, // Short word!
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'a', start: 1.6, end: 1.65 }, // Short word!
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'demo', start: 1.65, end: 2.0 },
                    { type: 'spacing', text: '. ' },
                    { type: 'word', text: 'It', start: 2.1, end: 2.2 }, // Short word!
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'includes', start: 2.2, end: 2.8 },
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'short', start: 2.8, end: 3.1 },
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'words', start: 3.1, end: 3.5 },
                    { type: 'spacing', text: '.' }
                ]
            }]
        };
    }    setupEventListeners() {
        // CRITICAL FIX 6: Remove excessive throttling for audio updates
        this.audioPlayer.on('timeupdate', (currentTime) => {
            // Use only high-frequency highlighter if active
            if (this.useHighFrequencyHighlighter && this.highFrequencyHighlighter) {
                // High-frequency highlighter has its own optimization
                // Don't do anything here to avoid conflicts
            } else {
                this.transcriptRenderer.updateHighlight(currentTime);
            }
            
            // UI updates can continue with throttle
            this.uiController.updateProgress(currentTime, this.audioPlayer.duration);
        });

        this.audioPlayer.on('durationchange', (duration) => {
            this.uiController.updateDuration(duration);
        });

        this.audioPlayer.on('play', () => {
            this.uiController.updatePlayButton(true);
        });

        this.audioPlayer.on('pause', () => {
            this.uiController.updatePlayButton(false);
        });

        this.audioPlayer.on('loadstart', () => {
            this.uiController.showLoadingState();
        });

        this.audioPlayer.on('loadeddata', () => {
            this.uiController.hideLoadingState();
        });

        this.audioPlayer.on('error', (error) => {
            console.error('Audio player error:', error);
            this.showError('Audio playback error. Please check the audio file.');
        });

        // CRITICAL FIX 7: Add missing play-pause event listener connection
        this.uiController.on('play-pause', () => {
            console.log('🎮 [APP] Received play-pause event from UI');
            this.audioPlayer.togglePlayPause();
        });

        // UI controller events for other controls
        this.uiController.on('jump', async (seconds) => {
            console.log(`App received jump: ${seconds}s`);
            await this.audioPlayer.jump(seconds);
        });

        this.uiController.on('speed-change', (speed) => {
            this.audioPlayer.setPlaybackRate(speed);
        });

        this.uiController.on('seek-percentage', async (percentage) => {
            console.log(`App received seek-percentage: ${percentage}%`);
            const newTime = (percentage / 100) * this.audioPlayer.duration;
            await this.audioPlayer.seek(newTime);
        });

        // Progress bar click handling
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const newTime = percent * this.audioPlayer.duration;
                this.audioPlayer.currentTime = newTime;
            });
        }
    }

    updateWordCount() {
        if (!this.transcriptData || !this.transcriptData.segments) return;
        
        let wordCount = 0;
        this.transcriptData.segments.forEach(segment => {
            if (segment.words) {
                wordCount += segment.words.filter(word => word.type === 'word').length;
            }
        });
        
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `${wordCount.toLocaleString()} words`;
        }
    }

    setupDebugCommands() {
        // Performance monitor toggle
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                if (window.performanceMonitor) {
                    window.performanceMonitor.toggleDashboard();
                }
            }
        });

        // Debug info
        window.app = this;
        window.debugInfo = () => {
            console.log('LinguaSpace Debug Info:', {
                isInitialized: this.isInitialized,
                useHighFrequencyHighlighter: this.useHighFrequencyHighlighter,
                transcriptSegments: this.transcriptData?.segments?.length || 0,
                audioPlayer: !!this.audioPlayer,
                transcriptRenderer: !!this.transcriptRenderer,
                highFrequencyHighlighter: !!this.highFrequencyHighlighter
            });
        };
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        // Create error overlay if it doesn't exist
        let errorOverlay = document.getElementById('error-overlay');
        if (!errorOverlay) {
            errorOverlay = document.createElement('div');
            errorOverlay.id = 'error-overlay';
            errorOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-family: Arial, sans-serif;
            `;
            
            const errorContent = document.createElement('div');
            errorContent.style.cssText = `
                background: #ff4444;
                padding: 20px;
                border-radius: 8px;
                max-width: 500px;
                text-align: center;
            `;
            errorContent.innerHTML = `
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                ">Close</button>
            `;
            
            errorOverlay.appendChild(errorContent);
            document.body.appendChild(errorOverlay);
        }
        
        this.showLoadingOverlay(false);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LinguaSpaceApp();
});

// Initialize performance monitor
if (window.PerformanceMonitor) {
    window.performanceMonitor = new PerformanceMonitor();
}

export { LinguaSpaceApp };