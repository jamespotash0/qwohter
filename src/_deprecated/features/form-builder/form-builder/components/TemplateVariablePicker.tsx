/**
 * Template Variable Picker
 * Allows users to insert template variables like {{organizationName}} into fields
 */

import { useState } from 'react';
import { Database, User, Users, Invoice } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TemplateVariable {
  key: string;
  label: string;
  category: 'profile' | 'membership' | 'organizations' | 'quotes';
  description?: string;
}

interface TemplateVariablePickerProps {
  onInsert: (variable: string) => void;
  className?: string;
}

// Available template variables organized by category
const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Organizations table
  {
    key: '{{organizationName}}',
    label: 'Organization Name',
    category: 'organizations',
    description: 'Name of the organization',
  },
  {
    key: '{{organizationPhone}}',
    label: 'Organization Phone',
    category: 'organizations',
    description: 'Organization phone number',
  },
  {
    key: '{{organizationFax}}',
    label: 'Organization Fax',
    category: 'organizations',
    description: 'Organization fax number',
  },
  {
    key: '{{organizationEmail}}',
    label: 'Organization Email',
    category: 'organizations',
    description: 'Organization email address',
  },
  {
    key: '{{organizationWebsite}}',
    label: 'Organization Website',
    category: 'organizations',
    description: 'Organization website URL',
  },
  {
    key: '{{organizationAddress}}',
    label: 'Organization Address',
    category: 'organizations',
    description: 'Organization physical address',
  },

  // Profile table
  {
    key: '{{userName}}',
    label: 'User Name',
    category: 'profile',
    description: 'Current logged-in user\'s full name',
  },
  {
    key: '{{userEmail}}',
    label: 'User Email',
    category: 'profile',
    description: 'Current logged-in user\'s email',
  },
  {
    key: '{{userPhone}}',
    label: 'User Phone',
    category: 'profile',
    description: 'Current logged-in user\'s phone number',
  },

  // Membership table
  {
    key: '{{memberName}}',
    label: 'Member Name',
    category: 'membership',
    description: 'Selected organization member\'s name',
  },
  {
    key: '{{memberEmail}}',
    label: 'Member Email',
    category: 'membership',
    description: 'Selected organization member\'s email',
  },
  {
    key: '{{memberPhone}}',
    label: 'Member Phone',
    category: 'membership',
    description: 'Selected organization member\'s phone',
  },

  // Quotes table
  {
    key: '{{quoteNumber}}',
    label: 'Quote Number',
    category: 'quotes',
    description: 'Unique quote reference number',
  },
  {
    key: '{{quoteDate}}',
    label: 'Quote Date',
    category: 'quotes',
    description: 'Date the quote was created',
  },
  {
    key: '{{projectName}}',
    label: 'Project Name',
    category: 'quotes',
    description: 'Name of the project',
  },
  {
    key: '{{clientName}}',
    label: 'Client Name',
    category: 'quotes',
    description: 'Name of the client',
  },
  {
    key: '{{clientCompany}}',
    label: 'Client Company',
    category: 'quotes',
    description: 'Client\'s company name',
  },
];

export function TemplateVariablePicker({ onInsert, className }: TemplateVariablePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredVariables = selectedCategory === 'all'
    ? TEMPLATE_VARIABLES
    : TEMPLATE_VARIABLES.filter(v => v.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'organizations':
        return Database;
      case 'profile':
        return User;
      case 'membership':
        return Users;
      case 'quotes':
        return Invoice;
      default:
        return Database;
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Template Variables</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-7 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="organizations">Organizations</SelectItem>
            <SelectItem value="profile">Profile</SelectItem>
            <SelectItem value="membership">Membership</SelectItem>
            <SelectItem value="quotes">Quotes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
        {filteredVariables.map((variable) => {
          const Icon = getCategoryIcon(variable.category);
          return (
            <button
              key={variable.key}
              type="button"
              onClick={() => onInsert(variable.key)}
              className="w-full flex items-start gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <Icon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {variable.label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
                    {variable.category}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                  {variable.key}
                </div>
                {variable.description && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {variable.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {filteredVariables.length === 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
            No variables in this category
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-2">
        <p className="text-[10px] text-blue-700 dark:text-blue-300">
          <strong>How it works:</strong> Template variables are automatically replaced with actual values from the database when forms are filled out. Click any variable to insert it into the field.
        </p>
      </div>
    </div>
  );
}
