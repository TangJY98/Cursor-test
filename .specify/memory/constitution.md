<!--
Sync Impact Report
- Version change: 0.0.0 (template placeholders) → 1.0.0
- Modified principles: All placeholders replaced with 10 ratified principles
- Added sections:
  - Core Principles (10 principles across distributed systems, software design,
    data engineering, DevOps, and observability)
  - Domain Coverage
  - Review & Compliance
- Removed sections: Template placeholder sections ([SECTION_2_NAME], [SECTION_3_NAME])
- Follow-up TODOs: None
-->

# Cursor-test Constitution

## Core Principles

### I. Do Not Distribute by Default

**Domain**: Distributed Systems

**Rationale**: Coordination cost grows with process count. Every additional network
hop, queue, or service boundary adds failure modes, latency variance, and
operational surface area. Distribution MUST earn its place with a concrete,
documented trigger—not architectural preference.

**Rule**: Vertical scaling and a single deployable unit are the default starting
point. A new process, service, or queue MUST NOT be introduced without a written
justification tied to exactly one of: (1) working-set overflow that cannot be
resolved by scaling the deployable, (2) genuinely independent compute that cannot
share a runtime, (3) geographic latency requirements, or (4) organizational
independence with separate ownership and release cadence. Coordination cost MUST
be measured in round trips, not milliseconds.

**How To Apply**:
- Reject PRs that add a new service, worker, or queue without a linked
  justification document naming the trigger category above.
- Reject PRs that split a monolith without demonstrating the trigger category
  is met and that coordination round trips are accounted for.
- Accept PRs that keep logic in the existing deployable when no trigger category
  applies.
- Flag any design doc that cites "scalability" or "best practice" without naming
  a trigger category as a constitution violation.

### II. Optimize for Deletion, Not Extension

**Domain**: Software Design

**Rationale**: Systems that accumulate extension points and speculative
abstractions become expensive to change. Small, deletable modules reduce blast
radius and make rewrites feasible. Duplication below a threshold is cheaper than
the wrong abstraction.

**Rule**: Every module MUST be small enough that one engineer can delete and
rewrite it in one working day. Speculative abstractions, plugin frameworks, and
"future-proof" indirection MUST NOT be introduced without a current, concrete use
case. Code MUST be inlined until extraction is forced by pain (third duplication
or proven maintenance cost). Duplication below three occurrences MUST be
preferred over a premature abstraction.

**How To Apply**:
- Reject PRs that introduce abstract base classes, generic plugin systems, or
  configuration-driven behavior without a named current consumer.
- Reject PRs where a module exceeds ~500 lines or spans multiple unrelated
  concerns without a decomposition plan.
- Accept PRs that duplicate logic twice when a shared abstraction is not yet
  justified.
- Require extraction only when the same logic appears three times or when a
  reviewer can cite a concrete maintenance cost of inlining.

### III. Make Dependencies Explicit

**Domain**: Software Design

**Rationale**: Hidden coupling and implicit global state make code untestable,
unpredictable, and unsafe to refactor. Explicit dependencies make behavior
auditable at read time.

**Rule**: Hidden coupling, implicit global state, and import-time side effects
MUST NOT exist in new code. Every dependency of a function MUST be visible in
its signature or declared at the top of its file. Singletons MUST NOT be used
for injectable dependencies; dependency injection MUST be used instead.

**How To Apply**:
- Reject PRs that read from module-level mutable state, environment variables
  inside business logic (without passing them in), or service locators.
- Reject PRs that perform I/O, network calls, or database access at import time.
- Reject PRs that use `getInstance()`, module-level caches, or hidden registries
  where constructor or function parameters would suffice.
- Accept PRs where all external dependencies appear in function signatures or as
  clearly declared constructor parameters at the top of the file.

### IV. Contract at the Boundary, Not in the Middle

**Domain**: Data Engineering

**Rationale**: Shared mutable schemas create coupling across producers and
consumers. Boundaries are the only stable place to reconcile semantic
differences between contexts.

**Rule**: Every producer/consumer boundary (HTTP endpoint, queue message, file
format, database table) MUST have a versioned schema. Semantic reconciliation
MUST happen at the boundary and MUST be owned by the side that understands both
contexts. Shared mutable schemas between services or modules MUST NOT exist.

