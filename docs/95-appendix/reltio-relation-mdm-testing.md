# Reltio Relation MDM Testing with Go

This appendix is a deep dive into relation-centric testing for Reltio MDM using Go. While entity tests verify that records exist and hold expected attributes, relation tests verify the graph itself: who is connected to whom, by what relation type, in what direction, and under which business constraints.

In many real MDM implementations, production incidents are caused less by missing entities and more by incorrect links. Example: an employee linked to the wrong legal entity, a household relation attached in reverse direction, or a stale relation still appearing in downstream search. This is why relation tests should be first-class citizens in your suite, not an afterthought.

This guide covers:

- Why relation testing requires different strategies than basic entity tests
- How to structure reliable and maintainable Go test suites for relation flows
- How to handle consistency delays, retries, and cleanup safely
- Practical examples you can adapt to your own Reltio client and tenant

Use this page together with the broader guide in [Testing Reltio MDM with Go](testing-reltio-mdm-with-go.md). Both appendices share the same profile model (`smoke`, `full`, `release`) and environment guard naming.

## Relation Model Primer

Before writing tests, align your team on these relation concepts:

- Relation type: semantic meaning of the edge (for example, Employment, Ownership, ParentChild)
- Start and end objects: the directional endpoints of a relation
- Roles: optional role metadata that further qualifies endpoint meaning
- Lifecycle state: whether relation was created, updated, soft-deleted, or hard-deleted

Tests should assert relation semantics, not just HTTP status codes.

## Why Go Works Well for Relation Testing

Go is effective for Reltio relation testing because it gives you:

- Fast execution with straightforward parallel test support
- Deterministic setup/teardown using `t.Cleanup`
- Clear table-driven patterns for scenario coverage
- Easy composition of reusable test helpers for fixtures and polling

The standard `testing` package is enough for most teams, with optional helper libraries when needed.

## Relation Testing Goals

For most MDM domains, relation quality is as critical as entity quality. Your tests should validate:

- Correct relation type and role mapping
- Directionality between source and target entities
- Relation visibility in relation and graph queries
- Safe cleanup without leaving orphaned test data

Add one explicit goal for every domain: relation behavior remains stable under schema evolution.

## Test Scope for Relation Flows

Use a layered strategy so feedback is fast and reliable:

1. Client contract tests
2. Tenant integration tests
3. End-to-end workflow tests

Client contract tests validate request/response mapping in your Go wrapper without depending on full business flow orchestration. Tenant integration tests hit real non-production environments to verify permissions, relation configuration, and query behavior. End-to-end tests validate business scenarios crossing multiple systems.

## Recommended Test Matrix

Use a compact but meaningful matrix:

1. Create relation with valid source and target
2. Reject invalid relation type or missing mandatory attributes
3. Fetch relation by URI and verify role fields
4. Search/filter relations by type or endpoints
5. Delete relation and verify it is no longer queryable

Keep this matrix in pull requests and run expanded edge-case coverage nightly.

For domains with strict governance, add matrix entries for audit fields and update semantics.

## Environment and Configuration

Store tenant and auth details in environment variables and read them once per test suite bootstrap.

Suggested variables:

- RELTIO_BASE_URL
- RELTIO_TENANT
- RELTIO_CLIENT_ID
- RELTIO_CLIENT_SECRET
- RELTIO_TEST_PROFILE

Recommended pattern:

```go
func RequireReltioEnv(t *testing.T) {
    t.Helper()
    required := []string{
        "RELTIO_BASE_URL",
        "RELTIO_TENANT",
        "RELTIO_CLIENT_ID",
        "RELTIO_CLIENT_SECRET",
    }
    for _, key := range required {
        if os.Getenv(key) == "" {
            t.Skipf("missing required env: %s", key)
        }
    }
}
```

This keeps local developer runs safe while ensuring CI failures are explicit.

## Example Data Setup Pattern

```go
type RelationFixture struct {
    SourceURI   string
    TargetURI   string
    RelationURI string
}

func CreateRelationFixture(ctx context.Context, t *testing.T, c *reltio.Client) RelationFixture {
    t.Helper()

    src, err := c.CreateEntity(ctx, reltio.CreateEntityRequest{Type: "configuration/entityTypes/Person"})
    if err != nil {
        t.Fatalf("create source entity: %v", err)
    }

    dst, err := c.CreateEntity(ctx, reltio.CreateEntityRequest{Type: "configuration/entityTypes/Organization"})
    if err != nil {
        t.Fatalf("create target entity: %v", err)
    }

    rel, err := c.CreateRelation(ctx, reltio.CreateRelationRequest{
        Type:      "configuration/relationTypes/Employment",
        StartURI:  src.URI,
        EndURI:    dst.URI,
    })
    if err != nil {
        t.Fatalf("create relation: %v", err)
    }

    return RelationFixture{SourceURI: src.URI, TargetURI: dst.URI, RelationURI: rel.URI}
}
```

