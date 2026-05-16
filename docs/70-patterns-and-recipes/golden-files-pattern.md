# Golden Files Pattern

## What are Golden Files?

Golden files are reference outputs used to validate that the application produces the expected results. Also called "snapshot testing" or "approval testing".

## Use Cases

- API response validation
- Report generation
- Configuration output
- SQL query results
- File content validation

## Basic Pattern

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

### Running Tests

```bash
# Normal run - compare against golden files
go test ./...

# Update golden files
UPDATE_GOLDEN=1 go test ./...
```

## JSON Golden Files

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

## Pros and Cons

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
