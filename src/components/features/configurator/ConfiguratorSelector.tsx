/**
 * ConfiguratorSelector Component
 *
 * Dropdown selectors for choosing Manufacturer and Domain
 * before loading the product configurator.
 */

import { useState, useEffect } from 'react';
import {
  fetchManufacturers,
  fetchDomains,
  fetchTemplateList,
} from '@/services/productTemplatesService';
import type { TemplateListItem } from '@/lib/types/productTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ConfiguratorSelectorProps {
  /** Callback when a template is selected */
  onTemplateSelect: (template: TemplateListItem) => void;
  /** Pre-selected manufacturer */
  initialManufacturer?: string;
  /** Pre-selected domain */
  initialDomain?: string;
  /** Custom CSS classes */
  className?: string;
}

export function ConfiguratorSelector({
  onTemplateSelect,
  initialManufacturer,
  initialDomain,
  className = '',
}: ConfiguratorSelectorProps) {
  // State
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);

  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(
    initialManufacturer || ''
  );
  const [selectedDomain, setSelectedDomain] = useState<string>(
    initialDomain || ''
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [isLoadingManufacturers, setIsLoadingManufacturers] = useState(true);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // ==========================================================================
  // Load Manufacturers
  // ==========================================================================

  useEffect(() => {
    async function load() {
      setIsLoadingManufacturers(true);
      const data = await fetchManufacturers();
      setManufacturers(data);
      setIsLoadingManufacturers(false);
    }
    load();
  }, []);

  // ==========================================================================
  // Load Domains when Manufacturer changes
  // ==========================================================================

  useEffect(() => {
    if (!selectedManufacturer) {
      setDomains([]);
      setSelectedDomain('');
      return;
    }

    async function load() {
      setIsLoadingDomains(true);
      const data = await fetchDomains(selectedManufacturer);
      setDomains(data);
      setIsLoadingDomains(false);

      // Auto-select if only one domain
      if (data.length === 1) {
        setSelectedDomain(data[0]);
      } else {
        setSelectedDomain('');
      }
    }
    load();
  }, [selectedManufacturer]);

  // ==========================================================================
  // Load Templates when Domain changes
  // ==========================================================================

  useEffect(() => {
    if (!selectedManufacturer || !selectedDomain) {
      setTemplates([]);
      setSelectedTemplateId('');
      return;
    }

    async function load() {
      setIsLoadingTemplates(true);
      const data = await fetchTemplateList({
        manufacturer: selectedManufacturer,
        domain: selectedDomain,
      });
      setTemplates(data);
      setIsLoadingTemplates(false);

      // Auto-select if only one template
      if (data.length === 1) {
        setSelectedTemplateId(data[0].id);
        onTemplateSelect(data[0]);
      } else {
        setSelectedTemplateId('');
      }
    }
    load();
  }, [selectedManufacturer, selectedDomain, onTemplateSelect]);

  // ==========================================================================
  // Handle Template Selection
  // ==========================================================================

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={`configurator-selector space-y-4 ${className}`}>
      {/* Manufacturer Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Manufacturer
        </label>
        <Select
          value={selectedManufacturer}
          onValueChange={setSelectedManufacturer}
          disabled={isLoadingManufacturers}
        >
          <SelectTrigger className="w-full">
            {isLoadingManufacturers ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              <SelectValue placeholder="Select manufacturer..." />
            )}
          </SelectTrigger>
          <SelectContent>
            {manufacturers.map(mfr => (
              <SelectItem key={mfr} value={mfr}>
                {mfr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Domain Select */}
      {selectedManufacturer && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product Type
          </label>
          <Select
            value={selectedDomain}
            onValueChange={setSelectedDomain}
            disabled={isLoadingDomains || domains.length === 0}
          >
            <SelectTrigger className="w-full">
              {isLoadingDomains ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <SelectValue placeholder="Select product type..." />
              )}
            </SelectTrigger>
            <SelectContent>
              {domains.map(dom => (
                <SelectItem key={dom} value={dom}>
                  {dom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Template Select (if multiple templates available) */}
      {selectedDomain && templates.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product
          </label>
          <Select
            value={selectedTemplateId}
            onValueChange={handleTemplateChange}
            disabled={isLoadingTemplates}
          >
            <SelectTrigger className="w-full">
              {isLoadingTemplates ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <SelectValue placeholder="Select product..." />
              )}
            </SelectTrigger>
            <SelectContent>
              {templates.map(tmpl => (
                <SelectItem key={tmpl.id} value={tmpl.id}>
                  <div className="flex justify-between items-center w-full">
                    <span>{tmpl.name}</span>
                    {tmpl.base_price > 0 && (
                      <span className="text-sm text-gray-500 ml-2">
                        from ${tmpl.base_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Show selected template info */}
      {selectedTemplateId && templates.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          {(() => {
            const tmpl = templates.find(t => t.id === selectedTemplateId);
            if (!tmpl) return null;
            return (
              <>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {tmpl.name}
                </p>
                {tmpl.description && (
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {tmpl.description}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default ConfiguratorSelector;
