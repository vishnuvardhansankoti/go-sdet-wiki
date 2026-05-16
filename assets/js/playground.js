/**
 * Playground.js - Glue between HTML and Go WASM Runtime
 * 
 * Handles loading the Go WASM module and providing an interface
 * for interactive Go code execution in the browser.
 */

class GoPlayground {
    constructor(options = {}) {
        this.wasmUrl = options.wasmUrl || '/assets/wasm/go.wasm';
        this.outputElement = options.outputElement || null;
        this.inputElement = options.inputElement || null;
        this.runButton = options.runButton || null;
        this.go = null;
        this.instance = null;
        this.isRunning = false;
    }

    /**
     * Initialize the Go WASM runtime
     */
    async init() {
        try {
            // Check if WebAssembly is supported
            if (!window.WebAssembly) {
                this.logOutput('WebAssembly is not supported in this browser', 'error');
                return false;
            }

            // Load the Go runtime
            if (typeof Go === 'undefined') {
                this.logOutput('Go runtime not loaded', 'error');
                return false;
            }

            this.go = new Go();

            // Fetch and instantiate the WASM module
            const response = await fetch(this.wasmUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch WASM: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            const wasmModule = await WebAssembly.instantiate(buffer, this.go.importObject);

            this.instance = wasmModule.instance;

            // Setup event listeners
            if (this.runButton) {
                this.runButton.addEventListener('click', () => this.run());
                this.runButton.disabled = false;
            }

            this.logOutput('Playground initialized successfully', 'info');
            return true;
        } catch (error) {
            this.logOutput(`Initialization error: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Run the code in the playground
     */
    async run() {
        if (this.isRunning) {
            this.logOutput('Code is already running', 'warn');
            return;
        }

        if (!this.instance) {
            this.logOutput('Playground not initialized', 'error');
            return;
        }

        try {
            this.isRunning = true;
            if (this.runButton) {
                this.runButton.disabled = true;
                this.runButton.textContent = 'Running...';
            }

            this.clearOutput();

            // Get input code if available
            const code = this.inputElement ? this.inputElement.value : '';
            if (!code.trim()) {
                this.logOutput('No code to run', 'warn');
                return;
            }

            // Store code in window for Go to access
            window.__playgroundCode = code;

            // Run the Go program
            await this.go.run(this.instance);

            this.logOutput('Program completed', 'success');
        } catch (error) {
            this.logOutput(`Runtime error: ${error.message}`, 'error');
        } finally {
            this.isRunning = false;
            if (this.runButton) {
                this.runButton.disabled = false;
                this.runButton.textContent = 'Run Code';
            }
        }
    }

    /**
     * Stop the currently running code
     */
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.logOutput('Program stopped', 'info');
            if (this.runButton) {
                this.runButton.disabled = false;
                this.runButton.textContent = 'Run Code';
            }
        }
    }

    /**
     * Clear output
     */
    clearOutput() {
        if (this.outputElement) {
            this.outputElement.innerHTML = '';
        }
    }

    /**
     * Log output to the output element
     */
    logOutput(message, type = 'log') {
        if (!this.outputElement) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;

        this.outputElement.appendChild(logEntry);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    /**
     * Set code in the input element
     */
    setCode(code) {
        if (this.inputElement) {
            this.inputElement.value = code;
        }
    }

    /**
     * Get code from the input element
     */
    getCode() {
        return this.inputElement ? this.inputElement.value : '';
    }
}

// Export for use in HTML
window.GoPlayground = GoPlayground;

// Auto-initialize if data attribute is present
document.addEventListener('DOMContentLoaded', () => {
    const playgroundElement = document.querySelector('[data-playground]');
    if (playgroundElement) {
        const playground = new GoPlayground({
            wasmUrl: playgroundElement.getAttribute('data-wasm-url') || '/assets/wasm/go.wasm',
            outputElement: document.querySelector(playgroundElement.getAttribute('data-output') || '#output'),
            inputElement: document.querySelector(playgroundElement.getAttribute('data-input') || '#code'),
            runButton: document.querySelector(playgroundElement.getAttribute('data-run-button') || '#run'),
        });

        playground.init().then(success => {
            if (success) {
                window.__playground = playground;
            }
        });
    }
});
