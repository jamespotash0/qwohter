# Live Preview Document Engine Improvement Plan

**Date**: November 4, 2025
**Project**: WallQu Quote Editor
**Status**: Research Complete - Implementation Pending

---

## Executive Summary

### Current Problem
Your quote editor faces a critical architectural issue:
- **Storage**: HTML snapshots with `${variable}` placeholders mixed into static text
- **Issue**: When users edit content, static text and dynamic values become inseparable
- **Impact**: Updating form data requires fragile regex-based detection to restore variables
- **Result**: User edits can be lost when restoration fails (<80% confidence)

### Recommended Solution
Adopt an **industry-standard document editing engine** with:
1. **Structured document model** (JSON schema, not HTML)
2. **Explicit variable nodes** (no inference needed)
3. **Real-time versioning** with CRDT
4. **Clean separation** of template structure from data

### Impact
- ✅ **Smoother editing**: Professional-grade WYSIWYG experience
- ✅ **Reliable variables**: No more regex detection failures
- ✅ **Full version history**: Click to see any previous version
- ✅ **Future-proof**: Built on same tech as Google Docs, Notion, Confluence

---

## Recommended Technology Stack

### 1. Document Editor: **Tiptap v2** (ProseMirror-based)

**Why Tiptap?**
- Built on ProseMirror (industry standard used by NYT, Atlassian, GitLab)
- Native TypeScript support
- React-first API (easier than raw ProseMirror)
- Extensible: Can add custom "variable nodes"
- Production-ready with 28k+ GitHub stars

**Installation**:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/pm
```

**Key Features for Your Use Case**:
- Custom node extensions (for variables)
- JSON document model (not HTML)
- Real-time collaboration support
- Undo/redo built-in
- Custom node views (React components)

**Resources**:
- Docs: https://tiptap.dev
- Custom nodes: https://tiptap.dev/docs/editor/extensions/custom-extensions

---

### 2. Versioning: **Yjs** (CRDT)

**Why Yjs?**
- Industry standard for collaborative editing
- Automatic version tracking
- Works seamlessly with Tiptap/ProseMirror
- Handles conflicts automatically (CRDT = Conflict-free Replicated Data Type)
- Can store in PostgreSQL/Supabase

**Installation**:
```bash
npm install yjs y-prosemirror y-indexeddb
```

**Key Features**:
- Automatic change tracking (every keystroke)
- Snapshot support (save states)
- Time-travel (restore to any point)
- Efficient delta storage
- Offline-first architecture

**Resources**:
- Docs: https://docs.yjs.dev
- Supabase integration: https://github.com/yjs/y-supabase

---

### 3. Variable Management: **Custom Tiptap Extension**

**Approach**: Create "Variable Node" extension
- Renders as pill/chip in editor
- Displays actual value in preview
- Stores reference path (e.g., `quote_details.contactName`)
- Never loses track of what's a variable vs. static text

**No external library needed** - we'll build on Tiptap's extension API

---

### 4. Data Path Resolution: **lodash.get**

**Why lodash.get?**
- Safe nested property access
- Handles missing paths gracefully
- Industry standard (52M downloads/week)

**Installation**:
```bash
npm install lodash.get
npm install -D @types/lodash.get
```

**Usage**:
```typescript
import get from 'lodash.get';

