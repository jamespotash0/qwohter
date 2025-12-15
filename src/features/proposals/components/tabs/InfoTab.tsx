/**
 * Info Tab - Quartet Layout
 *
 * 2x2 grid of information cards:
 * - Top Left: Project Details
 * - Top Right: Source & Work Details
 * - Bottom Left: Client Information
 * - Bottom Right: Job Details
 *
 * Apple-level design: subtle shadows, minimal borders, clean typography
 */

import { useState, useEffect } from 'react';
import { CalendarBlank, Tag, Buildings, MapPin, Info } from '@phosphor-icons/react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';
import MapboxInput from '@/components/common/inputs/MapboxInput';
import { useUser } from '@/auth';
import { useCurrentOrganization, useOrganizationMembers } from '@/hooks/queries/useOrganization';

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
  tooltip?: string;
  children: React.ReactNode;
}

function Field({ label, required, tooltip, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          {label}
          {required && <span className="text-coral ml-0.5">*</span>}
        </Label>
        {tooltip && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

// Dropdown options
const LABOR_TYPE_OPTIONS = [
  { value: 'union', label: 'Union' },
  { value: 'non_union', label: 'Non-Union' },
];

interface InfoTabProps {
  mode: EditorMode;
  proposalData?: any;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function InfoTab({ mode, proposalData, onDirtyChange }: InfoTabProps) {
  const isBuilderMode = mode === 'builder';

  // Get current user and organization members
  const user = useUser();
  const { organizationId } = useCurrentOrganization(user?.id || '', !!user?.id);
  const { data: members = [] } = useOrganizationMembers(organizationId || '', !!organizationId);

  // Project Details
  const [projectName, setProjectName] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Work Details
  const [quoteSource, setQuoteSource] = useState('');
  const [categoryOfWork, setCategoryOfWork] = useState('');
  const [laborType, setLaborType] = useState('');
  const [projectType, setProjectType] = useState('');

  // Client Information
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Job Details
  const [jobLocation, setJobLocation] = useState('');
  const [jobFloor, setJobFloor] = useState('');
  const [locationType, setLocationType] = useState('');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  // Track initial values for dirty detection
  const [initialValues, setInitialValues] = useState({
    projectName: '',
    proposalDate: '',
    contactName: '',
    contactEmail: '',
    quoteSource: '',
    categoryOfWork: '',
    laborType: '',
    projectType: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    jobLocation: '',
    jobFloor: '',
    locationType: '',
    estimatedDueDate: '',
    jobNotes: '',
  });
  const [initialValuesCaptured, setInitialValuesCaptured] = useState(false);

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

  // Set proposal date to today in filler mode
  useEffect(() => {
    if (!isBuilderMode && !proposalDate) {
      const today = new Date().toISOString().split('T')[0];
      setProposalDate(today);
    }
  }, [isBuilderMode, proposalDate]);

  // Auto-fill project name from proposal data in filler mode
  useEffect(() => {
    if (!isBuilderMode && proposalData?.project_name && !projectName) {
      setProjectName(proposalData.project_name);
    }
  }, [isBuilderMode, proposalData, projectName]);

  // Capture initial values after auto-fills (with delay to let all effects run)
  useEffect(() => {
    if (!initialValuesCaptured && projectName && proposalDate) {
      const timer = setTimeout(() => {
        setInitialValues({
          projectName,
          proposalDate,
          contactName,
          contactEmail,
          quoteSource,
          categoryOfWork,
          laborType,
          projectType,
          clientName,
          clientCompany,
          clientEmail,
          clientPhone,
          clientAddress,
          jobLocation,
          jobFloor,
          locationType,
          estimatedDueDate,
          jobNotes,
        });
        setInitialValuesCaptured(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    initialValuesCaptured,
    projectName,
    proposalDate,
    contactName,
    contactEmail,
    quoteSource,
    categoryOfWork,
    laborType,
    projectType,
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientAddress,
    jobLocation,
    jobFloor,
    locationType,
    estimatedDueDate,
    jobNotes,
  ]);

  // Check for changes and report dirty state
  useEffect(() => {
    if (!initialValuesCaptured || !onDirtyChange) return;

    const hasChanges =
      projectName !== initialValues.projectName ||
      proposalDate !== initialValues.proposalDate ||
      contactName !== initialValues.contactName ||
      contactEmail !== initialValues.contactEmail ||
      quoteSource !== initialValues.quoteSource ||
      categoryOfWork !== initialValues.categoryOfWork ||
      laborType !== initialValues.laborType ||
      projectType !== initialValues.projectType ||
      clientName !== initialValues.clientName ||
      clientCompany !== initialValues.clientCompany ||
      clientEmail !== initialValues.clientEmail ||
      clientPhone !== initialValues.clientPhone ||
      clientAddress !== initialValues.clientAddress ||
      jobLocation !== initialValues.jobLocation ||
      jobFloor !== initialValues.jobFloor ||
      locationType !== initialValues.locationType ||
      estimatedDueDate !== initialValues.estimatedDueDate ||
      jobNotes !== initialValues.jobNotes;

    onDirtyChange(hasChanges);
  }, [
    initialValuesCaptured,
    onDirtyChange,
    projectName,
    proposalDate,
    contactName,
    contactEmail,
    quoteSource,
    categoryOfWork,
    laborType,
    projectType,
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientAddress,
    jobLocation,
    jobFloor,
    locationType,
    estimatedDueDate,
    jobNotes,
    initialValues,
  ]);

  // Handle contact name change - auto-select corresponding email
  const handleContactNameChange = (userId: string) => {
    setContactName(userId);
    const member = members.find(m => m.user_id === userId);
    if (member?.email) {
      setContactEmail(member.email);
    }
  };

  // Handle contact email change - auto-select corresponding name
  const handleContactEmailChange = (email: string) => {
    setContactEmail(email);
    const member = members.find(m => m.email === email);
    if (member?.user_id) {
      setContactName(member.user_id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Left: Project Details */}
        <InfoCard
          title="Project Details"
          icon={<CalendarBlank className="w-5 h-5" />}
        >
          {/* Project Name (60%) + Proposal Date (40%) */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3">
              <Field label="Project Name" tooltip="Name of the project or job">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className={disabledInputClassName}
                  disabled={isBuilderMode}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Proposal Date" tooltip="Date this proposal is being created">
                <Input
                  type="date"
                  value={proposalDate}
                  onChange={(e) => setProposalDate(e.target.value)}
                  className={disabledInputClassName}
                  disabled={isBuilderMode}
                />
              </Field>
            </div>
          </div>

          {/* Contact Name + Contact Email (Dropdowns) */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name" tooltip="Primary contact person for this proposal">
              <Select value={contactName} onValueChange={handleContactNameChange} disabled={isBuilderMode}>
                <SelectTrigger className={disabledSelectClassName}>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.status === 'Active' && m.full_name)
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Contact Email" tooltip="Email address of the primary contact">
              <Select value={contactEmail} onValueChange={handleContactEmailChange} disabled={isBuilderMode}>
                <SelectTrigger className={disabledSelectClassName}>
                  <SelectValue placeholder="Select email" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.status === 'Active' && m.email)
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.email!}>
                        {member.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </InfoCard>

        {/* Top Right: Work Details */}
        <InfoCard
          title="Work Details"
          icon={<Tag className="w-5 h-5" />}
        >
          {/* Row 1: Quote Source + Type of Work */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quote Source" tooltip="Where did this lead come from?">
              <Input
                value={quoteSource}
                onChange={(e) => setQuoteSource(e.target.value)}
                placeholder="e.g., Referral, Website"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
            <Field label="Type of Work" tooltip="What type of work is this project?">
              <Input
                value={categoryOfWork}
                onChange={(e) => setCategoryOfWork(e.target.value)}
                placeholder="Walls, Furniture, HVAC..."
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          </div>

          {/* Row 2: Labor Type + Project Type */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Labor Type" tooltip="Union or non-union labor requirements">
              <Select value={laborType} onValueChange={setLaborType} disabled={isBuilderMode}>
                <SelectTrigger className={disabledSelectClassName}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {LABOR_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Project Type" tooltip="What type of facility or building?">
              <Input
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder="Religious Institution, Office, Government..."
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          </div>
        </InfoCard>

        {/* Bottom Left: Client Information */}
        <InfoCard
          title="Client Information"
          icon={<Buildings className="w-5 h-5" />}
        >
          {/* Client Name + Client Company */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client Name" tooltip="Name of the client or decision maker">
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
            <Field label="Client Company" tooltip="Client's company or organization name">
              <Input
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Enter company name"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          </div>

          {/* Email Address + Phone Number */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email Address" tooltip="Client's email address for communication">
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@example.com"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
            <Field label="Phone Number" tooltip="Client's contact phone number">
              <Input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          </div>

          {/* Address (full width) */}
          {isBuilderMode ? (
            <Field label="Address" tooltip="Client's mailing or business address">
              <Input
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Enter address"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          ) : (
            <MapboxInput
              id="client-address"
              label="Address"
              value={clientAddress}
              onChange={setClientAddress}
              placeholder="Enter address"
              className={cn(
                'h-10 rounded-lg border-gray-200 dark:border-gray-600',
                'focus:ring-2 focus:ring-coral/20 focus:border-coral'
              )}
            />
          )}
        </InfoCard>

        {/* Bottom Right: Job Details */}
        <InfoCard
          title="Job Details"
          icon={<MapPin className="w-5 h-5" />}
        >
          {/* Job Location + FL */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              {isBuilderMode ? (
                <Field label="Job Location" tooltip="Physical address where work will be performed">
                  <Input
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="Enter job site address"
                    className={disabledInputClassName}
                    disabled={isBuilderMode}
                  />
                </Field>
              ) : (
                <MapboxInput
                  id="job-location"
                  label="Job Location"
                  value={jobLocation}
                  onChange={setJobLocation}
                  placeholder="Enter job site address"
                  className={cn(
                    'h-10 rounded-lg border-gray-200 dark:border-gray-600',
                    'focus:ring-2 focus:ring-coral/20 focus:border-coral'
                  )}
                />
              )}
            </div>
            <div className="col-span-1">
              <Field label="FL" tooltip="Floor number at job location">
                <Input
                  value={jobFloor}
                  onChange={(e) => setJobFloor(e.target.value)}
                  placeholder="1, 1st Fl"
                  className={disabledInputClassName}
                  disabled={isBuilderMode}
                />
              </Field>
            </div>
          </div>

          {/* Location Type + Est. Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location Type" tooltip="Type of location or facility">
              <Input
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                placeholder="e.g., Office, Warehouse"
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
            <Field label="Est. Due Date" tooltip="Estimated completion or due date for the project">
              <Input
                type="date"
                value={estimatedDueDate}
                onChange={(e) => setEstimatedDueDate(e.target.value)}
                className={disabledInputClassName}
                disabled={isBuilderMode}
              />
            </Field>
          </div>

          {/* Notes */}
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
