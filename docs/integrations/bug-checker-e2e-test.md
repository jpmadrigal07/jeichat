# Bug checker bot — local smoke test

Intentional bug: sign-in page heading is **Welcom back** (missing **e**). Marked `CHECKER-SMOKE` in `apps/web/components/auth-panel.tsx`.

**Before testing:** `bun dev` (web `http://localhost:3000`, API `3001`). Run **jeichat-bug-checker-bot** with `JEICHAT_API_URL=http://localhost:3001`.

Quick check: open http://localhost:3000/login — heading should show the typo.

---

## Ticket description (paste under title — Edit ticket)

Use the bot’s exact field names: **Steps**, **Expected**, **Actual**, **Branch** (not “What’s wrong”).

```
Website: http://localhost:3000
Page: /login

Steps:
1. Open http://localhost:3000/login (sign out first if you are already logged in).
2. Look at the large title on the sign-in card.

Expected:
The heading reads "Welcome back".

Actual:
The heading reads "Welcom back" (missing the second e in Welcome).

Branch: develop
```

Replace `develop` with your real git base branch if different.

Then add the **Bug** label. Wait ~15s; the bot should run Cursor and reply with `Verdict: CONFIRM` or `Verdict: REFUTE`.

**Retry:** `@Bug Checker retry`

---

## After testing

Revert the `CHECKER-SMOKE` line in `auth-panel.tsx` (`Welcom back` → `Welcome back`).