const value = get(quoteData, 'quote_details.contactName', 'N/A');
// Instead of: quoteData?.quote_details?.contactName ?? 'N/A'
```

---

### 5. Versioning Storage: **jsondiffpatch** (Optional)

**Why jsondiffpatch?**
- Efficient delta storage
- Human-readable diffs
- Used alongside Yjs for long-term archival

**Installation**:
```bash
npm install jsondiffpatch
npm install -D @types/jsondiffpatch
```

**Resources**:
- Docs: https://github.com/benjamine/jsondiffpatch

---

## Architecture Overview

### New Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Edits in Tiptap Editor                                │
│  - Types text                                                │
│  - Inserts variables (via toolbar button)                   │
│  - Formats content                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ProseMirror Document Schema (JSON)                         │
│  {                                                           │
│    type: "doc",                                              │
│    content: [                                                │
│      {                                                       │
│        type: "paragraph",                                    │
│        content: [                                            │
│          { type: "text", text: "Project for " },           │
│          {                                                   │
│            type: "variable",                                 │
│            attrs: {                                          │
│              name: "contactName",                           │
│              path: "quote_details.contactName",             │
│              fallback: "[Name]"                             │
│            }                                                 │
│          }                                                   │
│        ]                                                     │
│      }                                                       │
│    ]                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Yjs Document (CRDT Layer)                                  │
│  - Tracks every change automatically                        │
│  - Creates deltas between versions                          │
│  - Supports snapshots for major saves                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Storage in Supabase                                        │
│  1. quote_documents table:                                  │
│     - document_schema (ProseMirror JSON)                    │
│     - yjs_state_vector (Yjs snapshot)                       │
│     - version_number                                        │
│                                                              │
│  2. quote_document_versions table:                          │
│     - version snapshots (every 10 saves)                    │
│     - deltas (incremental changes)                          │
│     - metadata (who, when, what)                            │
│                                                              │
│  3. quote_data table (unchanged):                           │
│     - quote_details, price_details, etc.                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Live Preview Renderer                                      │
│  - Walks ProseMirror schema                                 │
│  - For text nodes: render as-is                             │
│  - For variable nodes: resolve from quote_data              │
│  - Generate HTML for display                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Output Generation                                          │
│  - PDF: html2pdf (current system)                           │
│  - Email: HTML template                                     │
│  - Print: CSS print styles                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### New Tables

#### 1. `quote_documents`
```sql
CREATE TABLE quote_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Document structure (ProseMirror JSON)
  document_schema JSONB NOT NULL,

  -- Yjs state for real-time collaboration
  yjs_state_vector BYTEA,

  -- Version tracking
  version_number INTEGER NOT NULL DEFAULT 1,
  is_snapshot BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  UNIQUE(quote_id)
);

-- Enable RLS
ALTER TABLE quote_documents ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX idx_quote_documents_quote_id ON quote_documents(quote_id);
CREATE INDEX idx_quote_documents_updated_at ON quote_documents(updated_at);
```

#### 2. `quote_document_versions`
```sql
CREATE TABLE quote_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES quote_documents(id) ON DELETE CASCADE,

  -- Version info
  version_number INTEGER NOT NULL,
  is_snapshot BOOLEAN DEFAULT FALSE,

  -- Snapshot: full document schema (every 10 versions)
  snapshot_schema JSONB,

  -- Delta: incremental change from previous version
  delta JSONB,

  -- Change summary
  change_summary TEXT,
  sections_modified TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(document_id, version_number)
);

-- Enable RLS
ALTER TABLE quote_document_versions ENABLE ROW LEVEL SECURITY;

-- Index for version history queries
CREATE INDEX idx_document_versions_document_id ON quote_document_versions(document_id, version_number DESC);
```

#### 3. Update `quotes` table
```sql
-- Add reference to current document version
ALTER TABLE quotes
ADD COLUMN current_document_version INTEGER DEFAULT 1,
ADD COLUMN document_last_modified_at TIMESTAMPTZ,
ADD COLUMN document_last_modified_by UUID REFERENCES profiles(id);

-- Index for tracking changes
CREATE INDEX idx_quotes_document_modified ON quotes(document_last_modified_at);
```

### Migration Strategy for Existing Data

```sql
-- Migration: Convert existing customization to new schema
CREATE OR REPLACE FUNCTION migrate_quote_customization_to_document()
RETURNS void AS $$
DECLARE
  quote_record RECORD;
  doc_schema JSONB;
BEGIN
  FOR quote_record IN
    SELECT id, customization
    FROM quotes
    WHERE customization IS NOT NULL
  LOOP
    -- Convert HTML to basic ProseMirror schema
    doc_schema := jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object(
              'type', 'text',
              'text', quote_record.customization->>'customHTML'
            )
          )
        )
      )
    );

    -- Insert into quote_documents
    INSERT INTO quote_documents (
      quote_id,
      organization_id,
      document_schema,
      version_number,
      is_snapshot
    )
    SELECT
      quote_record.id,
      organization_id,
      doc_schema,
      1,
      TRUE
    FROM quotes
    WHERE id = quote_record.id;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run migration (only once)
