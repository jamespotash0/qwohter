import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { WallSpecification, WallDetails } from "@/lib/types";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import BaseCreationForm from "@/components/features/quotes/creationForms/BaseCreationForm";
import GlassWallCreationForm from "@/components/features/quotes/creationForms/GlassWallCreationForm";
import OperableWallCreationForm from "@/components/features/quotes/creationForms/OperableWallCreationForm";
import { AccordionWallCreationForm } from "@/components/features/quotes/creationForms/AccordionWallCreationForm";

interface WallSpecificationFormProps {
  walls: WallDetails;
  onUpdate: (walls: WallDetails) => void;
}

const WallSpecificationForm = ({ walls, onUpdate }: WallSpecificationFormProps) => {
  const [editingWallName, setEditingWallName] = useState<string | null>(null);
  const [newWallName, setNewWallName] = useState("");
  const [collapsedWalls, setCollapsedWalls] = useState<Set<string>>(new Set());

 
  const handleWallChange = (
    wallName: string,
    fieldOrUpdates: string | Record<string, string>,
    value?: string
  ) => {
    const currentWall = walls.walls[wallName];
    if (!currentWall) return;


    let updates: Record<string, string> = {};
    if (typeof fieldOrUpdates === "string") {
      updates = { [fieldOrUpdates]: value ?? "" };
    } else {
      updates = fieldOrUpdates;
    }

    // Type-safe field assignment for discriminated unions
    const updatedWall = { ...currentWall, ...updates } as WallSpecification;

    const updatedWalls = {
      ...walls,
      walls: {
        ...walls.walls,
        [wallName]: updatedWall,
      },
    };
    
    // Handle wallSystemType selection - transform to proper discriminated union type
    if ("wallSystemType" in updates) {
      const value = updates["wallSystemType"];
      if (value === "Operable Wall") {
        updatedWalls.walls[wallName] = {
          wallSystemType: "Operable Wall" as const,
          lengthFeet: currentWall.lengthFeet || "",
          lengthInches: currentWall.lengthInches || "",
          heightFeet: currentWall.heightFeet || "",
          heightInches: currentWall.heightInches || "",
          quantity: currentWall.quantity || "1",
          panelCount: currentWall.panelCount || "",
          bottomSeals: (currentWall as any).bottomSeals || "",
          topSeals: (currentWall as any).topSeals || "",
          // Track system fields will be auto-calculated by OperableWallCreationForm
          trackType: "",
          trackSystem: "",
          // Operable wall specific fields - reset to empty for new configuration
          panelConfiguration: "",
          series: "",
          model: "",
          panelThickness: "",
          panelSkin: "",
          stcRating: "",
          passDoorPanels: "",
          passDoorQuantity: "",
          panelFinishCategory: "",
          panelFinishSpecificItem: "",
          initialClosureSystem: "",
          finalClosureSystem: "",
          verticalSeals: "",
        };
      } else if (value === "Glass Wall") {
        updatedWalls.walls[wallName] = {
          wallSystemType: "Glass Wall" as const,
          lengthFeet: currentWall.lengthFeet || "",
          lengthInches: currentWall.lengthInches || "",
          heightFeet: currentWall.heightFeet || "",
          heightInches: currentWall.heightInches || "",
          quantity: currentWall.quantity || "1",
          panelCount: currentWall.panelCount || "",
          bottomSeals: (currentWall as any).bottomSeals || "",
          topSeals: (currentWall as any).topSeals || "",
          // Track system fields will be auto-calculated by GlassWallCreationForm
          trackType: "",
          trackSystem: "",
          // Glass wall specific fields
          model: "",
          panelOperation: "",
          panelConfiguration: "",
          panelFace: "",
          frameFinish: "",
          glassType: "",
          stcRating: "",
          partitionSupport: "",
          passDoorType: "",
          passDoorOption: "",
          hingeType: "",
          frameThickness: "",
          trackFinish: "",
          floorGuide: "",
          finalClosure: "",
        };
      } else if (value === "Accordion Partition") {
        updatedWalls.walls[wallName] = {
          wallSystemType: "Accordion Partition" as const,
          lengthFeet: currentWall.lengthFeet || "",
          lengthInches: currentWall.lengthInches || "",
          heightFeet: currentWall.heightFeet || "",
          heightInches: currentWall.heightInches || "",
          quantity: currentWall.quantity || "1",
          panelCount: currentWall.panelCount || "",
          // Accordion partition specific fields
          panelConfiguration: "",
          series: "",
          model: "",
          stcRating: "",
          operation: "",
          panelFace: "",
          options: "",
          trackSystem: "",
          trackSystemOption: "",
          trackMounting: "",
          finalClosureSystem: "",
        };
      }
    }
    
    if (onUpdate) {
      onUpdate(updatedWalls);
    }
  };





  const removeWall = (wallName: string) => {
    const { [wallName]: removedWall, ...remainingWalls } = walls.walls;
    onUpdate({
      ...walls,
      walls: remainingWalls
    });
  };


  
  const addNewWall = () => {
    // Create a generic wall with empty wallSystemType
    const wallCount = Object.keys(walls.walls).length;
    const newWallName = `Wall ${String.fromCharCode(65 + wallCount)}`;
    
    const newWall: WallSpecification = {
      wallSystemType: "" as any, // Empty until user selects
      lengthFeet: "",
      lengthInches: "",
      heightFeet: "",
      heightInches: "",
      quantity: "1",
      panelCount: "",
      bottomSeals: "",
      topSeals: "",
      trackType: "",
      trackSystem: "",
    } as any;
    
    const updatedWalls = {
      ...walls,
      walls: {
        ...walls.walls,
        [newWallName]: newWall,
      }
    };
    
    onUpdate(updatedWalls);
    
    // Ensure the new wall is expanded (not collapsed)
    setCollapsedWalls(prev => {
      const newSet = new Set(prev);
      newSet.delete(newWallName); // Remove from collapsed set if it exists
      return newSet;
    });
  };

  const renameWall = (oldName: string, newName: string) => {
    if (newName && newName !== oldName && !walls.walls[newName]) {
      const wallData = walls.walls[oldName];
      if (wallData) {
        const { [oldName]: removedWall, ...otherWalls } = walls.walls;
        onUpdate({
          ...walls,
          walls: {
            ...otherWalls,
            [newName]: wallData,
          }
        });
      }
    }
    setEditingWallName(null);
    setNewWallName("");
  };


  const toggleWallCollapse = (wallName: string) => {
    setCollapsedWalls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wallName)) {
        newSet.delete(wallName);
      } else {
        newSet.add(wallName);
      }
      return newSet;
    });
  };


  const wallNames = Object.keys(walls.walls);
  

  if (wallNames.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No walls added yet. Click "Add Wall" to get started.</p>
        <Button
          onClick={addNewWall}
          className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
        >
          Add Wall
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Wall Specifications</h2>
        <Button
          onClick={addNewWall}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Add Wall
        </Button>
      </div>
      {wallNames.map((wallName) => {
        const wall = walls.walls[wallName];
        const isCollapsed = collapsedWalls.has(wallName);
        
        if (!wall) {
          return null;
        }
        
        return (
          <Collapsible key={wallName} open={!isCollapsed} onOpenChange={() => toggleWallCollapse(wallName)}>
            <Card className="shadow-sm border">
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {editingWallName === wallName ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={newWallName}
                          onChange={(e) => setNewWallName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameWall(wallName, newWallName);
                            }
                          }}
                          onBlur={() => renameWall(wallName, newWallName)}
                          className="text-lg font-semibold"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-lg font-semibold">{wallName}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWallName(wallName);
                            setNewWallName(wallName);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2 ml-4">
                          <Label className="text-sm font-medium">Qty:</Label>
                          <Input
                            value={wall.quantity || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleWallChange(wallName, "quantity", e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="1"
                            className={`w-16 h-10 text-center ${wall.quantity ? 'border-green-500' : 'border-red-500'}`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWall(wallName);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-8">
                    <BaseCreationForm
                      wall={wall} 
                      wallName={wallName} 
                      onWallChange={handleWallChange} 
                    />
                    {wall.wallSystemType === "Operable Wall" && (
                      <OperableWallCreationForm 
                        wall={wall} 
                        wallName={wallName} 
                        onWallChange={handleWallChange} 
                      />
                    )}

                    {wall.wallSystemType === "Glass Wall" && (
                      <GlassWallCreationForm 
                        wall={wall} 
                        wallName={wallName} 
                        onWallChange={handleWallChange} 
                      />
                    )}
                    
                    {wall.wallSystemType === "Accordion Partition" && (
                      <AccordionWallCreationForm 
                        wall={wall} 
                        wallName={wallName} 
                        onWallChange={handleWallChange} 
                      />
                    )}
                    
                    {!wall.wallSystemType && (
                      <div className="text-center py-4 text-muted-foreground border-t">
                        <p className="text-sm">👆 Please select a Wall System Type above to continue with specific wall configuration.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default WallSpecificationForm;