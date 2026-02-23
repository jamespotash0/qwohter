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

## TABLE System — Auto-Generated Tables

Use the TABLE system to insert a complete Google Docs table that auto-populates with product/pricing data.

### Syntax

Place the marker where you want the table to appear:

```
{{#TABLE:wallspecs}}
```

### Custom Columns

You can specify which columns to include using the extended syntax:

```
{{#TABLE:wallspecs:Header Label=dataKey,Another Header=dataKey}}
```

This lets you control exactly which columns appear and what the headers say. If no columns are specified, the default columns are used.

**Examples:**

Glass wall project (4 columns):
```
{{#TABLE:wallspecs:Wall=wall,Dimensions=dimensions,Glass Type=glass_type,STC=stc}}
```

Operable wall project with track system (6 columns):
```
{{#TABLE:wallspecs:Wall=wall,Dims=dimensions,STC=stc,Track=track_system,Pass Doors=passDoors,Qty=qty}}
```

Full custom layout:
```
{{#TABLE:wallspecs:Wall=wall,Series=series,Dimensions=dimensions,STC=stc,Finish=finish,Track=track_system,Support=standard_support_systems,Pocket Doors=pocketDoors,Pass Doors=passDoors,Panels=panelCount,Qty=qty}}
```

### Available Table Types

| Table ID | Default Columns | Description |
|----------|---------|-------------|
| `product_catalog` | Name, Manufacturer, Model, Dimensions, STC, Finish, Qty | Product catalog with 30+ fields available via custom columns (see below) |
| `pricing` | Qty, Description, Model #, SKU, Unit Price, Disc (%), Extended | All pricing line items with totals row. Also includes `description`, `manufacturer`, `series` for custom columns. |
| `products` | #, Product, Qty, Unit | Simple product listing |
| `specifications` | Wall, Dimensions, STC, Finish | Basic wall specs (4 columns) |
| `wallspecs` | Wall, Dimensions, STC, Finish, Pocket Doors, Pass Doors, Panels, Qty | Wall-specific specs (legacy — prefer `product_catalog`) |

### Available Data Keys for product_catalog / wallspecs

These keys can be used in the custom column syntax above:

| Key | Description |
|-----|-------------|
| `wall` | Wall type (from product domain) |
| `dimensions` | Formatted dimensions string (e.g., `32' L x 10' H`) |
| `stc` | STC rating |
| `finish` | Finish material |
| `pocketDoors` | Pocket door type |
| `passDoors` | Pass door info (option + type) |
| `panelCount` | Panel count |
| `qty` | Quantity |
| `name` | Product name |
| `alias` | Product alias |
| `manufacturer` | Manufacturer |
| `series` | Series |
| `model` | Model |
| `height` | Height (formatted) |
| `width` | Width (formatted) |
| `wall_height` | Wall height (formatted) |
| `wall_width` | Wall width (formatted) |
| `fireRating` | Fire rating |
| `color` | Color |
| `core` | Core material |
| `face` | Face material |
| `frame` | Frame material |
| `certifications` | Certifications (comma-separated) |
| Any catalog spec key | e.g., `track_system`, `glass_type`, `standard_support_systems` |

### Example

```
Dear {{client.name}},

Below are the product specifications for {{project.name}}:

{{#TABLE:product_catalog}}

Pricing:

{{#TABLE:pricing}}

Total investment: {{pricing.total}}
```

- `product_catalog` generates a table with one row per product, with catalog config fields automatically resolved to human-readable labels.
- `pricing` includes product detail fields (`modelNumber`, `sku`, `description`, `manufacturer`, `series`) that can be used via custom columns:
  ```
  {{#TABLE:pricing:Qty=quantity,Product=name,Model=modelNumber,SKU=sku,Unit Price=unitSellPrice,Extended=lineTotal}}
  ```

---

## Tips

- **Check the Variables Reference panel** — Open it via the brackets icon in the Presentation tab toolbar to see all available variables for your current proposal, including dynamically generated catalog product fields.
- **Catalog field keys are snake_case** — They match the configurator field names exactly (e.g., `track_system`, not `trackSystem`).
- **Label resolution is automatic** — Catalog product codes (like `425MD`) are automatically resolved to human-readable labels (like `425 Multi-Directional`) using the product's specification labels.
- **Unresolved variables** — If a variable can't be resolved, it is replaced with an empty string in BLOCK mode, or left as `{{key}}` for direct alias mode.
- **Case doesn't matter** — `{{wall.STC}}` and `{{wall.stc}}` both work inside BLOCK templates.
