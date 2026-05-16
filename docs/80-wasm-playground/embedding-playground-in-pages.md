# Embedding Playground in Pages

## Basic Setup

### 1. Compile Go to WASM

```bash
GOOS=js GOARCH=wasm go build -o main.wasm cmd/main.go
```

### 2. Copy wasm_exec.js

```bash
cp $(go env GOROOT)/misc/wasm/wasm_exec.js .
```

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

## Go Code for Playground

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

## Advanced Embedding

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

## Serving WASM Files

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
