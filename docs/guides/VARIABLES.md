# Template Variables Reference

How to use variable placeholders in Google Docs proposal templates.

---

## Syntax

All variables use double curly braces: `{{variable_key}}`

Variables are **case-insensitive** and **space-insensitive** during resolution (`{{client.name}}` and `{{Client.Name}}` both work).

---

## Static Variables

These are always available regardless of products.

### Project

| Variable | Description |
|----------|-------------|
| `{{project.name}}` | Project name |
| `{{project.location}}` | Project location |
| `{{project.date}}` | Project date |

### Client / Contact

| Variable | Description |
|----------|-------------|
| `{{client.name}}` | Client name |
| `{{client.company}}` | Client company |
| `{{client.email}}` | Client email |
| `{{client.phone}}` | Client phone |
| `{{contact.name}}` | Contact name (alias for client) |

### Organization

| Variable | Description |
|----------|-------------|
| `{{org.name}}` | Your organization name |
| `{{org.address}}` | Organization address |
| `{{org.phone}}` | Organization phone |
| `{{org.email}}` | Organization email |

### Proposal

| Variable | Description |
|----------|-------------|
| `{{proposal.number}}` | Proposal number |
| `{{proposal.date}}` | Proposal date |
| `{{proposal.version}}` | Version number |
| `{{proposal.status}}` | Current status |

### Pricing

| Variable | Description |
|----------|-------------|
| `{{pricing.total}}` | Total price (formatted as currency) |
| `{{pricing.subtotal}}` | Subtotal before tax |
| `{{pricing.tax}}` | Tax amount |
| `{{pricing.discount}}` | Discount amount |

### Lead Times

| Variable | Description |
|----------|-------------|
| `{{leadtimes.total}}` | Total lead time |
| `{{leadtimes.start}}` | Start date |
| `{{leadtimes.end}}` | End date |

### Products (Summary)

| Variable | Description |
|----------|-------------|
| `{{products.count}}` | Number of products |
| `{{products.list}}` | Comma-separated product names |

### Miscellaneous

| Variable | Description |
|----------|-------------|
| `{{misc.current_date}}` | Today's date |
| `{{misc.current_year}}` | Current year |

---

## Product Variables — Direct Alias

Reference a specific product by its alias (assigned when products are added). The alias is visible in the Variables Reference side panel.

**Syntax:** `{{Alias.field_key}}`

**Examples:**
```
{{Wall A.name}}
{{Wall A.manufacturer}}
{{Wall A.track_system}}
{{Partition B.stc}}
```

### Available Fields (AI-Extracted Products)

| Field Key | Description |
|-----------|-------------|
| `name` | Product name |
| `quantity` | Quantity |
| `unit` | Unit of measure |
| `description` | Description |
| `manufacturer` | Manufacturer |
| `type` | Product domain |
| `category` | Product line |
| `series` | Series |
| `model` | Model |
| `height` | Height |
| `width` | Width |
| `length` | Length |
| `thickness` | Thickness |
| `stc` | STC rating |
| `fireRating` | Fire rating |
| `acousticRating` | Acoustic rating |
| `color` | Color |
| `finish` | Finish |
| `trim` | Trim |
| `coreMaterial` | Core material |
| `faceMaterial` | Face material |
| `frameMaterial` | Frame material |
| `frameType` | Frame type |
| `frameMat` | Frame material (hardware) |
| `closureLeft` | Left closure |
| `closureRight` | Right closure |
| `sealTop` | Top seal |
| `sealBottom` | Bottom seal |
| `sealPerimeter` | Perimeter seal |
| `trackType` | Track type |
| `trackWeight` | Track hanging weight |
| `stackConfig` | Stacking configuration |
| `stackDirection` | Stacking direction |
| `panelCount` | Panel count |

### Available Fields (Catalog Products)

Catalog products use **snake_case** field keys matching the product configurator fields. These are generated dynamically based on the product's configuration schema.

Common catalog field keys include:

| Field Key | Description |
|-----------|-------------|
| `track_system` | Track system |
| `support_system` | Support system |
| `panel_skin` | Panel skin material |
| `wall_height` | Wall height |
| `panel_pass` | Panel pass-through configuration |
| `glass_type` | Glass type |
| `stc_rating` | STC rating |
| `operation` | Operation type |

> **Note:** The exact fields depend on the product model's config schema. Check the Variables Reference side panel in the Presentation tab to see all available fields for your specific products.

---

## BLOCK System — Dynamic Product Sections

Use the BLOCK system when you need to support **any number of products** and want template sections to repeat automatically per product.

### Syntax

```
{{#BLOCK:walls}}

{{#TYPE:operable wall}}
The operable wall system uses {{wall.Series}} {{wall.Model}} by {{wall.Manufacturer}}.
Panel dimensions are {{wall.Height}} x {{wall.Width}} with a thickness of {{wall.Thickness}}.
The track system is {{wall.track_system}} with {{wall.support_system}} support.
STC rating: {{wall.STC}}.
{{/TYPE:operable wall}}

{{#TYPE:glass wall}}
The glass wall system features {{wall.Manufacturer}} {{wall.Series}} panels.
Glass type: {{wall.glass_type}}.
{{/TYPE:glass wall}}

{{#TYPE:accordion}}
The accordion partition uses {{wall.Manufacturer}} {{wall.Model}}.
{{/TYPE:accordion}}

{{/BLOCK}}
```

