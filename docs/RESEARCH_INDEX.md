# Research Documentation Index

**Last Updated**: November 4, 2025

This directory contains comprehensive research on improving WallQu's live-preview document editing system.

---

## Quick Start

**If you're short on time, read this first:**

👉 **[DOCUMENT_ENGINE_RESEARCH_COMPLETE.md](DOCUMENT_ENGINE_RESEARCH_COMPLETE.md)** - Executive summary with 3 approaches and clear recommendation

---

## Research Documents

### 1. Main Recommendation & Comparison

**File**: [DOCUMENT_ENGINE_RESEARCH_COMPLETE.md](DOCUMENT_ENGINE_RESEARCH_COMPLETE.md)

**What's Inside**:
- ✅ **Three viable approaches** compared side-by-side
- ✅ **Recommendation**: Custom Hybrid Document Model (Approach B)
- ✅ **Full implementation roadmap** (5-6 weeks)
- ✅ **Migration strategy** for existing quotes
- ✅ **Code examples** and architecture diagrams
- ✅ **Storage efficiency analysis** (60-80% reduction)

**When to Read**: Start here for decision-making

---

### 2. Tiptap + Yjs Implementation Plan (Alternative)

**File**: [LIVE_PREVIEW_IMPROVEMENT_PLAN.md](LIVE_PREVIEW_IMPROVEMENT_PLAN.md)

**What's Inside**:
- Real-time collaboration approach using Tiptap editor
- ProseMirror document schema
- Yjs CRDT for versioning
- Phase-by-phase implementation (6-8 weeks)
- Database migrations for `quote_documents` table
- Custom variable node extension code

**When to Read**: If you decide you need real-time multi-user editing

---

## Comparison At a Glance

| Approach | Best For | Complexity | Timeline | Bundle Size |
|----------|----------|------------|----------|-------------|
| **Custom Hybrid** (Recommended) | Quote documents, full control | Medium | 5-6 weeks | ~50 KB |
| **Tiptap + Yjs** (Alternative) | Real-time collaboration | High | 6-8 weeks | ~200 KB |
| **Slate.js** (Quick option) | Fast iteration | Low-Medium | 3-4 weeks | ~80 KB |

---

## Current Problem Summary

**Files to Check**:
- [src/utils/mixedContentEngine.ts](src/utils/mixedContentEngine.ts:73-154) - Current fragile reverse-engineering logic
- [src/components/features/quotes/editing/UnifiedQuoteEditor.tsx](src/components/features/quotes/editing/UnifiedQuoteEditor.tsx:459-500) - Section override handling
- [supabase/migrations/20250108000000_add_customization_column.sql](supabase/migrations/20250108000000_add_customization_column.sql) - Current storage schema

**The Issues**:
1. ❌ Static text and dynamic values mixed in HTML strings
2. ❌ Regex-based variable restoration (fails <50% of time in edge cases)
3. ❌ No version history (only latest state)
4. ❌ User edits can be lost when updating dynamic values

---

## Recommended Solution (Custom Hybrid Model)

### Key Features

1. **Explicit Data Bindings**
   ```typescript
   {
     id: "node-123",
     type: "field",
     dataBinding: {
       source: "price_details.final_selling_price",
       computed: true,
       formula: "currency"
     },
     editStatus: {
       state: "computed",  // or "user_edited"
       isEdited: false
     }
   }
   ```

2. **Version Tracking via RFC 6902**
   - Snapshots every 10 versions
   - Deltas for incremental changes
   - 60-80% storage reduction vs full snapshots

3. **User Override System**
   - "Computed" badge for auto-calculated fields
   - "Edited" badge for user-modified fields
   - "Reset to Computed" button to restore auto-calculation

### Libraries Required

```bash
npm install rfc6902 react-chrono date-fns uuid
npm install -D @types/uuid
```

**Total**: ~50 KB bundle size

---

## Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create `src/lib/types/document/documentModel.ts`
- [ ] Implement `src/services/documentEngine/DocumentUpdateEngine.ts`
- [ ] Create database migration for `quote_versions` table
- [ ] Implement `src/services/quoteVersionService.ts`
- [ ] Create hooks: `src/hooks/queries/useQuoteVersions.ts`
- [ ] Write unit tests

### Phase 2: UI Components (Weeks 3-4)
- [ ] Build `EditableField` component with computed/edited indicators
- [ ] Create `DocumentRenderer` component
- [ ] Update `LivePreviewPanel` to render from document tree
- [ ] Build `VersionHistoryPanel` with react-chrono timeline
- [ ] Implement version diff viewer
- [ ] Add rollback functionality

### Phase 3: Migration (Week 5)
- [ ] Build migration script: `customization` → `document_tree`
- [ ] Create migration UI prompt
- [ ] Test on staging with real data
- [ ] Verify output matches old system
- [ ] Deploy to production with feature flag

