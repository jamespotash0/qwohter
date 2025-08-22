import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Sparkles } from "lucide-react";
interface CreateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateQuote: (quoteName: string) => void;
}
const CreateQuoteDialog = ({
  open,
  onOpenChange,
  onCreateQuote
}: CreateQuoteDialogProps) => {
  const [quoteName, setQuoteName] = useState("");
  const handleCreate = () => {
    if (quoteName.trim()) {
      onCreateQuote(quoteName.trim());
      setQuoteName("");
      onOpenChange(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm border border-white/80 rounded-2xl shadow-2xl">
        <DialogHeader className="text-center space-y-3">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r text-center from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Create New Quote
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-3">
            <Label htmlFor="quoteName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Quote Name
            </Label>
            <Input id="quoteName" value={quoteName} onChange={e => setQuoteName(e.target.value)} onKeyPress={handleKeyPress} placeholder="Enter quote name (e.g., Office Building Project)" autoFocus className="h-12 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6 py-2 rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!quoteName.trim()} className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              Create Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
export default CreateQuoteDialog;