-- SELECT migrate_quote_customization_to_document();
```

---

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)
**Goal**: Install libraries, create basic Tiptap editor

**Tasks**:
1. Install dependencies:
   ```bash
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration
   npm install yjs y-prosemirror y-indexeddb
   npm install lodash.get
   npm install -D @types/lodash.get
   ```

2. Create basic Tiptap editor component:
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/TiptapEditor.tsx
   import { useEditor, EditorContent } from '@tiptap/react';
   import StarterKit from '@tiptap/starter-kit';

   export const TiptapEditor: React.FC = () => {
     const editor = useEditor({
       extensions: [StarterKit],
       content: '<p>Hello World!</p>',
     });

     return <EditorContent editor={editor} />;
   };
   ```

3. Test in isolation (not connected to quote system yet)

**Deliverable**: Working Tiptap editor in storybook/dev environment

---

### Phase 2: Custom Variable Node Extension (Week 2)
**Goal**: Create variable insertion and rendering system

**Tasks**:
1. Create Variable node extension:
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/extensions/VariableNode.tsx
   import { Node, mergeAttributes } from '@tiptap/core';
   import { ReactNodeViewRenderer } from '@tiptap/react';
   import { VariableChip } from './VariableChip';

   export const Variable = Node.create({
     name: 'variable',
     group: 'inline',
     inline: true,
     atom: true,

     addAttributes() {
       return {
         variableName: { default: '' },
         variablePath: { default: '' },
         variableType: { default: 'text' },
         fallback: { default: '' },
       };
     },

     parseHTML() {
       return [{ tag: 'span[data-type="variable"]' }];
     },

     renderHTML({ node, HTMLAttributes }) {
       return [
         'span',
         mergeAttributes(HTMLAttributes, {
           'data-type': 'variable',
           'data-variable-name': node.attrs.variableName,
           'data-variable-path': node.attrs.variablePath,
         }),
         `{{${node.attrs.variableName}}}`,
       ];
     },

     addNodeView() {
       return ReactNodeViewRenderer(VariableChip);
     },

     addCommands() {
       return {
         insertVariable: (attributes) => ({ commands }) => {
           return commands.insertContent({
             type: this.name,
             attrs: attributes,
           });
         },
       };
     },
   });
   ```

2. Create Variable Chip component:
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/extensions/VariableChip.tsx
   import { NodeViewWrapper } from '@tiptap/react';
   import get from 'lodash.get';

   interface VariableChipProps {
     node: {
       attrs: {
         variableName: string;
         variablePath: string;
         fallback: string;
       };
     };
     // Get quote data from context
     extension: {
       options: {
         quoteData: QuoteData;
       };
     };
   }

   export const VariableChip: React.FC<VariableChipProps> = ({
     node,
     extension
   }) => {
     const { variableName, variablePath, fallback } = node.attrs;
     const quoteData = extension.options.quoteData;

     // Resolve value from quote data
     const value = get(quoteData, variablePath, fallback);

     return (
       <NodeViewWrapper className="variable-chip">
         <span
           className="inline-flex items-center gap-1 px-2 py-0.5
                      bg-blue-100 text-blue-700 rounded-full text-sm"
           contentEditable={false}
         >
           <span className="font-mono text-xs">{variableName}</span>
           <span className="text-xs">→</span>
           <span className="font-medium">{value}</span>
         </span>
       </NodeViewWrapper>
     );
   };
   ```

