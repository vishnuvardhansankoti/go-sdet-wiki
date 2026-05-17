# Hello World with Inline WASM Runner

This page helps you write your first Go program, run it inline in the wiki, and understand every line of code.

## Hello World Program

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

## Run It Inline

Type or edit code in the box, then click Run.

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>

## Line-by-Line Explanation

### `package main`
This declares the package name. In Go, executable programs must use the `main` package.

### `import "fmt"`
This imports Go's formatting package. We use it to print text to output.

### `func main() { ... }`
This is the entry point of the program. Execution starts from this function.

### `fmt.Println("Hello, World!")`
This prints the text to output, followed by a newline.

## Expected Output

When you click Run, you should see:

```text
Hello, World!
```

## Try These Quick Experiments

1. Change the message to your name.
2. Add a second `fmt.Println(...)` line.
3. Print a number, for example `fmt.Println(2026)`.

## Common Errors and Fixes

- `undefined: fmt`: Make sure `import "fmt"` is present.
- `expected 'package'`: Ensure the first non-empty line is `package main`.
- No output shown: Check for typos and run again.

## What to Learn Next

Continue with [Install & Setup](install-and-setup.md) to prepare your complete local development environment.
