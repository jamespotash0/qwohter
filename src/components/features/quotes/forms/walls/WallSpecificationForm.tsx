import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { WallSpecification, WallDetails } from "@/lib/types";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import BaseSpecs from "@/components/features/quotes/creationForms/BaseCreationForm";
import GlassWallCreationForm from "@/components/features/quotes/creationForms/GlassWallCreationForm";
import OperableWallCreationForm from "@/components/features/quotes/creationForms/OperableWallCreationForm";

interface WallSpecificationFormProps {
  walls: WallDetails;
  onUpdate: (walls: WallDetails) => void;
}

const WallSpecificationForm = ({ walls, onUpdate }: WallSpecificationFormProps) => {
  const [editingWallName, setEditingWallName] = useState<string | null>(null);
  const [newWallName, setNewWallName] = useState("");
  const [collapsedWalls, setCollapsedWalls] = useState<Set<string>>(new Set());

  const handleWallChange = (wallName: string, field: string, value: string) => {
    
    const currentWall = walls.walls[wallName];
    if (!currentWall) {
      console.error(`Wall ${wallName} not found`);
      return;
    }
    
    // Type-safe field assignment for discriminated unions
    const updatedWall = { ...currentWall, [field]: value } as WallSpecification;
    
    const updatedWalls = {
      ...walls,
      walls: {
        ...walls.walls,
        [wallName]: updatedWall,
      },
    };
    
    // Handle wallSystemType selection - transform to proper discriminated union type
    if (field === "wallSystemType" && value) {
      // When user selects a wall type, create the proper discriminated union structure
      if (value === "Operable Wall") {
        updatedWalls.walls[wallName] = {
          wallSystemType: "Operable Wall" as const,
          lengthFeet: currentWall.lengthFeet || "",
          lengthInches: currentWall.lengthInches || "",
          heightFeet: currentWall.heightFeet || "",
          heightInches: currentWall.heightInches || "",
          quantity: currentWall.quantity || "1",
          panelCount: currentWall.panelCount || "",
          bottomSeals: currentWall.bottomSeals || "",
          topSeals: currentWall.topSeals || "",
          trackType: currentWall.trackType || "",
          trackSystem: currentWall.trackSystem || "",
          // Operable wall specific fields
          panelConfiguration: "",
          series: "",
          model: "",
          panelThickness: "",
          panelDesign: "",
          panelSkin: "",
          stcRating: "",
          passDoorPanels: "",
          passDoorQuantity: "",
          panelFinishCategory: "",
          panelFinishSpecificItem: "",
          initialClosureSystem: "",
          endPanelType: "",
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
          bottomSeals: currentWall.bottomSeals || "",
          topSeals: currentWall.topSeals || "",
          trackType: currentWall.trackType || "",
          trackSystem: currentWall.trackSystem || "Architectural Grade Extruded Aluminum Alloy 6063-T6",
          // Glass wall specific fields
          model: "",
          operation: "",
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
      } else if (value === "Accordion Wall") {
        updatedWalls.walls[wallName] = {
          wallSystemType: "Accordion Wall" as const,
          lengthFeet: currentWall.lengthFeet || "",
          lengthInches: currentWall.lengthInches || "",
          heightFeet: currentWall.heightFeet || "",
          heightInches: currentWall.heightInches || "",
          quantity: currentWall.quantity || "1",
          panelCount: currentWall.panelCount || "",
          bottomSeals: currentWall.bottomSeals || "",
          topSeals: currentWall.topSeals || "",
          trackType: currentWall.trackType || "",
          trackSystem: currentWall.trackSystem || "",
          // Accordion wall specific fields
          panelMaterial: "",
          foldConfiguration: "",
          acousticRating: "",
          finishType: "",
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
          className="mt-4"
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
          className="bg-primary text-white hover:bg-primary/90"
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
                            className="w-16 h-10 text-center"
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
                    <BaseSpecs 
                      wall={wall} 
                      wallName={wallName} 
                      onWallChange={handleWallChange} 
                    />

                    {/* Only show specific forms once wallSystemType is selected */}
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
                    
                    {/* Show a message if no wall type is selected yet */}
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