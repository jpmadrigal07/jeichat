# Bug checker / fixer — post-login smoke tests

Bugs live **after sign-in** (`/settings`). Login page is normal so bots can authenticate.

Push branch before cloud fixer runs. Local: `bun dev`.

Use a real test user in **Test credentials** (same DB as your local API).

---

## A — Simple (settings heading typo)

**Repro:** `/settings` main heading says **My Accont**.

```
Website: http://localhost:3000
Page: /settings

Test credentials: you@example.com / your-password

Steps:
1. Open http://localhost:3000/login and sign in with the test credentials.
2. Go to http://localhost:3000/settings (or open account settings from the app).
3. Read the page heading under the header.

Expected:
Heading reads "My Account".

Actual:
Heading reads "My Accont".

Branch: gen-17-new-ticket-bug
```

---

## B — Complex (Log out does not sign out)

**Repro:** **Log out** sends you to `/login` but the session is still active (refresh or open `/w` and you are still signed in).

```
Website: http://localhost:3000
Page: /settings

Test credentials: you@example.com / your-password

Steps:
1. Sign in at http://localhost:3000/login.
2. Open http://localhost:3000/settings.
3. Scroll down and click **Log out**.
4. On the login page, open http://localhost:3000/w in the same tab (or sign in again and note you were never fully signed out).

Expected:
After Log out, you are signed out and /w redirects to login or shows no workspace until you sign in again.

Actual:
After Log out, visiting /w still loads the workspace (session cookie still valid).

Branch: gen-17-new-ticket-bug
```

**Bug** label → checker → `Verdict: CONFIRM` → assign fixer.

---

## After testing

Revert `CHECKER-SMOKE` / `FIXER-SMOKE-COMPLEX` in `account-settings.tsx` and `account-settings-fields.tsx`.
