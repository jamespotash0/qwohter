import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { QuoteNameInput } from "@/components/common/inputs";

interface EditingHeaderProps {
  localQuoteName: string;
  editingQuoteName: boolean;
  quoteStatus: string;
  completedSteps: number;
  totalSteps: number;
  hasUnsavedChanges: boolean;
  isCompletelyValid: boolean;
  onBackToDashboard: () => void;
  onQuoteNameChange: (name: string) => void;
  onEditingQuoteNameChange: (editing: boolean) => void;
  onQuoteStatusChange: (status: string) => void;
  onSave: () => Promise<void>;
  onSaveAsDraft?: () => Promise<void>;
  onQuoteNameSave?: (name: string) => void;
}

export const EditingHeader = ({
  localQuoteName,
  editingQuoteName,
  quoteStatus,
  completedSteps,
  totalSteps,
  isCompletelyValid,
  onBackToDashboard,
  onQuoteNameChange,
  onEditingQuoteNameChange,
  onQuoteStatusChange,
  onSave,
  onSaveAsDraft,
  onQuoteNameSave
}: EditingHeaderProps) => {

  const validStatuses = ["Draft", "Pending", "Submitted", "Won", "Rejected"];
  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-white/20 shadow-lg flex-shrink-0">
      <div className="max-w-full mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left - Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToDashboard}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>

          {/* Center - Quote name, status, and editing indicator */}
          <div className="flex items-center gap-3">
            {editingQuoteName ? (
              <QuoteNameInput
                value={localQuoteName}
                maxChars={50}
                onChange={(e) => onQuoteNameChange(e.target.value)}
                onSave={() => {
                  onEditingQuoteNameChange(false);
                  if (onQuoteNameSave && localQuoteName.trim()) {
                    onQuoteNameSave(localQuoteName.trim());
                  }
                }}
              />
            ) : (
              <h1
                className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => onEditingQuoteNameChange(true)}
              >
                {localQuoteName}
              </h1>
            )}
            
            <Select value={quoteStatus} onValueChange={onQuoteStatusChange}>
              <SelectTrigger
                className={`w-28 h-8 text-xs rounded-lg bg-white/80 transition-colors ${
                  !quoteStatus || !validStatuses.includes(quoteStatus)
                    ? "border-red-300 border-2"
                    : "border-green-300 border-2"
                }`}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Won">Won</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right - Progress, unsaved changes indicator, and save buttons */}
          <div className="flex items-center gap-3">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-12 bg-slate-200 rounded-full h-1">
                <div 
                  className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                />
              </div>
              <span>{completedSteps}/{totalSteps}</span>
            </div>
            
            {/* Save as Incomplete button - only show when not all sections are complete */}
            {onSaveAsDraft && !isCompletelyValid && (
              <Button
                variant="outline"
                onClick={onSaveAsDraft}
                size="sm"
                className="px-3 py-2 rounded-lg border hover:bg-slate-50 transition-all duration-200 text-slate-600"
              >
                Save as Incomplete
              </Button>
            )}
            
            {/* Save Quote button */}
            <Button
              onClick={onSave}
              disabled={completedSteps < totalSteps}
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};