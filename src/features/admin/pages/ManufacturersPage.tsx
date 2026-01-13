/**
 * Manufacturers Admin Page
 * CRUD interface for product manufacturers with domain associations
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  productAdminService,
  type ProductManufacturer,
  type ProductDomain,
} from '../services/productAdminService';

export function ManufacturersPage() {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<ProductManufacturer[]>([]);
  const [domains, setDomains] = useState<ProductDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<ProductManufacturer | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', logo_url: '' });
  const [saving, setSaving] = useState(false);

  // Domain linking dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingManufacturer, setLinkingManufacturer] = useState<ProductManufacturer | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [manufacturerDomains, setManufacturerDomains] = useState<Map<string, string[]>>(new Map());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductManufacturer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [manufacturersData, domainsData, domainLinks] = await Promise.all([
        productAdminService.getManufacturers(),
        productAdminService.getDomains(),
        productAdminService.getAllManufacturerDomainLinks(),
      ]);
      setManufacturers(manufacturersData);
      setDomains(domainsData);
      setManufacturerDomains(domainLinks);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (manufacturer?: ProductManufacturer) => {
    if (manufacturer) {
      setEditingManufacturer(manufacturer);
      setFormData({
        name: manufacturer.name,
        code: manufacturer.code || '',
        logo_url: manufacturer.logo_url || '',
      });
    } else {
      setEditingManufacturer(null);
      setFormData({ name: '', code: '', logo_url: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingManufacturer) {
        await productAdminService.updateManufacturer(editingManufacturer.id, {
          name: formData.name.trim(),
          code: formData.code.trim() || null,
          logo_url: formData.logo_url.trim() || null,
        });
        toast({ title: 'Manufacturer updated successfully' });
      } else {
        await productAdminService.createManufacturer({
          name: formData.name.trim(),
          code: formData.code.trim() || null,
          logo_url: formData.logo_url.trim() || null,
        });
        toast({ title: 'Manufacturer created successfully' });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLinkDialog = (manufacturer: ProductManufacturer) => {
    setLinkingManufacturer(manufacturer);
    setSelectedDomains(manufacturerDomains.get(manufacturer.id) || []);
    setLinkDialogOpen(true);
  };

  const handleSaveDomainLinks = async () => {
    if (!linkingManufacturer) return;

    setSaving(true);
    try {
      const currentDomains = manufacturerDomains.get(linkingManufacturer.id) || [];

      // Add new links
      for (const domainId of selectedDomains) {
        if (!currentDomains.includes(domainId)) {
          await productAdminService.linkManufacturerToDomain(linkingManufacturer.id, domainId);
        }
      }

      // Remove old links
      for (const domainId of currentDomains) {
        if (!selectedDomains.includes(domainId)) {
          await productAdminService.unlinkManufacturerFromDomain(linkingManufacturer.id, domainId);
        }
      }

      toast({ title: 'Domain associations updated' });
      setLinkDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update domain associations',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await productAdminService.deleteManufacturer(deleteTarget.id);
      toast({ title: 'Manufacturer deleted successfully' });
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredManufacturers = manufacturers.filter(
    (mfr) =>
      mfr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mfr.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manufacturers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Product manufacturers and their domain associations
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Manufacturer
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search manufacturers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredManufacturers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No manufacturers match your search' : 'No manufacturers yet.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Domains</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredManufacturers.map((mfr) => (
                <TableRow key={mfr.id}>
                  <TableCell className="font-medium">{mfr.name}</TableCell>
                  <TableCell>
                    {mfr.code ? (
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        {mfr.code}
                      </code>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-500">
                      {manufacturerDomains.get(mfr.id)?.length || 0} domains
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {new Date(mfr.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenLinkDialog(mfr)}
                        title="Link to domains"
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(mfr)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(mfr)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingManufacturer ? 'Edit Manufacturer' : 'Create Manufacturer'}
            </DialogTitle>
            <DialogDescription>
              {editingManufacturer
                ? 'Update the manufacturer details below.'
                : 'Add a new manufacturer to your catalog.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Modernfold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., MF"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo URL</label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingManufacturer ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Domain Linking Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Domains</DialogTitle>
            <DialogDescription>
              Select which domains "{linkingManufacturer?.name}" belongs to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-64 overflow-y-auto">
            {domains.map((domain) => (
              <label
                key={domain.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <Checkbox
                  checked={selectedDomains.includes(domain.id)}
                  onCheckedChange={(checked) => {
                    setSelectedDomains((prev) =>
                      checked
                        ? [...prev, domain.id]
                        : prev.filter((id) => id !== domain.id)
                    );
                  }}
                />
                <span>{domain.name}</span>
              </label>
            ))}
            {domains.length === 0 && (
              <p className="text-gray-500 text-sm">No domains available. Create a domain first.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDomainLinks} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Manufacturer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also
              delete all associated product lines, series, and models.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