Use fixture helpers to keep test setup readable and reusable.

Use test-owned fixture identifiers (for example, suffixes with timestamp or run ID) to avoid cross-run collisions.

## Expanded Lifecycle Example with Stronger Assertions

```go
func TestRelationLifecycle_WithTypeAndDirectionChecks(t *testing.T) {
    t.Parallel()
    RequireReltioEnv(t)

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
    defer cancel()

    fx := CreateRelationFixture(ctx, t, client)
    t.Cleanup(func() {
        _ = client.DeleteRelation(context.Background(), fx.RelationURI)
        _ = client.DeleteEntity(context.Background(), fx.SourceURI)
        _ = client.DeleteEntity(context.Background(), fx.TargetURI)
    })

    got, err := client.GetRelation(ctx, fx.RelationURI)
    if err != nil {
        t.Fatalf("get relation: %v", err)
    }

    if got.Type != "configuration/relationTypes/Employment" {
        t.Fatalf("unexpected relation type: %s", got.Type)
    }

    if got.StartObject.URI != fx.SourceURI {
        t.Fatalf("unexpected start URI: got=%s want=%s", got.StartObject.URI, fx.SourceURI)
    }

    if got.EndObject.URI != fx.TargetURI {
        t.Fatalf("unexpected end URI: got=%s want=%s", got.EndObject.URI, fx.TargetURI)
    }
}
```

## Core Relation Test Example

```go
func TestRelationLifecycle(t *testing.T) {
    t.Parallel()

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    fx := CreateRelationFixture(ctx, t, client)
    t.Cleanup(func() {
        _ = client.DeleteRelation(context.Background(), fx.RelationURI)
        _ = client.DeleteEntity(context.Background(), fx.SourceURI)
        _ = client.DeleteEntity(context.Background(), fx.TargetURI)
    })

    got, err := client.GetRelation(ctx, fx.RelationURI)
    if err != nil {
        t.Fatalf("get relation: %v", err)
    }

    if got.StartObject.URI != fx.SourceURI || got.EndObject.URI != fx.TargetURI {
        t.Fatalf("unexpected relation endpoints: start=%s end=%s", got.StartObject.URI, got.EndObject.URI)
    }
}
```

The simple example is useful as a smoke test. The expanded example should be your baseline for pull requests.

## Assertions That Matter

Prefer business-significant assertions over raw payload snapshots:

- Relation type is expected for the domain flow
- Endpoint URIs match fixture entities
- Role attributes are present and valid
- Created timestamps are parseable when required by downstream consumers

When possible, assert domain expectations at the boundary where consumers read the relation (search, graph, or transformed API), not only at raw relation retrieval.

## Handling Eventual Consistency

Some tenants may show slight delay in relation visibility after writes. Use bounded polling:

- Poll for a short maximum window
- Exit early when relation becomes visible
- Fail with a clear timeout message

Avoid unbounded retries that hide real failures.

Example polling helper:

```go
func WaitForRelationVisible(ctx context.Context, c *reltio.Client, relationURI string, maxWait time.Duration) error {
    deadline := time.Now().Add(maxWait)
    interval := 300 * time.Millisecond

    for {
        if time.Now().After(deadline) {
            return fmt.Errorf("relation not visible within %s: %s", maxWait, relationURI)
        }

        _, err := c.GetRelation(ctx, relationURI)
        if err == nil {
            return nil
        }

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(interval):
        }
    }
}
```

Use this helper only where consistency delay is expected. Avoid adding polling everywhere.

## Table-Driven Negative Tests

Table-driven tests keep failure mode coverage concise and maintainable.

