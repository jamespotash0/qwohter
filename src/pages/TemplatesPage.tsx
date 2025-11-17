/**
 * Templates Page
 *
 * Manages document templates for proposals.
 * Allows users to browse existing templates and create new ones.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MagnifyingGlass, Plus, SquaresFour, Article } from '@phosphor-icons/react';
import {
  useTemplates,
  useSearchTemplates,
  useCopyTemplate,
  usePrefetchTemplate,
} from '@/hooks/queries/useTemplates';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { Template } from '@/services/templateService';
import { TemplateCard } from '@/features/form-builder/components/TemplateCard';
import { TemplatePreview } from '@/features/form-builder/components/TemplatePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContent } from '@/components/common/layout/PageContent';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Determine active view from URL
  const isLibraryView = location.pathname === '/templates/library';

  const [searchQuery, setSearchQuery] = useState('');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Fetch user's custom templates based on search
  const shouldSearch = searchQuery.length >= 2;
  const { data: templates, isLoading: isLoadingTemplates } = useTemplates(
    undefined,
    { enabled: !isLibraryView && !shouldSearch }
  );
  const { data: searchResults, isLoading: isSearchingTemplates } = useSearchTemplates(
    searchQuery,
    undefined,
    { enabled: !isLibraryView && shouldSearch }
  );

  // Fetch library templates based on search
  const shouldSearchLibrary = librarySearchQuery.length >= 2;
  const { data: libraryTemplates, isLoading: isLoadingLibraryTemplates } = useTemplates(
    undefined,
    { enabled: isLibraryView && !shouldSearchLibrary }
  );
  const { data: librarySearchResults, isLoading: isSearchingLibraryTemplates } = useSearchTemplates(
    librarySearchQuery,
    undefined,
    { enabled: isLibraryView && shouldSearchLibrary }
  );

  const copyTemplateMutation = useCopyTemplate();
  const prefetchTemplate = usePrefetchTemplate();

  const displayedTemplates = shouldSearch ? searchResults : templates;
  const displayedLibraryTemplates = shouldSearchLibrary ? librarySearchResults : libraryTemplates;
  const isLoading = isLoadingTemplates || isSearchingTemplates;
  const isLoadingLibrary = isLoadingLibraryTemplates || isSearchingLibraryTemplates;

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
  };

  const handleCopy = (
    template: Template,
    customName?: string,
    customDescription?: string
  ) => {
    if (!currentOrganization?.id) {
      toast.error('Please select an organization first');
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
        onSuccess: (newTemplate) => {
          toast.success(`"${newTemplate.name}" has been added to your templates`);
          setPreviewTemplate(null);

          // Navigate back to templates page
          setTimeout(() => {
            navigate('/templates');
          }, 500);
        },
        onError: (error) => {
          toast.error(`Failed to copy template: ${error.message}`);
        },
      }
    );
  };

  const handleQuickCopy = (template: Template) => {
    handleCopy(template, template.name);
  };

  const handleAddTemplate = () => {
    // TODO: Implement template creation flow
    toast.info('Template creation flow will be implemented soon.');
  };

  return (
    <PageContent
      title={!isLibraryView ? "Templates" : "Template Library"}
      subtitle={
        !isLibraryView
          ? "Create and manage custom document templates for your proposals. Build reusable templates or browse the library for pre-built options."
          : "Browse Qwohter's prefabbed document templates. Copy and customize professional documents for your business needs."
      }
      showPageHeader={true}
      headerActions={
        <div className="flex items-center gap-3">
          {!isLibraryView ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate('/templates/library')}
                className="flex items-center gap-2"
              >
                <SquaresFour className="w-4 h-4" />
                Library
              </Button>
              <Button
                onClick={handleAddTemplate}
                className="flex items-center gap-2 bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" weight="bold" />
                Add Template
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate('/templates')}
              className="flex items-center gap-2"
            >
              <Article className="w-4 h-4" />
              My Templates
            </Button>
          )}
        </div>
      }
    >
      {!isLibraryView ? (
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search templates by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

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
              <h3 className="text-lg font-semibold mb-2">
                {shouldSearch ? `No templates match "${searchQuery}"` : 'No Templates Available'}
              </h3>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Library Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search document templates by name..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Library Templates Grid */}
          {isLoadingLibrary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : displayedLibraryTemplates && displayedLibraryTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedLibraryTemplates.map((template) => (
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
              <h3 className="text-lg font-semibold mb-2">
                {shouldSearchLibrary
                  ? `No document templates match "${librarySearchQuery}"`
                  : 'No Document Templates Available'}
              </h3>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onCopy={handleCopy}
        isLoading={copyTemplateMutation.isPending}
      />
    </PageContent>
  );
}
