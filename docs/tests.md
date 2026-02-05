# Testing Guide

<!-- How to run and debug tests -->

# Testing Workflow and When to Ask for Tests

You are an expert Software Engineer and Test Engineer.  
Your job is to design, write, and improve tests for this codebase.

The stack includes:

- Python, FastAPI
- PostgreSQL, Redis
- TypeScript, React, Next.js (App Router)
- Tailwind CSS, shadcn/ui, Framer Motion

Always choose test tools and patterns that fit this stack.

---

## 1. Testing Principles

- Tests must be reliable, deterministic, and fast enough to run often.
- Prefer many small, focused tests over a few giant ones.
- Tests should document behavior: someone should be able to infer intended behavior from the tests alone.
- For any non-trivial change, write or update tests in the same change/PR.
- Prioritize tests in this order:
  1. Critical business logic
  2. Public APIs and endpoints
  3. Complex components and hooks
  4. Regressions (fixed bugs)

---

## 2. Test Types and When to Use Them

### Unit Tests

- Scope: a single function, method, component, or hook.
- No real external resources (no real DB, network, or Redis).
- Use for:
  - Pure logic (validation, transformations, business rules)
  - Small React components with simple behavior
  - Utility functions and helpers

### Integration Tests

- Scope: multiple modules or layers working together.
- May use a test DB / test Redis or hit HTTP endpoints in a test environment.
- Use for:
  - FastAPI endpoints that touch DB/Redis
  - Next.js pages that integrate with data fetching/auth
  - Backend flows that go through several layers

### Regression Tests

- Scope: any bug that was found and fixed.
- Always add at least one test that failed before the fix and passes after.
- Keep these tests small and clearly tied to the bug scenario.

---

## 3. Python + FastAPI Testing

Use `pytest` as the main test runner.

### Conventions

- Put tests under `tests/`, mirroring app structure:
  - `tests/api/test_users.py`
  - `tests/services/test_payments.py`
- Use `fastapi.testclient.TestClient` (sync) or `httpx.AsyncClient` (async) to test endpoints.
- Use fixtures for:
  - App instance
  - Test database (migrations or clean schema)
  - Test Redis or an in-memory substitute

### Example Tester Prompts

After implementing or changing an endpoint:

> Act as Tester and:
> - Propose a test plan for the endpoints in `app/api/routes/users.py`.
> - Generate pytest tests using FastAPI’s TestClient.
> - Cover happy path, validation errors, and unauthorized access.
> - Put tests in `tests/api/test_users.py` and tell me the command to run them.

For a bug fix:

> Act as Tester.
> - Write a regression test for the bug we just fixed in `app/api/routes/auth.py`.
> - The test must fail before the fix and pass after.
> - Add it under `tests/api/test_auth.py` and tell me how to run it.

---

## 4. TypeScript + React + Next.js Testing

Use Jest or Vitest with React Testing Library for frontend tests.

### Conventions

- Store tests near code or under a central `__tests__/` folder.
- Test **behavior**, not implementation details:
  - Assert on text, roles, and visible behavior.
  - Avoid poking at private state or implementation details.
- For components using shadcn/ui, Tailwind, or Framer Motion:
  - Assert that the right things appear, disappear, or respond to interaction.
  - Do not over-test library internals.

### Example Tester Prompts

After creating or changing a page/component:

> Act as Tester and:
> - Generate tests for `app/dashboard/page.tsx` using React Testing Library.
> - Cover: initial render, loading state, error state, and clicking the primary action.
> - Put tests in `__tests__/app/dashboard/page.test.tsx`.
> - Tell me which command to run the tests.

For a Zustand store or custom hook:

> Act as Tester.
> - Write unit tests for `store/useAuthStore.ts` that cover login, logout, and restoring a user from storage.
> - Place them in `__tests__/store/useAuthStore.test.ts`.
> - Tell me how to run just this file and the whole suite.

---

## 5. Tailwind, shadcn/ui, and Framer Motion

You do not test Tailwind or animation libraries directly; you test their **effects**.

- Tailwind:
  - Only assert on classes when they directly control behavior (e.g., `hidden` vs `block`).
  - Otherwise, assert on layout/visibility outcomes and accessibility.
- shadcn/ui and Radix:
  - Assert on roles (dialog, button, listbox), labels, and interaction results (open/close, selection).
- Framer Motion:
  - Assert that elements appear/disappear or change state as expected.
  - Do not test animation curves or timing.

Example prompt:

> Act as Tester.
> - For `components/AnimatedModal.tsx`, write tests that:
>   - Verify the modal opens when the trigger is clicked.
>   - Verify it closes when overlay or close button is clicked.
>   - Verify focus returns to the trigger after closing.
> - Use React Testing Library and place tests under `__tests__/components/AnimatedModal.test.tsx`.

---

## 6. When Exactly to Ask for Tests

Use this as your default rule:

> After **any non-trivial change**, immediately ask the AI to act as Tester.

###
