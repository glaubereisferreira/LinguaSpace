// js/app.js - CORREÇÕES PRINCIPAIS

class LinguaSpaceApp {
    constructor() {
        this.audioPlayer = null;
        this.transcriptRenderer = null;
        this.highFrequencyHighlighter = null;
        this.dictionary = null;
        this.uiController = null;
        this.transcriptData = null;
        this.isInitialized = false;
        
        // CORREÇÃO 1: ATIVAR O HIGH FREQUENCY HIGHLIGHTER!
        this.useHighFrequencyHighlighter = true; // ← MUDANÇA CRÍTICA
        this.performanceMode = true;
        
        this.init();
    }

    async init() {
        try {
            this.showLoadingOverlay(true);
            
            this.dictionary = new Dictionary();
            this.uiController = new UIController();
            
            // CORREÇÃO 2: Adicionar fallback para arquivos
            await this.loadTranscriptData();
            
            this.audioPlayer = new AudioPlayer('audio-player');
            
            // CORREÇÃO 3: Desativar o TranscriptRenderer duplicado quando usar HighFrequency
            if (this.useHighFrequencyHighlighter) {
                // Criar renderer mínimo apenas para estrutura
                this.transcriptRenderer = new TranscriptRenderer(
                    this.transcriptData,
                    this.audioPlayer,
                    this.dictionary
                );
                // Desabilitar o update de highlight do renderer antigo
                this.transcriptRenderer.updateHighlight = () => {}; // Noop
            } else {
                this.transcriptRenderer = new TranscriptRenderer(
                    this.transcriptData,
                    this.audioPlayer,
                    this.dictionary
                );
            }
            
            const transcriptContainer = document.getElementById('transcript-content');
            this.highFrequencyHighlighter = new HighFrequencyHighlighter(
                transcriptContainer,
                this.audioPlayer
            );
            
            this.setupEventListeners();
            await this.transcriptRenderer.render();
            
            if (this.useHighFrequencyHighlighter && this.highFrequencyHighlighter) {
                await this.highFrequencyHighlighter.init(this.transcriptData);
            }
            
            this.updateWordCount();
            this.setupDebugCommands();
            this.showLoadingOverlay(false);
            
            this.isInitialized = true;
            console.log('🚀 App initialized with High Frequency Highlighter');
            
        } catch (error) {
            console.error('Failed to initialize LinguaSpace:', error);
            this.showError(`Failed to load: ${error.message}`);
        }
    }

    // CORREÇÃO 4: Melhor tratamento de erro ao carregar arquivos
    async loadTranscriptData() {
        try {
            // Tentar carregar o arquivo principal
            let response = await fetch('Books_Summary.json');
            
            // Se falhar, tentar arquivo alternativo
            if (!response.ok) {
                console.warn('Books_Summary.json not found, trying fallback...');
                response = await fetch('transcript.json');
            }
            
            // Se ainda falhar, usar dados de exemplo
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
            // Usar dados de demonstração como fallback
            this.transcriptData = this.getDemoTranscript();
        }
    }

    // CORREÇÃO 5: Dados de demonstração para evitar quebra total
    getDemoTranscript() {
        return {
            segments: [{
                words: [
                    { type: 'word', text: 'Welcome', start: 0.0, end: 0.5 },
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'to', start: 0.5, end: 0.6 }, // Palavra curta!
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'LinguaSpace', start: 0.6, end: 1.2 },
                    { type: 'spacing', text: '. ' },
                    { type: 'word', text: 'This', start: 1.3, end: 1.5 },
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'is', start: 1.5, end: 1.6 }, // Palavra curta!
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'a', start: 1.6, end: 1.65 }, // Palavra curta!
                    { type: 'spacing', text: ' ' },
                    { type: 'word', text: 'demo', start: 1.65, end: 2.0 },
                    { type: 'spacing', text: '.' }
                ]
            }]
        };
    }

    setupEventListeners() {
        // CORREÇÃO 6: Remover throttling excessivo
        this.audioPlayer.on('timeupdate', (currentTime) => {
            // Usar apenas o high frequency highlighter se ativo
            if (this.useHighFrequencyHighlighter && this.highFrequencyHighlighter) {
                // High-frequency highlighter já tem sua própria otimização
                // Não fazer nada aqui para evitar conflito
            } else {
                this.transcriptRenderer.updateHighlight(currentTime);
            }
            
            // UI updates podem continuar com throttle
            this.uiController.updateProgress(currentTime, this.audioPlayer.duration);
        });

        // ... resto dos event listeners ...
    }
}