# Back Office (Contract Furniture Dealers)

Foundation for dealer back-office operations — everything that happens between
"the customer signed" and "the invoice posted". Specification and catalog data
come from the tools dealers already use (CET, Giza, 2020, ProjectMatrix); this
system owns the order lifecycle those tools do not.

> **Status:** Phase 0 (foundations) and the order spine implemented. Purchase
> orders, acknowledgments, receiving, and work orders are not built yet — the
> tables and types below are what they will hang off.

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
| Discount resolution | `src/lib/pricing/discounts.ts` |
| Pricing types | `src/lib/types/pricing.ts` |
| Companies | `src/services/companiesService.ts`, `src/hooks/queries/useCompanies.ts` |
| Vendors & discounts | `src/services/vendorsService.ts`, `src/hooks/queries/useVendors.ts` |
| Attachments | `src/services/attachmentsService.ts`, `src/hooks/queries/useAttachments.ts` |
| Project files UI | `src/components/features/board/ProjectAttachments.tsx` (now reads `attachments`) |
| Migrations | `supabase/migrations/20260819100000_companies_vendors.sql`, `20260819100001_attachments.sql`, `20260819100002_consolidate_attachments.sql`, `20260819100003_sales_orders.sql` |
| Tests | `src/test/lib/pricing.test.ts`, `src/test/lib/discounts.test.ts`, `src/test/lib/materialize.test.ts` |

---

## Known constraints

**Supabase typing is not enforced — reads included.** The hand-maintained
`Database` type omits the `Relationships` key that supabase-js requires on every
table. That fails the `GenericSchema` constraint, which collapses **both**
`Insert`/`Update` **and select results** to `never` across the entire app.
Because `never` is assignable to anything, a select compiles against any shape:

```ts
const { data } = await supabase.from('vendors').select('*');
const wrong: { nope: string }[] | null = data;  // compiles. data is `never`.
```

So the interfaces in these services *describe* rows; they do not *verify* them.
Adding `Relationships` repo-wide surfaces ~125 previously-hidden errors, which is
the real size of the problem. Until that is done deliberately, writes are cast at
the boundary (`as never`), matching `contactsService` and `paymentsService`.

**Role vocabulary.** Roles are still Owner / Admin / Member. The back office
needs designer, PM, sales, warehouse, installer, and AP. Expanding the set
touches invitations (`invite_tokens.role` has a CHECK constraint), seat billing,
and RLS across the app — a product decision, not a mechanical one.
`can_view_cost()` is written so that only it changes when the roles land.

**Migrations unexecuted.** Both migrations were written and statically verified
(FK targets, helper functions, and trigger functions all confirmed to exist) but
not run — Docker was unavailable. Run `supabase db reset` before relying on them.
