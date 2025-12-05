# Deprecated Files

This folder contains legacy code that has been superseded by the new form-builder and proposal system.

## Why These Were Deprecated

The application has transitioned from:
- **Hardcoded quote forms** → **Dynamic form-builder system**
- **Quote-centric architecture** → **Proposal-centric architecture**
- **Static templates** → **User-defined document templates**

## Contents

### `/pages/`
- `NewQuote.tsx` - Old quote creation page (use `/proposals/new`)
- `QuoteEdit.tsx` - Old quote editing page (use `/proposals/:id/edit`)
- `QuoteEditIncomplete.tsx` - Incomplete quote handler
- `QuotesFormBuilder.tsx` - Old quotes listing (use `Proposals.tsx`)

### `/templates/`
- `SmartQuoteTemplate.ts` - Hardcoded HTML template generation
- `BaseQuoteTemplate.tsx` - Base template interface
- `GenericWallTemplate.tsx` - Wall-specific template (~1800 lines)

### `/components/quotes/`

#### `editing/`
- `UnifiedQuoteEditor/` - Main hardcoded quote editor with live preview
- `QuoteEditingWizard/` - Quote editing wizard interface

#### `creation/`
- `QuoteCreatorWizard/` - Old multi-step quote creation wizard

#### `creationForms/`
- Hardcoded wall type forms (Accordion, Glass, Operable)

#### `shared/`
- Wall form adapters and field components (~2,250 lines total)
- Form hooks for wall types

#### `viewing/`
- `QuoteViewer.tsx` - HTML quote viewer

## Replacement System

Use the new proposal system:
- `src/pages/Proposals.tsx` - Proposal listing
- `src/components/features/proposals/` - Proposal components
- `src/components/features/form-builder/` - Dynamic form builder
- `src/components/features/document-builder/` - Template editor

## Can These Be Deleted?

Yes, once you've verified:
1. No active routes reference these pages
2. No imports reference these components
3. All functionality has been migrated

Deprecated: December 2024
