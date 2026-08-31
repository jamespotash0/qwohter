# Back Office (Contract Furniture Dealers)

Foundation for dealer back-office operations — everything that happens between
"the customer signed" and "the invoice posted". Specification and catalog data
come from the tools dealers already use (CET, Giza, 2020, ProjectMatrix); this
system owns the order lifecycle those tools do not.

> **Status:** The chain runs end to end in the UI — turn a won proposal into an
> order, split it across manufacturers, record what came back, and read the
> variance queue. Receiving, work-order scheduling UI, job costing, and
> specification import are not built yet.
>
> **This system does not compose or transmit purchase orders.** Dealers place
> orders in each manufacturer's own portal, the same way specification lives in
> Giza or CET rather than here. What gets recorded is the split and the result.
> Until acknowledgment ingestion exists, that recording is manual.

---

## The chain

```
spec tool ──SIF──► quote ──► project ──► sales order ──► order lines
                                              │
                                              ├──► manufacturer orders ──► ACK ──► variance
                                              ├──► receipts
                                              ├──► work orders ──► punch
                                              └──► job cost
                                                        │
                             payment_job ──► billing_phase ──► QuickBooks invoice
```

The right-hand end (`payment_jobs` → `billing_phases` → invoice) already exists;
see [BILLING.md](BILLING.md). The middle is what Phase 1 builds.

---

## Screens

There are two, and the split is the whole navigation model: **the job** answers
"where is this one", **Today** answers "what needs me across all of them".

| Screen | Where | What it does |
|--------|-------|--------------|
| Job | `/projects/:id` | One job from won quote to money owed. The stage rail is its navigation. |
| Today | `/today` | Everything across every job that needs a person, worst first. |
| Schedule | `/schedule` | A week of site work by crew. |

An order has no page of its own. `/orders/:id` resolves to the job that owns
it (`OrderRedirect`), and `/orders` redirects to the jobs board — the list of
orders was the list of jobs wearing a different hat.

### The stage rail

`project_progress.stage` is derived from an event log, and the rail is both the
report of it and the tab bar. Seven stages, seven panels, one primary action
each:

| Stage | Panel | The one button |
|-------|-------|----------------|
| Quoted | Order lines | Release to order |
| Released | Purchasing fan-out | Place with manufacturer |
| Ordering | Orders placed | Record acknowledgment |
| Awaiting delivery | Transit | Add shipment |
| Receiving | Dock | Receive product |
| Installing | Site work | Schedule crew |
| Ready to bill | Billing | Create billing schedule |

Two states are shown at once and they are not the same thing: **current** is
where the job is, from the event log, and **selected** is which panel is open.
Looking ahead at billing while a crew is still on site is normal, so the
selection underline and the position marker are drawn differently.

The vocabulary lives in `src/components/common/backoffice/stages.ts`, which
mirrors the view's `CASE` exactly — no stage the view cannot produce. Panels
that are not stages (Lines, Activity, Tasks, Changes, Files) sit in a quieter
row beneath the rail, because they apply to the whole job rather than a step of
it.

Which panel is open lives in the URL (`?view=`, `?order=`), so a link to a job
can point at the thing being discussed. An absent `view` follows the job's own
stage rather than pinning to one.

### Today

Ordered by what it costs to ignore, not by table: damage and cost variance are
money already moving, acknowledgments are money about to, freight is a date the
install schedule depends on, and ready-to-bill is cash sitting uninvoiced. The
counts sit on the segment strip rather than inside each tab — a count only
visible after you click into it is a count nobody sees.

The freight segment reads `shipment_progress.receipt_count` rather than
assuming: guess it wrong and every delivered shipment reads as uncounted, which
is how a queue teaches people to stop reading it.

### Shared primitives

`src/components/common/backoffice/` holds the vocabulary these screens share —
`StageRail`, `StatusChip`, `Callout`, `MoneyTiles`, `DataTable`, `EmptyState`.
Reach for them rather than re-deriving a chip colour or a table layout: the
previous version had four private status colour maps using eight hues for six
meanings, which is decoration that looks like a legend.

`DataTable` is a table from `md` up and a list of cards below it, from one
column definition. That is not polish — receiving happens at a loading dock and
install sign-off happens on a site, both on a phone.

### Recording an order placed in the portal

There is deliberately no PO document and no send path. A dealer places the order
in the manufacturer's portal — often straight from the specification tool — and
records the order number that came back. Building a PDF and emailing it would
duplicate a system the manufacturer already runs, and most dealers would never
use it.

What that recording buys is the acknowledgment check, which is the point of the
whole back office. It needs to know *what was ordered, from whom, at what cost*
— and none of that requires this application to have sent anything.

The acknowledgment dialog lives on the job's **Ordering** stage panel. Lines
pre-fill with what was ordered — an unchanged acknowledgment is the common case
and should not require retyping every figure — and the running variance total
updates as you type, because the number a dealer wants is not *what did they
say* but *what is this costing me*.

### Uploading the acknowledgment

`src/lib/ack/` — **Upload their acknowledgment**, on the acknowledgment dialog.

