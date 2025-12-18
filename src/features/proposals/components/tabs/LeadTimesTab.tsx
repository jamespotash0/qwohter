/**
 * Lead Times Tab - Unified Table with Sections
 *
 * Track project phases with durations and estimated completion dates.
 * Features:
 * - Section-based organization (like Pricing)
 * - Phase list with duration (supports ranges like "1-2 weeks")
 * - Est. completion date
 * - Drag to reorder
 *
 * Two modes:
 * - Builder mode: Define section/phase structure, values disabled
 * - Filler mode: Enter actual durations and dates
 */

import { useState, useMemo } from 'react';
import { Plus, Trash, DotsSixVertical, Clock, CaretDown, CaretRight } from '@phosphor-icons/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';

interface LeadTimePhase {
  id: string;
  phaseName: string;
  duration: string;
  estCompletionDate: string;
}

interface LeadTimeSection {
  id: string;
  name: string;
  collapsed: boolean;
  phases: LeadTimePhase[];
}

// Default: Single example section for both builder and filler modes
const DEFAULT_SECTIONS: LeadTimeSection[] = [
  {
    id: 'section_1',
    name: 'Project Timeline',
    collapsed: false,
    phases: [],
  },
];

// Sortable phase row component
interface SortablePhaseRowProps {
  phase: LeadTimePhase;
  sectionId: string;
  isBuilderMode: boolean;
  inputClassName: string;
  disabledInputClassName: string;
  onUpdate: (sectionId: string, phaseId: string, updates: Partial<LeadTimePhase>) => void;
  onRemove: (sectionId: string, phaseId: string) => void;
}

function SortablePhaseRow({
  phase,
  sectionId,
  isBuilderMode,
  inputClassName,
  disabledInputClassName,
  onUpdate,
  onRemove,
}: SortablePhaseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid grid-cols-12 gap-3 px-4 py-2.5 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20',
        isDragging && 'bg-gray-100 dark:bg-gray-700/50 shadow-lg z-50'
      )}
    >
      {/* Drag Handle + Indent */}
      <div className="col-span-1 flex justify-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
        >
          <DotsSixVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Phase Name */}
      <div className="col-span-5">
        <Input
          value={phase.phaseName}
          onChange={(e) => onUpdate(sectionId, phase.id, { phaseName: e.target.value })}
          placeholder="Phase name"
          className={inputClassName}
        />
      </div>

      {/* Duration */}
      <div className="col-span-3">
        <Input
          type="text"
          value={phase.duration}
          onChange={(e) => onUpdate(sectionId, phase.id, { duration: e.target.value })}
          placeholder={isBuilderMode ? '—' : 'e.g., 2-3 weeks'}
          className={disabledInputClassName}
          disabled={isBuilderMode}
        />
      </div>

      {/* Est. Completion Date */}
      <div className="col-span-2">
        <Input
          type="date"
          value={phase.estCompletionDate}
          onChange={(e) => onUpdate(sectionId, phase.id, { estCompletionDate: e.target.value })}
          className={disabledInputClassName}
          disabled={isBuilderMode}
        />
      </div>

      {/* Delete */}
      <div className="col-span-1 flex justify-center">
        <button
          onClick={() => onRemove(sectionId, phase.id)}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface LeadTimesTabProps {
  mode: EditorMode;
}

