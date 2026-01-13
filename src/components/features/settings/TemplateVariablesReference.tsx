/**
 * Template Variables Reference Dialog
 *
 * Shows all available variables that can be used in Google Docs templates.
 * Accessible from settings before creating templates.
 */

import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, FileText, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VariableItem {
  key: string;
  label: string;
  description?: string;
  example?: string;
}

interface VariableCategory {
  name: string;
  description?: string;
  variables: VariableItem[];
}

// All available template variables organized by category
const TEMPLATE_VARIABLES: VariableCategory[] = [
  {
    name: 'Special Markers',
    description: 'Special placeholders for advanced features',
    variables: [
      {
        key: 'SIGNATURE_BLOCK',
        label: 'Signature Block',
        description: 'Adds signature & date fields for e-signature',
        example: 'Signature: ____________    Date: ________',
      },
    ],
  },
  {
    name: 'Tables & Loops',
    description: 'Create dynamic tables from pricing data',
    variables: [
      {
        key: '#TABLE:pricing',
        label: 'Auto Pricing Table',
        description: 'Auto-creates a complete table with headers, rows, and totals',
      },
      {
        key: '#ROW:pricing',
        label: 'Start Row Loop',
        description: 'Place in first cell of a table row to duplicate for each line item',
      },
      {
        key: 'row.name',
        label: 'Item Name',
        description: 'Line item name (use inside row loop)',
      },
      {
        key: 'row.quantity',
        label: 'Quantity',
        description: 'Line item quantity',
      },
      {
        key: 'row.unitSellPrice',
        label: 'Unit Price',
        description: 'Per-unit selling price',
      },
      {
        key: 'row.discountPercent',
        label: 'Discount %',
        description: 'Discount percentage applied',
      },
      {
        key: 'row.lineTotal',
        label: 'Line Total',
        description: 'Total for this line item',
      },
      {
        key: '/ROW',
        label: 'End Row Loop',
        description: 'Place at end of template row',
      },
    ],
  },
  {
    name: 'Project',
    description: 'Project and job information',
    variables: [
      { key: 'proposal.number', label: 'Proposal Number', example: 'P-1001' },
      { key: 'project.name', label: 'Project Name', example: 'Office Renovation' },
      { key: 'project.date', label: 'Proposal Date', example: 'January 7, 2026' },
      { key: 'project.location', label: 'Job Address', example: '123 Main St' },
      { key: 'project.locationName', label: 'Location Name', example: 'Downtown Office' },
      { key: 'project.floor', label: 'Floor', example: '3rd Floor' },
      { key: 'project.dueDate', label: 'Due Date', example: 'March 15, 2026' },
      { key: 'project.workType', label: 'Type of Work', example: 'New Construction' },
      { key: 'project.laborType', label: 'Labor Type', example: 'Union' },
    ],
  },
  {
    name: 'Client',
    description: 'Client contact information',
    variables: [
      { key: 'client.name', label: 'Client Name', example: 'John Smith' },
      { key: 'client.company', label: 'Company', example: 'Acme Corp' },
      { key: 'client.email', label: 'Email', example: 'john@acme.com' },
      { key: 'client.phone', label: 'Phone', example: '(555) 123-4567' },
      { key: 'client.address', label: 'Address', example: '456 Oak Ave' },
    ],
  },
  {
    name: 'Organization',
    description: 'Your company information',
    variables: [
      { key: 'org.name', label: 'Organization Name', example: 'Your Company LLC' },
      { key: 'org.phone', label: 'Phone', example: '(555) 987-6543' },
      { key: 'org.fax', label: 'Fax', example: '(555) 987-6544' },
      { key: 'org.address', label: 'Address', example: '789 Business Blvd' },
      { key: 'org.website', label: 'Website', example: 'www.yourcompany.com' },
    ],
  },
  {
    name: 'Pricing Totals',
    description: 'Summary pricing values',
    variables: [
      { key: 'pricing.grandTotal', label: 'Grand Total', example: '$15,750.00' },
      { key: 'pricing.totalSellingPrice', label: 'Subtotal (before tax)', example: '$15,000.00' },
      { key: 'pricing.tax', label: 'Tax Amount', example: '$750.00' },
      { key: 'pricing.taxRate', label: 'Tax Rate', example: '5%' },
    ],
  },
  {
    name: 'Pricing Sections',
    description: 'Section-level pricing (replace {section} with section name)',
    variables: [
      {
        key: 'pricing.{section}.sellingPrice',
        label: 'Section Total',
        description: 'e.g., pricing.materials.sellingPrice',
        example: '$5,000.00',
      },
    ],
  },
  {
    name: 'Lead Times',
    description: 'Project timeline phases (replace {phase} with phase name in camelCase)',
    variables: [
      {
        key: 'leadtimes.{phase}.name',
        label: 'Phase Name',
        description: 'e.g., leadtimes.trackInstallation.name',
      },
      {
        key: 'leadtimes.{phase}.duration',
        label: 'Duration',
        description: 'e.g., leadtimes.panelDelivery.duration',
        example: '2-3 weeks',
      },
      {
        key: 'leadtimes.{phase}.completion',
        label: 'Completion Date',
        description: 'e.g., leadtimes.finalInstall.completion',
      },
    ],
  },
  {
    name: 'Products',
    description: 'Product specifications (replace {alias} with product alias like wallA)',
    variables: [
      { key: 'products.list', label: 'Product List', description: 'Comma-separated list of all products' },
      { key: '{alias}.name', label: 'Product Name', description: 'e.g., wallA.name' },
      { key: '{alias}.manufacturer', label: 'Manufacturer', description: 'e.g., wallA.manufacturer' },
      { key: '{alias}.stc', label: 'STC Rating', description: 'e.g., wallA.stc' },
      { key: '{alias}.fireRating', label: 'Fire Rating', description: 'e.g., wallA.fireRating' },
      { key: '{alias}.finish', label: 'Finish', description: 'e.g., wallA.finish' },
    ],
  },
  {
    name: 'Custom Fields',
    description: 'Fields from the Miscellaneous tab',
    variables: [
      {
        key: 'misc.{fieldName}',
        label: 'Custom Field',
        description: 'e.g., misc.payment_terms, misc.warranty_info',
      },
      { key: 'misc.notes', label: 'Additional Notes' },
    ],
  },
];

