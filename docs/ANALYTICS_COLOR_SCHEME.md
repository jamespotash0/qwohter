# Analytics Color Scheme - Matching Landing Page

## Your Actual Brand Colors (From Landing Page)

### Primary Colors
- **Primary/Accent**: `#EE6C4D` - Coral/salmon pink (warm, energetic)
- **Primary Hover**: `#D85B3E` - Darker coral
- **Primary Light**: `#F7897566` - 40% opacity for backgrounds

### Backgrounds
- **Dark**: `#20201F` - Very dark gray (almost black) - 80% usage
- **Light**: `#F7F2E9` - Warm cream/beige (alternating sections)

### For Analytics Dashboard

**Background Strategy:**
- Main background: `#FFFFFF` (white) or `#F9FAFB` (very light gray)
- Cards: White with subtle shadows
- Accent colors: Use coral `#EE6C4D` for primary metrics
- Supporting colors: Blue, green, purple for different metric types

**Color Palette for Analytics:**
```css
/* Primary Analytics Color (Revenue, Main Metrics) */
--analytics-primary: #EE6C4D;           /* Your brand coral */
--analytics-primary-light: #FEF3F1;     /* Very light coral for backgrounds */
--analytics-primary-dark: #D85B3E;      /* Darker for emphasis */

/* Success/Growth (Green) */
--analytics-success: #10B981;           /* Emerald green */
--analytics-success-light: #D1FAE5;     /* Light green background */

/* Info/Neutral (Blue) */
--analytics-info: #3B82F6;              /* Bright blue */
--analytics-info-light: #DBEAFE;        /* Light blue background */

/* Warning (Amber) */
--analytics-warning: #F59E0B;           /* Amber */
--analytics-warning-light: #FEF3C7;     /* Light amber background */

/* Danger/Loss (Red) */
--analytics-danger: #EF4444;            /* Red */
--analytics-danger-light: #FEE2E2;      /* Light red background */
```

**Usage:**
- Revenue metrics → Coral (#EE6C4D)
- Win rate/growth → Green (#10B981)
- Quotes/counts → Blue (#3B82F6)
- Warnings → Amber (#F59E0B)
- Losses → Red (#EF4444)

**This creates a cohesive look where analytics feels like an extension of your landing page!**
