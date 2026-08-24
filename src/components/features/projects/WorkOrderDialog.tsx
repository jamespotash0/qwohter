/**
 * Work Order Dialog
 *
 * Crews a day of site work against the lines that need it.
 *
 * Only self-performed and subcontracted lines appear — purchased product is
 * bought, not crewed — and the quantities offered subtract what is already
 * installed *and* what other work orders already cover, so scheduling a job in
 * stages cannot book the same chairs onto two different days.
 *
 * Site access is a required-feeling field rather than a footnote. Dock hours,
 * elevator reservations, and certificate-of-insurance requirements are what
 * actually turn a crew away at the door, and a dispatcher who has to go looking
 * for them will not.
 *
 * Double-booking is refused by the database, not by a check here. This dialog's
 * job is to say which crew is unavailable when that happens, rather than
 * showing a constraint name.
 */

import { useEffect, useMemo, useState } from 'react';
import { Warning, Users } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  useCrews,
  useSchedulableLines,
  useCreateWorkOrder,
  type WorkType,
} from '@/hooks/queries/useWorkOrders';
import { cn } from '@/lib/utils';

/**
 * Typed as WorkType so the compiler holds this list against the database's
 * CHECK constraint. An earlier hand-written version had 'Install', which is not
 * a valid value — every save would have been rejected at runtime.
 */
const WORK_TYPES: WorkType[] = [
  'Installation',
  'Delivery',
  'Delivery and Installation',
  'Punch',
  'Service',
  'Pickup',
];

/** A crew, or a named subcontractor. Never both — the database forbids it. */
const SUBCONTRACT = '__subcontract__';

interface WorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  projectId: string;
  salesOrderId?: string | null;
  /** Prefills the site block, so a PM is not retyping the delivery address. */
  defaultSite?: {
    name?: string | null;
    city?: string | null;
    state?: string | null;
  };
}

