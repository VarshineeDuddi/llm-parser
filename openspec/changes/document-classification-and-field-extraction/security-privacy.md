## Data sensitivity classification

**Personal and business-sensitive.** Uploaded document content is
user-supplied and unrestricted in type for the MVP — it may contain
names, dates, monetary amounts, or other facts that are personal
(identifying an individual) or business-sensitive (contractual,
financial, or operational detail), depending entirely on what the
uploader submits. This story is the first to send that content to a
third-party service (the Anthropic LLM) rather than keep it entirely
within the system's own storage/compute. This is consistent with
proposal.md's risk table, which flags "sends production document content
to a third-party service for the first time" under Security/credential
handling — no disagreement to reconcile.

## Credential handling

New credential: the **Anthropic API key**. Per design.md Decision 4, it
is read once at process startup from an environment variable via the
existing settings/config module (the same pattern established in 1.1's
scaffolding) — never hardcoded, never committed, and never logged. The
extraction service logs LLM call outcome (succeeded/failed, latency,
token counts) but never the API key, the document text sent, or the raw
model response, per the project's data policy.

## External write-back scope

This story does not write extracted results, or any other data, back
into an external system. Its only external interaction is one outbound
request per document to the Anthropic API: the document's extracted text
is sent as the call's input (this is the "approved LLM extraction path"
the data policy refers to — the one place production document content is
permitted to leave the system), and the model's response (classification
+ candidate fields) is read back and processed entirely within this
system's own storage. No extracted field value, document content, or
document identifier is sent to any system other than Anthropic, and
nothing from this story is posted to Zoho or any other external service.

## Inheritance

Not applicable — proposal.md does not set a `depends_on` on a prior
cycle of the same capability. This story's dependencies (1.2, nominally
1.3) are separate, already-completed or in-progress capabilities
consumed as inputs, not earlier layers of this same change being
continued — see discuss.md Dependencies for why no discuss.md/security-
privacy.md exists to inherit from either of them (both used
`parser-standard`, which has no such artifacts).
