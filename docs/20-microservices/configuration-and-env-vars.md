# Configuration and Environment Variables

## Using Environment Variables

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

## Using godotenv

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

## Structured Configuration

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

## Using Viper

```bash
go get github.com/spf13/viper
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
