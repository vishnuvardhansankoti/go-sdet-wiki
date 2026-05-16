# Microservices Overview

## What is a Microservice?

A microservice is a small, independently deployable service that performs a specific business capability.

## Characteristics

- **Single Responsibility**: One reason to change
- **Independently Deployable**: Can deploy without affecting others
- **Loosely Coupled**: Minimal dependencies on other services
- **Highly Cohesive**: Related functionality grouped together

## Communication Patterns

### Synchronous
- REST APIs (HTTP)
- gRPC

### Asynchronous
- Message Queues (RabbitMQ, Kafka)
- Event Bus

## Why Go for Microservices?

- **Performance**: Low memory footprint
- **Concurrency**: Handles thousands of concurrent connections
- **Deployment**: Single binary
- **Standard Library**: Everything needed for HTTP/REST

## Go Microservice Stack

- **Framework**: net/http, Gin, Echo, or similar
- **Database**: PostgreSQL, MongoDB, Redis
- **Logging**: Structured logging with JSON output
- **Configuration**: Environment variables or config files
- **Observability**: Metrics, traces, logs
- **Testing**: Table-driven tests, mocking, integration tests
