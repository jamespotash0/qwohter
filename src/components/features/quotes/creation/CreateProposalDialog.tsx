import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Sparkles, FileCode2, Layout } from "lucide-react";
import { useForms } from "@/hooks/queries";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateQuote: (proposalName: string, formId: string, template: string) => void;
}

// Available PDF templates
const PDF_TEMPLATES = [
  { value: "generic_wall", label: "Generic Wall Template", description: "Standard wall quote template" },
  { value: "base", label: "Base Template", description: "Simple base template" },
  { value: "smart", label: "Smart Quote Template", description: "Intelligent template with auto-calculations" },
] as const;

const CreateProposalDialog = ({
  open,
  onOpenChange,
  onCreateQuote
}: CreateProposalDialogProps) => {
  const [proposalName, setProposalName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Fetch user, organization and forms
  const user = useUser();
  const { organizationId } = useCurrentOrganization(user?.id || "");
  const { data: forms = [], isLoading: formsLoading } = useForms(organizationId || "");

  const handleCreate = () => {
    if (proposalName.trim() && selectedFormId && selectedTemplate) {
      onCreateQuote(proposalName.trim(), selectedFormId, selectedTemplate);
      // Reset form
      setProposalName("");
      setSelectedFormId("");
      setSelectedTemplate("");
      onOpenChange(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && proposalName.trim() && selectedFormId && selectedTemplate) {
      handleCreate();
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-sm border border-white/80 rounded-2xl shadow-2xl">
        <DialogHeader className="text-center space-y-3">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r text-center from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Create New Proposal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          {/* Proposal Name */}
          <div className="space-y-3">
            <Label htmlFor="proposalName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Proposal Name
            </Label>
            <Input
              id="proposalName"
              value={proposalName}
              onChange={e => setProposalName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter proposal name (e.g., Office Building Project)"
              autoFocus
              className="h-12 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
            />
          </div>

          {/* Form Selection */}
          <div className="space-y-3">
            <Label htmlFor="form" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Form Template
            </Label>
            <Select value={selectedFormId} onValueChange={setSelectedFormId}>
              <SelectTrigger id="form" className="h-12 rounded-xl bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 data-[placeholder]:text-slate-400">
                <SelectValue placeholder="Select a form template"/>
              </SelectTrigger>
              <SelectContent className="bg-white">
                {formsLoading ? (
                  <SelectItem value="loading" disabled>Loading forms...</SelectItem>
                ) : forms.length === 0 ? (
                  <SelectItem value="none" disabled>No forms available</SelectItem>
                ) : (
                  forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* PDF Template Selection */}
          <div className="space-y-3">
            <Label htmlFor="template" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileCode2 className="w-4 h-4" />
              PDF Template
            </Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template" className={`h-12 rounded-xl bg-white focus:border-blue-400 focus:ring-blue-400/20 data-[placeholder]:text-slate-400 ${
                !selectedTemplate ? 'border-red-300 border-2' : 'border-slate-200'
              }`}>
                <SelectValue placeholder="Select a PDF template *" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {PDF_TEMPLATES.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 py-2 rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!proposalName.trim() || !selectedFormId || !selectedTemplate}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Proposal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
export default CreateProposalDialog;