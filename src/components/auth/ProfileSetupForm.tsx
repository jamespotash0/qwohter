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
      <div className="space-y-3">
        <Label htmlFor="fullName" className="text-slate-700 font-medium text-sm">
          Full Name
        </Label>
        <Input 
          id="fullName" 
          type="text" 
          value={fullName} 
          onChange={(e) => onFullNameChange(e.target.value)} 
          placeholder="Enter your full name" 
          required 
          className="bg-slate-50 border-slate-200 h-12" 
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12"
        disabled={loading || !fullName}
      >
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
};