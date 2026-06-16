/**
 * Page Visibility Tracker
 * Monitors when user switches tabs or minimizes window
 * Allows proper resource cleanup and status management
 */

class PageVisibilityTracker {
    constructor() {
        this.isVisible = !document.hidden;
        this.listeners = new Set();
        this.statusCheckInterval = null;
        this.setupVisibilityListeners();
    }

    /**
     * Setup event listeners for page visibility changes
     */
    setupVisibilityListeners() {
        const handleVisibilityChange = () => {
            this.isVisible = !document.hidden;
            this.notifyListeners(this.isVisible);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', () => {
            this.isVisible = false;
            this.notifyListeners(false);
        });
        window.addEventListener('focus', () => {
            this.isVisible = true;
            this.notifyListeners(true);
        });
    }

    /**
     * Register callback for visibility changes
     */
    onChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Get current visibility status
     */
    isPageVisible() {
        return this.isVisible && !document.hidden;
    }

    /**
     * Notify all listeners of visibility change
     */
    notifyListeners(isVisible) {
        this.listeners.forEach((callback) => {
            try {
                callback(isVisible);
            } catch (error) {
                console.error('Error in visibility listener:', error);
            }
        });
    }

    /**
     * Request periodic status check (e.g., every 5 seconds)
     * Returns cleanup function
     */
    startPeriodicCheck(intervalMs = 5000) {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }

        this.statusCheckInterval = window.setInterval(() => {
            const currentState = this.isPageVisible();
            if (currentState !== this.isVisible) {
                this.isVisible = currentState;
                this.notifyListeners(currentState);
            }
        }, intervalMs);

        return () => {
            if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = null;
            }
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.listeners.clear();
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }
}

export const pageVisibility = new PageVisibilityTracker();
