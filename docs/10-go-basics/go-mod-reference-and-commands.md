# go.mod Reference and go mod Commands

This chapter translates the official Go module reference into practical guidance for day-to-day development and testing.

Primary reference used for this page:
- https://go.dev/doc/modules/gomod-ref

In this section, you will learn:

- What each major directive in `go.mod` means.
- Which `go mod` and related `go` commands you will use most often.
- How these settings affect dependency resolution, reproducibility, and CI stability.
- How to apply this in SDET workflows.

## Why This Matters

`go.mod` is the dependency contract for your module.

It controls:

- module identity,
- minimum Go version/toolchain behavior,
- dependency selection,
- and override rules like `replace`, `exclude`, and `retract`.

When `go.mod` is clean and intentional, builds are reproducible and test pipelines are reliable.

## Quick Anatomy of go.mod

Example:

```go
module example.com/mymodule

go 1.22

require (
    github.com/gin-gonic/gin v1.10.0
    github.com/stretchr/testify v1.10.0
)

replace example.com/internal-lib => ../internal-lib
exclude example.com/problematic-lib v1.3.0
```

## go.mod Directives (Reference Summary)

The following sections are based on the official reference and rewritten for practical usage.

## module

Declares the module path (unique identifier + import prefix).

```go
module github.com/acme/bookshelf
```

For major version v2+, the module path should include the suffix (for example `/v2`).

```go
module github.com/acme/bookshelf/v2
```

## go

Sets the minimum Go version expected by this module.

```go
go 1.22
```

Practical notes:

- Newer toolchains enforce this more strictly.
- It influences language feature availability and module behavior.
- Keep it aligned with what your CI and developers actually run.

## toolchain

Suggests a Go toolchain to use when the default toolchain is older.

```go
toolchain go1.22.4
```

Use this when you want consistent local/CI behavior across teams.

## godebug

Declares default GODEBUG settings for main packages and tests built in this module.

```go
godebug (
    default=go1.22
    panicnil=1
)
```

Use carefully and document why a setting is needed.

## require

Declares module dependencies with minimum required versions.

```go
require github.com/gin-gonic/gin v1.10.0
```

Go can add or adjust `require` entries as you run commands such as `go get` and `go mod tidy`.

## tool

Declares tool packages runnable via `go tool` in module/workspace context.

```go
tool golang.org/x/tools/cmd/stringer
require golang.org/x/tools v0.26.0
```

Useful for codifying team tooling in source control.

## replace

Replaces one module path/version with another module version or local directory.

Replace with local path:

```go
replace github.com/acme/internal-lib => ../internal-lib
```

Replace with fork/version:

```go
replace example.com/upstream/lib => github.com/acme/lib v1.2.3-acme.1
```

Important:

- `replace` is mainly for the main module build.
- It does not, by itself, add a dependency to the graph; a matching `require` is still needed.

## exclude

Excludes a specific module version from selection.

```go
exclude example.com/upstream/lib v1.3.0
```

Use when a specific version is broken or otherwise unusable.

## retract

Used by module authors to mark released versions as not recommended.

```go
retract v1.1.0 // published with critical bug
retract [v1.2.0,v1.2.2] // broken behavior in range
```

Retraction is discovered from the latest version metadata, so authors usually publish a newer version that contains the retraction.

## ignore

Instructs Go to ignore selected paths for wildcard package matching (for example `./...`).

```go
ignore ./node_modules
ignore generated
```

Use this to avoid non-Go or generated directories from being treated as package candidates.

## High-Value go mod Commands

These are the commands most teams use daily.

## Initialize a module

```bash
go mod init github.com/acme/bookshelf
```

Creates initial `go.mod` with module path.

## Add or change dependencies

```bash
go get github.com/stretchr/testify@v1.10.0
go get github.com/gin-gonic/gin@latest
```

## Clean and synchronize module metadata

```bash
go mod tidy
```

Adds missing requirements and removes unused ones. Run this before committing.

## Download dependencies into module cache

```bash
go mod download
```

Useful in CI cache warm-up and offline prep flows.

## Inspect module graph

```bash
go mod graph
```

Shows dependency graph edges (`parent child`).

## Explain why a module is needed

```bash
go mod why -m github.com/gin-gonic/gin
```

Excellent for dependency cleanup and audit discussions.

## Vendor dependencies

```bash
go mod vendor
```

Copies dependencies into `vendor/` for constrained environments.

## Verify downloaded module content

```bash
go mod verify
```

Checks downloaded modules against expected content.

## Edit directives from CLI

```bash
go mod edit -require=example.com/lib@v1.2.3
go mod edit -replace=example.com/lib=../lib
go mod edit -exclude=example.com/lib@v1.3.0
```

Useful for scripted automation.

## SDET-Focused Use Cases

## 1. Stable CI for test pipelines

- Pin important libraries.
- Run `go mod tidy` and fail CI on dirty module files.
- Use `go mod verify` before test execution in secure pipelines.

## 2. Local integration debugging with patched dependency

- Use `replace` to point dependency to local checkout.
- Validate fix quickly without publishing module version.
- Remove temporary replace before merge.

## 3. Prevent bad transitive versions from breaking tests

- Add `exclude` for known bad version.
- Upgrade to safe version with `go get`.
- Validate using `go mod graph` and targeted test suites.

## Deep Dive: Command Workflow You Can Standardize

A practical team workflow:

1. `go get` to add/upgrade dependency.
2. `go mod tidy` to normalize `go.mod` and `go.sum`.
3. `go test ./...` to validate behavior.
4. `go mod verify` in CI for integrity check.

When debugging dependency issues:

1. `go mod why -m <module>` to find inclusion path.
2. `go mod graph | grep <module>` to inspect graph edges.
3. temporary `replace` only if you need local patch validation.

## Common Anti-Patterns

- Keeping long-lived local `replace` directives in main branch.
- Skipping `go mod tidy`, causing noisy PR diffs later.
- Using floating dependencies without intentional upgrades.
- Mismatching declared `go` version with CI/runtime toolchain.
- Treating `exclude` as permanent policy without documenting rationale.

## Quick Exercises (SDET Focus)

Try these exercises before moving to the assignment.

### Exercise 1: Dependency Graph Inspection

Goal: Understand why a module appears in your build.

1. Run `go mod graph` and save output.
2. Pick one indirect dependency.
3. Run `go mod why -m <dependency>`.
4. Document which direct dependency pulls it in.

Stretch: Propose a cleanup if the dependency path is unnecessary.

### Exercise 2: Controlled Local Patch Validation

Goal: Test a local dependency fix without publishing.

1. Create a local copy of a small dependency module.
2. Add a `replace` directive to point at local directory.
3. Run tests and validate behavior.
4. Remove `replace` and confirm build still works.

Stretch: Automate add/remove with `go mod edit` commands.

## Assignment: go.mod Hygiene for Team CI

### Goal

Create a repeatable module-management checklist and enforce it in your development workflow.

### Tasks

1. Verify module path and `go` version in `go.mod`.
2. Run:
   - `go mod tidy`
   - `go mod verify`
   - `go test ./...`
3. Add a short developer note in project docs describing:
   - when to use `replace`,
   - when to use `exclude`,
   - and when to remove temporary directives.
4. Add CI check to fail when `go.mod` or `go.sum` is dirty after tidy.

### Acceptance Criteria

- Clean `go.mod` and `go.sum` after `go mod tidy`.
- Team can explain each non-default directive in `go.mod`.
- CI run is reproducible across machines.

## Next Step

Continue with [Control Flow](control-flow.md).