export function LeadTimesTab({ mode }: LeadTimesTabProps) {
  const isBuilderMode = mode === 'builder';
  const [sections, setSections] = useState<LeadTimeSection[]>(DEFAULT_SECTIONS);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Input styling - compact design matching PricingTab
  const inputClassName = cn(
    'h-7 text-xs rounded border-gray-200 dark:border-gray-600 px-2',
    'focus:ring-1 focus:ring-coral/20 focus:border-coral'
  );

  const disabledInputClassName = isBuilderMode
    ? cn(inputClassName, 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60')
    : inputClassName;

  // Calculate total phases
  const totalPhases = useMemo(() => {
    return sections.reduce((sum, section) => sum + section.phases.length, 0);
  }, [sections]);

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  // Update section name
  const updateSectionName = (sectionId: string, name: string) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, name } : s)));
  };

  // Remove section
  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  // Add new section
  const addSection = () => {
    const newSection: LeadTimeSection = {
      id: `section_${Date.now()}`,
      name: 'New Section',
      collapsed: false,
      phases: [],
    };
    setSections([...sections, newSection]);
  };

  // Add phase to section
  const addPhase = (sectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              phases: [
                ...s.phases,
                {
                  id: `${Date.now()}`,
                  phaseName: '',
                  duration: '',
                  estCompletionDate: '',
                },
              ],
            }
          : s
      )
    );
  };

  // Update phase
  const updatePhase = (sectionId: string, phaseId: string, updates: Partial<LeadTimePhase>) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              phases: s.phases.map((p) => (p.id === phaseId ? { ...p, ...updates } : p)),
            }
          : s
      )
    );
  };

  // Remove phase
  const removePhase = (sectionId: string, phaseId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, phases: s.phases.filter((p) => p.id !== phaseId) }
          : s
      )
    );
  };

  // Handle drag end for phases within a section
  const handleDragEnd = (sectionId: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((currentSections) =>
        currentSections.map((s) => {
          if (s.id !== sectionId) return s;
          const oldIndex = s.phases.findIndex((p) => p.id === active.id);
          const newIndex = s.phases.findIndex((p) => p.id === over.id);
          return { ...s, phases: arrayMove(s.phases, oldIndex, newIndex) };
        })
      );
    }
  };

  // ========== BUILDER MODE: Unified table with section dividers ==========
  if (isBuilderMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Lead Time Sections
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define the timeline phases and sections for this form
          </p>
        </div>

        {/* Unified Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-5">Phase Name</div>
            <div className="col-span-3">Duration</div>
            <div className="col-span-2">Est. Completion</div>
            <div className="col-span-1"></div>
          </div>

          {/* Sections with Phases */}
          <div>
            {sections.map((section, sectionIndex) => (
              <div key={section.id}>
                {/* Section Divider Row */}
                <div
                  className={cn(
                    'grid grid-cols-12 gap-3 px-4 py-3 items-center bg-gray-100/80 dark:bg-gray-700/50',
                    sectionIndex > 0 && 'border-t-2 border-gray-200 dark:border-gray-600'
                  )}
                >
                  {/* Drag Handle */}
                  <div className="col-span-1 flex justify-center">
                    <button className="p-1 text-gray-400 hover:text-gray-600 cursor-grab">
                      <DotsSixVertical className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Section Name (editable) */}
                  <div className="col-span-9">
                    <Input
                      value={section.name}
                      onChange={(e) => updateSectionName(section.id, e.target.value)}
                      className="h-8 font-semibold text-gray-900 dark:text-gray-100 border-transparent bg-transparent hover:border-gray-300 focus:border-coral"
                      placeholder="Section name"
                    />
                  </div>

                  {/* Collapsed by default checkbox */}
                  <div className="col-span-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-gray-500 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={section.collapsed}
                        onChange={(e) => {
                          setSections(
                            sections.map((s) =>
                              s.id === section.id ? { ...s, collapsed: e.target.checked } : s
                            )
                          );
                        }}
                        className="rounded border-gray-300 w-3 h-3"
                      />
                      Collapse
                    </label>
                  </div>

                  {/* Delete Section */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Phases for this section */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd(section.id)}
                >
                  <SortableContext
                    items={section.phases.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {section.phases.map((phase) => (
                      <SortablePhaseRow
                        key={phase.id}
                        phase={phase}
                        sectionId={section.id}
                        isBuilderMode={isBuilderMode}
                        inputClassName={inputClassName}
                        disabledInputClassName={disabledInputClassName}
                        onUpdate={updatePhase}
                        onRemove={removePhase}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {/* Add Field Row */}
                <div className="grid grid-cols-12 gap-3 px-4 py-2 items-center border-t border-gray-100 dark:border-gray-700/50">
                  <div className="col-span-1"></div>
                  <div className="col-span-11">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addPhase(section.id)}
                      className="text-coral hover:text-coral-hover hover:bg-coral/5 h-8"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Section Button */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={addSection} className="rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>
    );
  }

  // ========== FILLER MODE: Unified table with data entry ==========
  return (
    <div className="space-y-6">
      {/* Unified Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div className="col-span-5">Phase Name</div>
          <div className="col-span-3">Duration</div>
          <div className="col-span-3">Est. Completion</div>
          <div className="col-span-1"></div>
        </div>

        {/* Sections with Phases */}
        <div>
          {sections.map((section) => (
            <div key={section.id}>
              {/* Section Divider Row */}
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-200 dark:border-gray-600 items-center">
                <div className="col-span-12">
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {section.name}
                  </span>
                </div>
              </div>

              {/* Phases for this section */}
              {section.phases.map((phase) => (
                <div
                  key={phase.id}
                  className="grid grid-cols-12 gap-2 px-3 py-1 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
                >
                  {/* Phase Name */}
                  <div className="col-span-5">
                    <Input
                      value={phase.phaseName}
                      onChange={(e) =>
                        updatePhase(section.id, phase.id, { phaseName: e.target.value })
                      }
                      placeholder="Phase name"
                      className={inputClassName}
                    />
                  </div>

                  {/* Duration */}
                  <div className="col-span-3">
                    <Input
                      type="text"
                      value={phase.duration}
                      onChange={(e) =>
                        updatePhase(section.id, phase.id, { duration: e.target.value })
                      }
                      placeholder="e.g., 2-3 weeks"
                      className={inputClassName}
                    />
                  </div>

                  {/* Est. Completion Date */}
                  <div className="col-span-3">
                    <Input
                      type="date"
                      value={phase.estCompletionDate}
                      onChange={(e) =>
                        updatePhase(section.id, phase.id, {
                          estCompletionDate: e.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removePhase(section.id, phase.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Phase Row */}
              <div className="grid grid-cols-12 gap-2 px-3 py-0.5 items-center border-t border-gray-100 dark:border-gray-700/50">
                <div className="col-span-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addPhase(section.id)}
                    className="text-gray-400 hover:text-coral hover:bg-coral/5 h-6 text-[10px]"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Phase
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LeadTimesTab;
