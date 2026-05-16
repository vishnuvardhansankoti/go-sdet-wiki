# Install and Setup

## Installing Go

### Windows
1. Download from https://golang.org/dl/
2. Run the installer
3. Follow the prompts

### macOS
```bash
brew install go
```

### Linux
```bash
wget https://golang.org/dl/go1.21.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
```

## Verify Installation

```bash
go version
```

## Set Up Your Workspace

Create a directory for your Go projects:

```bash
mkdir -p ~/go-projects
cd ~/go-projects
```

## IDE Setup

### VS Code
1. Install Go extension
2. Install Go tools via the extension prompt

### GoLand / IntelliJ IDEA
- Native Go support with excellent refactoring tools
