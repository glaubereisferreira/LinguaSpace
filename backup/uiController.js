// UI Controller Module for Managing User Interface Interactions
export class UIController {
    constructor() {
        this.eventListeners = {};
        this.isPlaying = false;
        this.currentSpeed = 1;
        this.isLooping = false;
        this.isDragging = false;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Main control elements
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        this.progressHandle = document.getElementById('progress-handle');
        this.currentTimeElement = document.getElementById('current-time');
        this.totalTimeElement = document.getElementById('total-time');
        
        // Feature buttons
        this.loopBtn = document.getElementById('loop-btn');
        this.dictionaryBtn = document.getElementById('dictionary-btn');
        
        // Speed buttons
        this.speedButtons = document.querySelectorAll('.speed-btn');
        
        // Jump buttons
        this.jumpButtons = document.querySelectorAll('.jump-btn');
        
        // Context menu
        this.contextMenu = document.getElementById('context-menu');
        
        // Sidebar
        this.dictionarySidebar = document.getElementById('dictionary-sidebar');
        this.closeSidebarBtn = document.getElementById('close-sidebar');
    }

    setupEventListeners() {        // Play/pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => {
                this.emit('play-pause');
            });
        }        // Progress bar interaction
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => {
                if (!this.isDragging) {
                    this.handleProgressBarClick(e);
                }
            });

            this.progressBar.addEventListener('mousedown', (e) => {
                this.startDragging(e);
            });

            document.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    this.handleProgressBarDrag(e);
                }
            });

            document.addEventListener('mouseup', () => {
                this.stopDragging();
            });
        }

        // Speed control buttons
        this.speedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                this.setActiveSpeed(speed);
                this.emit('speed-change', speed);
            });
        });        // Jump buttons
        this.jumpButtons.forEach(btn => {
            btn.addEventListener('click', () => {                const seconds = parseInt(btn.dataset.seconds);
                this.emit('jump', seconds);
                this.animateButtonPress(btn);
            });
        });

        // Loop button
        if (this.loopBtn) {
            this.loopBtn.addEventListener('click', () => {
                this.toggleLoop();
            });
        }

        // Dictionary button
        if (this.dictionaryBtn) {
            this.dictionaryBtn.addEventListener('click', () => {
                this.emit('dictionary-toggle');
            });
        }

        // Close sidebar button
        if (this.closeSidebarBtn) {
            this.closeSidebarBtn.addEventListener('click', () => {
                this.dictionarySidebar.classList.add('hidden');
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Click outside context menu to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
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
    }    // Progress bar handling
    handleProgressBarClick(e) {
        if (this.isDragging) return; // Don't handle clicks while dragging
          const rect = this.progressBar.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        
        this.emit('seek-percentage', clampedPercentage);
    }

    startDragging(e) {
        this.isDragging = true;
        this.progressBar.classList.add('dragging');
        this.handleProgressBarDrag(e);
    }

    handleProgressBarDrag(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        
        this.updateProgressVisual(percentage);
        this.emit('seek-percentage', percentage);
    }

    stopDragging() {
        this.isDragging = false;
        this.progressBar.classList.remove('dragging');
    }

    updateProgressVisual(percentage) {
        if (this.progressFill) {
            this.progressFill.style.width = `${percentage}%`;
        }
        if (this.progressHandle) {
            this.progressHandle.style.left = `${percentage}%`;
        }
    }

    // Audio control methods
    updatePlayButton(isPlaying) {
        this.isPlaying = isPlaying;
        
        if (this.playPauseBtn) {
            const playIcon = this.playPauseBtn.querySelector('.play-icon');
            const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
            
            if (isPlaying) {
                playIcon?.classList.add('hidden');
                pauseIcon?.classList.remove('hidden');
            } else {
                playIcon?.classList.remove('hidden');
                pauseIcon?.classList.add('hidden');
            }
        }
    }

    updateProgress(currentTime, duration) {
        if (!this.isDragging && duration > 0) {
            const percentage = (currentTime / duration) * 100;
            this.updateProgressVisual(percentage);
        }
        
        // Update time displays
        if (this.currentTimeElement) {
            this.currentTimeElement.textContent = this.formatTime(currentTime);
        }
    }

    updateDuration(duration) {
        if (this.totalTimeElement) {
            this.totalTimeElement.textContent = this.formatTime(duration);
        }
    }

    // Speed control
    setActiveSpeed(speed) {
        this.currentSpeed = speed;
        
        this.speedButtons.forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.speed) === speed) {
                btn.classList.add('active');
            }
        });
    }

    // Loop control
    toggleLoop() {
        this.isLooping = !this.isLooping;
        
        if (this.loopBtn) {
            const loopText = this.loopBtn.querySelector('.loop-text');
            
            if (this.isLooping) {
                this.loopBtn.classList.add('active');
                if (loopText) loopText.textContent = 'Loop On';
            } else {
                this.loopBtn.classList.remove('active');
                if (loopText) loopText.textContent = 'Loop Off';
            }
        }
        
        this.emit('loop-toggle', this.isLooping);
    }

    // Context menu
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.classList.add('hidden');
        }
    }

    // Animation effects
    animateButtonPress(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Don't trigger shortcuts if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.emit('play-pause');
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                const jumpBackSeconds = e.shiftKey ? -10 : -5;
                this.emit('jump', jumpBackSeconds);
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                const jumpForwardSeconds = e.shiftKey ? 10 : 5;
                this.emit('jump', jumpForwardSeconds);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.changeSpeed(0.25);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.changeSpeed(-0.25);
                break;
                
            case 'KeyL':
                e.preventDefault();
                this.toggleLoop();
                break;
                
            case 'KeyD':
                e.preventDefault();
                this.emit('dictionary-toggle');
                break;
                
            case 'Escape':
                this.hideContextMenu();
                if (!this.dictionarySidebar.classList.contains('hidden')) {
                    this.dictionarySidebar.classList.add('hidden');
                }
                break;
        }
    }

    changeSpeed(delta) {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        const currentIndex = speeds.indexOf(this.currentSpeed);
        const newIndex = Math.max(0, Math.min(speeds.length - 1, currentIndex + Math.sign(delta)));
        const newSpeed = speeds[newIndex];
        
        this.setActiveSpeed(newSpeed);
        this.emit('speed-change', newSpeed);
    }

    // Utility methods
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) {
            return '0:00';
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Notification system
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Slide in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Slide out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Loading states
    setLoadingState(element, isLoading) {
        if (!element) return;
        
        if (isLoading) {
            element.disabled = true;
            element.style.opacity = '0.6';
            element.style.cursor = 'wait';
        } else {
            element.disabled = false;
            element.style.opacity = '';
            element.style.cursor = '';
        }
    }

    // Responsive behavior
    handleResize() {
        // Adjust UI for mobile if needed
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // Add mobile-specific adjustments
            this.progressBar.style.height = '12px';
        } else {
            this.progressBar.style.height = '';
        }
    }
}

// Initialize resize handler
window.addEventListener('resize', () => {
    if (window.uiController) {
        window.uiController.handleResize();
    }
});