Manual entry was never going to happen at volume, so the manufacturer's own
export is read instead. Delimited files are handled deterministically today; the
extraction step is separable, so a PDF or an emailed acknowledgment read by a
model produces the same `AckRow[]` and everything downstream is unchanged.

**Matching is the hard part, not extraction.** Manufacturers do not echo a
dealer's line numbers — they send their own sequence, split one ordered line
when it ships from two plants, merge duplicates, and write the part number in a
different shape than the specification tool exported. So rows are matched on
what is stable: the model number normalised hard (`AN-4830`, `an 4830` and
`AN.4830` are one part), then an exact description, then nothing.

Three rules it will not break:

| Rule | Why |
|---|---|
| A line is claimed at most once | Two acknowledgment rows cannot both fill one line |
| Unmatched is reported **both ways** | A row with no home and a line nobody answered are different problems, and one is invisible if only the other is shown |
| Weak matches are shown, never applied | A 60%-similar description is worth showing somebody; it is not worth writing a cost against |

Matching runs best-first across the whole file rather than row by row, so a row
with an exact model match claims its line before a different row's weak
description match can take it.

Nothing is saved by the upload. Figures land in the form and the person who
uploaded the file still presses **Record**, because an acknowledged cost decides
whether the job is profitable.

A row that omits a figure keeps what was ordered rather than becoming zero — an
acknowledgment is usually silent about what did not change. The header ship date
takes the **latest** date across the file, since the job is not ready when the
first carton ships.

> **What is left:** PDF and emailed acknowledgments still need an extraction
> step. The matching, the reporting and the confirmation flow are already in
> place and do not change when it arrives.

---

## Specification import

**Screen:** the proposal editor's **Pricing** tab › Import specification. `src/lib/sif/`

### It enters at the quote, not at the order

For contract office furniture the specification file *is* the job. A designer
works in CET, Giza, 2020 or ProjectMatrix, exports, and that file is the bill of
materials the client is about to be quoted from. So it lands on the **quote**,
and the same lines carry through:

```
SIF export
  → parseSpecFile + confirmed column mapping
  → rowsToOrderLines            (neutral spec line; cost resolved from the file)
  → specLinesToPricingSections  (proposal pricing sections, one per area)
  → the client's proposal
  → Release to order → materialize.ts → order lines
  → revised SIF → diff.ts
```

The reason it cannot enter at the order is the money. **SIF carries list price,
not dealer cost.** Cost is list less the discount for that manufacturer and
series — `list_down` mode — so a file that only reaches an order has already
skipped the step where the dealer's margin is set, and the quote must then have
been built from some other description of the same job.

There is deliberately **one** import destination. A second path landing straight
on an order produces a job with no proposal behind it: no client document, no
win/loss record, and two descriptions of the same lines that can disagree.

`LineSpecMetadata` on a pricing line is what makes this work — manufacturer,
series, option string, area, phase and `sourceLineNumber` are carried from the
file through the quote to the order untouched, which is also what lets a revised
file be diffed against either one later.

Lines that came in at list with no discount, and lines naming no manufacturer,
are counted and reported after the import rather than corrected silently. Both
are ways an imported quote is quietly wrong: the first reads as pure margin, and
the second cannot be ordered at all.

### The parser

Deliberately **tolerant rather than a parser for one dialect.** SIF is a family
of formats, not a single one — it varies by tool, by version, and by which
catalog produced it — so a parser hard-coded to one layout silently mis-reads
every other. The importer detects the shape, shows what it found, and asks a
person to confirm the column mapping.

That mapping step is not a fallback. A dealer's first import is also how they
discover their tool exports something unexpected, and finding out then is far
cheaper than finding out after 500 lines have landed wrong.

### What it gets right, and why it matters

| Behaviour | Why |
|---|---|
| Quoted fields survive splitting | `"48W, 30D, LH"` is **one** field. Split it and the factory builds a different desk |
| Delimiter chosen by *consistency*, not frequency | A tab file full of prose commas has more commas than tabs |
| `List Price` beats a bare `Price` column | Mapping the wrong one makes every downstream margin wrong |
| Each column claimed once | A file with two `Part` columns cannot map both to the same field |
| `$1,234.56`, `55%`, `(250.00)` all parse | Exports are shaped for spreadsheets, not machines |
| Short rows padded, not dropped | Exporters routinely omit a trailing empty field |

### Cost resolution, and the failure it refuses to hide

In order of what the file actually said:

1. an explicit cost column
2. list price less a discount **the file carried**
3. list price less a discount **the importer was given**

If none apply, the line imports at list and **says so** in the rejected list.
A line imported at zero or list cost reads as pure margin, and a job quoted off
it loses money in a way nobody notices until the invoice — so nothing is ever
dropped or priced silently. `parseNumber` returns `null`, never `0`, for the
same reason.

Imported lines route as `purchase`: a specification file describes product.
Labor and freight are the dealer's own additions, never exported by the spec
tool.

