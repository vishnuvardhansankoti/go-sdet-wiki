# Embedding Playground in Pages

Embedding a playground is a docs-engineering task as much as a code task. Reliability depends on correct asset loading, predictable runtime behavior, and clear user feedback when execution fails.

This guide describes a practical embedding path from build output to browser execution.

## Basic Setup

Follow setup in strict order to avoid runtime initialization issues.

### 1. Compile Go to WASM

```bash
GOOS=js GOARCH=wasm go build -o main.wasm cmd/main.go
```

Pin build scripts in repo tooling so docs builds remain reproducible.

### 2. Copy wasm_exec.js

```bash
cp $(go env GOROOT)/misc/wasm/wasm_exec.js .
```

Keep `wasm_exec.js` version aligned with Go toolchain version.

### 3. Create HTML Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Go WASM Playground</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        #output { background: #f0f0f0; padding: 10px; min-height: 50px; border-radius: 4px; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Go WASM Playground</h1>
    
    <button onclick="runCode()">Run Code</button>
    <button onclick="clearOutput()">Clear</button>
    
    <h2>Output:</h2>
    <div id="output"></div>
    
    <script src="wasm_exec.js"></script>
    <script>
        const output = document.getElementById("output");
        
        function log(message) {
            output.textContent += message + "\n";
        }
        
        function clearOutput() {
            output.textContent = "";
        }
        
        async function runCode() {
            clearOutput();
            
            try {
                const wasmBuffer = await fetch("main.wasm").then(r => r.arrayBuffer());
                const { memory } = new WebAssembly.Memory({ initial: 256, maximum: 512 });
                
                const go = new Go();
                go.env = Object.assign({}, process.env);
                go.exit = code => {
                    if (code !== 0) {
                        log(`Exit code: ${code}`);
                    }
                };
                
                const wasmModule = await WebAssembly.instantiate(wasmBuffer, go.importObject);
                go.run(wasmModule.instance);
            } catch (err) {
                log(`Error: ${err.message}`);
            }
        }
        
        // Auto-run on page load
        window.addEventListener("load", runCode);
    </script>
</body>
</html>
```

In production pages, prefer defensive guards against multiple run triggers and repeated instantiation.

## Go Code for Playground

Playground Go code should favor deterministic output and short execution lifecycle.

### Simple Example

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    fmt.Println("Welcome to Go WASM Playground!")
    fmt.Println("Current time:", time.Now().Format("2006-01-02 15:04:05"))
    
    // Demonstrate concurrency
    done := make(chan bool)
    
    go func() {
        time.Sleep(100 * time.Millisecond)
        fmt.Println("Goroutine finished!")
        done <- true
    }()
    
    fmt.Println("Waiting for goroutine...")
    <-done
    fmt.Println("All done!")
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

import (
    "fmt"
    "time"
)

func main() {
    fmt.Println("Welcome to Go WASM Playground!")
    fmt.Println("Current time:", time.Now().Format("2006-01-02 15:04:05"))
    
    // Demonstrate concurrency
    done := make(chan bool)
    
    go func() {
        time.Sleep(100 * time.Millisecond)
        fmt.Println("Goroutine finished!")
        done <- true
    }()
    
    fmt.Println("Waiting for goroutine...")
    <-done
    fmt.Println("All done!")
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


## Advanced Embedding

Interactive editors are useful, but they introduce extra security and resource considerations.

### Interactive Code Editor

```html
<textarea id="code" style="width:100%; height:200px;">
package main

import "fmt"

func main() {
    fmt.Println("Hello from WASM!")
}
</textarea>

<button onclick="compileAndRun()">Compile & Run</button>
<div id="output" style="background:#f0f0f0; padding:10px; margin:10px 0;"></div>

<script src="wasm_exec.js"></script>
<script>
async function compileAndRun() {
    const code = document.getElementById("code").value;
    const output = document.getElementById("output");
    output.textContent = "";
    
    try {
        // In production, send code to server for compilation
        // then load the resulting WASM
        
        const wasmBuffer = await fetch("main.wasm").then(r => r.arrayBuffer());
        const go = new Go();
        
        const wasmModule = await WebAssembly.instantiate(wasmBuffer, go.importObject);
        go.run(wasmModule.instance);
    } catch (err) {
        output.textContent = `Error: ${err.message}`;
    }
}
</script>
```

## Server-Side Compilation

For dynamic compilation in the playground:

```go
// server.go
package main

