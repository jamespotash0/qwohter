# Form Builder Migration - Gaps Analysis

## Overview

This document outlines the current state of migrating from the old quote system to the new form-builder based proposal system.

---

## ✅ COMPLETED

### Infrastructure
- [x] **Proposals table** - Database table for storing proposals (`proposals`)
- [x] **Forms table** - Database table for form templates (`forms`)
- [x] **Document Templates table** - Database table for Plate.js templates (`document_templates`)
- [x] **Form-Template linking** - Junction table (`form_document_templates`)

### React Query Hooks
- [x] `useProposals` - Fetch, create, update, delete proposals
- [x] `useForms` - Fetch forms
- [x] `useDocumentTemplates` - Fetch document templates
- [x] `useFormDocumentTemplates` - Fetch templates linked to forms

### Pages & Components
- [x] **Forms page** (`/forms`) - List and manage form templates
- [x] **Form Builder** (`/forms/builder-v3/:id`) - Create/edit forms with drag-drop
- [x] **Document Template Editor** (`/document-templates/:templateId`) - Plate.js rich text editor
- [x] **Proposals page** (`/proposals`) - List and manage proposals ✨ NEW
- [x] **Proposal Editor** (`/proposals/:id/edit`) - Side-by-side form + preview ✨ NEW
- [x] **Quote Creation Wizard** - Select form, fill data, create proposal

### Document Builder Feature
- [x] `DocumentEditor` - Plate.js editor component
- [x] `DocumentPreview` - Render template with variables replaced
- [x] `VariableInsertMenu` - Insert form field variables
- [x] Variable replacement system (`{{variable_name}}`)

### Routes
- [x] `/proposals` - Proposals listing page
- [x] `/proposals/:id/edit` - Proposal editor
- [x] `/document-templates/:templateId` - Template editor

### Code Migration (quotes → proposals)
- [x] **AppSidebar.tsx** - Updated navigation from `/quotes` to `/proposals`
- [x] **useSecureActions.ts** - Updated to use `proposals` table (with deprecated aliases)
- [x] **useDashboard.ts** - Updated to fetch stats from `proposals` table
- [x] **CompanyInfoDialog.tsx** - Updated to check `proposals` table
- [x] **proposalNumberGenerator.ts** - Marked deprecated (use `proposalsService.generateNextProposalNumber`)

### TypeScript Type Definitions
- [x] **proposals table** - Added to `src/integrations/supabase/types.ts`
- [x] **proposal_activities table** - Added to `src/integrations/supabase/types.ts`
- [x] **organization_name field** - Added as direct column in proposals table (not in form_data)

### Service Updates
- [x] **proposalsService.ts** - Updated to populate `organization_name` from organization when creating proposals
- [x] **proposalActivityService.ts** - Updated to use proper TypeScript types (removed `as any` casts)

---

## ⚠️ GAPS - NEEDS IMPLEMENTATION

### 1. PDF Generation from Document Templates
**Status:** Not implemented
**Description:** Need to generate PDFs from Plate.js document templates with variables filled in.

**Required:**
- [ ] Convert Plate.js content to HTML
- [ ] Use html2pdf or Puppeteer/Playwright for PDF generation
- [ ] Handle page breaks properly
- [ ] Include page settings (margins, orientation, size)

**Files to create:**
- `src/utils/documentPdfGenerator.ts`

---

### 2. Proposal Status Management
**Status:** Partially implemented
**Description:** Full status workflow (Draft → Complete → Sent → Approved/Rejected)

**Completed:**
- [x] `useUpdateProposalStatus` hook in useProposals
- [x] `updateProposalStatus()` function in proposalsService
- [x] Timestamp tracking (submitted_at, approved_at, rejected_at)

**Required:**
- [ ] Status dropdown in ProposalEditor UI
- [ ] Email integration for "Sent" status
- [ ] Activity logging for status changes

---

### 3. Proposal Versioning
**Status:** Partially implemented
**Description:** Version management for proposals

**Completed:**
- [x] `createProposalVersion()` function in proposalsService
- [x] `getProposalVersions()` function in proposalsService
- [x] Version suffix format (e.g., P1001.2, P1001.3)
- [x] `parent_proposal_id` linking in database

**Required:**
- [ ] "Create New Version" button in ProposalEditor UI
- [ ] Version history panel/dropdown

---

### 4. Copy/Duplicate Proposal
**Status:** Not implemented
**Description:** Ability to copy a proposal

