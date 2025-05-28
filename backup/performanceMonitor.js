// Performance Monitor Module for INP and FID tracking
export class PerformanceMonitor {
    constructor() {
        this.inpObserver = null;
        this.fidObserver = null;
        this.isSupported = 'PerformanceObserver' in window;
        this.metrics = {
            inp: [],
            fid: [],
            cls: []
        };
        
        this.init();
    }

    init() {
        if (!this.isSupported) {
            console.warn('⚠️ PerformanceObserver not supported in this browser');
            return;
        }

        this.observeINP();
        this.observeFID();
        this.observeCLS();
        this.addVisibilityChangeHandler();
    }

    // Observe Interaction to Next Paint (INP)
    observeINP() {
        try {
            // Use the new event timing API for INP measurement
            this.inpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                entries.forEach(entry => {
                    // Only measure user interactions (click, keydown, pointerdown)
                    if (['click', 'keydown', 'pointerdown'].includes(entry.name)) {
                        const inp = entry.processingEnd - entry.processingStart;
                        
                        this.metrics.inp.push({
                            value: inp,
                            timestamp: entry.startTime,
                            target: entry.target?.tagName || 'unknown',
                            type: entry.name
                        });

                        // Log significant INP values
                        if (inp > 200) {
                            console.warn(`🚨 High INP detected: ${inp.toFixed(2)}ms for ${entry.name} on ${entry.target?.tagName}`);
                        } else if (inp > 100) {
                            console.warn(`⚠️ Moderate INP: ${inp.toFixed(2)}ms for ${entry.name} on ${entry.target?.tagName}`);
                        } else {
                            console.log(`✅ Good INP: ${inp.toFixed(2)}ms for ${entry.name} on ${entry.target?.tagName}`);
                        }
                    }
                });
            });