3. Create variable insertion toolbar:
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/VariableInsertMenu.tsx
   import { Editor } from '@tiptap/react';

   interface VariableOption {
     name: string;
     path: string;
     category: string;
   }

   const AVAILABLE_VARIABLES: VariableOption[] = [
     { name: 'Contact Name', path: 'quote_details.contactName', category: 'Contact' },
     { name: 'Organization', path: 'quote_details.organizationName', category: 'Contact' },
     { name: 'Total Price', path: 'price_details.final_selling_price', category: 'Pricing' },
     { name: 'Project Name', path: 'job_details.projectName', category: 'Job' },
     // Add all variables your system uses
   ];

   export const VariableInsertMenu: React.FC<{ editor: Editor }> = ({ editor }) => {
     const handleInsertVariable = (variable: VariableOption) => {
       editor.chain().focus().insertVariable({
         variableName: variable.name,
         variablePath: variable.path,
         fallback: `[${variable.name}]`,
       }).run();
     };

     return (
       <div className="variable-menu">
         <button className="btn btn-sm">Insert Variable ▼</button>
         <div className="dropdown-menu">
           {AVAILABLE_VARIABLES.map(v => (
             <button
               key={v.path}
               onClick={() => handleInsertVariable(v)}
             >
               {v.category}: {v.name}
             </button>
           ))}
         </div>
       </div>
     );
   };
   ```

**Deliverable**: Working variable insertion and display

---

### Phase 3: Document Service Layer (Week 3)
**Goal**: Create service for saving/loading documents

**Tasks**:
1. Create document service:
   ```typescript
   // src/services/documentService.ts
   import { supabase } from '@/lib/supabase';
   import type { JSONContent } from '@tiptap/core';

   export interface QuoteDocument {
     id: string;
     quote_id: string;
     document_schema: JSONContent;
     version_number: number;
     yjs_state_vector?: Uint8Array;
     created_at: string;
     updated_at: string;
   }

   export const documentService = {
     async getByQuoteId(quoteId: string): Promise<QuoteDocument | null> {
       const { data, error } = await supabase
         .from('quote_documents')
         .select('*')
         .eq('quote_id', quoteId)
         .single();

       if (error) {
         if (error.code === 'PGRST116') return null; // Not found
         throw error;
       }

       return data;
     },

     async create(quoteId: string, schema: JSONContent): Promise<QuoteDocument> {
       const { data: quote } = await supabase
         .from('quotes')
         .select('organization_id')
         .eq('id', quoteId)
         .single();

       const { data, error } = await supabase
         .from('quote_documents')
         .insert({
           quote_id: quoteId,
           organization_id: quote.organization_id,
           document_schema: schema,
           version_number: 1,
           is_snapshot: true,
         })
         .select()
         .single();

       if (error) throw error;
       return data;
     },

     async update(
       documentId: string,
       schema: JSONContent,
       changeSummary?: string
     ): Promise<QuoteDocument> {
       // Get current version
       const { data: current } = await supabase
         .from('quote_documents')
         .select('version_number, document_schema')
         .eq('id', documentId)
         .single();

       const newVersion = (current?.version_number || 0) + 1;
       const isSnapshot = newVersion % 10 === 0;

       // Save version history
       await supabase
         .from('quote_document_versions')
         .insert({
           document_id: documentId,
           version_number: current?.version_number,
           is_snapshot: isSnapshot,
           snapshot_schema: isSnapshot ? current?.document_schema : null,
           delta: isSnapshot ? null : this.createDelta(current?.document_schema, schema),
           change_summary: changeSummary,
         });

       // Update current document
       const { data, error } = await supabase
         .from('quote_documents')
         .update({
           document_schema: schema,
           version_number: newVersion,
           updated_at: new Date().toISOString(),
         })
         .eq('id', documentId)
         .select()
         .single();

       if (error) throw error;
       return data;
     },

     async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
       const { data, error } = await supabase
         .from('quote_document_versions')
         .select('*')
         .eq('document_id', documentId)
         .order('version_number', { ascending: false });

       if (error) throw error;
       return data;
     },

     async restoreVersion(documentId: string, versionNumber: number): Promise<void> {
       // Get version snapshot or reconstruct from deltas
       const version = await this.reconstructVersion(documentId, versionNumber);

       await this.update(documentId, version.document_schema, `Restored to v${versionNumber}`);
     },

     createDelta(oldSchema: JSONContent, newSchema: JSONContent): any {
       // Simple diff - can use jsondiffpatch here if needed
       return {
         old: oldSchema,
         new: newSchema,
       };
     },

     async reconstructVersion(documentId: string, versionNumber: number): Promise<any> {
       // Find nearest snapshot <= versionNumber
       const { data: snapshot } = await supabase
         .from('quote_document_versions')
         .select('*')
         .eq('document_id', documentId)
         .eq('is_snapshot', true)
         .lte('version_number', versionNumber)
         .order('version_number', { ascending: false })
         .limit(1)
         .single();

       if (!snapshot) {
         throw new Error('No snapshot found');
       }

       // If exact match, return snapshot
       if (snapshot.version_number === versionNumber) {
         return { document_schema: snapshot.snapshot_schema };
       }

       // Otherwise, apply deltas from snapshot to target version
       const { data: deltas } = await supabase
         .from('quote_document_versions')
         .select('delta')
         .eq('document_id', documentId)
         .gt('version_number', snapshot.version_number)
         .lte('version_number', versionNumber)
         .order('version_number', { ascending: true });

       let schema = snapshot.snapshot_schema;
       for (const delta of deltas || []) {
         schema = delta.delta.new; // Simple approach
       }

       return { document_schema: schema };
     },
   };
   ```

2. Create React Query hook:
   ```typescript
   // src/hooks/queries/useQuoteDocument.ts
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { documentService } from '@/services/documentService';

   export const useQuoteDocument = (quoteId: string) => {
     const queryClient = useQueryClient();

     const { data: document, isLoading } = useQuery({
       queryKey: ['quote-document', quoteId],
       queryFn: () => documentService.getByQuoteId(quoteId),
       enabled: !!quoteId,
     });

     const updateMutation = useMutation({
       mutationFn: ({ documentId, schema, changeSummary }: any) =>
         documentService.update(documentId, schema, changeSummary),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['quote-document', quoteId] });
       },
     });

     const createMutation = useMutation({
       mutationFn: (schema: any) => documentService.create(quoteId, schema),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['quote-document', quoteId] });
       },
     });

     return {
       document,
       isLoading,
       updateDocument: updateMutation.mutate,
       createDocument: createMutation.mutate,
     };
   };

   export const useDocumentVersionHistory = (documentId: string) => {
     return useQuery({
       queryKey: ['document-versions', documentId],
       queryFn: () => documentService.getVersionHistory(documentId),
       enabled: !!documentId,
     });
   };
   ```

**Deliverable**: Working save/load system with version tracking

---

### Phase 4: Integration with Quote Editor (Week 4)
**Goal**: Replace current UnifiedQuoteEditor with new system

**Tasks**:
1. Create new document editor wrapper:
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/DocumentEditorPanel.tsx
   import { useEditor, EditorContent } from '@tiptap/react';
   import StarterKit from '@tiptap/starter-kit';
   import { Variable } from './extensions/VariableNode';
   import { useQuoteDocument } from '@/hooks/queries/useQuoteDocument';
   import { useQuotes } from '@/hooks/queries/useQuotes';

   interface DocumentEditorPanelProps {
     quoteId: string;
   }

   export const DocumentEditorPanel: React.FC<DocumentEditorPanelProps> = ({
     quoteId
   }) => {
     const { document, updateDocument } = useQuoteDocument(quoteId);
     const { data: quoteData } = useQuotes();

     const editor = useEditor({
       extensions: [
         StarterKit,
         Variable.configure({
           quoteData: quoteData, // Pass quote data for variable resolution
         }),
       ],
       content: document?.document_schema || '<p>Start editing...</p>',
       onUpdate: ({ editor }) => {
         // Auto-save debounced
         debouncedSave(editor.getJSON());
       },
     });

     const debouncedSave = useMemo(
       () =>
         debounce((schema: any) => {
           if (document) {
             updateDocument({
               documentId: document.id,
               schema,
               changeSummary: 'Auto-save',
             });
           }
         }, 2000),
       [document, updateDocument]
     );

     return (
       <div className="document-editor-panel">
         <EditorToolbar editor={editor} />
         <EditorContent editor={editor} />
       </div>
     );
   };
   ```