> **Still needed:** a real `.sif` export from each tool a target dealer uses, as
> a golden-file fixture. The reference PDF in `docs/reference/` is Herman
> Miller's catalog *release notes* — lead-time flags, finish changes, catalog
> codes — not an export and not a format spec. It does confirm SIF's three-file
> anatomy (Top `SL`, Key `PD`, Opt `OD`) and that Herman Miller processes POs
> through Omni Order Manager, which is the portal thesis this back office is
> built on.

---

## Specification revisions

**Screen:** an order's **Compare revision** action. `src/lib/sif/diff.ts`

The designer revises after the quote is signed and nobody can tell which of 520
lines moved, so everyone re-reads the whole file — or nobody does, which is what
actually happens.

### Matching is the whole difficulty

Specification tools **renumber on export**, so identity cannot rest on position.
Matched in order of how much a match can be trusted:

| Pass | Key | Means |
|------|-----|-------|
| 1 | `source_line_number` | The tool's own identity, when stable |
| 2 | part + options | The same product, configured the same way |
| 3 | part alone | The same product, reconfigured |

Each incoming line claims **at most one** existing line and vice versa, so a job
with forty identical task chairs cannot collapse them onto a single match.

### Classification, and why the ranking

`options` outranks `cost`, which outranks `quantity`. A different configuration
is a different product; a price move changes margin without changing what
arrives on the truck; a quantity move is the one everybody already notices.

### Two things it refuses to do

**It will not touch product already on a manufacturer order.** Those changes
lead the list, are excluded from the apply, and are refused again by
`apply_spec_revision` as a backstop — verified: asked to both update and remove
an ordered line, the function returns `refused: 2` and the line is untouched.
Editing a line the factory has been told to build destroys the record of what
was ordered; the honest routes are a change order or a cancellation.

**It will not remove lines the dealer added themselves.** Install labor,
freight, and pass-through costs never appear in a specification export, so their
absence means nothing. This was caught in testing against real data, where the
first diff cheerfully proposed cancelling *"Delivery & Installation"* — a crew's
own work — on every revision. Only `purchase` lines participate in removal
detection; unknown routing is treated as spec-sourced, since a person reviews
before anything applies.

### Applying

`apply_spec_revision` does it in one call, because a half-applied revision is
worse than none: an order where twelve lines moved and eight did not reconciles
against neither version of the specification.

Removals **cancel rather than delete** — a removed line may carry fulfillment
events, attachments, or a place in someone's memory of the job. And line numbers
are **never resequenced**, because a line number is what a factory and a
warehouse quote back at you.

---

## Order numbers

Allocated by `allocate_document_number(org, type)`, which increments a counter
under a row lock. Deliberately **not** the read-max-and-add-one approach the
proposal path uses: that races, and two people creating an order in the same
second get the same number. A gap in a sequence is a curiosity; a duplicate
order number is a dispute, because that number travels onto purchase orders,
invoices, and the customer's own paperwork.

The function returns the **number**, not the formatted string — formatting stays
in `numberingConfigService` so prefixes and padding have one definition rather
than a SQL copy that can disagree with what the settings screen previews.

`SECURITY DEFINER`, because bumping the counter writes to `organizations`, which
RLS restricts to Owner/Admin — any active member may create an order, so the
function checks membership itself. **That check is the entire security boundary
and must not be removed.**

Allocation failure is non-fatal: an order saves without a number rather than
losing the work. A caller-supplied number always wins, so an imported order
keeps the number it arrived with.

---

## Order status is derived

`sales_orders.status` is set once at creation and immediately starts lying — a
half-received job still reads `Released` because nobody went back to change it,
and the board a PM scans every morning quietly stops meaning anything.

Read **`sales_order_progress.derived_status`** instead. It is computed from
`order_line_events`, in the same spirit as the fulfillment quantities: observed,
never remembered.

A view rather than a trigger, deliberately. A trigger would have to fire on
every event insert, walk every sibling line, and write back to `sales_orders` —
turning an append-only insert into a multi-table write and making the fan-out's
bulk event insertion quadratic. Reading is cheap; writing on every event is not.

Two statuses stay manual and pass through untouched:

| Status | Why it is not derived |
|--------|----------------------|
| `Draft` | Nothing has happened yet, so events cannot tell it from `Released` |
| `Cancelled` | A decision, not an observation. Deriving over it would resurrect a cancelled job |

Only **purchasable** quantity counts toward `Ordered`. The dealer's own labor is
never bought, so counting it as "not yet ordered" would pin an order at
`Partially Ordered` forever.

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

Lines naming no manufacturer are still created — that is real scope the customer
bought — but cannot be grouped into an order with anyone until the specification
names who supplies them. Call `previewOrderFromProposal()` first and show
`summarizeMaterialization()`: a dealer should see what the order contains, and
which lines name nobody, before it exists rather than after.

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

`planFanOut()` reports four buckets accordingly: manufacturer groups ready to
order, `unassignedLines` (purchasable but naming nobody — a real blocker),
`unroutedLines` (fixed in the form's section settings), and `notPurchased` (own
labor and pass-throughs, shown so the picture is complete without implying a
problem).