import (
    "net/http"
    "os"
    "os/exec"
)

func compileHandler(w http.ResponseWriter, r *http.Request) {
    code := r.FormValue("code")
    
    // Write code to temp file
    tmpfile, _ := os.CreateTemp("", "*.go")
    defer tmpfile.Close()
    tmpfile.WriteString(code)
    
    // Compile to WASM
    cmd := exec.Command("go", "build", "-o", "output.wasm", tmpfile.Name())
    cmd.Env = append(os.Environ(), "GOOS=js", "GOARCH=wasm")
    cmd.Run()
    
    // Serve compiled WASM
    wasmData, _ := os.ReadFile("output.wasm")
    w.Header().Set("Content-Type", "application/wasm")
    w.Write(wasmData)
}

func main() {
    http.HandleFunc("/compile", compileHandler)
    http.ListenAndServe(":8080", nil)
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">// server.go
package main

import (
    "net/http"
    "os"
    "os/exec"
)

func compileHandler(w http.ResponseWriter, r *http.Request) {
    code := r.FormValue("code")
    
    // Write code to temp file
    tmpfile, _ := os.CreateTemp("", "*.go")
    defer tmpfile.Close()
    tmpfile.WriteString(code)
    
    // Compile to WASM
    cmd := exec.Command("go", "build", "-o", "output.wasm", tmpfile.Name())
    cmd.Env = append(os.Environ(), "GOOS=js", "GOARCH=wasm")
    cmd.Run()
    
    // Serve compiled WASM
    wasmData, _ := os.ReadFile("output.wasm")
    w.Header().Set("Content-Type", "application/wasm")
    w.Write(wasmData)
}

func main() {
    http.HandleFunc("/compile", compileHandler)
    http.ListenAndServe(":8080", nil)
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


Never expose unrestricted compilation endpoints in public environments without sandboxing and abuse controls.

## Serving WASM Files

Serving headers and MIME types are non-negotiable for reliable browser execution.

### Correct MIME Type

```go
mux.HandleFunc("/wasm/", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/wasm")
    http.ServeFile(w, r, r.URL.Path[1:])
})
```

### With CORS

```go
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Content-Type", "application/wasm")
```

## Performance Optimization

Performance optimization should target both payload size and first-run interactivity.

### Use gzip

```bash
gzip -k main.wasm
```

### Lazy Loading

```javascript
async function loadWasm() {
    const response = await fetch("main.wasm.gz");
    const compressed = await response.arrayBuffer();
    const decompressed = pako.ungzip(compressed);
    return WebAssembly.instantiate(decompressed);
}
```

### Code Splitting

Break large applications into smaller WASM modules loaded on demand.

## Testing Playground Code

Add smoke tests for boot/run/output flow whenever runtime assets or scripts change.

```go
func TestPlaygroundCode(t *testing.T) {
    // Test code that will run in playground
    
    output := captureOutput(func() {
        main() // Run playground main
    })
    
    if !strings.Contains(output, "Hello from WASM!") {
        t.Errorf("unexpected output: %s", output)
    }
}
```

## Deep Dive: Robust Embedding and Runtime Safety

### Background

Embedding reliability depends on script initialization order, error visibility, and predictable module loading behavior.

### Robust embedding checklist

1. Load `wasm_exec.js` before instantiating the module.
2. Provide explicit error messages for fetch/instantiate failures.
3. Guard against duplicate runs from repeated button clicks.
4. Use proper MIME type (`application/wasm`) on the server.

### Performance guidance

- Lazy-load large WASM modules when user action triggers execution.
- Keep compiled examples small to reduce first-run delay.
- Use compression in hosted docs environments.

### SDET recommendation

Add smoke checks for playground boot, run button behavior, and output rendering to catch regressions in docs infrastructure.

## Common Anti-Patterns

- Loading `wasm_exec.js` after module instantiation attempt.
- Re-running the same module instance without lifecycle guards.
- Serving `.wasm` without correct MIME type.
- Exposing compile endpoints without sandbox/resource controls.

## Quick Embedding Checklist

- Are build artifacts generated reproducibly?
- Is `wasm_exec.js` version matched to Go version?
- Are fetch/instantiate errors clearly surfaced to users?
- Are MIME type and caching headers configured correctly?
- Are boot/run/output smoke checks part of docs validation?

