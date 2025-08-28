import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { WallSpecification, WallDetails } from "@/lib/types";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    
    const updatedWalls = {
      ...walls,
      walls: {
        ...walls.walls,
        [wallName]: {
          ...currentWall,
          [field]: value,
        },
      },
    };
    
    // Cascading logic
    if (field === "wallSystemType") {
      // Reset all dependent fields when wall system type changes
      // Create a new wall specification based on the new wall system type
      if (value === "Operable Wall") {
        updatedWalls.walls[wallName] = {
          ...updatedWalls.walls[wallName],
          wallSystemType: "Operable Wall" as const,
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
          trackType: "",
          trackSystem: "",
          verticalSeals: "",
          bottomSeals: "",
          topSeals: "",
          initialClosureSystem: "",
          endPanelType: "",
        } as WallSpecification;
      } else if (value === "Glass Wall") {
        updatedWalls.walls[wallName] = {
          ...updatedWalls.walls[wallName],
          wallSystemType: "Glass Wall" as const,
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
          trackType: "",
          trackFinish: "",
          finalClosure: "",
          bottomSeals: "",
          topSeals: "",
        } as WallSpecification;
      } else if (value === "Accordion Wall") {
        updatedWalls.walls[wallName] = {
          ...updatedWalls.walls[wallName],
          wallSystemType: "Accordion Wall" as const,
          panelMaterial: "",
          foldConfiguration: "",
          acousticRating: "",
          finishType: "",
        } as WallSpecification;
      }
    }
    
    if (field === "panelConfiguration" && currentWall.wallSystemType === "Operable Wall") {
      // Reset dependent fields for operable walls
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        series: "",
        model: "",
        panelThickness: "",
        panelSkin: "",
        panelDesign: "",  
        stcRating: "",
        trackType: "",
        trackSystem: "",
        initialClosureSystem: "",
      } as WallSpecification;
    }
    
    if (field === "series" && currentWall.wallSystemType === "Operable Wall") {
      // Auto-update panel thickness based on series for operable walls
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        panelThickness: value === "2000" ? "3" : value === "3000" ? "4" : value === "Hufcor: 600" ? "4" : "",
        model: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        initialClosureSystem: "",
      } as WallSpecification;
    }
    
    if (field === "model" && currentWall.wallSystemType === "Operable Wall") {
      // Auto-update track type based on model for operable walls
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        trackType: getTrackTypeByModel(value),
        trackSystem: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        initialClosureSystem: "",
      } as WallSpecification;
    }
    
    if ((field === "panelSkin" || field === "model") && currentWall.wallSystemType === "Operable Wall") {
      // Reset STC rating when model or panel skin changes for operable walls
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        stcRating: "",
      } as WallSpecification;
    }
    
    if (field === "trackType") {
      // Reset track system when track type changes
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        trackSystem: "",
      } as WallSpecification;
    }
    
    if (field === "passDoorPanels" && currentWall.wallSystemType === "Operable Wall") {
      // Reset quantity when pass doors is set to "None" or empty for operable walls
      if (value === "" || value === "None") {
        const currentWallData = updatedWalls.walls[wallName];
        updatedWalls.walls[wallName] = {
          ...currentWallData,
          passDoorQuantity: "",
        } as WallSpecification;
      }
    }
    
    if (field === "panelFinishCategory" && currentWall.wallSystemType === "Operable Wall") {
      // Reset specific item when category changes for operable walls
      // Clear the field entirely if the category doesn't need specific items
      const categoriesWithoutSpecificItems = ["Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        panelFinishSpecificItem: categoriesWithoutSpecificItems.includes(value) ? "" : "",
      } as WallSpecification;
    }
    
    if (onUpdate) {
      onUpdate(updatedWalls);
    }
  };


  const getTrackTypeByModel = (model: string): string => {
    if (["Hufcor 641", "2010", "2010GL", "3010", "3010GL"].includes(model)) {
      return "Curve & Diverter (Individual) Track";
    } else if (["2020", "2020GL", "3020", "3020GL"].includes(model)) {
      return "Multi-Directional Track";
    } else if (["2050e", "3050e", "3030", "3030GL", "2030", "2030GL"].includes(model)) {
      return "Hinged-Pair (Straight Line) Track";
    }
    return "";
  };



  const removeWall = (wallName: string) => {
    const { [wallName]: removedWall, ...remainingWalls } = walls.walls;
    onUpdate({
      ...walls,
      walls: remainingWalls
    });
  };

  const createWallWithType = (wallSystemType: string) => {
    const wallCount = Object.keys(walls.walls).length;
    const newWallName = `Wall ${String.fromCharCode(65 + wallCount)}`;
    
    let newWall: WallSpecification;
    
    if (wallSystemType === "Operable Wall") {
      newWall = {
        wallSystemType: "Operable Wall" as const,
        lengthFeet: "",
        lengthInches: "",
        heightFeet: "",
        heightInches: "",
        quantity: "1",
        panelCount: "",
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
        verticalSeals: "",
        bottomSeals: "",
        topSeals: "",
        initialClosureSystem: "",
        endPanelType: "",
        trackType: "",
        trackSystem: ""
      };
    } else if (wallSystemType === "Glass Wall") {
      newWall = {
        wallSystemType: "Glass Wall" as const,
        lengthFeet: "",
        lengthInches: "",
        heightFeet: "",
        heightInches: "",
        quantity: "1",
        panelCount: "",
        model: "",
        operation: "",
        panelConfiguration: "",
        panelFace: "",
        frameFinish: "",
        glassType: "",
        stcRating: "",
        floorGuide: "",
        partitionSupport: "",
        passDoorType: "",
        passDoorOption: "",
        hingeType: "",
        frameThickness: "",
        trackType: "",
        trackSystem: "Architectural Grade Extruded Aluminum Alloy 6063-T6",
        trackFinish: "",
        finalClosure: "",
        bottomSeals: "",
        topSeals: "",
        // verticalSeals: ""
      };
    } else {
      return; // Invalid wall type
    }
    
    onUpdate({
      ...walls,
      walls: {
        ...walls.walls,
        [newWallName]: newWall,
      }
    });
    setShowWallTypeSelector(false);
  };

  const [showWallTypeSelector, setShowWallTypeSelector] = useState(false);
  
  const addNewWall = () => {
    setShowWallTypeSelector(true);
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
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
      
      {/* Wall Type Selector Dialog */}
      <Dialog open={showWallTypeSelector} onOpenChange={setShowWallTypeSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Wall Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choose the type of wall system you want to add:
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => createWallWithType("Operable Wall")}
                className="w-full justify-start"
                variant="outline"
              >
                Operable Wall
              </Button>
              <Button
                onClick={() => createWallWithType("Glass Wall")}
                className="w-full justify-start"
                variant="outline"
              >
                Glass Wall
              </Button>
              <Button
                onClick={() => createWallWithType("Accordion Wall")}
                className="w-full justify-start"
                variant="outline"
              >
                Accordion Wall
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setShowWallTypeSelector(false)}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WallSpecificationForm;