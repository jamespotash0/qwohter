/**
 * TemplateCard Component
 *
 * Displays a template card in the template library with preview image,
 * category badge, and action buttons.
 */

import React from 'react';
import { FileText, Copy, Eye } from '@phosphor-icons/react';
import { Template } from '@/services/templateService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
  onCopy: (template: Template) => void;
  onMouseEnter?: () => void; // For prefetching
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onCopy,
  onMouseEnter,
}) => {
  const tabCount = Array.isArray(template.tabs) ? template.tabs.length : 0;
  const fieldCount = Array.isArray(template.tabs)
    ? template.tabs.reduce((acc, tab: any) => acc + (tab.fields?.length || 0), 0)
    : 0;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onMouseEnter={onMouseEnter}
    >
      {/* Preview Image or Placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          <FileText className="w-16 h-16 text-slate-400 dark:text-slate-600" weight="light" />
        </div>

        {/* Category Badge (form_type) */}
        {template.form_type && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              {template.form_type}
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {template.description || 'No description available'}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <span className="font-medium">{tabCount}</span>
            <span>{tabCount === 1 ? 'Tab' : 'Tabs'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">{fieldCount}</span>
            <span>{fieldCount === 1 ? 'Field' : 'Fields'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onPreview(template)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onCopy(template)}
        >
          <Copy className="w-4 h-4 mr-2" />
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
};
