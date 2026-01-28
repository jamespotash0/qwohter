/**
 * Organization Setup Form Component - Redesigned
 *
 * Clean, focused form for organization creation
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";

interface OrganizationSetupFormProps {
  orgName: string;
  loading: boolean;
  onOrgNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrganizationSetupForm: React.FC<OrganizationSetupFormProps> = ({
  orgName,
  loading,
  onOrgNameChange,
  onSubmit
}) => {
  const inputClasses = `
    w-full h-12 px-4 bg-[#f7f2e9]/50 border border-[#171717]/10 rounded-full
    text-[#171717] placeholder:text-[#171717]/40
    transition-all duration-200
    hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70
    focus:outline-none focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white
  `;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="orgName"
            className="text-sm font-medium text-[#171717]"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Organization name
          </Label>
          <Input
            id="orgName"
            type="text"
            value={orgName}
            onChange={(e) => onOrgNameChange(e.target.value)}
            placeholder="e.g., Acme Corporation"
            required
            className={inputClasses}
            autoFocus
          />
          <p className="text-xs text-[#171717]/40 mt-1.5">
            You can change this later in settings
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 text-white font-semibold rounded-full transition-all duration-200 group"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
          disabled={loading || !orgName.trim()}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Continue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </Button>
      </form>

      {/* Support Contact */}
      <p
        className="text-xs text-[#171717]/40 text-center"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        Need help?{' '}
        <a href="mailto:info@qwohter.com" className="text-[#ee6c4d] hover:underline">
          info@qwohter.com
        </a>
      </p>
    </div>
  );
};
