## Approach

Follows the existing `backend/tests/` pytest pattern (`conftest.py`
fixtures). Likely a new `test_access_scoping.py` for the identity/
auth-dependency logic itself, plus targeted additions to every existing
test module whose endpoint is retrofitted (`test_upload.py`,
`test_query.py`, and any covering `GET /documents/{id}` /
`GET /documents/{id}/extraction`).

- **Unit tests**: API key generation and hashing (a generated key hashes
  consistently, and a wrong key's hash never matches a stored one); the
  `get_current_user` dependency in isolation (valid key resolves a user,
  missing/invalid key raises the authentication-failure error).
- **Integration tests, per retrofitted endpoint** (upload, get document,
  get extraction, get document fields, by-field, by-type — all six):
  unauthenticated request is rejected; a second user's request for the
  first user's document/fields returns not-found; the owning user's own
  request succeeds and returns their own data only.
- **Regression tests**: every existing test in `test_upload.py` and
  `test_query.py` (1.1, 3.2) updated to authenticate as a seeded test
  user, confirming this story doesn't silently change behavior for an
  authenticated, owning caller beyond what's specified.
- **Migration tests**: the Alembic migration applies and rolls back
  cleanly; a document seeded before the migration (no `owner_id`) is
  confirmed inaccessible to a seeded regular user after migration, per
  design.md Decision 4.
- **Manual verification**: register a user via the frontend, upload a
  document, confirm the key persists across a page reload
  (`localStorage`), and confirm the existing upload flow still works
  end-to-end with the key attached.

## Coverage for flagged concerns

Each Concern captured in review.md's evidence summary gets an explicit
planned test, not just an implementation task:

- **Access model choice (per-user scoping)** → No test needed for the
  choice itself (a design decision, not a behavior); covered by every
  ownership-scoping test below actually exercising per-user isolation
  rather than a shared gate.
- **Retrofitting onto six already-shipped endpoints — omission risk** →
  A dedicated parametrized/table-driven test asserting all six endpoints
  reject an unauthenticated request, so a future endpoint added to the
  same router without the dependency is caught by an existing, visible
  test pattern rather than relying on manual review.
- **Pre-existing documents become inaccessible** → Migration test
  (above) directly verifies this consequence is real, not just
  documented — a pre-migration-seeded document is confirmed
  unreachable via `GET /documents/{id}` for a regular authenticated user
  after migration.
- **First credential-issuing code — key generation/hashing/one-time
  display** → Unit tests on generation/hashing (above); an integration
  test confirms the registration response includes the raw key exactly
  once and that no other endpoint (including a hypothetical "get my
  user" endpoint, if one exists) ever returns it again.
- **Not-found vs. forbidden for another user's document** → Integration
  tests (above, "a second user's request... returns not-found") assert
  the exact response status/shape matches the existing nonexistent-
  document case, not a distinguishable one.
- **Existing frontend would break** → A frontend test/manual check
  (above) confirms the existing upload flow works end-to-end with the
  new registration+key-attachment changes, not just that new code exists
  in isolation.

## Inheritance

Not applicable — see discuss.md and security-privacy.md's Inheritance
sections: this story's dependency (3.1) is a separate capability on
`parser-sensitive` with no shared `depends_on` cycle, so there's no
earlier `test-strategy.md` to inherit an overall approach from. This
test strategy is independently derived for this access-control layer.
