import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Sparkles,
  Star, 
  Building2, 
  Rocket,
  ArrowRight,
  Clock,
  Target,
  Users
} from "lucide-react";

interface EnhancedCreateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateQuote: (quoteName: string) => void;
  variant?: "default" | "dashboard-card";
}

const EnhancedCreateQuoteDialog = ({
  open,
  onOpenChange,
  onCreateQuote,
  variant = "default"
}: EnhancedCreateQuoteDialogProps) => {
  const [quoteName, setQuoteName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleCreate = () => {
    if (quoteName.trim()) {
      onCreateQuote(quoteName.trim());
      setQuoteName("");
      setSelectedTemplate(null);
      onOpenChange(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && quoteName.trim()) {
      handleCreate();
    }
  };

  const templates = [
    {
      id: "office",
      name: "Office Building",
      description: "Perfect for corporate offices and commercial spaces",
      icon: Building2,
      color: "from-blue-500 to-indigo-600",
      features: ["Operable walls", "Sound ratings", "Pass doors"]
    },
    {
      id: "conference",
      name: "Conference Room",
      description: "Ideal for meeting rooms and conference areas",
      icon: Users,
      color: "from-emerald-500 to-green-600",
      features: ["Glass walls", "Privacy options", "Quick setup"]
    },
    {
      id: "custom",
      name: "Custom Project",
      description: "Fully customizable for unique requirements",
      icon: Target,
      color: "from-purple-500 to-pink-600",
      features: ["All wall types", "Full customization", "Expert support"]
    }
  ];

  const triggerButton = variant === "dashboard-card" ? (
    <Button className="h-24 flex-col gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
        <Plus className="w-5 h-5" />
      </div>
      <span className="font-semibold">Create New Quote</span>
    </Button>
  ) : (
    <Button className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl">
      <Plus className="w-4 h-4 mr-2" />
      <span className="font-semibold">Create Quote</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl bg-gradient-to-br from-white via-slate-50 to-blue-50/20 border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="text-center space-y-4 pb-6 border-b border-slate-200">
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
              <Rocket className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Create Your Quote
            </DialogTitle>
            <p className="text-slate-600 mt-2 text-lg">
              Start building your professional wall system quote with our guided wizard
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Quote Name Input */}
          <div className="space-y-4">
            <Label htmlFor="quoteName" className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Project Name
            </Label>
            <Input 
              id="quoteName"
              value={quoteName}
              onChange={e => setQuoteName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Downtown Office Building, Conference Center Project"
              autoFocus
              className="h-14 text-lg rounded-2xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 transition-all duration-200 bg-white/80 backdrop-blur-sm"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <Label className="text-lg font-bold text-slate-900">Choose a Template (Optional)</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template) => {
                const isSelected = selectedTemplate === template.id;
                return (
                  <Card 
                    key={template.id}
                    className={`
                      cursor-pointer transition-all duration-300 hover:shadow-xl border-2
                      ${isSelected 
                        ? 'border-indigo-400 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50' 
                        : 'border-slate-200 hover:border-slate-300 bg-white/80'
                      }
                    `}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${template.color} flex items-center justify-center shadow-lg`}>
                            <template.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{template.name}</h3>
                            {isSelected && (
                              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {template.description}
                        </p>
                        
                        <div className="space-y-2">
                          {template.features.map((feature) => (
                            <div key={feature} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              <span className="text-xs text-slate-600">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-sm text-slate-500 text-center">
              Templates help pre-configure common settings. You can always customize everything later.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Takes about 5-10 minutes to complete</span>
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="px-8 py-3 rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!quoteName.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  Start Building Quote
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Background Decorations */}
        <div className="absolute top-0 right-0 -z-10 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -z-10 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl" />
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedCreateQuoteDialog;