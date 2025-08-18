import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PocketDoorsData {
  foldType: string;
  foldStyle: string;
}

interface PocketDoorsFormProps {
  data: PocketDoorsData;
  onUpdate: (data: PocketDoorsData) => void;
}

const PocketDoorsForm = ({ data, onUpdate }: PocketDoorsFormProps) => {
  const [foldType, setFoldType] = useState(data.foldType || "");
  const [foldStyle, setFoldStyle] = useState(data.foldStyle || "");

  // Update parent when form data changes
  useEffect(() => {
    onUpdate({ foldType, foldStyle });
  }, [foldType, foldStyle, onUpdate]);

  // Reset fold style when fold type changes and current style is not available
  const handleFoldTypeChange = (value: string) => {
    const newFoldType = value === "None" ? "" : value;
    setFoldType(newFoldType);
    
    // Reset fold style if current selection is not valid for new fold type
    const availableStyles = getAvailableFoldStyles(newFoldType);
    if (!availableStyles.includes(foldStyle)) {
      setFoldStyle("");
    }
  };

  const handleFoldStyleChange = (value: string) => {
    const newFoldStyle = value === "None" ? "" : value;
    setFoldStyle(newFoldStyle);
  };

  const getAvailableFoldStyles = (foldType: string) => {
    switch (foldType) {
      case "Bi-Fold":
        return ["Bulb Seal"];
      case "Single":
        return ["Bulb Seal", "Expander"];
      case "Double":
        return ["Lap Trim", "Expander", "Expander & Interlock Switches"];
      default:
        return [];
    }
  };

  const availableFoldStyles = getAvailableFoldStyles(foldType);

  return (
    <div className="p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="foldType">Fold Type</Label>
          <Select value={foldType} onValueChange={handleFoldTypeChange}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select fold type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Bi-Fold">Bi-Fold</SelectItem>
              <SelectItem value="Single">Single</SelectItem>
              <SelectItem value="Double">Double</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="foldStyle">Fold Style{foldType ? ' *' : ''}</Label>
          <Select 
            value={foldStyle} 
            onValueChange={handleFoldStyleChange}
            disabled={!foldType || availableFoldStyles.length === 0}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select fold style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {availableFoldStyles.map((style) => (
                <SelectItem key={style} value={style}>
                  {style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default PocketDoorsForm;