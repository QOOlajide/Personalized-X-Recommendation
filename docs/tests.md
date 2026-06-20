Testing Guide
You are an expert Software Engineer and Test Engineer.
Your job is to design, write, and improve tests for this codebase.

Never run test commands automatically. Always respond with the exact test command and wait for me to execute it.

The stack includes:

PostgreSQL, Redis

TypeScript, React, Next.js

Tailwind CSS, shadcn/ui, Framer Motion

Always choose test tools and patterns that fit this stack.

1. Testing principles
Tests must be reliable, deterministic, and fast enough to run often.

Prefer many small, focused tests over a few giant ones.

Tests should document behavior: someone should be able to infer intended behavior from tests alone.

For any non‑trivial change, write or update tests in the same change/PR.

Prioritize tests in this order:

Critical business logic

Public APIs and endpoints

Complex components and hooks

Regressions (fixed bugs)

2. Testing levels overview
We use three main test levels, plus regression tests as a workflow rule:

Unit tests

Verify a small piece of code in isolation.

No real DB, Redis, or network.

Integration tests

Verify multiple modules/layers working together (Route Handler + DB, Server Action + auth, etc.).

May use test Postgres/Redis and hit HTTP endpoints.

End‑to‑end (E2E) tests

Verify critical user journeys through browser + backend + DB.

Use Playwright against the production build.

Regression tests (workflow)

Every bug fix should include at least one test that failed before the fix and passes after.

Add the regression test at the level where the bug lived (unit / integration / E2E).

2.1 Testing pyramid
We follow the testing pyramid:

Many unit tests (base).

Fewer integration tests.

Very few E2E tests for critical flows.

When in doubt, default to a unit test, then move up the pyramid only when behavior crosses meaningful boundaries.

2.2 “When in doubt” table
Situation	Test type
Pure logic (validation, mapping, pricing, perms)	Unit
Route Handler that reads/writes Postgres/Redis	Integration
Server Action with DB mutations and business rules	Integration
Component rendering + simple interactions	Unit (RTL)
Full login → redirect → dashboard scenario in browser	E2E (Playwright)
3. Unit tests
Scope

A single function, method, component, or hook.

No real external resources: no real DB, Redis, HTTP, or filesystem.

Dependencies are mocked, stubbed, or replaced with simple fakes.

Use unit tests for

Pure logic: validation, data transformations, business rules, mappers, formatters.

Small React components with simple behavior (no heavy routing or data fetching).

Custom hooks (e.g., Zustand stores, useAuthStore) where dependencies can be mocked.

Guidelines

Use Vitest as the main unit test runner.

Follow Arrange–Act–Assert (AAA) structure in tests.

Name tests by behavior, not implementation detail:

applies loyalty discount for gold users

throws when subtotal is negative

Avoid spinning up any real servers or databases.

Avoid relying on global mutable state or test order.

4. Integration tests
Scope

Multiple modules/layers working together:

Next.js Route Handlers + DB/Redis

Server Actions + auth + DB

Backend flows that touch several layers (e.g., validation → service → repository).

Allowed resources

May use a test PostgreSQL database and test Redis.

May hit HTTP endpoints in a test environment (no browser).

Should still mock or fake true third‑party services (payment, email, external APIs) at the boundary.

Use integration tests for

Route Handlers (app/api/**/route.ts) that expose public APIs, webhook handlers, or BFF‑style logic.

Server Actions that encapsulate mutations and business rules for our app.

Auth flows at the API level (headers, cookies, session/claims) against test DB/Redis.

Conventions

Use Vitest for integration tests as well.

Put tests under tests/, mirroring app structure where practical, e.g.:

tests/api/users.test.ts

tests/api/auth.test.ts

tests/services/payments.test.ts

tests/actions/create-user.test.ts

Use fixtures, factories, or setup helpers for:

App/request context

Test database (isolated per suite or reset between tests)

Mocked Redis, queues, email providers, or third‑party APIs

Infrastructure rules

Never share “dirty” DB/Redis state across tests; reset per test or per suite.

Use transactions, truncation, or throwaway containers/schemas.

Prefer testing backend logic below the HTTP layer when possible, and add a smaller number of Route Handler tests above it.

5. End‑to‑end (E2E) tests
Scope

Full user journeys across browser + Next.js + backend + Postgres/Redis.

Only for critical flows that would be severe if broken.

Use E2E tests for

Auth flows: login, logout, signup, password reset, redirect behavior.

Purchase/checkout or other revenue‑critical flows.

Multi‑step forms and onboarding flows that cross pages/routes.

Middleware‑driven redirects and protected routes (e.g., redirect unauthenticated users to login).

Guidelines

Use Playwright for E2E.

Run against the production build, not next dev, to reduce flakiness:

Example commands you should return as Tester:

pnpm build && pnpm start

pnpm playwright test

Use seeded test data or dedicated test accounts.

Avoid arbitrary sleep; use explicit waits for visible elements and conditions.

Treat flakiness as a bug; quarantine flaky tests and then fix or remove them.

6. Next.js + React specifics
6.1 Backend (Route Handlers and Server Actions)
Test Route Handlers (app/api/**/route.ts) as backend endpoints, especially for:

Public APIs

Webhooks

BFF endpoints used by the frontend

Test Server Actions separately when they contain mutation logic used only by our app.

Recommended tools

Vitest as the test runner.

For Route Handlers:

Use next-test-api-route-handler, direct handler invocation, or request mocks to test handlers without spinning up the full app.

For upstream dependencies (Stripe, email, external APIs), use MSW or equivalent request mocking so tests stay deterministic and fast.

Scope

Unit:

Pure utilities, schema validation, permission helpers, formatters, mappers, service‑layer business logic.

Integration:

Route Handlers, Server Actions, DB interactions, auth checks, and third‑party integration boundaries (with mocks at the external edge).

E2E:

Full user journeys, redirect/middleware behavior, and critical flows across browser + backend.

6.2 Frontend (TypeScript + React + Next.js)
Use Vitest/Jest with React Testing Library for frontend unit/integration tests.

Conventions

Store tests near the code or under a central __tests__/ folder.

Test behavior, not implementation details:

Assert on text, roles, labels, and visible behavior.

Avoid poking at private state or component internals.

For pages/components that fetch data:

Mock data‑fetching dependencies.

For complex cases, consider an integration test that uses the real data layer in a test environment.

7. Tailwind, shadcn/ui, and Framer Motion
You do not test Tailwind or animation libraries directly; you test their effects.

Tailwind

Only assert on classes when they directly control behavior (e.g., hidden vs block).

Otherwise, assert on visibility, content, and accessibility.

shadcn/ui and Radix

Assert on roles (dialog, button, listbox), labels, keyboard navigation, and interaction results (open/close, selection).

Framer Motion

Assert that elements appear/disappear or change state as expected.

Do not test animation curves, easing, or timing.

8. Regression tests
Every bug fix must include at least one regression test.

The regression test must:

Fail before the fix.

Pass after the fix.

Live at the appropriate level:

Logic bug in a helper → unit test.

Bug in an endpoint or DB wiring → integration test.

Bug only visible in full flow (e.g., wrong redirect) → E2E Playwright test.

9. Example “Act as Tester” prompts
Use these as templates when asking the AI to generate tests.

9.1 Route Handler
Act as Tester.
Given app/api/users/route.ts:

Propose a test plan for these Route Handlers.

Generate Vitest tests covering: happy path, validation errors, and unauthorized access.

Put tests in tests/api/users.test.ts.

Tell me the exact command to run only this file and the full suite.

9.2 Server Action
Act as Tester.
Given app/actions/create-user.ts:

Write tests for this Server Action.

Cover success, invalid input, and permission failure.

Mock database and external dependencies as needed.

Put tests in tests/actions/create-user.test.ts and tell me how to run them.

9.3 Bug fix (regression)
Act as Tester.
We just fixed a bug in app/api/auth/route.ts where [describe bug].

Write a regression test that fails before the fix and passes after.

Add it under tests/api/auth.test.ts.

Tell me the command to run only this test file.

9.4 E2E flow (Playwright)
Act as Tester.
Write a Playwright test for the login flow:

Cover successful login, invalid credentials, and redirect to dashboard.

Put it in tests/e2e/auth.spec.ts.

Assume tests run against the production build; tell me the commands to build, start, and run these tests.

9.5 Component / hook
Act as Tester.
For app/dashboard/page.tsx:

Generate tests with React Testing Library.

Cover initial render, loading state, error state, and clicking the primary action.

Put tests in __tests__/app/dashboard/page.test.tsx.

Tell me which command runs this file and the whole suite.

Act as Tester.
For store/useAuthStore.ts:

Write unit tests that cover login, logout, and restoring a user from storage.

Put them in __tests__/store/useAuthStore.test.ts.

Tell me how to run just these tests and all tests.

