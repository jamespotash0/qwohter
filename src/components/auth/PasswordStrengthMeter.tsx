import { Check, X } from 'lucide-react';
import { getPasswordStrength, type PasswordStrength } from '@/utils/validation';

interface PasswordStrengthMeterProps {
  password: string;
}

const STRENGTH_CONFIG = {
  weak: { color: 'bg-red-400', textColor: 'text-red-500', label: 'Weak', segments: 1 },
  fair: { color: 'bg-amber-400', textColor: 'text-amber-500', label: 'Fair', segments: 2 },
  good: { color: 'bg-emerald-400', textColor: 'text-emerald-500', label: 'Good', segments: 3 },
  strong: { color: 'bg-[#ee6c4d]', textColor: 'text-[#ee6c4d]', label: 'Strong', segments: 4 },
} as const;

const REQUIREMENT_LABELS: { key: keyof PasswordStrength['requirements']; label: string }[] = [
  { key: 'length', label: '8+ characters' },
  { key: 'uppercase', label: 'Uppercase letter (A-Z)' },
  { key: 'lowercase', label: 'Lowercase letter (a-z)' },
  { key: 'number', label: 'Number (0-9)' },
  { key: 'special', label: 'Special character (!@#$%&*)' },
];

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const strength = getPasswordStrength(password);
  const config = STRENGTH_CONFIG[strength.level];

  if (!password) {
    return (
      <p className="text-xs text-[#171717]/40 mt-1.5">
        Use 8+ characters with uppercase, lowercase, numbers, and symbols
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2.5">
      {/* Strength bar */}
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < config.segments ? config.color : 'bg-[#171717]/8'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${config.textColor} transition-colors duration-300`}>
          {config.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {REQUIREMENT_LABELS.map(({ key, label }) => {
          const met = strength.requirements[key];
          return (
            <li key={key} className="flex items-center gap-1.5">
              {met ? (
                <Check className="h-3 w-3 text-emerald-500 shrink-0" />
              ) : (
                <X className="h-3 w-3 text-[#171717]/25 shrink-0" />
              )}
              <span
                className={`text-xs transition-colors duration-200 ${
                  met ? 'text-[#171717]/60' : 'text-[#171717]/30'
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