---

## Manufacturer orders and the fan-out

One customer order splits into N manufacturer orders — a 1,200-line job might be
six orders to six factories, each acknowledged, shipped, and invoiced on its own
schedule.

Lines group by `manufacturer_name`, which is **text carried from the
specification**. There is no vendor account to look up, because nothing here
needs an address to send to. A line naming no manufacturer cannot be grouped
with anyone, and that is reported as a specification gap rather than a setup
one.

`po_lines` **reference** order lines rather than duplicating them. An order line
is what was sold; a PO line is a claim on some of its quantity. Partial ordering
is normal, so `planFanOut()` reads outstanding quantity from
`order_line_fulfillment` and is safe to re-run as a job is released in phases.

A line only flips to `Ordered` once its **full** quantity is on an order. Releasing
12 of 20 leaves it `Open`, because the remaining 8 still have to be bought —
flagging it early would hide them from the next fan-out.

Issuing goes through `create_vendor_po_with_lines`, which writes the header, its
lines, and one `ordered` event per line together. Unit cost is read from the
order line **inside** the function — what the dealer commits to buy at is not the
client's to assert.

`fanOutPurchaseOrders()` records each manufacturer's order independently: one
failing does not roll back the rest, and failures come back named so the caller
can say exactly which was not recorded. The portal's own order number is passed
per manufacturer, and may be filled in later — a dealer can record the split
before placing.

### The variance queue

**Screen:** the **Acknowledgments** and **Cost variance** segments of Today
(`/today?q=acks`, `/today?q=variance`). Both read one query and differ only by
filter, so their counts cannot drift apart. Rows are ranked unanswered-first and
then by size of the difference; matched lines are excluded by default because
they are the healthy majority and showing them buries the exceptions.

State is encoded in form as well as number: a severity stripe down the left edge
and a status pill, so the rows that matter are findable without reading every
figure. Overcharges are red, credits green — a manufacturer honouring a lower
price is good news and should not be painted as a problem.


`po_lines` carries both the price ordered at and the price acknowledged. The
acknowledged columns stay `NULL` until an acknowledgment arrives, which is what
separates *not yet acknowledged* from *acknowledged unchanged*.

**The comparison is against the cost the quote was built on**, not against what
was recorded as placed. Since orders go out through the manufacturer's portal,
*"did the factory honour our paperwork"* is not a question this application is
entitled to ask — but *"did the cost I quoted survive contact with the real
order"* is, and it is the one that costs a dealer money. `po_line_variance`
exposes both:

| Column | Compares acknowledged cost against | Answers |
|--------|-----------------------------------|---------|
| `cost_variance` | what was recorded as placed | did I record this correctly |
| `quoted_cost_variance` | the cost the quote was built on | **is this job still profitable** |

They are equal until an order line is re-priced after placement, which is
exactly when the difference starts to matter. `varianceAmount()` prefers the
quoted figure and falls back to the recorded one, so older rows still summarize
rather than silently reporting no exposure.

`cost_variance` is a **generated column**, so it cannot drift from its inputs.
The view classifies each line as `awaiting_ack`, `match`, `price`, `date`, or
`price_and_date`, and `summarizeVariance()` produces the headline: *"12 awaiting
acknowledgment, 4 with variances totalling $8,400, worst slip 21 days."*

Credits net against overcharges in the exposure figure — a manufacturer
honouring a lower price is real money back. But the queue *sorts* by magnitude,
so a large credit is as visible as a large overcharge; both warrant a look.

---

## Shipments and carrier tracking

`vendor_po → shipment → shipment_lines → order_line_events ('shipped')`

Between "the factory acknowledged it" and "it is on our dock" there is a three-
to-six week hole. A dealer closes it by phone: call the factory, get a PRO
number, call the freight line, read a website, write the date on a sticky note.
Shipments close that hole.

### A shipment is not a receipt

The rule the whole feature turns on, and the sibling of the damage rule above:

> **A carrier saying "Delivered" means the truck stopped at the address.** It
> does not mean anyone counted what came off it, and it does not mean the
> product is usable.

So a `delivered` tracking status writes **no** `received` events. It raises
`shipment_progress.awaiting_receipt` and waits for a human. A job that reads
complete before anyone opened a box is exactly what this spine exists to
prevent.

### Observed vs. entered

Two kinds of field live on a shipment, written by different people:

| Written by a human | Written only by the tracking functions |
|--------------------|----------------------------------------|
| `vendor_po_id`, `carrier_code`, `carrier_name` | `tracking_status`, `tracking_status_detail` |
| `tracking_number`, `pro_number`, `bill_of_lading` | `tracking_location`, `estimated_delivery_date` |
| `ship_date`, `piece_count`, `weight_lbs`, `notes` | `delivered_at`, `last_checked_at`, `tracking_error` |

`apply_tracking_update` is `SECURITY DEFINER` and granted to `service_role`
only — explicitly revoked from `authenticated`. The moment a person can type
`Delivered`, "delivered" stops meaning "the carrier scanned it" and the record
is worthless in a freight claim. `shipment_tracking_events` has a SELECT policy
and no others, for the same reason.