2. Create migration component (handles old HTML → new schema):
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/MigrationHelper.tsx
   import { parseHTML } from '@tiptap/core';

   export const migrateHtmlToSchema = (html: string): JSONContent => {
     // Use Tiptap's HTML parser
     const schema = parseHTML(html, [StarterKit, Variable]);

     return schema;
   };

   export const detectVariablesInHtml = (html: string): string[] => {
     const variableRegex = /\$\{(\w+(?:\.\w+)*)\}/g;
     const matches = [...html.matchAll(variableRegex)];
     return matches.map(m => m[1]);
   };
   ```

3. Update UnifiedQuoteEditor to use new system:
   ```typescript
   // src/components/features/quotes/editing/UnifiedQuoteEditor.tsx (refactored)
   export const UnifiedQuoteEditor: React.FC = ({ quoteId }) => {
     const { document } = useQuoteDocument(quoteId);

     // Check if needs migration
     const needsMigration = !document && quote.customization?.customHTML;

     if (needsMigration) {
       return <MigrationPrompt quoteId={quoteId} />;
     }

     return (
       <div className="unified-quote-editor">
         <DocumentEditorPanel quoteId={quoteId} />
         <LivePreviewPanel quoteId={quoteId} />
       </div>
     );
   };
   ```

**Deliverable**: Fully integrated editor with old system compatibility

---

### Phase 5: Yjs Integration & Real-time Features (Week 5-6)
**Goal**: Add real-time collaboration and better versioning

**Tasks**:
1. Add Yjs collaboration extension:
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/CollaborativeEditor.tsx
   import { Collaboration } from '@tiptap/extension-collaboration';
   import * as Y from 'yjs';
   import { IndexeddbPersistence } from 'y-indexeddb';

   export const CollaborativeEditor: React.FC = ({ quoteId }) => {
     const ydoc = useMemo(() => new Y.Doc(), []);

     // Local persistence
     const persistence = useMemo(
       () => new IndexeddbPersistence(`quote-${quoteId}`, ydoc),
       [quoteId, ydoc]
     );

     const editor = useEditor({
       extensions: [
         StarterKit,
         Variable,
         Collaboration.configure({
           document: ydoc,
         }),
       ],
     });

     // Sync to Supabase periodically
     useEffect(() => {
       const syncInterval = setInterval(() => {
         const stateVector = Y.encodeStateAsUpdate(ydoc);
         documentService.saveYjsState(quoteId, stateVector);
       }, 30000); // Every 30 seconds

       return () => clearInterval(syncInterval);
     }, [quoteId, ydoc]);

     return <EditorContent editor={editor} />;
   };
   ```

