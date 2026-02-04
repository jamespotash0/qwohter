import { cn } from '@/lib/utils';

// Proposal editor form element sizing
// Subtle bump from the base h-7/text-xs: slightly taller targets, same font
export const TAB_INPUT_CLASS = cn(
  'h-8 text-xs rounded border-gray-200 dark:border-gray-600 px-2',
  'focus:ring-1 focus:ring-coral/20 focus:border-coral'
);

export const TAB_NUMBER_INPUT_CLASS = cn(
  TAB_INPUT_CLASS,
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
);

export const TAB_SELECT_TRIGGER_CLASS = cn(
  'h-8 rounded border-gray-200 dark:border-gray-600 text-xs',
  'focus:ring-1 focus:ring-coral/20 focus:border-coral'
);

export const TAB_TEXTAREA_CLASS = cn(
  'min-h-[80px] text-xs rounded border-gray-200 dark:border-gray-600 px-2.5 py-2',
  'focus:ring-1 focus:ring-coral/20 focus:border-coral',
  'resize-none'
);

export const TAB_DISABLED_MODIFIER = 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60';

export const disabledInput = (isDisabled: boolean) =>
  isDisabled ? cn(TAB_INPUT_CLASS, TAB_DISABLED_MODIFIER) : TAB_INPUT_CLASS;

export const disabledSelect = (isDisabled: boolean) =>
  isDisabled ? cn(TAB_SELECT_TRIGGER_CLASS, TAB_DISABLED_MODIFIER) : TAB_SELECT_TRIGGER_CLASS;
