# Configuration and Environment Variables

Configuration defines how your service behaves in different environments without changing source code. In microservice systems, this is critical because local development, CI, staging, and production all run with different runtime expectations.

For SDET workflows, strong configuration practices improve:

- test reproducibility,
- deployment safety,
- and failure diagnosis speed.

## Using Environment Variables

Environment variables are the simplest and most portable configuration source. They work well with Docker, Kubernetes, and CI/CD platforms.

This baseline pattern reads values directly from process environment:

```go
package config

import (
    "os"
)

type Config struct {
    Port     string
    DBHost   string
    DBPort   string
    LogLevel string
}

func Load() *Config {
    return &Config{
        Port:     os.Getenv("PORT"),
        DBHost:   os.Getenv("DB_HOST"),
        DBPort:   os.Getenv("DB_PORT"),
        LogLevel: os.Getenv("LOG_LEVEL"),
    }
}
```

This approach is easy to start with, but production-ready systems usually add defaults, type parsing, and startup validation.

## Using godotenv

`godotenv` is commonly used for local development. It loads values from `.env` into process environment so developers can run services consistently on their machines.

```bash
go get github.com/joho/godotenv
```

**.env file:**
```
PORT=8080
DB_HOST=localhost
DB_PORT=5432
LOG_LEVEL=info
```

**Go code:**
```go
import "github.com/joho/godotenv"

func init() {
    godotenv.Load()
}
```

Use `.env` for local convenience, not as a production configuration mechanism.

## Structured Configuration

As your service grows, grouping settings into nested structs improves readability and reduces mistakes.

```go
type Config struct {
    Server ServerConfig
    Database DatabaseConfig
    Logging LoggingConfig
}

type ServerConfig struct {
    Port    int    `envconfig:"PORT" default:"8080"`
    Timeout int    `envconfig:"TIMEOUT" default:"30"`
}

type DatabaseConfig struct {
    Host     string `envconfig:"DB_HOST"`
    Port     int    `envconfig:"DB_PORT"`
    User     string `envconfig:"DB_USER"`
    Password string `envconfig:"DB_PASSWORD"`
    Name     string `envconfig:"DB_NAME"`
}
```

This structure makes config ownership clear and keeps startup wiring clean.

## Using Viper

Viper is an optional higher-level config library that supports config files, env overrides, and richer loading rules.

```bash
go get github.com/spf13/viper
```

## Assignment: Configuration Management

### Goal
Implement environment-based configuration for dev/test/production.

The objective is to load config once at startup, validate critical values, and pass typed configuration through dependency wiring.

### Tasks

#### 1. Create Config Package

Centralize runtime settings in one package so defaults, required fields, and validation rules are easy to reason about.

Create `pkg/config/config.go`:

```go
package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Logging  LoggingConfig
	App      AppConfig
}

type ServerConfig struct {
	Port    string
	Timeout time.Duration
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

type LoggingConfig struct {
	Level string
}

type AppConfig struct {
	Env string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:    getEnv("PORT", "8080"),
			Timeout: 30 * time.Second,
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			Name:     getEnv("DB_NAME", "bookshelf"),
		},
		Logging: LoggingConfig{
			Level: getEnv("LOG_LEVEL", "info"),
		},
		App: AppConfig{
			Env: getEnv("APP_ENV", "development"),
		},
	}
}

func (c *Config) Validate() error {
	if c.App.Env == "production" && c.Database.Password == "" {
		return fmt.Errorf("DB_PASSWORD required in production")
	}
	return nil
}

func getEnv(key, def string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return def
}

func (c *Config) IsProduction() bool {
	return c.App.Env == "production"
}
```

Why this design helps:

- `Load()` defines deterministic startup behavior.
- `Validate()` catches dangerous config states early.
- `IsProduction()` enables environment-specific guardrails.

#### 2. Create .env File

The `.env` file provides local developer defaults. Keep it out of version control when it contains environment-specific or sensitive values.

Create `.env` in project root:

```bash
PORT=8080
LOG_LEVEL=info
APP_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bookshelf
```

