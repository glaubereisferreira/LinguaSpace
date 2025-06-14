// Word Cache System - Optimized for short words like prepositions
export class WordCacheSystem {
    constructor() {
        this.cache = new Map();
        this.timeIndex = [];
        this.shortWordsMap = new Map();
        this.allWords = [];
        
        // CRITICAL FIX 1: Common short words list
        this.commonShortWords = new Set([
            'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'by', 'for',
            'is', 'it', 'or', 'as', 'we', 'be', 'my', 'so', 'up', 'no',
            'if', 'he', 'me', 'do', 'go', 'us', 'am', 'oh', 'hi', 'ok'
        ]);
        
        // CRITICAL FIX 2: Recent lookups cache for performance
        this.recentLookups = new Map();
        this.maxRecentSize = 10;
    }

    buildCache(transcript) {
        console.log('🏗️ [CACHE] Building word cache system...');
        
        // Limpa cache anterior
        this.cache.clear();
        this.timeIndex = [];
        this.shortWordsMap.clear();
        this.allWords = [];
        
        let globalIndex = 0;
        
        transcript.segments.forEach((segment, segmentIndex) => {
            segment.words.forEach((word, wordIndex) => {                if (word.type === 'word') {
                    const duration = word.end - word.start;
                    const wordLower = word.text.toLowerCase();
                    
                    // CRITICAL FIX 3: Improved criteria for short words
                    const isShort = duration < 0.2 || // Increased from 0.15 to 0.2
                                   this.commonShortWords.has(wordLower) ||
                                   word.text.length <= 2;
                      // Cria entrada no cache
                    const wordData = {
                        text: word.text,
                        start: word.start,
                        end: word.end,
                        duration: duration,
                        index: globalIndex,
                        segmentIndex: segmentIndex,
                        wordIndex: wordIndex,
                        isShort: isShort,
                        isCommon: this.commonShortWords.has(wordLower)
                    };
                    
                    this.allWords.push(wordData);
                    
                    // CRITICAL FIX 4: More granular temporal cache
                    const timeResolution = isShort ? 0.005 : 0.01; // 5ms for short, 10ms for normal
                    
                    for (let t = word.start; t <= word.end; t += timeResolution) {
                        const timeKey = Math.round(t * 1000) / 1000; // 1ms precision
                        if (!this.cache.has(timeKey)) {
                            this.cache.set(timeKey, []);
                        }
                        this.cache.get(timeKey).push(wordData);
                    }
                    
                    // CRITICAL FIX 5: Expanded map for short words
                    if (isShort) {
                        // Bigger expansion for very short words
                        const expansionFactor = duration < 0.1 ? 0.1 : 0.05;
                        const expandedStart = Math.max(0, word.start - expansionFactor);
                        const expandedEnd = word.end + expansionFactor;
                        
                        // Ultra-high resolution for short words
                        const shortResolution = 0.002; // 2ms
                        
                        for (let t = expandedStart; t <= expandedEnd; t += shortResolution) {
                            const timeKey = Math.round(t * 500) / 500; // 2ms precision
                            if (!this.shortWordsMap.has(timeKey)) {
                                this.shortWordsMap.set(timeKey, []);
                            }
                            this.shortWordsMap.get(timeKey).push(wordData);
                        }
                    }
                    
                    // Índice de tempo para busca rápida
                    this.timeIndex.push({
                        start: word.start,
                        end: word.end,
                        index: globalIndex,
                        data: wordData
                    });
                      // Mapa especial para palavras curtas - ALREADY HANDLED ABOVE
                    // The expanded mapping is now done in the main processing block
                    
                    globalIndex++;
                }
            });
        });
        
        // Ordena índice por tempo
        this.timeIndex.sort((a, b) => a.start - b.start);
        
        const shortWordsCount = this.allWords.filter(w => w.isShort).length;
        const commonWordsCount = this.allWords.filter(w => w.isCommon).length;
        console.log(`✅ [CACHE] Cache built: ${globalIndex} words total, ${shortWordsCount} short words, ${commonWordsCount} common words, ${this.shortWordsMap.size} expanded entries`);
    }    // CRITICAL FIX 7: Optimized method with recent lookups cache
    findWordAtTimeOptimized(currentTime) {
        // Check recent cache first
        const recentKey = Math.round(currentTime * 100);
        if (this.recentLookups.has(recentKey)) {
            return this.recentLookups.get(recentKey);
        }
        
        const result = this.findWordAtTime(currentTime);
        
        // Add to recent cache
        this.recentLookups.set(recentKey, result);
        if (this.recentLookups.size > this.maxRecentSize) {
            const firstKey = this.recentLookups.keys().next().value;
            this.recentLookups.delete(firstKey);
        }
        
        return result;
    }

