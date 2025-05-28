// js/wordCacheSystem.js - OTIMIZADO PARA PALAVRAS CURTAS

export class WordCacheSystem {
    constructor() {
        this.cache = new Map();
        this.timeIndex = [];
        this.shortWordsMap = new Map();
        this.allWords = [];
        
        // CORREÇÃO 1: Lista de palavras funcionais comuns
        this.commonShortWords = new Set([
            'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'by', 'for',
            'is', 'it', 'or', 'as', 'we', 'be', 'my', 'so', 'up', 'no',
            'if', 'he', 'me', 'do', 'go', 'us', 'am', 'oh', 'hi', 'ok'
        ]);
        
        // CORREÇÃO 2: Cache de lookup recente para performance
        this.recentLookups = new Map();
        this.maxRecentSize = 10;
    }

    buildCache(transcript) {
        console.log('🏗️ [CACHE] Building optimized word cache...');
        
        this.cache.clear();
        this.timeIndex = [];
        this.shortWordsMap.clear();
        this.allWords = [];
        this.recentLookups.clear();
        
        let globalIndex = 0;
        let shortWordStats = {
            total: 0,
            expanded: 0,
            common: 0
        };
        
        transcript.segments.forEach((segment, segmentIndex) => {
            segment.words.forEach((word, wordIndex) => {
                if (word.type === 'word') {
                    const duration = word.end - word.start;
                    const wordLower = word.text.toLowerCase();
                    
                    // CORREÇÃO 3: Critério melhorado para palavras curtas
                    const isShort = duration < 0.2 || // Aumentado de 0.15 para 0.2
                                   this.commonShortWords.has(wordLower) ||
                                   word.text.length <= 2;
                    
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
                    
                    // CORREÇÃO 4: Cache temporal mais granular
                    const timeResolution = isShort ? 0.005 : 0.01; // 5ms para curtas, 10ms para normais
                    
                    for (let t = word.start; t <= word.end; t += timeResolution) {
                        const timeKey = Math.round(t * 1000) / 1000; // Precisão de 1ms
                        if (!this.cache.has(timeKey)) {
                            this.cache.set(timeKey, []);
                        }
                        this.cache.get(timeKey).push(wordData);
                    }
                    
                    // Índice para busca binária
                    this.timeIndex.push({
                        start: word.start,
                        end: word.end,
                        index: globalIndex,
                        data: wordData
                    });
                    
                    // CORREÇÃO 5: Mapa expandido para palavras curtas
                    if (isShort) {
                        shortWordStats.total++;
                        
                        // Expansão maior para palavras muito curtas
                        const expansionFactor = duration < 0.1 ? 0.1 : 0.05;
                        const expandedStart = Math.max(0, word.start - expansionFactor);
                        const expandedEnd = word.end + expansionFactor;
                        
                        // CORREÇÃO 6: Resolução ultra-alta para palavras curtas
                        const shortResolution = 0.002; // 2ms
                        
                        for (let t = expandedStart; t <= expandedEnd; t += shortResolution) {
                            const timeKey = Math.round(t * 500) / 500; // Precisão de 2ms
                            if (!this.shortWordsMap.has(timeKey)) {
                                this.shortWordsMap.set(timeKey, []);
                            }
                            this.shortWordsMap.get(timeKey).push(wordData);
                            shortWordStats.expanded++;
                        }
                        
                        if (this.commonShortWords.has(wordLower)) {
                            shortWordStats.common++;
                        }
                    }
                    
                    globalIndex++;
                }
            });
        });
        
        // Ordenar índice
        this.timeIndex.sort((a, b) => a.start - b.start);
        
        console.log('✅ [CACHE] Cache built:', {
            totalWords: globalIndex,
            shortWords: shortWordStats.total,
            commonShortWords: shortWordStats.common,
            cacheEntries: this.cache.size,
            shortMapEntries: this.shortWordsMap.size
        });
    }

