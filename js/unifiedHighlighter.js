// Unified Highlighter - Combines best of both systems with optimal performance
export class UnifiedHighlighter {
    constructor(container, audioPlayer, transcriptData) {
        this.container = container;
        this.audioPlayer = audioPlayer;
        this.transcriptData = transcriptData;
        
        // Word tracking
        this.wordElements = [];
        this.wordTimeMap = new Map();
        this.currentWordIndex = -1;
        this.currentSegmentIndex = -1;
        
        // Performance optimization
        this.rafId = null;
        this.lastUpdateTime = 0;
        this.updateThreshold = 16; // 60fps max
        
        // Cache for short words
        this.shortWordCache = new Map();
        
        // Event listeners
        this.eventListeners = {};
        
        this.init();
    }

    init() {
        this.buildWordIndex();
        this.setupEventListeners();
        this.setupClickHandlers();
    }

    buildWordIndex() {
        console.log('Building optimized word index...');
        
        let globalIndex = 0;
        
        this.transcriptData.segments.forEach((segment, segmentIndex) => {
            segment.words.forEach((word, wordIndex) => {
                if (word.type === 'word') {
                    const wordInfo = {
                        element: null, // Will be set when rendering
                        data: word,
                        globalIndex: globalIndex,
                        segmentIndex: segmentIndex,
                        wordIndex: wordIndex,
                        duration: word.end - word.start,
                        isShort: (word.end - word.start) < 0.15
                    };
                    
                    this.wordElements.push(wordInfo);
                    
                    // Create time-based lookup (100ms buckets)
                    const startBucket = Math.floor(word.start * 10);
                    const endBucket = Math.ceil(word.end * 10);
                    
                    for (let bucket = startBucket; bucket <= endBucket; bucket++) {
                        if (!this.wordTimeMap.has(bucket)) {
                            this.wordTimeMap.set(bucket, []);
                        }
                        this.wordTimeMap.get(bucket).push(wordInfo);
                    }
                    
                    // Special cache for short words with expanded time window
                    if (wordInfo.isShort) {
                        const expandedStart = Math.floor((word.start - 0.05) * 20);
                        const expandedEnd = Math.ceil((word.end + 0.05) * 20);
                        
                        for (let bucket = expandedStart; bucket <= expandedEnd; bucket++) {
                            if (!this.shortWordCache.has(bucket)) {
                                this.shortWordCache.set(bucket, []);
                            }
                            this.shortWordCache.get(bucket).push(wordInfo);
                        }
                    }
                    
                    globalIndex++;
                }
            });
        });
        
        // Map DOM elements to word data
        this.mapDOMElements();
        
        console.log(`Index built: ${this.wordElements.length} words, ${this.shortWordCache.size} short word entries`);
    }

    mapDOMElements() {
        const wordElements = this.container.querySelectorAll('.word');
        wordElements.forEach((element, index) => {
            if (this.wordElements[index]) {
                this.wordElements[index].element = element;
            }
        });
    }

    setupEventListeners() {
        // Use requestAnimationFrame for smooth updates
        this.audioPlayer.on('timeupdate', (currentTime) => {
            this.scheduleUpdate(currentTime);
        });
        
        this.audioPlayer.on('seeked', () => {
            // Force immediate update after seek
            const currentTime = this.audioPlayer.currentTime;
            this.performUpdate(currentTime);
        });
    }

    setupClickHandlers() {
        // Use event delegation for better performance
        this.container.addEventListener('click', (e) => {
            const wordElement = e.target.closest('.word');
            if (wordElement) {
                e.preventDefault();
                const start = parseFloat(wordElement.dataset.start);
                this.emit('word-click', { element: wordElement }, start);
            }
        });
    }

    scheduleUpdate(currentTime) {
        // Cancel any pending update
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Schedule next update
        this.rafId = requestAnimationFrame(() => {
            const now = performance.now();
            
            // Throttle updates to maintain 60fps
            if (now - this.lastUpdateTime >= this.updateThreshold) {
                this.performUpdate(currentTime);
                this.lastUpdateTime = now;
            }
        });
    }

    performUpdate(currentTime) {
        // First check short word cache for precision
        const shortBucket = Math.floor(currentTime * 20);
        const shortWords = this.shortWordCache.get(shortBucket) || [];
        
        let foundWord = null;
        
        // Check short words first (they need more precision)
        if (shortWords.length > 0) {
            for (const word of shortWords) {
                const tolerance = 0.05;
                if (currentTime >= word.data.start - tolerance && 
                    currentTime <= word.data.end + tolerance) {
                    foundWord = word;
                    break;
                }
            }
        }
        
        // If no short word found, check regular cache
        if (!foundWord) {
            const bucket = Math.floor(currentTime * 10);
            const words = this.wordTimeMap.get(bucket) || [];
            
            for (const word of words) {
                if (currentTime >= word.data.start && currentTime <= word.data.end) {
                    foundWord = word;
                    break;
                }
            }
        }
        
        // Update highlighting
        if (foundWord && foundWord.globalIndex !== this.currentWordIndex) {
            this.updateHighlight(foundWord);
        }
    }

    updateHighlight(wordInfo) {
        // Remove previous highlight
        if (this.currentWordIndex >= 0) {
            const prevWord = this.wordElements[this.currentWordIndex];
            if (prevWord && prevWord.element) {
                prevWord.element.classList.remove('current');
                if (prevWord.isShort) {
                    prevWord.element.classList.remove('short-word');
                }
            }
        }
        
        // Remove previous segment highlight
        if (this.currentSegmentIndex >= 0) {
            const prevSegment = this.container.querySelector(`[data-segment-index="${this.currentSegmentIndex}"]`);
            if (prevSegment) {
                prevSegment.classList.remove('active');
            }
        }
        
        // Add new highlight
        if (wordInfo.element) {
            wordInfo.element.classList.add('current');
            
            // Special styling for short words
            if (wordInfo.isShort) {
                wordInfo.element.classList.add('short-word');
                wordInfo.element.dataset.durationShort = 'true';
            }
            
            // Update segment
            const segment = this.container.querySelector(`[data-segment-index="${wordInfo.segmentIndex}"]`);
            if (segment) {
                segment.classList.add('active');
            }
            
            // Smooth scroll
            this.scrollToElement(wordInfo.element);
        }
        
        this.currentWordIndex = wordInfo.globalIndex;
        this.currentSegmentIndex = wordInfo.segmentIndex;
    }

    scrollToElement(element) {
        const rect = element.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        // Check if element is out of view
        if (rect.bottom > containerRect.bottom - 100 || rect.top < containerRect.top + 100) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        }
    }

    // Event emitter
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

    // Debug methods
    getStats() {
        const shortWords = this.wordElements.filter(w => w.isShort);
        return {
            totalWords: this.wordElements.length,
            shortWords: shortWords.length,
            currentWord: this.currentWordIndex,
            cacheSize: this.wordTimeMap.size,
            shortCacheSize: this.shortWordCache.size
        };
    }

    // Cleanup
    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        this.wordTimeMap.clear();
        this.shortWordCache.clear();
    }
}
