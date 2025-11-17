/**
 * Library Tab Component
 *
 * Displays Qwohter's pre-built form templates that users can browse and copy
 * to their "My Forms" collection. Integrated as a tab within the Forms page.
 */

import React, { useState } from 'react';
import { MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import {
  useTemplates,
  useTemplateCategories,
  useSearchTemplates,
  useCopyTemplate,
  usePrefetchTemplate,
} from '@/hooks/queries/useTemplates';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { Template } from '@/services/templateService';
import { TemplateCard } from './TemplateCard';
import { TemplatePreview } from './TemplatePreview';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface LibraryTabProps {
  onTemplateCopied?: (formId: string) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ onTemplateCopied }) => {
  const { toast } = useToast();
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Fetch templates based on search/category
  const isSearching = searchQuery.length >= 2;
  const { data: templates, isLoading: isLoadingTemplates } = useTemplates(
    selectedCategory,
    { enabled: !isSearching }
  );
  const { data: searchResults, isLoading: isSearchingTemplates } = useSearchTemplates(
    searchQuery,
    selectedCategory,
    { enabled: isSearching }
  );
  const { data: categories } = useTemplateCategories();

  const copyTemplateMutation = useCopyTemplate();
  const prefetchTemplate = usePrefetchTemplate();

  const displayedTemplates = isSearching ? searchResults : templates;
  const isLoading = isLoadingTemplates || isSearchingTemplates;

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
  };

  const handleCopy = (
    template: Template,
    customName?: string,
    customDescription?: string
  ) => {
    if (!currentOrganization?.id) {
      toast({
        title: 'No Organization',
        description: 'Please select an organization first',
        variant: 'destructive',
      });
      return;
    }

    copyTemplateMutation.mutate(
      {
        templateId: template.id,
        organizationId: currentOrganization.id,
        customName,
        customDescription,
      },
      {
        onSuccess: (newForm) => {
          toast({
            title: 'Template Added to My Forms',
            description: `"${newForm.name}" is now available in your forms`,
          });
          setPreviewTemplate(null);

          // Notify parent to potentially switch back to My Forms tab
          if (onTemplateCopied) {
            onTemplateCopied(newForm.id);
          }
        },
        onError: (error) => {
          toast({
            title: 'Failed to Copy Template',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleQuickCopy = (template: Template) => {
    handleCopy(template, template.name);
  };

  return (
    <div className="space-y-6">
      {/* Header Text */}
      <div>
        <p className="text-slate-600 dark:text-slate-400">
          Browse Qwohter's pre-built form templates and add them to your forms collection
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={selectedCategory || 'all'}
          onValueChange={(value) => setSelectedCategory(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <Funnel className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.name} value={category.name}>
                {category.name} ({category.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {displayedTemplates && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {displayedTemplates.length}{' '}
          {displayedTemplates.length === 1 ? 'template' : 'templates'}
          {selectedCategory && ` in ${selectedCategory}`}
          {isSearching && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : displayedTemplates && displayedTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onCopy={handleQuickCopy}
              onMouseEnter={() => prefetchTemplate(template.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-slate-400 mb-2">
            <MagnifyingGlass className="w-16 h-16 mx-auto mb-4" weight="light" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
          <p className="text-slate-600 dark:text-slate-400">
            {isSearching
              ? `No templates match "${searchQuery}"`
              : selectedCategory
              ? `No templates in ${selectedCategory} category`
              : 'No templates available yet'}
          </p>
        </div>
      )}

      {/* Preview Modal */}
      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onCopy={handleCopy}
        isLoading={copyTemplateMutation.isPending}
      />
    </div>
  );
};
