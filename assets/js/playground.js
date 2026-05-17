let __goRuntimeReady = false;
let __goRuntimeInitPromise = null;

function detectBasePath() {
    const path = window.location.pathname || "/";
    if (path.startsWith("/go-sdet-wiki/")) {
        return "/go-sdet-wiki";
    }
    return "";
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBridgeFunction(timeoutMs) {
    const startedAt = Date.now();
    while (typeof window.__run_go_code__ !== "function") {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Timed out waiting for Go runtime to initialize.");
        }
        await sleep(25);
    }
}

async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

async function ensureGoRuntime() {
    if (__goRuntimeReady) {
        return;
    }

    if (__goRuntimeInitPromise) {
        return __goRuntimeInitPromise;
    }

    __goRuntimeInitPromise = (async () => {
        const basePath = detectBasePath();
        const wasmUrl = `${basePath}/assets/wasm/go.wasm`;

        const response = await fetchWithTimeout(wasmUrl, 8000);
        if (!response.ok) {
            throw new Error(`Unable to load ${wasmUrl} (${response.status}).`);
        }

        const go = new Go();
        const wasmBytes = await response.arrayBuffer();
        const result = await WebAssembly.instantiate(wasmBytes, go.importObject);

        // Start Go runtime once and keep bridge function alive for subsequent runs.
        go.run(result.instance);
        await waitForBridgeFunction(4000);
        __goRuntimeReady = true;
    })();

    return __goRuntimeInitPromise;
}

async function runGoPlayground(button) {
    const container = button.closest(".go-playground");
    const code = container.querySelector(".go-code").value;
    const output = container.querySelector(".go-output");

    output.textContent = "Running...\n";
    button.disabled = true;

    try {
        await ensureGoRuntime();
        window.__go_code__ = code;
        window.__go_output__ = "";

        window.__run_go_code__();
        await sleep(10);

        output.textContent += window.__go_output__ || "(no output)\n";
    } catch (err) {
        output.textContent += `Error: ${err && err.message ? err.message : String(err)}\n`;
    } finally {
        button.disabled = false;
    }
}
