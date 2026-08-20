# Back Office (Contract Furniture Dealers)

Foundation for dealer back-office operations — everything that happens between
"the customer signed" and "the invoice posted". Specification and catalog data
come from the tools dealers already use (CET, Giza, 2020, ProjectMatrix); this
system owns the order lifecycle those tools do not.

> **Status:** Foundations, the order spine, the PO fan-out with acknowledgment
> variance, and work orders are implemented. Receiving UI, punch lists, job
> costing, and specification import are not built yet.

---

## The chain

```
spec tool ──SIF──► quote ──► project ──► sales order ──► order lines
                                              │
                                              ├──► vendor POs ──► ACK ──► variance
                                              ├──► receipts
                                              ├──► work orders ──► punch
                                              └──► job cost
                                                        │
                             payment_job ──► billing_phase ──► QuickBooks invoice
```

The right-hand end (`payment_jobs` → `billing_phases` → invoice) already exists;
see [BILLING.md](BILLING.md). The middle is what Phase 1 builds.

---

## The order spine

`project → sales_order → order_lines`. A project may have several sales orders;
change orders and added scope get their own, mirroring `payment_jobs`.

**Ship-to is snapshotted** onto the order, not read through to `companies`. A
customer moving office must not silently rewrite where last year's order went.

**Fulfillment is event-sourced.** `order_line_events` is append-only and signed
— a return or correction is a negative event, not an edit. Quantities are
derived through the `order_line_fulfillment` view (`security_invoker`), which is
the only correct source. There is deliberately no `qty_received` column:
partial shipments, damage replacements, and returns corrupt stored counters
inside the first real job.

**Creation is atomic.** `create_sales_order_with_lines(p_order, p_lines)` is
`SECURITY INVOKER`, so RLS applies. supabase-js has no transaction and a real
furniture order is hundreds to thousands of lines; a partial insert would
produce an order that looks complete and silently under-orders.

Pricing is computed in TypeScript and passed in already resolved. Recomputing it
in SQL would create a second source of truth that could disagree with the quote
the customer accepted.

### Materialization

`materializeOrderLines()` flattens a proposal's pricing sections into numbered
order lines. Line numbers run across the whole order, not per section, because a
purchase order references "line 47 of the order". Section names become the
`area`, since that is what dealers use them for.

Cost is **resolved**, not copied — in `list_down` mode the stored `unitCost` is a
cache that may lag list price and discount.

Lines whose manufacturer has no vendor account get `vendor_id = null`. They are
still created — that is real scope the customer bought — but cannot go on a
purchase order until a vendor is assigned. Call `previewOrderFromProposal()`
first and show `summarizeMaterialization()`: a dealer should see *"3
manufacturers have no vendor account, 47 lines cannot be ordered"* before the
order exists, not after. `assignVendorToLines()` is the fix.

---

## How a line gets delivered

A dealer sells product *and* service on one quote: chairs bought from Steelcase,
installation performed by their own crew, a tariff re-billed at cost. Only some
of those are things you buy, so every order line carries a `fulfillment_type`.

| Type | Meaning | Where it goes |
|------|---------|---------------|
| `purchase` | Bought from a manufacturer | Purchase order |
| `subcontract` | Work someone else performs | Purchase order to that subcontractor |
| `self_perform` | The dealer's own crew or truck | Work order — **never** a PO |
| `pass_through` | A cost re-billed, not procured | Neither |

**This is set in the form builder**, per pricing section, so whoever fills in a
proposal never thinks about it. `Merchandise` defaults to purchased,
`Delivery & Installation` to self-performed, `Freight` to purchased, `Tariffs`
to pass-through. An individual line can override its section — an install line
that gets subcontracted on one job.

`NULL` is a real state: the form never said. Resolution goes line override →
section setting → a guess from the legacy section category, and anything
unrecognised — including every section the old builder stamped `other` with no
way to change it — stays `NULL` rather than being guessed. A wrong guess either
raises a purchase order for the dealer's own labor or silently drops product
that needed buying; unrouted is recoverable and visible.

