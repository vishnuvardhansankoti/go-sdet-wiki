# Playground Overview

## What is the WASM Playground?

A browser-based environment for running and testing Go code compiled to WebAssembly (WASM), directly in the documentation.

## Benefits

- **Interactive Learning**: Run code examples directly in the docs
- **No Installation**: Users don't need to install Go
- **Immediate Feedback**: Execute and see results instantly
- **Embedded Examples**: Keep code examples close to documentation

## Use Cases

1. **Algorithm Examples**: Show how concurrency patterns work
2. **Test Demonstrations**: Run real tests in the browser
3. **API Examples**: Show request/response patterns
4. **Interactive Tutorials**: Build guided learning experiences

## How WASM Playground Works

### Architecture

```
Browser
├── HTML/JavaScript
├── Go Code (compiled to WASM)
└── Runtime Environment
    └── Output Display
```

### Execution Flow

1. User clicks "Run"
2. JavaScript loads WASM module
3. Go code executes in browser
4. Results displayed in output area

## Browser Compatibility

- Chrome 74+
- Firefox 79+
- Safari 14.1+
- Edge 79+

## Simple Example

### Go Code

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello from WebAssembly!")
}
```

### HTML Wrapper

```html
<div id="output"></div>
<button onclick="run()">Run Code</button>
<script src="wasm_exec.js"></script>
<script>
const go = new Go();
WebAssembly.instantiateStreaming(
    fetch("app.wasm"),
    go.env
).then((result) => {
    go.run(result.instance);
});
</script>
```

## Available APIs

### Console Output

- `fmt.Println()`
- `fmt.Printf()`
- `log.Print()`

### Time Operations

- `time.Sleep()`
- `time.Now()`
- `time.Duration`

### Concurrency

- Goroutines work in WASM
- Channels work in WASM
- However, OS-level blocking may not work as expected

## Limitations

- No direct file system access
- No network requests (same-origin only)
- No OS-specific operations
- No cgo (C interop)
- Larger binary size

## File Size

- Go WASM binary: ~2-5 MB uncompressed
- Gzipped: ~500 KB - 1 MB
- Plain wasm_exec.js: ~12 KB

## Performance Considerations

- WASM runs at native speed (after compilation)
- Initial load time includes WASM download
- Consider lazy loading for large apps
- Use gzip compression in production

## Security Considerations

- WASM runs with browser sandbox restrictions
- Cannot access host file system
- Same-origin policy applies
- User can inspect wasm via browser tools (not truly secret)

## Next Steps

1. [Embedding Playground in Pages](embedding-playground-in-pages.md)
2. [Limitations and Best Practices](limitations-and-best-practices.md)