### How It Works

1. **`{{#BLOCK:walls}}`** — Marks the start of a product block section
2. **`{{#TYPE:name}}`** — Defines a template for a specific product type (matched against the product's domain)
3. **`{{wall.field}}`** — References a product field, resolved per-product
4. **`{{/TYPE:name}}`** — Ends the type template
5. **`{{/BLOCK}}`** — Ends the block section

### Multiple Products of Same Type

If your proposal has **2 operable walls**, the `{{#TYPE:operable wall}}` template is duplicated and resolved separately for each one. The output contains two complete paragraphs, one per product.

**Example:** With products "Wall A" (operable wall) and "Wall B" (operable wall):

```
The operable wall system uses Modernfold Acousti-Seal by Modernfold.
Panel dimensions are 20' x 4' with a thickness of 4".
The track system is 425 Multi-Directional with Ceiling Pocket support.
STC rating: 51.

The operable wall system uses Hufcor 4400 by Hufcor.
Panel dimensions are 16' x 3'6" with a thickness of 3.5".
The track system is Standard with Beam Clamp support.
STC rating: 48.
```

### Type Matching

Type matching is **fuzzy** — it normalizes spaces, underscores, and hyphens, and checks if either string contains the other:

| Product Domain | Matches TYPE |
|----------------|-------------|
| `Operable Wall` | `operable wall`, `operable`, `wall` |
| `Glass Wall` | `glass wall`, `glass` |
| `Accordion Partition` | `accordion`, `accordion partition` |

> **Tip:** Use specific type names to avoid accidental matches. `operable wall` is better than just `wall` if you also have glass walls.

### Variable Keys Inside BLOCK

Inside a BLOCK, variables use the `{{wall.key}}` prefix regardless of the actual product type. The available keys are:

**Identity:**
`name`, `quantity`, `unit`, `description`, `alias`, `Manufacturer`, `Product_Domain`, `Product_Line`, `Series`, `Model`

**Dimensions:**
`Height`, `Width`, `Length`, `Thickness`

**Performance:**
`STC`, `Fire_Rating`, `Acoustic_Rating`

**Appearance:**
`Finish_Color`, `Finish_Style`, `Color`, `Finish`, `Trim`

**Materials:**
`Core`, `Face`, `Frame`

**Certifications:**
`Certifications`

**Catalog Specs (snake_case):**
Any configuration field from the product's config schema (e.g., `track_system`, `support_system`, `panel_skin`, `wall_height`, `glass_type`, `stc_rating`, `operation`). These are resolved with human-readable labels automatically.

---

## Combining Approaches

You can use **both** direct alias variables and BLOCK templates in the same document:

```
Dear {{client.name}},

Thank you for your interest in our proposal for {{project.name}}.

{{#BLOCK:walls}}
{{#TYPE:operable wall}}
OPERABLE WALL — {{wall.Manufacturer}} {{wall.Series}}
Panels: {{wall.quantity}} panels, {{wall.Height}} x {{wall.Width}}
Track: {{wall.track_system}}
STC: {{wall.STC}}
{{/TYPE:operable wall}}
{{/BLOCK}}

Total investment: {{pricing.total}}
Estimated lead time: {{leadtimes.total}}
```

---

## TABLE System — Auto-Generated Tables

Use the TABLE system to insert a complete Google Docs table that auto-populates with product/pricing data.

### Syntax

Place the marker where you want the table to appear:

```
{{#TABLE:wallspecs}}
```

### Available Table Types

| Table ID | Columns | Description |
|----------|---------|-------------|
| `pricing` | Qty, Description, Unit Price, Disc (%), Extended | Pricing line items with totals row |
| `products` | #, Product, Qty, Unit | Simple product listing |
| `specifications` | Wall, Dimensions, STC, Finish | Basic wall specs (4 columns) |
| `wallspecs` | Wall, Dimensions, STC, Finish, Pocket Doors, Pass Doors, Panels, Qty | Full wall specs with closures and panel count |

### Example

```
Dear {{client.name}},

Below are the wall specifications for {{project.name}}:

{{#TABLE:wallspecs}}

Total investment: {{pricing.total}}
```

This generates a table with one row per product, with catalog config fields automatically resolved to human-readable labels.

---

## Tips

- **Check the Variables Reference panel** — Open it via the brackets icon in the Presentation tab toolbar to see all available variables for your current proposal, including dynamically generated catalog product fields.
- **Catalog field keys are snake_case** — They match the configurator field names exactly (e.g., `track_system`, not `trackSystem`).
- **Label resolution is automatic** — Catalog product codes (like `425MD`) are automatically resolved to human-readable labels (like `425 Multi-Directional`) using the product's specification labels.
- **Unresolved variables** — If a variable can't be resolved, it is replaced with an empty string in BLOCK mode, or left as `{{key}}` for direct alias mode.
- **Case doesn't matter** — `{{wall.STC}}` and `{{wall.stc}}` both work inside BLOCK templates.