2. Add version history UI:
   ```typescript
   // src/components/features/quotes/editing/DocumentEditor/VersionHistory.tsx
   export const VersionHistory: React.FC<{ documentId: string }> = ({
     documentId
   }) => {
     const { data: versions } = useDocumentVersionHistory(documentId);

     return (
       <div className="version-history">
         <h3>Version History</h3>
         <div className="versions-list">
           {versions?.map(version => (
             <div key={version.id} className="version-item">
               <div className="version-number">v{version.version_number}</div>
               <div className="version-date">{formatDate(version.created_at)}</div>
               <div className="version-summary">{version.change_summary}</div>
               <button onClick={() => handleRestore(version.version_number)}>
                 Restore
               </button>
             </div>
           ))}
         </div>
       </div>
     );
   };
   ```

**Deliverable**: Full versioning with restore capability

---

## File Structure Changes

### New Directory Structure

```
src/components/features/quotes/editing/
├── DocumentEditor/                        ← NEW
│   ├── DocumentEditorPanel.tsx           (Main editor)
│   ├── CollaborativeEditor.tsx           (Yjs integration)
│   ├── EditorToolbar.tsx                 (Formatting controls)
│   ├── VariableInsertMenu.tsx            (Variable insertion)
│   ├── VersionHistory.tsx                (Version management)
│   ├── MigrationHelper.tsx               (HTML → Schema conversion)
│   ├── extensions/
│   │   ├── VariableNode.tsx              (Custom Tiptap node)
│   │   ├── VariableChip.tsx              (React node view)
│   │   └── index.ts
│   ├── utils/
│   │   ├── variableResolver.ts           (Path → value resolution)
│   │   ├── schemaValidator.ts            (Document validation)
│   │   └── htmlGenerator.ts              (Schema → HTML for export)
│   └── index.ts
│
├── UnifiedQuoteEditor/                    ← REFACTORED
│   ├── UnifiedQuoteEditor.tsx            (Orchestrator - now simpler)
│   ├── LivePreview/
│   │   ├── LivePreviewPanel.tsx          (Updated to render from schema)
│   │   └── ContentSplitter.ts            (Keep pagination logic)
│   ├── QuoteDataPanel/                   (Keep form panels)
│   └── MigrationPrompt.tsx               (One-time migration UI)
│
└── [OLD SYSTEM - ARCHIVED]
    └── .archived/
        ├── mixedContentEngine.ts         (No longer needed)
        └── QuickEditModal.tsx            (Replaced by Tiptap)

src/services/
├── documentService.ts                     ← NEW
├── quotesService.ts                       (Updated for new refs)

src/hooks/queries/
├── useQuoteDocument.ts                    ← NEW
├── useDocumentVersionHistory.ts           ← NEW

supabase/migrations/
├── 20251104000001_create_quote_documents.sql           ← NEW
├── 20251104000002_create_quote_document_versions.sql   ← NEW
├── 20251104000003_add_document_refs_to_quotes.sql      ← NEW
├── 20251104000004_migrate_existing_customizations.sql  ← NEW
```