    // CORREÇÃO 7: Método otimizado com cache de lookups recentes
    findWordAtTimeOptimized(currentTime) {
        // Verificar cache recente primeiro
        const recentKey = Math.round(currentTime * 100);
        if (this.recentLookups.has(recentKey)) {
            return this.recentLookups.get(recentKey);
        }
        
        const result = this.findWordAtTime(currentTime);
        
        // Adicionar ao cache recente
        this.recentLookups.set(recentKey, result);
        if (this.recentLookups.size > this.maxRecentSize) {
            const firstKey = this.recentLookups.keys().next().value;
            this.recentLookups.delete(firstKey);
        }
        
        return result;
    }

    findWordAtTime(currentTime) {
        // CORREÇÃO 8: Prioridade absoluta para palavras curtas
        // Verificar múltiplas resoluções para palavras curtas
        const shortWordKeys = [
            Math.round(currentTime * 500) / 500,      // 2ms
            Math.round((currentTime - 0.002) * 500) / 500,  // -2ms
            Math.round((currentTime + 0.002) * 500) / 500   // +2ms
        ];
        
        for (const key of shortWordKeys) {
            const shortWords = this.shortWordsMap.get(key);
            if (shortWords && shortWords.length > 0) {
                // Encontrar melhor match
                let best = null;
                let bestScore = -1;
                
                for (const word of shortWords) {
                    // CORREÇÃO 9: Sistema de pontuação para melhor match
                    let score = 0;
                    
                    // Dentro do range exato = alta pontuação
                    if (currentTime >= word.start && currentTime <= word.end) {
                        score += 100;
                    }
                    
                    // Proximidade ao centro da palavra
                    const wordCenter = (word.start + word.end) / 2;
                    const distance = Math.abs(currentTime - wordCenter);
                    score += (1 - distance) * 50;
                    
                    // Bonus para palavras comuns (mais propensas a erro)
                    if (word.isCommon) {
                        score += 20;
                    }
                    
                    // Bonus para palavras muito curtas
                    if (word.duration < 0.1) {
                        score += 30;
                    }
                    
                    if (score > bestScore) {
                        best = word;
                        bestScore = score;
                    }
                }
                
                if (best && bestScore > 50) { // Threshold mínimo de confiança
                    return best;
                }
            }
        }
        
        // CORREÇÃO 10: Fallback para cache normal com múltiplas tentativas
        const timeKeys = [
            Math.round(currentTime * 1000) / 1000,
            Math.round((currentTime - 0.005) * 1000) / 1000,
            Math.round((currentTime + 0.005) * 1000) / 1000
        ];
        
        for (const key of timeKeys) {
            const cachedWords = this.cache.get(key);
            if (cachedWords && cachedWords.length > 0) {
                // Match exato primeiro
                const exactMatch = cachedWords.find(w => 
                    currentTime >= w.start && currentTime <= w.end
                );
                if (exactMatch) return exactMatch;
                
                // Senão, mais próximo
                return cachedWords[0];
            }
        }
        
        // Busca binária como último recurso
        return this.binarySearchWord(currentTime);
    }

    binarySearchWord(currentTime) {
        let left = 0;
        let right = this.timeIndex.length - 1;
        let best = null;
        let bestDistance = Infinity;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const word = this.timeIndex[mid];
            
            // CORREÇÃO 11: Tolerância adaptativa melhorada
            const tolerance = word.data.isShort ? 0.1 : 0.05;
            
            if (currentTime >= word.start - tolerance && 
                currentTime <= word.end + tolerance) {
                return word.data;
            }
            
            // Calcular distância para encontrar o mais próximo
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
        
        // Retornar o mais próximo se estiver dentro de uma tolerância razoável
        if (best && bestDistance < 0.2) {
            return best.data;
        }
        
        return null;
    }

    // Métodos de debug
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
    }

    // Limpar cache recente (útil quando pausar)
    clearRecentCache() {
        this.recentLookups.clear();
    }
}