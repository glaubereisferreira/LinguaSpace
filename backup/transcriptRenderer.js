// Transcript Renderer Module - Optimized Version
export class TranscriptRenderer {
    constructor(transcriptData, audioPlayer, dictionary) {
        this.transcriptData = transcriptData;
        this.audioPlayer = audioPlayer;
        this.dictionary = dictionary;
        this.wordElements = [];
        this.currentWordIndex = -1;
        this.currentSegmentIndex = -1;
        this.eventListeners = {};
        this.isLooping = false;
        this.currentSentence = null;
        
        this.container = document.getElementById('transcript-content');
          // OPTIMIZATION: Aggressive throttling for INP improvement
        this.wordTimeIndex = new Map(); // Time-based index for faster lookup
        this.updateHighlightRAF = null;
        this.scrollRAF = null;
        this.lastUpdateTime = 0;
        this.updateThreshold = 200; // Minimum 200ms between updates for INP
        
        // OPTIMIZATION: Use event delegation instead of individual listeners
        this.setupEventDelegation();
    }

    // OPTIMIZATION: Event delegation for better performance
    setupEventDelegation() {
        // Single click handler for all words
        this.container.addEventListener('click', (e) => {
            const wordElement = e.target.closest('.word');
            if (wordElement) {
                e.preventDefault();
                const start = parseFloat(wordElement.dataset.start);
                const text = wordElement.textContent;
                console.log(`Word clicked: "${text}", start: ${start}`);
                this.emit('word-click', { text, start }, start);
            }
        });

        // Single context menu handler for all words
        this.container.addEventListener('contextmenu', (e) => {
            const wordElement = e.target.closest('.word');
            if (wordElement) {
                e.preventDefault();
                const word = {
                    text: wordElement.textContent,
                    start: parseFloat(wordElement.dataset.start),
                    end: parseFloat(wordElement.dataset.end)
                };
                this.showContextMenu(e, word);
            }
        });
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
            this.eventListeners[event].forEach(callback => {
                callback(...args);
            });
        }
    }

    async render() {
        if (!this.transcriptData || !this.transcriptData.segments) {
            throw new Error('Invalid transcript data');
        }

        // OPTIMIZATION: Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        this.wordElements = [];
        this.wordTimeIndex.clear();
        let globalWordIndex = 0;

        this.transcriptData.segments.forEach((segment, segmentIndex) => {
            const segmentElement = this.createSegmentElement(segment, segmentIndex);
            
            segment.words.forEach((word, wordIndex) => {
                const wordElement = this.createWordElement(
                    word, 
                    globalWordIndex, 
                    segmentIndex, 
                    wordIndex
                );
                
                if (word.type === 'word') {
                    const wordInfo = {
                        element: wordElement,
                        data: word,
                        globalIndex: globalWordIndex,
                        segmentIndex: segmentIndex,
                        wordIndex: wordIndex
                    };
                    this.wordElements.push(wordInfo);
                    
                    // OPTIMIZATION: Create time-based index for O(1) lookup
                    const timeKey = Math.floor(word.start * 10); // 100ms buckets
                    if (!this.wordTimeIndex.has(timeKey)) {
                        this.wordTimeIndex.set(timeKey, []);
                    }
                    this.wordTimeIndex.get(timeKey).push(wordInfo);
                }
                
                segmentElement.appendChild(wordElement);
                globalWordIndex++;
            });
            
            fragment.appendChild(segmentElement);
        });

        // Clear and append all at once
        this.container.innerHTML = '';
        this.container.appendChild(fragment);

        // Apply saved word colors
        this.updateWordColors();
        
        console.log(`Rendered ${this.wordElements.length} words in ${this.transcriptData.segments.length} segments`);
    }

    createSegmentElement(segment, segmentIndex) {
        const segmentElement = document.createElement('div');
        segmentElement.className = 'segment';
        segmentElement.dataset.segmentIndex = segmentIndex;
        return segmentElement;
    }

    createWordElement(word, globalIndex, segmentIndex, wordIndex) {
        const wordElement = document.createElement('span');
        
        if (word.type === 'word') {
            wordElement.className = 'word';
            wordElement.textContent = word.text;
            wordElement.dataset.start = word.start;
            wordElement.dataset.end = word.end;
            wordElement.dataset.globalIndex = globalIndex;
            wordElement.dataset.segmentIndex = segmentIndex;
            wordElement.dataset.wordIndex = wordIndex;
            wordElement.dataset.text = word.text.toLowerCase();
            
            // OPTIMIZATION: No individual event listeners - using delegation
            
        } else if (word.type === 'spacing') {
            wordElement.textContent = word.text;
            wordElement.className = 'spacing';
        } else {
            wordElement.textContent = word.text;
            wordElement.className = 'other';
        }

        return wordElement;
    }

    // OPTIMIZATION: Throttled and optimized highlight update
    updateHighlight(currentTime) {
        // Throttle updates
        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateThreshold) {
            return;
        }
        this.lastUpdateTime = now;

        // Cancel any pending RAF
        if (this.updateHighlightRAF) {
            cancelAnimationFrame(this.updateHighlightRAF);
        }

        this.updateHighlightRAF = requestAnimationFrame(() => {
            this.performHighlightUpdate(currentTime);
        });
    }

    // OPTIMIZATION: Use time-based index for O(1) lookup
    performHighlightUpdate(currentTime) {
        const TOLERANCE = 0.05;
        
        // Get time bucket
        const timeKey = Math.floor(currentTime * 10);
        const buckets = [
            this.wordTimeIndex.get(timeKey - 1) || [],
            this.wordTimeIndex.get(timeKey) || [],
            this.wordTimeIndex.get(timeKey + 1) || []
        ];
        
        // Find current word in nearby buckets
        let currentWordIndex = -1;
        let currentSegmentIndex = -1;
        
        for (const bucket of buckets) {
            for (const wordInfo of bucket) {
                const wordData = wordInfo.data;
                if (currentTime >= wordData.start - TOLERANCE && 
                    currentTime <= wordData.end + TOLERANCE) {
                    currentWordIndex = wordInfo.globalIndex;
                    currentSegmentIndex = wordInfo.segmentIndex;
                    break;
                }
            }
            if (currentWordIndex !== -1) break;
        }

        // Only update if word changed
        if (currentWordIndex === this.currentWordIndex) return;

        // Remove previous highlights
        if (this.currentWordIndex !== -1 && this.wordElements[this.currentWordIndex]) {
            this.wordElements[this.currentWordIndex].element.classList.remove('current');
        }

        if (this.currentSegmentIndex !== -1) {
            const prevSegment = this.container.querySelector(`[data-segment-index="${this.currentSegmentIndex}"]`);
            if (prevSegment) {
                prevSegment.classList.remove('active');
            }
        }

        // Apply new highlights
        if (currentWordIndex !== -1 && this.wordElements[currentWordIndex]) {
            this.wordElements[currentWordIndex].element.classList.add('current');
            this.currentWordIndex = currentWordIndex;
            
            // Debounced scroll
            this.debouncedScrollToWord(this.wordElements[currentWordIndex].element);
        }

        if (currentSegmentIndex !== -1) {
            const currentSegment = this.container.querySelector(`[data-segment-index="${currentSegmentIndex}"]`);
            if (currentSegment) {
                currentSegment.classList.add('active');
            }
            this.currentSegmentIndex = currentSegmentIndex;
        }

        // Handle sentence looping
        if (this.isLooping && currentWordIndex !== -1) {
            this.updateSentenceLoop(currentTime);
        }
    }

    // OPTIMIZATION: Debounced scroll to prevent excessive scrolling
    debouncedScrollToWord(wordElement) {
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
        }
        
        this.scrollRAF = requestAnimationFrame(() => {
            this.scrollToWord(wordElement);
        });
    }

    scrollToWord(wordElement) {
        if (!wordElement) return;

        const container = this.container;
        const containerRect = container.getBoundingClientRect();
        const wordRect = wordElement.getBoundingClientRect();

        // Check if word is outside the visible area
        if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
            // Scroll to center the word in the container
            const containerCenter = containerRect.height / 2;
            const wordCenter = wordRect.height / 2;
            const scrollOffset = wordRect.top - containerRect.top - containerCenter + wordCenter;
            
            container.scrollBy({
                top: scrollOffset,
                behavior: 'smooth'
            });
        }
    }

    setLooping(isLooping) {
        this.isLooping = isLooping;
        
        if (isLooping) {
            this.setupCurrentSentenceLoop();
        } else {
            this.audioPlayer.clearLoop();
            this.currentSentence = null;
        }
    }

    setupCurrentSentenceLoop() {
        if (this.currentWordIndex === -1) return;

        const currentWord = this.wordElements[this.currentWordIndex];
        const sentence = this.findSentenceBoundaries(currentWord.segmentIndex, currentWord.wordIndex);
        
        if (sentence) {
            this.currentSentence = sentence;
            this.audioPlayer.setLoop(sentence.start, sentence.end);
        }
    }

    updateSentenceLoop(currentTime) {
        if (!this.currentSentence) return;

        if (currentTime < this.currentSentence.start || currentTime > this.currentSentence.end) {
            this.setupCurrentSentenceLoop();
        }
    }

    findSentenceBoundaries(segmentIndex, wordIndex) {
        const segment = this.transcriptData.segments[segmentIndex];
        if (!segment) return null;

        let sentenceStart = null;
        let sentenceEnd = null;
        let startWordIndex = wordIndex;
        let endWordIndex = wordIndex;

        // Find sentence start
        for (let i = wordIndex; i >= 0; i--) {
            const word = segment.words[i];
            if (word.type === 'word') {
                if (i === 0) {
                    sentenceStart = word.start;
                    startWordIndex = i;
                    break;
                }
                
                if (this.isSentenceEndPunctuation(word.text)) {
                    for (let j = i + 1; j < segment.words.length; j++) {
                        if (segment.words[j].type === 'word') {
                            sentenceStart = segment.words[j].start;
                            startWordIndex = j;
                            break;
                        }
                    }
                    break;
                }
            }
        }

        // Find sentence end
        for (let i = wordIndex; i < segment.words.length; i++) {
            const word = segment.words[i];
            if (word.type === 'word' && this.isSentenceEndPunctuation(word.text)) {
                sentenceEnd = word.end;
                endWordIndex = i;
                break;
            }
        }

        // Fallback to segment boundaries
        if (sentenceEnd === null) {
            const lastWord = segment.words.filter(w => w.type === 'word').pop();
            sentenceEnd = lastWord ? lastWord.end : segment.words[segment.words.length - 1].end;
        }

        if (sentenceStart === null) {
            const firstWord = segment.words.find(w => w.type === 'word');
            sentenceStart = firstWord ? firstWord.start : segment.words[0].start;
        }

        return {
            start: sentenceStart,
            end: sentenceEnd,
            startWordIndex,
            endWordIndex,
            segmentIndex
        };
    }

    isSentenceEndPunctuation(text) {
        return /[.!?]$/.test(text.trim());
    }

    showContextMenu(event, word) {
        const contextMenu = document.getElementById('context-menu');
        const savedWords = this.dictionary.getSavedWords();
        const isWordSaved = savedWords.hasOwnProperty(word.text.toLowerCase());
        
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.classList.remove('hidden');
        
        const removeBtn = document.getElementById('remove-word-btn');
        if (removeBtn) {
            removeBtn.style.display = isWordSaved ? 'block' : 'none';
        }
        
        const colorButtons = contextMenu.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const color = btn.dataset.color;
                this.emit('word-save', word.text.toLowerCase(), color);
                contextMenu.classList.add('hidden');
            };
        });
        
        if (removeBtn) {
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.emit('word-remove', word.text.toLowerCase());
                contextMenu.classList.add('hidden');
            };
        }
    }

    // OPTIMIZATION: Batch update word colors
    updateWordColors() {
        const savedWords = this.dictionary.getSavedWords();
        
        // Use RAF for smoother updates
        requestAnimationFrame(() => {
            this.wordElements.forEach(wordInfo => {
                const wordText = wordInfo.data.text.toLowerCase();
                const element = wordInfo.element;
                
                element.classList.remove('saved');
                element.style.borderBottomColor = '';
                element.style.color = '';
                
                if (savedWords[wordText]) {
                    element.classList.add('saved');
                    element.style.borderBottomColor = savedWords[wordText].color;
                    element.style.color = savedWords[wordText].color;
                }
            });
        });
    }

    handleResize() {
        if (this.currentWordIndex !== -1 && this.wordElements[this.currentWordIndex]) {
            this.debouncedScrollToWord(this.wordElements[this.currentWordIndex].element);
        }
    }

    getTotalWords() {
        return this.wordElements.length;
    }

    // Cleanup method
    destroy() {
        if (this.updateHighlightRAF) {
            cancelAnimationFrame(this.updateHighlightRAF);
        }
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
        }
    }
}