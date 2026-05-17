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

function extractGoImports(code) {
    const imports = [];

    // Single import form: import "fmt"
    const singleImportRegex = /^\s*import\s+"([^"]+)"/gm;
    let singleMatch;
    while ((singleMatch = singleImportRegex.exec(code)) !== null) {
        imports.push(singleMatch[1]);
    }

    // Group import form:
    // import (
    //   "fmt"
    // )
    const groupImportRegex = /^\s*import\s*\(([\s\S]*?)\)/gm;
    let groupMatch;
    while ((groupMatch = groupImportRegex.exec(code)) !== null) {
        const groupBody = groupMatch[1];
        const itemRegex = /"([^"]+)"/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(groupBody)) !== null) {
            imports.push(itemMatch[1]);
        }
    }

    return imports;
}

function isUnsupportedInlineImport(importPath) {
    // Relative/absolute imports and repo module imports need multi-file/module context.
    if (importPath.startsWith(".") || importPath.startsWith("/")) {
        return true;
    }

    if (importPath.startsWith("go-sdet-wiki/")) {
        return true;
    }

    // Domain-style paths (example.com/pkg, github.com/org/repo, etc.) are not stdlib.
    const firstSegment = importPath.split("/")[0];
    if (firstSegment.includes(".")) {
        return true;
    }

    // Common teaching placeholders for local module examples.
    if (importPath.includes("yourusername") || importPath.includes("example.com/")) {
        return true;
    }

    return false;
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

    const imports = extractGoImports(code);
    const unsupportedImports = imports.filter(isUnsupportedInlineImport);

    if (unsupportedImports.length > 0) {
        output.textContent =
            "This snippet uses package imports that require a multi-file/module setup and cannot run inline here.\n\n" +
            `Detected imports: ${unsupportedImports.join(", ")}\n` +
            "Tip: use the self-contained runnable version, or run this example locally in a full Go project.\n";
        return;
    }

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