Add to `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

#### 3. Load .env in Development

Keep `.env` loading lightweight and optional. Explicit environment variables should still be able to override local file values.

Create `pkg/config/loader.go`:

```go
package config

import (
	"github.com/joho/godotenv"
)

func LoadEnvFile() {
	// Load .env in development
	_ = godotenv.Load()
}
```

Install:

```bash
go get github.com/joho/godotenv
```

#### 4. Update main.go

A good startup order is:

1. Load env source(s)
2. Build typed config
3. Validate config
4. Initialize logger and dependencies
5. Start server

```go
package main

import (
	"os"
	"github.com/yourusername/bookshelf-api/pkg/config"
	"github.com/yourusername/bookshelf-api/pkg/logger"
)

func main() {
	config.LoadEnvFile()
	cfg := config.Load()
	
	if err := cfg.Validate(); err != nil {
		panic(err)
	}
	
	log := logger.NewLogger(cfg.Logging.Level)
	
	log.Info("starting server",
		"port", cfg.Server.Port,
		"env", cfg.App.Env,
	)
	
	// ... rest of main ...
}
```


#### 5. Test Configuration

Configuration tests prevent hidden deployment regressions. At minimum, validate defaults, overrides, and required-value failures.

Create `tests/unit/config_test.go`:

```go
package unit

import (
	"os"
	"testing"
	"github.com/yourusername/bookshelf-api/pkg/config"
)

func TestLoadConfig_WithDefaults(t *testing.T) {
	os.Clearenv()
	cfg := config.Load()
	
	if cfg.Server.Port != "8080" {
		t.Errorf("expected port 8080, got %s", cfg.Server.Port)
	}
}

func TestLoadConfig_FromEnv(t *testing.T) {
	os.Setenv("PORT", "3000")
	defer os.Clearenv()
	
	cfg := config.Load()
	if cfg.Server.Port != "3000" {
		t.Errorf("expected port 3000, got %s", cfg.Server.Port)
	}
}
```

### Files Created

```
- pkg/config/config.go
- pkg/config/loader.go
- tests/unit/config_test.go
- .env
```

### Verification

Run with configuration:

```bash
# With defaults
go run cmd/server/main.go

# With custom port
PORT=3000 go run cmd/server/main.go

# With custom log level
LOG_LEVEL=debug go run cmd/server/main.go
```

```go
import "github.com/spf13/viper"

func LoadConfig() error {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    
    return viper.ReadInConfig()
}

port := viper.GetInt("server.port")
```

## Best Practices

- Never hardcode configuration
- Provide sensible defaults
- Validate configuration on startup
- Document all environment variables
- Use structured configuration objects
- Keep secrets out of logs and source control
- Keep config loading separate from business logic
- Fail fast on invalid critical values

## Deep Dive: Configuration as a Deployment Contract

### Background

Configuration is the contract between your code and runtime environment. Misconfiguration is a common production failure mode.

### Configuration Principles

1. Fail fast on invalid critical config.
2. Use defaults for local developer experience.
3. Keep secrets out of source control.
4. Separate environment concerns from business logic.
5. Make precedence rules explicit and documented.

### Recommended Layers

1. Hardcoded defaults
2. `.env` for local development
3. Environment variables in CI/production

Later layers override earlier ones.

### Example: Startup Guardrail

```go
cfg := config.Load()
if err := cfg.Validate(); err != nil {
	log.Error("invalid configuration", "error", err)
	os.Exit(1)
}
```

### SDET-Relevant Checks

- Add tests for missing/invalid required variables.
- Ensure CI pipelines set required environment values.
- Validate that logs print safe, non-secret configuration context.

## Common Anti-Patterns

- Loading `.env` unconditionally in production environments.
- Silently defaulting values that should be mandatory.
- Parsing numeric/duration values late in business logic instead of at startup.
- Hardcoding secrets in source code or checked-in config files.

## Quick Configuration Checklist

- Are required variables documented and validated at startup?
- Are defaults safe for local use but strict enough for production?
- Are secret values sourced securely and never printed in logs?
- Can config behavior be fully reproduced in tests without real environment files?

