## Why

Every document and extraction endpoint shipped so far (1.1 through 3.2)
is unauthenticated — any caller can upload, read, or query any
document's data, including extracted business/personal facts. Per the
BRD's data-handling NFR, "access to stored results should be scoped
accordingly." This is Zoho Sprints story **4.1 Access Scoping for
Extraction Results** (item `57591000000023028`) under epic **Access
Scoping for Extraction Results** (`57591000000022028`) in the Document
Parser (MVP) project — confirmed to exist in Sprints, not invented (see
discuss.md). It depends on Story 3.1 (`field-level-storage`, archived —
the data model being scoped) and retrofits onto Story 3.2
(`field-level-query`, archived) and Story 1.1's upload endpoint, both of
which shipped unauthenticated ahead of this story landing (see discuss.md
Dependencies for why, and the epic's own retrofit precedent set by 3.1).

BRD source: no standalone `docs/BRD.md` exists in this repo; the
business requirement referenced is `openspec/config.yaml`'s `context`
block's data-handling concern that extracted values may be sensitive and
access should be scoped.

**Access model (resolved with the user before drafting, not assumed):**
per-user ownership scoping — a lightweight API-key identity per user,
with each user restricted to only their own uploaded documents — rather
than a single shared credential with no per-user distinction. This is a
materially larger, more foundational change than the shared-gate
alternative, chosen deliberately; see design.md Decisions.

## What Changes

- Introduce a minimal user identity: a `User` record (name, hashed API
  key) created via a registration endpoint that returns a freshly
  generated key exactly once — the key can never be retrieved again
  after issuance.
- Require authentication (a valid API key via the `Authorization`
  header) on every document and extraction-related endpoint: upload, get
  document, get extraction, get document fields, get field occurrences,
  get documents by type.
- Every newly uploaded document records which authenticated user
  uploaded it.
- Every single-document read (get document, get extraction, get fields)
  returns not-found for a document that exists but belongs to a
  different user — not a distinguishing "forbidden" response, to avoid
  confirming another user's document exists.
- Both cross-document query endpoints (by field, by type — 3.2) are
  scoped to only the authenticated caller's own documents, never
  returning another user's data.
- Documents uploaded before this story ships have no real owner and are
  not retroactively assigned one — they become inaccessible through the
  now-scoped endpoints to any regular user (see design.md for why this
  is the correct behavior, not an oversight).
- Minimal frontend changes: a way to register and store an API key
  (since the app is otherwise now unusable), and the existing upload
  call updated to send it.
- Out of scope for this story: password-based login, key rotation or
  revocation, multiple keys per user, roles/admin privileges beyond
  "owns a document or doesn't," and any change to Story 3.3's
  not-yet-implemented frontend beyond noting (in discuss.md) that its
  eventual implementation must send the same header.

## Capabilities

### New Capabilities
- `access-scoping`: user registration and API-key issuance, the
  authentication requirement across document/extraction endpoints, and
  ownership-based scoping of both single-document and cross-document
  results.

### Modified Capabilities
- `document-ingestion`: the "Local File Upload" requirement now requires
  authentication and records the uploading user as the new document's
  owner. No other requirement in this capability changes.
- `field-level-query`: "Retrieve All Fields For A Document" now returns
  not-found for a document owned by a different user (in addition to a
  nonexistent one); "Retrieve All Occurrences Of A Field Across
  Documents" and "Retrieve Documents By Classified Type" are now scoped
  to only the caller's own documents rather than all documents. No other
  requirement in this capability changes.

## Impact

- **Backend**: new `User` model and registration endpoint; a new
  authentication dependency (validates the `Authorization` header,
  loads the caller, 401 on missing/invalid key) applied to every
  document/extraction router; a nullable `owner_id` FK added to
  `Document`; ownership filtering added to the two cross-document query
  endpoints and a not-found-if-not-owned check added to the three
  single-document endpoints (get document, get extraction, get fields).
- **Data**: new `users` table; new nullable `owner_id` column on
  `document` (nullable specifically because pre-existing documents have
  no real owner — see design.md).
- **Frontend**: a minimal registration/key-storage UI (new, since the
  app has no such concept today) and an update to the existing upload
  call to attach the stored key.
- **Dependencies**: depends on 3.1. Retrofits onto 1.1's upload endpoint
  and 3.2's three read endpoints (all archived/shipped). Story 3.3
  (drafted, not yet implemented) must attach the same header when it is
  eventually built — flagged, not addressed here since no 3.3 code
  exists yet to retrofit.

## Risk Classification (Stage 0b)

| Dimension | Applies? | Detail |
|---|---|---|
| Data model change | Yes | New `users` table; new nullable `owner_id` column on `document`. Additive; no existing column changes shape. |
| New external integration | No | No external identity provider; API keys are issued and verified entirely within this system. |
| Security/credential handling | **Yes** | The first mechanism in this product that issues and stores a credential for someone else to use. Hashing, one-time display, and authentication enforcement are all genuinely new, security-critical surface. |
| Multi-module / architecture | **Yes** | Touches every existing document/extraction endpoint (1.1, 3.2) and introduces the first identity concept in the product — the most cross-cutting change in this epic so far. |

Given security/credential handling and multi-module architecture both
apply squarely, and this story is explicitly Architect-gated in both
`config.yaml` and the Sprints seed itself, this is classified
**parser-sensitive** — matching the Sprints story's own suggested
classification without any judgment call needed.

## Rollback

Remove the authentication dependency from every endpoint, remove the
registration endpoint, drop the `users` table and `document.owner_id`
column, and revert the frontend registration/key-attachment changes.
Every endpoint reverts to today's unauthenticated behavior. No data
loss to existing document/extraction/field records — only the new
`users` table and `owner_id` column are removed; nothing about
`document`, `document_extractions`, or `extraction_results`' other
columns is touched by rollback.
