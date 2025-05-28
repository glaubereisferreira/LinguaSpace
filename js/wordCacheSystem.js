// Word Cache System - Optimized for short words like prepositions
export class WordCacheSystem {
    constructor() {
        this.cache = new Map();
        this.timeIndex = [];
        this.shortWordsMap = new Map();
        this.allWords = [];
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
            segment.words.forEach((word, wordIndex) => {
                if (word.type === 'word') {
                    const duration = word.end - word.start;
                    const isShort = duration < 0.15;
                    
                    // Cria entrada no cache
                    const wordData = {
                        text: word.text,
                        start: word.start,
                        end: word.end,
                        duration: duration,
                        index: globalIndex,
                        segmentIndex: segmentIndex,
                        wordIndex: wordIndex,
                        isShort: isShort
                    };
                    
                    this.allWords.push(wordData);
                    
                    // Cache por tempo (com resolução de 10ms)
                    for (let t = word.start; t <= word.end; t += 0.01) {
                        const timeKey = Math.round(t * 100) / 100;
                        if (!this.cache.has(timeKey)) {
                            this.cache.set(timeKey, []);
                        }
                        this.cache.get(timeKey).push(wordData);
                    }
                    
                    // Índice de tempo para busca rápida
                    this.timeIndex.push({
                        start: word.start,
                        end: word.end,
                        index: globalIndex,
                        data: wordData
                    });
                    
                    // Mapa especial para palavras curtas
                    if (isShort) {
                        // Expande a janela de tempo para palavras curtas
                        const expandedStart = word.start - 0.05;
                        const expandedEnd = word.end + 0.05;
                        
                        for (let t = expandedStart; t <= expandedEnd; t += 0.005) {
                            const timeKey = Math.round(t * 200) / 200;
                            if (!this.shortWordsMap.has(timeKey)) {
                                this.shortWordsMap.set(timeKey, []);
                            }
                            this.shortWordsMap.get(timeKey).push(wordData);
                        }
                        
                        console.log(`📝 [CACHE] Short word "${word.text}": ${(duration * 1000).toFixed(0)}ms (${word.start.toFixed(3)}-${word.end.toFixed(3)})`);
                    }
                    
                    globalIndex++;
                }
            });
        });
        
        // Ordena índice por tempo
        this.timeIndex.sort((a, b) => a.start - b.start);
        
        const shortWordsCount = this.allWords.filter(w => w.isShort).length;
        console.log(`✅ [CACHE] Cache construído: ${globalIndex} palavras total, ${shortWordsCount} palavras curtas, ${this.shortWordsMap.size} entradas expandidas`);
    }

    findWordAtTime(currentTime) {
        // Primeiro, verifica palavras curtas (maior prioridade)
        const shortWordKey = Math.round(currentTime * 200) / 200;
        const shortWords = this.shortWordsMap.get(shortWordKey);
        
        if (shortWords && shortWords.length > 0) {
            // Encontra a palavra curta mais próxima do centro
            let best = shortWords[0];
            let bestDistance = Math.abs(currentTime - (best.start + best.end) / 2);
            
            for (const word of shortWords) {
                if (currentTime >= word.start && currentTime <= word.end) {
                    // Match exato tem prioridade
                    return word;
                }
                
                const distance = Math.abs(currentTime - (word.start + word.end) / 2);
                if (distance < bestDistance) {
                    best = word;
                    bestDistance = distance;
                }
            }
            
            // Só retorna se estiver dentro da tolerância expandida
            if (bestDistance < 0.1) {
                return best;
            }
        }
        
        // Cache normal para palavras mais longas
        const timeKey = Math.round(currentTime * 100) / 100;
        const cachedWords = this.cache.get(timeKey);
        
        if (cachedWords && cachedWords.length > 0) {
            // Procura match exato primeiro
            const exactMatch = cachedWords.find(w => currentTime >= w.start && currentTime <= w.end);
            if (exactMatch) {
                return exactMatch;
            }
            
            // Senão retorna a primeira (mais próxima)
            return cachedWords[0];
        }
        
        // Busca binária como fallback
        return this.binarySearchWord(currentTime);
    }

    binarySearchWord(currentTime) {
        let left = 0;
        let right = this.timeIndex.length - 1;
        let best = null;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const word = this.timeIndex[mid];
            
            // Tolerância adaptativa baseada na duração da palavra
            const tolerance = word.data.isShort ? 0.05 : 0.02;
            
            if (currentTime >= word.start - tolerance && currentTime <= word.end + tolerance) {
                return word.data;
            } else if (currentTime < word.start) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
            
            // Guarda o mais próximo
            if (!best || Math.abs(currentTime - word.start) < Math.abs(currentTime - best.start)) {
                best = word;
            }
        }
        
        return best ? best.data : null;
    }

    // Debug: listar palavras curtas
    getShortWords() {
        return this.allWords.filter(w => w.isShort);
    }

    // Debug: estatísticas
    getStats() {
        const shortWords = this.getShortWords();
        const avgDuration = this.allWords.reduce((sum, w) => sum + w.duration, 0) / this.allWords.length;
        const shortestWord = this.allWords.reduce((min, w) => w.duration < min.duration ? w : min);
        
        return {
            totalWords: this.allWords.length,
            shortWords: shortWords.length,
            avgDuration: avgDuration,
            shortestWord: shortestWord,
            cacheEntries: this.cache.size,
            shortWordEntries: this.shortWordsMap.size
        };
    }
}
