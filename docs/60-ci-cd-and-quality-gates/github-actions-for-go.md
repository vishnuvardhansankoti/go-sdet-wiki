# GitHub Actions for Go

## Basic Workflow

### Simple Test Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run tests
        run: go test -v -race -timeout=10m ./...
```

## Matrix Testing

Test across multiple Go versions and operating systems:

```yaml
jobs:
  test:
    strategy:
      matrix:
        go-version: ['1.20', '1.21', '1.22']
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: ${{ matrix.go-version }}
      - run: go test -v ./...
```

## Caching Dependencies

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: actions/setup-go@v4
    with:
      go-version: '1.21'
  - uses: actions/cache@v3
    with:
      path: ~/go/pkg/mod
      key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
      restore-keys: |
        ${{ runner.os }}-go-
  - run: go test -v ./...
```

## Build and Push

### Build Binary

```yaml
- name: Build
  run: go build -o app ./cmd/server

- name: Upload artifact
  uses: actions/upload-artifact@v3
  with:
    name: app
    path: app
```

### Docker Build and Push

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    tags: myregistry/myapp:${{ github.sha }}
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

## Environment Variables

```yaml
env:
  ENVIRONMENT: test
  LOG_LEVEL: debug

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgres://user:pass@localhost/test
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
      - run: go test -v ./...
```

## Secrets

```yaml
- name: Run tests
  env:
    API_KEY: ${{ secrets.API_KEY }}
    SECRET_TOKEN: ${{ secrets.SECRET_TOKEN }}
  run: go test -v ./...
```

## Outputs and Notifications

### Slack Notification

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Build ${{ job.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Build: ${{ job.status }}\nCommit: ${{ github.sha }}"
            }
          }
        ]
      }
```

### Upload Test Results

```yaml
- name: Upload test results
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Go Test Results
    path: '*.out'
    reporter: 'go-test'
```
