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

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { CalendarBlank, Tag, Buildings, MapPin, Info, UserPlus, UserCircle } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import { useContacts, useCreateContact } from '@/hooks/useContacts';
import type { Contact } from '@/lib/types/contacts';
import { CONTACT_TYPES } from '@/lib/types/contacts';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

// Card wrapper component for consistent styling
interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

function InfoCard({ title, icon, children, className, headerAction }: InfoCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm',
        'p-5 space-y-4',
        'border border-gray-100 dark:border-gray-700/50',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          {icon}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {headerAction}
      </div>
      <div className="space-y-3">
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
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
          {required && <span className="text-coral ml-0.5">*</span>}
        </Label>
        {tooltip && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Info className="w-3 h-3 text-gray-400 dark:text-gray-500" />
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

/**
 * Format phone number as user types using libphonenumber-js
 * Limits input to max 15 digits (E.164 standard) and validates format
 */
function formatPhoneAsYouType(value: string): string {
  // Check for leading + (international format)
  const hasPlus = value.startsWith('+');

  // Extract only digits
  const digits = value.replace(/\D/g, '');

  // Limit to 15 digits max (E.164 standard)
  const truncatedDigits = digits.slice(0, 15);

  // Reconstruct value with + if it had one
  const cleanValue = hasPlus ? `+${truncatedDigits}` : truncatedDigits;

  // Use AsYouType formatter with US as default country
  const formatter = new AsYouType('US');
  return formatter.input(cleanValue);
}

/**
 * Get E.164 format for storage (e.g., +15551234567)
 */
function getPhoneE164(value: string): string {
  try {
    const parsed = parsePhoneNumberFromString(value);
    return parsed?.format('E.164') || value.replace(/\D/g, '');
  } catch {
    return value.replace(/\D/g, '');
  }
}

/**
 * Format stored phone number for display
 */
function formatStoredPhone(value: string): string {
  if (!value) return '';
  try {
    // If it doesn't start with +, assume US
    const phoneStr = value.startsWith('+') ? value : `+1${value}`;
    const parsed = parsePhoneNumberFromString(phoneStr);
    return parsed?.formatInternational() || value;
  } catch {
    return value;
  }
}

// InfoTab data structure for saving/loading
export interface InfoTabData {
  projectName: string;
  proposalDate: string;
  contactName: string;        // Display name (resolved from contact/member)
  contactNameId?: string;     // Reference ID for maintaining relationship
  contactEmail: string;
  proposalSource: string;
  categoryOfWork: string;
  laborType: string;
  projectType: string;
  clientName: string;         // Display name (resolved from contact)
  clientNameId?: string;      // Reference ID for maintaining relationship
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientContactType: string;
  jobLocationName: string;    // Friendly name for job site (e.g., "Main Office")
  jobLocation: string;        // Physical address
  jobFloor: string;
  locationType: string;
  estimatedDueDate: string;
  jobNotes: string;
}

// Ref handle exposed to parent
export interface InfoTabRef {
  getData: () => InfoTabData;
  markClean: () => void;
}

interface InfoTabProps {
  mode: EditorMode;
  proposalData?: any;
  onDirtyChange?: (isDirty: boolean) => void;
  onProjectNameChange?: (name: string) => void;
}

export const InfoTab = forwardRef<InfoTabRef, InfoTabProps>(function InfoTab(
  { mode, proposalData, onDirtyChange, onProjectNameChange },
  ref
) {
  const isBuilderMode = mode === 'builder';

  // Get current user and organization members
  const user = useUser();
  const { organizationId } = useCurrentOrganization(user?.id || '', !!user?.id);
  const { data: members = [] } = useOrganizationMembers(organizationId || '', !!organizationId);

  // Contacts integration
  const { data: contacts = [] } = useContacts(organizationId ?? undefined);
  const createContactMutation = useCreateContact(organizationId || '');
  const [isCustomClientName, setIsCustomClientName] = useState(false);

  // Project Details
  const [projectName, setProjectName] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [contactName, setContactName] = useState('');      // Display name
  const [contactNameId, setContactNameId] = useState('');  // Reference ID
  const [contactEmail, setContactEmail] = useState('');

  // Work Details
  const [proposalSource, setProposalSource] = useState('');
  const [categoryOfWork, setCategoryOfWork] = useState('');
  const [laborType, setLaborType] = useState('');
  const [projectType, setProjectType] = useState('');

  // Client Information
  const [clientName, setClientName] = useState('');        // Display name
  const [clientNameId, setClientNameId] = useState('');    // Reference ID
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientContactType, setClientContactType] = useState('');

  // Job Details
  const [jobLocationName, setJobLocationName] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobFloor, setJobFloor] = useState('');
  const [locationType, setLocationType] = useState('');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  // Track if initial data has been loaded (prevents re-populating on clear)
  const hasLoadedInitialData = useRef(false);

  // Track initial values for dirty detection
  const [initialValues, setInitialValues] = useState({
    projectName: '',
    proposalDate: '',
    contactName: '',
    contactEmail: '',
    proposalSource: '',
    categoryOfWork: '',
    laborType: '',
    projectType: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    clientContactType: '',
    jobLocationName: '',
    jobLocation: '',
    jobFloor: '',
    locationType: '',
    estimatedDueDate: '',
    jobNotes: '',
  });
  const [initialValuesCaptured, setInitialValuesCaptured] = useState(false);

  // Input styling - compact design matching PricingTab
  const inputClassName = cn(
    'h-7 text-xs rounded border-gray-200 dark:border-gray-600 px-2',
    'focus:ring-1 focus:ring-coral/20 focus:border-coral'
  );

  const selectTriggerClassName = cn(
    'h-7 text-xs rounded border-gray-200 dark:border-gray-600',
    'focus:ring-1 focus:ring-coral/20 focus:border-coral'
  );

  // Disabled style for builder mode
  const disabledInputClassName = isBuilderMode
    ? cn(inputClassName, 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60')
    : inputClassName;

  const disabledSelectClassName = isBuilderMode
    ? cn(selectTriggerClassName, 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60')
    : selectTriggerClassName;

  // Client fields are disabled when a contact is selected (read-only mode)
  const isClientFieldsDisabled = isBuilderMode || !isCustomClientName;
  const clientFieldInputClassName = isClientFieldsDisabled
    ? cn(inputClassName, 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60')
    : inputClassName;
  const clientFieldSelectClassName = isClientFieldsDisabled
    ? cn(selectTriggerClassName, 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60')
    : selectTriggerClassName;

  // Set proposal date to today in filler mode
  useEffect(() => {
    if (!isBuilderMode && !proposalDate) {
      const today = new Date().toISOString().split('T')[0] ?? '';
      setProposalDate(today);
    }
  }, [isBuilderMode, proposalDate]);

  // Helper to check if a string looks like a UUID
  const isUuidLike = (str: string): boolean => {
    if (!str) return false;
    // UUID pattern or prefixed ID like "contact:uuid"
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanStr = str.startsWith('contact:') ? str.replace('contact:', '') : str;
    return uuidPattern.test(cleanStr);
  };

  // Load data from proposalData.form_data.info on initial mount
  useEffect(() => {
    if (!isBuilderMode && !hasLoadedInitialData.current && proposalData) {
      const info = proposalData.form_data?.info as InfoTabData | undefined;

      // Load from form_data.info if available
      if (info) {
        setProjectName(info.projectName || proposalData.project_name || '');
        setProposalDate(info.proposalDate || '');

        // Handle contact name - check if it's a UUID that needs resolution
        const savedContactName = info.contactName || '';
        const savedContactNameId = info.contactNameId || '';
        if (savedContactNameId) {
          // New format: both ID and name saved
          setContactNameId(savedContactNameId);
          setContactName(savedContactName);
        } else if (isUuidLike(savedContactName)) {
          // Old format: contactName contains UUID - use as ID, will resolve name below
          setContactNameId(savedContactName);
          setContactName(''); // Will be resolved
        } else {
          // Plain name without ID reference
          setContactName(savedContactName);
          setContactNameId('');
        }

        setContactEmail(info.contactEmail || '');
        setProposalSource(info.proposalSource || '');
        setCategoryOfWork(info.categoryOfWork || '');
        setLaborType(info.laborType || '');
        setProjectType(info.projectType || '');

        // Handle client name - check if it's a UUID that needs resolution
        const savedClientName = info.clientName || '';
        const savedClientNameId = info.clientNameId || '';
        if (savedClientNameId) {
          // New format: both ID and name saved
          setClientNameId(savedClientNameId);
          setClientName(savedClientName);
        } else if (isUuidLike(savedClientName)) {
          // Old format: clientName contains UUID - use as ID, will resolve name below
          setClientNameId(savedClientName);
          setClientName(''); // Will be resolved
        } else {
          // Plain name without ID reference
          setClientName(savedClientName);
          setClientNameId('');
          if (savedClientName) {
            setIsCustomClientName(true);
          }
        }

        setClientCompany(info.clientCompany || '');
        setClientEmail(info.clientEmail || '');
        setClientPhone(info.clientPhone || '');
        setClientAddress(info.clientAddress || '');
        setClientContactType(info.clientContactType || '');
        setJobLocationName(info.jobLocationName || '');
        setJobLocation(info.jobLocation || '');
        setJobFloor(info.jobFloor || '');
        setLocationType(info.locationType || '');
        setEstimatedDueDate(info.estimatedDueDate || '');
        setJobNotes(info.jobNotes || '');
        hasLoadedInitialData.current = true;
      } else if (proposalData.project_name) {
        // Fallback: load from direct columns if no form_data.info
        setProjectName(proposalData.project_name || '');
        setClientName(proposalData.client_name || '');
        setClientCompany(proposalData.client_company || '');
        setJobLocation(proposalData.job_location || '');
        if (proposalData.client_name) {
          setIsCustomClientName(true);
        }
        setProposalSource(proposalData.proposal_source || '');
        hasLoadedInitialData.current = true;
      }
    }
  }, [isBuilderMode, proposalData]);

  // Resolve contact/client names from IDs when members/contacts are loaded
  useEffect(() => {
    // Resolve contact name from ID if needed
    if (contactNameId && !contactName && (members.length > 0 || contacts.length > 0)) {
      if (contactNameId.startsWith('contact:')) {
        const contactId = contactNameId.replace('contact:', '');
        const contact = contacts.find((c: Contact) => c.id === contactId);
        if (contact) {
          setContactName(contact.full_name);
        }
      } else {
        const member = members.find(m => m.user_id === contactNameId);
        if (member?.full_name) {
          setContactName(member.full_name);
        }
      }
    }

    // Resolve client name from ID if needed
    if (clientNameId && !clientName && contacts.length > 0) {
      const contact = contacts.find((c: Contact) => c.id === clientNameId);
      if (contact) {
        setClientName(contact.full_name || '');
        // Also populate other fields if they're empty
        if (!clientCompany && contact.company_name) setClientCompany(contact.company_name);
        if (!clientEmail && contact.emails?.[0]) setClientEmail(contact.emails[0]);
        if (!clientPhone && contact.phones?.[0]?.number) {
          setClientPhone(formatStoredPhone(contact.phones[0].number));
        }
        if (!clientAddress && contact.addresses?.[0]) setClientAddress(contact.addresses[0]);
        if (!clientContactType && contact.contact_type) setClientContactType(contact.contact_type);
      }
    }
  }, [contactNameId, contactName, clientNameId, clientName, members, contacts, clientCompany, clientEmail, clientPhone, clientAddress, clientContactType]);

  // Notify parent when project name changes
  useEffect(() => {
    if (onProjectNameChange && projectName) {
      onProjectNameChange(projectName);
    }
  }, [projectName, onProjectNameChange]);

  // Capture initial values after auto-fills (with delay to let all effects run)
  useEffect(() => {
    if (!initialValuesCaptured && projectName && proposalDate) {
      const timer = setTimeout(() => {
        setInitialValues({
          projectName,
          proposalDate,
          contactName,
          contactEmail,
          proposalSource,
          categoryOfWork,
          laborType,
          projectType,
          clientName,
          clientCompany,
          clientEmail,
          clientPhone,
          clientAddress,
          clientContactType,
          jobLocationName,
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
    return undefined;
  }, [
    initialValuesCaptured,
    projectName,
    proposalDate,
    contactName,
    contactEmail,
    proposalSource,
    categoryOfWork,
    laborType,
    projectType,
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientAddress,
    clientContactType,
    jobLocationName,
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
      proposalSource !== initialValues.proposalSource ||
      categoryOfWork !== initialValues.categoryOfWork ||
      laborType !== initialValues.laborType ||
      projectType !== initialValues.projectType ||
      clientName !== initialValues.clientName ||
      clientCompany !== initialValues.clientCompany ||
      clientEmail !== initialValues.clientEmail ||
      clientPhone !== initialValues.clientPhone ||
      clientAddress !== initialValues.clientAddress ||
      clientContactType !== initialValues.clientContactType ||
      jobLocationName !== initialValues.jobLocationName ||
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
    proposalSource,
    categoryOfWork,
    laborType,
    projectType,
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientAddress,
    clientContactType,
    jobLocationName,
    jobLocation,
    jobFloor,
    locationType,
    estimatedDueDate,
    jobNotes,
    initialValues,
  ]);

  // Expose getData() and markClean() to parent via ref for saving
  useImperativeHandle(ref, () => ({
    getData: (): InfoTabData => ({
      projectName,
      proposalDate,
      contactName,
      contactNameId: contactNameId || undefined,
      contactEmail,
      proposalSource,
      categoryOfWork,
      laborType,
      projectType,
      clientName,
      clientNameId: clientNameId || undefined,
      clientCompany,
      clientEmail,
      clientPhone,
      clientAddress,
      clientContactType,
      jobLocationName,
      jobLocation,
      jobFloor,
      locationType,
      estimatedDueDate,
      jobNotes,
    }),
    markClean: () => {
      // Reset initial values to current values after save
      setInitialValues({
        projectName,
        proposalDate,
        contactName,
        contactEmail,
        proposalSource,
        categoryOfWork,
        laborType,
        projectType,
        clientName,
        clientCompany,
        clientEmail,
        clientPhone,
        clientAddress,
        clientContactType,
        jobLocationName,
        jobLocation,
        jobFloor,
        locationType,
        estimatedDueDate,
        jobNotes,
      });
    },
  }), [
    projectName,
    proposalDate,
    contactName,
    contactNameId,
    contactEmail,
    proposalSource,
    categoryOfWork,
    laborType,
    projectType,
    clientName,
    clientNameId,
    clientCompany,
    clientEmail,
    clientPhone,
    clientAddress,
    clientContactType,
    jobLocationName,
    jobLocation,
    jobFloor,
    locationType,
    estimatedDueDate,
    jobNotes,
  ]);

  // Handle contact name change - auto-select corresponding email and store resolved name
  const handleContactNameChange = (value: string) => {
    setContactNameId(value); // Store the reference ID

    // Check if it's an employee contact (prefixed with "contact:")
    if (value.startsWith('contact:')) {
      const contactId = value.replace('contact:', '');
      const contact = contacts.find((c: Contact) => c.id === contactId);
      if (contact) {
        setContactName(contact.full_name); // Store resolved name
        if (contact.emails?.[0]) {
          setContactEmail(contact.emails[0]);
        }
      }
    } else {
      // It's a member
      const member = members.find(m => m.user_id === value);
      if (member) {
        setContactName(member.full_name || ''); // Store resolved name
        if (member.email) {
          setContactEmail(member.email);
        }
      }
    }
  };

  // Handle contact email change - auto-select corresponding name
  const handleContactEmailChange = (email: string) => {
    setContactEmail(email);

    // First check if it's a member's email
    const member = members.find(m => m.email === email);
    if (member?.user_id) {
      setContactNameId(member.user_id);
      setContactName(member.full_name || '');
      return;
    }

    // Check if it's an employee contact's email
    const contact = contacts.find((c: Contact) =>
      c.contact_type === 'Employee' && c.emails?.includes(email)
    );
    if (contact) {
      setContactNameId(`contact:${contact.id}`);
      setContactName(contact.full_name);
    }
  };

  // Handle selecting a client from dropdown or switching to custom input
  const handleClientNameSelect = (value: string) => {
    if (value === '__custom__') {
      // Switch to custom input mode
      setIsCustomClientName(true);
      setClientNameId('');
      setClientName('');
      setClientCompany('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setClientContactType('');
      return;
    }

    // Find contact by ID and auto-fill all fields
    const contact = contacts.find((c: Contact) => c.id === value);
    if (contact) {
      setIsCustomClientName(false);
      setClientNameId(contact.id);           // Store reference ID
      setClientName(contact.full_name || ''); // Store resolved name
      setClientCompany(contact.company_name || '');
      setClientEmail(contact.emails?.[0] || '');
      // Format phone number when loading from contact
      const phoneRaw = contact.phones?.[0]?.number || '';
      setClientPhone(phoneRaw ? formatStoredPhone(phoneRaw) : '');
      setClientAddress(contact.addresses?.[0] || '');
      setClientContactType(contact.contact_type || '');
    }
  };

  // Handle phone input with formatting (using libphonenumber-js)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneAsYouType(e.target.value);
    setClientPhone(formatted);
  };

  // Get selected contact ID (use stored ID if available, fallback to name match)
  const selectedContactId = clientNameId || '';

  // Save current client info as a new contact
  const handleSaveAsContact = async () => {
    if (!clientName || !clientEmail) {
      return; // Need at least name and email
    }

    try {
      // Store phone in E.164 format for consistency
      const phoneE164 = clientPhone ? getPhoneE164(clientPhone) : '';
      await createContactMutation.mutateAsync({
        full_name: clientName,
        emails: [clientEmail],
        company_name: clientCompany || undefined,
        phones: phoneE164 ? [{ number: phoneE164, type: 'Business' }] : undefined,
        addresses: clientAddress ? [clientAddress] : undefined,
        contact_type: 'Customer',
      });
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Check if client info can be saved as contact
  // Can only save as contact when manually entering (not selecting existing contact)
  const canSaveAsContact = !isBuilderMode && isCustomClientName && clientName && clientEmail;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Left: Project Details */}
        <InfoCard
          title="Project Details"
          icon={<CalendarBlank className="w-4 h-4" />}
        >
          {/* Project Name (60%) + Proposal Date (40%) */}
          <div className="grid grid-cols-5 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Name" tooltip="Primary contact person for this proposal">
              <Select value={contactNameId} onValueChange={handleContactNameChange} disabled={isBuilderMode}>
                <SelectTrigger className={disabledSelectClassName}>
                  <SelectValue placeholder="Select contact">{contactName || 'Select contact'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Organization Members */}
                  {members
                    .filter(m => m.status?.toLowerCase() === 'active' && m.full_name)
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex flex-col">
                          <span>{member.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {/* Employee Contacts */}
                  {contacts
                    .filter((c: Contact) => c.contact_type === 'Employee')
                    .map((contact: Contact) => (
                      <SelectItem key={`contact-${contact.id}`} value={`contact:${contact.id}`}>
                        <div className="flex flex-col">
                          <span>{contact.full_name}</span>
                          <span className="text-xs text-gray-500">Employee</span>
                        </div>
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
                  {/* Organization Members */}
                  {members
                    .filter(m => m.status?.toLowerCase() === 'active' && m.email)
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.email!}>
                        <div className="flex flex-col">
                          <span>{member.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {/* Employee Contacts */}
                  {contacts
                    .filter((c: Contact) => c.contact_type === 'Employee' && c.emails?.[0])
                    .map((contact: Contact) => (
                      <SelectItem key={`contact-${contact.id}`} value={contact.emails![0]}>
                        <div className="flex flex-col">
                          <span>{contact.emails![0]}</span>
                        </div>
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
          icon={<Tag className="w-4 h-4" />}
        >
          {/* Row 1: Proposal Source + Type of Work */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Proposal Source" tooltip="Where did this lead come from?">
              <Input
                value={proposalSource}
                onChange={(e) => setProposalSource(e.target.value)}
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
          <div className="grid grid-cols-2 gap-3">
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
          icon={<Buildings className="w-4 h-4" />}
          headerAction={
            !isBuilderMode && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveAsContact}
                      disabled={!canSaveAsContact || createContactMutation.isPending}
                      className="h-6 px-2 gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span className="text-[10px]">Save Contact</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">
                      {canSaveAsContact
                        ? 'Save as new contact'
                        : 'Enter name and email to save'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }
        >
          {/* Client Name (dropdown or input) + Client Company */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client Name" tooltip="Select from contacts or enter manually">
              {!isBuilderMode && !isCustomClientName ? (
                <Select
                  value={selectedContactId}
                  onValueChange={handleClientNameSelect}
                >
                  <SelectTrigger className={selectTriggerClassName}>
                    <SelectValue placeholder="Select from contacts..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom__">
                      <span className="text-coral font-medium">+ Enter manually</span>
                    </SelectItem>
                    {contacts
                      .filter((contact: Contact) => contact.contact_type !== 'Employee')
                      .map((contact: Contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        <div className="flex flex-col">
                          <span>{contact.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client name"
                    className={cn(disabledInputClassName, 'flex-1')}
                    disabled={isBuilderMode}
                  />
                  {!isBuilderMode && isCustomClientName && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsCustomClientName(false);
                              // Clear fields so dropdown shows placeholder
                              setClientNameId('');
                              setClientName('');
                              setClientCompany('');
                              setClientEmail('');
                              setClientPhone('');
                              setClientAddress('');
                              setClientContactType('');
                            }}
                            className="h-7 px-1.5"
                          >
                            <UserCircle className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Select from contacts</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
            </Field>
            <Field label="Client Company" tooltip="Client's company or organization name">
              <Input
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Enter company name"
                className={clientFieldInputClassName}
                disabled={isClientFieldsDisabled}
              />
            </Field>
          </div>

          {/* Email Address + Phone Number */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email Address" tooltip="Client's email address for communication">
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@example.com"
                className={clientFieldInputClassName}
                disabled={isClientFieldsDisabled}
              />
            </Field>
            <Field label="Phone Number" tooltip="Start with country code (e.g., +1 for US/Canada)">
              <Input
                type="tel"
                value={clientPhone}
                onChange={handlePhoneChange}
                placeholder="+1 555 123 4567"
                className={clientFieldInputClassName}
                disabled={isClientFieldsDisabled}
              />
            </Field>
          </div>

          {/* Address (70%) + Contact Type (30%) */}
          <div className="grid grid-cols-10 gap-3">
            <div className="col-span-7">
              {isClientFieldsDisabled ? (
                <Field label="Address" tooltip="Client's mailing or business address">
                  <Input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Enter address"
                    className={clientFieldInputClassName}
                    disabled={isClientFieldsDisabled}
                  />
                </Field>
              ) : (
                <Field label="Address" tooltip="Client's mailing or business address - start typing for suggestions">
                  <MapboxInput
                    id="client-address"
                    label=""
                    value={clientAddress}
                    onChange={setClientAddress}
                    placeholder="Enter address"
                    className={cn(
                      'h-7 text-xs rounded border-gray-200 dark:border-gray-600 px-2',
                      'focus:ring-1 focus:ring-coral/20 focus:border-coral'
                    )}
                  />
                </Field>
              )}
            </div>
            <div className="col-span-3">
              <Field label="Contact Type" tooltip="Classification of this client relationship">
                <Select value={clientContactType} onValueChange={setClientContactType} disabled={isClientFieldsDisabled}>
                  <SelectTrigger className={clientFieldSelectClassName}>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.filter(type => type !== 'Employee').map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </InfoCard>

        {/* Bottom Right: Job Details */}
        <InfoCard
          title="Job Details"
          icon={<MapPin className="w-4 h-4" />}
        >
          {/* Job Location Name (POI search) + Floor */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <Field label="Job Location Name" tooltip="Input a place or landmark (e.g., Empire State Building)">
                <Input
                  value={jobLocationName}
                  onChange={(e) => setJobLocationName(e.target.value)}
                  placeholder="Input a place or landmark..."
                  className={disabledInputClassName}
                  disabled={isBuilderMode}
                />
              </Field>
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

          {/* Job Location Address (full width) */}
          <div>
            {isBuilderMode ? (
              <Field label="Job Address" tooltip="Physical address where work will be performed">
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
                label="Job Address"
                value={jobLocation}
                onChange={setJobLocation}
                placeholder="Enter job site address"
                className={cn(
                  'h-7 text-xs rounded border-gray-200 dark:border-gray-600 px-2',
                  'focus:ring-1 focus:ring-coral/20 focus:border-coral'
                )}
              />
            )}
          </div>

          {/* Location Type + Est. Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location Type" tooltip="Type of location, building, or facility">
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
                'min-h-[60px] text-xs rounded border-gray-200 dark:border-gray-600 px-2 py-1.5',
                'focus:ring-1 focus:ring-coral/20 focus:border-coral',
                'resize-none',
                isBuilderMode && 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
              )}
            />
          </Field>
        </InfoCard>
      </div>
    </div>
  );
});

export default InfoTab;