---

## Migration Strategy: Old → New

### Step 1: Gradual Rollout (Feature Flag)

```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  NEW_DOCUMENT_EDITOR: import.meta.env.VITE_ENABLE_NEW_EDITOR === 'true',
};

// In UnifiedQuoteEditor.tsx
export const UnifiedQuoteEditor = ({ quoteId }: Props) => {
  if (FEATURES.NEW_DOCUMENT_EDITOR) {
    return <NewDocumentEditor quoteId={quoteId} />;
  }

  return <LegacyUnifiedQuoteEditor quoteId={quoteId} />;
};
```

### Step 2: Migration UI

```typescript
// src/components/features/quotes/editing/MigrationPrompt.tsx
export const MigrationPrompt: React.FC<{ quoteId: string }> = ({ quoteId }) => {
  const { quote } = useQuotes();
  const { createDocument } = useQuoteDocument(quoteId);

  const handleMigrate = async () => {
    // Convert HTML to schema
    const html = quote.customization?.customHTML || '';
    const schema = migrateHtmlToSchema(html);

    // Detect and preserve variables
    const variables = detectVariablesInHtml(html);

    // Create new document
    await createDocument(schema);

    // Archive old customization
    await quotesService.update(quoteId, {
      customization: {
        ...quote.customization,
        migrated_to_v2: true,
        migrated_at: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="migration-prompt">
      <h2>Upgrade to New Editor</h2>
      <p>
        This quote uses the legacy editor. Upgrade to the new editor for:
        - Better editing experience
        - Version history
        - More reliable variable handling
      </p>
      <button onClick={handleMigrate}>Upgrade Now</button>
      <button>Continue with Legacy Editor</button>
    </div>
  );
};
```

### Step 3: Bulk Migration Script

```typescript
// scripts/migrate-quotes-to-new-editor.ts
import { supabase } from './lib/supabase';
import { migrateHtmlToSchema } from './components/features/quotes/editing/DocumentEditor/MigrationHelper';

async function migrateAllQuotes() {
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, customization, organization_id')
    .not('customization', 'is', null);

  for (const quote of quotes || []) {
    try {
      const html = quote.customization?.customHTML || '';
      const schema = migrateHtmlToSchema(html);

      await supabase.from('quote_documents').insert({
        quote_id: quote.id,
        organization_id: quote.organization_id,
        document_schema: schema,
        version_number: 1,
        is_snapshot: true,
      });

      console.log(`✅ Migrated quote ${quote.id}`);
    } catch (error) {
      console.error(`❌ Failed to migrate quote ${quote.id}:`, error);
    }
  }
}

// Run: npx tsx scripts/migrate-quotes-to-new-editor.ts
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/components/features/quotes/editing/DocumentEditor/__tests__/variableResolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolveVariable } from '../utils/variableResolver';

describe('variableResolver', () => {
  const mockQuoteData = {
    quote_details: { contactName: 'John Doe' },
    price_details: { final_selling_price: 5000 },
  };

  it('resolves simple path', () => {
    expect(resolveVariable('quote_details.contactName', mockQuoteData))
      .toBe('John Doe');
  });

  it('returns fallback for missing path', () => {
    expect(resolveVariable('invalid.path', mockQuoteData, 'N/A'))
      .toBe('N/A');
  });

  it('handles nested paths', () => {
    expect(resolveVariable('price_details.final_selling_price', mockQuoteData))
      .toBe(5000);
  });
});
```

