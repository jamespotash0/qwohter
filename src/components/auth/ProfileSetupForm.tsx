/**
 * Profile Setup Form Component
 * 
 * Extracted from Auth.tsx - handles user profile completion
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileSetupFormProps {
  fullName: string;
  loading: boolean;
  onFullNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProfileSetupForm: React.FC<ProfileSetupFormProps> = ({
  fullName,
  loading,
  onFullNameChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-gray-700 font-medium text-sm">
          Full Name
        </Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Enter your full name"
          required
          className="bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
        disabled={loading || !fullName}
      >
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
};