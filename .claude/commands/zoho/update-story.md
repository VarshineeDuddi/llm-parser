---
name: "Zoho: Update Story"
description: "Create or update the Zoho Sprints story for an OpenSpec change, representing tasks.md sections as checklist entries or separate items"
allowed-tools: Bash(openspec:*), mcp__zoho-sprints__*
category: "Workflow"
tags: ["zoho", "sprints", "tracking", "project-specific"]
---

Sync one OpenSpec change into its Zoho Sprints technical story.

This is separate from `/opsx:propose`, `/opsx:apply`, and `/opsx:sync`
(which syncs delta *specs*, not Sprints). This command never edits
`openspec/` artifacts or application code - it only reads the change's
artifacts and writes to Zoho Sprints.

**Input**: The argument after `/zoho:update-story` is the change name
(e.g. `/zoho:update-story storage-foundation`). If omitted, infer from
conversation context if a change was just proposed or applied; otherwise
ask which change.

See the `zoho-update-story` skill for the full step-by-step. Summary:

1. Confirm `tasks.md` exists (`openspec status --change "<name>" --json`)
   - stop and explain if it doesn't yet, rather than syncing early.
2. Read `proposal.md` for the epic/split reference, `tasks.md`'s
   sections, `design.md` for any `depends_on` link.
3. Ask for the epic ID if not already known - never guess.
4. Create or update the Sprints story (title, description with the
   change-id and repo path, epic association, dependency link).
5. For each `tasks.md` section, judge whether it becomes a checklist
   entry on the story or a separate linked item - not a fixed rule,
   a per-section call based on size/independence (see the skill for
   the actual criteria). State the reasoning when reporting back.
6. Report what was created/updated, including the checklist-vs-item
   reasoning per section. Never assign a developer, and never mark a
   `parser-sensitive` story ready without confirming `review.md`'s
   Decision field actually says Approved.
