/**
 * Presentation Tab
 *
 * Rich text editor for creating proposal presentations.
 * - Builder Mode: Disabled (presentations are created when filling proposals)
 * - Filler Mode: Full WYSIWYG editor with variable insertion
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { FileText, Plus, Trash, CaretDown, CaretRight, Spinner, FilePdf } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';
import { useFormBuilder, type PresentationSection, type PresentationData } from '../../context/FormBuilderContext';
import { PresentationEditor, type EditorContent } from '../presentation';

interface PresentationTabProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
  proposalData?: unknown;
}

// Helper to create Tiptap-compatible content
function createTiptapContent(headingLevel: number, headingText: string, paragraphText: string): EditorContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: headingLevel },
        content: [{ type: 'text', text: headingText }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: paragraphText }],
      },
    ],
  };
}

// Default sections for new presentations
const DEFAULT_SECTIONS: PresentationSection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    content: createTiptapContent(1, 'Project Overview', 'Thank you for the opportunity to submit this proposal for ') as unknown as PresentationSection['content'],
    collapsed: false,
  },
  {
    id: 'scope',
    title: 'Scope of Work',
    content: createTiptapContent(2, 'Scope of Work', 'This section outlines the detailed scope of work for this project.') as unknown as PresentationSection['content'],
    collapsed: false,
  },
  {
    id: 'products',
    title: 'Products & Materials',
    content: createTiptapContent(2, 'Products & Materials', 'The following products and materials will be used:') as unknown as PresentationSection['content'],
    collapsed: false,
  },
  {
    id: 'pricing',
    title: 'Pricing Summary',
    content: createTiptapContent(2, 'Pricing Summary', 'Below is the pricing breakdown for this project.') as unknown as PresentationSection['content'],
    collapsed: false,
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    content: createTiptapContent(2, 'Terms & Conditions', 'The following terms and conditions apply to this proposal.') as unknown as PresentationSection['content'],
    collapsed: false,
  },
];

export function PresentationTab({ mode, onDirtyChange }: PresentationTabProps) {
  const isBuilderMode = mode === 'builder';
  const { data, setPresentationData } = useFormBuilder();

  // Initialize sections from context or defaults
  const [sections, setSections] = useState<PresentationSection[]>(() => {
    if (data.presentation.sections.length > 0) {
      return data.presentation.sections;
    }
    return DEFAULT_SECTIONS;
  });

  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id || null);
  const [isExporting, setIsExporting] = useState(false);

  // Sync sections with context
  useEffect(() => {
    if (data.presentation.sections.length > 0 && sections !== data.presentation.sections) {
      setSections(data.presentation.sections);
    }
  }, [data.presentation.sections]);

  // Update context when sections change
  const updateContext = useCallback((newSections: PresentationSection[]) => {
    setSections(newSections);
    setPresentationData({ sections: newSections });
    onDirtyChange?.(true);
  }, [setPresentationData, onDirtyChange]);

  // Handle section content change
  const handleContentChange = useCallback((sectionId: string, newContent: EditorContent) => {
    const newSections = sections.map(section =>
      section.id === sectionId
        ? { ...section, content: newContent as unknown as PresentationSection['content'] }
        : section
    );
    updateContext(newSections);
  }, [sections, updateContext]);

  // Handle section title change
  const handleTitleChange = useCallback((sectionId: string, newTitle: string) => {
    const newSections = sections.map(section =>
      section.id === sectionId
        ? { ...section, title: newTitle }
        : section
    );
    updateContext(newSections);
  }, [sections, updateContext]);

  // Toggle section collapsed
  const toggleSection = useCallback((sectionId: string) => {
    const newSections = sections.map(section =>
      section.id === sectionId
        ? { ...section, collapsed: !section.collapsed }
        : section
    );
    updateContext(newSections);
  }, [sections, updateContext]);

  // Add new section
  const addSection = useCallback(() => {
    const newSection: PresentationSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      content: createTiptapContent(2, 'New Section', 'Enter content here...') as unknown as PresentationSection['content'],
      collapsed: false,
    };
    const newSections = [...sections, newSection];
    updateContext(newSections);
    setActiveSection(newSection.id);
  }, [sections, updateContext]);

  // Remove section
  const removeSection = useCallback((sectionId: string) => {
    if (sections.length <= 1) return; // Keep at least one section
    const newSections = sections.filter(s => s.id !== sectionId);
    updateContext(newSections);
    if (activeSection === sectionId) {
      setActiveSection(newSections[0]?.id || null);
    }
  }, [sections, activeSection, updateContext]);

  // Get active section
  const activeSectionData = useMemo(
    () => sections.find(s => s.id === activeSection),
    [sections, activeSection]
  );

  // Handle PDF export (placeholder)
  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    // TODO: Implement PDF export using jspdf
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsExporting(false);
  }, []);

  // Builder mode: Show disabled state
  if (isBuilderMode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Presentation Tab</p>
          <p className="text-sm mt-1">
            Presentations are created when filling out proposals
          </p>
        </div>
      </div>
    );
  }

  // Filler mode: Full editor interface
  return (
    <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Left sidebar: Section list */}
      <div className="w-64 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Sections
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={addSection}
            className="h-8 w-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                activeSection === section.id
                  ? 'bg-coral/10 text-coral'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
              onClick={() => setActiveSection(section.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(section.id);
                }}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                {section.collapsed ? (
                  <CaretRight className="w-3 h-3" />
                ) : (
                  <CaretDown className="w-3 h-3" />
                )}
              </button>
              <span className="flex-1 text-sm font-medium truncate">
                {index + 1}. {section.title}
              </span>
              {sections.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(section.id);
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity"
                >
                  <Trash className="w-3 h-3 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Export button */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="w-full bg-coral hover:bg-coral-hover text-white"
          >
            {isExporting ? (
              <>
                <Spinner className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FilePdf className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right side: Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeSectionData ? (
          <>
            {/* Section title input */}
            <div className="mb-4">
              <Input
                value={activeSectionData.title}
                onChange={(e) => handleTitleChange(activeSectionData.id, e.target.value)}
                placeholder="Section title..."
                className="text-lg font-semibold border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-coral rounded-none px-0 bg-transparent"
              />
            </div>

            {/* Rich text editor */}
            <div className="flex-1 overflow-y-auto">
              <PresentationEditor
                value={activeSectionData.content as unknown as EditorContent}
                onChange={(value) => handleContentChange(activeSectionData.id, value)}
                placeholder="Start writing your presentation content..."
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Select a section to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PresentationTab;
