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

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
  setVariablesGetter,
  getAllFormVariables,
  type EditorContent,
  type PresentationEditorRef,
  type PageSettings,
} from '../presentation';
import type { Editor } from '@tiptap/react';
import { exportToPdf, exportToDocx } from '../../utils/documentExport';
import { resolveContentVariables, renderContentToHtml } from '../../utils/contentRenderer';

interface ProposalData {
  form_data?: {
    info?: {
      projectName?: string;
      proposalDate?: string;
      clientName?: string;
      clientCompany?: string;
      clientEmail?: string;
      clientPhone?: string;
      clientAddress?: string;
      jobLocation?: string;
    };
  };
  organization?: {
    name?: string;
    organization_info?: {
      address?: string;
      phone?: string;
      email?: string;
    };
  };
}

interface PresentationTabProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
  proposalData?: ProposalData;
}

// Empty default content - placeholder will show when editor is empty
const DEFAULT_PRESENTATION_CONTENT: EditorContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function PresentationTab({ mode, onDirtyChange, proposalData }: PresentationTabProps) {
  const isBuilderMode = mode === 'builder';
  const { data, setPresentationData } = useFormBuilder();

  // Extract info and org data for variable resolution
  const infoData = useMemo(() => proposalData?.form_data?.info, [proposalData?.form_data?.info]);
  const orgData = useMemo(() => {
    const org = proposalData?.organization;
    if (!org) return undefined;
    return {
      name: org.name,
      address: org.organization_info?.address,
      phone: org.organization_info?.phone,
      email: org.organization_info?.email,
    };
  }, [proposalData?.organization]);

  // Editor ref for programmatic control
  const editorRef = useRef<PresentationEditorRef>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Track if this is the initial load (skip marking dirty on first onChange)
  const isInitialLoadRef = useRef(true);

  // Update the variables getter when form data changes (for { autocomplete)
  useEffect(() => {
    // Flatten the categorized variables into a single array for the suggestion system
    setVariablesGetter(() => {
      const categorizedVars = getAllFormVariables(data);
      return Object.values(categorizedVars).flat();
    });
  }, [data]);

  // UI State
  const [showVariables, setShowVariables] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load pageSettings from context, fallback to default
  const pageSettings = useMemo((): PageSettings => {
    const contextSettings = data.presentation?.pageSettings;
    if (contextSettings) {
      return contextSettings as PageSettings;
    }
    return DEFAULT_PAGE_SETTINGS as PageSettings;
  }, [data.presentation?.pageSettings]);

  // Handle page settings change - persist to context
  const handlePageSettingsChange = useCallback((newSettings: PageSettings) => {
    setPresentationData({
      ...data.presentation,
      sections: data.presentation?.sections || [],
      pageSettings: newSettings,
    });
    onDirtyChange?.(true);
  }, [data.presentation, setPresentationData, onDirtyChange]);

  // Listen for slash command 'Variable' selection to open the panel
  useEffect(() => {
    const handleOpenVariableInserter = () => {
      setShowVariables(true);
    };

    window.addEventListener('open-variable-inserter', handleOpenVariableInserter);
    return () => {
      window.removeEventListener('open-variable-inserter', handleOpenVariableInserter);
    };
  }, []);

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

  // Export to PDF with resolved variables
  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      // Get current content from editor
      const currentContent = editor?.getJSON() as EditorContent;
      if (!currentContent) {
        throw new Error('No content to export');
      }

      // Resolve all variables (undefined for proposalData - direct proposal fields not yet available here)
      const resolvedContent = resolveContentVariables(currentContent, data, undefined, infoData, orgData);

      // Render to HTML
      const resolvedHtml = renderContentToHtml(resolvedContent);

      // Find the editor container element (used as fallback)
      const editorElement = document.querySelector('.presentation-editor') as HTMLElement;
      if (!editorElement) {
        throw new Error('Editor element not found');
      }

      const projectName = infoData?.projectName || infoData?.clientName || 'proposal';
      const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pdf`;

      await exportToPdf(editorElement, {
        filename,
        resolvedHtml,
        pageFormat: 'letter',
      });
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
  }, [editor, data, infoData, orgData]);

  // Export to DOCX with resolved variables
  const handleExportDocx = useCallback(async () => {
    setIsExporting(true);
    try {
      // Get current content from editor
      const currentContent = editor?.getJSON() as EditorContent;
      if (!currentContent) {
        throw new Error('No content to export');
      }

      // Resolve all variables before export (undefined for proposalData - direct proposal fields not yet available here)
      const resolvedContent = resolveContentVariables(currentContent, data, undefined, infoData, orgData);

      const projectName = infoData?.projectName || infoData?.clientName || 'proposal';
      const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.docx`;

      await exportToDocx(resolvedContent, {
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
  }, [editor, data, infoData, orgData]);

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
          onPageSettingsChange={handlePageSettingsChange}
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
        infoData={infoData}
        orgData={orgData}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
      />
    </div>
  );
}

export default PresentationTab;