**How To Apply**:
- Reject PRs that add or change a boundary payload without a versioned schema
  (OpenAPI, JSON Schema, Protobuf, Avro, or equivalent).
- Reject PRs that import another service's internal model types across a
  boundary.
- Reject PRs that perform field renaming, type coercion, or defaulting in the
  middle of a pipeline instead of at the ingress/egress boundary.
- Accept PRs where each boundary has an explicit schema version and a named
  owner responsible for reconciliation logic.

### V. Test the Transformation, Not the Plumbing

**Domain**: Software Design

**Rationale**: Tests that mock owned infrastructure give false confidence. Pure
transformation logic is cheap to test and pin behavior; boundaries deserve
integration coverage.

**Rule**: Unit tests MUST cover pure transformation logic only. Integration
tests MUST cover producer/consumer boundaries. Code the project owns MUST NOT
be mocked in tests; external systems the project does not own MUST be mocked or
faked. A bug fix MUST include a failing test that reproduces the bug before the
fix; a green CI without that failing test is not acceptable.

**How To Apply**:
- Reject PRs that fix a bug without a test that fails on the prior commit and
  passes on the fix.
- Reject PRs that mock the project's own database layer, HTTP client wrapper, or
  repository in a unit test labeled as integration coverage.
- Reject PRs where business logic tests only assert that a mock was called.
- Accept PRs with unit tests exercising input→output transformations and
  separate integration tests hitting real boundaries (or test containers).

### VI. Emit Structured Events, Derive Everything Else

**Domain**: Observability

**Rationale**: Logs, metrics, and traces are projections of the same underlying
fact. A single structured event primitive eliminates drift between observability
signals and preserves cardinality for diagnosis.

**Rule**: Logs, metrics, and traces MUST be derived from one primitive: the
structured event. High-cardinality fields (`user_id`, `request_id`, `tenant_id`,
`feature_flag_state`) MUST be present on every event emitted by new code—they
are required, not optional. Unstructured log lines (printf-style strings without
a schema) MUST NOT be added in new code.

**How To Apply**:
- Reject PRs that add `console.log`, `logger.info("message")`, or equivalent
  unstructured output without a structured event schema.
- Reject PRs that emit metrics or traces without a corresponding structured
  event carrying the same correlation identifiers.
- Reject PRs where `request_id`, `tenant_id`, or equivalent correlation fields
  are optional or omitted in new instrumentation.
- Accept PRs where every observability signal can be traced back to a single
  structured event definition with required cardinality fields.

### VII. Recovery Over Prevention

**Domain**: DevOps

**Rationale**: All prevention mechanisms fail eventually. Revertibility and
tested rollback paths limit blast radius more reliably than pre-deploy
checklists alone.

**Rule**: Every change MUST be revertible in under five minutes without a code
change. Risky code paths MUST be gated behind feature flags. Database migrations
MUST follow expand-then-contract. Rollback MUST be tested as part of the deploy
process—not assumed.

**How To Apply**:
- Reject PRs with breaking schema migrations that cannot be rolled back without
  redeploying code.
- Reject PRs that deploy irreversible data transformations without an
  expand-then-contract plan documented in the PR.
- Reject PRs that introduce risky behavior without a feature flag or kill switch.
- Reject deploy runbooks that do not include a tested rollback step with a
  measured time-to-revert under five minutes.
- Accept PRs with feature flags, backward-compatible migrations, and a documented
  rollback procedure validated in staging or production.

### VIII. Attention Is Finite

**Domain**: Observability

**Rationale**: Unactionable alerts and unused dashboards consume on-call attention
and desensitize responders. Every signal must earn its place by correlating to
user-visible symptoms.

**Rule**: Every alert MUST correspond to a user-visible symptom and a linked
runbook. Dashboards MUST be saved queries with a stated investigative purpose—
not decorative charts. Signals (alerts, dashboards, SLOs) that have not produced
a useful page or investigation in 90 days MUST be deleted.

**How To Apply**:
- Reject PRs that add alerts without a runbook URL and a named user-visible
  symptom in the alert description.
- Reject PRs that add dashboards without documenting the question each panel
  answers.
- Flag any alert that fired in the last 90 days without a corresponding
  runbook action as a constitution violation requiring remediation.
- Accept PRs that include runbook links, symptom descriptions, and a plan to
  retire unused signals.

