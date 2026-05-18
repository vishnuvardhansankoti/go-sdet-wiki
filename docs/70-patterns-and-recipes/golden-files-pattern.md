# Golden Files Pattern

Golden files are a contract-preservation technique for complex outputs. They provide a fast way to detect meaningful output drift while keeping expected behavior visible in version control.

This section focuses on sustainable snapshot testing practices that avoid brittle or noisy comparisons.

## What are Golden Files?

Golden files are reference outputs used to validate that the application produces the expected results. Also called "snapshot testing" or "approval testing".

They are most effective when output is normalized and review discipline is strong.

## Use Cases

- API response validation
- Report generation
- Configuration output
- SQL query results
- File content validation

Use golden tests when output shape and content are more important than internal implementation.

## Basic Pattern

The basic lifecycle is: generate output, normalize unstable fields, compare with approved baseline, and review intentional updates.

### Setup

```go
package myapp_test

import (
    "os"
    "path/filepath"
    "testing"
)

const goldenDir = "testdata/golden"

func loadGoldenFile(t *testing.T, name string) string {
    path := filepath.Join(goldenDir, name)
    data, err := os.ReadFile(path)
    if err != nil {
        t.Fatalf("failed to read golden file %s: %v", path, err)
    }
    return string(data)
}

func saveGoldenFile(t *testing.T, name, content string) {
    path := filepath.Join(goldenDir, name)
    err := os.WriteFile(path, []byte(content), 0644)
    if err != nil {
        t.Fatalf("failed to write golden file %s: %v", path, err)
    }
}
```

### Test Example

```go
func TestGenerateReport(t *testing.T) {
    update := os.Getenv("UPDATE_GOLDEN") != ""
    
    report := GenerateReport()
    
    if update {
        saveGoldenFile(t, "report.txt", report)
        t.Skip("Skipping test, golden file updated")
    }
    
    expected := loadGoldenFile(t, "report.txt")
    
    if report != expected {
        t.Errorf("report does not match golden file")
        t.Logf("Got:\n%s", report)
        t.Logf("Expected:\n%s", expected)
    }
}
```

Explicit update mode prevents accidental baseline rewrites during normal test runs.

### Running Tests

```bash
# Normal run - compare against golden files
go test ./...

# Update golden files
UPDATE_GOLDEN=1 go test ./...
```

## JSON Golden Files

JSON snapshots are especially useful for API contract and handler response stability.

### API Response Testing

```go
func TestUserAPIResponse(t *testing.T) {
    update := os.Getenv("UPDATE_GOLDEN") != ""
    
    resp, err := getUserAPI(1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    
    // Normalize response (remove timestamps, IDs that vary)
    normalized := NormalizeResponse(resp)
    
    data, err := json.MarshalIndent(normalized, "", "  ")
    if err != nil {
        t.Fatalf("marshal error: %v", err)
    }
    
    if update {
        saveGoldenFile(t, "user_response.json", string(data))
        t.Skip("Skipping test, golden file updated")
    }
    
    expected := loadGoldenFile(t, "user_response.json")
    
    if string(data) != expected {
        t.Errorf("response does not match golden file")
    }
}
```

## Diffing Tool Integration

Human-readable diff output reduces triage time when snapshots change.

### With testdata

```go
import "github.com/google/go-cmp/cmp"

func TestWithDiff(t *testing.T) {
    result := ProcessData()
    expected := loadGoldenFile(t, "output.txt")
    
    if diff := cmp.Diff(expected, result); diff != "" {
        t.Errorf("output mismatch (-want +got):\n%s", diff)
    }
}
```

## Directory Structure

```
myapp/
├── myapp.go
├── myapp_test.go
└── testdata/
    └── golden/
        ├── report.txt
        ├── user_response.json
        └── config_output.yaml
```

## Best Practices

Golden file reliability depends on normalization and review quality.

### Normalize Dates and IDs

```go
func NormalizeResponse(resp *Response) *Response {
    // Replace timestamps with fixed value
    resp.CreatedAt = "2024-01-01T00:00:00Z"
    
    // Replace generated IDs
    resp.ID = "generated-id"
    
    return resp
}
```

