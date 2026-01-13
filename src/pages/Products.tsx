/**
 * Products Page
 *
 * Simple product catalog management with inline editing
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { PageContent } from '@/components/common/layout';
import { ProductsTable } from '@/components/features/products';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useBulkCreateProducts,
  useReorderProducts,
} from '@/hooks/useProducts';
import { useCurrentOrganization } from '@/hooks/queries';
import { useUser } from '@/auth';
import type { CreateProductInput } from '@/lib/types/products';
import { PRODUCT_CATEGORIES } from '@/lib/types/products';
import { Search, Upload } from 'lucide-react';

export default function ProductsPage() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id);
  const organizationId = organization?.id;
  const { data: products = [], isLoading } = useProducts(organizationId);
  const createProduct = useCreateProduct(organizationId || '');
  const updateProduct = useUpdateProduct(organizationId || '');
  const deleteProduct = useDeleteProduct(organizationId || '');
  const bulkCreate = useBulkCreateProducts(organizationId || '');
  const reorderProducts = useReorderProducts(organizationId || '');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Delete dialog
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null
  );

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category filter
      if (categoryFilter !== 'all' && product.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter]);

  // Get unique categories from products for filter
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    products.forEach((p) => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories).sort();
  }, [products]);

  const handleCreate = useCallback(
    async (input: CreateProductInput) => {
      await createProduct.mutateAsync(input);
    },
    [createProduct]
  );

  const handleEdit = useCallback(
    async (productId: string, input: CreateProductInput) => {
      await updateProduct.mutateAsync({
        productId,
        input: {
          ...input,
          amount: input.amount ?? null,
        },
      });
    },
    [updateProduct]
  );

  const handleReorder = useCallback(
    (productIds: string[]) => {
      reorderProducts.mutate(productIds);
    },
    [reorderProducts]
  );

  const handleDeleteRequest = useCallback((productId: string) => {
    setDeletingProductId(productId);
  }, []);

  const confirmDelete = async () => {
    if (deletingProductId) {
      await deleteProduct.mutateAsync(deletingProductId);
      setDeletingProductId(null);
    }
  };

  // Handle CSV import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return; // No data rows
    }

    // Parse CSV (simple parser - assumes: name,category,amount)
    const parsedProducts: CreateProductInput[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      if (values[0]) {
        parsedProducts.push({
          name: values[0],
          category: values[1] || undefined,
          amount: values[2] ? parseFloat(values[2]) : undefined,
        });
      }
    }

    if (parsedProducts.length > 0) {
      await bulkCreate.mutateAsync(parsedProducts);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isSaving =
    createProduct.isPending ||
    updateProduct.isPending ||
    deleteProduct.isPending ||
    bulkCreate.isPending ||
    reorderProducts.isPending;

  return (
    <PageContent
      title="Products"
      subtitle="Manage your product catalog for proposals"
      showPageHeader={true}
    >
      {/* Filters Row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search - flex to fill space */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 flex-shrink-0">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {availableCategories.length > 0 && (
              <>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </>
            )}
            {PRODUCT_CATEGORIES.filter(
              (c) => !availableCategories.includes(c)
            ).map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Import Button */}
        <Button
          variant="outline"
          onClick={handleImportClick}
          disabled={isSaving}
          className="flex-shrink-0"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Products Table with inline editing */}
      <ProductsTable
        products={filteredProducts}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onReorder={handleReorder}
        isLoading={isLoading}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingProductId !== null}
        onOpenChange={(open) => !open && setDeletingProductId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}
