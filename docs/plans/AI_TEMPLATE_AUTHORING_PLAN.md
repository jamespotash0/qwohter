# AI Template Authoring Plan

> **Status:** Not implemented. Design notes for future work.

## The problem

The Google Docs variable system in [VARIABLES.md](../guides/VARIABLES.md) was built for
catalog and AI-extracted products, which carried a per-product config schema. A template
author could write `{{Wall A.stc}}` or `{{Partition B.track_system}}` because:

1. Each product had a **human-assigned alias**, minted when it was added through the
   configurator.
2. Each product model had a **known field vocabulary**, enumerated from its config schema —
   this is what `VariablesReferencePanel` renders (`field.key`).

Neither survives the move to a spec-import spine. A SIF/CET/Giza import produces lines
1..N in file order; nobody names them. And an order line's specification detail is
collapsed into `option_string`, an opaque manufacturer code string we deliberately do not
parse (see the header comment on `order_lines` in
`supabase/migrations/20260819100003_sales_orders.sql`).

So the direct-alias half of the template engine has no data source and no way to be
discovered. Only tables remain viable for the document body — and the user is left having
to know which keys exist.

## What a spec line can address

Every order line carries the same twelve fields, regardless of manufacturer:

| Key | Source |
|-----|--------|
| `manufacturer_name` | spec export, verbatim |
| `series_name` | spec export, verbatim |
| `model_number` | spec export, verbatim |
| `description` | spec export, verbatim |
| `option_string` | raw config code string |
| `area` | room / location grouping |
| `spec_phase` | phase or tag grouping |
| `quantity` | — |
| `list_price` | list_down mode |
| `dealer_discount_percent` | list_down mode |
| `unit_cost` | stamped or derived |
| `sell_price` | calculated |
| `source_line_number` | line number in the originating file |

This is a smaller vocabulary than the catalog era, but a **fixed and closed** one. That is
the property the rest of this plan depends on: it fits in a prompt, it is identical for
every job, and a value outside it is trivially detectable as invalid.

## Proposed variable model

Three tiers, replacing the alias system:

**Tier 1 — tables (primary).** `{{#TABLE:lines:...}}` with the twelve keys above as the
column vocabulary. Needs a **filter clause** added to the marker grammar, because dealers
write proposals room by room and an unfiltered table forces hand-cutting:

```
{{#TABLE:lines:area=Lobby:Qty=quantity,Item=description,Model=model_number,Ext=sell_price}}
```

**Tier 2 — group rollups.** `area` and `spec_phase` are stable, human-meaningful keys
chosen by the specifier, so they can back real scalars:
`{{area.lobby.total}}`, `{{area.lobby.count}}`, `{{phase.1.total}}`. These are what a cover
letter actually needs.

**Tier 3 — order scalars.** `{{order.number}}`, `{{order.lineCount}}`,
`{{order.manufacturers}}` (distinct list), plus the existing pricing totals.

### Key-safety caveat

Area names arrive from someone else's spec file and can contain periods, colons, and
braces — all of which break the `{{a.b}}` parser in `lookupVariable`
(`supabase/functions/generate-google-doc/index.ts`). **Slugify on import** and show the slug
in the reference panel. Positional keys (`{{area.1.total}}`) are the obvious alternative and
are wrong: they silently point at a different room when a line is added.

### Reference panel

The panel should enumerate **actual values from this order** rather than a static schema —
the real areas and phases, click-to-insert. This is the fix for "the user would have to know
the values."

## The AI layer

### Role

The AI authors the **template**, not the document.

An LLM handed order lines and asked for finished prose will produce copy that reads
correctly and contains wrong numbers — a transposed list price, a quantity rolled across two
areas, a model number that is plausible for the series and does not exist. These are the
failures a proofread does not catch, because the document looks right.

Authoring the template instead means the AI picks **keys from a closed list of twelve** and
never handles a value. The existing `generate-google-doc` renderer injects data
deterministically, as it does today. A human reviews the template once; every render
afterwards is exact.

### Cadence: once per template

Run at template setup, not per proposal. A dealer configures "our standard proposal" once
and reuses it. This is cheaper, reviewable, and keeps a stable artifact under version
control rather than a fresh generation per job.

Per-proposal generation is only justified if spec structure varies enough job-to-job that
the columns genuinely need to change — revisit only with evidence.

### Inputs

- **The column vocabulary** — the twelve fields, verbatim, as a closed list.
- **The marker grammar** — `{{#TABLE:id:filter:Header=key,...}}` plus 3–4 worked examples.
- **A shape summary of the order** — distinct areas, phases, and manufacturers; line count;
  ~5 sample rows. Not the full line set. Enough to decide "one table per room" vs. "one
  table grouped by phase."
- **Two or three of the dealer's own past proposals, paired with the template that produced
  them.** Few-shot on the *mapping*, not on the output.

### Validation harness

Reliability comes from the validator, not the prompt. After generation, parse every marker
out of the returned template and check:

- every `key` is in the twelve
- every filter value matches an actual `area` / `spec_phase` on the order — this catches
  hallucinated rooms, the most likely failure mode
- no `{{...}}` that is not a known scalar
- render against the real order and diff the totals against the sum from `order_lines`

A failure returns for **one** retry citing the specific violation. The multi-pass,
schema-validated shape in `supabase/functions/ai-product-extraction/index.ts` is the existing
precedent. Note that current AI edge functions use OpenAI (`OPENAI_API_KEY`).

## Open question: are we rebuilding template management?

Yes, partly — and this should be decided before building.

"AI authors the template" still means templates exist, are stored, are versioned, and need a
surface for a human to review and edit them. The AI removes the *authoring burden*, not the
*artifact*. If that surface is going to be built regardless, the honest comparison is:

- **AI-authored templates** — dealer uploads a past proposal, gets a working template back,
  edits from there. Cold start solved; template management still owned.
- **Better manual authoring** — a live reference panel showing this order's real keys, plus
  click-to-insert. Much smaller build; leaves the blank-page problem intact.

The AI layer is worth it only if cold-start is the actual friction. If dealers mostly clone
and tweak an existing template, tier 1–3 plus a good reference panel may be the whole job.

## Scope boundaries

- **Layout fidelity is out of scope for the AI.** It can say a table belongs there with those
  columns; it cannot reason about column widths, page breaks mid-table, or letterhead. It
  authors markers into a doc the dealer has already formatted — never generates from blank.
- **`option_string` stays opaque.** Parsing manufacturer option codes to recover STC, finish,
  or dimensions is a separate project with per-manufacturer cost and no general solution.

## Suggested sequencing

1. Filter clause in the `{{#TABLE:lines:...}}` grammar, plus area/phase slugification.
2. Tier 2 and 3 scalars.
3. Reference panel enumerating this order's real areas and phases.
4. Re-evaluate whether the AI authoring layer is still needed.

Steps 1–3 are useful on their own and are prerequisites for step 4 regardless.
