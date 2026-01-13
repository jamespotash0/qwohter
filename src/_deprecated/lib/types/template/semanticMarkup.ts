/**
 * TypeScript types for semantic markup in quote templates
 *
 * These types define the structure of data attributes used to track
 * dynamic values and conditional logic in HTML templates.
 */

/**
 * Type of content marked with semantic attributes
 */
export type ContentType = 'dynamic' | 'conditional';

/**
 * Edit status of a marked element
 */
export type EditStatus = 'computed' | 'user_edited';

/**
 * Configuration for marking dynamic values in templates
 */
export interface DynamicValueConfig {
  /** The data path to the value (e.g., 'quote_details.contactName') */
  path: string;
  /** Optional formatting function (e.g., 'currency', 'date') */
  format?: string;
  /** Current computed value */
  value: string | number;
}

/**
 * Configuration for marking conditional static text
 */
export interface ConditionalConfig {
  /** The conditional expression as a string (for debugging/display) */
  expression: string;
  /** The evaluated result */
  result: string;
  /** Array of data paths this conditional depends on */
  dependencies: string[];
}

/**
 * Data attributes attached to marked HTML elements
 */
export interface SemanticMarkupAttributes {
  /** Type of marked content */
  'data-type': ContentType;
  /** For dynamic values: the data path */
  'data-value'?: string;
  /** For dynamic values: formatting function */
  'data-format'?: string;
  /** For conditional: the expression */
  'data-conditional'?: string;
  /** For conditional: dependencies as comma-separated paths */
  'data-deps'?: string;
  /** Whether user has manually edited this value */
  'data-user-edited'?: 'true' | 'false';
  /** Original computed value (for reset functionality) */
  'data-original-value'?: string;
}

/**
 * Options for re-evaluating marked content
 */
export interface ReEvaluationOptions {
  /** Whether to skip user-edited elements */
  preserveUserEdits?: boolean;
  /** Whether to update data-original-value attributes */
  updateOriginalValues?: boolean;
}

/**
 * Result of parsing a marked HTML element
 */
export interface ParsedMarkedElement {
  /** The DOM element */
  element: HTMLElement;
  /** Type of content */
  type: ContentType;
  /** Current text content */
  currentValue: string;
  /** Whether user has edited this */
  isUserEdited: boolean;
  /** Original computed value */
  originalValue?: string;
  /** For dynamic values: the data path */
  valuePath?: string;
  /** For dynamic values: formatting function */
  format?: string;
  /** For conditional: the expression */
  conditionalExpression?: string;
  /** For conditional: dependencies */
  dependencies?: string[];
}