```go
func TestCreateRelation_NegativeCases(t *testing.T) {
    t.Parallel()
    RequireReltioEnv(t)

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    cases := []struct {
        name string
        req  reltio.CreateRelationRequest
    }{
        {
            name: "invalid relation type",
            req: reltio.CreateRelationRequest{
                Type:     "configuration/relationTypes/DoesNotExist",
                StartURI: "entities/1",
                EndURI:   "entities/2",
            },
        },
        {
            name: "missing source URI",
            req: reltio.CreateRelationRequest{
                Type:   "configuration/relationTypes/Employment",
                EndURI: "entities/2",
            },
        },
    }

    for _, tc := range cases {
        tc := tc
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()
            _, err := client.CreateRelation(ctx, tc.req)
            if err == nil {
                t.Fatalf("expected error for case %q", tc.name)
            }
        })
    }
}
```

Tune expected error checks to your client error model (status codes, typed errors, or domain error codes).

## Search and Graph Validation Example

After creating a relation, verify discoverability in your read path (search endpoint or graph query), not only direct URI fetch.

```go
func TestRelationDiscoverabilityInSearch(t *testing.T) {
    t.Parallel()
    RequireReltioEnv(t)

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
    defer cancel()

    fx := CreateRelationFixture(ctx, t, client)
    t.Cleanup(func() {
        _ = client.DeleteRelation(context.Background(), fx.RelationURI)
        _ = client.DeleteEntity(context.Background(), fx.SourceURI)
        _ = client.DeleteEntity(context.Background(), fx.TargetURI)
    })

    if err := WaitForRelationVisible(ctx, client, fx.RelationURI, 8*time.Second); err != nil {
        t.Fatalf("wait for relation visibility: %v", err)
    }

    found, err := client.FindRelationsByEndpoint(ctx, fx.SourceURI)
    if err != nil {
        t.Fatalf("search relations: %v", err)
    }

    var seen bool
    for _, rel := range found {
        if rel.URI == fx.RelationURI {
            seen = true
            break
        }
    }

    if !seen {
        t.Fatalf("expected relation %s in endpoint search results", fx.RelationURI)
    }
}
```

This protects your integration against indexing or query regression.

## Negative Testing Patterns

Include explicit failure tests:

- Invalid relation type identifier
- Non-existent source or target URI
- Missing mandatory attributes
- Unauthorized create/read/delete operations

Negative tests prevent accidental broad permissions and schema drift.

Also include one test for relation update validation if your system supports mutable relation attributes.

## Cleanup and Isolation Best Practices

Use cleanup rules that survive partial failures:

- Always register cleanup immediately after creating a resource
- Use separate cleanup calls for relation and both endpoints
- Ignore not-found during cleanup to keep teardown idempotent
- Keep fixtures test-owned; never mutate shared baseline records

These practices make parallel execution safer and reduce flaky failures.

## Test Profile Design

Use explicit profiles to control coverage by pipeline stage:

- Smoke: fast relation lifecycle checks
- Full: expanded matrix including negative and discoverability checks
- Release: full suite against release-candidate tenant

Profiles keep pull request feedback fast while preserving deeper confidence for release.

## CI Strategy for Relation Tests

Use tags or naming conventions to separate profiles:

```bash
go test ./tests/reltio -run Relation -count=1
go test ./tests/reltio -run Relation -count=1 -v
```

Recommended flow:

1. Pull request: smoke relation create/get/delete tests
2. Nightly schedule: full matrix including negative and consistency tests
3. Pre-release: full suite against release-candidate tenant

You can further split by environment variable profiles, for example:

```bash
RELTIO_TEST_PROFILE=smoke go test ./tests/reltio -run Relation -count=1
RELTIO_TEST_PROFILE=full go test ./tests/reltio -run Relation -count=1 -v
```

In smoke mode, keep only the minimum relation lifecycle checks. In full mode, include consistency, negative, and search discoverability tests.

## Troubleshooting Checklist

- Tenant has the expected relation type configuration
- Credentials have relation read/write permissions
- Test entities are created in the same tenant/context
- Cleanup runs even on assertion failures
- Retry windows are short and bounded

If failures remain intermittent, capture request IDs and timestamps from your client logs so platform and test logs can be correlated quickly.

## Summary

Relation tests validate graph correctness, not just API success. A robust suite combines fast lifecycle smoke tests, focused negative tests, bounded consistency handling, and discoverability checks in read paths.

Start with one deterministic lifecycle test, then expand to matrix coverage with table-driven cases and profile-based CI execution.

## Related Appendix

For broader entity-focused guidance, see [Testing Reltio MDM with Go](testing-reltio-mdm-with-go.md).


## Next Step

Continue with [Rancher Desktop Setup for Local Containers](rancher-desktop-setup-for-local-containers.md).
