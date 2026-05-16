# Go Modules and Workspaces

## The Problem Before Modules

Before Go 1.11, Go used a single global directory called `GOPATH` to store all code and dependencies. Every project lived under `$GOPATH/src/`, and there was no way to have two projects use different versions of the same library. This was a major pain point:

- You couldn't pin a specific version of a dependency.
- Upgrading a library for one project could break another.
- Sharing code required others to have an identical `GOPATH` setup.

This is analogous to the problems Java developers faced before **Maven/Gradle** introduced `pom.xml` / `build.gradle` with version-locked dependency trees, or C++ developers before **CMake** and **Conan** brought structured package management.

---

## Go Modules (Introduced in Go 1.11)

Go Modules solve the `GOPATH` problem by making every project a self-contained unit with its own declared dependencies and versions — similar to how `package.json` works in Node.js or `Cargo.toml` in Rust.

### How It Compares to Other Languages

| Concept              | Go               | Java                  | C++                        | Python           |
|----------------------|------------------|-----------------------|----------------------------|------------------|
| Dependency file      | `go.mod`         | `pom.xml` / `build.gradle` | `CMakeLists.txt` / `conanfile.txt` | `requirements.txt` / `pyproject.toml` |
| Lock file            | `go.sum`         | `pom.xml` (pinned)    | `conan.lock`               | `poetry.lock`    |
| Dependency tool      | `go get`         | `mvn` / `gradle`      | `conan` / `vcpkg`          | `pip` / `poetry` |
| Version format       | Semantic (`v1.2.3`) | Semantic            | Varies                     | Semantic         |
| Central registry     | proxy.golang.org | Maven Central         | Conan Center               | PyPI             |

---

## Creating a Module

```bash
mkdir myproject
cd myproject
go mod init github.com/username/myproject
```

This creates a `go.mod` file — the single source of truth for your project's identity and dependencies. The module path (`github.com/username/myproject`) is also the import prefix used across all packages in your project.

### The `go.mod` File Explained

```
module github.com/username/myproject   // 1. Module identity / import prefix

go 1.21                                // 2. Minimum Go version required

require (
    github.com/gin-gonic/gin v1.9.1    // 3. Direct dependencies with exact versions
    github.com/stretchr/testify v1.8.4
)

require (
    github.com/some/indirect v0.3.0 // indirect  // 4. Transitive dependencies
)
```

- **Module path** acts like a Java package namespace (`com.company.project`) — it globally identifies your code.
- **`require` block** is equivalent to `<dependencies>` in Maven's `pom.xml` — every entry is version-pinned.
- **`// indirect`** marks transitive dependencies (dependencies of your dependencies), similar to Maven's `<scope>compile</scope>` transitive resolution.

### The `go.sum` File

`go.sum` is automatically generated and contains cryptographic hashes of every downloaded dependency:

```
github.com/gin-gonic/gin v1.9.1 h1:4+fr/el88TOO3ewCmQr8cx/CtZ/umlIRIs5M4NTNjf8=
github.com/gin-gonic/gin v1.9.1/go.mod h1:hPLL8MWeem2ECDl56Z+kl...
```

This is Go's equivalent of Java's **checksum verification** in Maven or a `package-lock.json` in npm — it guarantees reproducible, tamper-proof builds.

> **Commit both `go.mod` and `go.sum`** to version control. Never `.gitignore` them.

---

## Managing Dependencies

### Add a Dependency

```bash
go get github.com/gin-gonic/gin@v1.9.1   # pin to a specific version
go get github.com/gin-gonic/gin@latest   # get the latest release
```

### Update All Dependencies

```bash
go get -u ./...   # update all direct and indirect dependencies
```

### Remove Unused Dependencies

```bash
go mod tidy
```

`go mod tidy` removes any packages listed in `go.mod` that aren't actually imported in your code, and adds any that are imported but missing. Run this after adding or removing imports — it's the Go equivalent of `mvn dependency:analyze` in Java.

### Vendor Mode (Offline / Air-gapped Builds)

```bash
go mod vendor        # copies all dependencies into a local vendor/ folder
go build -mod=vendor # build using only vendored dependencies
```

This is useful in CI/CD environments without internet access — similar to Maven's offline mode (`mvn -o`).

---

## Go Workspaces (Introduced in Go 1.18)

### The Problem Workspaces Solve

Imagine you maintain two Go modules:

```
go-sdet-wiki/       ← your wiki module
bookshelf-api/      ← your API module that imports wiki utilities
```

Without workspaces, if you want to test a local change in `go-sdet-wiki` from within `bookshelf-api`, you'd have to use a messy `replace` directive in `go.mod`:

```
replace github.com/username/go-sdet-wiki => ../go-sdet-wiki
```

And you'd need to **remember to remove it before committing**. Go Workspaces eliminate this problem entirely.

In Java, this is solved by **Maven multi-module projects** (`<modules>` in the root `pom.xml`). In C++, **CMake subdirectories** (`add_subdirectory()`) serve the same purpose. Go Workspaces are Go's native answer to the same need.

### Creating a Workspace

```bash
go work init
go work use ./go-sdet-wiki
go work use ./bookshelf-api
```

This creates a `go.work` file:

```
go 1.22

use (
    ./go-sdet-wiki
    ./bookshelf-api
)
```

Now, when you build or test `bookshelf-api`, Go automatically resolves imports from the local `./go-sdet-wiki` source — no `replace` hacks needed.

### Workspace File Reference

| File        | Purpose                                              | Commit to Git? |
|-------------|------------------------------------------------------|----------------|
| `go.mod`    | Module identity and dependency versions              | ✅ Yes          |
| `go.sum`    | Cryptographic hashes for dependency verification     | ✅ Yes          |
| `go.work`   | Local multi-module workspace (developer convenience) | ⚠️ Usually No  |
| `go.work.sum` | Checksums for workspace-level dependencies         | ⚠️ Usually No  |

> Add `go.work` and `go.work.sum` to `.gitignore` unless your entire team works from a monorepo layout that requires the workspace file.

---

## Practical Workflow for SDETs

```bash
# 1. Start a new test module
go mod init github.com/myorg/api-tests

# 2. Add testing libraries
go get github.com/stretchr/testify@latest
go get github.com/testcontainers/testcontainers-go@latest

# 3. Write tests, then clean up
go mod tidy

# 4. Run all tests
go test ./...

# 5. Check what's in your module graph
go mod graph | head -20
```

---

## Summary

| Feature       | What It Does                                         | Analogy                        |
|---------------|------------------------------------------------------|--------------------------------|
| `go mod init` | Creates the module and its identity                  | `mvn archetype:generate`       |
| `go.mod`      | Declares dependencies + versions                     | `pom.xml` / `build.gradle`     |
| `go.sum`      | Locks and verifies dependency checksums              | `package-lock.json`            |
| `go get`      | Adds/updates a dependency                            | `mvn dependency:add`           |
| `go mod tidy` | Removes unused, adds missing dependencies            | `mvn dependency:analyze`       |
| `go work`     | Links multiple local modules for development         | Maven multi-module / monorepo  |
