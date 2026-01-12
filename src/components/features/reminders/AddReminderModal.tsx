import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { useProposals } from '@/hooks/queries/useProposals';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { reminderService, type ReminderType } from '@/services/reminderService';
import { toast } from 'sonner';
import { useUser } from '@/auth';

interface AddReminderModalProps {
  open: boolean;
  editingReminder?: Reminder | null;
  onClose: () => void;
  onReminderCreated?: () => void;
}

interface Reminder {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  proposal_id?: string;
  reminder_type: ReminderType;
  organization_id: string;
}

export const AddReminderModal = ({ open, editingReminder, onClose, onReminderCreated }: AddReminderModalProps) => {
  // Get user, organization, and proposals using hooks
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id);
  const { data: proposals = [] } = useProposals(organization?.id);

  const [reminderType, setReminderType] = useState<string>('');
  const [alertName, setAlertName] = useState('');
  const [proposalReference, setProposalReference] = useState<string>('none');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get active (non-archived) proposals
  const activeProposals = useMemo(() => {
    return proposals.filter(p => !p.archived);
  }, [proposals]);

  // Reset form when modal opens or populate with editing data
  useEffect(() => {
    if (open) {
      if (editingReminder) {
        // Populate form with existing reminder data
        setReminderType(editingReminder.reminder_type);
        setAlertName(editingReminder.title);
        setProposalReference(editingReminder.proposal_id || 'none');
        setNotes(editingReminder.description || '');

        // Parse date and time from due_date
        const dueDateTime = parseLocalDate(editingReminder.due_date);
        setDate(dueDateTime);

        // Format time as HH:mm
        const hours = dueDateTime.getHours().toString().padStart(2, '0');
        const minutes = dueDateTime.getMinutes().toString().padStart(2, '0');
        setTime(`${hours}:${minutes}`);
      } else {
        // Reset to empty state for new reminder
        setReminderType('');
        setAlertName('');
        setProposalReference('none');
        setNotes('');
        setDate(undefined);
        setTime('09:00');
      }
    }
  }, [open, editingReminder]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return !!(
      reminderType &&
      alertName.trim() &&
      date &&
      time
    );
  }, [reminderType, alertName, date, time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!reminderType) {
      toast.error('Please select a type');
      return;
    }

    if (!alertName.trim()) {
      toast.error('Please enter an alert name');
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    if (!time) {
      toast.error('Please select a time');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!user) {
        toast.error('User not authenticated');
        setIsSubmitting(false);
        return;
      }

      if (!organization?.id) {
        toast.error('Organization not found');
        setIsSubmitting(false);
        return;
      }

      // Combine date and time into ISO string
      const dueDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${time}`);

      // Create or update reminder
      let error;
      if (editingReminder) {
        // Update existing reminder
        const updateResult = await reminderService.updateReminder(editingReminder.id, {
          title: alertName.trim(),
          description: notes.trim() || undefined,
          due_date: dueDateTime.toISOString(),
          proposal_id: proposalReference && proposalReference !== 'none' ? proposalReference : undefined,
          reminder_type: reminderType as ReminderType,
        });
        error = updateResult.error;
      } else {
        // Create new reminder
        const createResult = await reminderService.createReminder({
          title: alertName.trim(),
          description: notes.trim() || undefined,
          due_date: dueDateTime.toISOString(),
          proposal_id: proposalReference && proposalReference !== 'none' ? proposalReference : undefined,
          reminder_type: reminderType as ReminderType,
          organization_id: organization.id,
          is_shared: true, // Default to shared with organization
        });
        error = createResult.error;
      }

      if (error) {
        toast.error(`Failed to ${editingReminder ? 'update' : 'create'} reminder: ${error}`);
        setIsSubmitting(false);
        return;
      }

      // Reset form
      setAlertName('');
      setNotes('');
      setProposalReference('none');
      setReminderType('');
      setDate(undefined);
      setTime('09:00');

      setIsSubmitting(false);

      // Notify parent
      onReminderCreated?.();

      onClose();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      toast.error('Failed to create reminder');
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Overlay Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-[500px] pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4 border-b">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <Bell className="w-5 h-5 text-indigo-600" />
                {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingReminder ? 'Update reminder details' : 'Create a new reminder or alert'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Type Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select value={reminderType} onValueChange={(value) => setReminderType(value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Proposal_Follow_Up">Proposal Follow-Up</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Deadline">Deadline</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alert Name */}
            <div className="space-y-2">
              <Label htmlFor="alertName" className="text-sm font-medium text-gray-700">
                Alert/Reminder Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="alertName"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                placeholder="Enter alert or reminder name"
                maxLength={100}
                className="h-11"
                required
              />
            </div>

            {/* Optional Proposal Reference */}
            <div className="space-y-2">
              <Label htmlFor="proposalReference" className="text-sm font-medium text-gray-700">
                Proposal Reference (Optional)
              </Label>
              <Select value={proposalReference} onValueChange={setProposalReference}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="No proposal linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No proposal linked</SelectItem>
                  {activeProposals.map((proposal) => (
                    <SelectItem key={proposal.id} value={proposal.id}>
                      {proposal.proposal_number} - {proposal.project_name || 'Untitled'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details..."
                rows={4}
                maxLength={500}
                className="resize-none"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-11 justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-medium text-gray-700">
                  Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting
                  ? (editingReminder ? 'Updating...' : 'Creating...')
                  : (editingReminder ? 'Update Reminder' : 'Create Reminder')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