`updateShipment()` in the service accepts only the left-hand column. The type is
a `Pick`, not a `Partial<Shipment>`.

### Freight identity is two numbers

Parcel has a tracking number. LTL has a **PRO number** and a bill of lading, and
the PRO is what the freight line's API actually answers to. Storing one text
field could not track a single pallet. Both are stored, and the lookup prefers
the PRO.

### Carriers with nobody to ask

An own truck, an installer, a white-glove delivery agent — `carrier_code` is
`own-truck` or `delivery-agent`, `tracking_provider` is `manual`, and the status
is moved by hand. The `shipments_identifiable` CHECK exempts manual carriers
from needing a number, because demanding one is how `N/A` ends up in a tracking
field. The poller skips them and the UI never shows them as stale.

### The provider is pluggable

`TRACKING_PROVIDER` selects it; the adapters live in
`supabase/functions/_shared/tracking/`. AfterShip is the default because it is
tracking-*only* and covers the LTL freight lines most contract furniture
actually moves on. EasyPost is the alternate, priced per tracker. Provider
statuses are normalized in the adapter and never reach the client.

The provider's identifiers are stored per shipment (`tracking_provider`,
`provider_tracking_id`), so switching vendors is a secret change, not a
migration.

### Polling cadence

`shipments_due_for_tracking()` is the work queue, and the cadence varies by
status because the information does:

| Status | Re-checked after |
|--------|------------------|
| `out_for_delivery` | 1 hour |
| `attempt_failed` | 2 hours |
| `in_transit`, `available_for_pickup` | 4 hours |
| `exception` | 6 hours |
| `pending`, `info_received` | 12 hours |
| `delivered` | 24 hours, for 14 days |

Delivered shipments keep getting checked for a fortnight: damage exceptions and
re-deliveries land *after* the delivery scan, and that late exception is the
most expensive thing a dealer can miss. Polling stops entirely once
`qty_uncounted` reaches zero, or when the carrier reports `expired`.

`refresh-shipment-tracking` runs hourly via pg_cron; the queue function, not the
schedule, is what keeps the quota from being spent on freight nobody is waiting
for.

### What needs a human

`describeTracking()` in `src/lib/tracking/status.ts` ranks shipments by what
costs the most to miss, not by date:

1. `exception` — the carrier flagged it, or a delivery attempt failed
2. `uncounted` — delivered, and no receipt recorded against it
3. `late` — past its ETA and not delivered
4. `unreachable` — the last lookup failed, so this is the *absence* of news

Staleness is separate: a non-manual shipment unchecked for over 24 hours is
marked stale rather than presented as current.

### Receiving against a shipment

`receipts.shipment_id` closes the loop. When receiving is opened from a tracked
shipment, `ReceiveDialog` scopes its lines to that shipment's manifest — the
tightest scope there is, narrower than everything the manufacturer still owes.

The manifest itself is optional throughout. A tracking number that arrived by
email with no line list is still worth watching, and refusing to save one until
someone types quantities is how tracking numbers end up in a spreadsheet.

---

## Receiving

`vendor_po → receipt → receipt_lines → order_line_events ('received')`

A receipt is a real event in the world — a truck, on a date, with a bill of
lading — so it gets a header rather than being a loose pile of events. That
header is what a freight claim is filed against and what the packing slip
attaches to.

### Damaged product is not received

The distinction the whole feature turns on:

> **`quantity_received` means USABLE product.** Damage is recorded beside it and
> deliberately does **not** count as received, because the line still needs that
> quantity delivered.

Recording 10 received with 2 damaged would report the line complete while a crew
stands in front of two broken chairs. Verified: receiving 380 of 400 with 20
damaged leaves `qty_to_receive` at 20.

There is deliberately **no `damaged` event type**. Quantities in the event log
answer "how much good product exists"; damage is a property of the delivery that
produced it. Damage discovered *later*, after a clean receipt, is recorded the
way every other correction is — a negative `received` event, which the
append-only design already supports.

Over-receiving is allowed. Manufacturers ship overages, and a clerk must be able
to record what is physically on the dock rather than what the paperwork
expected. `qty_to_receive` floors at zero so an overage never becomes negative
outstanding work.

### Scoping is automatic, not the caller's job

`ReceiveDialog` scopes its lines to the manufacturer order being received
against, derived from `po_lines` rather than passed in. Showing every
outstanding line let a clerk record Steelcase product against a Haworth
delivery — which saved cleanly, read as progress, and left the Steelcase order
looking untouched while its product sat in the warehouse. That bug was found in
browser testing and is why the scoping lives inside the component.

Totals follow the **visible** lines, never the accumulated entry map: the scope
narrows once the order's lines load, and seeding only ever adds keys. See
`src/lib/pricing/receiving.ts`, extracted specifically so that rule is testable.

### Derived receiving status

`vendor_po_progress.derived_status` — from the portal number, acknowledgments,
and receipts.

