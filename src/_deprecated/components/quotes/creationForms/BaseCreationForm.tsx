import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WallSpecification } from "@/lib/types";

interface BaseCreationFormProps {
  wall: WallSpecification;
  wallName: string;
  // onWallChange: (wallName: string, field: string, value: string) => void;
  onWallChange: (wallName: string, updates: Record<string, string>) => void;
}

const BaseCreationForm = ({ wall, wallName, onWallChange }: BaseCreationFormProps) => {
  const wallSystemTypes = [
    "Operable Wall", 
    "Glass Wall", 
    "Accordion Partition",
    "Unispan Support", 
    "FlexTact"
    ];

  return (
    <div className="space-y-8">
      {/* Dimensions Section */}
      <div>
        <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Dimensions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Length */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Length <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={wall.lengthFeet}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    if (parseInt(value) <= 99 || value === '') {
                      onWallChange(wallName, {"lengthFeet": value});
                    }
                  }}
                  placeholder="Enter a number"
                  className={`text-center rounded-md ${wall.lengthFeet ? 'border-green-500' : 'border-red-500'}`}
                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
              </div>
              <div className="flex-1">
                <Input
                  value={wall.lengthInches}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow digits, spaces, hyphens, and forward slashes for fractions
                    const cleanValue = value.replace(/[^\d\s\-\/]/g, '');
                    // Parse the base number (before any fraction)
                    const [base] = cleanValue.split(/[\s\-]/);
                    const baseNum = parseInt(base || "0", 10) || 0;
                    if (baseNum <= 11 || cleanValue === '') {
                      onWallChange(wallName, {"lengthInches": cleanValue});
                    }
                  }}
                  placeholder="Enter a number"
                  className={`text-center rounded-md ${wall.lengthInches ? 'border-green-500' : 'border-red-500'}`}

                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
              </div>
            </div>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Height <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={wall.heightFeet}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    if (parseInt(value) <= 40 || value === '') {
                      onWallChange(wallName, {"heightFeet": value});
                    }
                  }}
                  placeholder="Enter a number"
                  className={`text-center rounded-md ${wall.heightFeet ? 'border-green-500' : 'border-red-500'}`}

                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
              </div>
              <div className="flex-1">
                <Input
                  value={wall.heightInches}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.replace(/[^\d\s\-\/]/g, '');
                    const baseNum = parseInt(cleanValue.split(/[\s\-]/)[0] || '0') || 0;
                    if (baseNum <= 11 || cleanValue === '') {
                      onWallChange(wallName, {"heightInches": cleanValue});
                    }
                  }}
                  placeholder="Enter a number"
                  className={`text-center rounded-md ${wall.heightInches ? 'border-green-500' : 'border-red-500'}`}

                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
              </div>
            </div>
          </div>

          {/* Panel Count */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Panel Count <span className="text-red-500">*</span></Label>
            <Input
              value={wall.panelCount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                if (parseInt(value) <= 50 || value === '') {
                  onWallChange(wallName, {"panelCount": value});
                }
              }}
              placeholder="Enter a number"
              className={`text-center rounded-md ${wall.panelCount ? 'border-green-500' : 'border-red-500'}`}
            />
          </div>
        </div>
      </div>

      {/* Wall System Type Section */}
      <div>
        <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Wall System</h4>
        
        <div className="mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Wall System Type <span className="text-red-500">*</span></Label>
            <Select
              value={wall.wallSystemType}
              onValueChange={(value) => onWallChange(wallName, {"wallSystemType": value})}
            >
              <SelectTrigger className={wall.wallSystemType ? 'border-green-500' : 'border-red-500'}>
                <SelectValue placeholder="Select wall system type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border z-50">
                {wallSystemTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseCreationForm;