/**
 * Rules Admin Page
 * Configure business rules for product configuration
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Code, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  productAdminService,
  type ProductModel,
  type ProductSeries,
  type ProductLine,
  type ProductManufacturer,
} from '../services/productAdminService';
import {
  optionAdminService,
  type ProductRule,
} from '../services/optionAdminService';

interface FormData {
  name: string;
  description: string;
  model_id: string | null;
  priority: number;
  is_active: boolean;
  condition: string;
  effect: string;
}

const DEFAULT_FORM_DATA: FormData = {
  name: '',
  description: '',
  model_id: null,
  priority: 100,
  is_active: true,
  condition: JSON.stringify({ field: '', operator: 'equals', value: '' }, null, 2),
  effect: JSON.stringify({ action: 'set_options', target: '', options: [] }, null, 2),
};

const EXAMPLE_CONDITIONS = [
  { label: 'Field equals value', value: '{"field": "panel_skin", "operator": "equals", "value": "vinyl"}' },
  { label: 'Field in list', value: '{"field": "stc_rating", "operator": "in", "value": ["44", "50"]}' },
  { label: 'AND condition', value: '{"and": [{"field": "panel_skin", "operator": "equals", "value": "vinyl"}, {"field": "thickness", "operator": "equals", "value": "3\\""}]}' },
  { label: 'OR condition', value: '{"or": [{"field": "model", "operator": "equals", "value": "Stella"}, {"field": "model", "operator": "equals", "value": "Luna"}]}' },
];

const EXAMPLE_EFFECTS = [
  { label: 'Set available options', value: '{"action": "set_options", "target": "stc_rating", "options": ["40", "45", "50"]}' },
  { label: 'Set field value', value: '{"action": "set_value", "target": "frame_thickness", "value": "4 9/16\\""}' },
  { label: 'Hide field', value: '{"action": "hide", "target": "pass_door_quantity"}' },
  { label: 'Show field', value: '{"action": "show", "target": "pass_door_quantity"}' },
  { label: 'Set min/max', value: '{"action": "set_constraints", "target": "panel_width", "min": 24, "max": 48}' },
];

export function RulesPage() {
  const { toast } = useToast();

  // Optional model filter
  const [manufacturers, setManufacturers] = useState<ProductManufacturer[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [series, setSeries] = useState<ProductSeries[]>([]);
  const [models, setModels] = useState<ProductModel[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [selectedProductLineId, setSelectedProductLineId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [filterModelId, setFilterModelId] = useState<string>('all');

  // Data
  const [rules, setRules] = useState<ProductRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProductRule | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [jsonErrors, setJsonErrors] = useState({ condition: '', effect: '' });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load data
  useEffect(() => {
    loadManufacturers();
    loadRules();
  }, []);

  useEffect(() => {
    if (selectedManufacturerId) {
      loadProductLines(selectedManufacturerId);
    }
  }, [selectedManufacturerId]);

  useEffect(() => {
    if (selectedProductLineId) {
      loadSeries(selectedProductLineId);
    }
  }, [selectedProductLineId]);

  useEffect(() => {
    if (selectedSeriesId) {
      loadModels(selectedSeriesId);
    }
  }, [selectedSeriesId]);

  const loadManufacturers = async () => {
    try {
      const data = await productAdminService.getManufacturers();
      setManufacturers(data);
    } catch (error) {
      console.error('Failed to load manufacturers:', error);
    }
  };

  const loadProductLines = async (manufacturerId: string) => {
    const data = await productAdminService.getProductLines(manufacturerId);
    setProductLines(data);
  };

  const loadSeries = async (productLineId: string) => {
    const data = await productAdminService.getSeries(productLineId);
    setSeries(data);
  };

  const loadModels = async (seriesId: string) => {
    const data = await productAdminService.getModels(seriesId);
    setModels(data);
  };

  const loadRules = async (modelId?: string) => {
    setLoading(true);
    try {
      const data = await optionAdminService.getRules(modelId);
      setRules(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load rules', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (field: 'condition' | 'effect', value: string): boolean => {
    try {
      JSON.parse(value);
      setJsonErrors((prev) => ({ ...prev, [field]: '' }));
      return true;
    } catch (e) {
      setJsonErrors((prev) => ({ ...prev, [field]: 'Invalid JSON' }));
      return false;
    }
  };

  const handleOpenDialog = (item?: ProductRule) => {
    if (item) {
      setEditingRule(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        model_id: item.model_id,
        priority: item.priority,
        is_active: item.is_active,
        condition: JSON.stringify(item.condition, null, 2),
        effect: JSON.stringify(item.effect, null, 2),
      });
    } else {
      setEditingRule(null);
      setFormData(DEFAULT_FORM_DATA);
    }
    setJsonErrors({ condition: '', effect: '' });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const conditionValid = validateJson('condition', formData.condition);
    const effectValid = validateJson('effect', formData.effect);

    if (!conditionValid || !effectValid) {
      toast({ title: 'Validation Error', description: 'Fix JSON errors before saving', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description || null,
        model_id: formData.model_id || null,
        priority: formData.priority,
        is_active: formData.is_active,
        condition: JSON.parse(formData.condition),
        effect: JSON.parse(formData.effect),
      };

      if (editingRule) {
        await optionAdminService.updateRule(editingRule.id, payload);
        toast({ title: 'Rule updated' });
      } else {
        await optionAdminService.createRule(payload);
        toast({ title: 'Rule created' });
      }
      setIsDialogOpen(false);
      loadRules();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: ProductRule) => {
    try {
      await optionAdminService.updateRule(rule.id, { is_active: !rule.is_active });
      loadRules();
      toast({ title: rule.is_active ? 'Rule disabled' : 'Rule enabled' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await optionAdminService.deleteRule(deleteTarget.id);
      toast({ title: 'Rule deleted' });
      setDeleteTarget(null);
      loadRules();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const filteredRules = rules.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModel = filterModelId === 'all' || filterModelId === 'global'
      ? filterModelId === 'all' || r.model_id === null
      : r.model_id === filterModelId;
    return matchesSearch && matchesModel;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Rules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure conditional logic for product options
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Rule
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterModelId} onValueChange={setFilterModelId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rules</SelectItem>
            <SelectItem value="global">Global Only</SelectItem>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No rules match your search' : 'No rules configured yet'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules
                .sort((a, b) => b.priority - a.priority)
                .map((rule) => (
                  <TableRow key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.model_id ? 'outline' : 'secondary'}>
                        {rule.model_id ? 'Model' : 'Global'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className="flex items-center gap-2"
                      >
                        {rule.is_active ? (
                          <Play className="w-4 h-4 text-green-600" />
                        ) : (
                          <Pause className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={rule.is_active ? 'text-green-600' : 'text-gray-400'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(rule)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
            <DialogDescription>
              Define conditions and effects for this business rule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Vinyl skin → STC options"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this rule do?"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority rules execute first</p>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
            </div>

            {/* Condition */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Condition (JSON)
                </label>
                <Select
                  value=""
                  onValueChange={(v) => setFormData({ ...formData, condition: v })}
                >
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder="Insert example..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAMPLE_CONDITIONS.map((ex, i) => (
                      <SelectItem key={i} value={ex.value}>{ex.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={formData.condition}
                onChange={(e) => {
                  setFormData({ ...formData, condition: e.target.value });
                  validateJson('condition', e.target.value);
                }}
                className="font-mono text-sm h-32"
                placeholder='{"field": "panel_skin", "operator": "equals", "value": "vinyl"}'
              />
              {jsonErrors.condition && (
                <p className="text-xs text-red-500 mt-1">{jsonErrors.condition}</p>
              )}
            </div>

            {/* Effect */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Effect (JSON)
                </label>
                <Select
                  value=""
                  onValueChange={(v) => setFormData({ ...formData, effect: v })}
                >
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder="Insert example..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAMPLE_EFFECTS.map((ex, i) => (
                      <SelectItem key={i} value={ex.value}>{ex.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={formData.effect}
                onChange={(e) => {
                  setFormData({ ...formData, effect: e.target.value });
                  validateJson('effect', e.target.value);
                }}
                className="font-mono text-sm h-32"
                placeholder='{"action": "set_options", "target": "stc_rating", "options": ["40", "45", "50"]}'
              />
              {jsonErrors.effect && (
                <p className="text-xs text-red-500 mt-1">{jsonErrors.effect}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
