# Code Review — vibe-site

**Date:** 2026-06-18  
**Scope:** Full codebase (`app/`, `lib/`, config files, `.env`)  
**Effort:** High (8 finder angles × 6 candidates, verified)

---

## Summary

The project is a well-structured Next.js 16 portfolio site with a good TypeScript setup, clean component architecture, and solid SEO plumbing. The main concerns are concentrated in `app/api/chat/route.ts`: a critical credential-hygiene issue, three security gaps that make the origin/body-size guards bypassable, and several medium/low issues with rate-limit robustness and shared constants. All findings are listed below with concrete remedial actions. **No source files were modified.**

---

## Findings

### CRITICAL

---

### F1 — Live API key stored in plaintext `.env` file

**File:** `.env:1`

```
OPENROUTER_API_KEY="[REDACTED]"
```

A real, active OpenRouter API key is stored in a plaintext file on disk. While `.gitignore` correctly excludes `.env` from the repository, the key can leak through:

- Folder sync tools (Dropbox, iCloud, OneDrive, Google Drive)
- IDE workspace-state uploads or diagnostic dumps
- Accidental paste or screenshot in support/chat contexts
- Local archive backups that include the project directory

**Remedial actions:**

1. **Rotate the key immediately** via the OpenRouter dashboard — treat this key as compromised from the moment it was written to disk.
2. Store the new key **only** in the deployment platform's secret manager (Vercel: Project Settings → Environment Variables → "Production").
3. Remove the value from `.env` and replace it with a placeholder comment:
   ```
   # Set in Vercel Environment Variables (never commit the real key)
   OPENROUTER_API_KEY=
   ```
4. Optionally add a pre-commit hook (`detect-secrets`, `gitleaks`, or a simple `grep` hook) to catch future credential leakage.

---

### HIGH

---

### F2 — IP spoofing fully bypasses rate limiting via X-Forwarded-For

**File:** `app/api/chat/route.ts:47`

```typescript
function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
```

`X-Forwarded-For` is a client-controlled header. The code takes `split(",")[0]` — the *leftmost* entry — which is the value the attacker appended before the request hit any proxy. On Vercel and most CDNs, the proxy *appends* the real IP to the header rather than replacing it, so an attacker who sends `X-Forwarded-For: 1.2.3.4` will have `1.2.3.4` as their rate-limit key.

**Failure scenario:** An attacker cycles `X-Forwarded-For` values on each burst (`1.2.3.4`, `1.2.3.5`, ...). Every request lands in a fresh bucket and passes the 12-requests-per-minute cap. Combined with F3 (no-origin bypass), the attacker can drain the entire OpenRouter quota — every forwarded call costs real money.

**Remedial actions:**

- On Vercel, use `x-real-ip` as the primary source (Vercel sets this from the TLS connection, not from client headers). Place it before `x-forwarded-for` in the fallback chain:
  ```typescript
  function getClientIp(request: Request) {
    return (
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
      "unknown"
    );
  }
  ```
- If behind Cloudflare, prefer `cf-connecting-ip`.
- Never trust the leftmost `x-forwarded-for` value; it is fully attacker-controlled.

---

### F3 — Origin check bypassed by every non-browser client

**File:** `app/api/chat/route.ts:54`

```typescript
function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;   // ← allows all requests that omit Origin
  }
  // ...
}
```

The `Origin` header is sent only by browsers under CORS rules. `curl`, Postman, Python `requests`, Node.js `fetch`, and any server-side script never include it by default. Every such request silently passes the origin check, meaning the "only my domain can use this endpoint" guarantee does not hold in practice.

**Failure scenario:** `curl -X POST https://yoursite.com/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"hello"}]}'` (no `Origin` header). The guard returns `true`, the request is rate-limited by IP (bypassable via F2), and the call is forwarded to OpenRouter. The endpoint is fully open to scripted abuse.

**Remedial actions:**

- Add a **shared secret header** (e.g., `X-Chat-Token`) that the Next.js page embeds at build time and the API validates. A public environment variable (`NEXT_PUBLIC_CHAT_TOKEN`) set to a random string provides meaningful bot friction without complex auth:
  ```typescript
  const expectedToken = process.env.CHAT_TOKEN;
  if (!expectedToken || request.headers.get("x-chat-token") !== expectedToken) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  ```
- The Origin check can remain as an additional layer but should not be the sole control, since browser-only semantics were never designed for server-side authentication.

---

### F4 — Body-size guard bypassed on chunked/streaming requests

**File:** `app/api/chat/route.ts:75`

```typescript
function checkBodySize(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return null;   // ← no check when Content-Length is absent
  }
  // ...
}
```

HTTP/1.1 chunked transfer encoding (`Transfer-Encoding: chunked`) and HTTP/2 DATA frames do not require a `Content-Length` header. Any client that omits or strips this header bypasses the 16 KB guard entirely. The runtime buffers the full body before `request.json()` is called regardless of its size.