One rule does **not** transfer from `sales_order_progress`, and copying it was a
bug. A sales order is genuinely a draft until released, so `Draft` passes
through there as a decision. A manufacturer order is different: the fan-out
creates every one as `Draft` and no screen moves them on, so passing it through
meant an order placed, acknowledged, and fully received still read `Draft`.
Here `Draft` means no portal number and nothing recorded; evidence outranks it
everywhere else, and only `Cancelled` is absolute.

---

## Scheduling

**Screen:** `/schedule` — a week of site work by crew.

This is the screen that decides whether an install day happens. The two most
expensive routine mistakes a dealer makes are sending a crew to a building that
is not ready, and sending two crews to the same place because a spreadsheet was
out of date.

**The second one is impossible, not discouraged.** Crews are held against
overlapping bookings by a Postgres exclusion constraint, so the UI cannot create
one even if it tries. Verified: a second booking overlapping the same crew is
refused by `work_orders_no_crew_double_booking`, while a next-day booking on the
same crew is accepted. The service translates that rejection into
`CrewDoubleBookedError` so the dialog names the crew rather than a constraint.

**Site access is on the card, not behind a click.** Dock hours, elevator
reservations, and COI requirements are why a crew gets turned away at the door,
and a work order missing them is flagged in amber on the board. A detail a
dispatcher has to go looking for is one they will not check.

Subcontracted work gets its own lane rather than being dropped — it has no
`crew_id`, but it still occupies a day on site and still needs the dock.

Crews live in **Settings › Crews**. `hourly_cost` is the *burdened* rate —
wages, truck, insurance, overhead — because it is the cost side of every
self-performed line and job costing is wrong by whatever it is understated by.
An unset rate renders as "Not set", never as $0.00.

`WORK_TYPES` in the scheduling dialog is typed as `WorkType`, so the compiler
holds it against the database CHECK constraint. An earlier hand-written version
had `'Install'`, which is not a valid value — every save would have been
rejected at runtime.

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

## The calendar holds everything dated

`src/services/calendarService.ts` › `fetchAllCalendarItems`, layer chips in
`CalendarLayerFilter`.

An install date depends on a delivery date which depends on a factory's
confirmed ship date. Reading those off three screens is how a crew gets booked
for a week when the product lands in the next one, so all three are layers on
one surface alongside proposals, reminders, tasks and events.

| Layer | Source | Meaning |
|---|---|---|
| Site work | `work_orders.scheduled_start` | A crew booked onto a day. Timed, not all-day |
| Delivery | `shipments.estimated_delivery_date` | What the carrier currently estimates |
| Factory ship date | `vendor_pos.acknowledged_ship_date` | A commitment somebody made |

The last two are deliberately separate layers. One is an observation a carrier
reported and the other is a promise a factory made, and the gap between them is
where a schedule goes wrong.

Delivered shipments are excluded — an ETA that already happened is history, and
leaving it on the calendar makes a busy week look busier than it is.

Every layer is on by default; a calendar that hides a delivery date until you
find the right toggle is the two-calendar problem again in one page. Counts on
the chips come from the unfiltered set, so a layer switched off still says how
much it is hiding.

Each source swallows its own error and returns an empty list, so one
unavailable table degrades that layer rather than emptying the calendar.

> **What is left:** Schedule (`/schedule`) still owns the crew × week grid.
> That is a genuinely different layout from a time-of-day calendar — crew lanes
> against days, with the database refusing a double-booking — so it has not been
> folded in. The data behind it is now on the calendar either way.

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
nothing to show for it. The manufacturer name on the line *is* the identity, and
a series is matched by name — normalized for case and whitespace, because that
text is hand-entered upstream.

The catalog hierarchy that used to exist (domains, manufacturers, lines, series,
models, config schemas, option value sets, business rules) was removed outright —
9 tables, 2 views, 4 functions, and 24 source files.

The flat product library that replaced it has now gone the same way. A proposal
takes products two ways and no others:

| Way in | What it is |
|---|---|
| **Manual** | Type the line — name, model, SKU, description |
| **Upload** | Extraction reads a quote sheet or spec document, and you check the result before it lands |

Picking from a saved list was a third way in that made the same argument the
hierarchy did: the specification tool has already resolved the part number, the
options and the list price, so a curated list here is another price book to keep
current. Proposals written while it existed still carry lines sourced from it —
they render as before and edit through the ordinary product editor, because
there is no library left to re-pick them from.

The `products` table and its page remain for the dealer's own labor, freight and
ancillary items; they are simply no longer a source for a proposal line.

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
There is deliberately **no matching table for who you buy from**. An address
book exists to address a document, and this system sends none — so it would be
pure setup cost, wrong within a quarter, and a wall in front of the door on day
one. Manufacturers travel as text on the line, exactly as the specification tool
spelled them.

`contacts.company_id` links a person to a company. It supersedes the free-text
`contacts.company_name`, which is retained as the pre-migration value and as the
fallback label for unlinked contacts.

Companies **deactivate rather than delete** by default — order history
references them. Deletion is an Owner/Admin action.

---

