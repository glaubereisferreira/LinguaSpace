# 🎧 LinguaSpace

**Interactive Podcast Study Tool with Real-time Transcription and Performance Optimization**

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://your-username.github.io/LinguaSpace)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/INP-<100ms-success)](https://web.dev/inp/)

## 🌟 Features

- **🎯 Real-time Audio Synchronization** - Word-level highlighting synchronized with audio playback
- **⚡ High-Performance UI** - Optimized for INP (Interaction to Next Paint) < 100ms
- **🎮 Interactive Controls** - Play/pause, speed control, jump buttons, and progress scrubbing
- **📚 Built-in Dictionary** - Click any word for instant definitions
- **⌨️ Keyboard Shortcuts** - Full keyboard navigation support
- **📊 Performance Monitoring** - Real-time performance metrics and optimization
- **🎨 Modern Design** - Clean, responsive interface with dark theme

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/LinguaSpace.git
   cd LinguaSpace
   ```

2. **Start a local server**
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Using Node.js (if you have it)
   npx serve .
   
   # Using PHP
   php -S localhost:8080
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

### Using Your Own Content

1. Replace `preview_file.mp3` with your audio file
2. Update the transcript data in the JavaScript files
3. Customize styling in `styles.css`

## 🎮 Controls & Shortcuts

| Action | Mouse/Click | Keyboard |
|--------|-------------|----------|
| Play/Pause | Click play button | `Space` |
| Jump backward | Click -10s, -5s buttons | `←` (5s), `Shift+←` (10s) |
| Jump forward | Click +5s, +10s buttons | `→` (5s), `Shift+→` (10s) |
| Speed up | Click speed buttons | `↑` |
| Speed down | Click speed buttons | `↓` |
| Performance Monitor | - | `Ctrl+Shift+P` |

## 📊 Performance Features

This project has been heavily optimized for performance:

- **INP Optimization** - All user interactions respond in <100ms
- **Debounced Event Handlers** - Prevents excessive DOM updates
- **RequestAnimationFrame** - Smooth animations and UI updates
- **Idle Task Scheduling** - Non-critical work deferred to idle time
- **Real-time Monitoring** - Built-in performance dashboard

Press `Ctrl+Shift+P` to view live performance metrics!

## 🏗️ Architecture

```
LinguaSpace/
├── index.html              # Main HTML structure
├── styles.css              # Modern CSS styling
├── js/
│   ├── app.js              # Main application controller
│   ├── audioPlayer.js      # Audio playback management
│   ├── transcriptRenderer.js # Transcript highlighting
│   ├── uiController.js     # UI event handling
│   ├── dictionary.js       # Word definition lookup
│   ├── performanceMonitor.js # Performance tracking
│   └── highFrequencyHighlighter.js # Advanced highlighting
└── docs/
    ├── INP_OPTIMIZATION_REPORT.md
    └── PERFORMANCE_OPTIMIZATIONS.md
```

## 🔧 Technical Details

### Core Technologies
- **Vanilla JavaScript** (ES6+ modules)
- **Web Audio API** for audio control
- **Performance Observer API** for metrics
- **RequestAnimationFrame** for smooth animations
- **RequestIdleCallback** for background tasks

### Performance Optimizations
- Event debouncing (16ms-200ms depending on criticality)
- Throttled time updates to prevent excessive rendering
- Idle task scheduling for non-critical operations
- Frame-aligned visual updates
- Optimized DOM manipulation patterns

## 📈 Performance Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| INP (Interaction to Next Paint) | <200ms | <100ms ✅ |
| FID (First Input Delay) | <100ms | <50ms ✅ |
| CLS (Cumulative Layout Shift) | <0.1 | <0.05 ✅ |

## 🎯 Use Cases

- **Language Learning** - Study foreign language podcasts with synchronized text
- **Accessibility** - Audio content with visual text support
- **Content Creation** - Review and edit podcast transcripts
- **Research** - Analyze spoken content with precise navigation
- **Education** - Interactive learning materials

## 🔮 Future Enhancements

- [ ] WebVTT subtitle support
- [ ] Multi-language dictionary
- [ ] Speed reading mode
- [ ] Bookmark system
- [ ] Export functionality
- [ ] Mobile app (React Native)
- [ ] AI-powered summaries

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with performance-first principles
- Inspired by modern web application architecture
- Optimized for Core Web Vitals compliance

---

**Made with ❤️ for better learning experiences**

[⭐ Star this repo](https://github.com/your-username/LinguaSpace/stargazers) if you find it useful!