**Failure scenario:** An attacker sends `POST /api/chat` with `Transfer-Encoding: chunked` and a 50 MB JSON body. `checkBodySize` returns `null` immediately. The body is fully read into memory. `normalizeMessages` will eventually truncate the parsed messages to 12, but a gigantic allocation already occurred, potentially causing the serverless function to OOM or time out.

**Remedial actions:**

Read the body as a bounded stream before calling `.json()`:

```typescript
async function readBodyBounded(request: Request, maxBytes: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;

  let bytes = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) return null;   // signal oversize
    chunks.push(value);
  }

  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}
```

Return a `413` response if `readBodyBounded` returns `null`.

---

### MEDIUM

---

### F5 — Validation 400 errors never increment the failure counter

**File:** `app/api/chat/route.ts:194` (also lines 201, 210)

`recordFailure(request)` is only called when the *upstream OpenRouter request* fails (lines 246 and 277). The three validation paths that return `400` after the rate-limit check passes — bad JSON parse, array length exceeded, and no valid final user message — do not call `recordFailure`. This means `MAX_FAILURES_PER_WINDOW = 5` can never be triggered through malformed input.

**Failure scenario:** An attacker sends requests with all messages having `role: "assistant"`. `isChatMessage` filters every message out; `normalizeMessages` returns `[]`; the handler returns `400` — but `bucket.failures` stays at zero. The attacker can repeat this indefinitely for every window at the full `MAX_REQUESTS_PER_WINDOW` (12) rate without ever triggering the failure cap.

**Remedial actions:**

Call `recordFailure` on all 400 paths that follow the rate-limit check:

```typescript
// After normalizeMessages:
if (!messages.length || messages[messages.length - 1]?.role !== "user") {
  recordFailure(request);   // add this
  return NextResponse.json({ error: "A final user message is required." }, { status: 400 });
}
```

Apply the same to the JSON-parse `catch` block and the `rawMessages.length > MAX_MESSAGES` guard.

---

### F6 — Scheme-less `SITE_URL` silently falls back to localhost in production

**File:** `lib/site-config.ts:12`

```typescript
export function getSiteUrl() {
  const rawUrl =
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL);

  try {
    return new URL(rawUrl).origin;
  } catch {
    return DEFAULT_SITE_URL;   // "http://127.0.0.1:3000"
  }
}
```

`new URL("myportfolio.com")` (bare hostname, no scheme) throws `TypeError: Failed to construct URL`. The silent `catch` returns `DEFAULT_SITE_URL = "http://127.0.0.1:3000"`. In production, `isAllowedOrigin` would then only allow `http://127.0.0.1:3000`, causing every legitimate browser request from the real domain to receive `403 Chat origin is not allowed`.

**Failure scenario:** A developer or operator sets `SITE_URL=serhiidrachuk.dev` (without `https://`) in Vercel environment variables. The chat endpoint is completely broken in production with no helpful error message.

**Remedial actions:**

Normalise the value before constructing the URL:

```typescript
export function getSiteUrl() {
  const raw =
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL);

  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
```

---

### F7 — `rateLimitBuckets` Map grows without bound and is not shared across serverless instances

**File:** `app/api/chat/route.ts:31`

Two related issues with the in-process rate limiter:

**Memory leak:** Expired buckets (older than `RATE_LIMIT_WINDOW_MS = 60s`) are never deleted. Every unique IP that ever hits the endpoint adds a permanent `Map` entry. In a long-lived Node.js process serving diverse traffic, this accumulates indefinitely.

**Multi-instance bypass:** On Vercel (and any horizontally-scaled platform), each function instance has its own `globalThis`. The `__portfolioChatRateLimit` pattern does not share state across instances. With N warm instances, the effective rate limit is `MAX_REQUESTS_PER_WINDOW × N`.

**Remedial actions:**

*Simple fix (single-instance):* Add an eviction sweep in `checkRateLimit` — when creating or checking a bucket, delete all entries whose `resetAt <= now`:

```typescript
// Evict expired entries on each check (amortised cost)
if (rateLimitBuckets.size > 500) {
  for (const [ip, b] of rateLimitBuckets) {
    if (b.resetAt <= now) rateLimitBuckets.delete(ip);
  }
}
```

*Robust fix (multi-instance):* Move rate-limit state to an edge KV store — Vercel KV, Upstash Redis, or a Cloudflare KV binding. This survives cold starts and is accurate across all instances.

---

### LOW

---

### F8 — Index-based message `key` props shift when the visible window slides

**File:** `app/components/DigitalTwinChat.tsx:161`

```tsx
key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
```

`index` is the position within `visibleMessages.slice(-8)`, not within the full `messages` array. When a new message is appended and the slice window advances (e.g. was `messages[0..7]`, now `messages[1..8]`), every key changes. React interprets this as every node having changed identity, discards and remounts all 8 nodes instead of appending one.

