/**
 * useProducts Hook
 *
 * Custom hook for managing products in the product catalog
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '@/services/productsService';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from '@/lib/types/products';
import { useToast } from '@/hooks/use-toast';

/**
 * Query key factory for products
 */
export const productQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  list: (orgId: string) => [...productQueryKeys.lists(), orgId] as const,
  details: () => [...productQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...productQueryKeys.details(), id] as const,
};

/**
 * Fetch all products for an organization
 * Updates via mutation cache invalidation (no realtime polling)
 */
export const useProducts = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: productQueryKeys.list(organizationId || ''),
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return productsService.getProducts(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });
};

/**
 * Fetch a single product by ID
 */
export const useProduct = (productId: string | undefined) => {
  return useQuery({
    queryKey: productQueryKeys.detail(productId || ''),
    queryFn: () => {
      if (!productId) throw new Error('Product ID is required');
      return productsService.getProductById(productId);
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes - single product changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Search products with debounced caching
 */
export const useSearchProducts = (
  organizationId: string | undefined,
  query: string
) => {
  return useQuery({
    queryKey: [...productQueryKeys.list(organizationId || ''), 'search', query],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return productsService.searchProducts(organizationId, query);
    },
    enabled: !!organizationId && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds - search results can change
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Create a new product with optimistic update
 */
export const useCreateProduct = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      productsService.createProduct(organizationId, input),
    onMutate: async (newProductInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: productQueryKeys.list(organizationId),
      });

      // Snapshot previous value
      const previousProducts = queryClient.getQueryData<Product[]>(
        productQueryKeys.list(organizationId)
      );

      // Optimistically add to list
      if (previousProducts) {
        // Calculate next display_id the same way as server (max numeric + 1)
        const numericIds = previousProducts
          .map((p) => parseInt(p.display_id || '', 10))
          .filter((n) => !isNaN(n));
        const nextDisplayId = numericIds.length > 0
          ? String(Math.max(...numericIds) + 1)
          : '1';

        const optimisticProduct: Product = {
          id: `temp-${Date.now()}`,
          organization_id: organizationId,
          product_number: previousProducts.length + 1,
          display_id: newProductInput.display_id || nextDisplayId,
          name: newProductInput.name,
          amount: newProductInput.amount ?? null,
          amount_unit: newProductInput.amount_unit || 'Flat',
          category: newProductInput.category || null,
          manufacturer: null,
          product_type: null,
          series: null,
          model: null,
          specifications: {},
          options: {},
          sort_order: previousProducts.length,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Product[]>(
          productQueryKeys.list(organizationId),
          [...previousProducts, optimisticProduct]
        );
      }

      return { previousProducts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(organizationId),
      });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(
          productQueryKeys.list(organizationId),
          context.previousProducts
        );
      }
      toast({
        title: 'Error Creating Product',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Update an existing product with optimistic update
 */
export const useUpdateProduct = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: UpdateProductInput;
    }) => productsService.updateProduct(productId, input),
    onMutate: async ({ productId, input }) => {
      await queryClient.cancelQueries({
        queryKey: productQueryKeys.list(organizationId),
      });

      const previousProducts = queryClient.getQueryData<Product[]>(
        productQueryKeys.list(organizationId)
      );

      // Optimistically update the product in the list
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(
          productQueryKeys.list(organizationId),
          previousProducts.map((p) =>
            p.id === productId
              ? { ...p, ...input, updated_at: new Date().toISOString() }
              : p
          )
        );
      }

      return { previousProducts };
    },
    onSuccess: (updatedProduct: Product) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(updatedProduct.id),
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          productQueryKeys.list(organizationId),
          context.previousProducts
        );
      }
      toast({
        title: 'Error Updating Product',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Delete a product with optimistic update
 */
export const useDeleteProduct = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (productId: string) =>
      productsService.deleteProduct(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({
        queryKey: productQueryKeys.list(organizationId),
      });

      const previousProducts = queryClient.getQueryData<Product[]>(
        productQueryKeys.list(organizationId)
      );

      // Optimistically remove from list
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(
          productQueryKeys.list(organizationId),
          previousProducts.filter((p) => p.id !== productId)
        );
      }

      return { previousProducts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(organizationId),
      });
    },
    onError: (error: Error, _productId, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          productQueryKeys.list(organizationId),
          context.previousProducts
        );
      }
      toast({
        title: 'Error Deleting Product',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Bulk create products (for CSV import)
 */
export const useBulkCreateProducts = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (products: CreateProductInput[]) =>
      productsService.bulkCreateProducts(organizationId, products),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(organizationId),
      });

      if (result.errors.length > 0) {
        toast({
          title: 'Import Completed with Errors',
          description: `${result.created} products created. ${result.errors.length} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Import Successful',
          description: `${result.created} products have been imported.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Reorder products with optimistic update
 */
export const useReorderProducts = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (productIds: string[]) =>
      productsService.reorderProducts(productIds),
    onMutate: async (productIds) => {
      await queryClient.cancelQueries({
        queryKey: productQueryKeys.list(organizationId),
      });

      const previousProducts = queryClient.getQueryData<Product[]>(
        productQueryKeys.list(organizationId)
      );

      // Optimistically reorder products
      if (previousProducts) {
        const reorderedProducts = productIds
          .map((id) => previousProducts.find((p) => p.id === id))
          .filter((p): p is Product => p !== undefined)
          .map((p, index) => ({ ...p, sort_order: index }));

        queryClient.setQueryData<Product[]>(
          productQueryKeys.list(organizationId),
          reorderedProducts
        );
      }

      return { previousProducts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(organizationId),
      });
    },
    onError: (error: Error, _productIds, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          productQueryKeys.list(organizationId),
          context.previousProducts
        );
      }
      toast({
        title: 'Error Reordering Products',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
