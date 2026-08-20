/**
 * TemplatePreview Component
 *
 * Shows a detailed preview of a template structure including tabs and fields.
 * Allows users to customize name before copying.
 */

import React, { useState } from 'react';
import { Copy, Tabs as TabsIcon } from '@phosphor-icons/react';
import { Template } from '@/services/templateService';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplatePreviewProps {
  template: Template | null;
  open: boolean;
  onClose: () => void;
  onCopy: (template: Template, customName?: string, customDescription?: string) => void;
  isLoading?: boolean;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  open,
  onClose,
  onCopy,
  isLoading = false,
}) => {
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  React.useEffect(() => {
    if (template && open) {
      setCustomName(template.name);
      setCustomDescription(template.description || '');
    }
  }, [template, open]);

  if (!template) return null;

  const tabs = Array.isArray(template.tabs) ? template.tabs : [];
  const tabCount = tabs.length;
  const fieldCount = tabs.reduce((acc, tab: any) => acc + (tab.fields?.length || 0), 0);

  const handleCopy = () => {
    onCopy(template, customName, customDescription);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {template.name}
            {template.form_type && (
              <Badge variant="secondary">{template.form_type}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Customization Section */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-sm">Customize Your Copy</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="custom-name">Form Name</Label>
                  <Input
                    id="custom-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter form name"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-description">Description (Optional)</Label>
                  <Input
                    id="custom-description"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Enter description"
                  />
                </div>
              </div>
            </div>

            {/* Template Structure */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TabsIcon className="w-5 h-5" />
                Template Structure
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {tabCount} {tabCount === 1 ? 'tab' : 'tabs'} · {fieldCount}{' '}
                {fieldCount === 1 ? 'field' : 'fields'}
              </div>

              {tabs.length > 0 ? (
                <Tabs defaultValue={tabs[0]?.id || 'tab-0'} className="w-full">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {tabs.map((tab: any, index: number) => (
                      <TabsTrigger key={tab.id || index} value={tab.id || `tab-${index}`}>
                        {tab.label || tab.name || `Tab ${index + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {tabs.map((tab: any, index: number) => {
                    const fields = Array.isArray(tab.fields) ? tab.fields : [];
                    return (
                      <TabsContent
                        key={tab.id || index}
                        value={tab.id || `tab-${index}`}
                        className="mt-4"
                      >
                        <div className="space-y-2">
                          {tab.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              {tab.description}
                            </p>
                          )}

                          {fields.length > 0 ? (
                            <div className="grid gap-2">
                              {fields.map((field: any, fieldIndex: number) => (
                                <div
                                  key={field.id || fieldIndex}
                                  className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 border rounded-lg"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      {field.label || field.name || `Field ${fieldIndex + 1}`}
                                    </div>
                                    {field.placeholder && (
                                      <div className="text-xs text-slate-500 mt-1">
                                        Placeholder: {field.placeholder}
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {field.type || 'text'}
                                  </Badge>
                                  {field.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-500">
                              No fields in this tab
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              ) : (
                <div className="text-center py-8 text-slate-500">No tabs defined</div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={isLoading || !customName.trim()}>
            <Copy className="w-4 h-4 mr-2" />
            {isLoading ? 'Copying...' : 'Copy to My Forms'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
