## Data sensitivity classification

**Personal and business-sensitive** — unchanged from 2.1/3.1's
classification of the underlying document/field data; this story does
not change what's stored, only who can read it. New to this story:
**credential data** — the `users` table stores a hashed API key per
user. The hash itself is not the secret (it's one-way), but it is
security-relevant data requiring the same never-logged, never-committed
handling as any other credential material. Consistent with proposal.md's
risk table (security/credential handling is this story's central
trigger, not an incidental one).

## Credential handling

**New credential type: user API keys.** Per design.md Decision 2: issued
as opaque, high-entropy random tokens (`secrets.token_urlsafe`); the raw
key is returned to the caller exactly once, at creation, and is never
stored in plaintext or logged anywhere — only its SHA-256 hash is
persisted (`users.api_key_hash`). No endpoint, log line, or error message
SHALL ever include a raw API key after issuance. The application's own
existing credential (`ANTHROPIC_API_KEY`) is unaffected by this story —
it remains an environment-variable-sourced service credential, not a
per-user one; this story does not change how it's handled.

## External write-back scope

Not applicable — this story has no external-system interaction. It adds
authentication and ownership scoping entirely within this system; no
data is sent to or received from any external service.

## Inheritance

Not a formal `depends_on` inheritance (proposal.md does not set one).
This story's data-sensitivity classification for document/field content
is carried forward from 2.1's original classification (same underlying
data, unchanged by this story) rather than re-derived; the credential-
handling classification above is new and specific to this story, since
no prior story in this epic issued a credential to anyone outside the
system.
