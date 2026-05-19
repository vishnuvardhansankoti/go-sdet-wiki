# Debug a Single Go File in VS Code

This appendix explains how to configure VS Code so you can debug the currently open Go file without creating a separate launch configuration for each program.

Use this setup when you want to run or debug an individual Go program file directly from the editor.

## Launch Configuration

Create or update `.vscode/launch.json` in your workspace with the following configuration:

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"name": "Launch current Go file",
			"type": "go",
			"request": "launch",
			"mode": "auto",
			"program": "${file}"
		}
	]
}
```

## What This Configuration Does

- `version`: tells VS Code which debug configuration schema version to use.
- `configurations`: holds one or more debug profiles.
- `name`: the label you will see in the Debug panel.
- `type: "go"`: uses the Go extension debugger.
- `request: "launch"`: starts a new debug session instead of attaching to an existing process.
- `mode: "auto"`: lets the Go extension choose the right execution mode for the current file.
- `program: "${file}"`: tells VS Code to run the file currently open in the editor.

## Why Use `${file}`

`${file}` makes the configuration file-aware instead of hard-coded to one package path. That is useful when you have small standalone programs, playground-style examples, or test helpers that you want to run one at a time.

Example use cases:

- a `main.go` file in a lesson or sample directory
- a quick reproduction file for a bug
- a temporary program used to inspect API behavior
- a small demo file for concurrency, error handling, or generics

## Behavior to Expect

When you start this configuration, VS Code launches the currently active Go file as the debug target.

If the open file belongs to a package with multiple files, the Go debugger will use the package context needed for that file. If the file is a standalone `main` program, it will behave like a normal executable.

## Similarity to Running from the Terminal

This configuration is conceptually similar to running:

```bash
go run path/to/file.go
```

The difference is that VS Code also enables breakpoints, variable inspection, call stack viewing, and step-through debugging.

## Practical Tips

- Open the Go file you want to debug before starting the session.
- Make sure the Go extension is installed in VS Code.
- Use this pattern for single-file demos and experiments, not only for full applications.
- If the file depends on other package files, keep those files in the same module so the debugger can resolve imports correctly.

## Example Workflow

1. Open the target Go file in VS Code.
2. Set one or more breakpoints.
3. Open the Run and Debug panel.
4. Select Launch current Go file.
5. Start debugging.

This workflow is especially useful for teaching, quick verification, and SDET investigations where you want to debug one program file in isolation.

## Common Mistakes

- Using the config on a non-Go file.
- Forgetting to open the desired file before starting the debugger.
- Pointing `program` to a fixed folder when the goal is to debug the current file.
- Expecting this to replace proper package-level or integration debugging for larger applications.

## When to Use a Different Configuration

Use a package-level or folder-level launch configuration when:

- the program needs multiple Go files from the same package
- you are debugging an HTTP server or microservice entry point
- you want a stable target that does not change with the active editor file

## Next Step

Continue with [How to Report Issues](how-to-report-issues.md) or return to the main appendix list from the site navigation.