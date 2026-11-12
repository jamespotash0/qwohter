# Portal Connector Plan

> **Status:** Not implemented. Design only.

## Overview

Get what a manufacturer portal shows (quote number, price, order number, acknowledged lines) into the right proposal or job without retyping it.

**Read-only, and no per-portal setup.** Qwohter does not fill in portal forms, and nobody writes field maps. An LLM reads whatever the portal produced, whether that's a page, a PDF or an email, and returns it in shapes Qwohter already has. A person confirms before anything is written.

The dealer logs into portals normally. Qwohter never holds a manufacturer password.

---

## What already exists

| Need | Already here |
|---|---|
| Document → products, pricing, client | `parse-quote` edge function, called by proposal import (`src/services/proposalImport/openAIParser.ts`) |
| Document → configurable products with options and price breakdown | `ai-product-extraction`, called by `src/services/productExtraction.ts` |
| Flexible product fields | `Product.rawData` is free-form. Keep whatever the document says; don't drop unknown keys |
| Tolerant field lookup | `findFieldValue` in `productHelpers.ts` |
| Acknowledgments | `src/lib/ack`: `AckRow[]` → match → confirm dialog. `parse.ts` already expects a model-read source to produce the same rows |

The new work is mostly **getting the content to these functions** and **sending the result to the right confirm screen**.

---

## How content gets in

Simplest first. Each step works alone.

1. **Paste or drop on the record.** On a proposal or job, an "Import from portal" box takes pasted text, a PDF or a screenshot. No extension, no inbox.
2. **Forward to the Coordinator inbox.** Portal confirmation emails and quote PDFs go to the same address as everything else ([COORDINATOR_AGENT_PLAN.md](COORDINATOR_AGENT_PLAN.md)). Resolution finds the job by quote/order/PO number.
3. **"Send this page to Qwohter" button.** A small Chrome extension that sends the current page's text to step 1's endpoint. It has no adapters and knows nothing about any particular portal. Build it only if steps 1–2 show people want it.

---

## What comes out

| From the portal | Lands in | Confirm screen |
|---|---|---|
| Manufacturer quote number, price, valid-until | Product `unitCost`, quote number kept in `rawData` | Current vs quoted cost, per product |
| Product spec the portal echoed back | Product `rawData` (merged, not replaced) | Same dialog |
| Order number | `vendor_pos.po_number`, `placed_at` | Existing vendor PO edit |
| Acknowledgment lines | `AckRow[]` | Existing ack confirm dialog |

Weak matches are shown, not applied. Nothing writes without a click: a price decides whether the job is profitable.

---

## Deliberately skipped

- **Filling portal forms.** This means a field map per portal, and portals change their layouts. Revisit only if retyping into portals turns out to be the bottleneck.
- **`manufacturer_quotes` table.** The quote number lives on the product. Add the table when someone needs to list quotes across proposals.
- **Stale-pricing detection.** Proposal versions already separate revisions. Add a spec hash if editing a version in place after it's been priced becomes a real problem.

---

## Phases

| Phase | Deliverable | Risk |
|---|---|---|
| **1** | "Import from portal" on a proposal: paste/drop → `parse-quote` → cost confirm dialog | Low: reuses existing extraction |
| **2** | Same on a job: order number + acknowledgment → existing ack dialog | Low: reuses ack pipeline |
| **3** | Coordinator inbox routes portal emails/PDFs to phase 1–2 | Depends on Coordinator phase 2 |
| **4** | Optional "send page" extension | Low: forwards text, no adapters |

Milestone: a real Kwik-Wall quote, pasted or forwarded, ends up as cost on the right products after one confirm click.

---

## Open decisions

- **Model.** Both extraction functions use `gpt-4o-mini`. Check accuracy on real portal output before trusting prices from it
- **Merge rule for `rawData`.** Whether a portal value overwrites what the dealer typed or only fills in blanks. Default: fill blanks, show conflicts
- **Dependency:** job-side capture needs the back-office tables on `feature/dealer-order-spine`, which aren't in production yet
