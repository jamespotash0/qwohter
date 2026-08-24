/**
 * Crews Tab
 *
 * The dealer's own install crews. Small list, rarely changed, and the thing
 * without which nothing can be scheduled.
 *
 * `hourly_cost` is the burdened rate — wages, truck, insurance, overhead — not
 * take-home pay. It is the cost side of every self-performed line, and job
 * costing is wrong by whatever margin it is understated by, so the field says
 * so rather than trusting anyone to remember.
 *
 * Crews deactivate rather than delete: a crew that has worked a job is
 * referenced by that job's history, and removing them would orphan it.
 */

import { useState } from 'react';
import { Plus, Users, PencilSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/pricing';
import { useCrews, useCreateCrew, useUpdateCrew, type Crew } from '@/hooks/queries/useWorkOrders';
import { cn } from '@/lib/utils';

const CREW_TYPES = ['Install', 'Delivery', 'Service', 'Mixed'] as const;

interface CrewsTabProps {
  organizationId?: string;
}

interface FormState {
  name: string;
  crew_type: string;
  size: string;
  hourly_cost: string;
  lead_name: string;
  lead_phone: string;
}

const EMPTY: FormState = {
  name: '',
  crew_type: 'Install',
  size: '2',
  hourly_cost: '',
  lead_name: '',
  lead_phone: '',
};

export function CrewsTab({ organizationId }: CrewsTabProps) {
  const { data: crews = [], isLoading } = useCrews(organizationId, true);
  const createCrew = useCreateCrew();
  const updateCrew = useUpdateCrew();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Crew | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const startEdit = (crew: Crew) => {
    setEditing(crew);
    setForm({
      name: crew.name,
      crew_type: crew.crew_type ?? 'Install',
      size: String(crew.size ?? 2),
      hourly_cost: crew.hourly_cost === null ? '' : String(crew.hourly_cost),
      lead_name: crew.lead_name ?? '',
      lead_phone: crew.lead_phone ?? '',
    });
    setOpen(true);
  };

  const size = Number(form.size);
  const cost = form.hourly_cost.trim() === '' ? null : Number(form.hourly_cost);
  const canSave =
    !!organizationId &&
    form.name.trim().length > 0 &&
    Number.isFinite(size) &&
    size > 0 &&
    (cost === null || (Number.isFinite(cost) && cost >= 0)) &&
    !createCrew.isPending &&
    !updateCrew.isPending;

  const handleSave = async () => {
    if (!organizationId) return;
    const payload = {
      name: form.name.trim(),
      crew_type: form.crew_type as Crew['crew_type'],
      size,
      hourly_cost: cost,
      lead_name: form.lead_name.trim() || null,
      lead_phone: form.lead_phone.trim() || null,
    };
    try {
      if (editing) {
        await updateCrew.mutateAsync({ crewId: editing.id, patch: payload });
      } else {
        await createCrew.mutateAsync({ organization_id: organizationId, ...payload });
      }
      setOpen(false);
    } catch {
      // Surfaced as a toast by the mutation hook.
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Crews</h2>
          <p className="text-xs text-gray-500">
            Who installs. Nothing can be scheduled without at least one.
          </p>
        </div>
        <Button size="sm" onClick={startCreate} disabled={!organizationId}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add crew
        </Button>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : crews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
          <Users className="mx-auto h-6 w-6 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No crews yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Add the crews that do your installs, with the burdened hourly cost of
            each.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2.5">Crew</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5 text-right">Size</th>
                <th className="px-3 py-2.5 text-right">Burdened / hr</th>
                <th className="px-3 py-2.5">Lead</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {crews.map(crew => (
                <tr
                  key={crew.id}
                  className={cn(
                    'border-t border-gray-100 dark:border-gray-700/50',
                    crew.is_active === false && 'opacity-50'
                  )}
                >
                  <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                    {crew.name}
                    {crew.is_active === false && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">
                    {crew.crew_type}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                    {crew.size}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                    {crew.hourly_cost === null ? (
                      // Not "$0.00" — an unset rate makes job costing wrong,
                      // and it should look unset.
                      <span className="text-amber-600 dark:text-amber-400">Not set</span>
                    ) : (
                      formatCurrency(Number(crew.hourly_cost))
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">
                    {crew.lead_name ?? '—'}
                    {crew.lead_phone && (
                      <span className="ml-2 text-xs text-gray-500">
                        {crew.lead_phone}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => startEdit(crew)}
                      aria-label={`Edit ${crew.name}`}
                    >
                      <PencilSimple className="w-4 h-4 text-gray-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a crew'}</DialogTitle>
            <DialogDescription>
              The hourly cost is burdened — wages, truck, insurance, overhead.
              Job costing is wrong by whatever it is understated by.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="crew-name" className="text-xs">Name</Label>
                <Input
                  id="crew-name"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Crew A"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.crew_type}
                  onValueChange={v => set('crew_type', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREW_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="crew-size" className="text-xs">
                  People
                </Label>
                <Input
                  id="crew-size"
                  type="number"
                  min={1}
                  value={form.size}
                  onChange={e => set('size', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="crew-cost" className="text-xs">
                  Burdened cost per hour
                </Label>
                <Input
                  id="crew-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.hourly_cost}
                  onChange={e => set('hourly_cost', e.target.value)}
                  placeholder="Leave blank if unknown"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="crew-lead" className="text-xs">Lead</Label>
                <Input
                  id="crew-lead"
                  value={form.lead_name}
                  onChange={e => set('lead_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="crew-phone" className="text-xs">
                  Lead phone
                </Label>
                <Input
                  id="crew-phone"
                  value={form.lead_phone}
                  onChange={e => set('lead_phone', e.target.value)}
                  placeholder="So a PM can reach the site"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {createCrew.isPending || updateCrew.isPending
                ? 'Saving…'
                : editing
                  ? 'Save changes'
                  : 'Add crew'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CrewsTab;
