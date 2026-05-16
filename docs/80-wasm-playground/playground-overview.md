# Playground Overview

The WASM playground turns static docs into interactive learning surfaces. Instead of only reading examples, learners can execute behavior immediately and validate understanding through direct feedback.

For tutorial quality, this section should define when playgrounds add value and how to keep them reliable.

## What is the WASM Playground?

A browser-based environment for running and testing Go code compiled to WebAssembly (WASM), directly in the documentation.

It is best used for concept exploration, not as a replacement for local development workflows.

## Benefits

- **Interactive Learning**: Run code examples directly in the docs
- **No Installation**: Users don't need to install Go
- **Immediate Feedback**: Execute and see results instantly
- **Embedded Examples**: Keep code examples close to documentation

These benefits are strongest when examples are short, focused, and deterministic.

## Use Cases

1. **Algorithm Examples**: Show how concurrency patterns work
2. **Test Demonstrations**: Run real tests in the browser
3. **API Examples**: Show request/response patterns
4. **Interactive Tutorials**: Build guided learning experiences

Prioritize concepts where immediate execution improves intuition (timeouts, channels, output formatting).

## How WASM Playground Works

Understanding runtime flow helps diagnose failures when embed scripts or assets drift.

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

Always communicate compatibility expectations near the playground UI.

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

Available APIs differ from native Go runtime capabilities; document these boundaries clearly to avoid learner confusion.

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

Treat these constraints as design inputs for example authoring.

## File Size

- Go WASM binary: ~2-5 MB uncompressed
- Gzipped: ~500 KB - 1 MB
- Plain wasm_exec.js: ~12 KB

## Performance Considerations

- WASM runs at native speed (after compilation)
- Initial load time includes WASM download
- Consider lazy loading for large apps
- Use gzip compression in production

Measure first-run latency regularly as module size changes.

## Security Considerations

- WASM runs with browser sandbox restrictions
- Cannot access host file system
- Same-origin policy applies
- User can inspect wasm via browser tools (not truly secret)

Do not embed secrets, tokens, or sensitive implementation details in client-delivered WASM artifacts.

## Next Steps

1. [Embedding Playground in Pages](embedding-playground-in-pages.md)
2. [Limitations and Best Practices](limitations-and-best-practices.md)

## Deep Dive: Learning Design with WASM Playground

### Background

The playground is most effective when it reinforces one concrete concept at a time and gives immediate, observable feedback.

### Content design principles

1. Keep snippets short and concept-focused.
2. Show expected output directly below the runnable block.
3. Pair each example with one guided experiment.
4. Avoid hidden setup so learners can reason about behavior.

### SDET recommendation

Use playground examples to demonstrate tricky topics such as channel coordination and timeout handling, where interactive execution improves intuition.

## Common Anti-Patterns

- Embedding long, multi-concept examples that obscure learning objective.
- Using playgrounds for features that require unsupported OS/runtime capabilities.
- Ignoring startup latency and shipping oversized modules without compression.
- Leaving output expectations implicit, forcing learners to guess correctness.

## Quick Playground Quality Checklist

- Is each playground tied to one clear learning objective?
- Are runtime limitations visible near the example?
- Is expected output shown for comparison?
- Are module size and load time managed?
- Can the example run consistently across supported browsers?