    findWordAtTime(currentTime) {
        // CRITICAL FIX 8: Absolute priority for short words
        // Check multiple resolutions for short words
        const shortWordKeys = [
            Math.round(currentTime * 500) / 500,          // 2ms
            Math.round((currentTime - 0.002) * 500) / 500, // -2ms
            Math.round((currentTime + 0.002) * 500) / 500  // +2ms
        ];
        
        for (const key of shortWordKeys) {
            const shortWords = this.shortWordsMap.get(key);
            if (shortWords && shortWords.length > 0) {
                // Find best match
                let best = null;
                let bestScore = -1;
                
                for (const word of shortWords) {
                    // CRITICAL FIX 9: Scoring system for best match
                    let score = 0;
                    
                    // Exact range = high score
                    if (currentTime >= word.start && currentTime <= word.end) {
                        score += 100;
                    }
                    
                    // Proximity to word center
                    const wordCenter = (word.start + word.end) / 2;
                    const distance = Math.abs(currentTime - wordCenter);
                    score += (1 - distance) * 50;
                    
                    // Bonus for common words (more prone to error)
                    if (word.isCommon) {
                        score += 20;
                    }
                    
                    // Bonus for very short words
                    if (word.duration < 0.1) {
                        score += 30;
                    }
                    
                    if (score > bestScore) {
                        best = word;
                        bestScore = score;
                    }
                }
                
                if (best && bestScore > 50) { // Minimum confidence threshold
                    return best;
                }
            }
        }
        
        // CRITICAL FIX 10: Fallback to normal cache with multiple attempts
        const timeKeys = [
            Math.round(currentTime * 1000) / 1000,
            Math.round((currentTime - 0.005) * 1000) / 1000,
            Math.round((currentTime + 0.005) * 1000) / 1000
        ];
        
        for (const key of timeKeys) {
            const cachedWords = this.cache.get(key);
            if (cachedWords && cachedWords.length > 0) {
                // Exact match first
                const exactMatch = cachedWords.find(w => 
                    currentTime >= w.start && currentTime <= w.end
                );
                if (exactMatch) return exactMatch;
                
                // Otherwise, closest
                return cachedWords[0];
            }
        }
        
        // Binary search as last resort
        return this.binarySearchWord(currentTime);
    }    binarySearchWord(currentTime) {
        let left = 0;
        let right = this.timeIndex.length - 1;
        let best = null;
        let bestDistance = Infinity;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const word = this.timeIndex[mid];
            
            // CRITICAL FIX 11: Improved adaptive tolerance
            const tolerance = word.data.isShort ? 0.1 : 0.05;
            
            if (currentTime >= word.start - tolerance && 
                currentTime <= word.end + tolerance) {
                return word.data;
            }
            
            // Calculate distance to find closest
            const distance = Math.min(
                Math.abs(currentTime - word.start),
                Math.abs(currentTime - word.end)
            );
            
            if (distance < bestDistance) {
                best = word;
                bestDistance = distance;
            }
            
            if (currentTime < word.start) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        
        // Return closest if within reasonable tolerance
        if (best && bestDistance < 0.2) {
            return best.data;        }
        
        return null;
    }

    // Debug methods
    getShortWords() {
        return this.allWords
            .filter(w => w.isShort)
            .sort((a, b) => a.duration - b.duration);
    }

    getStats() {
        const shortWords = this.getShortWords();
        const commonWords = shortWords.filter(w => w.isCommon);
        
        return {
            totalWords: this.allWords.length,
            shortWords: shortWords.length,
            commonShortWords: commonWords.length,
            avgDuration: this.allWords.reduce((sum, w) => sum + w.duration, 0) / this.allWords.length,
            shortestWord: shortWords[0] || null,
            cacheEntries: this.cache.size,
            shortWordEntries: this.shortWordsMap.size,
            recentCacheSize: this.recentLookups.size
        };
    }    // Clear recent cache (useful when pausing)
    clearRecentCache() {
        this.recentLookups.clear();
    }
}
