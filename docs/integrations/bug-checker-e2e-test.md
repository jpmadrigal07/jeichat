# Bug checker / fixer — local smoke tests

Push branch with bugs before cloud fixer runs. Local repro: `bun dev` → http://localhost:3000

Markers in code: `CHECKER-SMOKE` (simple), `FIXER-SMOKE-COMPLEX` (behavior).

---

## A — Simple (heading typo)

**Repro:** `/login` title says **Welcom back**.

```
Website: http://localhost:3000
Page: /login

Steps:
1. Open http://localhost:3000/login.
2. Read the card title.

Expected:
Title reads "Welcome back".

Actual:
Title reads "Welcom back".

Branch: develop
```

---

## B — Complex (broken Register link)

**Repro:** On `/login`, **Register** keeps you on login instead of `/sign-up`.

```
Website: http://localhost:3000
Page: /login

Steps:
1. Open http://localhost:3000/login.
2. At the bottom, click the "Register" link.

Expected:
You navigate to the sign-up page (URL contains /sign-up).

Actual:
URL stays on /login; sign-up form never appears.

Branch: develop
```

Use **Bug** label → checker **CONFIRM** → assign fixer → checker message `Verdict: CONFIRM` in thread (fixer gate).

**Retry:** `@Bug Checker retry` / `@Fixer bot retry` (your bot names).

---

## After testing

Revert `CHECKER-SMOKE` and `FIXER-SMOKE-COMPLEX` in `apps/web/components/auth-panel.tsx`.
