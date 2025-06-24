
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { WallSpecification } from "./QuoteCreator";

interface WallSpecificationFormProps {
  walls: WallSpecification[];
  onUpdate: (walls: WallSpecification[]) => void;
}

const WallSpecificationForm = ({ walls, onUpdate }: WallSpecificationFormProps) => {
  const handleWallChange = (wallId: string, field: keyof WallSpecification, value: string) => {
    const updatedWalls = walls.map(wall =>
      wall.id === wallId ? { ...wall, [field]: value } : wall
    );
    onUpdate(updatedWalls);
  };

  const removeWall = (wallId: string) => {
    const updatedWalls = walls.filter(wall => wall.id !== wallId);
    onUpdate(updatedWalls);
  };

  const panelTypes = [
    "Continuously Hinged Panels",
    "Individual Panels",
    "Bi-Fold Panels",
    "Sliding Panels"
  ];

  if (walls.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No walls added yet. Click "Add Wall" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {walls.map((wall, index) => (
        <Card key={wall.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">{wall.name}</CardTitle>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeWall(wall.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`width-${wall.id}`}>Width</Label>
                <Input
                  id={`width-${wall.id}`}
                  value={wall.width}
                  onChange={(e) => handleWallChange(wall.id, "width", e.target.value)}
                  placeholder="32'-4&quot;"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`height-${wall.id}`}>Height</Label>
                <Input
                  id={`height-${wall.id}`}
                  value={wall.height}
                  onChange={(e) => handleWallChange(wall.id, "height", e.target.value)}
                  placeholder="8'-6&quot;"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`quantity-${wall.id}`}>Quantity</Label>
                <Input
                  id={`quantity-${wall.id}`}
                  type="number"
                  value={wall.quantity}
                  onChange={(e) => handleWallChange(wall.id, "quantity", e.target.value)}
                  placeholder="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`panelType-${wall.id}`}>Panel Type</Label>
                <Select
                  value={wall.panelType}
                  onValueChange={(value) => handleWallChange(wall.id, "panelType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select panel type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {panelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`panelCount-${wall.id}`}>Panel Count</Label>
                <Input
                  id={`panelCount-${wall.id}`}
                  value={wall.panelCount}
                  onChange={(e) => handleWallChange(wall.id, "panelCount", e.target.value)}
                  placeholder="3"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WallSpecificationForm;
