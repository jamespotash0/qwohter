import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WallSpecification } from "@/types/quote";

interface BaseSpecsProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, field: keyof WallSpecification, value: string) => void;
}

const BaseSpecs = ({ wall, wallName, onWallChange }: BaseSpecsProps) => {
  const wallSystemTypes = ["Operable Wall", "Glass Wall", "Accordion Partitions", "Unispan Support", "FlexTact"];

  return (
    <div className="space-y-8">
      {/* Dimensions Section */}
      <div>
        <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Dimensions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Length */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Length *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={wall.lengthFeet}
                  onChange={(e) => onWallChange(wallName, "lengthFeet", e.target.value)}
                  placeholder="32"
                  className="text-center"
                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
              </div>
              <div className="flex-1">
                <Input
                  value={wall.lengthInches}
                  onChange={(e) => onWallChange(wallName, "lengthInches", e.target.value)}
                  placeholder="4"
                  className="text-center"
                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
              </div>
            </div>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Height *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={wall.heightFeet}
                  onChange={(e) => onWallChange(wallName, "heightFeet", e.target.value)}
                  placeholder="8"
                  className="text-center"
                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
              </div>
              <div className="flex-1">
                <Input
                  value={wall.heightInches}
                  onChange={(e) => onWallChange(wallName, "heightInches", e.target.value)}
                  placeholder="6"
                  className="text-center"
                />
                <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
              </div>
            </div>
          </div>

          {/* Panel Count */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Panel Count *</Label>
            <Input
              value={wall.panelCount}
              onChange={(e) => onWallChange(wallName, "panelCount", e.target.value)}
              placeholder="3"
              className="text-center"
            />
          </div>
        </div>
      </div>

      {/* Wall System Type Section */}
      <div>
        <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Wall System</h4>
        
        <div className="mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Wall System Type *</Label>
            <Select
              value={wall.wallSystemType}
              onValueChange={(value) => onWallChange(wallName, "wallSystemType", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select wall system type" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
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

export default BaseSpecs;