export function WorkOrderDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  salesOrderId,
  defaultSite,
}: WorkOrderDialogProps) {
  const { data: crews = [] } = useCrews(organizationId);
  const { data: schedulable = [] } = useSchedulableLines(salesOrderId ?? undefined);
  const createWorkOrder = useCreateWorkOrder();

  const [workType, setWorkType] = useState<WorkType>('Installation');
  const [performer, setPerformer] = useState<string>('');
  const [subName, setSubName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [siteState, setSiteState] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const outstanding = useMemo(
    () => schedulable.filter(line => line.remaining > 0),
    [schedulable]
  );

  useEffect(() => {
    if (!open) return;
    setWorkType('Installation');
    setPerformer('');
    setSubName('');
    setStart('');
    setEnd('');
    setSiteName(defaultSite?.name ?? '');
    setSiteCity(defaultSite?.city ?? '');
    setSiteState(defaultSite?.state ?? '');
    setContactName('');
    setContactPhone('');
    setAccessNotes('');
    setQuantities({});
  }, [open, defaultSite?.name, defaultSite?.city, defaultSite?.state]);

  // Seed remaining quantities as the lines load, filling only missing keys so a
  // refetch cannot wipe out what has been typed.
  useEffect(() => {
    if (!open) return;
    setQuantities(prev => {
      let added = false;
      const next = { ...prev };
      for (const line of outstanding) {
        if (next[line.orderLineId]) continue;
        next[line.orderLineId] = String(line.remaining);
        added = true;
      }
      return added ? next : prev;
    });
  }, [open, outstanding]);

  const isSubcontract = performer === SUBCONTRACT;
  const scheduling = start.trim() !== '' || end.trim() !== '';

  const lines = outstanding
    .map(line => ({
      order_line_id: line.orderLineId,
      quantity: Number(quantities[line.orderLineId]) || 0,
    }))
    .filter(l => l.quantity > 0);

  // The database requires a scheduled work order to name a performer and both
  // ends of the window; say so here rather than letting it reject the save.
  const missingForSchedule =
    scheduling && (!start || !end || (!performer || (isSubcontract && !subName.trim())));

  const canSave =
    lines.length > 0 && !missingForSchedule && !createWorkOrder.isPending;

  const handleSave = async () => {
    try {
      await createWorkOrder.mutateAsync({
        workOrder: {
          organization_id: organizationId,
          project_id: projectId,
          sales_order_id: salesOrderId ?? null,
          work_type: workType,
          status: scheduling ? ('Scheduled' as never) : ('Draft' as never),
          crew_id: isSubcontract || !performer ? null : performer,
          subcontractor_name: isSubcontract ? subName.trim() : null,
          scheduled_start: start || null,
          scheduled_end: end || null,
          site_name: siteName.trim() || null,
          site_city: siteCity.trim() || null,
          site_state: siteState.trim() || null,
          site_contact_name: contactName.trim() || null,
          site_contact_phone: contactPhone.trim() || null,
          access_notes: accessNotes.trim() || null,
        },
        lines,
      });
      onOpenChange(false);
    } catch {
      // Surfaced as a toast, including the double-booking case.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule site work</DialogTitle>
          <DialogDescription>
            Only self-performed and subcontracted lines can be crewed. Quantities
            already installed or already on another work order are excluded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Work type</Label>
              <Select
                value={workType}
                onValueChange={v => setWorkType(v as WorkType)}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-start" className="text-xs">Start</Label>
              <Input
                id="wo-start"
                type="datetime-local"
                value={start}
                onChange={e => setStart(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-end" className="text-xs">End</Label>
              <Input
                id="wo-end"
                type="datetime-local"
                value={end}
                onChange={e => setEnd(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Performed by</Label>
              <Select value={performer} onValueChange={setPerformer}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pick a crew" />
                </SelectTrigger>
                <SelectContent>
                  {crews.map(crew => (
                    <SelectItem key={crew.id} value={crew.id}>
                      {crew.name} · {crew.size}
                    </SelectItem>
                  ))}
                  <SelectItem value={SUBCONTRACT}>A subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSubcontract && (
              <div className="space-y-1.5">
                <Label htmlFor="wo-sub" className="text-xs">Subcontractor</Label>
                <Input
                  id="wo-sub"
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  placeholder="Who is doing it"
                  className="h-9"
                />
              </div>
            )}
          </div>

          {/* What actually sinks an install day. */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Site
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wo-site" className="text-xs">Name</Label>
                <Input id="wo-site" value={siteName} onChange={e => setSiteName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wo-city" className="text-xs">City</Label>
                <Input id="wo-city" value={siteCity} onChange={e => setSiteCity(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wo-state" className="text-xs">State</Label>
                <Input id="wo-state" value={siteState} onChange={e => setSiteState(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wo-contact" className="text-xs">Site contact</Label>
                <Input id="wo-contact" value={contactName} onChange={e => setContactName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wo-phone" className="text-xs">Phone</Label>
                <Input id="wo-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-access" className="text-xs">
                Access notes
              </Label>
              <Textarea
                id="wo-access"
                value={accessNotes}
                onChange={e => setAccessNotes(e.target.value)}
                rows={2}
                placeholder="Dock hours, elevator reservation, COI requirements, parking — what turns a crew away at the door"
              />
            </div>
          </div>

          {/* Lines */}
          {outstanding.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-8 text-center text-sm text-gray-500">
              Nothing on this order needs crewing. Only self-performed and
              subcontracted lines can be scheduled.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 w-10">#</th>
                    <th className="px-3 py-2.5">Work</th>
                    <th className="px-3 py-2.5 text-right">Installed</th>
                    <th className="px-3 py-2.5 text-right">Already booked</th>
                    <th className="px-3 py-2.5 w-28">This visit</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map(line => (
                    <tr
                      key={line.orderLineId}
                      className="border-t border-gray-100 dark:border-gray-700/50"
                    >
                      <td className="px-3 py-2 text-xs text-gray-400 tabular-nums">
                        {line.lineNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {line.description}
                        <span className="ml-2 text-xs text-gray-500">
                          {line.fulfillmentType === 'subcontract'
                            ? 'Subcontracted'
                            : 'Self-performed'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {line.installed}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {line.scheduled}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={line.remaining}
                          value={quantities[line.orderLineId] ?? ''}
                          onChange={e =>
                            setQuantities(prev => ({
                              ...prev,
                              [line.orderLineId]: e.target.value,
                            }))
                          }
                          aria-label={`Quantity for line ${line.lineNumber}`}
                          className="h-8 tabular-nums"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {missingForSchedule && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                A scheduled work order needs a start, an end, and somebody to do
                it. Leave the dates blank to save it as a draft instead.
              </p>
            </div>
          )}

          {!accessNotes.trim() && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              No access notes yet — this is the field crews most often need and
              most often do not get.
            </p>
          )}
        </div>

        <DialogFooter className={cn('gap-2')}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {createWorkOrder.isPending
              ? 'Saving…'
              : scheduling
                ? 'Schedule it'
                : 'Save as draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WorkOrderDialog;
