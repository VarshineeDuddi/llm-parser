## Context

See proposal.md - Why. Relevant current state (from the actual code):
every document/extraction endpoint in `backend/app/routers/documents.py`
and `backend/app/routers/query.py` is unauthenticated today — `POST
/documents/upload`, `GET /documents/{id}`, `GET /documents/{id}/
extraction`, `GET /documents/{id}/fields`, `GET /fields/{field_name}`,
`GET /document-types/{type}/documents`. `Document` has no owner concept.
`frontend/src/UploadPage.tsx` calls `uploadDocument` with no auth header.
No auth/crypto library is in `backend/pyproject.toml`'s dependencies
today — this is the first credential-issuing code in the project.

## Goals / Non-Goals

**Goals:**
- A minimal user identity (name + API key), issued once.
- Authentication required on every document/extraction endpoint.
- Single-document reads: not-found (not forbidden) for a document owned
  by someone else.
- Cross-document queries: scoped to the caller's own documents.
- Pre-existing (unowned) documents inaccessible to any regular user.
- The existing frontend upload flow keeps working, with a key attached.

**Non-Goals:**
- Password-based login, sessions, or any identity provider integration.
- Key rotation, revocation, or multiple keys per user.
- Roles, admin privileges, or any access tier beyond "owns a document or
  doesn't."
- Retrofitting Story 3.3's frontend (not yet implemented — see discuss.md).
- Any change to extraction, grounding, confidence, or storage logic —
  this story is purely about who can read/write what already exists.
- A UI for an admin to reassign or grant access to unowned legacy
  documents — explicitly not needed for the MVP; see Decision 4.

## Decisions

**1. Per-user ownership scoping (API-key identity + `owner_id` on
`Document`), not a single shared-secret gate.**
Resolved with the user before drafting (see proposal.md). A shared gate
would satisfy "not open to the internet" but not "scoped accordingly" —
the BRD's own language implies per-caller distinction, and the epic's
name itself ("Access Scoping," not "Access Gating") points the same way.

**2. API keys are opaque random tokens (`secrets.token_urlsafe`),
hashed with SHA-256 before storage; lookup compares the SHA-256 of the
provided key against stored hashes. No new dependency.**
- Alternative considered: a password-hashing library (e.g., bcrypt/
  passlib) as used for user passwords. Rejected — that class of library
  defends against low-entropy, human-chosen secrets (passwords) via
  deliberately slow hashing; an opaque, high-entropy random token has no
  such weakness to defend against, so a fast cryptographic hash
  (stdlib `hashlib.sha256`) is appropriate and avoids adding a
  dependency for this MVP's first credential-handling code.
- Alternative considered: store the raw key encrypted, not hashed
  (reversible). Rejected — nothing in this design ever needs to recover
  the raw key after issuance (Requirement: Raw key is never retrievable
  again); a one-way hash is strictly the more conservative choice, and
  matches the requirement's own wording.

**3. Authentication enforced via a single FastAPI dependency
(`get_current_user`) applied to every document/extraction route,
reading the `Authorization: Bearer <key>` header.**
- Alternative considered: per-router or per-endpoint ad hoc checks.
  Rejected — a single shared dependency is the only way to guarantee
  every current and future document/extraction endpoint is covered
  without relying on each new endpoint's author remembering to add a
  check; matches "retrofitting onto six already-shipped endpoints" risk
  from discuss.md by making omission structurally harder, not just a
  matter of diligence.

**4. Documents without a recorded owner (everything uploaded before this
story) are left with `owner_id = NULL` and are treated as
inaccessible to any regular user — not migrated to a system/legacy
owner, not made world-readable.**
- Alternative considered: assign all pre-existing documents to a
  synthetic "legacy" user, or to whichever user first asks. Rejected —
  fabricating an ownership relationship that never existed (no real user
  uploaded them under this identity system) is worse than the documents
  simply becoming inaccessible; nothing in the BRD asks for a data
  migration/reassignment tool, and this is Architect-gated precisely
  because decisions like this deserve explicit human sign-off rather
  than a convenient default.
- Consequence, stated plainly: every document from 1.1 through 3.2's
  development/testing becomes permanently inaccessible through the API
  once this ships, unless a human with direct database access decides
  otherwise later. This is flagged, not hidden in a migration script's
  fine print.

**5. Not-found (not 403 Forbidden) for a document owned by someone else,
uniformly across single-document reads.**
Consistent with common security practice (don't confirm another user's
resource exists) and directly extends 3.2's own existing "not found for
a nonexistent document" scenario rather than introducing a new response
shape.
- Alternative considered: 403 Forbidden, distinguishing "doesn't exist"
  from "exists but isn't yours." Rejected — leaks the existence of other
  users' documents (e.g., their document IDs, if guessed or enumerated),
  which the BRD's scoping intent argues against.

**6. Minimal frontend: a one-time registration form (name only) storing
the returned key in `localStorage`, and the existing `uploadDocument`
call updated to attach it via the `Authorization` header.**
- Alternative considered: no frontend change, assume keys are
  provisioned out-of-band (e.g., by an admin, communicated manually).
  Rejected — the existing shipped `UploadPage.tsx` would simply break
  (401 on every upload) with no user-facing way to recover, which is
  worse than a minimal in-app registration flow; the BRD doesn't forbid
  self-service registration, and nothing about the product description
  suggests users are pre-provisioned by an admin.

## Hard constraints confirmation

- **Grounded in source document**: unaffected — this story governs who
  can read already-computed results, not how they're computed or
  verified. Nothing about grounding changes.
- **Field-level key/value storage model**: unaffected — `owner_id` is
  added to `Document`, not to `extraction_results`; the field-level
  record shape (one row per document/field pair) is untouched.

## Risks / Trade-offs

- [Pre-existing documents become permanently inaccessible] → Deliberate,
  stated plainly (Decision 4), not an oversight; flagged for the
  architect to confirm or override during review.
- [SHA-256 alone (no per-key salt beyond the key's own high entropy)
  relies on the token's randomness for security, not a slow hash] →
  Accepted; appropriate for a high-entropy random token, not a
  human-chosen secret (Decision 2's reasoning applies directly).
- [No key rotation/revocation means a leaked key is valid indefinitely]
  → Accepted as an explicit Non-Goal for the MVP; flagged as a known gap
  rather than solved here, since the BRD doesn't ask for it and it would
  meaningfully expand this already-large story.
- [Single shared auth dependency, if misconfigured on one route, could
  silently fail open] → Mitigated by task-level verification (see
  tasks.md) explicitly testing every retrofitted endpoint rejects
  unauthenticated requests, not just the new ones.

## Migration Plan

- Add an Alembic migration creating `users` (`id`, `name`,
  `api_key_hash`, `created_at`) and a nullable `owner_id` FK on
  `document` (no backfill — existing rows keep `owner_id = NULL`, per
  Decision 4).
- No changes to `document_extractions`, `extraction_results`, or
  `llm_extractions`.
- Rollback: drop `users` and `document.owner_id`; remove the auth
  dependency from every route and the registration endpoint; revert the
  frontend registration/key-attachment changes. Every endpoint reverts
  to today's unauthenticated behavior; no other data is affected.

## Open Questions

- None. Every material decision (access model, key hashing, pre-existing
  document handling, not-found-vs-forbidden) was either resolved with
  the user or made and justified above — nothing here is deferred as
  "safely answerable later" given how foundational and security-relevant
  this story is.
