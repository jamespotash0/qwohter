/**
 * ProductConfigurator Component
 *
 * Dynamic product configuration UI powered by LiquidJS templates.
 * Fetches template from Supabase and renders options with cascading logic.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { renderTemplate } from '@/lib/templateEngine';
import {
  fetchProductTemplate,
  calculatePrice,
  validateSelections,
  getFieldsToReset,
  getSelectionLabels,
  getAvailableOptions,
} from '@/services/productTemplatesService';
import type {
  ProductConfiguratorProps,
  ProductTemplate,
  ConfiguratorSelections,
  ValidationError,
  TemplateRenderContext,
} from '@/lib/types/productTemplates';
import { Loader2, AlertCircle } from 'lucide-react';

export function ProductConfigurator({
  templateId,
  manufacturer,
  domain,
  series,
  model,
  initialSelections = {},
  onChange,
  onSubmit,
  onValidationError,
  showPriceSummary = true,
  className = '',
  readOnly = false,
}: ProductConfiguratorProps) {
  // State
  const [template, setTemplate] = useState<ProductTemplate | null>(null);
  const [selections, setSelections] = useState<ConfiguratorSelections>(initialSelections);
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // Load Template
  // ==========================================================================

  useEffect(() => {
    async function loadTemplate() {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedTemplate = await fetchProductTemplate({
          id: templateId,
          manufacturer,
          domain,
          series,
          model,
        });

        if (!fetchedTemplate) {
          setError('Product template not found');
          return;
        }

        setTemplate(fetchedTemplate);

        // Set default quantity if not provided
        if (!initialSelections.quantity) {
          setSelections(prev => ({ ...prev, quantity: 1 }));
        }
      } catch (err) {
        console.error('[ProductConfigurator] Load error:', err);
        setError('Failed to load product configuration');
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplate();
  }, [templateId, manufacturer, domain, series, model]);

  // ==========================================================================
  // Render Template
  // ==========================================================================

  useEffect(() => {
    if (!template || !template.options_template) return;

    async function render() {
      try {
        // Calculate price
        const { totalPrice, unitPrice } = calculatePrice(template!, selections);

        // Get labels for selections
        const labels = getSelectionLabels(template!, selections);

        // Build render context
        const context: TemplateRenderContext = {
          product: {
            id: template!.id,
            name: template!.name,
            description: template!.description,
            manufacturer: template!.manufacturer,
            domain: template!.domain,
            series: template!.series,
            model: template!.model,
            image_url: template!.image_url,
            base_price: template!.base_price,
          },
          options: template!.config_data.options || {},
          option_groups: template!.config_data.option_groups || [],
          selected: { ...selections, ...labels },
          calculated_price: totalPrice,
          unit_price: unitPrice,
          quantity: Number(selections.quantity) || 1,
          validation_errors: validationErrors,
          cascades: template!.cascades || {},
        };

        // Filter available options based on cascading
        const filteredOptions: Record<string, unknown[]> = {};
        for (const key of Object.keys(context.options)) {
          filteredOptions[key] = getAvailableOptions(template!, key, selections);
        }
        context.options = filteredOptions as typeof context.options;

        // Render Liquid template
        const html = await renderTemplate(template!.options_template!, context);
        setRenderedHtml(html);
      } catch (err) {
        console.error('[ProductConfigurator] Render error:', err);
        setError('Failed to render configuration');
      }
    }

    render();
  }, [template, selections, validationErrors]);

  // ==========================================================================
  // Handle Selection Changes
  // ==========================================================================

  const handleChange = useCallback((field: string, value: string | number | boolean | null) => {
    if (!template || readOnly) return;

    setSelections(prev => {
      const previousValue = prev[field];
      const newSelections = { ...prev, [field]: value };

      // Reset dependent fields (cascading)
      const fieldsToReset = getFieldsToReset(template, field);
      for (const resetField of fieldsToReset) {
        newSelections[resetField] = null;
      }

      // Calculate new price
      const { totalPrice } = calculatePrice(template, newSelections);

      // Notify parent
      onChange?.({
        field,
        value,
        previousValue,
        selections: newSelections,
        calculatedPrice: totalPrice,
      });

      return newSelections;
    });
  }, [template, readOnly, onChange]);

  // ==========================================================================
  // Event Delegation for Form Elements
  // ==========================================================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleInputChange = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      if (!target.name) return;

      let value: string | number | boolean | null = target.value;

      // Handle different input types
      if (target.type === 'checkbox') {
        value = (target as HTMLInputElement).checked ? 'yes' : null;
      } else if (target.type === 'number') {
        value = target.value ? Number(target.value) : null;
      } else if (target.type === 'radio') {
        if (!(target as HTMLInputElement).checked) return;
      }

      handleChange(target.name, value);
    };

    // Add event listeners
    container.addEventListener('change', handleInputChange);
    container.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'number') {
        handleInputChange(e);
      }
    });

    return () => {
      container.removeEventListener('change', handleInputChange);
    };
  }, [handleChange]);

  // ==========================================================================
  // Validation
  // ==========================================================================

  const validate = useCallback(() => {
    if (!template) return false;

    const errors = validateSelections(template, selections);
    setValidationErrors(errors);
    onValidationError?.(errors);

    return errors.length === 0;
  }, [template, selections, onValidationError]);

  // ==========================================================================
  // Submit
  // ==========================================================================

  const handleSubmit = useCallback(() => {
    if (!template) return;

    const isValid = validate();
    if (!isValid) return;

    const { totalPrice, unitPrice } = calculatePrice(template, selections);

    onSubmit?.({
      template,
      selections,
      calculatedPrice: totalPrice,
      unitPrice,
      quantity: Number(selections.quantity) || 1,
    });
  }, [template, selections, validate, onSubmit]);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading configuration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
      </div>
    );
  }

  if (!template) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <span className="text-gray-500">No product template available</span>
      </div>
    );
  }

  return (
    <div className={`product-configurator ${className}`}>
      {/* Rendered Template */}
      <div
        ref={containerRef}
        className="configurator-content"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium mb-2">Please fix the following:</p>
          <ul className="list-disc list-inside text-red-700 text-sm">
            {validationErrors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Button (if onSubmit provided) */}
      {onSubmit && !readOnly && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Add to Quote
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductConfigurator;