**Remedial action:** Assign stable monotonically-increasing IDs when messages are created:

```typescript
type Message = { id: number; role: "user" | "assistant"; content: string };
let nextId = 0;
// When creating: { id: nextId++, role, content }
// In JSX: key={message.id}
```

---

### F9 — `MAX_CLIENT_MESSAGES` is a manual copy of `MAX_MESSAGES`

**Files:** `app/components/DigitalTwinChat.tsx:22` and `app/api/chat/route.ts:9`

```typescript
// route.ts
const MAX_MESSAGES = 12;

// DigitalTwinChat.tsx
const MAX_CLIENT_MESSAGES = 12;
```

These two constants must stay in sync manually. If a developer bumps the server-side limit without updating the client, the client will either send more messages than the server accepts (silent truncation) or too few (lost context).

**Remedial action:** Export from a shared module:

```typescript
// lib/chat-config.ts
export const MAX_CHAT_MESSAGES = 12;
```

Import in both `route.ts` and `DigitalTwinChat.tsx`.

---

### F10 — `Number.isFinite` guards in the fetch body are unreachable dead code

**File:** `app/api/chat/route.ts:231`

```typescript
temperature: Number.isFinite(config.temperature) ? config.temperature : 0.35,
max_tokens: Number.isFinite(config.maxTokens) ? config.maxTokens : 520,
```

`getConfig()` returns `Number(process.env.OPENROUTER_TEMPERATURE || 0.35)`. When the env var is absent, `Number(0.35) = 0.35` — always finite. When the env var is `""`, `Number("") = 0` — also finite. The inline fallback defaults are unreachable under any real configuration.

**Remedial action:** Remove the guards and rely on `getConfig()`:

```typescript
temperature: config.temperature,
max_tokens: config.maxTokens,
```

If NaN-safety is desired, enforce it inside `getConfig()` where the semantics are explicit.

---

## Summary Table

| # | Severity | File | Issue |
|---|----------|------|-------|
| F1 | CRITICAL | `.env:1` | Live API key in plaintext file — rotate immediately |
| F2 | HIGH | `route.ts:47` | X-Forwarded-For spoofing bypasses rate limiting |
| F3 | HIGH | `route.ts:54` | Origin check bypassed by all non-browser clients |
| F4 | HIGH | `route.ts:75` | Body-size guard skipped when Content-Length is absent |
| F5 | MEDIUM | `route.ts:194` | Validation 400s don't increment failure counter |
| F6 | MEDIUM | `site-config.ts:12` | Scheme-less SITE_URL silently falls back to localhost |
| F7 | MEDIUM | `route.ts:31` | Rate-limit Map grows unboundedly; not shared across instances |
| F8 | LOW | `DigitalTwinChat.tsx:161` | Index-based keys cause full remount when window slides |
| F9 | LOW | `DigitalTwinChat.tsx:22` | MAX_CLIENT_MESSAGES manually duplicated from MAX_MESSAGES |
| F10 | LOW | `route.ts:231` | Number.isFinite guards are unreachable dead code |

---

## What Is Working Well

- The API route correctly strips `role: "assistant"` messages from the client payload before forwarding to OpenRouter — the LLM only sees user turns plus the server-injected system prompt. This prevents fabricated assistant history from reaching the model.
- The `AbortController` 30-second timeout with `clearTimeout` in `finally` is correctly implemented and avoids timer leaks.
- Error responses to the client never expose upstream provider error messages or status details — all mapped to safe user-facing strings.
- The `careerProfile` system prompt is clear, precise, and includes sensible constraints on what the digital twin may claim.
- SEO plumbing is solid: `metadataBase`, `sitemap.ts`, `robots.ts`, and per-page `alternates.canonical` are all wired up correctly.
- `react-markdown` link renderer adds `rel="noreferrer"`, correctly preventing opener leakage on model-generated links.
- The `DigitalTwinChat` error path correctly rolls back the optimistic user message and restores the input on failure.
- `reactStrictMode: true` in `next.config.mjs`, and a Vitest test suite already covering key API behaviors (origin rejection, rate limiting, oversized requests, provider error mapping) — good baseline.

---

## Recommended Remediation Order

1. **Rotate the OpenRouter API key** (F1) — do this before anything else.
2. **Fix the body-size guard** (F4) to read the stream with a byte cap before parsing.
3. **Replace Origin-only auth** (F3) with a shared secret header.
4. **Fix IP resolution** (F2) to use `x-real-ip` as primary source on Vercel.
5. **Call `recordFailure` on validation 400 paths** (F5).
6. **Normalise scheme in `getSiteUrl`** (F6) to avoid silent localhost fallback.
7. **Add Map eviction to the rate limiter** (F7), or migrate to a shared KV store.
8. **Assign stable IDs to messages** (F8) and **extract the shared constant** (F9).
9. **Remove dead guards** (F10).
