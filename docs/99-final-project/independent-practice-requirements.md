# Final Project: Independent Practice Requirements

This final project is an additional self-driven practice exercise. It is intentionally specified as requirements only.

There are no implementation instructions in this section.

## Purpose

Design and deliver a complete Go-based backend project that demonstrates mastery across all major topics in this wiki.

## Project Theme

Build a service-oriented system named Learning Tracker Platform.

The platform manages learners, courses, progress, assessments, and feedback workflows.

## High-Level Outcome

By the end of this project, students should produce a production-style codebase with clear architecture, quality gates, and layered tests.

## Functional Requirements

### User and Access Domain

1. The system must support learner and instructor accounts.
2. The system must support account registration and profile updates.
3. The system must support account status lifecycle values such as active, suspended, and archived.
4. The system must record account creation and update timestamps.

### Course Domain

1. The system must support course creation, update, and archival.
2. Each course must include title, description, level, duration metadata, and owner.
3. The system must support listing and filtering courses.
4. The system must support course enrollment by learners.

### Progress Domain

1. The system must track learner progress per course as a percentage.
2. The system must track lesson completion events.
3. The system must expose progress summaries by learner and by course.
4. The system must enforce valid progress ranges.

### Assessment Domain

1. The system must support creating assessments attached to courses.
2. The system must support submission of assessment attempts.
3. The system must calculate and persist scores.
4. The system must support pass and fail thresholds.

### Feedback Domain

1. Learners must be able to submit feedback for completed courses.
2. Feedback entries must include rating and comment.
3. The system must support listing feedback by course.
4. The system must prevent invalid ratings.

## API Requirements

1. Expose a versioned REST API under /api/v1.
2. Use resource-oriented endpoints and consistent HTTP semantics.
3. Return structured error responses with stable error codes.
4. Include request validation and clear validation messages.
5. Include pagination and filtering for list endpoints.
6. Include health and readiness endpoints.

## Architecture and Design Requirements

1. Use clear package boundaries for domain, service, repository, handler, configuration, and logging concerns.
2. Define domain types and constants to avoid magic strings and primitive obsession.
3. Keep business rules in service or domain layers, not in HTTP handlers.
4. Use interfaces where substitution improves testability.
5. Keep transport DTOs separate from domain models where appropriate.

## Data and Persistence Requirements

1. Use PostgreSQL as the primary datastore.
2. Define schema constraints for integrity and consistency.
3. Include migration strategy and migration artifacts.
4. Design indexes for common lookup patterns.
5. Ensure data access logic is testable and isolated.

## Testing Requirements

### Unit Testing

1. Use table-driven tests for business logic.
2. Include happy-path and failure-path coverage.
3. Include boundary and invalid input tests.

### Integration Testing

1. Use containerized database integration tests.
2. Validate repository behavior against real PostgreSQL.
3. Ensure deterministic test setup and teardown.

### API Testing

1. Validate endpoint behavior with request and response assertions.
2. Validate status codes, payload shape, and error responses.
3. Include authorization or role-behavior checks if implemented.

### Contract Testing

1. Define service contracts for at least one consumer-provider interaction.
2. Verify provider compatibility against contract expectations.
3. Integrate contract checks into automated quality flow.

### End-to-End Testing

1. Validate at least one full learner journey from enrollment to feedback.
2. Validate at least one instructor journey from course creation to assessment review.

## Quality and Reliability Requirements

1. Enforce linting and static analysis gates.
2. Enforce minimum test coverage threshold.
3. Ensure race-detector clean test execution where applicable.
4. Implement structured logging for key operations and failures.
5. Provide configuration through environment variables with safe defaults.

## CI and Delivery Requirements

1. Create automated workflows for build, lint, and test.
2. Separate fast checks and slower checks where practical.
3. Publish test and coverage artifacts.
4. Prevent merge on failing quality gates.

## Documentation Requirements

1. Provide project overview and architecture summary.
2. Provide API documentation with endpoint definitions.
3. Provide testing strategy and quality gate documentation.
4. Provide run and troubleshooting documentation.
5. Provide assumptions, constraints, and deferred scope.

## Non-Functional Requirements

### Performance

1. Define measurable response-time objectives for common endpoints.
2. Define throughput targets for moderate concurrent usage.

### Security

1. Validate and sanitize all user inputs.
2. Protect sensitive data and secrets.
3. Define authentication and authorization expectations if included.

### Maintainability

1. Keep modules cohesive and loosely coupled.
2. Keep naming conventions consistent and expressive.
3. Keep documentation aligned with implemented behavior.

### Observability

1. Expose operational metrics for core service behaviors.
2. Include meaningful logs for failures and state transitions.

## Scope Boundaries

### In Scope

1. Complete backend service design and implementation meeting requirements above.
2. Full layered testing strategy and CI quality enforcement.
3. Project documentation sufficient for reviewer evaluation.

### Out of Scope

1. Front-end web or mobile application.
2. Production cloud deployment infrastructure beyond optional stretch goals.
3. Advanced recommendation or machine learning features.

## Evaluation Rubric

1. Correctness of functional behavior.
2. Quality of architecture and code organization.
3. Depth and reliability of tests.
4. CI quality gate rigor.
5. Documentation clarity and completeness.
6. Consistency with versioned API and domain modeling best practices.

## Suggested Deliverables

1. Repository with complete source and tests.
2. API specification document.
3. Architecture document.
4. Test strategy and quality report.
5. CI pipeline evidence.

## Final Note

This section is intentionally requirements-only. Students should plan, design, implement, and validate the project independently as capstone-level practice.


## Next Step

Continue with [Testing Reltio MDM with Go](../95-appendix/testing-reltio-mdm-with-go.md).