`planFanOut()` reports four buckets accordingly: vendor groups ready to order,
`unassignedLines` (purchasable, no vendor account — a real blocker),
`unroutedLines` (fixed in the form's section settings, not the vendor screen),
and `notPurchased` (own labor and pass-throughs, shown so the picture is
complete without implying a problem).

---

## Purchase orders and the fan-out

One customer order becomes N purchase orders, one per manufacturer — a 1,200-line
job might be six POs to six factories, each acknowledged, shipped, and invoiced
on its own schedule.

`po_lines` **reference** order lines rather than duplicating them. An order line
is what was sold; a PO line is a claim on some of its quantity. Partial ordering
is normal, so `planFanOut()` reads outstanding quantity from
`order_line_fulfillment` and is safe to re-run as a job is released in phases.

A line only flips to `Ordered` once its **full** quantity is on a PO. Releasing
12 of 20 leaves it `Open`, because the remaining 8 still have to be bought —
flagging it early would hide them from the next fan-out.

Issuing goes through `create_vendor_po_with_lines`, which writes the header, its
lines, and one `ordered` event per line together. Unit cost is read from the
order line **inside** the function — what the dealer commits to buy at is not the
client's to assert.

`fanOutPurchaseOrders()` issues each vendor's PO independently: one vendor
failing does not roll back the rest, and failures come back named so the caller
can say exactly which vendor did not get an order.

### The variance queue

`po_lines` carries both the price ordered at and the price acknowledged. The
acknowledged columns stay `NULL` until an acknowledgment arrives, which is what
separates *not yet acknowledged* from *acknowledged unchanged*.

`cost_variance` is a **generated column**, so it cannot drift from its inputs.
The `po_line_variance` view classifies each line as `awaiting_ack`, `match`,
`price`, `date`, or `price_and_date`, and `summarizeVariance()` produces the
headline: *"12 awaiting acknowledgment, 4 with variances totalling $8,400, worst
slip 21 days."*

Credits net against overcharges in the exposure figure — a vendor honouring a
lower price is real money back. But the queue *sorts* by magnitude, so a large
credit is as visible as a large overcharge; both warrant a look.

---

## Work orders

The service half of the job. Product is bought through purchase orders; delivery
and installation are scheduled.

A work order is performed **either** by one of the dealer's crews **or** by a
subcontractor — never both, enforced by a CHECK. Subcontracted work is therefore
both purchasable *and* schedulable: it gets a PO to the subcontractor and a work
order for the day they show up. Someone else swinging the wrench does not remove
the need for a date, a site contact, and dock access.

`planSchedulableLines()` subtracts what is already installed **and** what other
live work orders already cover, so re-running it on a part-scheduled job does not
book the same chairs onto a second day. Cancelled work orders release their claim;
completed ones are already counted through installed quantities.

### A crew cannot be in two places at once

This is a database exclusion constraint over the scheduled time range, not a
check the UI remembers to run:

```sql
EXCLUDE USING gist (crew_id WITH =, tstzrange(scheduled_start, scheduled_end) WITH &&)
  WHERE (crew_id IS NOT NULL AND ... AND status <> 'Cancelled')
```

Double-booking is the most expensive scheduling mistake a dealer makes — a crew
shows up to a site that is not ready while another job goes uninstalled — and a
check the application has to remember is a check that eventually does not run.
It holds even when two people schedule at the same moment. Cancelling a work
order releases its slot. The service surfaces the violation as
`CrewDoubleBookedError` rather than a raw constraint message.

A `Scheduled` work order must also have a start, an end, and a performer. `Draft`
is where an incomplete one lives.

### Site access is a first-class field

`access_notes` carries dock hours, elevator reservations, COI requirements, and
after-hours access. These are what actually sink an install day, and they belong
on the work order the crew reads that morning — not buried in a project note.

### Completion

`complete_work_order()` applies completed quantities, writes `installed`
fulfillment events, and marks the order Complete — together, because a work order
marked Complete whose events did not write would leave the product looking
uninstalled and get it scheduled a second time. Omit a line from the completions
array and it completes at its planned quantity, which is the common case.

`crews.hourly_cost` is the cost side of every self-performed line. Product cost
comes from a manufacturer invoice; labor cost comes from crew-hours × rate. Job
costing needs both, and until now the model could not tell them apart.

---

## Pricing: two directions

Contract furniture prices **down from list**; everything the app authored
natively prices **up from cost**. Both are supported on the same line item.

| Mode | Input | Derivation |
|------|-------|-----------|
| `cost_up` (default) | `unitCost` | Entered directly by the dealer |
| `list_down` | `listPrice` + `dealerDiscountPercent` | `listPrice × (1 − discount/100)` |

A line with no `pricingMode` is treated as `cost_up`, so everything authored
before this change behaves exactly as it did.

**Read cost through `resolveUnitCost(item)`, never `item.unitCost` directly.**
In `list_down` mode the stamped `unitCost` is only a cache; the list price and
discount are the source of truth. `enrichSections()` restamps it on every
recalculation.

`calculateDealerCost()` rounds at the unit deliberately: `1000 × (1 − 55/100)` is
`449.99999999999994` in floating point, and multiplying that by a quantity of 20
puts `8999.999999999998` on a purchase order.

### Spec metadata

Lines that came from a specification export carry provenance through to the
purchase order: `manufacturerName`, `seriesName`, `optionString`, `area`,
`specPhase`, `sourceLineNumber`. These are inert for pricing — they exist so an
imported line stays traceable to the file it came from when a dealer disputes
what was specified.

**No product catalog.** Manufacturer and series are text, not references. CET,
Giza, and 2020 already resolve the part number, options, and list price before a
line reaches us, so maintaining a catalog here would be a permanent cost with
nothing to show for it. A vendor row *is* the manufacturer identity, and a
series is matched by name — normalized for case and whitespace, because that
text is hand-entered upstream.

The catalog hierarchy that used to exist (domains, manufacturers, lines, series,
models, config schemas, option value sets, business rules) was removed outright —
9 tables, 2 views, 4 functions, and 24 source files. Products a dealer curates
for labor, freight, and ancillary items live in the ordinary `products` table and
are picked with `ProductLibraryPicker`.

### Summary totals

`PricingSummary.totalList` reports the manufacturer list value of an order before
any dealer discount. It is `0` for entirely `cost_up` pricing, and optional on
the type so summaries persisted before list-down pricing still typecheck.

---

## Accounts

`contacts` model **people**. The accounts a dealer transacts with are separate,
because a purchase order or invoice is addressed to an organization.

- **`companies`** — who you sell to. Bill-to and ship-to addresses, payment
  terms, tax exemption, and the QuickBooks customer id. Ship-to falls back to
  the billing address when unset, which is the common case for office accounts.
- **`vendors`** — who you buy from. Where a PO goes and how (`order_method`),
  where acknowledgments come back to, remit-to for payment, freight terms, and
  the manufacturer's rep. Optionally linked to `product_manufacturers`.
- **`vendor_discounts`** — what you pay them.

`contacts.company_id` links a person to a company. It supersedes the free-text
`contacts.company_name`, which is retained as the pre-migration value and as the
fallback label for unlinked contacts.

Both companies and vendors **deactivate rather than delete** by default — order
history references them. Deletion is an Owner/Admin action.

---

## Discount resolution

A dealer's discount from one manufacturer is never a single number. It varies by
product series and by the contract the sale runs under, and agreements expire.

Rows match **most-specific-first**:

Series is matched by **name**, normalized for case and whitespace. A dealer only
ever lists the handful of series they hold special pricing on, so there is
nothing to maintain beyond those rows.

| Tier | Matches |
|------|---------|
| `series+contract` | This series, under this contract |
| `series` | This series, any contract |
| `contract` | Any series, under this contract |
| `blanket` | Any series, any contract |

`NULL` in `series_name` or `contract_vehicle` means "applies to anything", so a
vendor's blanket rate is one row with both `NULL`. A tie **inside** a tier goes
to the larger discount, so a dealer is never silently charged more than an
agreement entitles them to. A more specific but smaller discount still wins over
a larger blanket one — that is the agreement they actually signed for that
series.

Both are compared normalized — trimmed and lowercased — because they are hand-entered.

### null is not zero

`resolveDiscount()` returns `null` when **no agreement on file covers the line**.
That is a different state from a genuine 0% discount, and must be surfaced as
"cannot price", never coerced to list price. `resolveDiscountPercent()` takes an
explicit fallback for callers that have already decided what absence means.

Resolution lives in `src/lib/pricing/discounts.ts` as pure functions, so quoting
and purchasing arrive at the same dealer cost. That is the only way to guarantee
they agree.

---

## Cost visibility

`vendor_discounts` is margin data, gated on `can_view_cost()` rather than plain
membership. See [SECURITY.md](../architecture/SECURITY.md#cost--margin-visibility).

RLS **filters** rather than rejects, so a user without cost visibility gets an
empty discount list, not an error. Treat "no discounts returned" as "cannot
price".

---

## Attachments

Back-office paperwork belongs to the specific thing it documents, not to the
project. An acknowledgment attaches to the PO it acknowledges; a packing slip and
damage photos attach to the receipt. When a dealer disputes a line with a
manufacturer, *which PO was this against* is the whole question.

`attachments` is polymorphic: `entity_type` + `entity_id`, with `document_type`
describing what the paper **is** independently of what it hangs off.

**`entity_id` carries no foreign key.** That is the cost of a polymorphic table.
Deleting a parent row must call `deleteAttachmentsForEntity()` explicitly —
nothing cascades on its own.

Files live in the private `projects-attachments` bucket and are served through
signed URLs (1 hour).

`project_attachments` was folded into this table and **dropped** — it stored the
same concept, differing only in expressing the owner as a hard `project_id` FK.
Legacy rows keep their original `{org}/{project_id}/…` paths; no files moved,
because `file_path` is per-row and the bucket's RLS policy only checks the first
path segment against org membership.

Two behavior changes came with the consolidation:

- **Delete tightened** from "any active member" to "uploader or Owner/Admin".
  Deleting evidence in a vendor dispute should not be casual.
- **`public_url` is gone.** It had stored `''` on every row since the bucket went
  private; reads always overwrote it with a signed URL. The field is now
  `signed_url`, and it is nullable — a file that fails to sign renders as
  unavailable rather than blanking the whole list.

---

## Key files

| Concern | Files |
|---------|-------|
| Pricing math | `src/lib/pricing/calculate.ts` |
| Materialization | `src/lib/pricing/materialize.ts` |
| Sales orders | `src/services/salesOrdersService.ts` |
| Purchase orders | `src/services/vendorPOService.ts` |
| Variance logic | `src/lib/pricing/variance.ts` |
| Fulfillment routing | `src/lib/pricing/fulfillment.ts` |
| Work orders | `src/services/workOrdersService.ts` |
| Discount resolution | `src/lib/pricing/discounts.ts` |
| Pricing types | `src/lib/types/pricing.ts` |
| Companies | `src/services/companiesService.ts`, `src/hooks/queries/useCompanies.ts` |
| Vendors & discounts | `src/services/vendorsService.ts`, `src/hooks/queries/useVendors.ts` |
| Attachments | `src/services/attachmentsService.ts`, `src/hooks/queries/useAttachments.ts` |
| Project files UI | `src/components/features/board/ProjectAttachments.tsx` (now reads `attachments`) |
| Migrations | `supabase/migrations/20260819100000_companies_vendors.sql`, `20260819100001_attachments.sql`, `20260819100002_consolidate_attachments.sql`, `20260819100003_sales_orders.sql`, `20260819100005_vendor_purchase_orders.sql`, `20260819100006_order_line_fulfillment_type.sql`, `20260819100007_work_orders.sql` |
| Tests | `src/test/lib/pricing.test.ts`, `src/test/lib/discounts.test.ts`, `src/test/lib/materialize.test.ts`, `src/test/lib/variance.test.ts`, `src/test/lib/fulfillment.test.ts` |

---

## Known constraints

**Supabase typing is now enforced.** `types.ts` is generated with
`supabase gen types typescript --local` rather than hand-maintained, so every
table carries `Relationships` and the schema declares `CompositeTypes`. Selects
and writes are properly typed instead of collapsing to `never`. Regenerate it
after every migration.

The `as never` casts left in the older back-office services are no longer
load-bearing and can be removed.

**Migration drift.** Regenerating from local revealed three tables the app code
uses that exist in neither the local database nor the migrations:
`form_document_templates`, `quickbooks_online_invoice_sync`, and
`quickbooks_online_connections`. They appear to have been created directly
against the remote project, so `supabase/migrations` does not fully describe
production. Worth reconciling before the next environment is stood up.

**Role vocabulary.** Roles are still Owner / Admin / Member. The back office
needs designer, PM, sales, warehouse, installer, and AP. Expanding the set
touches invitations (`invite_tokens.role` has a CHECK constraint), seat billing,
and RLS across the app — a product decision, not a mechanical one.
`can_view_cost()` is written so that only it changes when the roles land.

**Migrations unexecuted.** Both migrations were written and statically verified
(FK targets, helper functions, and trigger functions all confirmed to exist) but
not run — Docker was unavailable. Run `supabase db reset` before relying on them.
