# Go Modules and Workspaces

## Go Modules

### Creating a Module

```bash
mkdir myproject
cd myproject
go mod init github.com/username/myproject
```

This creates a `go.mod` file containing module metadata.

### go.mod File

```
module github.com/username/myproject

go 1.21

require (
    github.com/some/package v1.2.3
)
```

## Managing Dependencies

### Add a Dependency

```bash
go get github.com/some/package
```

### Update Dependencies

```bash
go get -u ./...
```

### Clean Up Unused Dependencies

```bash
go mod tidy
```

## Go Workspaces

Introduced in Go 1.18, workspaces allow you to work with multiple modules locally.

### Create a Workspace

```bash
go work init
go work use ./module1 ./module2
```

This creates a `go.work` file that allows local development across multiple modules.