### Phase 4: Testing & Polish (Week 6)
- [ ] Performance optimization (debounced saves, memoization)
- [ ] Error handling and retry logic
- [ ] User testing with beta group
- [ ] Documentation (developer + user guides)
- [ ] Monitoring and analytics

---

## Decision Framework

### Choose Custom Hybrid Model if:
- ✅ Quote editing is single-user (not collaborative)
- ✅ You want full control over architecture
- ✅ You want smallest bundle size
- ✅ You want most storage-efficient solution
- ✅ You have 5-6 weeks for implementation

### Choose Tiptap + Yjs if:
- ✅ You need real-time multi-user editing
- ✅ You want professional WYSIWYG editor
- ✅ You're okay with higher complexity
- ✅ You have 6-8 weeks for implementation

### Choose Slate.js if:
- ✅ You want to iterate quickly (3-4 weeks)
- ✅ You want WYSIWYG but simpler than Tiptap
- ✅ You're comfortable with React

---

## Key Architecture Diagrams

### Current Flow (Broken)
```
User edits → HTML with ${variables} → Regex restoration → ❌ Sometimes fails
```

### New Flow (Custom Hybrid)
```
User edits → DocumentNode tree → Explicit bindings → ✅ Always works
    ↓
Update data → Traverse tree → Skip user-edited nodes → ✅ No conflicts
    ↓
Save → Create delta (RFC 6902) → Store in quote_versions → ✅ Full history
```

### Version Storage Strategy
```
v1: SNAPSHOT (7 KB)
v2: DELTA (1 KB) ← based on v1
v3: DELTA (1 KB) ← based on v2
...
v10: DELTA (1 KB) ← based on v9
v11: SNAPSHOT (7 KB) ← force snapshot every 10 deltas
```

---

## Storage Efficiency

### Current System
- Per quote: ~20 KB (no history)
- 10 quotes: ~200 KB

### New System (10 versions each)
- Per quote with 10 versions: ~23 KB
- 10 quotes with 10 versions each: ~230 KB

**Result**: 10x more data (version history) for only 15% more storage

---

## Questions to Answer Before Starting

1. **Do you need real-time collaboration?**
   - If YES → Choose Tiptap + Yjs
   - If NO → Choose Custom Hybrid (recommended)

2. **What's your timeline?**
   - 3-4 weeks → Slate.js
   - 5-6 weeks → Custom Hybrid
   - 6-8 weeks → Tiptap + Yjs

3. **What's your bundle size budget?**
   - Tight (<100 KB) → Custom Hybrid (~50 KB)
   - Flexible → Tiptap + Yjs (~200 KB)

4. **How important is full control?**
   - Very important → Custom Hybrid
   - Less important → Tiptap + Yjs

---

## Next Steps

### This Week
1. [ ] Review [DOCUMENT_ENGINE_RESEARCH_COMPLETE.md](DOCUMENT_ENGINE_RESEARCH_COMPLETE.md)
2. [ ] Discuss with team which approach to take
3. [ ] Get stakeholder buy-in on timeline
4. [ ] Answer the 4 questions above

### Next Week
1. [ ] Build small proof-of-concept
2. [ ] Test with one quote section
3. [ ] Verify performance meets requirements
4. [ ] Get user feedback

### Following Weeks
1. [ ] Create feature branch
2. [ ] Follow implementation checklist
3. [ ] Weekly demos to stakeholders
4. [ ] Beta testing
5. [ ] Production rollout

---

## Additional Resources

### Industry Research
- RFC 6902 JSON Patch: https://datatracker.ietf.org/doc/html/rfc6902
- Notion's data model: https://www.notion.so/blog/data-model-behind-notion
- Google Docs OT: https://operational-transformation.github.io
- Figma's approach: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/

### Libraries
- **rfc6902**: https://www.npmjs.com/package/rfc6902
- **react-chrono**: https://react-chrono.prabhumurthy.com
- **Tiptap**: https://tiptap.dev
- **Yjs**: https://docs.yjs.dev
- **Slate**: https://docs.slatejs.org

### Code Examples
All code examples are embedded in:
- [DOCUMENT_ENGINE_RESEARCH_COMPLETE.md](DOCUMENT_ENGINE_RESEARCH_COMPLETE.md) - Full implementation code
- [LIVE_PREVIEW_IMPROVEMENT_PLAN.md](LIVE_PREVIEW_IMPROVEMENT_PLAN.md) - Tiptap-specific code

---

## Summary

**Problem**: Static text and dynamic values inseparably mixed, causing data loss

**Solution**: Explicit data bindings in structured document tree

**Recommendation**: Custom Hybrid Document Model
- ✅ 5-6 week implementation
- ✅ ~50 KB bundle size
- ✅ 60-80% storage efficiency vs snapshots
- ✅ Industry-standard RFC 6902 for versioning
- ✅ Perfect fit for quote documents

**Status**: Research complete - ready for team decision

---

**Questions?** All answers are in [DOCUMENT_ENGINE_RESEARCH_COMPLETE.md](DOCUMENT_ENGINE_RESEARCH_COMPLETE.md)