### Version Golden Files

```
testdata/
└── golden/
    ├── v1/
    │   └── response.json
    └── v2/
        └── response.json
```

### Review Changes

```bash
# Show what changed
git diff testdata/golden/
```

Require reviewers to classify each snapshot change as intended behavior, format noise, or regression.

## Pros and Cons

Use this section to decide where snapshots are high value versus where targeted assertions are clearer.

### Pros
- Catch unintended changes
- Good for complex outputs
- Self-documenting tests
- Fast feedback

### Cons
- Need review process
- Can mask real issues
- Large diffs hard to review
- Need normalization

## Integration with CI

CI should detect unexpected golden updates and force explicit review.

```yaml
- name: Check golden files updated
  run: |
    git status testdata/golden/ | grep modified
    if [ $? -eq 0 ]; then
      echo "Golden files were modified - review changes"
      git diff testdata/golden/
      exit 1
    fi
```


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Reproduce and Stabilize a Flaky Test

Goal: Practice a repeatable flake-debugging workflow.

1. Select one flaky test scenario.
2. Run it repeatedly and capture failure evidence.
3. Identify root cause (timing, shared state, ordering, etc.).
4. Apply one stabilization fix and re-run to confirm.

Stretch: Add a regression test that would have caught the original flake.

### Exercise 2: Add a Reusable Test Helper Pattern

Goal: Improve readability and reduce duplication.

1. Identify repeated setup/assertion code in tests.
2. Extract a helper (builder, fixture, or assertion helper).
3. Refactor at least two tests to use it.
4. Verify tests remain clear and deterministic.

Stretch: Document when to use and avoid this helper.

## Assignment: Golden Files for Bookshelf API Responses

### Goal
Use golden files to lock down stable JSON responses from Bookshelf handlers.

This assignment creates a maintainable response-regression safety net for Bookshelf APIs.

### Route Prefix Note
Snapshot whichever route prefix your implementation currently exposes (`/api` in earlier sections or `/api/v1` in capstone).

### Targets

1. `GET /api/books` response snapshot.
2. `POST /api/users` success response snapshot.
3. Validation error response snapshot.

### Tasks

1. Create folder `tests/testdata/golden/`.
2. Add handler tests in `pkg/handler/handlers_golden_test.go`.
3. Normalize dynamic fields (`id`, timestamps) before compare.
4. Add update mode with env var:

```bash
UPDATE_GOLDEN=1 go test ./pkg/handler -run Golden
```

### Done Criteria

- Golden tests pass in normal mode.
- Golden files only change intentionally and are reviewed in PR.

Also ensure update instructions are documented for contributors.

## Deep Dive: Sustainable Snapshot Testing

### Background

Golden files are powerful for complex outputs, but become noisy if dynamic fields are not normalized or review discipline is weak.

### Sustainability rules

1. Normalize unstable fields (IDs, timestamps, nondeterministic ordering).
2. Keep snapshots focused on meaningful output contracts.
3. Require PR review for every golden update.
4. Keep update mode explicit (`UPDATE_GOLDEN=1`).

### Review heuristics

- Ask whether snapshot changes are expected product behavior.
- Check for accidental formatting-only churn.
- Confirm no sensitive data was written to golden files.

### SDET recommendation

Use golden tests for high-value response schemas and generated artifacts, not as a replacement for targeted behavioral assertions.

## Common Anti-Patterns

- Snapshotting unstable fields without normalization.
- Updating golden files in bulk without intent review.
- Using golden snapshots for trivial outputs better asserted directly.
- Allowing formatting-only churn to dominate review signal.

## Quick Golden Review Checklist

- Are dynamic fields normalized before compare?
- Is update mode explicit and deliberate?
- Do diffs reflect meaningful behavior changes?
- Are sensitive values excluded from snapshots?
- Is each golden update reviewed in PR context?




## Next Step

Continue with [Test Data Builders](test-data-builders.md).
