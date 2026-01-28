/**
 * Product Configurator Components
 *
 * LiquidJS-powered product configuration system.
 */

export { ProductConfigurator } from './ProductConfigurator';
export { ConfiguratorSelector } from './ConfiguratorSelector';

// Re-export types
export type {
  ProductTemplate,
  ConfiguratorSelections,
  ConfiguratorChangeEvent,
  ConfiguratorSubmitEvent,
  ProductConfiguratorProps,
  TemplateListItem,
} from '@/lib/types/productTemplates';
