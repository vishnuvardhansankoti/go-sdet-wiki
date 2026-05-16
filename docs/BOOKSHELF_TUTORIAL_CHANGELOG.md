# Bookshelf Tutorial Changelog

Date: 2026-05-16

## Summary

This changelog records the end-to-end threading of the Bookshelf sample project across the Go SDET Wiki tutorial.

Scope completed:
- Section 00 through Section 90 documentation alignment
- Incremental assignment blocks added to core tutorial pages
- Cross-section consistency updates for route prefix and package naming

## Section 00: Intro

Updated:
- [Overview](00-intro/overview.md)
- [Install and Setup](00-intro/install-and-setup.md)

Highlights:
- Introduced the Bookshelf project as the learning backbone
- Added section-wise build progression
- Added endpoint convention note for section progression

## Section 10: Go Basics

Updated:
- [Variables and Types](10-go-basics/variables-and-types.md)
- [Structs and Interfaces](10-go-basics/structs-and-interfaces.md)
- [Error Handling](10-go-basics/error-handling.md)
- [Functions and Methods](10-go-basics/functions-and-methods.md)
- [Concurrency Goroutines](10-go-basics/concurrency-goroutines.md)

Highlights:
- Domain types and constants
- Constructors and validation rules
- Typed error model
- Business services and composition
- Worker-pool style concurrency assignment

## Section 20: Microservices

Updated:
- [REST API Design](20-microservices/rest-api-design.md)
- [Project Folder Structure](20-microservices/project-folder-structure.md)
- [Dependency Injection](20-microservices/dependency-injection.md)
- [Logging and Observability](20-microservices/logging-and-observability.md)
- [Configuration and Env Vars](20-microservices/configuration-and-env-vars.md)

Highlights:
- Handler and router assignments
- Response envelope and DTO guidance
- DI and repository interface shape
- Structured logging and middleware examples
- Environment-driven configuration flow

## Section 30: Testing Basics

Updated:
- [Testing Package Basics](30-testing-basics/testing-package-basics.md)
- [Table Driven Tests](30-testing-basics/table-driven-tests.md)
- [Test Organization and Naming](30-testing-basics/test-organization-and-naming.md)
- [Testing HTTP Handlers](30-testing-basics/testing-http-handlers.md)
- [Mocking with Interfaces](30-testing-basics/mocking-with-interfaces.md)
- [Testing Database Code with Fakes](30-testing-basics/testing-database-code-with-fakes.md)

Highlights:
- First unit test assignment sequence
- Table-driven validation focus
- Handler test scaffolding and mock usage
- Fake repository patterns for fast deterministic tests

## Section 40: Integration Testing with Testcontainers

Updated:
- [Intro to Testcontainers](40-integration-testing-testcontainers/intro-to-testcontainers.md)
- [Installing Testcontainers Go](40-integration-testing-testcontainers/installing-testcontainers-go.md)
- [First Container Test](40-integration-testing-testcontainers/first-container-test.md)
- [Postgres Integration Tests](40-integration-testing-testcontainers/postgres-integration-tests.md)
- [API End to End Tests](40-integration-testing-testcontainers/api-end-to-end-tests.md)
- [Testcontainers CI Considerations](40-integration-testing-testcontainers/testcontainers-ci-considerations.md)

Highlights:
- Shared integration helper approach
- First postgres container smoke test
- Repository integration and E2E assignment flow
- CI reliability guidance for containerized tests

## Section 50: Contract Testing

Updated:
- [Why Contract Testing](50-contract-testing/why-contract-testing.md)
- [Pact Go Basics](50-contract-testing/pact-go-basics.md)
- [Consumer Contract Tests](50-contract-testing/consumer-contract-tests.md)
- [Provider Verification Tests](50-contract-testing/provider-verification-tests.md)
- [Pact in CI](50-contract-testing/pact-in-ci.md)

Highlights:
- Bookshelf provider and consumer boundaries
- Consumer pact generation assignment
- Provider verification with deterministic state handlers
- CI publish and verify workflow guidance

## Section 60: CI CD and Quality Gates

Updated:
- [GitHub Actions for Go](60-ci-cd-and-quality-gates/github-actions-for-go.md)
- [Running Unit and Integration Tests](60-ci-cd-and-quality-gates/running-unit-and-integration-tests.md)
- [Linting and Static Analysis](60-ci-cd-and-quality-gates/linting-and-static-analysis.md)
- [Coverage and Thresholds](60-ci-cd-and-quality-gates/coverage-and-thresholds.md)

Highlights:
- Multi-job CI workflow assignment
- Unit, integration, and contract execution strategy
- Lint, vet, and security gates
- Coverage policy and threshold checks

## Section 70: Patterns and Recipes

Updated:
- [Debugging Concurrent Tests](70-patterns-and-recipes/debugging-concurrent-tests.md)
- [Flaky Test Diagnostics](70-patterns-and-recipes/flaky-test-diagnostics.md)
- [Golden Files Pattern](70-patterns-and-recipes/golden-files-pattern.md)
- [Test Data Builders](70-patterns-and-recipes/test-data-builders.md)

Highlights:
- Concurrency hardening for import tests
- Flake detection and stabilization checklist
- Golden file strategy for API snapshots
- Builder utilities for reusable fixture creation

## Section 90: Capstone

Updated:
- [Capstone Overview](90-capstone/capstone-overview.md)
- [Requirements and Scope](90-capstone/requirements-and-scope.md)
- [API Specification](90-capstone/api-specification.md)
- [Domain and Data Model](90-capstone/domain-and-data-model.md)
- [Implementation Guide](90-capstone/implementation-guide.md)
- [Unit Testing Strategy](90-capstone/unit-testing-strategy.md)
- [Integration Testing with Testcontainers](90-capstone/integration-testing-with-testcontainers.md)
- [Contract Testing Strategy](90-capstone/contract-testing-strategy.md)
- [CI Pipeline for Capstone](90-capstone/ci-pipeline-for-capstone.md)

Highlights:
- End-to-end capstone delivery milestones
- Scope freeze and API contract finalization
- Final quality gates for release readiness
- Package naming and route prefix consistency refinements

## Consistency Pass Notes

Final normalization completed:
- Capstone package references aligned to handler naming where needed
- Route prefix convention explicitly documented across early sections and capstone
- Minor notation and snippet quality fixes applied

## Outcome

The tutorial now reads as one connected implementation path from setup to capstone, centered on a single Bookshelf project and progressive assignments.