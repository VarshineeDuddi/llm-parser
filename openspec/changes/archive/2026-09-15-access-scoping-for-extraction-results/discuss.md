## Sprints story

**4.1 Access Scoping for Extraction Results** (item `57591000000023028`)
under epic **Access Scoping for Extraction Results** (`57591000000022028`)
in the Document Parser (MVP) project, workspace `60084866118`, project
`57591000000022002`. Confirmed to exist in Sprints via the Zoho Sprints
MCP (not assumed or invented). Priority: High.

## Scope

Introduce per-user identity and ownership scoping so every document and
extraction-related endpoint only returns data belonging to the
authenticated caller — resolved with the user before drafting began:
per-user ownership scoping (a lightweight API-key identity plus an
owner link on `Document`), not a single shared-secret gate with no
per-user distinction (see design.md Decisions for the full reasoning).
Boundary: an authorization/access-control layer over extraction
results, independent of the storage schema and query mechanics (3.1/3.2
unchanged in shape beyond an added owner column and a filter).

## Users

For the first time, this story creates the concept of "a user" in this
product at all — previously every uploader was anonymous and every
document was visible to any caller. Affected: the people who upload
documents (who can now only see their own), and developers/testers, who
will need an API key for every request from this story forward,
including through the existing frontend.

## Risks

- **Retrofitting onto six already-shipped, already-unauthenticated
  endpoints** (upload, get document, get extraction, get document
  fields, by-field, by-type — 1.1 through 3.2): missing even one leaves
  a real access gap, not a cosmetic one — this story's entire purpose is
  to close that gap, so an incomplete retrofit is a direct failure of
  its own goal, not an acceptable partial win.
- **Existing documents predate any user system** and have no genuine
  owner. A decision is needed on what happens to them under scoping (see
  design.md) rather than leaving it implicit.
- **Credential issuance and handling**: this is the first mechanism in
  this product that generates and stores a credential for someone else
  to use (previously the only credential was the Anthropic API key,
  which this system holds, not issues). Hashing, one-time display, and
  never logging the raw key are all genuinely load-bearing here.
- **Frontend breakage**: every existing API call from `UploadPage.tsx`
  (1.1) will start failing once endpoints require a key, unless this
  story also gives the frontend a way to obtain and attach one. Backend-
  only scoping would silently break the shipped UI.
- **No auth/crypto library currently in the backend's dependencies** —
  stdlib `hashlib`/`secrets` is the planned approach (see design.md);
  worth flagging as a deliberate choice, not an oversight, given this is
  the first credential-handling code in the project.
- **Explicitly Architect-gated**: both `config.yaml` and the Sprints
  seed flag this story for architect review — the `review.md` gate
  matters more here than on any prior story in this epic.

## Dependencies

- **Story 3.1 (`field-level-storage`, archived)**: depended on directly
  — the field-level data model this story adds ownership scoping around
  must already exist. 3.1 used `parser-sensitive` too but is not a prior
  cycle of this same change; no `discuss.md` to inherit from since this
  story's scope (access control) is a different concern from 3.1's
  (storage contract).
- **Story 3.2 (`field-level-query`, archived) and Story 3.3
  (`field-level-view`, drafted, not yet implemented)**: per this story's
  own Sprints description, access scoping "should land before or
  alongside Story 3.2/3.3" — it didn't; both shipped/are-being-built
  unauthenticated, continuing the epic's now-established retrofit
  pattern (3.1 itself retrofitted onto 1.3/2.1/2.2 for the same reason).
  This story must retrofit scoping onto 3.2's existing endpoints
  (`GET /documents/{id}/fields`, `GET /fields/{field_name}`,
  `GET /document-types/{type}/documents`). 3.3 has not been implemented
  yet — when it is, its frontend calls must include the auth header this
  story establishes; noted here so that isn't discovered as a surprise
  during 3.3's implementation.