**Required:**
- [ ] `copyProposal` function in proposalsService
- [ ] `useCopyProposal` mutation hook
- [ ] Copy dialog in Proposals page

---

### 5. Archive/Unarchive Proposal
**Status:** Not implemented
**Description:** Soft delete with archive functionality

**Required:**
- [ ] `is_archived` field in proposals table
- [ ] Archive/unarchive mutations
- [ ] Filter for archived proposals

---

### 6. Sidebar Navigation Update
**Status:** ✅ DONE
**Description:** Update sidebar to point to `/proposals` instead of `/quotes`

**Files updated:**
- `src/components/common/layout/AppSidebar.tsx` - Changed path from `/quotes` to `/proposals`

---

### 7. Client Information Integration
**Status:** Partially implemented
**Description:** Link proposals to contacts (CRM)

**Required:**
- [ ] Contact selector in creation wizard
- [ ] Auto-fill client info from contact
- [ ] Link proposal to contact record

---

### 8. Search & Filtering Enhancements
**Status:** Basic implementation
**Description:** Need more robust search

**Required:**
- [ ] Full-text search across form_data
- [ ] Date range filters
- [ ] Sort options
- [ ] Form type filter

---

### 9. Dashboard Integration
**Status:** Partially implemented
**Description:** Dashboard should show proposal stats and activities

**Completed:**
- [x] `useDashboard.ts` updated to fetch stats from `proposals` table
- [x] `proposalActivityService.ts` created for activity logging

**Required:**
- [ ] **Dashboard.tsx** - Replace `useQuotes` with `useProposals`
- [ ] **Dashboard.tsx** - Replace `quoteActivityService` with `proposalActivityService`
- [ ] **Dashboard.tsx** - Update real-time subscription from `quote_activities` to `proposal_activities`
- [ ] Recent proposals widget in Dashboard UI
- [ ] Proposals by status chart
- [ ] Total value metrics display

**Note:** Dashboard currently uses old quote system for metrics and activities. The `useDashboard.ts` hook has been updated, but Dashboard.tsx still imports and uses `useQuotes` and `quoteActivityService` directly.

---

### 10. Board Integration
**Status:** Not implemented
**Description:** Add proposals to project board

**Required:**
- [ ] Create project from proposal
- [ ] Link proposal to board card
- [ ] Status sync between proposal and board

---

## 🗑️ FILES MARKED DEPRECATED

These files have been marked with `@deprecated` notices:

### Services
- `src/services/quotesService.ts`
- `src/services/quoteActivityService.ts` - Replace with `proposalActivityService.ts`
- `src/hooks/queries/useQuotes.ts`

### Pages
- `src/pages/QuoteEdit.tsx`
- `src/pages/NewQuote.tsx`
- `src/pages/QuotesFormBuilder.tsx`

### Components
- `src/components/features/quotes/editing/UnifiedQuoteEditor.tsx`
- `src/templates/SmartQuoteTemplate.ts`

### Full List (~150+ files)
See the exploration results in the conversation for the complete list of deprecated files in:
- `src/components/features/quotes/`
- `src/templates/`
- `src/lib/types/walls/`
- `src/lib/types/quotes/`

---

## 📋 MIGRATION PATH

### Phase 1: Core Infrastructure ✅ DONE
- Proposals table and service
- React Query hooks
- Basic CRUD operations

### Phase 2: Editor Experience ✅ DONE
- Side-by-side proposal editor
- Document preview with variables
- Form-template linking

### Phase 3: PDF Generation ⬜ TODO
- Convert templates to PDF
- Print/download functionality

### Phase 4: Workflow Features 🔄 IN PROGRESS
- Status management
- Email sending
- Activity logging ✅ Service created (`proposalActivityService.ts`), Dashboard integration pending

### Phase 5: Integration ⬜ TODO
- Dashboard widgets
- Board integration
- CRM contact linking

### Phase 6: Cleanup ⬜ TODO
- Remove deprecated files
- Update all routes to use `/proposals`
- Database migration for existing data

---

## 🚀 RECOMMENDED NEXT STEPS

1. **PDF Generation** - Critical for sending proposals
2. ~~**Sidebar Navigation** - Quick win for user experience~~ ✅ DONE
3. **Status Management** - Essential workflow
4. **Copy Proposal** - Common user need

---

*Last updated: December 4, 2024*