### Integration Tests

```typescript
// src/components/features/quotes/editing/DocumentEditor/__tests__/DocumentEditor.integration.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentEditorPanel } from '../DocumentEditorPanel';

describe('DocumentEditorPanel Integration', () => {
  it('inserts and renders variable correctly', async () => {
    const { editor } = render(<DocumentEditorPanel quoteId="test-id" />);

    // Click variable insert button
    fireEvent.click(screen.getByText('Insert Variable'));

    // Select "Contact Name" variable
    fireEvent.click(screen.getByText('Contact Name'));

    // Should see variable chip in editor
    expect(screen.getByText('contactName')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('saves document on change', async () => {
    // ... test auto-save functionality
  });
});
```

---

## Performance Considerations

### Optimization Strategies

1. **Debounced Saves**: Only save after 2 seconds of inactivity
2. **Lazy Loading**: Load version history on demand
3. **Memoization**: Cache resolved variable values
4. **Virtual Scrolling**: For long documents (use react-window)
5. **Web Workers**: Offload HTML generation to worker thread

### Benchmarks to Meet

- Editor initialization: < 500ms
- Variable resolution: < 50ms per section
- Document save: < 1s
- Version restoration: < 2s
- Page rendering: 60fps

---

## Rollback Plan

If issues arise, we can rollback gracefully:

1. **Feature flag off**: Disable new editor via env var
2. **Database compatibility**: Old `customization` field still exists
3. **Export old data**: SQL script to export schemas back to HTML
4. **No data loss**: All old customizations archived, not deleted

---

## Training & Documentation

### For Developers

1. **Architecture guide**: How the new system works
2. **Variable creation guide**: How to add new variables
3. **Extension guide**: How to create custom Tiptap nodes
4. **Debugging guide**: Common issues and solutions

### For Users

1. **Video tutorial**: Using the new editor
2. **Variable guide**: What variables are available
3. **Version history guide**: How to restore previous versions
4. **Migration guide**: What changes during upgrade

---

## Maintenance & Monitoring

### Metrics to Track

1. **Adoption rate**: % of quotes using new editor
2. **Error rate**: Failed saves, corrupted documents
3. **Performance**: P95 latency for saves
4. **User satisfaction**: Feedback surveys

### Alerts

1. Document save failures > 5%
2. Version history failures
3. Variable resolution errors
4. Editor initialization > 2s

---

## Cost Analysis

### Time Investment

- **Development**: 6 weeks (1 developer)
- **Testing**: 1 week
- **Migration**: 1 week
- **Total**: ~2 months

### Long-term Savings

- **Reduced bugs**: No more regex restoration failures
- **Easier maintenance**: Standard libraries vs. custom code
- **Feature velocity**: Easier to add new variables/sections
- **User satisfaction**: Professional editing experience

---

## Next Steps

1. **Review this plan** with team
2. **Get stakeholder approval** for 6-week timeline
3. **Set up feature flag** in environment
4. **Create Phase 1 branch**: `feature/tiptap-editor-phase-1`
5. **Begin implementation**: Start with basic Tiptap setup

---

## References

### Documentation
- Tiptap: https://tiptap.dev
- ProseMirror: https://prosemirror.net
- Yjs: https://docs.yjs.dev
- CRDT explainer: https://crdt.tech

### Similar Implementations
- Notion's block editor: https://www.notion.so/blog/data-model-behind-notion
- Atlassian's ADF: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
- BlockSuite (open source): https://github.com/toeverything/blocksuite

### Libraries
- `@tiptap/react`: Editor framework
- `yjs`: CRDT versioning
- `lodash.get`: Safe property access
- `jsondiffpatch`: Delta generation (optional)

---

**Status**: Ready for implementation
**Owner**: Development Team
**Timeline**: 6-8 weeks
**Priority**: High (solves critical pain point)
