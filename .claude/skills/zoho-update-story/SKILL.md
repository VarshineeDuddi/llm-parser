---
name: zoho-update-story
description: Create or update the Zoho Sprints technical story for an OpenSpec change - link the change-id, represent tasks.md's section headers as either checklist entries or separate linked items (judgment call per section), and tag dependencies from the Stage 0a split. Use after /opsx:propose finishes for a story, or whenever the user asks to "update the Sprints story" / "add sub-items" / "sync Sprints" for a named change.
allowed-tools: Bash(openspec:*), mcp__zoho-sprints__*
license: MIT
compatibility: Requires openspec CLI and a connected Zoho Sprints MCP server. Requires the epic and story split to already be approved (Stage 0a) and the epic to exist in Sprints.
metadata:
  author: project
  version: "2.0"
---

Sync one OpenSpec change into its Zoho Sprints technical story. This is
NOT part of `/opsx:propose` - it never touches Zoho Sprints, and this
skill never touches `openspec/` planning artifacts. Two separate jobs.

**Planning boundary (same rule as propose/apply):** this skill only
reads `openspec/changes/<name>/` and writes to Zoho Sprints. It does not
edit application code, and it does not edit any OpenSpec artifact.

**Input**: A change name after the skill/command (e.g.
`storage-foundation`). If omitted, check if it can be inferred from
conversation context (the change just proposed). If ambiguous, ask.

**Steps**

1. **Confirm the change is far enough along to sync.**
   ```bash
   openspec status --change "<name>" --json
   ```
   - If `tasks` is not yet `done`, stop and tell the user: section
     content comes from `tasks.md`, so there's nothing to sync yet.
     This is expected on `parser-sensitive` changes still waiting on
     the architect's `review` approval - that's not a bug to route
     around, it's the gate holding.
   - If `tasks` is `done`, continue.

2. **Read the change's artifacts for context.**
   - `openspec/changes/<name>/proposal.md` - for the epic link and
     which Stage 0a split entry this story corresponds to (read the
     project's `context`/`rules` in `openspec/config.yaml` for the
     exact fields to expect; don't assume a fixed schema across
     projects).
   - `openspec/changes/<name>/tasks.md` - each `##` section is what
     gets represented in Sprints (see step 5 for how).
   - If `openspec/changes/<name>/design.md` exists and references a
     `depends_on` change, note that change's Sprints story - the new
     story should be linked/blocked on it, not left looking independent.

3. **Find the parent epic and existing story, if any.**
   - Ask the user for the epic ID if it isn't already known in this
     conversation - never guess or invent one.
   - Search for an existing Sprints item already linked to this
     change-id before creating a new one. Re-running this skill on a
     change that was already synced should update, not duplicate.

4. **Create or update the Sprints story.**
   - Title: the change's proposal.md "Why"/name, kept short.
   - Description: must include the change-id and the repo path
     (`openspec/changes/<name>/`), so the story and the artifacts are
     findable from each other.
   - If this change depends on another (step 2), link/tag the
     dependency so the story doesn't appear independently ready when
     it isn't.
   - Associate the story with the parent epic.

5. **For each `tasks.md` section, decide: checklist entry, or a
   separate linked item.** Zoho Sprints has no built-in "subtask" -
   the real choices are a checklist line inside the story (checkbox
   only, not independently assignable or trackable) or a full item
   (assignable, has its own status) linked back to the story. Judge
   each section on its own, don't apply one rule to the whole change:

   - **Lean checklist** when the section is small, tightly coupled to
     the rest of the story, unlikely to ever be handed to a different
     person, or is really just a checkpoint within one larger effort
     (e.g. "3.1 write the migration and verify it applies cleanly").
   - **Lean separate item** when the section is substantial enough to
     be worked and reviewed independently, could reasonably go to a
     different developer, represents a distinct piece of the story
     someone might want to track status on its own, or the story's
     own tasks.md already treats it as a self-contained unit (a
     numbered section with several related tasks under it, not one or
     two lines).
   - When genuinely unsure, prefer checklist - it's the lower-commitment
     choice and easy to promote to a separate item later if it turns
     out to need its own tracking.
   - For a separate item: create it (`ZohoSprints_CreateItem`), then
     check the project's available link types before linking - don't
     assume a "subtask"/"parent-child" type exists. If one does, use
     it; if not, use the closest available relation and note "part of
     <parent story>" explicitly in the new item's description so the
     relationship is clear even without a typed link. Do not associate
     it with the epic directly - it belongs under the story.
   - For a checklist entry: add it to a checklist group on the story
     (`ZohoSprints_AddChecklistGroup` / `ZohoSprints_AddChecklist`).
   - Do not duplicate on re-run: check for an existing checklist entry
     or linked item matching the section before creating a new one;
     update it instead.

6. **Report what happened**, plainly: which story was created or
   updated, its Sprints ID/link, which sections became checklist
   entries vs. separate items **and why** (one line of reasoning per
   section), and any dependency link that was set. Surfacing the
   reasoning matters here specifically - the checklist/item split is a
   judgment call, and the human reading the report needs to be able to
   catch and correct a wrong call. Do not claim an assignment was made
   - assigning to a developer is a human decision this skill does not
   make, for either checklist entries or separate items.

**Guardrails**
- Never assign the story to a developer. That's a judgment call for
  the architect/eng lead, not something to automate here.
- Never mark the story's status as "Ready for dev" or similar on a
  `parser-sensitive` change without confirming `review.md`'s Decision
  field actually says Approved - a file existing is not the same as
  approval (see `openspec/config.yaml`'s `review` rule).
- If the epic ID is unknown, stop and ask rather than searching
  loosely and guessing which epic is intended.
- If more than one existing Sprints item appears to match this
  change-id, stop and ask which one is correct rather than picking one.
- Don't invent a Zoho Sprints feature (a subtask type, a field) that
  doesn't show up in the available MCP tools or the project's actual
  link-type list - work with what the tools actually expose, the same
  way this skill had to be corrected once already for assuming a
  "sub-item" concept that didn't exist.
