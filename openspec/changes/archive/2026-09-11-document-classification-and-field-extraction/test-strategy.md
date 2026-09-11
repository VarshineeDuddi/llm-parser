## Approach

Follows the existing `backend/tests/` pytest pattern (`conftest.py`
fixtures, one test module per capability, as established by
`test_upload.py`, `test_extraction.py`).

- **Unit tests**: the grounding-verification function (substring match
  against `extracted_text`, whitespace-normalized) in isolation; the LLM
  response parser (valid structured response, malformed response,
  response with a mix of grounded and ungrounded entries); the
  reserved-field-name handling for classified document type.
- **Integration tests**: the Anthropic client call itself is mocked at
  the SDK boundary (no real API calls in CI, and no production/synthetic
  document content sent to a real third party from tests) — an
  integration test exercises the full path from "text extraction
  succeeded" through "field-level records persisted," with the mocked
  client returning canned responses (all-grounded, partially-grounded,
  malformed, and an error/timeout) to verify each outcome persists
  correctly.
- **Manual verification**: one end-to-end run against the real Anthropic
  API (using synthetic/de-identified fixture documents only, per the
  project's data policy) to confirm the mocked integration tests reflect
  real response shapes.

## Coverage for flagged concerns

Each Concern captured in review.md's evidence summary gets an explicit
planned test, not just an implementation task:

- **Uncontrolled per-document LLM cost (no duplicate-skip yet)** → No
  test can verify a cost-avoidance behavior that doesn't exist in this
  story's scope; instead, an integration test asserts the LLM call is
  invoked for every document with a succeeded text-extraction outcome
  (documenting today's actual behavior), so a future story adding the
  duplicate-skip check has a clear "before" test to change deliberately
  rather than discovering this behavior by accident.
- **Strict substring-match grounding check rejects paraphrased facts**
  → Unit tests cover both the accept path (exact and whitespace-
  normalized substring match) and the reject path (paraphrased/
  non-substring value), asserting the reject path never persists a
  field/value record — directly testing specs/llm-extraction/spec.md's
  "Ungrounded or ambiguous value is not persisted as fact" scenario.
- **Single LLM call risks incomplete extraction on long documents** →
  No dedicated test; explicitly a Non-Goal, not a defect to verify
  around. Noted here so its absence from the test suite is a deliberate
  omission, not a gap.
- **LLM response format drift** → Unit test feeds the parser a malformed/
  non-JSON response and asserts it is treated as a failed LLM extraction
  outcome (not an unhandled exception), directly testing "Requirement:
  LLM Extraction Outcome Tracking" — failed scenario.
- **Production document content sent to a third party for the first
  time** → Integration tests assert the mocked Anthropic client is
  called with exactly the document's `extracted_text` (no unrelated
  document metadata or other documents' content) and that no test or
  fixture uses real production content, per the data policy. A log-
  inspection test asserts the API key, raw document text, and raw model
  response never appear in log output for either a successful or failed
  call.
- **Credential handling (Anthropic API key)** → A configuration test
  confirms the key is read from an environment variable and that the
  application fails to start (rather than silently proceeding with no
  extraction capability) when it is unset in a context where extraction
  is expected to run.

## Inheritance

Not applicable — see discuss.md and security-privacy.md's Inheritance
sections: this story's dependencies (1.2, nominally 1.3) are separate
capabilities on `parser-standard`, which has no `test-strategy.md` to
inherit from. This test strategy is independently derived for this
LLM-extraction layer.
