/**
 * Presentation Tab
 *
 * Word-style rich text editor for creating proposal presentations.
 * Features:
 * - Word-like page layout with paper appearance
 * - Expandable variables panel on the right
 * - Preview with resolved variables
 * - Export to PDF/DOCX
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { FileText } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { EditorMode } from '../ProposalEditor';
import { useFormBuilder, type PresentationSection } from '../../context/FormBuilderContext';
import {
  PresentationEditor,
  PresentationToolbar,
  VariablePanel,
  EditorHelpButton,
  PreviewDialog,
  DEFAULT_PAGE_SETTINGS,
  type EditorContent,
  type PresentationEditorRef,
  type PageSettings,
} from '../presentation';
import type { Editor } from '@tiptap/react';
import { exportToPdf, exportToDocx } from '../../utils/documentExport';

interface PresentationTabProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
  proposalData?: unknown;
}

// Empty default content - placeholder will show when editor is empty
const DEFAULT_PRESENTATION_CONTENT: EditorContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function PresentationTab({ mode, onDirtyChange }: PresentationTabProps) {
  const isBuilderMode = mode === 'builder';
  const { data, setPresentationData } = useFormBuilder();

  // Editor ref for programmatic control
  const editorRef = useRef<PresentationEditorRef>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Track if this is the initial load (skip marking dirty on first onChange)
  const isInitialLoadRef = useRef(true);

  // UI State
  const [showVariables, setShowVariables] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS as PageSettings);

  // Handle editor ready - called when Tiptap editor is initialized
  const handleEditorReady = useCallback((ed: Editor) => {
    setEditor(ed);
  }, []);

  // Get initial content from context or use default - memoized to prevent re-computation
  const initialContent = useMemo((): EditorContent => {
    // If we have presentation data with content, use it
    const sections = data.presentation?.sections;
    if (sections && sections.length > 0 && sections[0]?.content) {
      // Merge all section contents into one document
      const allContent: EditorContent['content'] = [];
      sections.forEach((section) => {
        const content = section.content as unknown as EditorContent;
        if (content?.content) {
          allContent.push(...content.content);
        }
      });
      if (allContent.length > 0) {
        return { type: 'doc', content: allContent };
      }
    }
    return DEFAULT_PRESENTATION_CONTENT;
  }, [data.presentation?.sections]);

  // Handle content changes
  const handleContentChange = useCallback((newContent: EditorContent) => {
    // Skip marking dirty on initial load (editor fires onChange when it first mounts)
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Store as a single section for simplicity
    setPresentationData({
      sections: [{
        id: 'main',
        title: 'Presentation',
        content: newContent as unknown as PresentationSection['content'],
        collapsed: false,
      }],
    });
    onDirtyChange?.(true);
  }, [setPresentationData, onDirtyChange]);

  // Handle variable selection from panel
  const handleVariableSelect = useCallback((variableKey: string, variableLabel: string) => {
    editorRef.current?.insertVariable(variableKey, variableLabel);
  }, []);

  // Toggle variables panel
  const handleToggleVariables = useCallback(() => {
    setShowVariables(prev => !prev);
  }, []);

  // Preview with resolved variables
  const handlePreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  // Export to PDF
  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      // Find the editor container element
      const editorElement = document.querySelector('.presentation-editor') as HTMLElement;
      if (!editorElement) {
        throw new Error('Editor element not found');
      }

      const projectName = data.client?.projectName || data.client?.clientName || 'proposal';
      const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pdf`;

      await exportToPdf(editorElement, { filename });
      toast.success('PDF exported successfully', {
        description: `Saved as ${filename}`,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsExporting(false);
    }
  }, [data.client?.projectName, data.client?.clientName]);

  // Export to DOCX
  const handleExportDocx = useCallback(async () => {
    setIsExporting(true);
    try {
      // Get current content from editor
      const currentContent = editor?.getJSON() as EditorContent;
      if (!currentContent) {
        throw new Error('No content to export');
      }

      const projectName = data.client?.projectName || data.client?.clientName || 'proposal';
      const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.docx`;

      await exportToDocx(currentContent, {
        filename,
        title: projectName,
      });
      toast.success('DOCX exported successfully', {
        description: `Saved as ${filename}`,
      });
    } catch (error) {
      console.error('DOCX export failed:', error);
      toast.error('Failed to export DOCX', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsExporting(false);
    }
  }, [editor, data.client?.projectName, data.client?.clientName]);

  // Builder mode: Show disabled state
  if (isBuilderMode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Presentation Editor</p>
          <p className="text-sm mt-1">
            Presentations are created when filling out proposals
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] -mx-6 -mt-6">
      {/* Toolbar - only show when editor is ready */}
      {editor && (
        <PresentationToolbar
          editor={editor}
          showVariables={showVariables}
          onToggleVariables={handleToggleVariables}
          onPreview={handlePreview}
          onExportPdf={handleExportPdf}
          onExportDocx={handleExportDocx}
          isExporting={isExporting}
          pageSettings={pageSettings}
          onPageSettingsChange={setPageSettings}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <PresentationEditor
            ref={editorRef}
            value={initialContent}
            onChange={handleContentChange}
            onReady={handleEditorReady}
            pageStyle
            placeholder="Start writing your presentation..."
            pageSettings={pageSettings}
          />
        </div>

        {/* Variables Panel */}
        <VariablePanel
          isOpen={showVariables}
          onClose={() => setShowVariables(false)}
          onSelect={handleVariableSelect}
        />
      </div>

      {/* Help Button */}
      <EditorHelpButton />

      {/* Preview Dialog */}
      <PreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        content={editor?.getJSON() as EditorContent | null}
        formData={data}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
      />
    </div>
  );
}

export default PresentationTab;
