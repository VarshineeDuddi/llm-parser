## Data sensitivity classification

<!-- business-sensitive / personal / neither. Must match proposal.md's
     risk table - if they disagree, stop and reconcile before continuing. -->

## Credential handling

<!-- Any new credential, token, or secret this story introduces or
     touches. Confirm: env vars / secrets manager only, never hardcoded,
     never logged. Leave as "none" if not applicable - do not omit the
     section. -->

## External write-back scope

<!-- If this story writes data back to an external system, state exactly
     what fields are included. Extracted field values must never be
     included - type/summary-level only. -->

## Inheritance

<!-- If proposal.md's depends_on is set, this classification is inherited
     from the depended-on change's security-privacy.md - confirm it still
     holds for this cycle's layer and note only what's cycle-specific.
     Leave empty otherwise. -->
