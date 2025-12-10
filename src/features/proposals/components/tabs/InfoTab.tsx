/**
 * Info Tab - Quartet Layout
 *
 * 2x2 grid of information cards:
 * - Top Left: Project Details
 * - Top Right: Created By
 * - Bottom Left: Client Information
 * - Bottom Right: Job Details
 *
 * Apple-level design: subtle shadows, minimal borders, clean typography
 */

import { useState } from 'react';
import { CalendarBlank, User, Buildings, MapPin } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';

// Card wrapper component for consistent styling
interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function InfoCard({ title, icon, children, className }: InfoCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm',
        'p-6 space-y-5',
        'border border-gray-100 dark:border-gray-700/50',
        className
      )}
    >
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Field wrapper for consistent label + input styling
interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-gray-600 dark:text-gray-400">
        {label}
        {required && <span className="text-coral ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// Job type options
const JOB_TYPE_OPTIONS = [
  { value: 'union', label: 'Union' },
  { value: 'non_union', label: 'Non-Union' },
];

interface InfoTabProps {
  mode: EditorMode;
}

export function InfoTab({ mode }: InfoTabProps) {
  const isBuilderMode = mode === 'builder';

  // State for all fields
  const [projectName, setProjectName] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [quoteSource, setQuoteSource] = useState('');

  const [createdByName, setCreatedByName] = useState('');
  const [createdByEmail, setCreatedByEmail] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [jobLocation, setJobLocation] = useState('');
  const [jobFloor, setJobFloor] = useState('');
  const [jobType, setJobType] = useState('');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  // Input styling
  const inputClassName = cn(
    'h-10 rounded-lg border-gray-200 dark:border-gray-600',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral',
    'transition-colors'
  );

  const selectTriggerClassName = cn(
    'h-10 rounded-lg border-gray-200 dark:border-gray-600',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral'
  );

  // Disabled style for builder mode
  const disabledInputClassName = isBuilderMode
    ? cn(inputClassName, 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60')
    : inputClassName;

  const disabledSelectClassName = isBuilderMode
    ? cn(selectTriggerClassName, 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60')
    : selectTriggerClassName;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Left: Project Details */}
      <InfoCard
        title="Project Details"
        icon={<CalendarBlank className="w-5 h-5" />}
      >
        <Field label="Project Name" required>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
            className={disabledInputClassName}
            disabled={isBuilderMode}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Proposal Date">
            <Input
              type="date"
              value={proposalDate}
              onChange={(e) => setProposalDate(e.target.value)}
              className={disabledInputClassName}
              disabled={isBuilderMode}
            />
          </Field>
          <Field label="Quote Source">
            <Input
              value={quoteSource}
              onChange={(e) => setQuoteSource(e.target.value)}
              placeholder="e.g., Referral, Website"
              className={disabledInputClassName}
              disabled={isBuilderMode}
            />
          </Field>
        </div>
      </InfoCard>

      {/* Top Right: Created By */}
      <InfoCard
        title="Created By"
        icon={<User className="w-5 h-5" />}
      >
        <Field label="Who's Quoting">
          <Select value={createdByName} onValueChange={setCreatedByName} disabled={isBuilderMode}>
            <SelectTrigger className={disabledSelectClassName}>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {/* TODO: Populate from org members */}
              <SelectItem value="user1">John Smith</SelectItem>
              <SelectItem value="user2">Jane Doe</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Email">
          <Input
            type="email"
            value={createdByEmail}
            onChange={(e) => setCreatedByEmail(e.target.value)}
            placeholder="Auto-filled from selection"
            className={cn(disabledInputClassName, 'bg-gray-50 dark:bg-gray-700/50')}
            disabled
          />
        </Field>
      </InfoCard>

      {/* Bottom Left: Client Information */}
      <InfoCard
        title="Client Information"
        icon={<Buildings className="w-5 h-5" />}
      >
        <Field label="Client Name" required>
          <Input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Enter client name"
            className={disabledInputClassName}
            disabled={isBuilderMode}
          />
        </Field>

        <Field label="Company Name">
          <Input
            value={clientCompany}
            onChange={(e) => setClientCompany(e.target.value)}
            placeholder="Enter company name"
            className={disabledInputClassName}
            disabled={isBuilderMode}
          />
        </Field>

        <Field label="Address">
          <Input
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder="Enter address"
            className={disabledInputClassName}
            disabled={isBuilderMode}
          />
        </Field>

        <Field label="Phone Number">
          <Input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className={disabledInputClassName}
            disabled={isBuilderMode}
          />
        </Field>
      </InfoCard>

      {/* Bottom Right: Job Details */}
      <InfoCard
        title="Job Details"
        icon={<MapPin className="w-5 h-5" />}
      >
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3">
            <Field label="Job Location">
              <Input
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="Enter job site address"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          </div>
          <div className="col-span-1">
            <Field label="FL">
              <Input
                value={jobFloor}
                onChange={(e) => setJobFloor(e.target.value)}
                placeholder="—"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Job Type">
            <Select value={jobType} onValueChange={setJobType} disabled={isBuilderMode}>
              <SelectTrigger className={disabledSelectClassName}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Est. Due Date">
            <Input
              type="date"
              value={estimatedDueDate}
              onChange={(e) => setEstimatedDueDate(e.target.value)}
              className={disabledInputClassName}
              disabled={isBuilderMode}
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea
            value={jobNotes}
            onChange={(e) => setJobNotes(e.target.value)}
            placeholder="Additional notes about the job..."
            disabled={isBuilderMode}
            className={cn(
              'min-h-[80px] rounded-lg border-gray-200 dark:border-gray-600',
              'focus:ring-2 focus:ring-coral/20 focus:border-coral',
              'resize-none',
              isBuilderMode && 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
            )}
          />
        </Field>
      </InfoCard>
      </div>
    </div>
  );
}

export default InfoTab;
