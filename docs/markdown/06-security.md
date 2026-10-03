# Step 6 — Security

Rendering user-authored content is an XSS attack surface. The renderer must be safe by construction.

## Threat model

Inputs are messages from any authenticated workspace member. An attacker is another member of the workspace who can send any string. They cannot modify the renderer source. We must assume:

- They will try to smuggle `<script>` tags.
- They will try `javascript:` and `data:` URLs.
- They will try event-handler attributes (`onerror=`, `onclick=`).
- They will paste rich HTML from Word / Google Docs / web pages.
- They will craft Markdown that resolves to disallowed HTML (e.g. autolinked `javascript:` URLs).

## Pipeline guarantees

1. **No `dangerouslySetInnerHTML`** anywhere in the renderer. `react-markdown` renders React elements, not raw HTML strings.
2. **`rehype-sanitize` runs last** before the React tree is built. It walks the HAST and drops any disallowed node or attribute. We pass an explicit schema rather than relying on the default in case future plugins add nodes the default schema wouldn't recognize.
3. **URL filter** in the sanitization schema constrains `a[href]` to `http:`, `https:`, `mailto:`. Anything else becomes an inert text node.
4. **React-level link guard** in the `a` component override: even if a `javascript:` URL slips through, the component refuses to render it as an `href` and falls back to a plain `<span>`. Defense in depth.
5. **`target="_blank"` + `rel="noopener noreferrer nofollow"`** on every rendered link. `noopener` blocks `window.opener` access; `noreferrer` strips the Referer; `nofollow` keeps us out of SEO loops if messages ever leak into a public surface.
6. **No `img` tag** — image embeds via Markdown are disabled. This prevents tracking pixels, referrer leaks, mixed-content warnings, and bandwidth abuse. Real images come from the attachments pipeline, which already enforces auth and signed URLs.
7. **No raw HTML pass-through.** `react-markdown` ignores HTML by default unless `rehype-raw` is added — we do **not** add it. Anyone typing `<div>` sees `<div>` as text.

## Sanitization schema (concrete)

Start from `rehype-sanitize`'s `defaultSchema`, then:

- `tagNames` — remove `iframe`, `img`, `script`, `style`, `form`, `input`, `button`, `link`, `meta`, `video`, `audio`, `source`, `track`, `object`, `embed`.
- `attributes`
  - Global: remove `style`, every `on*` handler, `id` (avoid anchor-jacking).
  - `a`: allow `href`, `title` only. Strip `target` here; we set it in the component.
  - `code`, `pre`: allow `className` (for `language-xyz`).
  - `th`, `td`: allow `align`.
- `protocols.href` — `['http', 'https', 'mailto']`.
- `protocols.cite` — `['http', 'https']`.
- `clobberPrefix` — keep the default (`user-content-`) so user content can't collide with our DOM ids.

## Paste-from-Word safety

When users paste from a rich source into a `<textarea>`, the browser pastes plain text by default — the textarea has no `contenteditable` surface to receive HTML. So pasted Word/Doc rich content collapses to plain text on its way into the composer. This means the renderer never sees Word's bizarre `<o:p>` / `<v:shape>` HTML; it only ever processes Markdown. Confirm this in step 7's adversarial paste test.

## Link length and shape

The renderer is happy with arbitrarily long links because they live inside the message bubble's overflow box. No truncation required at the renderer layer.

## Rate limiting & abuse

Rendering is client-side and cheap; there is no server-side cost from a flood of Markdown. Existing message-send rate limits cover abuse at the source. No new limits required.

## Tests

Step 7 lists the adversarial inputs to verify in CI. The smallest acceptable set:

- `<script>alert(1)</script>` → rendered as literal text.
- `[x](javascript:alert(1))` → rendered as plain `[x]` text or stripped link with no `href`.
- `<a href="javascript:alert(1)">x</a>` → not parsed as HTML, shown literally.
- `<img src=x onerror=alert(1)>` → not parsed; shown literally.
- `[ok](data:text/html,...)` → href stripped or link inert.
- Mailto: `[me](mailto:foo@bar.com)` → still renders correctly.
