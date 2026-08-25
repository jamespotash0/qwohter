/**
 * Specification import, into a quote
 *
 * Owns the dialog state and the conversion so PricingTab gains a button rather
 * than a feature. The parsing, the column mapping and the preview all belong to
 * ImportSpecDialog, which is shared with the order-side import — the same file
 * read the same way, landing somewhere else.
 *
 * What it reports back matters as much as what it writes. A specification that
 * imports at list because no discount was known reads as pure margin, and a
 * dealer who is not told will quote from it.
 */

import { useCallback, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { specLinesToPricingSections } from '@/lib/sif/toPricing';
import type { MaterializedOrderLine } from '@/lib/pricing/materialize';
import type { PricingSection } from '@/lib/types/pricing';

interface UseSpecImportOptions {
  /** Appends the imported sections; existing ones are never touched. */
  onSectionsAdded: (sections: PricingSection[]) => void;
}

export function useSpecImport({ onSectionsAdded }: UseSpecImportOptions) {
  const [isOpen, setIsOpen] = useState(false);

  const handleImport = useCallback(
    (lines: MaterializedOrderLine[], fileName: string) => {
      if (lines.length === 0) {
        toast.error('Nothing to import', {
          description: 'No row in that file produced a line.',
        });
        return;
      }

      const result = specLinesToPricingSections(lines, {
        // Unique per import, so a second file into the same proposal cannot
        // collide with the ids the first one wrote.
        idSeed: `${Date.now()}`,
        fallbackSectionName: fileName.replace(/\.[^.]+$/, '') || 'Specification',
      });

      onSectionsAdded(result.sections);
      setIsOpen(false);

      const sectionWord = result.sections.length === 1 ? 'section' : 'sections';
      toast.success(
        `Imported ${lines.length} lines into ${result.sections.length} ${sectionWord}`,
        { description: `From ${fileName}` }
      );

      // Raised separately and after, because these are not failures — the lines
      // did import. They are the two ways an imported quote is quietly wrong.
      if (result.needsCost > 0) {
        toast.warning(
          `${result.needsCost} ${result.needsCost === 1 ? 'line has' : 'lines have'} no resolved cost`,
          {
            description:
              'They came in at list or at zero. Set the discount before quoting from them.',
            duration: 10000,
          }
        );
      }

      if (result.withoutManufacturer > 0) {
        toast.warning(
          `${result.withoutManufacturer} ${result.withoutManufacturer === 1 ? 'line names' : 'lines name'} no manufacturer`,
          {
            description: 'Those cannot be ordered until somebody routes them.',
            duration: 10000,
          }
        );
      }
    },
    [onSectionsAdded]
  );

  return {
    isSpecImportOpen: isOpen,
    openSpecImport: () => setIsOpen(true),
    setSpecImportOpen: setIsOpen,
    handleSpecImport: handleImport,
  };
}
