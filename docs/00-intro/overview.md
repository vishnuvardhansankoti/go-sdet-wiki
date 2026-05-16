# Overview

This tutorial walks SDETs through building a real Go microservice — the Bookshelf API — with production-quality tests at every layer. Each section adds one capability and one testing strategy, so skills compound from installation through capstone.

## What is SDET?

Software Development Engineer in Test (SDET) is a role that combines software development with quality assurance. SDETs write code to test software, develop testing frameworks, and automate quality assurance processes.

## Why Go for SDET?

- **Performance**: Go compiles to a single binary
- **Concurrency**: Built-in support for goroutines
- **Simplicity**: Clean syntax, easy to learn
- **Testing**: Excellent standard library for testing
- **Deployment**: Single binary deployment

## What You'll Learn

This wiki covers everything needed to become an effective SDET in the Go ecosystem.

## Learning Through a Real Project: Bookshelf API

Rather than learning concepts in isolation, you'll build a **complete microservice** incrementally throughout this tutorial. Each section adds features and testing layers to a growing codebase.

### The Project: Bookshelf API

A REST API for managing personal bookshelves with users, books, reading lists, and reviews. By the end, you'll have:

- ✅ **Working API** with 15+ endpoints
- ✅ **80%+ test coverage** (unit, integration, contract tests)
- ✅ **Production-ready code** using Go best practices
- ✅ **Full CI/CD pipeline** with GitHub Actions
- ✅ **Multiple microservices** communicating via REST
- ✅ **Real PostgreSQL database** with Testcontainers
- ✅ **Clear API documentation** and examples

### How It Works

Each section introduces new concepts **and** guides you to implement them in the Bookshelf project:

| Section | What You Build |
|---------|---------------|
| 00-Intro | Project setup & architecture |
| 10-Go Basics | Domain models and business logic |
| 20-Microservices | REST API handlers and project structure |
| 30-Testing | Comprehensive unit tests |
| 40-Integration Testing | Real database with Testcontainers |
| 50-Contract Testing | Multiple microservices with Pact |
| 60-CI/CD | Automated testing pipeline |
| 70-Patterns | Advanced testing techniques |
| 90-Capstone | Polish, document, and deploy |

**By learning this way, you'll understand how all the pieces fit together in a real-world application.**

### Endpoint Convention Across Sections

- Sections 00-70 use `/api` in examples for progressive learning.
- Section 90 (Capstone) standardizes on `/api/v1` for versioned APIs.
- Keep each section's examples as-is while implementing that section.

## Deep Dive: How to Learn This Tutorial Effectively

### Background

The fastest way to gain SDET capability is to connect each concept to code you build and validate immediately. This tutorial is structured to reinforce that loop.

### Learning loop

1. Read one concept page.
2. Implement the assignment increment.
3. Run tests and inspect failures.
4. Refactor while preserving behavior.

### Execution discipline

- Keep one branch focused on one section milestone.
- Commit small, reversible steps.
- Preserve route conventions per section stage.

### SDET recommendation

Maintain a short section checklist for delivered endpoints, tests added, and unresolved risks to make progress measurable.

## Common Anti-Patterns

- Skipping sections and working out of order before the prerequisite domain model is solid.
- Copying code examples without running and modifying them locally.
- Treating code samples as reference material and deferring hands-on practice.
- Ignoring test failures within a section and planning to resolve them at the capstone.

## Quick Tutorial Progress Checklist

- Have you completed the previous section before starting the current one?
- Have you run all code examples locally, not just read them?
- Are failing tests from earlier sections resolved before adding new ones?
- Is your current branch focused on the current section milestone only?