### IX. Value Is Realized at the User, Not at Merge

**Domain**: DevOps

**Rationale**: Merged code that is not deployed, instrumented, and revertible
delivers zero user value and accumulates integration risk.

**Rule**: A pull request is NOT done until the change is in the hands of users,
observable in production (or the target environment), and revertible. "Shipped"
means deployed, instrumented, and monitored—not merged to main.

**How To Apply**:
- Reject closing a feature issue or marking a PR "done" when the change is only
  merged but not deployed.
- Reject PRs that add user-facing behavior without corresponding structured
  events (per Principle VI) in the same release.
- Reject releases without a post-deploy verification step (smoke test, canary
  check, or metric confirmation).
- Accept PRs only when the author documents deploy status, instrumentation
  added, and rollback path in the PR description or linked deploy record.

### X. Commands Are Discoverable; Local Dev Matches CI

**Domain**: DevOps

**Rationale**: Undocumented commands and CI-only steps create "works on my
machine" gaps and raise onboarding cost. A single command surface makes behavior
reproducible and auditable.

**Rule**: Every repeatable action (build, test, lint, migrate, deploy, seed)
MUST be a single named command listed in one canonical location. The command a
developer runs locally MUST be identical to the command CI runs—same entrypoint,
same arguments, no hidden environment. CI-only shell steps, undocumented Makefile
targets, and ad-hoc scripts MUST NOT exist. A new contributor MUST be able to
list every available command in 30 seconds from the canonical listing.

**How To Apply**:
- Reject PRs that add CI steps not invokable via a named command in the
  canonical command list (e.g., `package.json` scripts, `Makefile`, or
  `CONTRIBUTING.md` command table).
- Reject PRs where local development requires steps not documented in the
  canonical command list.
- Reject PRs that add Makefile targets or scripts without registering them in
  the single command index.
- Accept PRs where `ci/test`, `ci/lint`, `ci/build`, etc. are thin wrappers
  around the exact same commands documented for local use.

## Domain Coverage

| Domain | Principles |
| --- | --- |
| Distributed Systems | I. Do Not Distribute by Default |
| Software Design | II. Optimize for Deletion, Not Extension; III. Make Dependencies Explicit; V. Test the Transformation, Not the Plumbing |
| Data Engineering | IV. Contract at the Boundary, Not in the Middle |
| DevOps | VII. Recovery Over Prevention; IX. Value Is Realized at the User, Not at Merge; X. Commands Are Discoverable; Local Dev Matches CI |
| Observability | VI. Emit Structured Events, Derive Everything Else; VIII. Attention Is Finite |

## Review & Compliance

All pull requests MUST be reviewed against the ten Core Principles. Reviewers MUST
cite the principle number (e.g., "violates Principle III") when requesting
changes—interpretation MUST NOT be required to evaluate compliance.

Compliance checklist for every PR:
1. Distribution justified? (Principle I)
2. Module deletable in one day? No speculative abstraction? (Principle II)
3. Dependencies explicit in signature or file header? (Principle III)
4. Boundary schemas versioned? Reconciliation at boundary? (Principle IV)
5. Bug fix includes failing test? No mocking of owned code? (Principle V)
6. Structured events with required cardinality fields? (Principle VI)
7. Revertible in <5 min? Feature flags for risky paths? (Principle VII)
8. Alerts have runbook and user symptom? (Principle VIII)
9. Deployed, instrumented, monitored—not just merged? (Principle IX)
10. Commands registered and identical in local and CI? (Principle X)

## Governance

This constitution supersedes ad-hoc engineering conventions for the Cursor-test
project. Amendments require:
1. A pull request modifying `.specify/memory/constitution.md`.
2. A version bump per semantic versioning (see below).
3. A Sync Impact Report prepended as an HTML comment documenting the change.
4. At least one reviewer explicitly confirming no principle was weakened without
   documented rationale.

**Versioning policy**:
- MAJOR: Backward-incompatible removal or redefinition of a principle.
- MINOR: New principle added or material expansion of guidance.
- PATCH: Clarifications, wording fixes, non-semantic refinements.

**Compliance review**: Constitution compliance is evaluated at PR review time.
Principles marked with MUST are non-negotiable unless a formal amendment is
ratified.

**Version**: 1.0.0 | **Ratified**: 2026-08-12 | **Last Amended**: 2026-08-12