interface TemplateVariablesReferenceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TemplateVariablesReference: React.FC<TemplateVariablesReferenceProps> = ({
  open,
  onOpenChange,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Special Markers': true,
    'Tables & Loops': true,
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const copyVariable = (key: string) => {
    const formatted = `{{${key}}}`;
    navigator.clipboard.writeText(formatted);
    setCopiedKey(key);
    toast.success(`Copied ${formatted}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    TEMPLATE_VARIABLES.forEach(cat => {
      all[cat.name] = true;
    });
    setExpandedCategories(all);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Template Variables Reference
          </DialogTitle>
          <DialogDescription>
            Copy these variables and paste them into your Google Docs template. Use double braces: {'{{variable}}'}.
          </DialogDescription>
        </DialogHeader>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>

        {/* Variables list */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {TEMPLATE_VARIABLES.map(category => (
            <div key={category.name} className="border rounded-lg">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {expandedCategories[category.name] ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <span className="font-medium">{category.name}</span>
                <span className="text-sm text-gray-500 ml-auto">
                  {category.variables.length} variable{category.variables.length !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Category description */}
              {expandedCategories[category.name] && category.description && (
                <div className="px-3 pb-2 text-sm text-gray-500 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {category.description}
                </div>
              )}

              {/* Variables */}
              {expandedCategories[category.name] && (
                <div className="border-t">
                  {category.variables.map(variable => (
                    <div
                      key={variable.key}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-primary">
                            {`{{${variable.key}}}`}
                          </code>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {variable.label}
                          </span>
                        </div>
                        {variable.description && (
                          <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                        )}
                        {variable.example && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Example: <span className="italic">{variable.example}</span>
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyVariable(variable.key)}
                        className={cn(
                          'flex-shrink-0',
                          copiedKey === variable.key && 'text-green-600'
                        )}
                      >
                        {copiedKey === variable.key ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="pt-3 border-t text-sm text-gray-500">
          <strong>Tip:</strong> Create your template in Google Docs first, then paste these variables where you want data to appear.
        </div>
      </DialogContent>
    </Dialog>
  );
};
