
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface CreateQuoteDialogProps {
  onCreateQuote: (quoteName: string) => void;
}

const CreateQuoteDialog = ({ onCreateQuote }: CreateQuoteDialogProps) => {
  const [quoteName, setQuoteName] = useState("");
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    if (quoteName.trim()) {
      onCreateQuote(quoteName.trim());
      setQuoteName("");
      setOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3" size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Create New Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quoteName">Quote Name</Label>
            <Input
              id="quoteName"
              value={quoteName}
              onChange={(e) => setQuoteName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter quote name (e.g., Office Building Project)"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!quoteName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Create Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuoteDialog;
