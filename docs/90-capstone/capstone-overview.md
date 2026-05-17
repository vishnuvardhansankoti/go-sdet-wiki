# Capstone Overview

The capstone is where all earlier topics converge into one delivery-grade system. The objective is not only to implement features, but to prove engineering quality through layered tests, clear contracts, and repeatable CI evidence.

Use this page as the execution map for scope, implementation, and release readiness.

## Project Goal

Build a complete, production-ready microservice with comprehensive test coverage using all the techniques learned throughout this wiki.

Production-ready here means deterministic builds, verifiable behavior, and governance through quality gates.

## Project: Bookshelf API

A RESTful API for managing a digital bookshelf with:

- User accounts and authentication
- Book inventory management
- Reading lists and recommendations
- Rating and review system

### API Versioning Convention

For capstone artifacts, use `/api/v1` consistently.
Earlier tutorial sections may show `/api` for simpler progressive examples.

## What You'll Build

### Core Services

1. **User Service**: User registration, authentication
2. **Book Service**: Book catalog, inventory
3. **Reading List Service**: Manage user reading lists
4. **Review Service**: Ratings and reviews

### Testing Layers

1. **Unit Tests**: Individual functions and methods
2. **Integration Tests**: Database operations with Testcontainers
3. **API Tests**: HTTP endpoint testing
4. **Contract Tests**: Service-to-service contracts (Pact)
5. **End-to-End Tests**: Full workflow testing

### DevOps

1. **CI/CD Pipeline**: GitHub Actions
2. **Code Quality**: Linting, coverage checks
3. **Docker**: Containerization
4. **Deployment**: Automated deployment

## Learning Outcomes

After completing this capstone, you will:

✓ Understand full SDLC with testing at each layer
✓ Apply all patterns from this wiki
✓ Build production-ready Go code
✓ Implement comprehensive testing strategy
✓ Set up complete CI/CD pipeline
✓ Work with microservices architecture

These outcomes are strongest when each milestone includes implementation plus test evidence.

## Capstone Structure

1. **[Requirements and Scope](requirements-and-scope.md)** - Define project boundaries
2. **[Domain and Data Model](domain-and-data-model.md)** - Design data structures
3. **[API Specification](api-specification.md)** - Define HTTP contracts
4. **[Implementation Guide](implementation-guide.md)** - Build the services
5. **[Unit Testing Strategy](unit-testing-strategy.md)** - Test individual components
6. **[Integration Testing](integration-testing-with-testcontainers.md)** - Test with real DB
7. **[Contract Testing](contract-testing-strategy.md)** - Test service contracts
8. **[CI Pipeline](ci-pipeline-for-capstone.md)** - Automate quality checks

## Time Estimate

- **Beginner**: 40-50 hours
- **Intermediate**: 20-30 hours
- **Advanced**: 10-15 hours

Treat estimates as planning guidance; quality-gate and debugging time is intentionally included.

## Prerequisites

- Complete understanding of Go basics (sections 00-10)
- Familiarity with testing concepts (sections 30-40)
- Understanding of microservices (section 20)

## How to Use This Capstone

### Option 1: Follow Step-by-Step
Work through each section sequentially, building incrementally.

### Option 2: Mix and Match
Jump to sections most relevant to your learning goals.

### Option 3: Build First, Learn Later
Implement the project, then use sections as reference.

## How This Relates to Earlier Assignments

The capstone is an extension of the same Bookshelf API you start in earlier sections.

It is not a second, separate project.

Think of the tutorial flow in two phases:

1. Learning phase (section assignments): build the API incrementally to learn one concept at a time.
2. Delivery phase (capstone): consolidate everything into one release-ready implementation with stronger quality gates.

What changes in capstone:

1. Scope is finalized and documented.
2. API versioning is standardized (`/api/v1`) for final artifacts.
3. Unit, integration, contract, and end-to-end testing are treated as mandatory release evidence.
4. CI quality gates become release requirements, not optional checks.

If you already implemented section assignments, reuse and harden that code in capstone rather than rewriting from scratch.

## Getting Help

- Refer back to earlier wiki sections
- Review code examples in each section
- Check error messages and debug systematically
- Test incrementally, don't wait until the end

## Next Steps

Start with [Requirements and Scope](requirements-and-scope.md)

## Assignment: Capstone Delivery Plan (Bookshelf)

### Goal
Turn the tutorial project into a final capstone deliverable with clear milestones.

### Milestones

1. Freeze scope and API contract.
2. Complete domain and repository implementation.
3. Reach passing unit + integration + contract suites.
4. Enforce CI quality gates and coverage.
5. Publish final README and architecture notes.

### Done Criteria

- All section deliverables are complete.
- Final app is buildable and testable from a clean clone.

## Deep Dive: Capstone Execution Strategy

### Background

Capstone success depends less on coding speed and more on sequencing decisions that keep architecture, tests, and delivery criteria aligned.

### Execution principles

1. Keep one canonical API version (`/api/v1`) for all final artifacts.
2. Define acceptance tests before implementing each milestone.
3. Treat CI gates as release requirements, not optional checks.
4. Keep scope stable once implementation starts.

### SDET recommendation

Use milestone demos with explicit evidence: endpoint checks, test reports, coverage, and CI screenshots.

## Common Anti-Patterns

- Building all features first and postponing test layers until the end.
- Mixing route/version conventions mid-capstone.
- Expanding scope after implementation has started.
- Treating CI failures as optional cleanup instead of release blockers.

## Quick Capstone Readiness Checklist

- Is `/api/v1` used consistently across artifacts?
- Does each milestone include acceptance tests?
- Are unit, integration, and contract suites all passing?
- Are coverage and lint gates enforced in CI?
- Is the project reproducible from a clean clone?


