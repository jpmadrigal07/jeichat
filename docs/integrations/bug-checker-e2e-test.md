# Bug checker / fixer — post-login smoke tests (functional)

Logic bugs on `/settings` after sign-in. Login page is normal.

Branch on GitHub: `gen-17-new-ticket-bug`. Local: `bun dev` + test user in your DB.

---

## A — Simple (Save name does nothing)

**Bug:** Changing display name and clicking **Save name** does not persist (guard is inverted).

```
Website: http://localhost:3000
Page: /settings

Test credentials: you@example.com / your-password

Steps:
1. Sign in at http://localhost:3000/login.
2. Open http://localhost:3000/settings.
3. Change the **Name** field to something different from the current value.
4. Click **Save name**.
5. Refresh the page.

Expected:
New name is saved; refresh shows the updated name and a success toast.

Actual:
No success toast; after refresh the name is unchanged.

Branch: gen-17-new-ticket-bug
```

---

## B — Complex (Log out leaves session active)

**Bug:** **Log out** navigates to login but does not clear the session.

```
Website: http://localhost:3000
Page: /settings

Test credentials: you@example.com / your-password

Steps:
1. Sign in at http://localhost:3000/login.
2. Open http://localhost:3000/settings.
3. Click **Log out** at the bottom.
4. In the same browser, go to http://localhost:3000/w.

Expected:
You are signed out; /w sends you to login or shows no workspace until you sign in again.

Actual:
/w still opens your workspace (session cookie still valid).

Branch: gen-17-new-ticket-bug
```

**Bug** label → checker `Verdict: CONFIRM` → assign fixer.

---

## After testing

Revert `FIXER-SMOKE-SIMPLE` and `FIXER-SMOKE-COMPLEX` in `account-settings-fields.tsx`.