            this.inpObserver.observe({ type: 'event', buffered: true });
        } catch (error) {
            console.warn('INP observation not supported:', error);
        }
    }

    // Observe First Input Delay (FID)
    observeFID() {
        try {
            this.fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                entries.forEach(entry => {
                    const fid = entry.processingStart - entry.startTime;
                    
                    this.metrics.fid.push({
                        value: fid,
                        timestamp: entry.startTime,
                        target: entry.target?.tagName || 'unknown'
                    });

                    if (fid > 100) {
                        console.warn(`🚨 High FID detected: ${fid.toFixed(2)}ms`);
                    } else {
                        console.log(`✅ Good FID: ${fid.toFixed(2)}ms`);
                    }
                });
            });

            this.fidObserver.observe({ type: 'first-input', buffered: true });
        } catch (error) {
            console.warn('FID observation not supported:', error);
        }
    }

    // Observe Cumulative Layout Shift (CLS)
    observeCLS() {
        try {
            const clsObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        this.metrics.cls.push({
                            value: entry.value,
                            timestamp: entry.startTime
                        });

                        if (entry.value > 0.1) {
                            console.warn(`🚨 High CLS detected: ${entry.value.toFixed(3)}`);
                        }
                    }
                });
            });

            clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (error) {
            console.warn('CLS observation not supported:', error);
        }
    }

    // Handle page visibility change to report final metrics
    addVisibilityChangeHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.reportMetrics();
            }
        });

        // Also report on page unload
        window.addEventListener('beforeunload', () => {
            this.reportMetrics();
        });
    }

    // Get current INP statistics
    getINPStats() {
        if (this.metrics.inp.length === 0) {
            return { average: 0, max: 0, count: 0, p75: 0 };
        }

        const values = this.metrics.inp.map(m => m.value).sort((a, b) => a - b);
        const p75Index = Math.floor(values.length * 0.75);
        
        return {
            average: values.reduce((a, b) => a + b, 0) / values.length,
            max: Math.max(...values),
            count: values.length,
            p75: values[p75Index] || 0,
            recent: values.slice(-5) // Last 5 interactions
        };
    }

    // Get current FID statistics
    getFIDStats() {
        if (this.metrics.fid.length === 0) {
            return { value: 0, timestamp: 0 };
        }

        return this.metrics.fid[0]; // FID is only measured once
    }

    // Get current CLS statistics
    getCLSStats() {
        const totalCLS = this.metrics.cls.reduce((sum, entry) => sum + entry.value, 0);
        return {
            total: totalCLS,
            count: this.metrics.cls.length
        };
    }

    // Report all metrics
    reportMetrics() {
        const inpStats = this.getINPStats();
        const fidStats = this.getFIDStats();
        const clsStats = this.getCLSStats();

        console.group('📊 Performance Metrics Report');
        console.log(`🎯 INP (Interaction to Next Paint):`);
        console.log(`   • Average: ${inpStats.average.toFixed(2)}ms`);
        console.log(`   • 75th percentile: ${inpStats.p75.toFixed(2)}ms`);
        console.log(`   • Max: ${inpStats.max.toFixed(2)}ms`);
        console.log(`   • Interactions counted: ${inpStats.count}`);
        
        if (fidStats.value > 0) {
            console.log(`⚡ FID (First Input Delay): ${fidStats.value.toFixed(2)}ms`);
        }
        
        console.log(`📐 CLS (Cumulative Layout Shift): ${clsStats.total.toFixed(3)}`);
        console.groupEnd();

        // Provide recommendations
        this.provideRecommendations(inpStats, fidStats, clsStats);
    }

    // Provide performance recommendations
    provideRecommendations(inpStats, fidStats, clsStats) {
        console.group('💡 Performance Recommendations');
        
        if (inpStats.p75 > 200) {
            console.warn('🚨 INP is Poor (>200ms). Consider:');
            console.warn('   • Reducing JavaScript execution time');
            console.warn('   • Using requestIdleCallback for non-critical work');
            console.warn('   • Breaking up long tasks with setTimeout/yield');
        } else if (inpStats.p75 > 100) {
            console.warn('⚠️ INP needs improvement (>100ms). Consider optimizing event handlers.');
        } else {
            console.log('✅ INP is Good (<100ms)');
        }

        if (fidStats.value > 100) {
            console.warn('🚨 FID is Poor (>100ms). Optimize initial JavaScript loading.');
        } else if (fidStats.value > 0) {
            console.log('✅ FID is Good');
        }

        if (clsStats.total > 0.25) {
            console.warn('🚨 CLS is Poor (>0.25). Reserve space for dynamic content.');
        } else if (clsStats.total > 0.1) {
            console.warn('⚠️ CLS needs improvement (>0.1).');
        } else {
            console.log('✅ CLS is Good');
        }
        
        console.groupEnd();
    }

    // Create a performance dashboard element
    createDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'performance-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 250px;
        `;
        
        document.body.appendChild(dashboard);
        
        // Update dashboard every 2 seconds
        setInterval(() => {
            const inpStats = this.getINPStats();
            const clsStats = this.getCLSStats();
            
            dashboard.innerHTML = `
                <div><strong>Performance Monitor</strong></div>
                <div>INP P75: ${inpStats.p75.toFixed(1)}ms</div>
                <div>INP Avg: ${inpStats.average.toFixed(1)}ms</div>
                <div>INP Max: ${inpStats.max.toFixed(1)}ms</div>
                <div>Interactions: ${inpStats.count}</div>
                <div>CLS: ${clsStats.total.toFixed(3)}</div>
            `;
        }, 2000);

        return dashboard;
    }

    // Manually measure an interaction
    measureInteraction(callback, description = 'manual') {
        const start = performance.now();
        
        // Execute the callback
        const result = callback();
        
        // Handle promises
        if (result && typeof result.then === 'function') {
            return result.then(value => {
                const duration = performance.now() - start;
                console.log(`⏱️ ${description}: ${duration.toFixed(2)}ms`);
                return value;
            });
        } else {
            const duration = performance.now() - start;
            console.log(`⏱️ ${description}: ${duration.toFixed(2)}ms`);
            return result;
        }
    }
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
    window.performanceMonitor = new PerformanceMonitor();
    
    // Add keyboard shortcut to show dashboard (Ctrl+Shift+P)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            const existing = document.getElementById('performance-dashboard');
            if (existing) {
                existing.remove();
            } else {
                window.performanceMonitor.createDashboard();
            }
        }
    });
}