## Observed discount rates

A dealer's discount off list is **not reference data anyone should type in**.
Project pricing is negotiated per job with the rep, promos move quarterly, and
program tiers change — a standing schedule is wrong within a quarter, and a
stale one is worse than none because it silently disagrees with the quote the
customer signed.

### Three cost numbers, and only one is evidence

| | Cost | Source | What it is |
|---|------|--------|-----------|
| 1 | **Assumed** | list × the multiplier configured in Giza / CET / 2020 | A guess, only as fresh as whoever last maintained that table |
| 2 | **Actual** | the manufacturer's portal at placement | Real current discount — promos, project pricing, program tier |
| 3 | **Final** | the acknowledgment, then the invoice | What you actually pay |

The quote is built on **(1)**. Margin is decided by **(3)**.

`observed_vendor_discounts` therefore reads **acknowledged** cost. An earlier
version inferred the rate from `order_lines.unit_cost ÷ list_price` and was
**circular**: `unit_cost` is materialized from the proposal, the proposal was
priced from the specification, and the specification tool computed it by
applying the dealer's own multiplier to list. The view read back the assumption
and reported it as an observation — with false authority, and most confidently
in exactly the case where the assumption had gone stale.

### What that turns the feature into

A per-line curiosity becomes a standing, systemic finding:

> **Your specification tool assumes 55% off Steelcase Series 1. The last 14
> acknowledged lines came in at 48%. Every quote you write is 7 points
> optimistic.**

That is drift in the dealer's own configuration, quietly costing margin on every
job until somebody notices — and the fix is one number in Giza, not a
renegotiation. Both figures sit on the same row so the gap is a subtraction, not
a join:

```sql
discount_percent          -- what manufacturers acknowledged  (evidence)
assumed_discount_percent  -- what the quote was built on       (assumption)
drift_percent             -- assumed − acknowledged; positive = optimistic
min/max_discount_percent  -- the envelope of acknowledged rates
line_count                -- how much evidence backs it
```

Rates are weighted by extended list value deliberately: an unweighted average
would let one $40 accessory count as much as a $12,000 casegoods run.

Lines with no acknowledgment contribute nothing, so a dealer who has recorded no
acks gets an **empty view** — which correctly reads as *no evidence* rather than
*no drift*.

### The drift screen

`findDriftingRates()` is surfaced as Today's **Rate drift** segment
(`/today?q=drift`). It reads
*"you quote 55%, they give 48%, 7 points across 7 lines"* per manufacturer and
series.

Three states, deliberately distinct:

| State | What it says |
|-------|--------------|
| No acknowledged costs | "Nothing to measure against" — **not** "no drift" |
| Rates agree | Confirms across N combinations |
| Drift found | The table, worst first, severity down the edge |

The first is the one that matters: saying everything is fine when there is no
evidence would be the most expensive kind of wrong.

### Two readings of the same data

`findDriftingRates()` surfaces the systemic finding: series whose config has
drifted, worst first. Its bar is deliberately higher than the per-line check (5
lines, 2 percentage points) because it asserts something about the dealer's
setup rather than about one line.

`detectDiscountAnomaly()` checks a single line's **quoted** discount against the
**acknowledged** envelope — *"is what we are about to promise the customer
consistent with what this factory actually charges?"* It compares against
min/max rather than the mean, because real pricing varies across a series and
flagging every line that differs from average would flag most of them. Two
guards stop it crying wolf: `tolerancePercent` (default 1pp) and `minLineCount`
(default 3) — one previous order is a coincidence, not a pattern.

### Matching

`findObservedRate()` resolves most-specific-first, and the **manufacturer must
always match** — an observation about Steelcase says nothing about Haworth, so
unlike a hand-entered agreement there is no "any manufacturer" tier.

| Tier | Matches |
|------|---------|
| `series + contract` | This series, under this contract |
| `series` | This series, any contract |
| `contract` | Any series, under this contract |
| `manufacturer` | Anything from them |

Text is compared trimmed and lowercased, because specification exports deliver
it with inconsistent casing.

### null is not zero

`lineDiscountPercent()` returns `null` when **no discount can be inferred** — a
line with no list price (labor, freight, a pass-through cost) has no discount,
which is a different statement from "bought at list". It must never be coerced
to `0`. `findDriftingRates()` applies the same rule to a missing assumed rate:
absent evidence is not evidence of agreement.

Interpretation lives in `src/lib/pricing/observed.ts` as pure functions; the
view only aggregates.

---

## Cost visibility

**There is none, deliberately.** Cost columns live on `order_lines` and any
active member can read them.

At a dealer, everyone in the office needs cost: the AE quotes the job, the
designer sees list and discount in the specification tool, and the PM
reconciles acknowledgments against cost — which is this whole back office. The
only group that should not see it is field crews, and the install app that
would have given them logins was cut.

