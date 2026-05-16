# Installing Testcontainers Go

## Prerequisites

- Go 1.20 or later
- Docker installed and running
- Docker daemon accessible

## Installation

### 1. Add Package to go.mod

```bash
go get github.com/testcontainers/testcontainers-go
```

### 2. Verify Installation

```bash
go list -m github.com/testcontainers/testcontainers-go
```

## Docker Requirements

### Check Docker Installation

```bash
docker version
docker ps
```

### Starting Docker

**macOS:**
```bash
open /Applications/Docker.app
```

**Linux:**
```bash
sudo systemctl start docker
```

**Windows:**
- Use Docker Desktop

## Configuration

### Docker Socket

Most setups work out of the box. For custom Docker configurations:

```go
req := testcontainers.ContainerRequest{
    Image: "postgres:latest",
}
```

### Environment Variables

```bash
export DOCKER_HOST=unix:///var/run/docker.sock
```

## Optional Dependencies

For specific databases, you may want to import helper modules:

```bash
go get github.com/testcontainers/testcontainers-go/modules/postgres
go get github.com/testcontainers/testcontainers-go/modules/mysql
go get github.com/testcontainers/testcontainers-go/modules/mongodb
```

## Troubleshooting

### "Cannot connect to Docker daemon"

- Ensure Docker is running
- Check Docker socket permissions
- Verify Docker is accessible to your user

### Module not found

```bash
go get -u github.com/testcontainers/testcontainers-go
go mod tidy
```

### Version Compatibility

Check [releases](https://github.com/testcontainers/testcontainers-go/releases) for latest version.
