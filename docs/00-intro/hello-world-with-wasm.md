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

## Build and Run Locally

You can also run the same Go program from the command line using the Go CLI.

### Option 1: Build a Binary and Run It

Use `go build` when you want to compile the program into an executable first.

```bash
go build -o hello-world
./hello-world
```

What happens here:

1. `go build -o hello-world` compiles the current package and creates a binary named `hello-world`.
2. `./hello-world` runs that compiled binary.

This approach is useful when:

- you want to run the same binary multiple times,
- you want to distribute or inspect the compiled executable,
- you are testing startup behavior of a built artifact.

### Option 2: Run Directly with `go run`

Use `go run` when you want to compile and execute in a single step.

```bash
go run .
```

What happens here:

1. Go compiles the program in memory or in a temporary location.
2. Go immediately runs the resulting executable.

This approach is useful when:

- you are iterating quickly during development,
- you do not need to keep the binary afterward,
- you want the shortest feedback loop.

### Build vs Run: When to Use Each

| Approach | Best For | Output |
| --- | --- | --- |
| `go build` + `./hello-world` | Repeated runs, release checks, binary inspection | A named executable on disk |
| `go run .` | Fast iteration, demos, quick experiments | Temporary compiled execution |

Rule of thumb:

- Use `go run` while learning or editing quickly.
- Use `go build` when you want to validate the final binary or run it more than once.

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
