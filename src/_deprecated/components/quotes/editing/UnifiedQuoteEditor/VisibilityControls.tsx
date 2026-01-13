import React from 'react';
import { SectionVisibilityConfig } from '@/templates/BaseQuoteTemplate';
import { Eye, EyeOff } from 'lucide-react';

interface VisibilityControlsProps {
  visibility: SectionVisibilityConfig;
  onChange: (visibility: SectionVisibilityConfig) => void;
}

interface SectionControl {
  key: keyof SectionVisibilityConfig;
  label: string;
  description?: string;
}

const sectionControls: SectionControl[] = [
  { key: 'header', label: 'Header', description: 'Company logo and contact information' },
  { key: 'billedToTable', label: 'Billed To (Left Table)', description: 'Client billing information' },
  { key: 'jobInfoTable', label: 'Job Info (Right Table)', description: 'Date, proposal number, project name, job location' },
  { key: 'proposalIntro', label: 'Proposal Introduction', description: 'Opening text and project overview' },
  { key: 'wallTable', label: 'Wall Specifications Table', description: 'Summary of all wall systems' },
  { key: 'panelsSection', label: 'Panels Section', description: 'Panel specifications and details' },
  { key: 'passDoors', label: 'Pass Doors', description: 'Pass-through door information' },
  { key: 'pocketDoors', label: 'Pocket Doors', description: 'Pocket door specifications' },
  { key: 'trackSection', label: 'Track Section', description: 'Track installation details' },
  { key: 'supportSection', label: 'Support Section', description: 'Support structure information' },
  { key: 'generalSection', label: 'General Section', description: 'Additional specifications' },
  { key: 'pricingSection', label: 'Pricing', description: 'Cost breakdown and payment terms' },
  { key: 'termsSignature', label: 'Terms & Signature', description: 'Terms and conditions' },
];

export const VisibilityControls: React.FC<VisibilityControlsProps> = ({
  visibility,
  onChange,
}) => {
  const handleToggle = (key: keyof SectionVisibilityConfig) => {
    onChange({
      ...visibility,
      [key]: !visibility[key],
    });
  };

  const toggleAll = (visible: boolean) => {
    const newVisibility = { ...visibility };
    sectionControls.forEach(control => {
      newVisibility[control.key] = visible;
    });
    onChange(newVisibility);
  };

  const visibleCount = sectionControls.filter(control => visibility[control.key]).length;
  const allVisible = visibleCount === sectionControls.length;
  const someVisible = visibleCount > 0 && visibleCount < sectionControls.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Section Visibility
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              type="button"
            >
              Show All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => toggleAll(false)}
              className="text-xs text-gray-600 hover:text-gray-700 font-medium"
              type="button"
            >
              Hide All
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {visibleCount} of {sectionControls.length} sections visible
        </p>
      </div>

      {/* Controls List */}
      <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
        {sectionControls.map((control) => {
          const isVisible = visibility[control.key];
          return (
            <label
              key={control.key}
              className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              <div className="flex-shrink-0 pt-0.5">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => handleToggle(control.key)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isVisible ? 'text-gray-900' : 'text-gray-400'}`}>
                    {control.label}
                  </span>
                  {isVisible ? (
                    <Eye className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  )}
                </div>
                {control.description && (
                  <p className={`text-xs mt-0.5 ${isVisible ? 'text-gray-500' : 'text-gray-400'}`}>
                    {control.description}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          Hidden sections are removed from the preview and PDF export
        </p>
      </div>
    </div>
  );
};

export default VisibilityControls;
