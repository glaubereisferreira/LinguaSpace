// Dictionary Module for Personal Vocabulary Management
export class Dictionary {
    constructor() {
        this.storageKey = 'linguaspace-dictionary';
        this.savedWords = this.loadFromStorage();
        this.colorCategories = {
            '#FF6B6B': 'Important',
            '#FFA500': 'Review',
            '#FFD700': 'New',
            '#4CAF50': 'Known',
            '#2196F3': 'Grammar',
            '#9C27B0': 'Advanced',
            '#FF69B4': 'Favorite'
        };
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading dictionary from storage:', error);
            return {};
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.savedWords));
        } catch (error) {
            console.error('Error saving dictionary to storage:', error);
            
            // Handle storage quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
        }
    }

    handleStorageQuotaExceeded() {
        // Remove oldest entries to make space
        const entries = Object.entries(this.savedWords);
        entries.sort((a, b) => new Date(a[1].addedDate) - new Date(b[1].addedDate));
        
        // Remove oldest 10% of entries
        const toRemove = Math.ceil(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            delete this.savedWords[entries[i][0]];
        }
        
        // Try saving again
        this.saveToStorage();
        
        // Notify user
        console.warn('Storage quota exceeded. Removed oldest dictionary entries.');
    }

    addWord(word, color, context = null) {
        const normalizedWord = word.toLowerCase().trim();
        
        if (!normalizedWord) {
            console.error('Cannot add empty word to dictionary');
            return false;
        }

        const wordData = {
            color: color,
            addedDate: new Date().toISOString(),
            category: this.colorCategories[color] || 'Unknown',
            occurrences: [],
            context: context
        };

        // If word already exists, update it
        if (this.savedWords[normalizedWord]) {
            wordData.occurrences = this.savedWords[normalizedWord].occurrences || [];
        }

        // Add current occurrence
        wordData.occurrences.push({
            timestamp: new Date().toISOString(),
            context: context
        });

        this.savedWords[normalizedWord] = wordData;
        this.saveToStorage();
        
        console.log(`Added word "${normalizedWord}" to dictionary with color ${color}`);
        return true;
    }

    removeWord(word) {
        const normalizedWord = word.toLowerCase().trim();
        
        if (this.savedWords[normalizedWord]) {
            delete this.savedWords[normalizedWord];
            this.saveToStorage();
            console.log(`Removed word "${normalizedWord}" from dictionary`);
            return true;
        }
        
        return false;
    }

    isWordSaved(word) {
        const normalizedWord = word.toLowerCase().trim();
        return this.savedWords.hasOwnProperty(normalizedWord);
    }

    getWordData(word) {
        const normalizedWord = word.toLowerCase().trim();
        return this.savedWords[normalizedWord] || null;
    }

    getSavedWords() {
        return { ...this.savedWords };
    }

    getWordsByCategory(color) {
        return Object.entries(this.savedWords)
            .filter(([word, data]) => data.color === color)
            .reduce((obj, [word, data]) => {
                obj[word] = data;
                return obj;
            }, {});
    }

    getStatistics() {
        const total = Object.keys(this.savedWords).length;
        const categories = {};
        
        Object.values(this.savedWords).forEach(wordData => {
            const category = wordData.category;
            categories[category] = (categories[category] || 0) + 1;
        });

        const oldestEntry = Object.values(this.savedWords)
            .reduce((oldest, current) => {
                return new Date(current.addedDate) < new Date(oldest.addedDate) ? current : oldest;
            }, { addedDate: new Date().toISOString() });

        const newestEntry = Object.values(this.savedWords)
            .reduce((newest, current) => {
                return new Date(current.addedDate) > new Date(newest.addedDate) ? current : newest;
            }, { addedDate: '1970-01-01T00:00:00.000Z' });

        return {
            total,
            categories,
            dateRange: {
                oldest: oldestEntry.addedDate,
                newest: newestEntry.addedDate
            }
        };
    }

    exportDictionary() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            wordCount: Object.keys(this.savedWords).length,
            words: this.savedWords
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `linguaspace-dictionary-${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        console.log('Dictionary exported successfully');
    }

    importDictionary(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // Validate import data
                    if (!importData.words || typeof importData.words !== 'object') {
                        throw new Error('Invalid dictionary format');
                    }

                    // Merge with existing dictionary
                    const mergedWords = { ...this.savedWords, ...importData.words };
                    this.savedWords = mergedWords;
                    this.saveToStorage();
                    
                    console.log(`Dictionary imported successfully. Total words: ${Object.keys(this.savedWords).length}`);
                    resolve({
                        success: true,
                        wordsImported: Object.keys(importData.words).length,
                        totalWords: Object.keys(this.savedWords).length
                    });
                    
                } catch (error) {
                    console.error('Error importing dictionary:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    clearDictionary() {
        if (confirm('Are you sure you want to clear all saved words? This action cannot be undone.')) {
            this.savedWords = {};
            this.saveToStorage();
            console.log('Dictionary cleared');
            return true;
        }
        return false;
    }

    searchWords(query) {
        const normalizedQuery = query.toLowerCase().trim();
        
        if (!normalizedQuery) {
            return Object.entries(this.savedWords);
        }

        return Object.entries(this.savedWords)
            .filter(([word, data]) => 
                word.includes(normalizedQuery) || 
                data.category.toLowerCase().includes(normalizedQuery)
            );
    }

    getRecentWords(limit = 10) {
        return Object.entries(this.savedWords)
            .sort(([, a], [, b]) => new Date(b.addedDate) - new Date(a.addedDate))
            .slice(0, limit);
    }

    getWordFrequency() {
        const frequency = {};
        
        Object.entries(this.savedWords).forEach(([word, data]) => {
            frequency[word] = data.occurrences ? data.occurrences.length : 1;
        });

        return Object.entries(frequency)
            .sort(([, a], [, b]) => b - a);
    }

    // Backup and restore methods
    createBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            data: this.savedWords
        };
        
        localStorage.setItem(`${this.storageKey}-backup`, JSON.stringify(backup));
        console.log('Dictionary backup created');
    }

    restoreFromBackup() {
        try {
            const backup = localStorage.getItem(`${this.storageKey}-backup`);
            if (backup) {
                const backupData = JSON.parse(backup);
                this.savedWords = backupData.data;
                this.saveToStorage();
                console.log('Dictionary restored from backup');
                return true;
            }
        } catch (error) {
            console.error('Error restoring from backup:', error);
        }
        return false;
    }
}
