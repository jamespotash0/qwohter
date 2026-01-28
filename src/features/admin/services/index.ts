/**
 * Admin Services Index
 */

export { productAdminService } from './productAdminService';
export type {
  ProductDomain,
  ProductManufacturer,
  ProductLine,
  ProductSeries,
  ProductModel,
  ProductVariant,
} from './productAdminService';

export { optionAdminService } from './optionAdminService';
export type {
  OptionGroup,
  OptionValue,
  ModelOption,
  ModelAllowedValue,
  ProductRule,
} from './optionAdminService';

export { configValueSetsService } from './configValueSetsService';
