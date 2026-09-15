## Sprints story

**3.1 Field-Level Key/Value Data Model** (item `57591000000025008`) under
epic **Field-Level Extraction Storage & Query** (`57591000000025001`) in
the Document Parser (MVP) project, workspace `60084866118`, project
`57591000000022002`. Confirmed to exist in Sprints via the Zoho Sprints
MCP (not assumed or invented). Priority: High.

## Scope

Formalize `extraction_results` — the field-level table Story 2.1
introduced as an explicitly minimal placeholder, later extended by 2.2
with `confidence`/`needs_review` — into the project's durable field-level
key/value data model: mechanically enforce the hard constraint that
results are stored one record per document/field pair (a uniqueness
constraint, not just convention), add the indexing a future query layer
will need, and tighten column constraints to match the invariants the
extraction code already upholds in practice. Per the user's explicit
choice for this story, this extends the existing table in place — no new
table, no data migration. Boundary: schema/table design and persistence
only, not the query API (3.2) or the extraction logic that populates it
(already built in 2.1/2.2).

## Users

Internal: no end user interacts with this directly. The people affected
are the developers who will build 3.2 (query/retrieval API) and 3.3
(view/export UI) on top of this model — this story is what makes that
possible without those stories having to first fix schema gaps — and,
indirectly, the end user who will eventually see extracted fields once
those stories ship.

## Risks

- **Retrofitting, not greenfield**: per the epic split entry itself,
  this story "should be settled before Story 1.3, 2.1, 2.2, 3.2, and
  3.3 begin" but wasn't — 1.3, 2.1, and 2.2 have already shipped against
  `extraction_results` as it stands today. Any change here must not
  break their already-running code or already-persisted data.
- **Uniqueness constraint migration risk**: mechanically enforcing "one
  record per document/field pair" via a DB-level unique constraint on
  `(document_id, field_name)` requires verifying no existing rows
  already violate it before the constraint can be added.
- **Nullability tightening risk**: `confidence`/`needs_review` are
  nullable in the current schema though the extraction code always sets
  both; tightening to NOT NULL requires confirming no existing row
  actually has a null value first.
- **Hard constraint enforcement is genuinely load-bearing here**: this
  is the story the hard constraint's "one per document/field pair" and
  "storage model must remain compatible with the planned future
  template-driven extraction capability" clauses point at directly —
  getting the mechanical enforcement wrong (too strict or too loose)
  has more downstream consequence than a typical additive change.

## Dependencies

This story's relationship to 2.1/2.2 is the inverse of the usual
"inherit from the depended-on layer" case: 3.1 is the foundational
persistence layer 2.1 (`llm-extraction`, archived) and 2.2
(`confidence-scoring-and-low-confidence-flagging`, archived) already
built an interim version of and now depend on, not a later cycle of
either of them. There is no earlier discuss.md for this story to inherit
Scope/Users/Risks from — this discuss.md is independently derived. For
context, 2.1's design.md explicitly left open "whether `extraction_results`
will later be replaced wholesale by Story 3.1's data model, or 3.1 builds
on top of it," noting that decision "does not change [2.1's] specs,
approach, or tasks." This story resolves that open question: build on
top of it, per the user's explicit choice recorded above. Story 3.2
(Query & Retrieval API) and 3.3 (View/Export) depend on this story
completing first.