The `can_view_cost()` predicate that used to sit here was removed. Nothing ever
called it, and its comment claimed to be the single source of truth for buy-side
visibility while no policy enforced it — a boundary that exists only in
documentation is worse than none. See
[SECURITY.md](../architecture/SECURITY.md#cost--margin-visibility).

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
  Deleting evidence in a manufacturer dispute should not be casual.
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
| Manufacturer orders | `src/services/vendorPOService.ts` |
| Variance logic | `src/lib/pricing/variance.ts` |
| Fulfillment routing | `src/lib/pricing/fulfillment.ts` |
| Work orders | `src/services/workOrdersService.ts` |
| Back office primitives | `src/components/common/backoffice/` (`stages.ts`, `tones.ts`, `StageRail`, `StatusChip`, `Callout`, `MoneyTiles`, `DataTable`, `EmptyState`) |
| Job page | `src/pages/ProjectDetail.tsx`, `src/components/features/projects/job/` |
| Today queue | `src/pages/Today.tsx`, `src/components/features/today/` |
| Variance UI | `src/components/features/variance/VarianceTable.tsx`, `RateDriftPanel.tsx` |
| Spec import (quote) | `src/lib/sif/toPricing.ts`, `src/features/proposals/components/tabs/pricing/useSpecImport.ts` |
| Spec import UI | `src/components/features/orders/ImportSpecDialog.tsx` (shared: parses, maps, previews) |
| Order deep link | `src/pages/OrderRedirect.tsx` |
| Observed discount rates | `src/lib/pricing/observed.ts` |
| Pricing types | `src/lib/types/pricing.ts` |
| Companies | `src/services/companiesService.ts`, `src/hooks/queries/useCompanies.ts` |
| Companies UI | `src/pages/Companies.tsx`, `src/components/features/companies/CompanyDialog.tsx` |
| Acknowledgment ingestion | `src/lib/ack/` (`match.ts`, `parse.ts`, `ingest.ts`) |
| Attachments | `src/services/attachmentsService.ts`, `src/hooks/queries/useAttachments.ts` |
| Project files UI | `src/components/features/board/ProjectAttachments.tsx` (now reads `attachments`) |
| Attachments UI | `src/components/features/attachments/EntityAttachments.tsx` |
| Receiving | `src/services/receiptsService.ts`, `src/hooks/queries/useReceipts.ts`, `src/lib/pricing/receiving.ts` |
| Shipments | `src/services/shipmentsService.ts`, `src/hooks/queries/useShipments.ts`, `src/lib/tracking/` |
| Shipment UI | `src/components/features/orders/ShipmentDialog.tsx`, `ShipmentsPanel.tsx`, `TrackingTimeline.tsx` |
| Tracking adapters | `supabase/functions/_shared/tracking/` (`provider.ts`, `aftership.ts`, `easypost.ts`, `carriers.ts`) |
| Tracking functions | `supabase/functions/track-shipment/`, `refresh-shipment-tracking/`, `tracking-webhook/` |
| Migration | `supabase/migrations/20260819100000_dealer_back_office.sql` (the eighteen incremental files consolidated into one) |
| Tests | `src/test/lib/pricing.test.ts`, `src/test/lib/observed.test.ts`, `src/test/lib/materialize.test.ts`, `src/test/lib/variance.test.ts`, `src/test/lib/fulfillment.test.ts`, `src/test/lib/tracking.test.ts`, `src/test/lib/jobModel.test.ts`, `src/test/lib/toPricing.test.ts`, `src/test/lib/ack.test.ts` |

---

## Known constraints

**Supabase typing is now enforced.** `types.ts` is generated with
`supabase gen types typescript --local` rather than hand-maintained, so every
table carries `Relationships` and the schema declares `CompositeTypes`. Selects
and writes are properly typed instead of collapsing to `never`. Regenerate it
after every migration.

The `as never` casts left in the older back-office services are no longer
load-bearing and can be removed.

**Migration drift.** Regenerating from local revealed tables the app code uses
that exist in neither the local database nor the migrations
(`quickbooks_online_invoice_sync`, `quickbooks_online_connections`). They appear
to have been created directly against the remote project, so
`supabase/migrations` does not fully describe production. Worth reconciling
before the next environment is stood up.

**Role vocabulary.** Roles are still Owner / Admin / Member. The back office
needs designer, PM, sales, warehouse, installer, and AP. Expanding the set
touches invitations (`invite_tokens.role` has a CHECK constraint), seat billing,
and RLS across the app — a product decision, not a mechanical one.
Cost visibility is no longer gated — see the section above for why.

**The vendor address book was removed by rewriting history, not reversing it.**
The migrations that created `vendors` and `vendor_discounts` were edited in
place, because in the environments that matter those tables were never created —
reversing something that never existed is archaeology, and a hard `DROP` would
fail outright. `20260820100000_observed_discounts.sql` carries a fully guarded
cleanup block for any database that *did* get them; it is a no-op everywhere
else. Every migration has been run from scratch via `supabase db reset`.

**Acknowledgment ingestion is the missing piece.** Everything in the order spine
exists to make it possible, but until a forwarded acknowledgment can be parsed,
the variance queue depends on manual entry — which is the one thing dealers
reliably will not do. This is the highest-value unbuilt feature here.
