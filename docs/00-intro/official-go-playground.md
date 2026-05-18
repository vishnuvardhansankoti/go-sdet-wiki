# Official Go Playground: Uses and Limitations

The official Go Playground is a browser-based environment where you can write and run small Go programs without installing anything locally.

- Official URL: [Go Playground](https://go.dev/play/)

## What It Is Good For

Use the official playground when you want quick feedback and easy sharing.

1. Try syntax quickly
2. Share reproducible snippets with teammates
3. Demonstrate small examples in docs, PRs, and chats
4. Teach language basics in workshops
5. Verify behavior of pure-Go standard library code

## Typical SDET Use Cases

For SDET workflows, the playground is useful for focused experiments:

1. Validate string parsing logic
2. Test small helper functions before moving them into your project
3. Demonstrate table-driven test patterns with simplified examples
4. Explain concurrency primitives in minimal programs

## What It Is Not Good For

The playground is intentionally sandboxed, so some real-world operations are restricted.

1. No access to your local files
2. No outbound network access for external calls
3. No long-running services
4. No dependency on your local toolchain, IDE, or CI setup
5. Not suitable for integration tests that need databases, containers, or real infra

## Important Limitations to Know

### File System and OS

Programs cannot read/write arbitrary local files or rely on local OS state.

### Networking

Direct external network access is restricted, so HTTP calls to public APIs are not a reliable pattern there.

### Time and Environment

Environment behavior can differ from your local machine. Treat results as sandbox validation, not production parity.

### Dependencies and Project Context

The playground is best for single-file or tiny examples. It is not a replacement for working in your actual module with real project structure.

## When to Use Local Setup Instead

Switch to local development (VS Code/GoLand + terminal) when you need:

1. Multi-file packages
2. Module-aware development with `go.mod`
3. Linters, debugger, and IDE refactors
4. Integration tests and Testcontainers
5. Real CI-like behavior

## Recommended Workflow

1. Start in [Go Playground](https://go.dev/play/) for a quick idea check.
2. Move validated code into your local repo.
3. Run `go test ./...` locally.
4. Add proper tests and quality checks before commit.

## Related Pages

- [Hello World with WASM](hello-world-with-wasm.md)
- [Install & Setup](install-and-setup.md)
- [Go Modules & Workspaces](go-modules-and-workspaces.md)


## Next Step

Continue with [Install and Setup](install-and-setup.md).
